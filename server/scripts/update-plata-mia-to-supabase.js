/**
 * Update Plata Mia with team members and M2 plan data in Supabase.
 * This syncs data from update-plata-mia-team-and-plan.js to Supabase.
 *
 * Usage (from server/):
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/update-plata-mia-to-supabase.js
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

const TEAM_MEMBERS = [
  { name: "Cat", role: "Developer" },
  { name: "Nacho", role: "Developer" },
];

// Each string must be ≤500 chars (schema maxlength)
const AGREED_FEATURES = [
  "Week 1–2: Wallet Connector + Stealth Identity Module — Users activate Stealth Mode from Polkadot wallet (Talisman/Subwallet). Module derives & stores stealth keys, manages stealthId, syncs with vault contract. Who: Cat McGee",
  "Week 1–2: Wallet Stealth Balance Panel — Assets tab → Stealth Balance shows PAS funds via Hyperbridge. Who: Frontend Engineer (friend)",
  "Week 2–3: Wallet Notification Bridge (xx → Wallet Inbox API) — Notifications in wallet native inbox; xx network for metadata privacy. Who: Backend Engineer (friend)",
  "Week 2–3: XCM Pay-with-Stealth UI — Pay invoices on any chain using stealth balances on Asset Hub (Hyperbridge). Who: Cat McGee",
  "Week 3–4: Stealth Top-Up (Swap → Deposit → Stealth) — Convert wallet assets to stealth balances in one action. Who: Cat McGee",
  "Week 3–4: Production xx Notification Microservice — Multiple recipients, topic routing, wallet inbox adapters, rate limiting & retry. Who: Backend Engineer (friend)",
];

async function main() {
  // Find Plata Mia
  const { data: project, error: projError } = await supabase
    .from('projects')
    .select('id, project_name, m2_agreed_date, m2_agreed_features')
    .ilike('project_name', 'Plata Mia')
    .eq('hackathon_id', 'symbiosis-2025')
    .single();

  if (projError || !project) {
    console.error('Plata Mia not found:', projError?.message);
    process.exit(1);
  }

  console.log(`Updating ${project.project_name} (${project.id})...\n`);

  // Update team members
  // Delete existing team members
  await supabase.from('team_members').delete().eq('project_id', project.id);

  // Insert new team members
  const teamToInsert = TEAM_MEMBERS.map(m => ({
    project_id: project.id,
    name: m.name,
    role: m.role,
  }));

  const { error: teamError } = await supabase
    .from('team_members')
    .insert(teamToInsert);

  if (teamError) {
    console.error('Error updating team members:', teamError.message);
  } else {
    console.log(`  ✓ Team members updated: ${TEAM_MEMBERS.map(m => m.name).join(', ')}`);
  }

  // Update M2 agreement
  const agreedDate = new Date('2026-01-08').toISOString();
  const updateData = {
    m2_agreed_date: agreedDate,
    m2_agreed_features: AGREED_FEATURES,
    m2_last_updated_by: 'admin',
    m2_last_updated_date: new Date().toISOString(),
  };

  const { error: updateError } = await supabase
    .from('projects')
    .update(updateData)
    .eq('id', project.id);

  if (updateError) {
    console.error('Error updating M2 agreement:', updateError.message);
    process.exit(1);
  }

  console.log(`  ✓ M2 agreed features updated: ${AGREED_FEATURES.length} features`);
  console.log(`  ✓ M2 agreed date set to: ${agreedDate.split('T')[0]}`);
  console.log('\n✅ Plata Mia updated successfully');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
