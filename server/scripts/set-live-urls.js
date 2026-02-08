/**
 * One-off: Set liveUrl for projects.
 * Run from repo root: node server/scripts/set-live-urls.js
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

const LIVE_URLS = [
  { projectName: "Kleo Protocol", liveUrl: "https://kleo.finance/" },
  { projectName: "OpenArkiv", liveUrl: "https://openarkiv.vercel.app" },
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

  for (const row of LIVE_URLS) {
    const project = await Project.findOne({
      projectName: new RegExp(`^${escapeRegex(row.projectName)}$`, "i"),
    });
    if (!project) {
      console.log(`⚠ Not found: ${row.projectName}`);
      continue;
    }
    await Project.findByIdAndUpdate(project._id, { $set: { liveUrl: row.liveUrl } }, { new: true });
    console.log(`✅ ${project.projectName} → ${row.liveUrl}`);
  }

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
