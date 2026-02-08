/**
 * One-off: Set Plata Mia to M2 status "under_review".
 * Run from server: node scripts/set-plata-mia-under-review.js
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

async function main() {
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI is not set.");
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB\n");

  const project = await Project.findOne({
    projectName: /^Plata Mia$/i,
  });
  if (!project) {
    console.error("Plata Mia not found.");
    await mongoose.disconnect();
    process.exit(1);
  }

  await Project.findByIdAndUpdate(
    project._id,
    { $set: { m2Status: "under_review" } },
    { new: true }
  );
  console.log("✅ Plata Mia set to under_review (" + project._id + ")");

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
