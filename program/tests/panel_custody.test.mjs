// Run from program/: anchor build && npx mocha tests/attestation_v2.test.mjs
// Uses only generated test keys. Config is seeded to isolate attestation from
// the production genesis authority; native signature verification is enabled.
import assert from 'node:assert/strict'
import { readFileSync, mkdtempSync, writeFileSync, openSync, closeSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { spawn } from 'node:child_process'
import { setTimeout as delay } from 'node:timers/promises'
import anchor from '@coral-xyz/anchor'
import { Connection, Ed25519Program, Keypair, PublicKey, SYSVAR_INSTRUCTIONS_PUBKEY, SystemProgram, Transaction, VersionedTransaction } from '@solana/web3.js'
import { DOMAIN_V2, payloadHashV1, payloadHashV2, u32 } from './attestation_payload.mjs'

const { AnchorProvider, Wallet, BN, Program } = anchor

const idl = JSON.parse(readFileSync(new URL('../target/idl/durian_trust.json', import.meta.url)))
const pid = new PublicKey(idl.address)
const authority = Keypair.generate()
const farmer = Keypair.generate()
const receiver = Keypair.generate()
const lab = Keypair.generate()
const intruder = Keypair.generate()
const id = 'PANEL-CUSTODY-TEST'
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


const indexed = (seed,index=0) => pda(Buffer.from(seed),Buffer.from(id),u32(index))
const role = (seed,key) => pda(Buffer.from(seed),key.publicKey.toBuffer())
const read = () => program.account.batch.fetch(batch)
const propose = key => program.methods.transferCustody(id,receiver.publicKey).accountsStrict({config,batch,signer:key.publicKey})
const accept = (key,index=0) => program.methods.acceptCustody(id,{packer:{}},'Synthetic test location').accountsStrict({config,batch,custodyRecord:indexed('custody',index),signer:key.publicKey,systemProgram:SystemProgram.programId})
const register = (key,batchId=id) => program.methods.registerBatch(batchId,'Synthetic farm','Test province','2026-09-16',new BN(300),new BN(500),new BN(0),{low:{}},'Demo','Synthetic data').accountsStrict({config,batch:pda(Buffer.from('batch'),Buffer.from(batchId)),labReport:pda(Buffer.from('lab'),Buffer.from(batchId),u32(0)),farmerRole:key===farmer?role('farmer',key):null,signer:key.publicKey,systemProgram:SystemProgram.programId})
const update = (key,index=1) => program.methods.updateLabReport(id,new BN(600),new BN(500),new BN(0),{high:{}},'Demo hold','Synthetic data').accountsStrict({config,batch,labReport:indexed('lab',index),labRole:key===lab?labRole:null,signer:key.publicKey,systemProgram:SystemProgram.programId})
async function good(builder,key) { const result=await execute([await builder.instruction()],key); assert.equal(result.result,null,JSON.stringify(result)) }
async function bad(builder,key,expected) { const before=await getAccount(batch); const result=await execute([await builder.instruction()],key); assert.ok(result.result,'unexpected success'); assert.match(result.meta.logMessages.join('\n'),new RegExp(expected)); assert.deepEqual((await getAccount(batch))?.data,before?.data) }

describe('Panel custody and authority regression on native local validator',function(){
 this.timeout(60000)
 before(async()=>{
  assert(process.env.TEST_VALIDATOR_PATH,'Use native localhost validator; no production credentials')
  const coder=new Program(idl,{connection:{},publicKey:authority.publicKey}).coder.accounts
  const owned=async(address,name,value)=>{
    const encoded=await coder.encode(name,value)
    // Option<Pubkey> grows by 32 bytes when pendingAuthority becomes Some.
    const data=name==='config' ? Buffer.concat([encoded,Buffer.alloc(32)]) : encoded
    return {address,info:{lamports:10000000,data,owner:pid,executable:false}}
  }
  const fixtures=[...([authority,farmer,lab,receiver,intruder].map(k=>funded(k.publicKey))),
    await owned(config,'config',{authority:authority.publicKey,nextTokenId:new BN(0),pendingAuthority:null,paused:false}),
    await owned(role('farmer',farmer),'farmerRole',{}),await owned(labRole,'labRole',{})]
  provider=new AnchorProvider(await startLocalValidator(fixtures),new Wallet(authority),{commitment:'confirmed',preflightCommitment:'confirmed'})
  program=new Program(idl,provider)
 })
 after(async()=>{
  if(validator&&validator.exitCode===null&&!validatorError){const exited=new Promise(resolve=>validator.once('exit',resolve));validator.kill();await exited}
 })
 it('A: farmer creates batch and registration report',async()=>{await good(register(farmer),farmer);const b=await read();assert(b.owner.equals(farmer.publicKey));assert.equal(b.labCount,1);assert.equal(b.pendingOwner,null)})
 it('B: authorized lab appends report, initial report retained',async()=>{await good(update(lab),lab);const r=await program.account.labReport.fetch(indexed('lab',1));assert.equal(r.cadmiumPpm.toString(),'600');assert(r.reporter.equals(lab.publicKey));assert.equal((await read()).labCount,2);assert.equal((await program.account.labReport.fetch(indexed('lab',0))).cadmiumPpm.toString(),'300')})
 it('I: non-owner cannot propose',()=>bad(propose(intruder),intruder,'Unauthorized'))
 it('J: lab-only cannot register',()=>bad(register(lab,'PANEL-DENIED'),lab,'Unauthorized'))
 it('K: farmer-only cannot append lab report',()=>bad(update(farmer,2),farmer,'Unauthorized'))
 it('C-D: proposal retains A as owner and nominates B',async()=>{await good(propose(farmer),farmer);const b=await read();assert(b.owner.equals(farmer.publicKey));assert(b.pendingOwner.equals(receiver.publicKey));assert.equal(b.custodyCount,0)})
 it('H: wallet C cannot accept B nomination',()=>bad(accept(intruder),intruder,'Unauthorized'))
 it('L: unauthorized wallet cannot pause',()=>bad(program.methods.pause().accountsStrict({config,authority:intruder.publicKey}),intruder,'Unauthorized'))
 it('L: authority pauses',async()=>{await good(program.methods.pause().accountsStrict({config,authority:authority.publicKey}),authority);assert.equal((await program.account.config.fetch(config)).paused,true)})
 it('L: transfer rejected while paused',()=>bad(propose(farmer),farmer,'Paused'))
 it('L: acceptance rejected while paused',()=>bad(accept(receiver),receiver,'Paused'))
 it('L: report rejected while paused',()=>bad(update(lab,2),lab,'Paused'))
 it('L: registration rejected while paused',()=>bad(register(farmer,'PANEL-PAUSED'),farmer,'Paused'))
 it('L: authority unpauses',async()=>{await good(program.methods.unpause().accountsStrict({config,authority:authority.publicKey}),authority);assert.equal((await program.account.config.fetch(config)).paused,false)})
 it('E-F-G: B accepts, becomes owner; record immutable at index 0',async()=>{await good(accept(receiver),receiver);const b=await read();assert(b.owner.equals(receiver.publicKey));assert.equal(b.pendingOwner,null);assert.equal(b.custodyCount,1);const r=await program.account.custodyRecord.fetch(indexed('custody'));assert(r.from.equals(farmer.publicKey));assert(r.to.equals(receiver.publicKey));assert.deepEqual(r.role,{packer:{}});assert.equal(r.location,'Synthetic test location')})
 it('repeated acceptance rejected with no pending proposal',()=>bad(accept(receiver,1),receiver,'NoPendingCustody'))
 it('previous owner cannot transfer',()=>bad(propose(farmer),farmer,'Unauthorized'))
 it('authority cannot seize custody',()=>bad(propose(authority),authority,'Unauthorized'))
 it('authority transfer requires nominee signature',async()=>{await good(program.methods.proposeAuthorityTransfer(receiver.publicKey).accountsStrict({config,authority:authority.publicKey}),authority);let c=await program.account.config.fetch(config);assert(c.authority.equals(authority.publicKey));assert(c.pendingAuthority.equals(receiver.publicKey));await bad(program.methods.acceptAuthorityTransfer().accountsStrict({config,newAuthority:intruder.publicKey}),intruder,'Unauthorized');await good(program.methods.acceptAuthorityTransfer().accountsStrict({config,newAuthority:receiver.publicKey}),receiver);c=await program.account.config.fetch(config);assert(c.authority.equals(receiver.publicKey));assert.equal(c.pendingAuthority,null)})
 it('old authority cannot pause after authority handover',()=>bad(program.methods.pause().accountsStrict({config,authority:authority.publicKey}),authority,'Unauthorized'))
})
