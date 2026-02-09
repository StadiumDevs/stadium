/**
 * Sync final submission data from set-m2-final-submissions.js to Supabase.
 * Updates final_submission fields and live_url for completed projects.
 *
 * Usage (from server/):
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/sync-final-submissions-to-supabase.js
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

// Final submission data from set-m2-final-submissions.js
const SUBMISSIONS = [
  {
    projectName: "OpenArkiv",
    finalSubmission: {
      repoUrl: "https://github.com/OpenArkiv",
      demoUrl: "https://youtu.be/zQvZUBh5aco",
      docsUrl: "https://github.com/OpenArkiv",
      summary: "Refactored and initialized the codebase for scalability. Designed and tested multi-hop architecture for routing payloads across n devices. Validated multi-hop flows with BitChat architecture and test cases. Implemented Open Attestation schema on Arkiv with location coordinates. Refactored device key generation and signature flows for secure multi-device usage. Began media support and base64 encoding strategies. Advanced planning and partial implementation of encrypted payload flows. Created new landing site with sideloading instructions and shipped release file for OpenArkiv app installation.",
      submittedDate: new Date("2026-02-04"),
    },
    liveUrl: "https://openarkiv.vercel.app",
  },
  {
    projectName: "Kleo Protocol",
    finalSubmission: {
      repoUrl: "https://github.com/Kleo-Protocol",
      demoUrl: "https://youtu.be/i9du6iR0uiI",
      docsUrl: "https://deepwiki.com/Kleo-Protocol/kleo-contracts",
      summary: "Loan event standardization with schema for indexing. Full repayment system with on-chain transfers. Protocol update using pools and vouchers (no collateral). Kleo SDK public on npm (@kleo-protocol/kleo-sdk). Full Kleo beta on Paseo Asset Hub with PAS tokens. Repos: kleo-dapp, kleo-contracts, kleo-sdk, kleo-landing-page. Live at kleo.finance.",
      submittedDate: new Date("2026-01-31"),
    },
    liveUrl: "https://kleo.finance/",
  },
  {
    projectName: "ObraClara",
    finalSubmission: {
      repoUrl: "https://github.com/obra-clara/ink-documents-contract",
      demoUrl: "https://youtu.be/_4Z4MabWh8E",
      docsUrl: "https://github.com/chulista/hacksub0.obra-clara/blob/main/README.md",
      summary: "Milestone 2 completed. Smart contract repository: ink-documents-contract. Full details in MILESTONE-2-COMPLETED.md in hacksub0.obra-clara repo.",
      submittedDate: new Date("2026-01-20"),
    },
  },
];

async function main() {
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const submissionData of SUBMISSIONS) {
    // Find project by name (case-insensitive, Symbiosis hackathon)
    const { data: projects } = await supabase
      .from('projects')
      .select('id, project_name, final_submission_repo_url')
      .ilike('project_name', submissionData.projectName)
      .eq('hackathon_id', 'symbiosis-2025')
      .limit(1);

    if (!projects || projects.length === 0) {
      console.log(`  ⚠ ${submissionData.projectName}: not found`);
      skipped++;
      continue;
    }

    const project = projects[0];

    // Check if final submission already exists (idempotent)
    if (project.final_submission_repo_url === submissionData.finalSubmission.repoUrl) {
      console.log(`  ✓ ${project.project_name}: final submission already exists`);
      skipped++;
      continue;
    }

    try {
      const updateData = {
        final_submission_repo_url: submissionData.finalSubmission.repoUrl,
        final_submission_demo_url: submissionData.finalSubmission.demoUrl,
        final_submission_docs_url: submissionData.finalSubmission.docsUrl,
        final_submission_summary: submissionData.finalSubmission.summary,
        final_submission_submitted_date: submissionData.finalSubmission.submittedDate.toISOString(),
      };

      if (submissionData.liveUrl) {
        updateData.live_url = submissionData.liveUrl;
      }

      const { error } = await supabase
        .from('projects')
        .update(updateData)
        .eq('id', project.id);

      if (error) {
        throw error;
      }

      console.log(`  ✓ ${project.project_name}: final submission updated`);
      if (submissionData.liveUrl) {
        console.log(`    live_url: ${submissionData.liveUrl}`);
      }
      updated++;
    } catch (err) {
      console.error(`  ✗ ${project.project_name}: ${err.message}`);
      errors++;
    }
  }

  console.log(`\nDone. Updated: ${updated}, skipped: ${skipped}, errors: ${errors}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
