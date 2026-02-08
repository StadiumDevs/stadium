/**
 * One-off: Set Playnet Free Association payout date to 2025-10-20.
 * Updates totalPaid[].paidDate and completionDate.
 * Run from server: node scripts/fix-playnet-payout-date.js
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

const PAYOUT_DATE = new Date("2025-10-20");

async function main() {
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI is not set.");
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB\n");

  const project = await Project.findOne({
    projectName: /^Playnet/i,
  });
  if (!project) {
    console.error("Playnet Free Association not found.");
    await mongoose.disconnect();
    process.exit(1);
  }

  const updatedTotalPaid = (project.totalPaid || []).map((p) => ({
    ...p.toObject ? p.toObject() : p,
    paidDate: PAYOUT_DATE,
  }));

  await Project.findByIdAndUpdate(
    project._id,
    {
      $set: {
        totalPaid: updatedTotalPaid,
        completionDate: PAYOUT_DATE,
      },
    },
    { new: true }
  );

  console.log("✅ Playnet Free Association (" + project._id + ")");
  console.log("   totalPaid[].paidDate and completionDate set to 2025-10-20");

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
