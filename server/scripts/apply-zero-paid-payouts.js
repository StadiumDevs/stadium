/**
 * One-off: Apply manual payout data for winners who had $0 total paid.
 * Run from server: node scripts/apply-zero-paid-payouts.js
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import Project from "../models/Project.js";

const envPath = path.resolve(process.cwd(), "server", ".env");
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

const PAYMENTS = [
  {
    projectName: "Chiri App",
    totalPaid: [
      { milestone: "BOUNTY", amount: 500, currency: "USDC", transactionProof: "https://assethub-polkadot.subscan.io/extrinsic/10652483-5", bountyName: "Kusama bounty", paidDate: new Date("2025-12-03") },
    ],
  },
  {
    projectName: "Unblind for Polkadot",
    totalPaid: [
      { milestone: "BOUNTY", amount: 1500, currency: "USDC", transactionProof: "https://assethub-polkadot.subscan.io/extrinsic/10652483-5", bountyName: "Kusama bounty", paidDate: new Date("2025-12-03") },
    ],
  },
  {
    projectName: "Infinite conspiracy",
    totalPaid: [
      { milestone: "BOUNTY", amount: 3000, currency: "USDC", transactionProof: "https://assethub-polkadot.subscan.io/extrinsic/10652483-5", bountyName: "Kusama bounty", paidDate: new Date("2025-12-03") },
    ],
  },
  {
    projectName: "Kleo Protocol",
    totalPaid: [
      { milestone: "M1", amount: 2000, currency: "USDC", transactionProof: "https://assethub-polkadot.subscan.io/extrinsic/10496453-2", paidDate: new Date("2025-11-22") },
      { milestone: "M2", amount: 2000, currency: "USDC", transactionProof: "https://assethub-polkadot.subscan.io/extrinsic/11561829-4", paidDate: new Date("2026-01-31") },
    ],
    m2Status: "completed",
    completionDate: new Date("2026-01-31"),
  },
  {
    projectName: "OpenArkiv",
    totalPaid: [
      { milestone: "M1", amount: 2000, currency: "USDC", transactionProof: "https://assethub-polkadot.subscan.io/extrinsic/10496453-2", paidDate: new Date("2025-11-22") },
      { milestone: "M2", amount: 2000, currency: "USDC", transactionProof: "https://assethub-polkadot.subscan.io/extrinsic/11702297-2", paidDate: new Date("2026-02-04") },
    ],
    m2Status: "completed",
    completionDate: new Date("2026-02-04"),
  },
  {
    projectName: "Plata Mia",
    totalPaid: [
      { milestone: "M1", amount: 2000, currency: "USDC", transactionProof: "https://assethub-polkadot.subscan.io/extrinsic/10496453-2", paidDate: new Date("2025-11-22") },
    ],
  },
  {
    projectName: "ObraClara",
    totalPaid: [
      { milestone: "M1", amount: 2000, currency: "USDC", transactionProof: "https://assethub-polkadot.subscan.io/extrinsic/10496453-2", paidDate: new Date("2025-11-22") },
      { milestone: "M2", amount: 2000, currency: "USDC", transactionProof: "https://assethub-polkadot.subscan.io/extrinsic/11315030-5", paidDate: new Date("2026-01-20") },
    ],
    m2Status: "completed",
    completionDate: new Date("2026-01-20"),
  },
];

async function main() {
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI is not set.");
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB\n");

  const results = { updated: [], notFound: [] };

  for (const row of PAYMENTS) {
    const project = await Project.findOne({
      projectName: new RegExp(`^${escapeRegex(row.projectName)}$`, "i"),
    });
    if (!project) {
      results.notFound.push(row.projectName);
      console.log(`⚠ Not found: ${row.projectName}`);
      continue;
    }
    const updateData = {
      totalPaid: row.totalPaid,
    };
    if (row.m2Status) updateData.m2Status = row.m2Status;
    if (row.completionDate) updateData.completionDate = row.completionDate;
    await Project.findByIdAndUpdate(project._id, { $set: updateData }, { new: true });
    results.updated.push({ name: project.projectName, id: project._id });
    console.log(`✅ ${project.projectName} (${project._id})`);
  }

  console.log("\n--- Summary ---");
  console.log("Updated:", results.updated.length);
  if (results.notFound.length) console.log("Not found:", results.notFound.join(", "));

  await mongoose.disconnect();
  process.exit(0);
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
