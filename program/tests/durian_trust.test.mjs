/**
 * Durian Trust — Anchor integration tests (solana-bankrun)
 *
 * SETUP REQUIRED before `anchor test` will pass:
 *   1. solana-keygen new --no-bip39-passphrase \
 *        -o program/target/deploy/durian_trust-keypair.json
 *   2. Update declare_id!("...") in programs/durian_trust/src/lib.rs
 *      with the address printed above.
 *   3. Update [programs.localnet] + [programs.devnet] in Anchor.toml
 *      to the same address.
 *   4. anchor build   ← regenerates target/idl/durian_trust.json
 *   5. initialize() is gated to GENESIS_AUTHORITY
 *      (52WpskyDdHaLyAcyTLQrqvLBUh3azKFAe3XmNkYDaFJu). Point ANCHOR_WALLET
 *      at that deployer keypair (usually ~/.config/solana/id.json) so the
 *      suite can sign initialize. Without it, initialize tests fail closed.
 *
 * Phase-2 tests (authority transfer, pause gating, enum rejection)
 * are marked describe.skip — they require those features in lib.rs first.
 */

import { startAnchor } from 'anchor-bankrun'
import { BankrunProvider } from 'anchor-bankrun'
import { Program, AnchorError, BN } from '@coral-xyz/anchor'
import { Keypair, PublicKey, SystemProgram } from '@solana/web3.js'
import { readFileSync, existsSync } from 'fs'
import { homedir } from 'os'
import { fileURLToPath } from 'url'
import { dirname, resolve, join } from 'path'
import assert from 'assert/strict'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const IDL = JSON.parse(
  readFileSync(resolve(__dirname, '../target/idl/durian_trust.json'), 'utf8')
)

// Must match GENESIS_AUTHORITY in programs/durian_trust/src/lib.rs
const GENESIS_PUBKEY = '52WpskyDdHaLyAcyTLQrqvLBUh3azKFAe3XmNkYDaFJu'

function tryLoadGenesisKeypair() {
  const candidates = [
    process.env.ANCHOR_WALLET,
    process.env.SOLANA_WALLET,
    join(homedir(), '.config/solana/id.json'),
  ].filter(Boolean)
  for (const p of candidates) {
    try {
      if (!existsSync(p)) continue
      const kp = Keypair.fromSecretKey(
        Uint8Array.from(JSON.parse(readFileSync(p, 'utf8')))
      )
      if (kp.publicKey.toBase58() === GENESIS_PUBKEY) return kp
    } catch {
      // try next path
    }
  }
  return null
}

// ─── Test keypairs (funded via startAnchor initial accounts) ─────────────────

const farmer        = Keypair.generate()
const labUser       = Keypair.generate()
const logisticsUser = Keypair.generate()
const intruder      = Keypair.generate()
const tempTarget    = Keypair.generate() // used only for remove-role tests
const genesisKp     = tryLoadGenesisKeypair()

const SOL10 = 10_000_000_000

// ─── Module-level state set in top-level before() ────────────────────────────

let context, provider, program, authority, pid

// ─── PDA helpers ─────────────────────────────────────────────────────────────

const pda = {
  config:     (p = pid) => pf([Buffer.from('config')], p),
  batch:      (id, p = pid) => pf([Buffer.from('batch'), Buffer.from(id)], p),
  lab:        (id, idx, p = pid) => pf([Buffer.from('lab'),      Buffer.from(id), u32le(idx)], p),
  timeline:   (id, idx, p = pid) => pf([Buffer.from('timeline'), Buffer.from(id), u32le(idx)], p),
  custody:    (id, idx, p = pid) => pf([Buffer.from('custody'),  Buffer.from(id), u32le(idx)], p),
  farmer:     (user, p = pid) => pf([Buffer.from('farmer'),    user.toBuffer()], p),
  labRole:    (user, p = pid) => pf([Buffer.from('lab_role'),  user.toBuffer()], p),
  logistics:  (user, p = pid) => pf([Buffer.from('logistics'), user.toBuffer()], p),
}

