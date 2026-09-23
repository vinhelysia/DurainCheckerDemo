// Run from program/: anchor build && npx mocha tests/attestation_v2.test.mjs
// Uses only generated test keys. Config is seeded to isolate attestation from
// the production genesis authority; native signature verification is enabled.
import assert from 'node:assert/strict'
import { readFileSync, mkdtempSync, writeFileSync, openSync, closeSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { spawn } from 'node:child_process'
import { setTimeout as delay } from 'node:timers/promises'
import { AnchorProvider, Wallet, BN, Program } from '@coral-xyz/anchor'
import { Connection, Ed25519Program, Keypair, PublicKey, SYSVAR_INSTRUCTIONS_PUBKEY, SystemProgram, Transaction, VersionedTransaction } from '@solana/web3.js'
import { DOMAIN_V2, payloadHashV1, payloadHashV2, u32 } from './attestation_payload.mjs'

const idl = JSON.parse(readFileSync(new URL('../target/idl/durian_trust.json', import.meta.url)))
const pid = new PublicKey(idl.address)
const authority = Keypair.generate()
const lab = Keypair.generate()
const intruder = Keypair.generate()
const id = 'ATTEST-V2-TEST'
const pda = (...seeds) => PublicKey.findProgramAddressSync(seeds, pid)[0]
const config = pda(Buffer.from('config'))
const batch = pda(Buffer.from('batch'), Buffer.from(id))
const reportAddress = (index = 0) => pda(Buffer.from('lab'), Buffer.from(id), u32(index))
const attestationAddress = (version = 2, index = 0) => pda(Buffer.from(version === 2 ? 'attestation_v2' : 'attestation'), Buffer.from(id), u32(index))
const labRole = pda(Buffer.from('lab_role'), lab.publicKey.toBuffer())
const payload = {
  programId: pid, batchId: id, reportIndex: 0,
  cadmium: 400, threshold: 500, confidence: 0, risk: 1,
  aiResult: 'ab', riskCause: 'c', reporter: lab.publicKey,
}
let context, provider, program
let validator, validatorLog, validatorError
const rpcUrl = 'http://127.0.0.1:18999'

async function startLocalValidator(fixtures) {
  assert.equal(new URL(rpcUrl).hostname, '127.0.0.1', 'test RPC must be localhost')
  const directory = mkdtempSync(fileURLToPath(new URL('../target/attestation-v2-', import.meta.url)))
  const args = ['--log', '--bind-address', '127.0.0.1', '--ledger', join(directory, 'ledger'), '--rpc-port', '18999', '--bpf-program', pid.toBase58(), fileURLToPath(new URL('../target/deploy/durian_trust.so', import.meta.url))]
  for (const [index, { address, info }] of fixtures.entries()) {
    const path = join(directory, `account-${index}.json`)
    writeFileSync(path, JSON.stringify({ pubkey: address.toBase58(), account: {
      lamports: info.lamports, data: [info.data.toString('base64'), 'base64'],
      owner: info.owner.toBase58(), executable: false, rentEpoch: 0,
    } }))
    args.push('--account', address.toBase58(), path)
  }
  validatorLog = join(directory, 'validator.log')
  const log = openSync(validatorLog, 'a')
  validator = spawn(process.env.TEST_VALIDATOR_PATH, args, { windowsHide: true, stdio: ['ignore', log, log] })
  closeSync(log)
  validator.once('error', error => { validatorError = error })
  const connection = new Connection(rpcUrl, 'confirmed')
  for (let attempt = 0; attempt < 120; attempt++) {
    if (validatorError) throw validatorError
    if (validator.exitCode !== null) throw new Error(`Validator exited; see ${validatorLog}`)
    try {
      // Match a generated fixture, so an unrelated server already on the port
      // cannot be mistaken for this isolated validator.
      // Preloaded programs become visible after the genesis slot.
      const account = await connection.getAccountInfo(config)
      if (account?.data.equals(fixtures.find(item => item.address.equals(config)).info.data)
          && await connection.getSlot('confirmed') > 1) return connection
    } catch { /* validator is still starting */ }
    await delay(250)
  }
  throw new Error(`Validator did not become ready; see ${validatorLog}`)
}

async function getAccount(address) {
  return process.env.TEST_VALIDATOR_PATH ? provider.connection.getAccountInfo(address) : context.banksClient.getAccount(address)
}

function funded(address) {
  return { address, info: { lamports: 10_000_000_000, data: Buffer.alloc(0), owner: SystemProgram.programId, executable: false } }
}

async function execute(instructions, signer = lab) {
  const tx = new Transaction().add(...instructions)
  if (process.env.TEST_VALIDATOR_PATH) {
    tx.feePayer = authority.publicKey
    tx.recentBlockhash = (await provider.connection.getLatestBlockhash()).blockhash
    tx.sign(authority, signer)
    const signed = new VersionedTransaction(tx.compileMessage())
    signed.sign([authority, signer])
    let simulation
    try {
      simulation = await provider.connection.simulateTransaction(signed, { sigVerify: true, commitment: 'confirmed' })
    } catch (error) {
      // web3's versioned overload throws a plain Error for RPC-level native
      // signature rejection. Never count connection/startup errors as success.
      if (!/^failed to simulate transaction: .*signature/i.test(error.message)) throw error
      return { result: error.message, meta: { logMessages: error.logs ?? [] } }
    }
    if (simulation.value.err) return { result: simulation.value.err, meta: { logMessages: simulation.value.logs ?? [] } }
    const signature = await provider.connection.sendRawTransaction(signed.serialize())
    let confirmed = false
    for (let attempt = 0; attempt < 120; attempt++) {
      const status = (await provider.connection.getSignatureStatuses([signature])).value[0]
      assert.ok(!status?.err, JSON.stringify(status?.err))
      if (['confirmed', 'finalized'].includes(status?.confirmationStatus)) {
        confirmed = true
        break
      }
      await delay(250)
    }
    assert.ok(confirmed, `Local transaction did not confirm: ${signature}`)
    return { result: null, meta: { logMessages: simulation.value.logs ?? [] } }
  }
  tx.feePayer = context.payer.publicKey
  tx.recentBlockhash = (await context.banksClient.getLatestBlockhash())[0]
  tx.sign(context.payer, signer)
  return context.banksClient.tryProcessTransaction(tx)
}

async function attest({ hash = payloadHashV2(payload), signer = lab, signingKey = signer, message = hash, signature, corruptEdSignature = false, precompile = true, version = 2, index = 0 } = {}) {
  const ed = Ed25519Program.createInstructionWithPrivateKey({ privateKey: signingKey.secretKey, message })
  const signatureOffset = ed.data.readUInt16LE(2)
  if (corruptEdSignature) ed.data[signatureOffset] ^= 1
  const sig = signature ?? ed.data.subarray(signatureOffset, signatureOffset + 64)
  const method = version === 2 ? 'attestLabReportV2' : 'attestLabReport'
  const ix = await program.methods[method](id, index, [...sig], [...hash]).accountsStrict({
    config, batch, labReport: reportAddress(index), attestation: attestationAddress(version, index),
    labRole: signer === lab ? labRole : null, signer: signer.publicKey,
    ixSysvar: SYSVAR_INSTRUCTIONS_PUBKEY, systemProgram: SystemProgram.programId,
  }).instruction()
  return execute(precompile ? [ed, ix] : [ix], signer)
}

async function rejects(options, expected) {
  const result = await attest(options)
  assert.ok(result.result, 'transaction unexpectedly succeeded')
  if (expected) assert.match(result.meta.logMessages.join('\n'), new RegExp(expected))
  assert.equal(await getAccount(attestationAddress(options?.version ?? 2, options?.index ?? 0)), null)
}

describe('attestation v2: native Ed25519 and persisted accounts', function () {
  this.timeout(60_000)
  before(async () => {
    // Program normalizes generated IDL names before its Borsh coder is used.
    const coder = new Program(idl, { connection: {}, publicKey: authority.publicKey }).coder.accounts
    const owned = async (address, name, value) => ({ address, info: {
      lamports: 10_000_000, data: await coder.encode(name, value), owner: pid, executable: false,
    } })
    const report = {
      cadmiumPpm: new BN(payload.cadmium), thresholdPpm: new BN(payload.threshold), confidence: new BN(0),
      riskLevel: { low: {} }, aiResult: payload.aiResult, riskCause: payload.riskCause,
      reporter: lab.publicKey, timestamp: new BN(0),
    }
    const fixtures = [
      funded(authority.publicKey), funded(lab.publicKey), funded(intruder.publicKey),
      await owned(config, 'config', { authority: authority.publicKey, nextTokenId: new BN(1), pendingAuthority: null, paused: false }),
      await owned(batch, 'batch', {
        id, farm: 'Test', province: 'Test', harvestDate: '2026-09-09', registrant: lab.publicKey,
        tokenId: new BN(0), timelineCount: 0, labCount: 2, createdAt: new BN(0),
        owner: lab.publicKey, pendingOwner: null, custodyCount: 0,
      }),
      await owned(labRole, 'labRole', {}),
      await owned(reportAddress(), 'labReport', report),
      await owned(reportAddress(1), 'labReport', report),
    ]
    if (process.env.TEST_VALIDATOR_PATH) {
      provider = new AnchorProvider(await startLocalValidator(fixtures), new Wallet(authority), { commitment: 'confirmed', preflightCommitment: 'confirmed' })
    } else {
      const { BankrunProvider, startAnchor } = await import('anchor-bankrun')
      context = await startAnchor('.', [], fixtures)
      provider = new BankrunProvider(context)
    }
    program = new Program(idl, provider)
  })

  after(async () => {
    if (validator && validator.exitCode === null && !validatorError) {
      const exited = new Promise(resolve => validator.once('exit', resolve))
      validator.kill()
      await exited
    }
  })

  it('matches the Rust cross-language golden vector', () => {
    assert.equal(DOMAIN_V2.length, 31)
    assert.equal(payloadHashV2({ ...payload, programId: new PublicKey(Buffer.alloc(32, 1)), batchId: 'BATCH-V2', reportIndex: 7, reporter: new PublicKey(Buffer.alloc(32, 2)) }).toString('hex'), '59347afa1fbaf7a933509daff52df2d09ae0557884737e28efd9cf34ba604fe3')
  })

  for (const [name, override] of [
    ['cadmium', { cadmium: 401 }], ['threshold', { threshold: 501 }],
    ['confidence', { confidence: 1 }], ['risk', { risk: 2 }],
    ['reporter', { reporter: intruder.publicKey }],
    ['text partition', { aiResult: 'a', riskCause: 'bc' }],
    ['report index', { reportIndex: 1 }], ['program id', { programId: SystemProgram.programId }],
    ['domain', { domain: Buffer.from('durian-trust:lab-attestation:v1') }],
  ]) {
    it(`rejects a correctly signed payload with wrong ${name}`, () => rejects({ hash: payloadHashV2({ ...payload, ...override }) }, 'PayloadHashMismatch'))
  }
  it('rejects replay of report 0 on identical report 1', () => rejects({ index: 1 }, 'PayloadHashMismatch'))
  it('rejects a valid signature from another key', () => rejects({ signingKey: intruder }, 'AttestationKeyMismatch'))
  it('rejects a precompile signature over another message', () => rejects({ message: Buffer.alloc(32, 9) }, 'PayloadHashMismatch'))
  it('rejects mismatched signature argument', () => rejects({ signature: Buffer.alloc(64) }, 'SignatureMismatch'))
  it('rejects a cryptographically invalid native Ed25519 signature', () => rejects({ corruptEdSignature: true }))
  it('rejects signer without lab role', () => rejects({ signer: intruder }, 'Unauthorized'))
  it('rejects missing Ed25519 pre-instruction', () => rejects({ precompile: false }, 'MissingEd25519Instruction'))
  it('creates v2 attestation and verifies it from stored report', async () => {
    assert.equal((await attest()).result, null)
    const stored = await program.account.labAttestation.fetch(attestationAddress())
    assert.deepEqual(Buffer.from(stored.payloadHash), payloadHashV2(payload))
    assert.ok(stored.labPubkey.equals(lab.publicKey))
    const verify = await program.methods.verifyAttestationV2(id, 0).accountsStrict({ labReport: reportAddress(), attestation: attestationAddress() }).instruction()
    assert.equal((await execute([verify], authority)).result, null)
  })
  it('keeps v1 attestations independently readable and verifiable', async () => {
    assert.equal((await attest({ version: 1, hash: payloadHashV1(payload) })).result, null)
    for (const [method, version] of [['verifyAttestation', 1], ['verifyAttestationV2', 2]]) {
      const verify = await program.methods[method](id, 0).accountsStrict({ labReport: reportAddress(), attestation: attestationAddress(version) }).instruction()
      assert.equal((await execute([verify], authority)).result, null)
    }
    assert.notDeepEqual(attestationAddress(1), attestationAddress())
  })
})
