/**
 * One-off: Set finalSubmission (M2 deliverables) for projects that were completed
 * but had no submission record (e.g. backfilled payouts).
 * Run from repo root: node server/scripts/set-m2-final-submissions.js
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

const SUBMISSIONS = [
  {
    projectName: "OpenArkiv",
    finalSubmission: {
      repoUrl: "https://github.com/OpenArkiv",
      demoUrl: "https://youtu.be/zQvZUBh5aco",
      docsUrl: "https://github.com/OpenArkiv",
      summary: "Refactored and initialized the codebase for scalability. Designed and tested multi-hop architecture for routing payloads across n devices. Validated multi-hop flows with BitChat architecture and test cases. Implemented Open Attestation schema on Arkiv with location coordinates. Refactored device key generation and signature flows for secure multi-device usage. Began media support and base64 encoding strategies. Advanced planning and partial implementation of encrypted payload flows. Created new landing site with sideloading instructions and shipped release file for OpenArkiv app installation.",
      submittedDate: new Date("2026-02-04"),
    },
    liveUrl: "https://openarkiv.vercel.app",
  },
  {
    projectName: "Kleo Protocol",
    finalSubmission: {
      repoUrl: "https://github.com/Kleo-Protocol",
      demoUrl: "https://youtu.be/i9du6iR0uiI",
      docsUrl: "https://deepwiki.com/Kleo-Protocol/kleo-contracts",
      summary: "Loan event standardization with schema for indexing. Full repayment system with on-chain transfers. Protocol update using pools and vouchers (no collateral). Kleo SDK public on npm (@kleo-protocol/kleo-sdk). Full Kleo beta on Paseo Asset Hub with PAS tokens. Repos: kleo-dapp, kleo-contracts, kleo-sdk, kleo-landing-page. Live at kleo.finance.",
      submittedDate: new Date("2026-01-31"),
    },
    liveUrl: "https://kleo.finance/",
  },
  {
    projectName: "ObraClara",
    finalSubmission: {
      repoUrl: "https://github.com/obra-clara/ink-documents-contract",
      demoUrl: "https://youtu.be/_4Z4MabWh8E",
      docsUrl: "https://github.com/chulista/hacksub0.obra-clara/blob/main/README.md",
      summary: "Milestone 2 completed. Smart contract repository: ink-documents-contract. Full details in MILESTONE-2-COMPLETED.md in hacksub0.obra-clara repo.",
      submittedDate: new Date("2026-01-20"),
    },
  },
];

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function main() {
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI is not set.");
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB\n");

  for (const row of SUBMISSIONS) {
    const project = await Project.findOne({
      projectName: new RegExp(`^${escapeRegex(row.projectName)}$`, "i"),
    });
    if (!project) {
      console.log(`⚠ Not found: ${row.projectName}`);
      continue;
    }
    const update = {
      finalSubmission: row.finalSubmission,
    };
    if (row.liveUrl) update.liveUrl = row.liveUrl;
    await Project.findByIdAndUpdate(project._id, { $set: update }, { new: true });
    console.log(`✅ ${project.projectName} – finalSubmission set`);
  }

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
