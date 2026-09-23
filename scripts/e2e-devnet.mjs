// Read-only by default. Run with --run; subsequent runs resume the same isolated batch.
import assert from 'node:assert/strict'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import anchor from '@coral-xyz/anchor'
import web3 from '@solana/web3.js'

const { AnchorProvider, Program, Wallet, BN } = anchor
const { Connection, Keypair, PublicKey, SystemProgram, Transaction, TransactionMessage, VersionedTransaction } = web3
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const STATE = path.join(ROOT, '.keys/e2e-state.json')
const EVIDENCE = path.join(ROOT, '../artifacts/devnet-e2e.json')
const RUN = process.argv.includes('--run')
assert(process.argv.slice(2).every(a => ['--run', '--preflight'].includes(a)), 'Only --run or --preflight supported')
const connection = new Connection(process.env.RPC_URL || 'https://api.devnet.solana.com', 'confirmed')
assert.equal(await connection.getGenesisHash(), 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG', 'Devnet only: wrong genesis')
const loadKey = name => Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(name, 'utf8'))))
const farmer = loadKey(path.join(ROOT, '.keys/demo-farmer.json'))
const lab = loadKey(path.join(ROOT, '.keys/demo-lab.json'))
const idl = JSON.parse(readFileSync(path.join(ROOT, 'public/solana/idl.json'), 'utf8'))
const programFor = key => new Program(idl, new AnchorProvider(connection, new Wallet(key), { commitment: 'confirmed' }))
const program = programFor(farmer)
const pid = program.programId
const pda = (...seeds) => PublicKey.findProgramAddressSync(seeds, pid)[0]
const config = pda(Buffer.from('config'))
const role = (seed, key) => pda(Buffer.from(seed), key.publicKey.toBuffer())
const configData = await program.account.config.fetch(config)
assert(!configData.paused, 'Program paused')
assert((await connection.getAccountInfo(pid))?.executable, 'Program not executable')
for (const [key, expected] of [[farmer, 'farmer'], [lab, 'lab_role']]) {
  assert(!key.publicKey.equals(configData.authority), 'Role test cannot use authority')
  for (const seed of ['farmer', 'lab_role', 'logistics']) {
    const info = await connection.getAccountInfo(role(seed, key))
    assert.equal(!!info, seed === expected, `Unexpected ${seed} role for ${key.publicKey}`)
    if (info) {
      assert(info.owner.equals(pid), 'Role not program-owned')
      program.coder.accounts.decode(seed === 'lab_role' ? 'labRole' : seed === 'farmer' ? 'farmerRole' : 'logisticsRole', info.data)
    }
  }
}
console.log(JSON.stringify({ mode: RUN ? 'run' : 'preflight', program: pid.toBase58(), farmer: farmer.publicKey.toBase58(), lab: lab.publicKey.toBase58(), balances: await Promise.all([farmer, lab].map(k => connection.getBalance(k.publicKey))) }))
if (!RUN) process.exit(0)

