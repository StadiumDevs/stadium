/**
 * One-time bootstrap for the app_admins table.
 *
 * Inserts a single wallet into app_admins, then seeds the existing
 * AUTHORIZED_SIGNERS env values into global_admins (attributed to the new
 * app_admin) so the in-app UI sees the existing admin whitelist on first
 * login. Idempotent — safe to re-run.
 *
 * Usage:
 *   node server/scripts/bootstrap-app-admin.js \
 *     --chain substrate \
 *     --address 5GrwvaEF... \
 *     [--label "Sacha"] \
 *     [--dry-run]
 *
 * Env required (from server/.env):
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * After running once, the in-app `/admin/app-admins` page can add/remove
 * additional app_admins — no need to re-run this script.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { normalizeAddress } from '../api/auth/normalize.js';
import { parseAuthorizedSigners } from '../api/auth/authorizedSigners.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '..', '.env') });

const clean = (s) => (s || '').replace(/[\n\r\s]+/g, '');
const SUPABASE_URL = clean(process.env.SUPABASE_URL);
const SUPABASE_KEY = clean(process.env.SUPABASE_SERVICE_ROLE_KEY);
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in server/.env.');
  process.exit(1);
}

// --- arg parsing ---
const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : null;
};
const dryRun = args.includes('--dry-run');
const chain = (flag('chain') || '').toLowerCase();
const address = flag('address');
const label = flag('label');

const VALID_CHAINS = ['substrate', 'ethereum', 'solana'];
if (!VALID_CHAINS.includes(chain)) {
  console.error(`--chain must be one of: ${VALID_CHAINS.join(', ')}`);
  process.exit(2);
}
if (!address) {
  console.error('--address is required');
  process.exit(2);
}
const normalized = normalizeAddress(chain, address);
if (!normalized) {
  console.error(`Invalid ${chain} address: ${address}`);
  process.exit(2);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log('--- bootstrap-app-admin ---');
  console.log(`Mode:    ${dryRun ? 'DRY RUN (no writes)' : 'LIVE'}`);
  console.log(`Chain:   ${chain}`);
  console.log(`Wallet:  ${normalized}`);
  console.log(`Label:   ${label || '(none)'}`);
  console.log('');

  // 1. Insert the app_admin (idempotent via PK).
  const appAdminRow = {
    wallet_chain: chain,
    wallet: normalized,
    label: label ?? null,
    added_by: null, // bootstrap — no prior admin
  };
  if (dryRun) {
    console.log('Would upsert into app_admins:');
    console.log(`  ${JSON.stringify(appAdminRow)}`);
  } else {
    const { error: appErr } = await supabase
      .from('app_admins')
      .upsert(appAdminRow, { onConflict: 'wallet_chain,wallet' });
    if (appErr) {
      console.error('ERROR inserting app_admin:', appErr);
      process.exit(3);
    }
    console.log(`✓ Upserted ${chain}:${normalized} into app_admins`);
  }

  // 2. Seed AUTHORIZED_SIGNERS env into global_admins (attributed to this app_admin).
  const envRaw = process.env.AUTHORIZED_SIGNERS || process.env.ADMIN_WALLETS || '';
  const envSigners = parseAuthorizedSigners(envRaw);
  if (envSigners.length === 0) {
    console.log('');
    console.log('AUTHORIZED_SIGNERS env is empty; no global_admins to seed.');
    return;
  }
  console.log('');
  console.log(`Found ${envSigners.length} signer(s) in AUTHORIZED_SIGNERS env.`);

  for (const signer of envSigners) {
    const row = {
      wallet_chain: signer.chain,
      wallet: signer.normalized,
      label: 'Imported from AUTHORIZED_SIGNERS',
      added_by: `${chain}:${normalized}`,
    };
    if (dryRun) {
      console.log(`  Would upsert into global_admins: ${signer.chain}:${signer.normalized}`);
      continue;
    }
    const { error: gErr } = await supabase
      .from('global_admins')
      .upsert(row, { onConflict: 'wallet_chain,wallet' });
    if (gErr) {
      console.error(`  ERROR inserting global_admin ${signer.chain}:${signer.normalized}:`, gErr);
      continue;
    }
    console.log(`  ✓ Upserted ${signer.chain}:${signer.normalized}`);
  }
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(10);
});
