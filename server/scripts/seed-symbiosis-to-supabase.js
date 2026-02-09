/**
 * Seed Symbiosis 2025 (and optionally other hackathon JSON) into Supabase.
 * Use this when production uses Supabase and Symbiosis data was never migrated from MongoDB.
 *
 * Usage (from server/):
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-symbiosis-to-supabase.js
 *
 * Options:
 *   SET_M2_BUILDING=true  - Set main-track winners to m2_status='building' and m2_agreed_date so they show on Program Overview
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

dotenv.config();

const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/[\n\r\s]+/g, '');
const SUPABASE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').replace(/[\n\r\s]+/g, '');
const SET_M2_BUILDING = process.env.SET_M2_BUILDING === 'true';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const HACKATHON = {
  id: 'symbiosis-2025',
  name: 'Symbiosis 2025',
  endDate: '2025-11-19T18:00:00.000Z',
  eventStartedAt: 'symbiosis-2025',
};

function generateProjectId(projectName) {
  const sanitized = (projectName || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  const random = crypto.randomBytes(3).toString('hex');
  return `${sanitized || 'project'}-${random}`;
}

function parseTechStack(techStack) {
  if (Array.isArray(techStack)) return techStack;
  if (typeof techStack === 'string') return techStack.split(',').map(s => s.trim()).filter(Boolean);
  return [];
}

async function main() {
  const serverDir = path.resolve(process.cwd(), 'server');
  const dataPath = path.join(serverDir, 'migration-data', 'symbiosis-2025.json');
  if (!fs.existsSync(dataPath)) {
    console.error('Not found:', dataPath);
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  const projects = raw.filter(p => p.projectName && String(p.projectName).trim() !== '');

  console.log(`Seeding ${projects.length} Symbiosis 2025 projects to Supabase (SET_M2_BUILDING=${SET_M2_BUILDING})...\n`);

  let ok = 0;
  let err = 0;

  for (const p of projects) {
    const id = generateProjectId(p.projectName);
    const isMainTrack = p.winner && /main track/i.test(String(p.winner));

    const projectRow = {
      id,
      project_name: p.projectName,
      description: p.description || '',
      project_repo: p.githubRepo || p.projectRepo || null,
      demo_url: p.demoUrl || null,
      slides_url: p.slidesUrl || null,
      tech_stack: parseTechStack(p.techStack),
      categories: Array.isArray(p.categories) ? p.categories : [],
      donation_address: p.donationAddress || null,
      project_state: 'Hackathon Submission',
      bounties_processed: false,
      hackathon_id: HACKATHON.id,
      hackathon_name: HACKATHON.name,
      hackathon_end_date: HACKATHON.endDate,
      hackathon_event_started_at: HACKATHON.eventStartedAt,
      completion_date: null,
      submitted_date: null,
    };
    if (SET_M2_BUILDING && isMainTrack) {
      projectRow.m2_status = 'building';
      projectRow.m2_agreed_date = new Date().toISOString();
    }

    try {
      await supabase.from('projects').upsert(projectRow, { onConflict: 'id' });

      await supabase.from('team_members').delete().eq('project_id', id);
      await supabase.from('team_members').insert({
        project_id: id,
        name: (p.teamLead && String(p.teamLead).trim()) ? p.teamLead.trim() : 'Team Lead',
        wallet_address: null,
      });

      await supabase.from('bounty_prizes').delete().eq('project_id', id);
      if (p.winner && String(p.winner).trim()) {
        await supabase.from('bounty_prizes').insert({
          project_id: id,
          name: p.winner.trim(),
          amount: 2500,
          hackathon_won_at_id: HACKATHON.id,
        });
      }

      ok++;
      if (ok <= 5 || isMainTrack) {
        console.log(`  ✓ ${p.projectName}${isMainTrack ? ' (main track)' : ''}`);
      }
    } catch (e) {
      err++;
      console.error(`  ✗ ${p.projectName}:`, e.message);
    }
  }

  console.log(`\nDone. OK: ${ok}, errors: ${err}`);
  if (SET_M2_BUILDING) {
    console.log('Main-track winners were set to m2_status=building with m2_agreed_date so they appear on Program Overview.');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
