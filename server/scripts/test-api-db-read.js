/**
 * Verifies the API can read projects from the DB (Supabase).
 * Usage:
 *   API_BASE_URL=http://localhost:2000/api node scripts/test-api-db-read.js
 *   API_BASE_URL=https://your-railway-app.up.railway.app/api node scripts/test-api-db-read.js
 * Default: http://localhost:2000/api
 */
const BASE = process.env.API_BASE_URL || 'http://localhost:2000/api';

async function run() {
  let passed = 0;
  let failed = 0;

  // 1. GET /projects?limit=5 - list from DB
  try {
    const res = await fetch(`${BASE}/projects?limit=5`);
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    const json = await res.json();
    if (!Array.isArray(json.data)) throw new Error('Response must have .data array');
    const projects = json.data;
    // Each item should have id and projectName (from Supabase transform)
    for (const p of projects) {
      if (p.id == null || p.projectName == null) {
        throw new Error(`Project missing id or projectName: ${JSON.stringify(p).slice(0, 80)}`);
      }
    }
    console.log(`✓ GET /projects: ${projects.length} project(s) from DB`);
    passed++;
  } catch (e) {
    console.error('✗ GET /projects:', e.message);
    failed++;
  }

  // 2. GET /projects?winnersOnly=true&limit=3 - filtered read
  try {
    const res = await fetch(`${BASE}/projects?winnersOnly=true&limit=3`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (!Array.isArray(json.data)) throw new Error('Response must have .data array');
    console.log(`✓ GET /projects?winnersOnly=true: ${json.data.length} project(s)`);
    passed++;
  } catch (e) {
    console.error('✗ GET /projects?winnersOnly=true:', e.message);
    failed++;
  }

  // 3. Optional: if we have at least one project, GET by id
  try {
    const res = await fetch(`${BASE}/projects?limit=1`);
    const json = await res.json();
    if (Array.isArray(json.data) && json.data.length > 0) {
      const id = json.data[0].id;
      const res2 = await fetch(`${BASE}/projects/${encodeURIComponent(id)}`);
      if (!res2.ok) throw new Error(`HTTP ${res2.status} for GET /projects/${id}`);
      const json2 = await res2.json();
      const one = json2.data != null ? json2.data : json2;
      if (!one.id || !one.projectName) throw new Error('Single project missing id or projectName');
      console.log(`✓ GET /projects/:id: project "${String(one.projectName).slice(0, 30)}..."`);
      passed++;
    }
  } catch (e) {
    console.error('✗ GET /projects/:id:', e.message);
    failed++;
  }

  console.log('');
  if (failed > 0) {
    console.error(`Result: ${passed} passed, ${failed} failed`);
    process.exit(1);
  }
  console.log(`Result: ${passed} passed. API can read from DB.`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
