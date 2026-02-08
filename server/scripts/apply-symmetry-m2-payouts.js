/**
 * Migration: Apply M1/M2 payout data for Symmetry 2024 (and related) winners.
 * Uses only Project schema fields: totalPaid[*].{ milestone, amount, currency, transactionProof, paidDate }, m2Status, completionDate.
 * Run from server: node scripts/apply-symmetry-m2-payouts.js
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

/** @type {Array<{ projectName: string; totalPaid: Array<{ milestone: 'M1'|'M2'; amount: number; currency: 'USDC'; transactionProof: string; paidDate: Date }>; m2Status?: 'completed'; completionDate?: Date }>} */
const PAYMENTS = [
  {
    projectName: "Hypertents",
    totalPaid: [
      { milestone: "M1", amount: 1500, currency: "USDC", transactionProof: "https://assethub-polkadot.subscan.io/extrinsic/7876082-2", paidDate: new Date("2024-12-29") },
    ],
  },
  {
    projectName: "Empathy Technologies",
    totalPaid: [
      { milestone: "M1", amount: 1500, currency: "USDC", transactionProof: "https://assethub-polkadot.subscan.io/extrinsic/7095209-2", paidDate: new Date("2024-09-10") },
    ],
  },
  {
    projectName: "Alibi",
    totalPaid: [
      { milestone: "M1", amount: 1500, currency: "USDC", transactionProof: "https://assethub-polkadot.subscan.io/extrinsic/7095209-2", paidDate: new Date("2024-09-10") },
    ],
  },
  {
    projectName: "ChainView",
    totalPaid: [
      { milestone: "M1", amount: 1500, currency: "USDC", transactionProof: "https://assethub-polkadot.subscan.io/extrinsic/7095209-2", paidDate: new Date("2024-09-10") },
      { milestone: "M2", amount: 1000, currency: "USDC", transactionProof: "https://assethub-polkadot.subscan.io/extrinsic/9154818-2", paidDate: new Date("2025-06-27") },
    ],
    m2Status: "completed",
    completionDate: new Date("2025-06-27"),
  },
  {
    projectName: "propcorn",
    totalPaid: [
      { milestone: "M1", amount: 3000, currency: "USDC", transactionProof: "https://assethub-polkadot.subscan.io/extrinsic/7104400-2", paidDate: new Date("2024-09-11") },
      { milestone: "M2", amount: 2000, currency: "USDC", transactionProof: "https://assethub-polkadot.subscan.io/extrinsic/7876085-2", paidDate: new Date("2024-12-29") },
    ],
    m2Status: "completed",
    completionDate: new Date("2024-12-29"),
  },
  {
    projectName: "PAPI Actions",
    totalPaid: [
      { milestone: "M1", amount: 3000, currency: "USDC", transactionProof: "https://assethub-polkadot.subscan.io/extrinsic/7250337-3", paidDate: new Date("2024-10-02") },
    ],
  },
  {
    projectName: "Delegit",
    totalPaid: [
      { milestone: "M1", amount: 3000, currency: "USDC", transactionProof: "https://assethub-polkadot.subscan.io/extrinsic/7103717-3", paidDate: new Date("2024-09-11") },
      { milestone: "M2", amount: 2000, currency: "USDC", transactionProof: "https://assethub-polkadot.subscan.io/extrinsic/7463963-2", paidDate: new Date("2024-11-01") },
    ],
    m2Status: "completed",
    completionDate: new Date("2024-11-01"),
  },
  {
    projectName: "Anytype - NFT Gating",
    totalPaid: [
      { milestone: "M1", amount: 3000, currency: "USDC", transactionProof: "https://assethub-polkadot.subscan.io/extrinsic/7095211-2", paidDate: new Date("2024-09-10") },
    ],
  },
];

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function applyPayments() {
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
    const updateData = { totalPaid: row.totalPaid };
    if (row.m2Status) updateData.m2Status = row.m2Status;
    if (row.completionDate) updateData.completionDate = row.completionDate;
    await Project.findByIdAndUpdate(project._id, { $set: updateData }, { new: true });
    results.updated.push({ name: project.projectName, id: project._id });
    console.log(`✅ ${project.projectName} (${project._id})`);
  }

  return results;
}

async function main() {
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI is not set.");
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB\n");

  const results = await applyPayments();

  console.log("\n--- Summary ---");
  console.log("Updated:", results.updated.length);
  if (results.notFound.length) console.log("Not found:", results.notFound.join(", "));

  await mongoose.disconnect();
  process.exit(results.notFound.length ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
