/**
 * One-off data fix for GitHub issue #27.
 *
 * Plata Mia's `bounty_prizes` table currently holds a single row with three
 * bounties concatenated into the name field and the wrong total amount:
 *
 *   { name: "Polkadot main track, xx Network bounty, Hyperbridge bounty",
 *     amount: 2500, hackathon_won_at_id: "symbiosis-2025" }
 *
 * Source of truth: `server/migration-data/prizes-symbiosis-2025.csv` shows
 * Plata Mia actually won three separate bounties at symbiosis-2025:
 *
 *   - IDEA-THON (main track):     4000 USDC
 *   - Hyperbridge:                 500 USDC
 *   - xx Network:                 1000 USD (denominated in xx tokens)
 *
 * This script deletes the concatenated row and inserts three correct rows.
 *
 * Usage:
 *   node server/scripts/fix-plata-mia-bounties.js --dry-run
 *   node server/scripts/fix-plata-mia-bounties.js
 *
 * Env:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY — loaded from server/.env.
 *
 * ---
 *
 * Convention note:
 * CLAUDE.md §4 says `server/scripts/` is Mongo-only; Supabase data fixes should
 * not live here. Precedent for Supabase-touching scripts already exists
 * (`deploy-all.js` still present, `fix-bounty-amounts-supabase.js` was here
 * before cleanup — see issue #28). Placed here for consistency with that
 * precedent; a backlog entry tracks reconciling the convention.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '..', '.env') });

const PROJECT_ID = 'plata-mia-15ac43';
const HACKATHON_ID = 'symbiosis-2025';
const EXPECTED_BAD_NAME = 'Polkadot main track, xx Network bounty, Hyperbridge bounty';
const EXPECTED_BAD_AMOUNT = 2500;

const NEW_ROWS = [
  { name: 'IDEA-THON main track', amount: 4000, hackathon_won_at_id: HACKATHON_ID },
  { name: 'Hyperbridge',          amount: 500,  hackathon_won_at_id: HACKATHON_ID },
  { name: 'xx Network',           amount: 1000, hackathon_won_at_id: HACKATHON_ID },
];

const dryRun = process.argv.includes('--dry-run');

const clean = (s) => (s || '').replace(/[\n\r\s]+/g, '');
const SUPABASE_URL = clean(process.env.SUPABASE_URL);
const SUPABASE_KEY = clean(process.env.SUPABASE_SERVICE_ROLE_KEY);

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in server/.env.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log(`--- fix-plata-mia-bounties ---`);
  console.log(`Supabase URL: ${SUPABASE_URL.replace(/\/\/([^.]+)\./, '//***.')}`);
  console.log(`Mode:         ${dryRun ? 'DRY RUN (no writes)' : 'LIVE (will mutate data)'}`);
  console.log('');

  // 1. Confirm the target project exists.
  const { data: project, error: projectErr } = await supabase
    .from('projects')
    .select('id, project_name')
    .eq('id', PROJECT_ID)
    .single();

  if (projectErr || !project) {
    console.error(`ERROR: project ${PROJECT_ID} not found in Supabase.`);
    console.error(projectErr);
    process.exit(2);
  }
  console.log(`Project located: ${project.project_name} (id=${project.id})`);

  // 2. Fetch current bounty rows.
  const { data: existing, error: fetchErr } = await supabase
    .from('bounty_prizes')
    .select('id, name, amount, hackathon_won_at_id')
    .eq('project_id', PROJECT_ID);

  if (fetchErr) {
    console.error(`ERROR: could not read bounty_prizes for ${PROJECT_ID}:`, fetchErr);
    process.exit(2);
  }

  console.log(`Current bounty_prizes rows: ${existing.length}`);
  for (const row of existing) {
    console.log(`  - "${row.name}"  amount=${row.amount}  hackathon=${row.hackathon_won_at_id}`);
  }
  console.log('');

  // 3. Idempotency guard: if already three rows with the target names, exit clean.
  const alreadySplit =
    existing.length === 3 &&
    NEW_ROWS.every((nr) => existing.some((er) => er.name === nr.name && Number(er.amount) === nr.amount));
  if (alreadySplit) {
    console.log('Already split into three correct rows. Nothing to do. Exiting 0.');
    process.exit(0);
  }

  // 4. Safety assertion: expect exactly ONE row matching the known bad shape.
  if (existing.length !== 1) {
    console.error(`ABORT: expected exactly 1 existing row in the bad state, found ${existing.length}.`);
    console.error('Refusing to mutate data that does not match the expected shape. Investigate manually.');
    process.exit(3);
  }
  const [bad] = existing;
  if (bad.name !== EXPECTED_BAD_NAME || Number(bad.amount) !== EXPECTED_BAD_AMOUNT) {
    console.error('ABORT: the single existing row does not match the expected bad shape.');
    console.error(`  Expected: name="${EXPECTED_BAD_NAME}", amount=${EXPECTED_BAD_AMOUNT}`);
    console.error(`  Found:    name="${bad.name}", amount=${bad.amount}`);
    console.error('Refusing to mutate. If the row has already been edited, decide manually.');
    process.exit(3);
  }

  console.log('Existing row matches expected bad shape. Planning three-row replacement:');
  for (const r of NEW_ROWS) {
    console.log(`  + INSERT name="${r.name}" amount=${r.amount} hackathon=${r.hackathon_won_at_id}`);
  }
  console.log(`  - DELETE id=${bad.id}`);
  console.log('');

  if (dryRun) {
    console.log('DRY RUN: no mutations performed. Re-run without --dry-run to apply.');
    process.exit(0);
  }

  // 5. Apply: insert first (so at least some row exists if something goes wrong), then delete.
  console.log('INSERT three new rows...');
  const { data: inserted, error: insertErr } = await supabase
    .from('bounty_prizes')
    .insert(NEW_ROWS.map((r) => ({ ...r, project_id: PROJECT_ID })))
    .select('id, name, amount');
  if (insertErr) {
    console.error('ERROR during INSERT:', insertErr);
    console.error('No DELETE performed. Manual cleanup may be required if partial insert.');
    process.exit(4);
  }
  console.log(`Inserted ${inserted.length} rows:`);
  for (const r of inserted) {
    console.log(`  ✓ id=${r.id} name="${r.name}" amount=${r.amount}`);
  }

  console.log(`DELETE old row id=${bad.id}...`);
  const { error: deleteErr } = await supabase
    .from('bounty_prizes')
    .delete()
    .eq('id', bad.id);
  if (deleteErr) {
    console.error('ERROR during DELETE:', deleteErr);
    console.error(`Old row ${bad.id} still exists alongside the three new rows.`);
    console.error('Manual cleanup required: delete the concatenated row by hand.');
    process.exit(5);
  }
  console.log(`  ✓ Deleted`);

  // 6. Re-fetch and log the final state.
  const { data: after, error: afterErr } = await supabase
    .from('bounty_prizes')
    .select('id, name, amount, hackathon_won_at_id')
    .eq('project_id', PROJECT_ID);
  if (afterErr) {
    console.error('WARNING: could not verify final state:', afterErr);
    process.exit(0);
  }
  console.log('');
  console.log(`After-state (${after.length} rows):`);
  for (const r of after) {
    console.log(`  - "${r.name}"  amount=${r.amount}  hackathon=${r.hackathon_won_at_id}`);
  }

  console.log('');
  console.log('Done.');
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(10);
});
