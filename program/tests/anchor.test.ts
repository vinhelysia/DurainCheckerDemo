// Durian Trust — Solana Playground integration suite.
//
// Paste this whole file into the Playground "Tests" tab (beta.solpg.io) and
// run it there against devnet. It only uses globals Playground already
// provides — pg.program / pg.wallet / pg.connection, plus `web3`, `anchor`,
// `assert`, `Buffer`, and the browser's native Web Crypto API
// (`crypto.subtle`) for SHA-256 — so it cannot run outside Playground and
// has no npm imports of its own.
//
// Uses a unique batch id per run (`T<timestamp>`) so re-running the suite
// never collides with batches left over from a previous run.

describe("durian_trust", () => {
  const programId = pg.program.programId;
  const wallet = pg.wallet;
  const connection = pg.connection;

  const runId = `T${Date.now()}`;
  const BATCH_ID = runId;

  function u32le(n) {
    const b = Buffer.alloc(4);
    b.writeUInt32LE(n);
    return b;
  }

  function u64le(n) {
    const b = Buffer.alloc(8);
    b.writeBigUInt64LE(BigInt(n));
    return b;
  }

  function pda(seeds) {
    return web3.PublicKey.findProgramAddressSync(seeds, programId)[0];
  }

  const configPda = pda([Buffer.from("config")]);
  const batchPda = (id) => pda([Buffer.from("batch"), Buffer.from(id)]);
  const labPda = (id, idx) => pda([Buffer.from("lab"), Buffer.from(id), u32le(idx)]);
  const timelinePda = (id, idx) => pda([Buffer.from("timeline"), Buffer.from(id), u32le(idx)]);
  const attestationPda = (id, idx) => pda([Buffer.from("attestation"), Buffer.from(id), u32le(idx)]);

  function errorText(err) {
    return err?.error?.errorCode?.code || err?.message || String(err);
  }

  async function expectRejects(promise, needle) {
    let threw = false;
    try {
      await promise;
    } catch (err) {
      threw = true;
      assert.ok(
        errorText(err).includes(needle),
        `expected error containing "${needle}", got: ${errorText(err)}`
      );
    }
    assert.ok(threw, `expected call to fail with "${needle}"`);
  }

  it("initialize (tolerates an already-initialized config)", async () => {
    try {
      await pg.program.methods
        .initialize()
        .accounts({
          config: configPda,
          authority: wallet.publicKey,
          systemProgram: web3.SystemProgram.programId,
        })
        .rpc();
    } catch (err) {
      assert.ok(
        errorText(err).includes("already in use"),
        `initialize failed for an unexpected reason: ${errorText(err)}`
      );
    }

    const cfg = await pg.program.account.config.fetch(configPda);
    assert.ok(cfg.authority);
  });

  it("register_batch happy path round-trips Batch + LabReport(0)", async () => {
    await pg.program.methods
      .registerBatch(
        BATCH_ID,
        "Musang King Farm",
        "Pahang",
        "2025-07-04",
        new anchor.BN(42),
        new anchor.BN(50),
        new anchor.BN(88),
        { low: {} },
        "ok",
        "none"
      )
      .accounts({
        config: configPda,
        batch: batchPda(BATCH_ID),
        labReport: labPda(BATCH_ID, 0),
        farmerRole: null,
        signer: wallet.publicKey,
        systemProgram: web3.SystemProgram.programId,
      })
      .rpc();

    const batch = await pg.program.account.batch.fetch(batchPda(BATCH_ID));
    const lab = await pg.program.account.labReport.fetch(labPda(BATCH_ID, 0));

    assert.equal(batch.id, BATCH_ID);
    assert.equal(batch.farm, "Musang King Farm");
    assert.equal(batch.province, "Pahang");
    assert.equal(batch.harvestDate, "2025-07-04");
    assert.equal(batch.labCount, 1);
    assert.equal(batch.timelineCount, 0);
    assert.equal(lab.cadmiumPpm.toNumber(), 42);
    assert.equal(lab.thresholdPpm.toNumber(), 50);
    assert.equal(lab.confidence.toNumber(), 88);
    assert.deepEqual(lab.riskLevel, { low: {} });
    assert.equal(lab.aiResult, "ok");
    assert.equal(lab.riskCause, "none");
  });

  it("duplicate batch id fails (account already in use)", async () => {
    await expectRejects(
      pg.program.methods
        .registerBatch(
          BATCH_ID, "Farm", "Pahang", "2025-07-04",
          new anchor.BN(0), new anchor.BN(0), new anchor.BN(0),
          { low: {} }, "x", "x"
        )
        .accounts({
          config: configPda,
          batch: batchPda(BATCH_ID),
          labReport: labPda(BATCH_ID, 0),
          farmerRole: null,
          signer: wallet.publicKey,
          systemProgram: web3.SystemProgram.programId,
        })
        .rpc(),
      "already in use"
    );
  });

  it('harvest_date "07-04-2025" is rejected (InvalidDateFormat)', async () => {
    const id = `${runId}-D`;
    await expectRejects(
      pg.program.methods
        .registerBatch(
          id, "Farm", "Pahang", "07-04-2025",
          new anchor.BN(0), new anchor.BN(0), new anchor.BN(0),
          { low: {} }, "x", "x"
        )
        .accounts({
          config: configPda,
          batch: batchPda(id),
          labReport: labPda(id, 0),
          farmerRole: null,
          signer: wallet.publicKey,
          systemProgram: web3.SystemProgram.programId,
        })
        .rpc(),
      "InvalidDateFormat"
    );
  });

  it("33-char id is rejected (StringTooLong)", async () => {
    const longId = "X".repeat(33);
    await expectRejects(
      pg.program.methods
        .registerBatch(
          longId, "Farm", "Pahang", "2025-07-04",
          new anchor.BN(0), new anchor.BN(0), new anchor.BN(0),
          { low: {} }, "x", "x"
        )
        .accounts({
          config: configPda,
          batch: batchPda(longId),
          labReport: labPda(longId, 0),
          farmerRole: null,
          signer: wallet.publicKey,
          systemProgram: web3.SystemProgram.programId,
        })
        .rpc(),
      "StringTooLong"
    );
  });

  it("add_timeline_event writes index 0", async () => {
    await pg.program.methods
      .addTimelineEvent(BATCH_ID, "Harvest", "Bentong, Pahang", "2025-07-05", { pending: {} })
      .accounts({
        config: configPda,
        batch: batchPda(BATCH_ID),
        timelineEvent: timelinePda(BATCH_ID, 0),
        logisticsRole: null,
        signer: wallet.publicKey,
        systemProgram: web3.SystemProgram.programId,
      })
      .rpc();

    const ev = await pg.program.account.timelineEvent.fetch(timelinePda(BATCH_ID, 0));
    const batch = await pg.program.account.batch.fetch(batchPda(BATCH_ID));
    assert.equal(ev.stage, "Harvest");
    assert.equal(batch.timelineCount, 1);
  });

  it("pause blocks register_batch, unpause restores it", async () => {
    await pg.program.methods
      .pause()
      .accounts({ config: configPda, authority: wallet.publicKey })
      .rpc();

    const pausedId = `${runId}-P`;
    await expectRejects(
      pg.program.methods
        .registerBatch(
          pausedId, "Farm", "Pahang", "2025-07-04",
          new anchor.BN(0), new anchor.BN(0), new anchor.BN(0),
          { low: {} }, "x", "x"
        )
        .accounts({
          config: configPda,
          batch: batchPda(pausedId),
          labReport: labPda(pausedId, 0),
          farmerRole: null,
          signer: wallet.publicKey,
          systemProgram: web3.SystemProgram.programId,
        })
        .rpc(),
      "Paused"
    );

    await pg.program.methods
      .unpause()
      .accounts({ config: configPda, authority: wallet.publicKey })
      .rpc();

    const cfg = await pg.program.account.config.fetch(configPda);
    assert.equal(cfg.paused, false);
  });

  it("attest_lab_report + verify_attestation end-to-end", async () => {
    const report = await pg.program.account.labReport.fetch(labPda(BATCH_ID, 0));
    const riskLevelByte = 1; // RiskLevel::Low, matches the { low: {} } used to register BATCH_ID

    const payload = Buffer.concat([
      Buffer.from(BATCH_ID, "utf8"),
      u64le(report.cadmiumPpm.toNumber()),
      u64le(report.thresholdPpm.toNumber()),
      u64le(report.confidence.toNumber()),
      Buffer.from([riskLevelByte]),
      Buffer.from(report.aiResult, "utf8"),
      Buffer.from(report.riskCause, "utf8"),
      wallet.publicKey.toBuffer(),
    ]);

    const digest = await crypto.subtle.digest("SHA-256", payload);
    const payloadHash = new Uint8Array(digest);

    const ed25519Ix = web3.Ed25519Program.createInstructionWithPrivateKey({
      privateKey: wallet.keypair.secretKey,
      message: payloadHash,
    });
    // Pull the raw signature back out using the offset the ix itself declares,
    // so this doesn't depend on assuming a fixed internal byte layout.
    const sigOffset = ed25519Ix.data.readUInt16LE(2);
    const sig = ed25519Ix.data.subarray(sigOffset, sigOffset + 64);

    const attestIx = await pg.program.methods
      .attestLabReport(BATCH_ID, 0, Array.from(sig), Array.from(payloadHash))
      .accounts({
        config: configPda,
        batch: batchPda(BATCH_ID),
        labReport: labPda(BATCH_ID, 0),
        attestation: attestationPda(BATCH_ID, 0),
        labRole: null,
        signer: wallet.publicKey,
        ixSysvar: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
        systemProgram: web3.SystemProgram.programId,
      })
      .instruction();

    const tx = new web3.Transaction().add(ed25519Ix).add(attestIx);
    await web3.sendAndConfirmTransaction(connection, tx, [wallet.keypair]);

    await pg.program.methods
      .verifyAttestation(BATCH_ID, 0)
      .accounts({
        labReport: labPda(BATCH_ID, 0),
        attestation: attestationPda(BATCH_ID, 0),
      })
      .rpc();

    const attestation = await pg.program.account.labAttestation.fetch(attestationPda(BATCH_ID, 0));
    assert.ok(attestation.labPubkey.equals(wallet.publicKey));
  });
});
