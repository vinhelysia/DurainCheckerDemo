// Prove a lab-only wallet can append a lab report without logistics.
// Run from durian-web3/:  node scripts/smoke-lab-only.mjs [BATCH_ID]
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import anchorPkg from '@coral-xyz/anchor'
import web3 from '@solana/web3.js'

const { AnchorProvider, Program, Wallet, BN } = anchorPkg
const { Connection, Keypair, PublicKey, SystemProgram } = web3

const RPC = process.env.RPC_URL || 'https://api.devnet.solana.com'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const LAB_PATH = path.join(ROOT, '.keys', 'demo-lab.json')
const IDL_PATH = path.join(ROOT, 'public', 'solana', 'idl.json')

const secret = JSON.parse(readFileSync(path.join(homedir(), '.config/solana/id.json'), 'utf8'))
const authority = Keypair.fromSecretKey(Uint8Array.from(secret))

function loadOrCreateLab() {
  if (existsSync(LAB_PATH)) {
    return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(LAB_PATH, 'utf8'))))
  }
  const kp = Keypair.generate()
  mkdirSync(path.dirname(LAB_PATH), { recursive: true })
  writeFileSync(LAB_PATH, JSON.stringify(Array.from(kp.secretKey)), { mode: 0o600 })
  console.log('generated demo lab →', LAB_PATH)
  return kp
}

const lab = loadOrCreateLab()
const connection = new Connection(RPC, 'confirmed')
const idl = JSON.parse(readFileSync(IDL_PATH, 'utf8'))
const authProgram = new Program(idl, new AnchorProvider(connection, new Wallet(authority), { commitment: 'confirmed' }))
const labProgram = new Program(idl, new AnchorProvider(connection, new Wallet(lab), { commitment: 'confirmed' }))
const pid = authProgram.programId

const pda = (...seeds) => PublicKey.findProgramAddressSync(seeds, pid)[0]
const u32le = (n) => {
  const b = Buffer.alloc(4)
  b.writeUInt32LE(n)
  return b
}
const exists = async (pk) => (await connection.getAccountInfo(pk)) !== null
const link = (sig) => `https://explorer.solana.com/tx/${sig}?cluster=devnet`

const configPda = pda(Buffer.from('config'))
const labRolePda = pda(Buffer.from('lab_role'), lab.publicKey.toBuffer())
const farmerRolePda = pda(Buffer.from('farmer'), lab.publicKey.toBuffer())
const logisticsRolePda = pda(Buffer.from('logistics'), lab.publicKey.toBuffer())

console.log('lab wallet', lab.publicKey.toBase58())

const bal = await connection.getBalance(lab.publicKey)
if (bal < 50_000_000) {
  const sig = await web3.sendAndConfirmTransaction(
    connection,
    new web3.Transaction().add(
      SystemProgram.transfer({
        fromPubkey: authority.publicKey,
        toPubkey: lab.publicKey,
        lamports: 80_000_000,
      })
    ),
    [authority]
  )
  console.log('funded lab:', link(sig))
}

if (!(await exists(labRolePda))) {
  console.log('addLab:', link(await authProgram.methods.addLab(lab.publicKey).accountsStrict({
    config: configPda,
    labRole: labRolePda,
    authority: authority.publicKey,
    systemProgram: SystemProgram.programId,
  }).rpc()))
}
if (await exists(farmerRolePda)) {
  await authProgram.methods.removeFarmer(lab.publicKey).accountsStrict({
    config: configPda, farmerRole: farmerRolePda, authority: authority.publicKey,
  }).rpc()
}
if (await exists(logisticsRolePda)) {
  await authProgram.methods.removeLogistics(lab.publicKey).accountsStrict({
    config: configPda, logisticsRole: logisticsRolePda, authority: authority.publicKey,
  }).rpc()
}

const hasLab = await exists(labRolePda)
const hasFarmer = await exists(farmerRolePda)
const hasLogistics = await exists(logisticsRolePda)
console.log('roles → lab:', hasLab, 'farmer:', hasFarmer, 'logistics:', hasLogistics)
if (!hasLab || hasFarmer || hasLogistics) throw new Error('not lab-only')

// Prefer CLI arg, else the smoke farmer batch, else flagship
const BATCH_ID = process.argv[2] || 'SMK-FARM-KE0XN7'
const batchPda = pda(Buffer.from('batch'), Buffer.from(BATCH_ID))
if (!(await exists(batchPda))) throw new Error(`batch ${BATCH_ID} not on-chain — pass a real id`)

const before = await labProgram.account.batch.fetch(batchPda)
const labCount = before.labCount
const timelineBefore = before.timelineCount
const labReportPda = pda(Buffer.from('lab'), Buffer.from(BATCH_ID), u32le(labCount))

console.log('updateLabReport on', BATCH_ID, 'at lab index', labCount)

const txSig = await labProgram.methods
  .updateLabReport(
    BATCH_ID,
    new BN(600), // 0.06 ppm — should be high vs 0.05 if classified client-side
    new BN(500),
    new BN(8800),
    { high: {} },
    'Giữ lô',
    'Smoke lab — elevated cadmium'
  )
  .accountsStrict({
    config: configPda,
    batch: batchPda,
    labReport: labReportPda,
    labRole: labRolePda,
    signer: lab.publicKey,
    systemProgram: SystemProgram.programId,
  })
  .rpc()

console.log('updateLabReport OK:', link(txSig))

const after = await labProgram.account.batch.fetch(batchPda)
console.log('labCount', before.labCount, '→', after.labCount)
console.log('timelineCount', timelineBefore, '→', after.timelineCount, '(must be unchanged)')

if (after.labCount !== labCount + 1 || after.timelineCount !== timelineBefore) {
  console.error('SMOKE FAILED')
  process.exit(1)
}

console.log('')
console.log('SMOKE PASSED: lab-only wallet appended a report; timeline untouched.')
console.log('  tx:', link(txSig))
