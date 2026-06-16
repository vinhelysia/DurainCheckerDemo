import hre from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const DurianTrust = await hre.ethers.getContractFactory("DurianTrust");
  const durianTrust = await DurianTrust.deploy();

  await durianTrust.waitForDeployment();
  const address = await durianTrust.getAddress();
  
  console.log(`DurianTrust deployed to: ${address}`);
  
  // Seed batches
  const batches = [
    {
      id: 'DRN-2026-LD-0428',
      farm: { vi: 'Nông trại Tân Phú', en: 'Tan Phu Farm' },
      province: { vi: 'Lâm Đồng', en: 'Lam Dong' },
      harvestDate: '2026-04-28',
      cadmiumPpm: 300,
      thresholdPpm: 500,
      aiResult: { vi: 'Đạt chuẩn xuất khẩu', en: 'Export-ready' },
      confidence: 9400,
      riskLevel: 0, // Low
      riskCause: { vi: 'Cadimi và Vàng O trong ngưỡng cho phép', en: 'Cadmium and Yellow O within limits' },
      timeline: [
        { stage: { vi: 'Thu hoạch', en: 'Harvest' }, location: { vi: 'Nông trại Tân Phú, Lâm Đồng', en: 'Tan Phu Farm, Lam Dong' }, date: '2026-04-28', status: 1 },
        { stage: { vi: 'Kiểm nghiệm', en: 'Lab test' }, location: { vi: 'Trung tâm kiểm định Đà Lạt', en: 'Da Lat Testing Center' }, date: '2026-04-30', status: 1 },
        { stage: { vi: 'Đóng gói', en: 'Packing' }, location: { vi: 'Nhà đóng gói Bảo Lộc', en: 'Bao Loc Packing House' }, date: '2026-05-02', status: 1 },
        { stage: { vi: 'Xuất khẩu', en: 'Export' }, location: { vi: 'Cảng Cát Lái - Trung Quốc', en: 'Cat Lai Port - China' }, date: '2026-05-05', status: 0 }
      ]
    },
    {
      id: 'DRN-2026-TG-0115',
      farm: { vi: 'Hợp tác xã Mỹ Long', en: 'My Long Cooperative' },
      province: { vi: 'Tiền Giang', en: 'Tien Giang' },
      harvestDate: '2026-03-15',
      cadmiumPpm: 470,
      thresholdPpm: 500,
      aiResult: { vi: 'Cần kiểm tra lại', en: 'Needs re-check' },
      confidence: 7100,
      riskLevel: 1, // Medium
      riskCause: { vi: 'Cadimi gần ngưỡng cho phép, đề nghị kiểm nghiệm bổ sung', en: 'Cadmium close to limit, additional testing recommended' },
      timeline: [
        { stage: { vi: 'Thu hoạch', en: 'Harvest' }, location: { vi: 'HTX Mỹ Long, Tiền Giang', en: 'My Long Cooperative, Tien Giang' }, date: '2026-03-15', status: 1 },
        { stage: { vi: 'Kiểm nghiệm', en: 'Lab test' }, location: { vi: 'Trung tâm kiểm định Tiền Giang', en: 'Tien Giang Testing Center' }, date: '2026-03-17', status: 1 },
        { stage: { vi: 'Đóng gói', en: 'Packing' }, location: { vi: 'Nhà đóng gói Cai Lậy', en: 'Cai Lay Packing House' }, date: '2026-03-19', status: 0 },
        { stage: { vi: 'Xuất khẩu', en: 'Export' }, location: { vi: 'Cảng Cát Lái - Trung Quốc', en: 'Cat Lai Port - China' }, date: '-', status: 0 }
      ]
    },
    {
      id: 'DRN-2026-DL-0892',
      farm: { vi: 'Nông trại Eatu', en: 'Eatu Farm' },
      province: { vi: 'Đắk Lắk', en: 'Dak Lak' },
      harvestDate: '2026-02-02',
      cadmiumPpm: 620,
      thresholdPpm: 500,
      aiResult: { vi: 'Không đạt - giữ lô', en: 'Hold - does not pass' },
      confidence: 8800,
      riskLevel: 2, // High
      riskCause: { vi: 'Cadimi vượt ngưỡng cho phép, lô hàng bị giữ để xử lý', en: 'Cadmium exceeds limit; batch held pending action' },
      timeline: [
        { stage: { vi: 'Thu hoạch', en: 'Harvest' }, location: { vi: 'Nông trại Eatu, Đắk Lắk', en: 'Eatu Farm, Dak Lak' }, date: '2026-02-02', status: 1 },
        { stage: { vi: 'Kiểm nghiệm', en: 'Lab test' }, location: { vi: 'Trung tâm kiểm định Buôn Ma Thuột', en: 'Buon Ma Thuot Testing Center' }, date: '2026-02-05', status: 1 },
        { stage: { vi: 'Đóng gói', en: 'Packing' }, location: { vi: '-', en: '-' }, date: '-', status: 0 },
        { stage: { vi: 'Xuất khẩu', en: 'Export' }, location: { vi: '-', en: '-' }, date: '-', status: 0 }
      ]
    }
  ];

  const isSepolia = hre.network.name === "sepolia";
  const batchesToSeed = isSepolia ? [batches[0]] : batches;

  console.log(`Seeding ${batchesToSeed.length} batches (isSepolia = ${isSepolia})...`);

  for (const batch of batchesToSeed) {
    const tx = await durianTrust.registerBatch(
      batch.id,
      batch.farm.vi,
      batch.farm.en,
      batch.province.vi,
      batch.province.en,
      batch.harvestDate,
      batch.cadmiumPpm,
      batch.thresholdPpm,
      batch.aiResult.vi,
      batch.aiResult.en,
      batch.confidence,
      batch.riskLevel,
      batch.riskCause.vi,
      batch.riskCause.en
    );
    await tx.wait();
    console.log(`Registered batch: ${batch.id}`);

    for (const evt of batch.timeline) {
      const txEvt = await durianTrust.addTimelineEvent(
        batch.id,
        evt.stage.vi,
        evt.stage.en,
        evt.location.vi,
        evt.location.en,
        evt.date,
        evt.status
      );
      await txEvt.wait();
    }
    console.log(`Added timeline stages for batch: ${batch.id}`);
  }

  // Save address and ABI in a lean JSON format
  const contractsDir = path.join(__dirname, "..", "public", "contracts");
  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir, { recursive: true });
  }

  // Get the artifact JSON to extract ABI
  const artifact = await hre.artifacts.readArtifact("DurianTrust");

  const deploymentTx = durianTrust.deploymentTransaction();
  let deployBlock = 0;
  if (deploymentTx) {
    const receipt = await deploymentTx.wait();
    deployBlock = receipt.blockNumber;
  } else {
    deployBlock = await hre.ethers.provider.getBlockNumber();
  }

  fs.writeFileSync(
    path.join(contractsDir, "DurianTrust.json"),
    JSON.stringify({ address: address, abi: artifact.abi, deployBlock: deployBlock }, null, 2)
  );

  console.log(`Successfully wrote lean contract config with deployBlock ${deployBlock} to public/contracts/DurianTrust.json`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
