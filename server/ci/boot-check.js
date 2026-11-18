// CI boot check: load what `node server.js` loads at startup (the Supabase
// client and every route module, with their controllers, services,
// repositories and middleware) without listening or touching a database.
// Catches crashes at import time that the unit tests can't see, since they mock
// db.js — e.g. a dependency that needs a newer Node than production runs
// (supabase-js 2.119 on Node 20 took production down). CI runs this on the
// Node version in server/.nvmrc, which must match Railway's.
//
// Placeholder env only: nothing here connects anywhere.
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

process.env.SUPABASE_URL ||= 'https://boot-check.invalid';
process.env.SUPABASE_SERVICE_ROLE_KEY ||= 'boot-check';
process.env.ADMIN_SESSION_SECRET ||= 'boot-check-0123456789abcdef0123456789';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
await import(path.join(root, 'db.js'));
const routesDir = path.join(root, 'api/routes');
for (const f of readdirSync(routesDir).filter((f) => f.endsWith('.js'))) {
  await import(path.join(routesDir, f));
}

// Production auth-config guard (#301): prove the startup check is importable
// and still rejects a known-bad production config (fixtures only — no DB).
await import(path.join(root, 'api/services/auth-config-check.service.js'));
const { checkAuthConfigAtStartup } = await import(path.join(root, 'api/auth/authConfigSafety.js'));
const ALICE = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
const silent = { error() {}, warn() {} };
const bad = await checkAuthConfigAtStartup({
  env: { NODE_ENV: 'production', ADMIN_WALLETS: ALICE, DISABLE_SIWS_DOMAIN_CHECK: 'true' },
  loadAdminRows: async () => ({ globalAdmins: [{ walletChain: 'substrate', wallet: ALICE }] }),
  enforce: false,
  logger: silent,
});
const good = await checkAuthConfigAtStartup({
  env: { NODE_ENV: 'production', EXPECTED_DOMAIN: 'stadium.example' },
  loadAdminRows: async () => ({}),
  enforce: true,
  logger: silent,
});
const EXPECTED_BAD = [
  'ADMIN_WALLETS contains dev account //Alice (sr25519)',
  'DISABLE_SIWS_DOMAIN_CHECK=true disables SIWS domain binding',
  'EXPECTED_DOMAIN is unset (SIWS domain check falls back to "localhost")',
  'global_admins contains dev account //Alice (sr25519)',
];
let enforceThrew = false;
try {
  await checkAuthConfigAtStartup({
    env: { NODE_ENV: 'production', ADMIN_WALLETS: ALICE, EXPECTED_DOMAIN: 'stadium.example' },
    loadAdminRows: async () => ({}),
    enforce: true,
    logger: silent,
  });
} catch (e) {
  enforceThrew = e.name === 'UnsafeAuthConfigError';
}
if (
  JSON.stringify([...bad.problems].sort()) !== JSON.stringify([...EXPECTED_BAD].sort()) ||
  good.problems.length !== 0 ||
  !enforceThrew
) {
  console.error('boot check FAILED: auth-config guard did not classify fixtures correctly', {
    bad: bad.problems,
    good: good.problems,
    enforceThrew,
  });
  process.exit(1);
}
console.log(`boot check ok (Node ${process.versions.node})`);
process.exit(0);