function pf(seeds, programId) {
  return PublicKey.findProgramAddressSync(seeds, programId)[0]
}
function u32le(n) {
  const b = Buffer.alloc(4)
  b.writeUInt32LE(n)
  return b
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fundedAccount(publicKey) {
  return {
    address: publicKey,
    info: {
      lamports: SOL10,
      data:     Buffer.alloc(0),
      owner:    SystemProgram.programId,
      executable: false,
    },
  }
}

function providerFor(keypair) {
  const wallet = {
    publicKey: keypair.publicKey,
    payer:     keypair,
    signTransaction: async (tx) => {
      if (typeof tx.sign === 'function') tx.sign([keypair])
      else tx.partialSign(keypair)
      return tx
    },
    signAllTransactions: async (txs) => {
      for (const tx of txs) {
        if (typeof tx.sign === 'function') tx.sign([keypair])
        else tx.partialSign(keypair)
      }
      return txs
    },
  }
  return new BankrunProvider(context, wallet)
}

function programFor(keypair) {
  return new Program(IDL, providerFor(keypair))
}

function expectAnchorError(codeName) {
  return (err) => {
    const code =
      err instanceof AnchorError ? err.error?.errorCode?.code : undefined
    if (code !== codeName) {
      throw new Error(
        `Expected AnchorError "${codeName}", got: ${code ?? String(err)}`
      )
    }
    return true
  }
}

// ─── Ed25519 ix layout helpers (mirrors verify_ed25519_ix in lib.rs) ─────────
// Full bankrun exercise of the Ed25519 precompile + instructions sysvar is not
// wired here; these pure checks lock the header contract the on-chain parser uses.

const ED25519_IX_INDEX_SELF = 0xffff

/**
 * Build a single-entry Ed25519SigVerify instruction data buffer.
 * Layout (one entry): count, pad, then 14-byte offsets header, then sig/pk/msg.
 *
 * @param {{
 *   count?: number,
 *   sigIxIndex?: number,
 *   pubkeyIxIndex?: number,
 *   msgIxIndex?: number,
 * }} [opts]
 */
function buildEd25519IxData(opts = {}) {
  const count = opts.count ?? 1
  const sigIxIndex = opts.sigIxIndex ?? ED25519_IX_INDEX_SELF
  const pubkeyIxIndex = opts.pubkeyIxIndex ?? ED25519_IX_INDEX_SELF
  const msgIxIndex = opts.msgIxIndex ?? ED25519_IX_INDEX_SELF

  const sigOffset = 16
  const pubkeyOffset = 80 // 16 + 64
  const msgOffset = 112 // 80 + 32
  const msgSize = 32

  const data = Buffer.alloc(msgOffset + msgSize)
  data[0] = count
  data[1] = 0
  data.writeUInt16LE(sigOffset, 2)
  data.writeUInt16LE(sigIxIndex, 4)
  data.writeUInt16LE(pubkeyOffset, 6)
  data.writeUInt16LE(pubkeyIxIndex, 8)
  data.writeUInt16LE(msgOffset, 10)
  data.writeUInt16LE(msgSize, 12)
  data.writeUInt16LE(msgIxIndex, 14)
  return data
}

/**
 * Pure JS mirror of the header gates in `verify_ed25519_ix` (count + ix indexes).
 * Returns null if ok, or a reason string if rejected.
 */
function rejectEd25519Header(data) {
  if (!(data instanceof Uint8Array) || data.length < 16) {
    return 'too_short'
  }
  if (data[0] !== 1) {
    return 'count_not_one'
  }
  const sigIxIndex = data[4] | (data[5] << 8)
  const pubkeyIxIndex = data[8] | (data[9] << 8)
  const msgIxIndex = data[14] | (data[15] << 8)
  if (
    sigIxIndex !== ED25519_IX_INDEX_SELF ||
    pubkeyIxIndex !== ED25519_IX_INDEX_SELF ||
    msgIxIndex !== ED25519_IX_INDEX_SELF
  ) {
    return 'ix_index_not_self'
  }
  return null
}

async function registerBatch(prog, signer, id, farmerRoleAddr = null) {
  return prog.methods
    .registerBatch(
      id,
      'Musang King Farm',
      'Pahang',
      '2025-01-10',
      new BN(5000),
      new BN(10000),
      new BN(9500),
      1,
      'Low risk',
      'Normal cadmium levels'
    )
    .accounts({
      config:        pda.config(),
      batch:         pda.batch(id),
      labReport:     pda.lab(id, 0),
      farmerRole:    farmerRoleAddr,
      signer:        signer.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .signers([signer])
    .rpc()
}

// ─── Suite ───────────────────────────────────────────────────────────────────

describe('durian_trust', function () {
  this.timeout(60_000)

  before(async function () {
    const initial = [
      fundedAccount(farmer.publicKey),
      fundedAccount(labUser.publicKey),
      fundedAccount(logisticsUser.publicKey),
      fundedAccount(intruder.publicKey),
      fundedAccount(tempTarget.publicKey),
    ]
    if (genesisKp) initial.unshift(fundedAccount(genesisKp.publicKey))

    context = await startAnchor('.', [], initial)
    provider  = new BankrunProvider(context)
    pid       = new Program(IDL, provider).programId

    // Prefer the real genesis deployer key so initialize() can pass the on-chain gate.
    if (genesisKp) {
      authority = genesisKp
      provider  = providerFor(genesisKp)
      program   = programFor(genesisKp)
    } else {
      authority = provider.wallet.payer
      program   = new Program(IDL, provider)
      console.warn(
        '[durian_trust tests] Genesis keypair not loaded. ' +
          `initialize requires ${GENESIS_PUBKEY}. Set ANCHOR_WALLET to that keypair JSON.`
      )
    }
  })

  // ── initialize ─────────────────────────────────────────────────────────

  describe('initialize', function () {
    it('rejects a non-genesis signer with Unauthorized', async function () {
      const prog2 = programFor(intruder)
      await assert.rejects(
        () =>
          prog2.methods
            .initialize()
            .accounts({
              config:        pda.config(),
              authority:     intruder.publicKey,
              systemProgram: SystemProgram.programId,
            })
            .signers([intruder])
            .rpc(),
        expectAnchorError('Unauthorized')
      )
    })

    it('creates config with authority and zero token counter', async function () {
      if (!genesisKp) {
        this.skip()
      }
      await program.methods
        .initialize()
        .accounts({
          config:        pda.config(),
          authority:     authority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([authority])
        .rpc()

      const cfg = await program.account.config.fetch(pda.config())
      assert.ok(cfg.authority.equals(authority.publicKey), 'authority mismatch')
      assert.equal(cfg.authority.toBase58(), GENESIS_PUBKEY)
      assert.equal(cfg.nextTokenId.toNumber(), 0)
    })
  })

  // ── role management — authority checks ─────────────────────────────────

  describe('addFarmer / removeFarmer', function () {
    it('authority grants farmer role', async function () {
      await program.methods
        .addFarmer(farmer.publicKey)
        .accounts({
          config:        pda.config(),
          authority:     authority.publicKey,
          farmerRole:    pda.farmer(farmer.publicKey),
          systemProgram: SystemProgram.programId,
        })
        .signers([authority])
        .rpc()

      await program.account.farmerRole.fetch(pda.farmer(farmer.publicKey))
    })

    it('non-authority cannot grant farmer role', async function () {
      const prog2 = programFor(intruder)
      await assert.rejects(
        () =>
          prog2.methods
            .addFarmer(tempTarget.publicKey)
            .accounts({
              config:        pda.config(),
              authority:     intruder.publicKey,
              farmerRole:    pda.farmer(tempTarget.publicKey),
              systemProgram: SystemProgram.programId,
            })
            .signers([intruder])
            .rpc(),
        expectAnchorError('Unauthorized')
      )
    })

    it('authority revokes farmer role (temp target)', async function () {
      // Grant to temp target first
      await program.methods
        .addFarmer(tempTarget.publicKey)
        .accounts({
          config:        pda.config(),
          authority:     authority.publicKey,
          farmerRole:    pda.farmer(tempTarget.publicKey),
          systemProgram: SystemProgram.programId,
        })
        .signers([authority])
        .rpc()

      await program.methods
        .removeFarmer(tempTarget.publicKey)
        .accounts({
          config:     pda.config(),
          authority:  authority.publicKey,
          farmerRole: pda.farmer(tempTarget.publicKey),
        })
        .signers([authority])
        .rpc()

      const info = await context.banksClient.getAccount(pda.farmer(tempTarget.publicKey))
      assert.equal(info, null, 'farmer role account should be closed')
    })
  })

  describe('addLab / removeLab', function () {
    it('authority grants lab role', async function () {
      await program.methods
        .addLab(labUser.publicKey)
        .accounts({
          config:        pda.config(),
          authority:     authority.publicKey,
          labRole:       pda.labRole(labUser.publicKey),
          systemProgram: SystemProgram.programId,
        })
        .signers([authority])
        .rpc()

      await program.account.labRole.fetch(pda.labRole(labUser.publicKey))
    })

    it('non-authority cannot grant lab role', async function () {
      const prog2 = programFor(intruder)
      await assert.rejects(
        () =>
          prog2.methods
            .addLab(tempTarget.publicKey)
            .accounts({
              config:        pda.config(),
              authority:     intruder.publicKey,
              labRole:       pda.labRole(tempTarget.publicKey),
              systemProgram: SystemProgram.programId,
            })
            .signers([intruder])
            .rpc(),
        expectAnchorError('Unauthorized')
      )
    })

    it('authority revokes lab role (temp target)', async function () {
      await program.methods
        .addLab(tempTarget.publicKey)
        .accounts({
          config:        pda.config(),
          authority:     authority.publicKey,
          labRole:       pda.labRole(tempTarget.publicKey),
          systemProgram: SystemProgram.programId,
        })
        .signers([authority])
        .rpc()

      await program.methods
        .removeLab(tempTarget.publicKey)
        .accounts({
          config:    pda.config(),
          authority: authority.publicKey,
          labRole:   pda.labRole(tempTarget.publicKey),
        })
        .signers([authority])
        .rpc()

      const info = await context.banksClient.getAccount(pda.labRole(tempTarget.publicKey))
      assert.equal(info, null, 'lab role account should be closed')
    })
  })

  describe('addLogistics / removeLogistics', function () {
    it('authority grants logistics role', async function () {
      await program.methods
        .addLogistics(logisticsUser.publicKey)
        .accounts({
          config:          pda.config(),
          authority:       authority.publicKey,
          logisticsRole:   pda.logistics(logisticsUser.publicKey),
          systemProgram:   SystemProgram.programId,
        })
        .signers([authority])
        .rpc()

      await program.account.logisticsRole.fetch(pda.logistics(logisticsUser.publicKey))
    })

    it('non-authority cannot grant logistics role', async function () {
      const prog2 = programFor(intruder)
      await assert.rejects(
        () =>
          prog2.methods
            .addLogistics(tempTarget.publicKey)
            .accounts({
              config:        pda.config(),
              authority:     intruder.publicKey,
              logisticsRole: pda.logistics(tempTarget.publicKey),
              systemProgram: SystemProgram.programId,
            })
            .signers([intruder])
            .rpc(),
        expectAnchorError('Unauthorized')
      )
    })

    it('authority revokes logistics role (temp target)', async function () {
      await program.methods
        .addLogistics(tempTarget.publicKey)
        .accounts({
          config:        pda.config(),
          authority:     authority.publicKey,
          logisticsRole: pda.logistics(tempTarget.publicKey),
          systemProgram: SystemProgram.programId,
        })
        .signers([authority])
        .rpc()

      await program.methods
        .removeLogistics(tempTarget.publicKey)
        .accounts({
          config:        pda.config(),
          authority:     authority.publicKey,
          logisticsRole: pda.logistics(tempTarget.publicKey),
        })
        .signers([authority])
        .rpc()

      const info = await context.banksClient.getAccount(pda.logistics(tempTarget.publicKey))
      assert.equal(info, null)
    })
  })

  // ── registerBatch ───────────────────────────────────────────────────────

  describe('registerBatch', function () {
    const BATCH_A = 'DRN-2025-001'
    const BATCH_B = 'DRN-2025-002'

    it('authority registers a batch without a farmer role', async function () {
      await registerBatch(program, authority, BATCH_A)

      const batch = await program.account.batch.fetch(pda.batch(BATCH_A))
      assert.equal(batch.id, BATCH_A)
      assert.equal(batch.farm, 'Musang King Farm')
      assert.equal(batch.province, 'Pahang')
      assert.equal(batch.labCount.toNumber(), 1)
      assert.equal(batch.timelineCount.toNumber(), 0)
      assert.ok(batch.registrant.equals(authority.publicKey))

      const cfg = await program.account.config.fetch(pda.config())
      assert.equal(cfg.nextTokenId.toNumber(), 1)
    })

    it('initial lab report data is stored correctly', async function () {
      const lab = await program.account.labReport.fetch(pda.lab(BATCH_A, 0))
      assert.equal(lab.cadmiumPpm.toNumber(), 5000)
      assert.equal(lab.thresholdPpm.toNumber(), 10000)
      assert.equal(lab.riskLevel, 1)
      assert.ok(lab.reporter.equals(authority.publicKey))
    })

    it('farmer role holder can register a batch', async function () {
      const prog2 = programFor(farmer)
      await registerBatch(prog2, farmer, BATCH_B, pda.farmer(farmer.publicKey))

      const batch = await program.account.batch.fetch(pda.batch(BATCH_B))
      assert.ok(batch.registrant.equals(farmer.publicKey))
    })

    it('unauthorized signer is rejected', async function () {
      const prog2 = programFor(intruder)
      await assert.rejects(
        () => registerBatch(prog2, intruder, 'DRN-UNAUTH'),
        expectAnchorError('Unauthorized')
      )
    })

    it('id exceeding 32 bytes is rejected (StringTooLong)', async function () {
      await assert.rejects(
        () => registerBatch(program, authority, 'X'.repeat(33)),
        expectAnchorError('StringTooLong')
      )
    })

    it('farm name exceeding 96 bytes is rejected (StringTooLong)', async function () {
      const id = 'DRN-OVERFLOW'
      await assert.rejects(
        () =>
          program.methods
            .registerBatch(
              id, 'F'.repeat(97), 'Pahang', '2025-01-01',
              new BN(0), new BN(0), new BN(0), 0, 'x', 'x'
            )
            .accounts({
              config:        pda.config(),
              batch:         pda.batch(id),
              labReport:     pda.lab(id, 0),
              farmerRole:    null,
              signer:        authority.publicKey,
              systemProgram: SystemProgram.programId,
            })
            .signers([authority])
            .rpc(),
        expectAnchorError('StringTooLong')
      )
    })

    it('ai_result exceeding 256 bytes is rejected (StringTooLong)', async function () {
      const id = 'DRN-AIOVERFLOW'
      await assert.rejects(
        () =>
          program.methods
            .registerBatch(
              id, 'Farm', 'Pahang', '2025-01-01',
              new BN(0), new BN(0), new BN(0), 0,
              'A'.repeat(257), 'x'
            )
            .accounts({
              config:        pda.config(),
              batch:         pda.batch(id),
              labReport:     pda.lab(id, 0),
              farmerRole:    null,
              signer:        authority.publicKey,
              systemProgram: SystemProgram.programId,
            })
            .signers([authority])
            .rpc(),
        expectAnchorError('StringTooLong')
      )
    })
  })

  // ── addTimelineEvent ────────────────────────────────────────────────────

  describe('addTimelineEvent', function () {
    const BATCH_A = 'DRN-2025-001'
    const BATCH_B = 'DRN-2025-002'

    it('authority appends a timeline event at index 0', async function () {
      await program.methods
        .addTimelineEvent(BATCH_A, 'Harvest', 'Bentong, Pahang', '2025-01-15', 1)
        .accounts({
          config:        pda.config(),
          batch:         pda.batch(BATCH_A),
          timelineEvent: pda.timeline(BATCH_A, 0),
          logisticsRole: null,
          signer:        authority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([authority])
        .rpc()

      const ev = await program.account.timelineEvent.fetch(pda.timeline(BATCH_A, 0))
      assert.equal(ev.stage, 'Harvest')
      assert.equal(ev.location, 'Bentong, Pahang')
      assert.equal(ev.status, 1)

      const batch = await program.account.batch.fetch(pda.batch(BATCH_A))
      assert.equal(batch.timelineCount.toNumber(), 1)
    })

    it('logistics role holder can append timeline events', async function () {
      const prog2 = programFor(logisticsUser)
      await prog2.methods
        .addTimelineEvent(BATCH_B, 'Transport', 'KL Hub', '2025-01-20', 2)
        .accounts({
          config:        pda.config(),
          batch:         pda.batch(BATCH_B),
          timelineEvent: pda.timeline(BATCH_B, 0),
          logisticsRole: pda.logistics(logisticsUser.publicKey),
          signer:        logisticsUser.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([logisticsUser])
        .rpc()

      const batch = await program.account.batch.fetch(pda.batch(BATCH_B))
      assert.equal(batch.timelineCount.toNumber(), 1)
    })

    it('events are appended at sequential PDA indexes', async function () {
      await program.methods
        .addTimelineEvent(BATCH_A, 'Processing', 'Facility A', '2025-01-16', 2)
        .accounts({
          config:        pda.config(),
          batch:         pda.batch(BATCH_A),
          timelineEvent: pda.timeline(BATCH_A, 1),
          logisticsRole: null,
          signer:        authority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([authority])
        .rpc()

      const ev = await program.account.timelineEvent.fetch(pda.timeline(BATCH_A, 1))
      assert.equal(ev.stage, 'Processing')
    })

    it('unauthorized signer is rejected', async function () {
      const prog2 = programFor(intruder)
      const batch = await program.account.batch.fetch(pda.batch(BATCH_A))
      await assert.rejects(
        () =>
          prog2.methods
            .addTimelineEvent(BATCH_A, 'Fake', 'Nowhere', '2025-01-01', 0)
            .accounts({
              config:        pda.config(),
              batch:         pda.batch(BATCH_A),
              timelineEvent: pda.timeline(BATCH_A, batch.timelineCount.toNumber()),
              logisticsRole: null,
              signer:        intruder.publicKey,
              systemProgram: SystemProgram.programId,
            })
            .signers([intruder])
            .rpc(),
        expectAnchorError('Unauthorized')
      )
    })
  })

  // ── updateLabReport ─────────────────────────────────────────────────────

  describe('updateLabReport', function () {
    const BATCH_A = 'DRN-2025-001'

    it('lab role holder appends a new lab report', async function () {
      const prog2 = programFor(labUser)
      // BATCH_A has labCount=1 after registerBatch; next report is at index 1
      await prog2.methods
        .updateLabReport(
          BATCH_A,
          new BN(4500),
          new BN(10000),
          new BN(9800),
          0,
          'Updated: below threshold',
          'Normal seasonal variation'
        )
        .accounts({
          config:        pda.config(),
          batch:         pda.batch(BATCH_A),
          labReport:     pda.lab(BATCH_A, 1),
          labRole:       pda.labRole(labUser.publicKey),
          signer:        labUser.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([labUser])
        .rpc()

      const lab = await program.account.labReport.fetch(pda.lab(BATCH_A, 1))
      assert.equal(lab.cadmiumPpm.toNumber(), 4500)
      assert.equal(lab.riskLevel, 0)
      assert.ok(lab.reporter.equals(labUser.publicKey))

      const batch = await program.account.batch.fetch(pda.batch(BATCH_A))
      assert.equal(batch.labCount.toNumber(), 2, 'lab_count should increment')
    })

    it('authority can also append lab reports', async function () {
      const batch = await program.account.batch.fetch(pda.batch(BATCH_A))
      const idx   = batch.labCount.toNumber()

      await program.methods
        .updateLabReport(
          BATCH_A,
          new BN(3000),
          new BN(10000),
          new BN(9900),
          0,
          'Re-test: clear',
          'Third party verification'
        )
        .accounts({
          config:        pda.config(),
          batch:         pda.batch(BATCH_A),
          labReport:     pda.lab(BATCH_A, idx),
          labRole:       null,
          signer:        authority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([authority])
        .rpc()

      const lab = await program.account.labReport.fetch(pda.lab(BATCH_A, idx))
      assert.ok(lab.reporter.equals(authority.publicKey))
    })

    it('unauthorized signer is rejected', async function () {
      const prog2 = programFor(intruder)
      const batch = await program.account.batch.fetch(pda.batch(BATCH_A))
      const idx   = batch.labCount.toNumber()

      await assert.rejects(
        () =>
          prog2.methods
            .updateLabReport(
              BATCH_A,
              new BN(0), new BN(0), new BN(0), 0, 'Fake', 'Fake'
            )
            .accounts({
              config:        pda.config(),
              batch:         pda.batch(BATCH_A),
              labReport:     pda.lab(BATCH_A, idx),
              labRole:       null,
              signer:        intruder.publicKey,
              systemProgram: SystemProgram.programId,
            })
            .signers([intruder])
            .rpc(),
        expectAnchorError('Unauthorized')
      )
    })
  })

  describe('transferCustody / acceptCustody', function () {
    const BATCH_C = 'BATCH-CUSTODY-1'
    const receiver = logisticsUser // any funded keypair; custody is gated on ownership, not role

    before(async function () {
      await registerBatch(program, authority, BATCH_C)
    })

    it('registrant is the initial owner, with no pending transfer', async function () {
      const b = await program.account.batch.fetch(pda.batch(BATCH_C))
      assert.equal(b.owner.toBase58(), authority.publicKey.toBase58())
      assert.equal(b.pendingOwner, null)
      assert.equal(b.custodyCount, 0)
    })

    it('a non-owner cannot propose a transfer', async function () {
      await assert.rejects(
        () =>
          programFor(intruder)
            .methods.transferCustody(BATCH_C, intruder.publicKey)
            .accounts({
              config: pda.config(),
              batch:  pda.batch(BATCH_C),
              signer: intruder.publicKey,
            })
            .signers([intruder])
            .rpc(),
        expectAnchorError('Unauthorized')
      )
    })

    it('the owner cannot transfer custody to itself', async function () {
      await assert.rejects(
        () =>
          program.methods
            .transferCustody(BATCH_C, authority.publicKey)
            .accounts({
              config: pda.config(),
              batch:  pda.batch(BATCH_C),
              signer: authority.publicKey,
            })
            .rpc(),
        expectAnchorError('SelfCustodyTransfer')
      )
    })

    it('accept is rejected when nothing is pending', async function () {
      await assert.rejects(
        () =>
          programFor(receiver)
            .methods.acceptCustody(BATCH_C, { packer: {} }, 'Cai Lay packhouse')
            .accounts({
              config:        pda.config(),
              batch:         pda.batch(BATCH_C),
              custodyRecord: pda.custody(BATCH_C, 0),
              signer:        receiver.publicKey,
              systemProgram: SystemProgram.programId,
            })
            .signers([receiver])
            .rpc(),
        expectAnchorError('NoPendingCustody')
      )
    })

    it('the owner nominates a successor without yet losing ownership', async function () {
      await program.methods
        .transferCustody(BATCH_C, receiver.publicKey)
        .accounts({
          config: pda.config(),
          batch:  pda.batch(BATCH_C),
          signer: authority.publicKey,
        })
        .rpc()

      const b = await program.account.batch.fetch(pda.batch(BATCH_C))
      assert.equal(b.pendingOwner.toBase58(), receiver.publicKey.toBase58())
      assert.equal(b.owner.toBase58(), authority.publicKey.toBase58())
      assert.equal(b.custodyCount, 0)
    })

    it('a party who was not nominated cannot accept', async function () {
      await assert.rejects(
        () =>
          programFor(intruder)
            .methods.acceptCustody(BATCH_C, { packer: {} }, 'Cai Lay packhouse')
            .accounts({
              config:        pda.config(),
              batch:         pda.batch(BATCH_C),
              custodyRecord: pda.custody(BATCH_C, 0),
              signer:        intruder.publicKey,
              systemProgram: SystemProgram.programId,
            })
            .signers([intruder])
            .rpc(),
        expectAnchorError('Unauthorized')
      )
    })

    it('the nominee accepts, taking ownership and appending a custody record', async function () {
      await programFor(receiver)
        .methods.acceptCustody(BATCH_C, { packer: {} }, 'Cai Lay packhouse')
        .accounts({
          config:        pda.config(),
          batch:         pda.batch(BATCH_C),
          custodyRecord: pda.custody(BATCH_C, 0),
          signer:        receiver.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([receiver])
        .rpc()

      const b = await program.account.batch.fetch(pda.batch(BATCH_C))
      assert.equal(b.owner.toBase58(), receiver.publicKey.toBase58())
      assert.equal(b.pendingOwner, null)
      assert.equal(b.custodyCount, 1)

      const rec = await program.account.custodyRecord.fetch(pda.custody(BATCH_C, 0))
      assert.equal(rec.from.toBase58(), authority.publicKey.toBase58())
      assert.equal(rec.to.toBase58(), receiver.publicKey.toBase58())
      assert.equal(rec.location, 'Cai Lay packhouse')
      assert.ok('packer' in rec.role)
    })

    it('the old owner can no longer move the batch', async function () {
      await assert.rejects(
        () =>
          program.methods
            .transferCustody(BATCH_C, intruder.publicKey)
            .accounts({
              config: pda.config(),
              batch:  pda.batch(BATCH_C),
              signer: authority.publicKey,
            })
            .rpc(),
        expectAnchorError('Unauthorized')
      )
    })
  })

  // ── Ed25519 attestation header constraints (layout unit checks) ────────
  // Full bankrun sysvar injection for verify_ed25519_ix needs a working
  // toolchain + redeploy; pure JS mirrors the on-chain header gates
  // (count==1, all *_ix_index == 0xFFFF). Assumption on-chain: Ed25519
  // precompile is at tx index 0; program ix runs later (current_index > 0).

  describe('ed25519 instruction layout (verify_ed25519_ix contract)', function () {
    it('accepts count==1 and all ix_index fields == 0xFFFF', function () {
      const data = buildEd25519IxData()
      assert.equal(data[0], 1)
      assert.equal(data.readUInt16LE(4), ED25519_IX_INDEX_SELF)
      assert.equal(data.readUInt16LE(8), ED25519_IX_INDEX_SELF)
      assert.equal(data.readUInt16LE(14), ED25519_IX_INDEX_SELF)
      assert.equal(rejectEd25519Header(data), null)
    })

    it('rejects count != 1 (including multi-entry)', function () {
      assert.equal(rejectEd25519Header(buildEd25519IxData({ count: 0 })), 'count_not_one')
      assert.equal(rejectEd25519Header(buildEd25519IxData({ count: 2 })), 'count_not_one')
    })

    it('rejects non-0xFFFF ix_index (cross-instruction confusion)', function () {
      // Program must reject this: native Ed25519 would verify another ix's bytes
      // while our parser reads local offsets — closed by requiring u16::MAX.
      assert.equal(
        rejectEd25519Header(buildEd25519IxData({ sigIxIndex: 0 })),
        'ix_index_not_self'
      )
      assert.equal(
        rejectEd25519Header(buildEd25519IxData({ pubkeyIxIndex: 1 })),
        'ix_index_not_self'
      )
      assert.equal(
        rejectEd25519Header(buildEd25519IxData({ msgIxIndex: 2 })),
        'ix_index_not_self'
      )
      assert.equal(
        rejectEd25519Header(
          buildEd25519IxData({
            sigIxIndex: 0,
            pubkeyIxIndex: 0,
            msgIxIndex: 0,
          })
        ),
        'ix_index_not_self'
      )
    })

    it('rejects undersized instruction data', function () {
      assert.equal(rejectEd25519Header(Buffer.alloc(15)), 'too_short')
    })
  })

  // ── Phase-2 stubs — add features to lib.rs to activate ─────────────────

  describe.skip('Phase-2: authority transfer [add pending_authority to Config]', function () {
    it('initiate_transfer emits PendingTransfer event')
    it('accept_transfer from new authority completes the transfer')
    it('old authority cannot call protected instructions after transfer')
    it('pending transfer can be cancelled by current authority')
  })

  describe.skip('Phase-2: pause gating [add paused: bool to Config]', function () {
    it('authority can pause the program')
    it('register_batch is rejected while paused')
    it('addTimelineEvent is rejected while paused')
    it('updateLabReport is rejected while paused')
    it('authority can unpause and normal operation resumes')
  })

  describe.skip('Phase-2: enum rejection [replace u8 with enum for risk_level/status]', function () {
    it('registerBatch rejects risk_level outside valid enum range')
    it('addTimelineEvent rejects status outside valid enum range')
  })
})
