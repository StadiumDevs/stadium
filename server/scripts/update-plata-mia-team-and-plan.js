/**
 * One-off: Update Plata Mia with team members and M2 plan.
 * Run from repo root: node server/scripts/update-plata-mia-team-and-plan.js
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

const TEAM_MEMBERS = [
  { name: "Cat", role: "Developer" },
  { name: "Nacho", role: "Developer" },
];

// Each string must be ≤500 chars (schema maxlength)
const AGREED_FEATURES = [
  "Week 1–2: Wallet Connector + Stealth Identity Module — Users activate Stealth Mode from Polkadot wallet (Talisman/Subwallet). Module derives & stores stealth keys, manages stealthId, syncs with vault contract. Who: Cat McGee",
  "Week 1–2: Wallet Stealth Balance Panel — Assets tab → Stealth Balance shows PAS funds via Hyperbridge. Who: Frontend Engineer (friend)",
  "Week 2–3: Wallet Notification Bridge (xx → Wallet Inbox API) — Notifications in wallet native inbox; xx network for metadata privacy. Who: Backend Engineer (friend)",
  "Week 2–3: XCM Pay-with-Stealth UI — Pay invoices on any chain using stealth balances on Asset Hub (Hyperbridge). Who: Cat McGee",
  "Week 3–4: Stealth Top-Up (Swap → Deposit → Stealth) — Convert wallet assets to stealth balances in one action. Who: Cat McGee",
  "Week 3–4: Production xx Notification Microservice — Multiple recipients, topic routing, wallet inbox adapters, rate limiting & retry. Who: Backend Engineer (friend)",
];

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

  const now = new Date();
  const agreedDate = new Date("2026-01-08");
  await Project.findByIdAndUpdate(
    project._id,
    {
      $set: {
        teamMembers: TEAM_MEMBERS,
        m2Agreement: {
          mentorName: project.m2Agreement?.mentorName,
          agreedDate,
          agreedFeatures: AGREED_FEATURES,
          documentation: project.m2Agreement?.documentation || [],
          successCriteria: project.m2Agreement?.successCriteria,
          lastUpdatedBy: "admin",
          lastUpdatedDate: now,
        },
      },
    },
    { new: true }
  );
  console.log("✅ Plata Mia updated: team (Cat, Nacho), M2 plan (6 features), agreedDate 2026-01-08");

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
