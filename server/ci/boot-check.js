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
console.log(`boot check ok (Node ${process.versions.node})`);
process.exit(0);
