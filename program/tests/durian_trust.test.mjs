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
 *
 * Phase-2 tests (authority transfer, pause gating, enum rejection)
 * are marked describe.skip — they require those features in lib.rs first.
 */

import { startAnchor } from 'anchor-bankrun'
import { BankrunProvider } from 'anchor-bankrun'
import { Program, AnchorError, BN } from '@coral-xyz/anchor'
import { Keypair, PublicKey, SystemProgram } from '@solana/web3.js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import assert from 'assert/strict'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const IDL = JSON.parse(
  readFileSync(resolve(__dirname, '../target/idl/durian_trust.json'), 'utf8')
)

// ─── Test keypairs (funded via startAnchor initial accounts) ─────────────────

const farmer        = Keypair.generate()
const labUser       = Keypair.generate()
const logisticsUser = Keypair.generate()
const intruder      = Keypair.generate()
const tempTarget    = Keypair.generate() // used only for remove-role tests

const SOL10 = 10_000_000_000

// ─── Module-level state set in top-level before() ────────────────────────────

let context, provider, program, authority, pid

// ─── PDA helpers ─────────────────────────────────────────────────────────────

const pda = {
  config:     (p = pid) => pf([Buffer.from('config')], p),
  batch:      (id, p = pid) => pf([Buffer.from('batch'), Buffer.from(id)], p),
  lab:        (id, idx, p = pid) => pf([Buffer.from('lab'),      Buffer.from(id), u32le(idx)], p),
  timeline:   (id, idx, p = pid) => pf([Buffer.from('timeline'), Buffer.from(id), u32le(idx)], p),
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
    context = await startAnchor('.', [], [
      fundedAccount(farmer.publicKey),
      fundedAccount(labUser.publicKey),
      fundedAccount(logisticsUser.publicKey),
      fundedAccount(intruder.publicKey),
      fundedAccount(tempTarget.publicKey),
    ])
    provider  = new BankrunProvider(context)
    program   = new Program(IDL, provider)
    authority = provider.wallet.payer
    pid       = program.programId
  })

  // ── initialize ─────────────────────────────────────────────────────────

  describe('initialize', function () {
    it('creates config with authority and zero token counter', async function () {
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
