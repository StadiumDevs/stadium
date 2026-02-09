/**
 * Remove duplicate Symbiosis 2025 projects, keeping the one with the most data.
 *
 * Usage (from server/):
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/remove-symbiosis-duplicates.js
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
  // Fetch all Symbiosis projects
  const { data: projects, error: projError } = await supabase
    .from('projects')
    .select('id, project_name, created_at, updated_at, m2_status, completion_date')
    .eq('hackathon_id', 'symbiosis-2025')
    .order('created_at', { ascending: true });

  if (projError) {
    console.error('Failed to fetch projects:', projError.message);
    process.exit(1);
  }

  // Group by project name (case-insensitive)
  const groups = new Map();
  for (const p of projects || []) {
    const key = p.project_name.toLowerCase().trim();
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(p);
  }

  let deleted = 0;
  let kept = 0;

  for (const [name, duplicates] of groups.entries()) {
    if (duplicates.length <= 1) {
      continue; // No duplicates
    }

    console.log(`\n${duplicates[0].project_name}: ${duplicates.length} entries`);

    // Score each duplicate: prefer ones with m2_status, completion_date, or more recent updates
    const scored = duplicates.map(p => {
      let score = 0;
      if (p.m2_status) score += 10;
      if (p.completion_date) score += 5;
      if (p.updated_at) {
        const updated = new Date(p.updated_at).getTime();
        score += updated / 1000000; // Prefer more recently updated
      }
      return { project: p, score };
    });

    // Sort by score (highest first)
    scored.sort((a, b) => b.score - a.score);
    
    const keep = scored[0].project;
    const toDelete = scored.slice(1).map(s => s.project);

    console.log(`  ✓ Keeping: ${keep.id} (score: ${scored[0].score.toFixed(2)})`);

    for (const del of toDelete) {
      console.log(`  ✗ Deleting: ${del.id}`);
      
      // Delete related records first (foreign key constraints)
      await supabase.from('bounty_prizes').delete().eq('project_id', del.id);
      await supabase.from('team_members').delete().eq('project_id', del.id);
      await supabase.from('milestones').delete().eq('project_id', del.id);
      await supabase.from('payments').delete().eq('project_id', del.id);
      
      // Delete the project
      const { error } = await supabase.from('projects').delete().eq('id', del.id);
      
      if (error) {
        console.error(`    Error deleting ${del.id}: ${error.message}`);
      } else {
        deleted++;
      }
    }
    
    kept++;
  }

  console.log(`\nDone. Kept: ${kept} projects, deleted: ${deleted} duplicates`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
