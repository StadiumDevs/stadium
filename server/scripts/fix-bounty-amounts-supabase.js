/**
 * Fix bountyPrize amounts in Supabase using actual values from payouts.csv.
 * The migration hardcoded all amounts to 2500 — this patches them to match
 * the real "Total Prize (USDC)" from the CSV.
 *
 * Usage: node server/scripts/fix-bounty-amounts-supabase.js [--dry-run]
 */
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { createClient } from '@supabase/supabase-js';

const envPath = path.resolve(process.cwd(), 'server', '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

const DRY_RUN = process.argv.includes('--dry-run');

const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/[\n\r\s]+/g, '');
const SUPABASE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').replace(/[\n\r\s]+/g, '');

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const projectNameMapping = {
  'anytype - nft gating': 'anytype nft',
  'blockchain solutions hermann müller co kg': 'blockchain solutions hermann k.',
  'cranenalysis': 'blockchain solutions hermann k.',
};

const readCsvData = (filePath) => {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(filePath)) {
      console.error(`❌ CSV not found: ${filePath}`);
      return resolve({});
    }
    const payouts = {};
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        const hackathonId = row['hackathon-id'];
        const projectName = row['Project'];
        if (hackathonId && projectName) {
          const key = `${hackathonId.trim()}-${projectName.trim().toLowerCase()}`;
          payouts[key] = row;
        }
      })
      .on('end', () => resolve(payouts))
      .on('error', reject);
  });
};

const run = async () => {
  const scriptsDir = path.dirname(new URL(import.meta.url).pathname);
  const serverDir = path.dirname(scriptsDir);
  const csvPath = path.join(serverDir, 'migration-data', 'payouts.csv');
  const payouts = await readCsvData(csvPath);

  if (Object.keys(payouts).length === 0) {
    console.error('❌ No payout data found. Aborting.');
    process.exit(1);
  }

  // Fetch all bounty prizes with their project info
  const { data: prizes, error } = await supabase
    .from('bounty_prizes')
    .select('id, name, amount, hackathon_won_at_id, project_id, projects!inner(project_name)');

  if (error) {
    console.error('❌ Failed to fetch bounty_prizes:', error.message);
    process.exit(1);
  }

  console.log(`Found ${prizes.length} bounty prize entries\n`);

  let updated = 0;
  let skipped = 0;
  let notFound = 0;

  for (const prize of prizes) {
    const projectName = prize.projects?.project_name;
    if (!projectName) {
      console.log(`⚠️  Prize ${prize.id} — no project name, skipping`);
      skipped++;
      continue;
    }

    const originalName = projectName.trim().toLowerCase();
    const mappedName = projectNameMapping[originalName] || originalName;
    const lookupKey = `${prize.hackathon_won_at_id}-${mappedName}`;
    const payoutInfo = payouts[lookupKey];

    if (!payoutInfo) {
      console.log(`⚠️  ${projectName} [${prize.hackathon_won_at_id}] — no CSV match`);
      notFound++;
      continue;
    }

    const correctAmount = parseFloat(payoutInfo['Total Prize (USDC)']);
    if (isNaN(correctAmount) || correctAmount <= 0) {
      console.log(`⚠️  ${projectName} — invalid CSV amount: ${payoutInfo['Total Prize (USDC)']}`);
      skipped++;
      continue;
    }

    if (prize.amount !== correctAmount) {
      console.log(`✏️  ${projectName}: $${prize.amount} → $${correctAmount}`);
      if (!DRY_RUN) {
        const { error: updateError } = await supabase
          .from('bounty_prizes')
          .update({ amount: correctAmount })
          .eq('id', prize.id);
        if (updateError) {
          console.log(`  ❌ Update failed: ${updateError.message}`);
          continue;
        }
      }
      updated++;
    }
  }

  console.log(`\n--- Summary ${DRY_RUN ? '(DRY RUN)' : ''} ---`);
  console.log(`Updated: ${updated}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`No CSV match: ${notFound}`);
};

run().catch((err) => {
  console.error('❌ Script failed:', err);
  process.exit(1);
});
