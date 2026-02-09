/**
 * Apply Symbiosis payout data to Supabase (from apply-zero-paid-payouts.js).
 * Updates payments table and project totalPaid, m2Status, completionDate.
 *
 * Usage (from server/):
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/apply-symbiosis-payouts-to-supabase.js
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

// Payment data from apply-zero-paid-payouts.js
const PAYMENTS = [
  {
    projectName: "Chiri App",
    totalPaid: [
      { milestone: "BOUNTY", amount: 500, currency: "USDC", transactionProof: "https://assethub-polkadot.subscan.io/extrinsic/10652483-5", bountyName: "Kusama bounty", paidDate: new Date("2025-12-03") },
    ],
  },
  {
    projectName: "Unblind for Polkadot",
    totalPaid: [
      { milestone: "BOUNTY", amount: 1500, currency: "USDC", transactionProof: "https://assethub-polkadot.subscan.io/extrinsic/10652483-5", bountyName: "Kusama bounty", paidDate: new Date("2025-12-03") },
    ],
  },
  {
    projectName: "Infinite conspiracy",
    totalPaid: [
      { milestone: "BOUNTY", amount: 3000, currency: "USDC", transactionProof: "https://assethub-polkadot.subscan.io/extrinsic/10652483-5", bountyName: "Kusama bounty", paidDate: new Date("2025-12-03") },
    ],
  },
  {
    projectName: "Kleo Protocol",
    totalPaid: [
      { milestone: "M1", amount: 2000, currency: "USDC", transactionProof: "https://assethub-polkadot.subscan.io/extrinsic/10496453-2", paidDate: new Date("2025-11-22") },
      { milestone: "M2", amount: 2000, currency: "USDC", transactionProof: "https://assethub-polkadot.subscan.io/extrinsic/11561829-4", paidDate: new Date("2026-01-31") },
    ],
    m2Status: "completed",
    completionDate: new Date("2026-01-31"),
  },
  {
    projectName: "OpenArkiv",
    totalPaid: [
      { milestone: "M1", amount: 2000, currency: "USDC", transactionProof: "https://assethub-polkadot.subscan.io/extrinsic/10496453-2", paidDate: new Date("2025-11-22") },
      { milestone: "M2", amount: 2000, currency: "USDC", transactionProof: "https://assethub-polkadot.subscan.io/extrinsic/11702297-2", paidDate: new Date("2026-02-04") },
    ],
    m2Status: "completed",
    completionDate: new Date("2026-02-04"),
  },
  {
    projectName: "Plata Mia",
    totalPaid: [
      { milestone: "M1", amount: 2000, currency: "USDC", transactionProof: "https://assethub-polkadot.subscan.io/extrinsic/10496453-2", paidDate: new Date("2025-11-22") },
    ],
  },
  {
    projectName: "ObraClara",
    totalPaid: [
      { milestone: "M1", amount: 2000, currency: "USDC", transactionProof: "https://assethub-polkadot.subscan.io/extrinsic/10496453-2", paidDate: new Date("2025-11-22") },
      { milestone: "M2", amount: 2000, currency: "USDC", transactionProof: "https://assethub-polkadot.subscan.io/extrinsic/11315030-5", paidDate: new Date("2026-01-20") },
    ],
    m2Status: "completed",
    completionDate: new Date("2026-01-20"),
  },
];

async function main() {
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const paymentData of PAYMENTS) {
    // Find project by name (case-insensitive, Symbiosis hackathon)
    const { data: projects } = await supabase
      .from('projects')
      .select('id, project_name')
      .ilike('project_name', paymentData.projectName)
      .eq('hackathon_id', 'symbiosis-2025')
      .limit(1);

    if (!projects || projects.length === 0) {
      console.log(`  ⚠ ${paymentData.projectName}: not found`);
      skipped++;
      continue;
    }

    const project = projects[0];

    // Check if payments already exist (idempotent check)
    const { data: existingPayments } = await supabase
      .from('payments')
      .select('id')
      .eq('project_id', project.id)
      .limit(1);

    if (existingPayments && existingPayments.length > 0) {
      // Payments exist, check if they match
      const { data: allPayments } = await supabase
        .from('payments')
        .select('*')
        .eq('project_id', project.id);

      const expectedCount = paymentData.totalPaid.length;
      if (allPayments && allPayments.length >= expectedCount) {
        console.log(`  ✓ ${project.project_name}: payments already exist`);
        skipped++;
        continue;
      }
    }

    try {
      // Delete existing payments for this project (to avoid duplicates)
      await supabase.from('payments').delete().eq('project_id', project.id);

      // Insert new payments
      const paymentsToInsert = paymentData.totalPaid.map(p => ({
        project_id: project.id,
        milestone: p.milestone,
        amount: p.amount,
        currency: p.currency,
        transaction_proof: p.transactionProof,
        paid_date: p.paidDate.toISOString(),
        bounty_name: p.bountyName || null,
      }));

      const { error: paymentError } = await supabase
        .from('payments')
        .insert(paymentsToInsert);

      if (paymentError) {
        throw paymentError;
      }

      // Update project: m2Status and completionDate if provided
      const projectUpdate = {};
      if (paymentData.m2Status) {
        projectUpdate.m2_status = paymentData.m2Status;
      }
      if (paymentData.completionDate) {
        projectUpdate.completion_date = paymentData.completionDate.toISOString();
      }

      if (Object.keys(projectUpdate).length > 0) {
        const { error: projectError } = await supabase
          .from('projects')
          .update(projectUpdate)
          .eq('id', project.id);

        if (projectError) {
          throw projectError;
        }
      }

      console.log(`  ✓ ${project.project_name}: ${paymentsToInsert.length} payment(s) added`);
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
