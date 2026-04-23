/**
 * Idempotent seed for the 2026 Dogfooding program. Inserts one row into the
 * `programs` table with placeholder-but-realistic metadata. Final copy lands
 * in issue #48 (alpha readiness).
 *
 * Usage:
 *   node server/scripts/seed-dogfooding-program.js
 *   node server/scripts/seed-dogfooding-program.js --dry-run
 *
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (from server/.env).
 *
 * Phase 1 revamp, issue #37. See docs/stadium-revamp-phase-1-spec.md §5.
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

// Dogfooding 2026 (Berlin, June 13–19).
const ROW = {
  id: 'dogfooding-2026-berlin',
  name: 'Dogfooding 2026',
  slug: 'dogfooding-2026-berlin',
  program_type: 'dogfooding',
  description:
    "A week in Berlin for past WebZero winners. Bring the thing you've been building, show it to the rest of the cohort, get structured feedback from builders who've shipped. No pitches, no sponsor deck — just a room full of people who want to help your project feel more real.",
  status: 'open',
  owner: 'webzero',
  applications_open_at: new Date().toISOString(),
  // Close a couple of weeks before the event so we have time to review.
  applications_close_at: '2026-05-30T23:59:59Z',
  event_starts_at: '2026-06-13T00:00:00Z',
  event_ends_at: '2026-06-19T23:59:59Z',
  location: 'Berlin',
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