const saved = existsSync(STATE) ? JSON.parse(readFileSync(STATE, 'utf8')) : null
const newKey = name => {
  const dest = path.join(ROOT, `.keys/e2e-${name}.json`)
  if (existsSync(dest)) return loadKey(dest)
  const key = Keypair.generate()
  writeFileSync(dest, JSON.stringify(Array.from(key.secretKey)), { mode: 0o600, flag: 'wx' })
  return key
}
mkdirSync(path.dirname(STATE), { recursive: true })
const recipient = saved ? loadKey(path.join(ROOT, '.keys/e2e-recipient.json')) : newKey('recipient')
const outsider = saved ? loadKey(path.join(ROOT, '.keys/e2e-outsider.json')) : newKey('outsider')
const state = saved || { batchId: `E2E-${Date.now().toString(36).toUpperCase()}`, program: pid.toBase58(), farmer: farmer.publicKey.toBase58(), lab: lab.publicKey.toBase58(), recipient: recipient.publicKey.toBase58(), outsider: outsider.publicKey.toBase58(), transactions: [], negatives: [], fundedLamports: 0 }
state.genesisHash = 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG'
for (const [name, key] of Object.entries({ farmer, lab, recipient, outsider })) assert.equal(state[name], key.publicKey.toBase58(), 'Run key mismatch')
assert.equal(state.program, pid.toBase58(), 'Run program mismatch')
assert.equal(new Set([farmer, lab, recipient, outsider].map(k => k.publicKey.toBase58())).size, 4)
const save = () => { writeFileSync(STATE, JSON.stringify(state, null, 2)); mkdirSync(path.dirname(EVIDENCE), { recursive: true }); writeFileSync(EVIDENCE, JSON.stringify(state, null, 2)) }
save()
const link = signature => `https://explorer.solana.com/tx/${signature}?cluster=devnet`
const record = (step, signature) => { state.transactions.push({ step, signature, url: link(signature) }); save(); console.log(step, link(signature)) }
// Fund only the two isolated test keys from the already funded demo farmer.
// Maximum 0.012 SOL total per run. Never grant/revoke roles or read authority keys.
assert(await connection.getBalance(lab.publicKey) >= 8_000_000, 'Lab needs test funds')
for (const [name, key, target] of [['recipient', recipient, 6_000_000], ['outsider', outsider, 6_000_000]]) {
  if (state.transactions.some(tx => tx.step === `fund-${name}`)) continue
  const deficit = Math.max(0, target - await connection.getBalance(key.publicKey))
  if (!deficit) continue
  assert(state.fundedLamports + deficit <= 12_000_000, 'Funding cap exceeded')
  assert(await connection.getBalance(farmer.publicKey) >= deficit + 20_000_000, 'Farmer needs test rent/fee reserve')
  // Reserve the allowance before sending, including uncertain send outcomes.
  state.fundedLamports += deficit; save()
  record(`fund-${name}`, await web3.sendAndConfirmTransaction(connection, new Transaction().add(SystemProgram.transfer({ fromPubkey: farmer.publicKey, toPubkey: key.publicKey, lamports: deficit })), [farmer]))
}
const id = state.batchId
const batch = pda(Buffer.from('batch'), Buffer.from(id))
const indexed = (seed, index, batchId = id) => { const b = Buffer.alloc(4); b.writeUInt32LE(index); return pda(Buffer.from(seed), Buffer.from(batchId), b) }
const readBatch = () => program.account.batch.fetchNullable(batch)
const register = (key, batchId = id) => programFor(key).methods.registerBatch(batchId, 'E2E TEST ONLY', 'Lam Dong', new Date().toISOString().slice(0, 10), new BN(300), new BN(500), new BN(0), { low: {} }, 'Test screening only', 'Synthetic E2E data').accountsStrict({ config, batch: pda(Buffer.from('batch'), Buffer.from(batchId)), labReport: indexed('lab', 0, batchId), farmerRole: key === farmer ? role('farmer', key) : null, signer: key.publicKey, systemProgram: SystemProgram.programId })
const update = (key, index) => programFor(key).methods.updateLabReport(id, new BN(600), new BN(500), new BN(0), { high: {} }, 'Hold test batch', 'Synthetic elevated cadmium').accountsStrict({ config, batch, labReport: indexed('lab', index), labRole: key === lab ? role('lab_role', key) : null, signer: key.publicKey, systemProgram: SystemProgram.programId })
const transfer = key => programFor(key).methods.transferCustody(id, recipient.publicKey).accountsStrict({ config, batch, signer: key.publicKey })
const accept = key => programFor(key).methods.acceptCustody(id, { packer: {} }, 'E2E TEST LOCATION').accountsStrict({ config, batch, custodyRecord: indexed('custody', 0), signer: key.publicKey, systemProgram: SystemProgram.programId })
const negative = async (name, builder, signer) => {
  if (state.negatives.some(n => n.name === name)) return
  const before = await connection.getAccountInfo(batch)
  const { blockhash } = await connection.getLatestBlockhash()
  const tx = new VersionedTransaction(new TransactionMessage({ payerKey: signer.publicKey, recentBlockhash: blockhash, instructions: [await builder.instruction()] }).compileToV0Message())
  tx.sign([signer])
  const { value } = await connection.simulateTransaction(tx, { sigVerify: true, commitment: 'confirmed' })
  assert.equal(value.err?.InstructionError?.[1]?.Custom, 6000, `${name}: expected Unauthorized (6000), got ${JSON.stringify(value.err)}; ${value.logs?.join('\n')}`)
  assert.deepEqual((await connection.getAccountInfo(batch))?.data, before?.data, 'Simulation changed batch')
  state.negatives.push({ name, error: value.err, logs: value.logs, simulated: true }); save(); console.log('negative PASS', name)
}
await negative('lab-only cannot register', register(lab, `${id}-DENY`), lab)
if (!(await readBatch())) record('register', await register(farmer).rpc())
let b = await readBatch()
assert(b.registrant.equals(farmer.publicKey) && b.farm === 'E2E TEST ONLY', 'Unexpected batch; refuse mutation')
assert.equal(b.timelineCount, 0)
assert([1, 2].includes(b.labCount), 'Unexpected lab count')
await negative('farmer-only cannot update lab', update(farmer, b.labCount), farmer)
if (b.labCount === 1) record('lab-update', await update(lab, 1).rpc())
const initial = await program.account.labReport.fetch(indexed('lab', 0))
const report = await program.account.labReport.fetch(indexed('lab', 1))
assert(initial.reporter.equals(farmer.publicKey) && initial.cadmiumPpm.eq(new BN(300)) && Object.hasOwn(initial.riskLevel, 'low'))
assert(report.reporter.equals(lab.publicKey) && report.cadmiumPpm.eq(new BN(600)) && report.thresholdPpm.eq(new BN(500)) && report.confidence.isZero() && Object.hasOwn(report.riskLevel, 'high'))
await negative('outsider cannot transfer', transfer(outsider), outsider)
b = await readBatch()
if (b.owner.equals(farmer.publicKey)) {
  if (!b.pendingOwner) record('custody-propose', await transfer(farmer).rpc())
  b = await readBatch()
  assert(b.owner.equals(farmer.publicKey) && b.pendingOwner?.equals(recipient.publicKey) && b.custodyCount === 0)
  state.beforeAcceptance = { owner: b.owner.toBase58(), pendingOwner: b.pendingOwner.toBase58(), custodyCount: b.custodyCount }; save()
  await negative('wrong recipient cannot accept', accept(outsider), outsider)
  record('custody-accept', await accept(recipient).rpc())
}
b = await readBatch()
assert(b.owner.equals(recipient.publicKey) && b.pendingOwner === null && b.custodyCount === 1 && b.labCount === 2 && b.timelineCount === 0)
assert(state.beforeAcceptance, 'Missing pre-acceptance evidence')
const custody = await program.account.custodyRecord.fetch(indexed('custody', 0))
assert(custody.from.equals(farmer.publicKey) && custody.to.equals(recipient.publicKey) && Object.hasOwn(custody.role, 'packer'))
await negative('previous owner cannot transfer', transfer(farmer), farmer)
assert.equal(state.negatives.length, 5)
state.final = { owner: b.owner.toBase58(), pendingOwner: b.pendingOwner, labCount: b.labCount, custodyCount: b.custodyCount, cadmiumPpm: 0.06, thresholdPpm: 0.05, riskLevel: 'high', reportReporter: report.reporter.toBase58(), batchAccount: batch.toBase58() }
state.batchTransactions = (await connection.getSignaturesForAddress(batch, { limit: 20 })).map(({ signature, err }) => ({ signature, err, url: link(signature) }))
state.completedAt = new Date().toISOString(); save()
console.log('PASS', id, EVIDENCE)
