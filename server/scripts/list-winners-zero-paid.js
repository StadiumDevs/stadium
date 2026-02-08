/**
 * List all projects that are winners (have bountyPrize) and have $0 total paid.
 * Usage: from repo root, with MONGO_URI set:
 *   node server/scripts/list-winners-zero-paid.js
 * Or from server: node scripts/list-winners-zero-paid.js
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

function totalPaidSum(project) {
  const paid = project.totalPaid;
  if (!paid || !Array.isArray(paid) || paid.length === 0) return 0;
  return paid.reduce((sum, p) => sum + (p.amount || 0), 0);
}

async function main() {
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI is not set.");
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB\n");

  // Winners: bountyPrize exists and has at least one entry
  const winners = await Project.find({
    bountyPrize: { $exists: true, $not: { $size: 0 } },
  })
    .select("_id projectName teamMembers bountyPrize totalPaid hackathon m2Status")
    .lean();

  const zeroPaid = winners.filter((p) => totalPaidSum(p) === 0);

  console.log("═══════════════════════════════════════════════════════════");
  console.log("Winners with $0 total paid");
  console.log("═══════════════════════════════════════════════════════════");
  console.log(`Total winners: ${winners.length}`);
  console.log(`Winners with $0 paid: ${zeroPaid.length}\n`);

  if (zeroPaid.length === 0) {
    console.log("(none)");
    await mongoose.disconnect();
    process.exit(0);
    return;
  }

  zeroPaid.forEach((p, i) => {
    const lead = p.teamMembers?.[0]?.name ?? "—";
    const track = p.bountyPrize?.[0]?.name ?? "—";
    const hackathon = p.hackathon?.name ?? p.hackathon?.id ?? "—";
    console.log(`${i + 1}. ${p.projectName}`);
    console.log(`   id: ${p._id}`);
    console.log(`   lead: ${lead}`);
    console.log(`   track: ${track}`);
    console.log(`   hackathon: ${hackathon}`);
    console.log(`   m2Status: ${p.m2Status ?? "—"}`);
    console.log("");
  });

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
