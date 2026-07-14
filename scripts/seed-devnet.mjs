// Seed the deployed devnet program: initialize config, grant roles to the
// demo wallet, and register the flagship demo batch with its timeline.
// Idempotent: every step checks its PDA before writing.
// Run from durian-web3/:  node scripts/seed-devnet.mjs
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import anchorPkg from '@coral-xyz/anchor'
import web3 from '@solana/web3.js'

const { AnchorProvider, Program, Wallet, BN } = anchorPkg
const { Connection, Keypair, PublicKey, SystemProgram } = web3

const RPC = process.env.RPC_URL || 'https://api.devnet.solana.com'
// The Phantom wallet the demo is driven from. Roles are granted to it, and the final
// custody handoff is left pending for it so the accept can be signed live on stage.
// (Was D6W3Yza…3stU until 2026-07-14; that wallet's recovery phrase was lost, and the
// program has no admin override to reassign custody — so the handoff was simply
// re-sent by the current owner to this address instead.)
const DEMO_WALLET = new PublicKey('2BARgkoYQPL7ngMerfCh21CpGRepuZdVtMGr7do1ssko')

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
//
// Was DRN-2026-LD-0428 until the custody fields were added to Batch (+69 bytes).
// That PDA still holds an old, undersized record that can no longer be deserialised
// and cannot be re-inited (the id is the seed) or closed (the ledger is append-only
// by design). The client filters batches by account size, so the stale one is simply
// invisible on-chain; the flagship id moved on rather than corrupting the ledger.
const BATCH_ID = 'DRN-2026-LD-0429'
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

// 5. chain of custody: farm → packhouse → exporter, then a handoff left *pending*
// for the demo wallet so it can be accepted live from #/manage with Phantom.
// Accepting requires the receiver's signature, so the seeded hops need stable
// keypairs across re-runs (funding is reusable). Keys live in a gitignored
// local file — never public seed strings in source.
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OPERATORS_PATH = path.join(__dirname, '..', '.keys', 'seed-operators.json')

function loadOrCreateOperators() {
  if (existsSync(OPERATORS_PATH)) {
    const raw = JSON.parse(readFileSync(OPERATORS_PATH, 'utf8'))
    const packer = Keypair.fromSecretKey(Uint8Array.from(raw.packer))
    const exporter = Keypair.fromSecretKey(Uint8Array.from(raw.exporter))
    console.log('loaded custody operators from', OPERATORS_PATH)
    console.log('  packer:  ', packer.publicKey.toBase58())
    console.log('  exporter:', exporter.publicKey.toBase58())
    return { packer, exporter }
  }
  const packer = Keypair.generate()
  const exporter = Keypair.generate()
  mkdirSync(path.dirname(OPERATORS_PATH), { recursive: true })
  writeFileSync(
    OPERATORS_PATH,
    JSON.stringify({
      packer: Array.from(packer.secretKey),
      exporter: Array.from(exporter.secretKey),
    }),
    { mode: 0o600 }
  )
  console.log('generated new custody operators →', OPERATORS_PATH)
  console.log('  packer:  ', packer.publicKey.toBase58())
  console.log('  exporter:', exporter.publicKey.toBase58())
  return { packer, exporter }
}

const { packer, exporter } = loadOrCreateOperators()

const keyring = new Map(
  [payer, packer, exporter].map((kp) => [kp.publicKey.toBase58(), kp])
)
const progFor = (kp) =>
  new Program(idl, new AnchorProvider(connection, new Wallet(kp), { commitment: 'confirmed' }))

// custody accept pays rent for a CustodyRecord PDA, so the receivers need a little SOL
for (const kp of [packer, exporter]) {
  if ((await connection.getBalance(kp.publicKey)) >= 20_000_000) continue
  const tx = new web3.Transaction().add(
    SystemProgram.transfer({
      fromPubkey: payer.publicKey,
      toPubkey: kp.publicKey,
      lamports: 20_000_000, // 0.02 SOL
    })
  )
  await web3.sendAndConfirmTransaction(connection, tx, [payer])
  console.log(`funded ${kp.publicKey.toBase58().slice(0, 6)}… with 0.02 SOL`)
}

const propose = (fromKp, toPk) =>
  progFor(fromKp).methods.transferCustody(BATCH_ID, toPk).accountsStrict({
    config: configPda,
    batch: batchPda,
    signer: fromKp.publicKey,
  }).rpc()

const accept = (toKp, role, location, index) =>
  progFor(toKp).methods.acceptCustody(BATCH_ID, role, location).accountsStrict({
    config: configPda,
    batch: batchPda,
    custodyRecord: pda(Buffer.from('custody'), Buffer.from(BATCH_ID), u32le(index)),
    signer: toKp.publicKey,
    systemProgram: SystemProgram.programId,
  }).rpc()

const custodyChain = [
  { to: packer,   role: { packer: {} },   location: 'Nhà đóng gói Bảo Lộc' },
  { to: exporter, role: { exporter: {} }, location: 'Cảng Cát Lái' },
]

for (let i = 0; i < custodyChain.length; i++) {
  const { to, role, location } = custodyChain[i]
  let batch = await program.account.batch.fetch(batchPda)
  if (batch.custodyCount > i) {
    console.log(`custody hop ${i} already recorded`)
    continue
  }
  if (!batch.pendingOwner || !batch.pendingOwner.equals(to.publicKey)) {
    const ownerKp = keyring.get(batch.owner.toBase58())
    if (!ownerKp) throw new Error(`no key for current owner ${batch.owner.toBase58()}`)
    console.log(`transferCustody[${i}] →`, link(await propose(ownerKp, to.publicKey)))
  }
  console.log(`acceptCustody[${i}] ${location}:`, link(await accept(to, role, location, i)))
}

// final hop: propose to the demo wallet and leave it pending for a live accept
const beforeHandoff = await program.account.batch.fetch(batchPda)
if (beforeHandoff.pendingOwner && beforeHandoff.pendingOwner.equals(DEMO_WALLET)) {
  console.log('handoff to demo wallet already pending')
} else if (beforeHandoff.owner.equals(DEMO_WALLET)) {
  console.log('demo wallet already holds custody')
} else {
  const ownerKp = keyring.get(beforeHandoff.owner.toBase58())
  console.log('transferCustody → demo wallet (pending):', link(await propose(ownerKp, DEMO_WALLET)))
}

const finalBatch = await program.account.batch.fetch(batchPda)
const pending = finalBatch.pendingOwner ? finalBatch.pendingOwner.toBase58() : 'none'
console.log(
  `done: batch ${BATCH_ID} on-chain, timeline_count=${finalBatch.timelineCount},` +
  ` lab_count=${finalBatch.labCount}, custody_count=${finalBatch.custodyCount}`
)
console.log(`     owner=${finalBatch.owner.toBase58()} pending_owner=${pending}`)
