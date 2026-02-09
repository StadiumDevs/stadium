/**
 * Set Symbiosis 2025 main-track winners in Supabase to m2_status='building' and m2_agreed_date=now().
 * Run this after migrate-mongo-to-supabase.js so they show on Program Overview.
 *
 * Usage (from server/):
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/set-symbiosis-m2-building.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/[\n\r\s]+/g, '');
const SUPABASE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').replace(/[\n\r\s]+/g, '');

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  // Fetch all Symbiosis 2025 projects with their bounty_prizes
  const { data: projects, error: projError } = await supabase
    .from('projects')
    .select('id, project_name, m2_status')
    .eq('hackathon_id', 'symbiosis-2025');

  if (projError) {
    console.error('Failed to fetch projects:', projError.message);
    process.exit(1);
  }

  const { data: bounties } = await supabase
    .from('bounty_prizes')
    .select('project_id, name')
    .eq('hackathon_won_at_id', 'symbiosis-2025');

  const mainTrackProjectIds = new Set();
  for (const b of bounties || []) {
    if (b.name && /main track/i.test(b.name)) {
      mainTrackProjectIds.add(b.project_id);
    }
  }

  const toUpdate = (projects || []).filter(p => mainTrackProjectIds.has(p.id));
  if (toUpdate.length === 0) {
    console.log('No Symbiosis main-track winners found in Supabase. Run migrate-mongo-to-supabase.js first.');
    return;
  }

  const now = new Date().toISOString();
  let ok = 0;
  for (const p of toUpdate) {
    const { error } = await supabase
      .from('projects')
      .update({ m2_status: 'building', m2_agreed_date: now })
      .eq('id', p.id);

    if (error) {
      console.error(`  ✗ ${p.project_name}: ${error.message}`);
    } else {
      console.log(`  ✓ ${p.project_name}`);
      ok++;
    }
  }

  console.log(`\nUpdated ${ok}/${toUpdate.length} Symbiosis main-track winners to m2_status=building. They will appear on Program Overview.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
