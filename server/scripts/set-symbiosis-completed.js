/**
 * Set Symbiosis 2025 main-track winners to m2_status='completed' with completionDate.
 * This makes them appear in "Recently Shipped" on the homepage.
 *
 * Usage (from server/):
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/set-symbiosis-completed.js
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

// Completion data for Symbiosis projects (from apply-zero-paid-payouts.js and set-m2-final-submissions.js)
const COMPLETION_DATA = {
  'OpenArkiv': {
    completionDate: '2026-02-04T00:00:00+00:00',
    finalSubmission: {
      repo_url: 'https://github.com/OpenArkiv',
      demo_url: 'https://youtu.be/zQvZUBh5aco',
      docs_url: 'https://github.com/OpenArkiv',
      summary: 'Refactored and initialized the codebase for scalability. Designed and tested multi-hop architecture for routing payloads across n devices. Validated multi-hop flows with BitChat architecture and test cases. Implemented Open Attestation schema on Arkiv with location coordinates. Refactored device key generation and signature flows for secure multi-device usage. Began media support and base64 encoding strategies. Advanced planning and partial implementation of encrypted payload flows. Created new landing site with sideloading instructions and shipped release file for OpenArkiv app installation.',
      submitted_date: '2026-02-04T00:00:00+00:00',
    },
    live_url: 'https://openarkiv.vercel.app',
  },
  'Kleo Protocol': {
    completionDate: '2026-01-31T00:00:00+00:00',
    finalSubmission: {
      repo_url: 'https://github.com/Kleo-Protocol',
      demo_url: 'https://youtu.be/i9du6iR0uiI',
      docs_url: 'https://deepwiki.com/Kleo-Protocol/kleo-contracts',
      summary: 'Loan event standardization with schema for indexing. Full repayment system with on-chain transfers. Protocol update using pools and vouchers (no collateral). Kleo SDK public on npm (@kleo-protocol/kleo-sdk). Full Kleo beta on Paseo Asset Hub with PAS tokens. Repos: kleo-dapp, kleo-contracts, kleo-sdk, kleo-landing-page. Live at kleo.finance.',
      submitted_date: '2026-01-31T00:00:00+00:00',
    },
    live_url: 'https://kleo.finance/',
  },
  'ObraClara': {
    completionDate: '2026-01-20T00:00:00+00:00',
    finalSubmission: {
      repo_url: 'https://github.com/obra-clara/ink-documents-contract',
      demo_url: 'https://youtu.be/_4Z4MabWh8E',
      docs_url: 'https://github.com/chulista/hacksub0.obra-clara/blob/main/README.md',
      summary: 'Milestone 2 completed. Smart contract repository: ink-documents-contract. Full details in MILESTONE-2-COMPLETED.md in hacksub0.obra-clara repo.',
      submitted_date: '2026-01-20T00:00:00+00:00',
    },
  },
  'Plata Mia': null, // Not completed yet
};

async function main() {
  // Fetch all Symbiosis 2025 projects with their bounty_prizes
  const { data: projects, error: projError } = await supabase
    .from('projects')
    .select('id, project_name, m2_status, completion_date')
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

  const mainTrackProjects = (projects || []).filter(p => mainTrackProjectIds.has(p.id));
  
  if (mainTrackProjects.length === 0) {
    console.log('No Symbiosis main-track winners found in Supabase.');
    return;
  }

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const p of mainTrackProjects) {
    const data = COMPLETION_DATA[p.project_name];
    
    // Skip if no completion data defined (e.g. Plata Mia)
    if (!data) {
      console.log(`  ⏭  ${p.project_name}: no completion data defined, skipping`);
      skipped++;
      continue;
    }

    // Skip if already completed with the same date
    if (p.m2_status === 'completed' && p.completion_date === data.completionDate) {
      console.log(`  ✓ ${p.project_name}: already completed`);
      skipped++;
      continue;
    }

    try {
      const updateData = {
        m2_status: 'completed',
        completion_date: data.completionDate,
        final_submission_repo_url: data.finalSubmission.repo_url,
        final_submission_demo_url: data.finalSubmission.demo_url,
        final_submission_docs_url: data.finalSubmission.docs_url,
        final_submission_summary: data.finalSubmission.summary,
        final_submission_submitted_date: data.finalSubmission.submitted_date,
      };
      
      if (data.live_url) {
        updateData.live_url = data.live_url;
      }

      const { error } = await supabase
        .from('projects')
        .update(updateData)
        .eq('id', p.id);

      if (error) {
        throw error;
      }

      console.log(`  ✓ ${p.project_name}: set to completed (${data.completionDate.split('T')[0]})`);
      updated++;
    } catch (err) {
      console.error(`  ✗ ${p.project_name}: ${err.message}`);
      errors++;
    }
  }

  console.log(`\nDone. Updated: ${updated}, skipped: ${skipped}, errors: ${errors}`);
  if (updated > 0) {
    console.log('These projects will now appear in "Recently Shipped" on the homepage.');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
