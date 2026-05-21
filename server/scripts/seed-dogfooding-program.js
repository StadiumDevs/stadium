/**
 * Idempotent seed for the Dogfooding 2026 Denver program. Inserts one row into
 * the `programs` table. Past event — event dates are left null until confirmed.
 *
 * Usage:
 *   node server/scripts/seed-dogfooding-program.js
 *   node server/scripts/seed-dogfooding-program.js --dry-run
 *
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (from server/.env).
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '..', '.env') });

const clean = (s) => (s || '').replace(/[\n\r\s]+/g, '');
const SUPABASE_URL = clean(process.env.SUPABASE_URL);
const SUPABASE_KEY = clean(process.env.SUPABASE_SERVICE_ROLE_KEY);

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in server/.env.');
  process.exit(1);
}

const dryRun = process.argv.includes('--dry-run');
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Dogfooding 2026 Denver — past event. Event dates unknown at seed time;
// fill event_starts_at / event_ends_at on Supabase once confirmed.
const ROW = {
  id: 'dogfooding-2026-denver',
  name: 'Dogfooding 2026 Denver',
  slug: 'dogfooding-2026-denver',
  program_type: 'dogfooding',
  description:
    "Whether you're new to web3 or deep in it — when's the last time you actually used a new product, not just heard about one? Dogfooding Denver showcased 3–4 products built by WebZero hackathon teams. No jargon-filled panels, no slideshows — just hands-on time with real apps. Attendees picked a product, spent 30 minutes on guided tasks, and submitted feedback that went directly to the builders. No technical background or wallet required — just curiosity. The feedback shapes what gets built next.",
  status: 'completed',
  owner: 'webzero',
  applications_open_at: null,
  applications_close_at: null,
  event_starts_at: null,
  event_ends_at: null,
  location: 'Denver',
  event_url: 'https://luma.com/dogfooding',
  max_applicants: null,
};

async function main() {
  console.log(`--- seed-dogfooding-program ---`);
  console.log(`Supabase URL: ${SUPABASE_URL.replace(/\/\/([^.]+)\./, '//***.')}`);
  console.log(`Mode:         ${dryRun ? 'DRY RUN (no writes)' : 'LIVE'}`);
  console.log('');

  const { data: existing, error: readErr } = await supabase
    .from('programs')
    .select('id, name, status')
    .eq('id', ROW.id)
    .maybeSingle();
  if (readErr) {
    console.error('ERROR reading programs:', readErr);
    process.exit(2);
  }

  if (existing) {
    console.log(`Program already exists: id=${existing.id} name="${existing.name}" status=${existing.status}`);
    console.log('Nothing to do. Exiting 0.');
    return;
  }

  console.log('Planned row:');
  console.log(`  id=${ROW.id}`);
  console.log(`  name="${ROW.name}"`);
  console.log(`  slug=${ROW.slug}`);
  console.log(`  program_type=${ROW.program_type}`);
  console.log(`  status=${ROW.status}`);
  console.log(`  applications: ${ROW.applications_open_at} → ${ROW.applications_close_at}`);
  console.log(`  event:        ${ROW.event_starts_at} → ${ROW.event_ends_at}`);
  console.log(`  location:     ${ROW.location}`);

  if (dryRun) {
    console.log('');
    console.log('DRY RUN: no insert performed.');
    return;
  }

  const { error: insertErr } = await supabase.from('programs').insert(ROW);
  if (insertErr) {
    console.error('ERROR inserting program:', insertErr);
    process.exit(3);
  }
  console.log('');
  console.log(`✓ Inserted ${ROW.id}`);
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(10);
});
