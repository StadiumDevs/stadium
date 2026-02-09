/**
 * Fix Symbiosis 2025 projects in Supabase: add missing bounty_prizes and optionally set m2_status.
 *
 * This fixes projects that were migrated to Supabase but are missing bounty_prizes
 * (e.g. if migrate-mongo-to-supabase ran before migration.js loaded Symbiosis).
 *
 * Usage (from server/):
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/fix-symbiosis-in-supabase.js
 *
 * Options:
 *   SET_M2_BUILDING=true  - Set main-track winners to m2_status='building' and m2_agreed_date
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/[\n\r\s]+/g, '');
const SUPABASE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').replace(/[\n\r\s]+/g, '');
const SET_M2_BUILDING = process.env.SET_M2_BUILDING === 'true';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  // 1. Load Symbiosis JSON
  // Script runs from server/ directory, so resolve from process.cwd()
  const dataPath = path.join(process.cwd(), 'migration-data', 'symbiosis-2025.json');
  if (!fs.existsSync(dataPath)) {
    console.error('Not found:', dataPath);
    process.exit(1);
  }
  const raw = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  const jsonProjects = raw.filter(p => p.projectName && String(p.projectName).trim() !== '');

  // 2. Fetch existing Symbiosis projects from Supabase
  const { data: dbProjects, error: fetchError } = await supabase
    .from('projects')
    .select('id, project_name, m2_status')
    .eq('hackathon_id', 'symbiosis-2025');

  if (fetchError) {
    console.error('Failed to fetch projects:', fetchError.message);
    process.exit(1);
  }

  console.log(`Found ${dbProjects.length} Symbiosis projects in Supabase`);
  console.log(`Found ${jsonProjects.length} projects in JSON\n`);

  // 3. Match JSON → DB by project name (case-insensitive)
  const nameMap = new Map();
  for (const dbp of dbProjects || []) {
    const key = String(dbp.project_name).toLowerCase().trim();
    nameMap.set(key, dbp);
  }

  let fixed = 0;
  let skipped = 0;
  let errors = 0;
  let notFound = 0;
  let noWinner = 0;
  let alreadyHasBounty = 0;

  for (const jsonP of jsonProjects) {
    const jsonName = String(jsonP.projectName).toLowerCase().trim();
    const dbProject = nameMap.get(jsonName);

    if (!dbProject) {
      notFound++;
      continue;
    }

    const hasWinner = jsonP.winner && String(jsonP.winner).trim();
    const isMainTrack = hasWinner && /main track/i.test(jsonP.winner);

    if (!hasWinner) {
      noWinner++;
      continue;
    }

    // Check if bounty_prizes already exist
    const { data: existingBounties } = await supabase
      .from('bounty_prizes')
      .select('id')
      .eq('project_id', dbProject.id)
      .limit(1);

    const needsBounty = hasWinner && (!existingBounties || existingBounties.length === 0);
    const needsM2 = SET_M2_BUILDING && isMainTrack && !dbProject.m2_status;

    if (!needsBounty && !needsM2) {
      if (existingBounties && existingBounties.length > 0) {
        alreadyHasBounty++;
      } else {
        skipped++;
      }
      continue;
    }

    try {
      // Add bounty_prize if missing
      if (needsBounty) {
        await supabase.from('bounty_prizes').insert({
          project_id: dbProject.id,
          name: jsonP.winner.trim(),
          amount: 2500,
          hackathon_won_at_id: 'symbiosis-2025',
        });
        console.log(`  ✓ ${jsonP.projectName}: added bounty "${jsonP.winner}"`);
      }

      // Set m2_status if needed
      if (needsM2) {
        await supabase
          .from('projects')
          .update({
            m2_status: 'building',
            m2_agreed_date: new Date().toISOString(),
          })
          .eq('id', dbProject.id);
        console.log(`  ✓ ${jsonP.projectName}: set m2_status=building`);
      }

      fixed++;
    } catch (err) {
      console.error(`  ✗ ${jsonP.projectName}: ${err.message}`);
      errors++;
    }
  }

  console.log(`\nDone. Fixed: ${fixed}, skipped: ${skipped}, errors: ${errors}`);
  console.log(`  Not found in DB: ${notFound}, No winner in JSON: ${noWinner}, Already has bounty: ${alreadyHasBounty}`);
  if (SET_M2_BUILDING) {
    console.log('Main-track winners were set to m2_status=building so they appear on Program Overview.');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
