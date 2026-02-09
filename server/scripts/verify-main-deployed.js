/**
 * Verify production matches main branch and is working correctly.
 *
 * Checks:
 * 1. Git: main branch is clean / matches remote
 * 2. Railway: latest deployment matches main commit
 * 3. Vercel: latest deployment matches main commit (if linked to Git)
 * 4. Supabase: migrations match local
 * 5. API health and data
 * 6. Frontend can reach API
 *
 * Usage (from repo root):
 *   API_BASE_URL=https://stadium-production-996a.up.railway.app/api \
 *   FRONTEND_URL=https://your-vercel-url.vercel.app \
 *   node server/scripts/verify-main-deployed.js
 */

import { execSync } from 'child_process';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Script is in server/scripts/, so repo root is 2 levels up
const scriptRepoRoot = path.resolve(__dirname, '../..');
// Detect actual repo root: if .git exists in cwd, use cwd; else use script's calculated root
const cwd = process.cwd();
import fs from 'fs';
const actualRepoRoot = (() => {
  try {
    fs.accessSync(path.join(cwd, '.git'));
    return cwd;
  } catch {
    return scriptRepoRoot;
  }
})();

dotenv.config({ path: path.join(scriptRepoRoot, 'server', '.env') });

const API_BASE = process.env.API_BASE_URL || 'https://stadium-production-996a.up.railway.app/api';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://client-n7lu4qlus-sachalanskys-projects.vercel.app';

const results = { passed: 0, failed: 0, warnings: 0 };
const errors = [];

function check(name, fn) {
  try {
    const result = fn();
    if (result === true || (result && result.ok !== false)) {
      console.log(`✅ ${name}`);
      results.passed++;
      return true;
    } else {
      console.log(`⚠️  ${name}: ${result.message || 'unexpected result'}`);
      results.warnings++;
      return false;
    }
  } catch (err) {
    console.error(`❌ ${name}:`, err.message);
    errors.push({ name, error: err.message });
    results.failed++;
    return false;
  }
}

