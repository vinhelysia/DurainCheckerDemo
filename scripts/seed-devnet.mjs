// Seed the deployed devnet program: initialize config, grant roles to the
// demo wallet, and register the flagship demo batch with its timeline.
// Idempotent: every step checks its PDA before writing.
// Run from durian-web3/:  node scripts/seed-devnet.mjs
import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import anchorPkg from '@coral-xyz/anchor'
import web3 from '@solana/web3.js'

const { AnchorProvider, Program, Wallet, BN } = anchorPkg
const { Connection, Keypair, PublicKey, SystemProgram } = web3

const RPC = process.env.RPC_URL || 'https://api.devnet.solana.com'
const DEMO_WALLET = new PublicKey('D6W3YzaU7KgNTQK5wcdCtVHMdT2x9dFDfpAWWmJr3stU')

const secret = JSON.parse(readFileSync(path.join(homedir(), '.config/solana/id.json'), 'utf8'))
const payer = Keypair.fromSecretKey(Uint8Array.from(secret))
const idl = JSON.parse(readFileSync(new URL('../public/solana/idl.json', import.meta.url), 'utf8'))

const connection = new Connection(RPC, 'confirmed')
const provider = new AnchorProvider(connection, new Wallet(payer), { commitment: 'confirmed' })
const program = new Program(idl, provider)
const pid = program.programId

const pda = (...seeds) => PublicKey.findProgramAddressSync(seeds, pid)[0]
const u32le = (n) => { const b = Buffer.alloc(4); b.writeUInt32LE(n); return b }
const exists = async (pk) => (await connection.getAccountInfo(pk)) !== null
const link = (sig) => `https://explorer.solana.com/tx/${sig}?cluster=devnet`

const configPda = pda(Buffer.from('config'))

console.log('program:', pid.toBase58())
console.log('payer:', payer.publicKey.toBase58())

// 1. initialize
if (await exists(configPda)) {
  console.log('config already initialized')
} else {
  const sig = await program.methods.initialize().accountsStrict({
    config: configPda,
    authority: payer.publicKey,
    systemProgram: SystemProgram.programId,
  }).rpc()
  console.log('initialize:', link(sig))
}

// 2. roles for the demo wallet
const roles = [
  ['addFarmer', 'farmer', pda(Buffer.from('farmer'), DEMO_WALLET.toBuffer())],
  ['addLab', 'lab_role', pda(Buffer.from('lab_role'), DEMO_WALLET.toBuffer())],
  ['addLogistics', 'logistics', pda(Buffer.from('logistics'), DEMO_WALLET.toBuffer())],
]
const roleAccountName = { addFarmer: 'farmerRole', addLab: 'labRole', addLogistics: 'logisticsRole' }
for (const [method, label, rolePda] of roles) {
  if (await exists(rolePda)) {
    console.log(`${label} role already granted`)
    continue
  }
  const sig = await program.methods[method](DEMO_WALLET).accountsStrict({
    config: configPda,
    authority: payer.publicKey,
    [roleAccountName[method]]: rolePda,
    systemProgram: SystemProgram.programId,
  }).rpc()
  console.log(`${method}(${DEMO_WALLET.toBase58().slice(0, 6)}…):`, link(sig))
}

// 3. flagship demo batch (mirrors src/data/batches.js, VI strings)
const BATCH_ID = 'DRN-2026-LD-0428'
const batchPda = pda(Buffer.from('batch'), Buffer.from(BATCH_ID))
if (await exists(batchPda)) {
  console.log(`batch ${BATCH_ID} already registered`)
} else {
  const sig = await program.methods.registerBatch(
    BATCH_ID,
    'Nông trại Tân Phú',
    'Lâm Đồng',
    '2026-04-28',
    new BN(300),   // 0.03 ppm (ten-thousandths)
    new BN(500),   // 0.05 ppm GACC threshold
    new BN(9400),  // 0.94 confidence
    { low: {} },
    'Đạt chuẩn xuất khẩu',
    'Cadimi và Vàng O trong ngưỡng cho phép',
  ).accountsStrict({
    config: configPda,
    batch: batchPda,
    labReport: pda(Buffer.from('lab'), Buffer.from(BATCH_ID), u32le(0)),
    farmerRole: null,
    signer: payer.publicKey,
    systemProgram: SystemProgram.programId,
  }).rpc()
  console.log(`registerBatch ${BATCH_ID}:`, link(sig))
}

// 4. timeline events
const events = [
  ['Thu hoạch', 'Nông trại Tân Phú, Lâm Đồng', '2026-04-28', { delivered: {} }],
  ['Kiểm nghiệm', 'Trung tâm kiểm định Đà Lạt', '2026-04-30', { delivered: {} }],
  ['Đóng gói', 'Nhà đóng gói Bảo Lộc', '2026-05-02', { delivered: {} }],
  ['Xuất khẩu', 'Cảng Cát Lái - Trung Quốc', '2026-05-05', { inTransit: {} }],
]
for (const [stage, location, date, status] of events) {
  const batch = await program.account.batch.fetch(batchPda)
  const index = batch.timelineCount
  if (index >= events.length) break
  const [expStage] = events[index]
  if (expStage !== stage) continue // already recorded in an earlier run
  const sig = await program.methods.addTimelineEvent(BATCH_ID, stage, location, date, status)
    .accountsStrict({
      config: configPda,
      batch: batchPda,
      timelineEvent: pda(Buffer.from('timeline'), Buffer.from(BATCH_ID), u32le(index)),
      logisticsRole: null,
      signer: payer.publicKey,
      systemProgram: SystemProgram.programId,
    }).rpc()
  console.log(`addTimelineEvent[${index}] ${stage}:`, link(sig))
}

const finalBatch = await program.account.batch.fetch(batchPda)
console.log(`done: batch ${BATCH_ID} on-chain, timeline_count=${finalBatch.timelineCount}, lab_count=${finalBatch.labCount}`)
