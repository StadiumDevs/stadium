/**
 * Fix bountyPrize amounts in MongoDB using actual values from payouts.csv.
 * The migration script hardcoded all amounts to 2500 — this patches them
 * to match the real "Total Prize (USDC)" from the CSV.
 *
 * Usage: node server/scripts/fix-bounty-amounts.js [--dry-run]
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import Project from "../models/Project.js";
import fs from "fs";
import path from "path";
import csv from "csv-parser";

const envPath = path.resolve(process.cwd(), "server", ".env");
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

const DRY_RUN = process.argv.includes("--dry-run");

const readCsvData = (filePath) => {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(filePath)) {
      console.error(`❌ CSV not found: ${filePath}`);
      return resolve({});
    }
    const payouts = {};
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (row) => {
        const hackathonId = row["hackathon-id"];
        const projectName = row["Project"];
        if (hackathonId && projectName) {
          const key = `${hackathonId.trim()}-${projectName.trim().toLowerCase()}`;
          payouts[key] = row;
        }
      })
      .on("end", () => resolve(payouts))
      .on("error", reject);
  });
};

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ Connected to MongoDB");

  const scriptsDir = path.dirname(new URL(import.meta.url).pathname);
  const serverDir = path.dirname(scriptsDir);
  const csvPath = path.join(serverDir, "migration-data", "payouts.csv");
  const payouts = await readCsvData(csvPath);

  if (Object.keys(payouts).length === 0) {
    console.error("❌ No payout data found. Aborting.");
    process.exit(1);
  }

  // Same name mappings as migration.js
  const projectNameMapping = {
    "anytype - nft gating": "anytype nft",
    "blockchain solutions hermann müller co kg": "blockchain solutions hermann k.",
    "cranenalysis": "blockchain solutions hermann k.",
  };

  const projects = await Project.find({
    bountyPrize: { $exists: true, $not: { $size: 0 } },
  });

  console.log(`Found ${projects.length} projects with bountyPrize entries\n`);

  let updated = 0;
  let skipped = 0;
  let notFound = 0;

  for (const project of projects) {
    const hackathonId = project.hackathon?.eventStartedAt || project.hackathon?.id;
    if (!hackathonId) {
      console.log(`⚠️  ${project.projectName} — no hackathon ID, skipping`);
      skipped++;
      continue;
    }

    // Try matching by hackathon ID embedded in the bountyPrize entry
    let changed = false;
    for (const bp of project.bountyPrize) {
      const originalName = project.projectName.trim().toLowerCase();
      const mappedName = projectNameMapping[originalName] || originalName;
      const lookupKey = `${bp.hackathonWonAtId}-${mappedName}`;
      const payoutInfo = payouts[lookupKey];

      if (!payoutInfo) {
        console.log(`⚠️  ${project.projectName} [${bp.hackathonWonAtId}] — no CSV match`);
        notFound++;
        continue;
      }

      const correctAmount = parseFloat(payoutInfo["Total Prize (USDC)"]);
      if (isNaN(correctAmount) || correctAmount <= 0) {
        console.log(`⚠️  ${project.projectName} — invalid CSV amount: ${payoutInfo["Total Prize (USDC)"]}`);
        skipped++;
        continue;
      }

      if (bp.amount !== correctAmount) {
        console.log(`✏️  ${project.projectName}: $${bp.amount} → $${correctAmount}`);
        bp.amount = correctAmount;
        changed = true;
      }
    }

    if (changed) {
      if (!DRY_RUN) {
        await project.save();
      }
      updated++;
    }
  }

  console.log(`\n--- Summary ${DRY_RUN ? "(DRY RUN)" : ""} ---`);
  console.log(`Updated: ${updated}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`No CSV match: ${notFound}`);

  await mongoose.disconnect();
};

run().catch((err) => {
  console.error("❌ Script failed:", err);
  process.exit(1);
});