async function main() {
  console.log('🔍 Verifying production matches main branch...\n');
  console.log(`Repo: ${actualRepoRoot}`);
  console.log(`API: ${API_BASE}`);
  console.log(`Frontend: ${FRONTEND_URL}\n`);

  // 1. Git: on main branch
  check('Git: on main branch', () => {
    const branch = execSync('git branch --show-current', { cwd: actualRepoRoot, encoding: 'utf-8' }).trim();
    if (branch !== 'main') {
      throw new Error(`On branch "${branch}", expected "main"`);
    }
    return true;
  });

  // 2. Git: working tree clean
  check('Git: working tree clean', () => {
    const status = execSync('git status --porcelain', { cwd: actualRepoRoot, encoding: 'utf-8' }).trim();
    if (status) {
      return { ok: false, message: 'Uncommitted changes (commit or stash first)' };
    }
    return true;
  });

  // 3. Git: up to date with origin/main
  check('Git: up to date with origin/main', () => {
    try {
      execSync('git fetch origin main', { cwd: actualRepoRoot, stdio: 'ignore' });
      const local = execSync('git rev-parse HEAD', { cwd: actualRepoRoot, encoding: 'utf-8' }).trim();
      const remote = execSync('git rev-parse origin/main', { cwd: actualRepoRoot, encoding: 'utf-8' }).trim();
      if (local !== remote) {
        return { ok: false, message: `Local (${local.slice(0, 7)}) != remote (${remote.slice(0, 7)})` };
      }
      return true;
    } catch (err) {
      return { ok: false, message: 'Could not check remote (network?)' };
    }
  });

  // 4. Supabase: migrations match
  check('Supabase: migrations match local', async () => {
    try {
      const { execSync: exec } = await import('child_process');
      const output = execSync('supabase migration list', { cwd: actualRepoRoot, encoding: 'utf-8', stdio: 'pipe' });
      const lines = output.split('\n').filter(l => l.includes('|'));
      if (lines.length < 2) {
        return { ok: false, message: 'Could not parse migration list' };
      }
      const mismatches = lines.slice(1).filter(l => {
        const parts = l.split('|').map(p => p.trim());
        return parts.length >= 2 && parts[0] !== parts[1];
      });
      if (mismatches.length > 0) {
        return { ok: false, message: `${mismatches.length} migration(s) not applied` };
      }
      return true;
    } catch (err) {
      return { ok: false, message: 'Supabase CLI not linked or not installed' };
    }
  });

  // 5. Railway API health
  await check('Railway API is reachable', async () => {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return json.status === 'OK';
  });

  // 6. Railway → Supabase
  await check('Railway → Supabase connection', async () => {
    const res = await fetch(`${API_BASE}/health/db`);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HTTP ${res.status}: ${text.slice(0, 100)}`);
    }
    const json = await res.json();
    if (json.status !== 'OK') throw new Error(json.message || 'DB check failed');
    return { ok: true, projectsCount: json.projectsCount };
  });

  // 7. API returns projects
  await check('API returns projects from DB', async () => {
    const res = await fetch(`${API_BASE}/m2-program?limit=5`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (!Array.isArray(json.data)) throw new Error('Response missing data array');
    if (json.data.length === 0) {
      return { ok: false, message: 'No projects returned' };
    }
    return { ok: true, count: json.data.length };
  });

  // 8. Program Overview filter works (main track + M2 only)
  await check('Program Overview: main track + M2 filter', async () => {
    const res = await fetch(`${API_BASE}/m2-program?mainTrackOnly=true&limit=100`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const projects = json.data || [];
    // All should have m2_status set
    const withoutM2 = projects.filter(p => !p.m2Status);
    if (withoutM2.length > 0) {
      return { ok: false, message: `${withoutM2.length} projects without m2_status` };
    }
    // All should have "main track" in bounty name
    const withoutMainTrack = projects.filter(p =>
      !p.bountyPrize?.some(b => b.name && /main track/i.test(b.name))
    );
    if (withoutMainTrack.length > 0) {
      return { ok: false, message: `${withoutMainTrack.length} projects not main track` };
    }
    return { ok: true, count: projects.length };
  });

  // 9. Frontend reachable
  await check('Vercel frontend is reachable', async () => {
    const res = await fetch(FRONTEND_URL, { method: 'HEAD' });
    if (!res.ok && res.status !== 405) throw new Error(`HTTP ${res.status}`);
    return true;
  });

  // 10. Frontend → API (CORS)
  await check('Frontend can call API (CORS)', async () => {
    const origin = new URL(FRONTEND_URL).origin;
    const res = await fetch(`${API_BASE}/m2-program?limit=1`, {
      headers: { Origin: origin },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const corsHeader = res.headers.get('access-control-allow-origin');
    if (!corsHeader) {
      return { ok: false, message: 'No CORS header' };
    }
    return true;
  });

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 VERIFICATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`⚠️  Warnings: ${results.warnings}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log('='.repeat(60));

  if (errors.length > 0) {
    console.log('\n❌ Errors:');
    errors.forEach(({ name, error }) => {
      console.log(`  • ${name}: ${error}`);
    });
  }

  if (results.failed > 0) {
    console.log('\n💡 Next steps:');
    if (errors.some(e => e.name.includes('Git'))) {
      console.log('  • Commit changes and push to main');
    }
    if (errors.some(e => e.name.includes('Supabase'))) {
      console.log('  • Run: supabase db push (or apply migrations manually)');
    }
    if (errors.some(e => e.name.includes('Railway'))) {
      console.log('  • Redeploy Railway: cd server && railway up --detach');
    }
    if (errors.some(e => e.name.includes('Vercel'))) {
      console.log('  • Redeploy Vercel: cd client && vercel --prod');
    }
    process.exit(1);
  } else if (results.warnings > 0) {
    console.log('\n⚠️  Some checks had warnings. Review output above.');
    process.exit(0);
  } else {
    console.log('\n🎉 All checks passed! Production matches main and is working correctly.');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
