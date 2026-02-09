/**
 * Sync missing bounty_prizes from MongoDB to Supabase for Symbiosis projects.
 *
 * This fixes projects that were migrated to Supabase but are missing bounty_prizes
 * (e.g. if migrate-mongo-to-supabase.js didn't copy them correctly).
 *
 * Usage (from server/):
 *   MONGO_URI=... SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/sync-bounty-prizes-from-mongo.js
 */

import { createClient } from '@supabase/supabase-js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI?.trim();
const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/[\n\r\s]+/g, '');
const SUPABASE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').replace(/[\n\r\s]+/g, '');

if (!MONGO_URI || !SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Set MONGO_URI, SUPABASE_URL, and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// MongoDB Project Schema
const ProjectSchema = new mongoose.Schema({
  _id: String,
  projectName: String,
  bountyPrize: [{
    name: String,
    amount: Number,
    hackathonWonAtId: String
  }],
  hackathon: {
    id: String
  }
}, { collection: 'projects' });

const Project = mongoose.model('Project', ProjectSchema);

async function main() {
  // 1. Connect to MongoDB
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB\n');

  // 2. Fetch Symbiosis projects from MongoDB that have bountyPrize
  const mongoProjects = await Project.find({
    'hackathon.id': 'symbiosis-2025',
    'bountyPrize.0': { $exists: true } // Has at least one bounty prize
  }).select('_id projectName bountyPrize');

  console.log(`Found ${mongoProjects.length} Symbiosis projects in MongoDB with bounty_prizes\n`);

  // 3. Fetch existing bounty_prizes from Supabase
  const { data: supabaseProjects } = await supabase
    .from('projects')
    .select('id')
    .eq('hackathon_id', 'symbiosis-2025');

  const projectIds = supabaseProjects.map(p => p.id);
  
  const { data: existingBounties } = await supabase
    .from('bounty_prizes')
    .select('project_id')
    .in('project_id', projectIds);

  const projectsWithBounties = new Set(existingBounties.map(b => b.project_id));

  // 4. For each MongoDB project, check if Supabase is missing bounty_prizes
  let fixed = 0;
  let skipped = 0;
  let errors = 0;

  for (const mongoP of mongoProjects) {
    const supabaseId = mongoP._id;

    // Skip if Supabase already has bounty_prizes for this project
    if (projectsWithBounties.has(supabaseId)) {
      skipped++;
      continue;
    }

    // Check if project exists in Supabase
    const { data: supabaseProject } = await supabase
      .from('projects')
      .select('id, project_name')
      .eq('id', supabaseId)
      .single();

    if (!supabaseProject) {
      console.log(`  ⚠ ${mongoP.projectName} (${supabaseId}): not found in Supabase`);
      skipped++;
      continue;
    }

    // Insert bounty_prizes from MongoDB
    try {
      const bountiesToInsert = mongoP.bountyPrize.map(b => ({
        project_id: supabaseId,
        name: b.name,
        amount: b.amount || 2500,
        hackathon_won_at_id: b.hackathonWonAtId || 'symbiosis-2025',
      }));

      const { error: insertError } = await supabase
        .from('bounty_prizes')
        .insert(bountiesToInsert);

      if (insertError) {
        throw insertError;
      }

      console.log(`  ✓ ${mongoP.projectName}: added ${bountiesToInsert.length} bounty prize(s)`);
      fixed++;
    } catch (err) {
      console.error(`  ✗ ${mongoP.projectName}: ${err.message}`);
      errors++;
    }
  }

  await mongoose.disconnect();
  console.log(`\nDone. Fixed: ${fixed}, skipped: ${skipped}, errors: ${errors}`);
}

main().catch((e) => {
  console.error(e);
  mongoose.disconnect();
  process.exit(1);
});
