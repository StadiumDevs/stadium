/**
 * Reconcile `bounty_prizes` rows against the source-of-truth CSV for a given
 * hackathon. Addresses GitHub issue #28.
 *
 * Scope in this first pass: `symbiosis-2025` only — the only event for which a
 * per-track source of truth exists
 * (`server/migration-data/prizes-symbiosis-2025.csv`). Extending to other
 * hackathons requires per-bounty source data for those events (symmetry-2024
 * and synergy-2025 have only a single "Total Prize" column in `payouts.csv`).
 *
 * For each project in the CSV:
 *   - Compute expected rows (with IDEA-THON / SHIP-A-THON → "<Track> main
 *     track" normalisation — see server/migration-data/README.md).
 *   - Compare against the project's current `bounty_prizes` rows.
 *   - Apply one of:
 *       NOOP   — rows already match.
 *       UPDATE — exactly one current row for this hackathon, name/amount
 *                differs. Mutates the single row to match expected.
 *       INSERT — zero current rows for this hackathon, expected has exactly
 *                one. Creates the row.
 *       SKIP   — ambiguous. Never automatically resolved:
 *                  * project has > 1 current rows (could be legit multi-
 *                    bounty like Plata Mia).
 *                  * expected has > 1 rows but current has 1 or 0 (needs the
 *                    Plata Mia pattern — use fix-plata-mia-bounties.js).
 *                  * CSV project name not found in DB at all.
 *
 * Never deletes rows. Wrong data stays visible until explicitly handled.
 *
 * Usage:
 *   node server/scripts/reconcile-bounty-amounts-supabase.js --dry-run
 *   node server/scripts/reconcile-bounty-amounts-supabase.js
 *   node server/scripts/reconcile-bounty-amounts-supabase.js --hackathon=symbiosis-2025 --dry-run
 *
 * Env:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY — loaded from server/.env.
 *
 * ---
 *
 * Convention note:
 * CLAUDE.md §4 says `server/scripts/` is Mongo-only; Supabase-touching scripts
 * here are a known exception with existing precedent (`deploy-all.js`,
 * `fix-plata-mia-bounties.js`). Tracked as a backlog item.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '..', '.env') });

// --- args ---
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const hackathonArg = args.find((a) => a.startsWith('--hackathon='));
const hackathonId = hackathonArg ? hackathonArg.split('=')[1] : 'symbiosis-2025';

// --- env ---
const clean = (s) => (s || '').replace(/[\n\r\s]+/g, '');
const SUPABASE_URL = clean(process.env.SUPABASE_URL);
const SUPABASE_KEY = clean(process.env.SUPABASE_SERVICE_ROLE_KEY);
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in server/.env.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// --- CSV loading ---
const CSV_PATHS = {
  'symbiosis-2025': resolve(__dirname, '..', 'migration-data', 'prizes-symbiosis-2025.csv'),
};
const csvPath = CSV_PATHS[hackathonId];
if (!csvPath) {
  console.error(`No source-of-truth CSV registered for hackathon "${hackathonId}".`);
  console.error(`Supported: ${Object.keys(CSV_PATHS).join(', ')}`);
  process.exit(1);
}

function parseCsv(text) {
  const lines = text.trim().split('\n');
  const header = lines.shift().split(',');
  return lines.map((line) => {
    const cols = [];
    let cur = '';
    let inQ = false;
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ; continue; }
      if (ch === ',' && !inQ) { cols.push(cur); cur = ''; continue; }
      cur += ch;
    }
    cols.push(cur);
    const row = {};
    header.forEach((h, i) => { row[h] = cols[i] ?? ''; });
    return row;
  });
}

const rawCsv = parseCsv(readFileSync(csvPath, 'utf8'));
const csvRows = rawCsv.filter((r) => r.hackathon_id === hackathonId);
console.log(`Loaded ${csvRows.length} CSV rows for hackathon "${hackathonId}" from ${csvPath}`);

// --- track-name normalisation ---
const normaliseTrackName = (track) => {
  if (/^IDEA-?THON$/i.test(track) || /^SHIP-?A-?THON$/i.test(track)) {
    return `${track} main track`;
  }
  return track;
};

// --- main ---
const normaliseProjectName = (s) => (s || '').toLowerCase().replace(/[\s:!|]+/g, '');

async function main() {
  console.log(`--- reconcile-bounty-amounts-supabase ---`);
  console.log(`Supabase URL: ${SUPABASE_URL.replace(/\/\/([^.]+)\./, '//***.')}`);
  console.log(`Hackathon:    ${hackathonId}`);
  console.log(`Mode:         ${dryRun ? 'DRY RUN (no writes)' : 'LIVE (will mutate data)'}`);
  console.log('');

  // Fetch current DB state for the hackathon.
  const { data: dbRows, error: dbErr } = await supabase
    .from('bounty_prizes')
    .select('id, project_id, name, amount, hackathon_won_at_id, projects!inner(id, project_name)')
    .eq('hackathon_won_at_id', hackathonId);
  if (dbErr) { console.error('ERROR reading bounty_prizes:', dbErr); process.exit(2); }

  // Also fetch the full projects list so we can map CSV names to project_ids
  // even when a project has zero bounty_prizes rows.
  const { data: projectRows, error: projErr } = await supabase
    .from('projects')
    .select('id, project_name');
  if (projErr) { console.error('ERROR reading projects:', projErr); process.exit(2); }

  const projectsByNorm = new Map();
  for (const p of projectRows) {
    projectsByNorm.set(normaliseProjectName(p.project_name), p);
  }

  const dbByProjectId = new Map();
  for (const r of dbRows) {
    if (!dbByProjectId.has(r.project_id)) dbByProjectId.set(r.project_id, []);
    dbByProjectId.get(r.project_id).push(r);
  }

  // Group CSV by project, build expected rows.
  const csvByProject = new Map();
  for (const r of csvRows) {
    const key = normaliseProjectName(r.project);
    if (!csvByProject.has(key)) csvByProject.set(key, { sourceName: r.project, rows: [] });
    csvByProject.get(key).rows.push({
      name: normaliseTrackName(r.track),
      amount: Number(r.total_prize_amount),
    });
  }

  // Plan actions.
  const actions = { NOOP: [], UPDATE: [], INSERT: [], SKIP: [] };

  for (const [key, { sourceName, rows: expected }] of csvByProject) {
    const proj = projectsByNorm.get(key);
    if (!proj) {
      actions.SKIP.push({ reason: 'project-not-found-in-db', sourceName, expected });
      continue;
    }
    const current = dbByProjectId.get(proj.id) || [];

    const expectedSorted = [...expected].sort((a, b) => a.name.localeCompare(b.name));
    const currentSorted = [...current]
      .map((r) => ({ id: r.id, name: r.name, amount: Number(r.amount) }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const sameShape =
      expectedSorted.length === currentSorted.length &&
      expectedSorted.every((e, i) => e.name === currentSorted[i].name && e.amount === currentSorted[i].amount);

    if (sameShape) {
      actions.NOOP.push({ project: proj, current: currentSorted });
      continue;
    }

    // Multi-row current: leave alone.
    if (current.length > 1) {
      actions.SKIP.push({
        reason: 'project-has-multiple-db-rows-will-not-auto-mutate',
        project: proj,
        current: currentSorted,
        expected: expectedSorted,
      });
      continue;
    }

    // Multi-row expected: needs the Plata Mia pattern (split / assemble).
    if (expected.length > 1) {
      actions.SKIP.push({
        reason: 'expected-multiple-rows-use-per-project-script',
        project: proj,
        current: currentSorted,
        expected: expectedSorted,
      });
      continue;
    }

    // Clean 1:1 or 0:1 cases.
    if (current.length === 1) {
      actions.UPDATE.push({ project: proj, before: currentSorted[0], after: expectedSorted[0] });
    } else if (current.length === 0) {
      actions.INSERT.push({ project: proj, row: expectedSorted[0] });
    } else {
      actions.SKIP.push({ reason: 'unexpected-shape', project: proj, current: currentSorted, expected: expectedSorted });
    }
  }

  // Also check for DB rows whose project is NOT in the CSV — flag (but don't act).
  for (const [projectId, rows] of dbByProjectId) {
    const name = rows[0].projects.project_name;
    if (!csvByProject.has(normaliseProjectName(name))) {
      actions.SKIP.push({
        reason: 'db-has-project-not-in-csv',
        project: { id: projectId, project_name: name },
        current: rows.map((r) => ({ id: r.id, name: r.name, amount: Number(r.amount) })),
      });
    }
  }

  // --- print plan ---
  console.log('=== PLAN ===\n');
  console.log(`NOOP   ${actions.NOOP.length}`);
  for (const a of actions.NOOP) {
    console.log(`  ✓ ${a.project.project_name} (${a.current.length} row${a.current.length === 1 ? '' : 's'})`);
  }
  console.log('');
  console.log(`UPDATE ${actions.UPDATE.length}`);
  for (const a of actions.UPDATE) {
    console.log(`  ~ ${a.project.project_name}`);
    console.log(`      before: name="${a.before.name}" amount=${a.before.amount}`);
    console.log(`      after:  name="${a.after.name}" amount=${a.after.amount}`);
  }
  console.log('');
  console.log(`INSERT ${actions.INSERT.length}`);
  for (const a of actions.INSERT) {
    console.log(`  + ${a.project.project_name}  name="${a.row.name}" amount=${a.row.amount}`);
  }
  console.log('');
  console.log(`SKIP   ${actions.SKIP.length}`);
  for (const a of actions.SKIP) {
    console.log(`  ! ${a.reason}  ${a.project?.project_name || a.sourceName || ''}`);
    if (a.expected) console.log(`      expected: ${JSON.stringify(a.expected)}`);
    if (a.current)  console.log(`      current:  ${JSON.stringify(a.current)}`);
  }
  console.log('');

  if (dryRun) {
    console.log('DRY RUN: no mutations performed. Re-run without --dry-run to apply.');
    process.exit(0);
  }

  // --- execute ---
  console.log('=== APPLYING ===\n');

  for (const a of actions.UPDATE) {
    console.log(`UPDATE ${a.project.project_name} (row id=${a.before.id})…`);
    const { error } = await supabase
      .from('bounty_prizes')
      .update({ name: a.after.name, amount: a.after.amount })
      .eq('id', a.before.id);
    if (error) {
      console.error(`  ✗ ERROR:`, error);
      console.error(`  Aborting. Earlier changes are NOT rolled back.`);
      process.exit(4);
    }
    console.log(`  ✓ ok`);
  }

  for (const a of actions.INSERT) {
    console.log(`INSERT ${a.project.project_name}…`);
    const { error } = await supabase
      .from('bounty_prizes')
      .insert({
        project_id: a.project.id,
        name: a.row.name,
        amount: a.row.amount,
        hackathon_won_at_id: hackathonId,
      });
    if (error) {
      console.error(`  ✗ ERROR:`, error);
      console.error(`  Aborting. Earlier changes are NOT rolled back.`);
      process.exit(4);
    }
    console.log(`  ✓ ok`);
  }

  console.log('');
  console.log(`Applied ${actions.UPDATE.length} UPDATE(s) and ${actions.INSERT.length} INSERT(s).`);
  console.log(`Skipped ${actions.SKIP.length} project(s) requiring manual review.`);
  console.log('Done.');
}

main().catch((e) => { console.error('FATAL:', e); process.exit(10); });
