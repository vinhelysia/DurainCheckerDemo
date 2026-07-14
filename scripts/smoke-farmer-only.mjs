// Prove a farmer-only wallet can register a batch without logistics.
// Expectation after Task 3: ONE primary registerBatch tx succeeds; no timeline
// is required; a bundled timeline would have rolled the whole tx back.
//
// Run from durian-web3/:  node scripts/smoke-farmer-only.mjs
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
const FARMER_PATH = path.join(ROOT, '.keys', 'demo-farmer.json')
const IDL_PATH = path.join(ROOT, 'public', 'solana', 'idl.json')

const secret = JSON.parse(readFileSync(path.join(homedir(), '.config/solana/id.json'), 'utf8'))
const authority = Keypair.fromSecretKey(Uint8Array.from(secret))

function loadOrCreateFarmer() {
  if (existsSync(FARMER_PATH)) {
    return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(FARMER_PATH, 'utf8'))))
  }
  const kp = Keypair.generate()
  mkdirSync(path.dirname(FARMER_PATH), { recursive: true })
  writeFileSync(FARMER_PATH, JSON.stringify(Array.from(kp.secretKey)), { mode: 0o600 })
  console.log('generated demo farmer →', FARMER_PATH)
  return kp
}

const farmer = loadOrCreateFarmer()
const connection = new Connection(RPC, 'confirmed')
const idl = JSON.parse(readFileSync(IDL_PATH, 'utf8'))

const authProvider = new AnchorProvider(connection, new Wallet(authority), { commitment: 'confirmed' })
const authProgram = new Program(idl, authProvider)
const pid = authProgram.programId

const farmerProvider = new AnchorProvider(connection, new Wallet(farmer), { commitment: 'confirmed' })
const farmerProgram = new Program(idl, farmerProvider)

const pda = (...seeds) => PublicKey.findProgramAddressSync(seeds, pid)[0]
const u32le = (n) => {
  const b = Buffer.alloc(4)
  b.writeUInt32LE(n)
  return b
}
const exists = async (pk) => (await connection.getAccountInfo(pk)) !== null
const link = (sig) => `https://explorer.solana.com/tx/${sig}?cluster=devnet`

const configPda = pda(Buffer.from('config'))
const farmerRolePda = pda(Buffer.from('farmer'), farmer.publicKey.toBuffer())
const labRolePda = pda(Buffer.from('lab_role'), farmer.publicKey.toBuffer())
const logisticsRolePda = pda(Buffer.from('logistics'), farmer.publicKey.toBuffer())

console.log('program  ', pid.toBase58())
console.log('authority', authority.publicKey.toBase58())
console.log('farmer   ', farmer.publicKey.toBase58())

// Fund farmer for rent + fees
const bal = await connection.getBalance(farmer.publicKey)
if (bal < 50_000_000) {
  const sig = await web3.sendAndConfirmTransaction(
    connection,
    new web3.Transaction().add(
      SystemProgram.transfer({
        fromPubkey: authority.publicKey,
        toPubkey: farmer.publicKey,
        lamports: 80_000_000,
      })
    ),
    [authority]
  )
  console.log('funded farmer 0.08 SOL:', link(sig))
} else {
  console.log('farmer balance lamports:', bal)
}

// Ensure farmer role ONLY (revoke lab/logistics if present so the test is honest)
if (!(await exists(farmerRolePda))) {
  const sig = await authProgram.methods
    .addFarmer(farmer.publicKey)
    .accountsStrict({
      config: configPda,
      farmerRole: farmerRolePda,
      authority: authority.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc()
  console.log('addFarmer:', link(sig))
} else {
  console.log('farmer role already granted')
}

if (await exists(labRolePda)) {
  const sig = await authProgram.methods
    .removeLab(farmer.publicKey)
    .accountsStrict({
      config: configPda,
      labRole: labRolePda,
      authority: authority.publicKey,
    })
    .rpc()
  console.log('removeLab (keep farmer-only):', link(sig))
}
if (await exists(logisticsRolePda)) {
  const sig = await authProgram.methods
    .removeLogistics(farmer.publicKey)
    .accountsStrict({
      config: configPda,
      logisticsRole: logisticsRolePda,
      authority: authority.publicKey,
    })
    .rpc()
  console.log('removeLogistics (keep farmer-only):', link(sig))
}

const hasFarmer = await exists(farmerRolePda)
const hasLab = await exists(labRolePda)
const hasLogistics = await exists(logisticsRolePda)
console.log('roles → farmer:', hasFarmer, 'lab:', hasLab, 'logistics:', hasLogistics)
if (!hasFarmer || hasLab || hasLogistics) {
  throw new Error('Farmer wallet is not farmer-only — aborting smoke test')
}

// Unique batch id (≤ 32 chars) so re-runs don't collide
const stamp = Date.now().toString(36).toUpperCase().slice(-6)
const BATCH_ID = `SMK-FARM-${stamp}` // e.g. SMK-FARM-M5K2AB (14 chars)
if (BATCH_ID.length > 32) throw new Error('batch id too long')

const batchPda = pda(Buffer.from('batch'), Buffer.from(BATCH_ID))
const lab0 = pda(Buffer.from('lab'), Buffer.from(BATCH_ID), u32le(0))

console.log('registering as farmer-only:', BATCH_ID)

// PRIMARY instruction alone — mirrors fixed useBatchTransaction.registerBatch chain path
const txSig = await farmerProgram.methods
  .registerBatch(
    BATCH_ID,
    'Smoke Farm',
    'Lâm Đồng',
    '2026-07-14',
    new BN(300), // 0.03 ppm
    new BN(500), // 0.05 threshold
    new BN(9000),
    { low: {} },
    'Đạt xuất khẩu',
    'Smoke test — farmer only'
  )
  .accountsStrict({
    config: configPda,
    batch: batchPda,
    labReport: lab0,
    farmerRole: farmerRolePda,
    signer: farmer.publicKey,
    systemProgram: SystemProgram.programId,
  })
  .rpc()

console.log('registerBatch OK:', link(txSig))

const batch = await farmerProgram.account.batch.fetch(batchPda)
const accountInfo = await connection.getAccountInfo(batchPda)

console.log('--- on-chain result ---')
console.log('batch.id          ', batch.id)
console.log('batch.registrant  ', batch.registrant.toBase58())
console.log('batch.owner       ', batch.owner.toBase58())
console.log('batch.labCount    ', batch.labCount)
console.log('batch.timelineCount', batch.timelineCount)
console.log('account.data.length', accountInfo?.data.length)

const ok =
  batch.id === BATCH_ID &&
  batch.registrant.equals(farmer.publicKey) &&
  batch.labCount >= 1 &&
  // New batch: no logistics timeline was written
  batch.timelineCount === 0

if (!ok) {
  console.error('SMOKE FAILED — unexpected account state')
  process.exit(1)
}

console.log('')
console.log('SMOKE PASSED: farmer-only wallet registered a batch in one tx.')
console.log('  No logistics role, timelineCount=0 (Task 3 unbundle holds on-chain).')
console.log('  batch:', BATCH_ID)
console.log('  tx   :', link(txSig))
