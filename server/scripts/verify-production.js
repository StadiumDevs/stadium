/**
 * Verify production deployment: Vercel frontend, Railway backend, Supabase DB.
 *
 * Usage (from server/):
 *   API_BASE_URL=https://stadium-production-996a.up.railway.app/api \
 *   FRONTEND_URL=https://stadium.joinwebzero.com \
 *   node scripts/verify-production.js
 *
 * Or set in .env:
 *   API_BASE_URL=...
 *   FRONTEND_URL=...
 */

import dotenv from 'dotenv';
dotenv.config();

const API_BASE = process.env.API_BASE_URL || 'https://stadium-production-996a.up.railway.app/api';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://stadium.joinwebzero.com';

const results = { passed: 0, failed: 0, warnings: 0 };
const errors = [];

async function check(name, fn) {
  try {
    const result = await fn();
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
  console.log('🔍 Verifying production deployment...\n');
  console.log(`API: ${API_BASE}`);
  console.log(`Frontend: ${FRONTEND_URL}\n`);

  // 1. Railway API health
  await check('Railway API is reachable', async () => {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return json.status === 'OK';
  });

  // 2. Railway → Supabase connection
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

  // 3. API returns projects
  await check('API returns projects from DB', async () => {
    const res = await fetch(`${API_BASE}/m2-program?limit=5`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (!Array.isArray(json.data)) throw new Error('Response missing data array');
    if (json.data.length === 0) {
      return { ok: false, message: 'No projects returned (DB might be empty)' };
    }
    return { ok: true, count: json.data.length };
  });

  // 4. Symbiosis projects exist
  await check('Symbiosis 2025 projects in DB', async () => {
    const res = await fetch(`${API_BASE}/m2-program?hackathonId=symbiosis-2025&limit=1`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (!Array.isArray(json.data)) throw new Error('Response missing data array');
    if (json.data.length === 0) {
      return { ok: false, message: 'No Symbiosis projects found (run migration?)' };
    }
    return { ok: true, count: json.data.length };
  });

  // 5. Symbiosis main-track winners exist
  await check('Symbiosis main-track winners exist', async () => {
    const res = await fetch(`${API_BASE}/m2-program?hackathonId=symbiosis-2025&limit=100`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const mainTrack = (json.data || []).filter(p =>
      p.bountyPrize?.some(b => b.name && /main track/i.test(b.name))
    );
    if (mainTrack.length === 0) {
      return { ok: false, message: 'No Symbiosis main-track winners found' };
    }
    return { ok: true, count: mainTrack.length };
  });

  // 6. Symbiosis main-track show on Program Overview (M2 filters)
  await check('Symbiosis main-track appear on M2 Program Overview', async () => {
    const res = await fetch(`${API_BASE}/m2-program?mainTrackOnly=true&limit=100`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const symbiosis = (json.data || []).filter(p => p.hackathon?.id === 'symbiosis-2025');
    if (symbiosis.length === 0) {
      return {
        ok: false,
        message: 'No Symbiosis projects on M2 Program Overview (set m2_status + m2_agreed_date?)',
      };
    }
    return { ok: true, count: symbiosis.length };
  });

  // 7. Frontend is reachable
  await check('Vercel frontend is reachable', async () => {
    const res = await fetch(FRONTEND_URL, { method: 'HEAD' });
    if (!res.ok && res.status !== 405) throw new Error(`HTTP ${res.status}`);
    return true;
  });

  // 8. Frontend can call API (CORS test)
  await check('Frontend can call API (CORS)', async () => {
    // Simulate a browser request from the frontend origin
    const origin = new URL(FRONTEND_URL).origin;
    const res = await fetch(`${API_BASE}/m2-program?limit=1`, {
      headers: { Origin: origin },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const corsHeader = res.headers.get('access-control-allow-origin');
    if (!corsHeader) {
      return { ok: false, message: 'No CORS header (API might not allow frontend origin)' };
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
    if (errors.some(e => e.name.includes('Supabase'))) {
      console.log('  • Check Railway env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
      console.log('  • Verify Supabase project is not paused');
    }
    if (errors.some(e => e.name.includes('Symbiosis'))) {
      console.log('  • Run: npm run db:mongo-then-supabase:full (to load Symbiosis)');
    }
    if (errors.some(e => e.name.includes('CORS'))) {
      console.log('  • Redeploy Railway server (CORS config)');
    }
    process.exit(1);
  } else if (results.warnings > 0) {
    console.log('\n⚠️  Some checks had warnings. Review output above.');
    process.exit(0);
  } else {
    console.log('\n🎉 All checks passed! Production is running correctly.');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
