/* global describe, it, beforeEach */
import { expect } from "chai";
import hre from "hardhat";

describe("DurianTrust Contract Tests", function () {
  let durianTrust;
  let owner;
  let farmer;
  let lab;
  let logistics;
  let stranger;

  beforeEach(async function () {
    [owner, farmer, lab, logistics, stranger] = await hre.ethers.getSigners();
    const DurianTrust = await hre.ethers.getContractFactory("DurianTrust");
    durianTrust = await DurianTrust.deploy();
    await durianTrust.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct owner", async function () {
      expect(await durianTrust.owner()).to.equal(owner.address);
    });
  });

  describe("Batch Registration and Mappings", function () {
    it("Should assign token IDs automatically starting at 8801", async function () {
      // Register first batch
      await durianTrust.registerBatch(
        "BATCH-1",
        "Farm 1", "Farm 1 En",
        "Province 1", "Province 1 En",
        "2026-06-01",
        300, 500,
        "Pass", "Pass En",
        9400,
        0, // Low risk
        "None", "None En"
      );

      // Register second batch
      await durianTrust.registerBatch(
        "BATCH-2",
        "Farm 2", "Farm 2 En",
        "Province 2", "Province 2 En",
        "2026-06-02",
        450, 500,
        "Pass 2", "Pass 2 En",
        7000,
        1, // Medium risk
        "None 2", "None 2 En"
      );

      expect(await durianTrust.getTokenIdByBatchId("BATCH-1")).to.equal(8801);
      expect(await durianTrust.getTokenIdByBatchId("BATCH-2")).to.equal(8802);
      expect(await durianTrust.getBatchIdByTokenId(8801)).to.equal("BATCH-1");
      expect(await durianTrust.getBatchIdByTokenId(8802)).to.equal("BATCH-2");
      expect(await durianTrust.getRegistrant(8801)).to.equal(owner.address);
    });

    it("Should fail to query unregistered token IDs", async function () {
      await expect(
        durianTrust.getBatchIdByTokenId(9999)
      ).to.be.revertedWith("Token ID not registered");

      await expect(
        durianTrust.getRegistrant(9999)
      ).to.be.revertedWith("Token ID not registered");
    });

    it("Should fail to query unregistered batch IDs", async function () {
      await expect(
        durianTrust.getTokenIdByBatchId("NOT-EXIST")
      ).to.be.revertedWith("Batch not registered");
    });
  });

  describe("Role Management and Access Control", function () {
    beforeEach(async function () {
      // Setup roles
      await durianTrust.addFarmer(farmer.address);
      await durianTrust.addLab(lab.address);
      await durianTrust.addLogistics(logistics.address);
    });

    it("Should verify role assignments", async function () {
      expect(await durianTrust.isFarmer(farmer.address)).to.be.true;
      expect(await durianTrust.isLab(lab.address)).to.be.true;
      expect(await durianTrust.isLogistics(logistics.address)).to.be.true;
      expect(await durianTrust.isFarmer(stranger.address)).to.be.false;
    });

    it("Should allow farmer to register a batch", async function () {
      await expect(
        durianTrust.connect(farmer).registerBatch(
          "FARM-BATCH",
          "Farm", "Farm En",
          "Province", "Province En",
          "2026-06-01",
          300, 500,
          "Pass", "Pass En",
          9400,
          0,
          "None", "None En"
        )
      ).to.emit(durianTrust, "BatchRegistered");
    });

    it("Should reject batch registration from unauthorized account", async function () {
      await expect(
        durianTrust.connect(stranger).registerBatch(
          "FARM-BATCH-FAIL",
          "Farm", "Farm En",
          "Province", "Province En",
          "2026-06-01",
          300, 500,
          "Pass", "Pass En",
          9400,
          0,
          "None", "None En"
        )
      ).to.be.revertedWith("Only farmer or owner can call this");
    });

    it("Should allow logistics actor to add timeline events", async function () {
      // Owner registers batch
      await durianTrust.registerBatch(
        "BATCH-LT",
        "Farm", "Farm En",
        "Province", "Province En",
        "2026-06-01",
        300, 500,
        "Pass", "Pass En",
        9400,
        0,
        "None", "None En"
      );

      // Logistics actor submits timeline event
      await expect(
        durianTrust.connect(logistics).addTimelineEvent(
          "BATCH-LT",
          "Kiểm định", "Lab test",
          "Phòng Lab", "Lab Room",
          "2026-06-02",
          1
        )
      ).to.emit(durianTrust, "TimelineEventAdded");
    });

    it("Should reject timeline event from unauthorized account", async function () {
      // Owner registers batch
      await durianTrust.registerBatch(
        "BATCH-LT2",
        "Farm", "Farm En",
        "Province", "Province En",
        "2026-06-01",
        300, 500,
        "Pass", "Pass En",
        9400,
        0,
        "None", "None En"
      );

      // Stranger tries to submit timeline event
      await expect(
        durianTrust.connect(stranger).addTimelineEvent(
          "BATCH-LT2",
          "Kiểm định", "Lab test",
          "Phòng Lab", "Lab Room",
          "2026-06-02",
          1
        )
      ).to.be.revertedWith("Only logistics actor or owner can call this");
    });

    it("Should allow lab to update lab reports", async function () {
      // Owner registers batch
      await durianTrust.registerBatch(
        "BATCH-LAB",
        "Farm", "Farm En",
        "Province", "Province En",
        "2026-06-01",
        300, 500,
        "Pass", "Pass En",
        9400,
        0,
        "None", "None En"
      );

      // Lab updates lab report
      await expect(
        durianTrust.connect(lab).updateLabReport(
          "BATCH-LAB",
          200, 500,
          "Đạt chuẩn", "Export-ready",
          9800,
          0,
          "An toàn", "Safe"
        )
      ).to.emit(durianTrust, "LabReportUpdated");

      const b = await durianTrust.getBatch("BATCH-LAB");
      expect(b.cadmiumPpm).to.equal(200);
    });

    it("Should reject lab report update from unauthorized account", async function () {
      // Owner registers batch
      await durianTrust.registerBatch(
        "BATCH-LAB2",
        "Farm", "Farm En",
        "Province", "Province En",
        "2026-06-01",
        300, 500,
        "Pass", "Pass En",
        9400,
        0,
        "None", "None En"
      );

      // Stranger tries to update lab report
      await expect(
        durianTrust.connect(stranger).updateLabReport(
          "BATCH-LAB2",
          200, 500,
          "Đạt chuẩn", "Export-ready",
          9800,
          0,
          "An toàn", "Safe"
        )
      ).to.be.revertedWith("Only lab or owner can call this");
    });

    it("Should reject batch registration with duplicate batch IDs", async function () {
      await durianTrust.registerBatch(
        "DUP-BATCH",
        "Farm", "Farm En",
        "Province", "Province En",
        "2026-06-01",
        300, 500,
        "Pass", "Pass En",
        9400,
        0,
        "None", "None En"
      );

      await expect(
        durianTrust.registerBatch(
          "DUP-BATCH",
          "Farm 2", "Farm 2 En",
          "Province 2", "Province 2 En",
          "2026-06-02",
          400, 500,
          "Pass 2", "Pass 2 En",
          9500,
          0,
          "None 2", "None 2 En"
        )
      ).to.be.revertedWith("Batch already exists");
    });

    it("Should append lab reports to history, preserve prior records, and return the latest via getBatch", async function () {
      await durianTrust.registerBatch(
        "HIST-BATCH",
        "Farm", "Farm En",
        "Province", "Province En",
        "2026-06-01",
        300, 500,
        "Pass", "Pass En",
        9400,
        0,
        "None", "None En"
      );

      // Setup lab role
      await durianTrust.addLab(lab.address);

      // Perform update 1
      await durianTrust.connect(lab).updateLabReport(
        "HIST-BATCH",
        200, 500,
        "Đạt chuẩn 1", "Export-ready 1",
        9800,
        0,
        "An toàn 1", "Safe 1"
      );

      // Perform update 2
      await durianTrust.connect(lab).updateLabReport(
        "HIST-BATCH",
        400, 500,
        "Đạt chuẩn 2", "Export-ready 2",
        9900,
        1, // Medium risk
        "An toàn 2", "Safe 2"
      );

      // Fetch history
      const history = await durianTrust.getLabReportHistory("HIST-BATCH");
      expect(history.length).to.equal(3); // Initial + Update 1 + Update 2

      // Verify prior records are preserved
      expect(history[0].cadmiumPpm).to.equal(300);
      expect(history[0].confidence).to.equal(9400);

      expect(history[1].cadmiumPpm).to.equal(200);
      expect(history[1].confidence).to.equal(9800);

      expect(history[2].cadmiumPpm).to.equal(400);
      expect(history[2].confidence).to.equal(9900);

      // Assert getBatch returns the LATEST report's values (proves the backward-compat getter reads latest, not the old record)
      const b = await durianTrust.getBatch("HIST-BATCH");
      expect(b.cadmiumPpm).to.equal(400);
      expect(b.confidence).to.equal(9900);
      expect(b.riskLevel).to.equal(1);
      expect(b.aiResultVi).to.equal("Đạt chuẩn 2");
    });
  });
});
