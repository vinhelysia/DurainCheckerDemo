/* global describe, it, beforeEach */
import { expect } from "chai";
import hre from "hardhat";

describe("DurianTrust Contract Tests", function () {
  let durianTrust;
  let owner;
  let addr1;

  beforeEach(async function () {
    [owner, addr1] = await hre.ethers.getSigners();
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

  describe("Access Control", function () {
    it("Should only allow owner to register batches", async function () {
      await expect(
        durianTrust.connect(addr1).registerBatch(
          "BATCH-FAIL",
          "Farm", "Farm En",
          "Province", "Province En",
          "2026-06-01",
          300, 500,
          "Pass", "Pass En",
          9400,
          0,
          "None", "None En"
        )
      ).to.be.revertedWith("Only owner can call this");
    });

    it("Should only allow owner to add timeline events", async function () {
      // Register batch as owner first
      await durianTrust.registerBatch(
        "BATCH-1",
        "Farm", "Farm En",
        "Province", "Province En",
        "2026-06-01",
        300, 500,
        "Pass", "Pass En",
        9400,
        0,
        "None", "None En"
      );

      // Attempt to add event as addr1
      await expect(
        durianTrust.connect(addr1).addTimelineEvent(
          "BATCH-1",
          "Harvest", "Harvest En",
          "Location", "Location En",
          "2026-06-01",
          1
        )
      ).to.be.revertedWith("Only owner can call this");
    });
  });
});
