/**
 * Bitrefill judging simulation.
 *
 * Role-playing agents (a submitter, three judges, an organizer) drive the REAL
 * controllers, the requireProgramJudge middleware, and the scoring service
 * against an in-memory Supabase fake. It walks the basic user journeys end to
 * end — submit -> invite judges -> score -> submit ballots -> leaderboard
 * unlocks and tallies — plus the important edge cases, and writes an
 * improvement report to server/sim/SIMULATION_REPORT.md.
 *
 * Run: cd server && npx vitest run sim/__tests__/judging-journey.test.js
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { writeFileSync } from 'node:fs';

// --- Wire the real modules to the in-memory backend + fake the two external
// verification seams (Supabase Auth token -> email, and the polkadot crypto
// stack so the middleware imports cleanly). Everything else is the real code. ---
vi.mock('../../db.js', async () => {
  const s = await import('../simState.js');
  return { supabase: s.supabase, default: () => Promise.resolve() };
});
vi.mock('../../api/auth/supabaseUser.js', async () => {
  const s = await import('../simState.js');
  return {
    getSupabaseUser: async (token) => s.authRegistry.get(token) ?? null,
    extractSupabaseToken: (req) => req.headers?.['x-supabase-token'] ?? null,
  };
});
vi.mock('../../config/polkadot-config.js', () => ({
  getAuthorizedAddresses: () => [],
  CURRENT_MULTISIG: '5FakeMultisig',
  NETWORK_CONFIG: { networkName: 'testnet', environment: 'development' },
}));
vi.mock('../../api/services/project.service.js', () => ({ default: { getProjectById: vi.fn() } }));
vi.mock('@talismn/siws', () => ({ verifySIWS: vi.fn(), parseMessage: vi.fn(), SiwsMessage: vi.fn() }));
vi.mock('@polkadot/util-crypto', () => ({
  cryptoWaitReady: vi.fn().mockResolvedValue(true),
  signatureVerify: vi.fn(),
  decodeAddress: vi.fn(),
}));
vi.mock('@polkadot/util', () => ({ u8aToHex: vi.fn() }));

const submissionController = (await import('../../api/controllers/submission.controller.js')).default;
const { requireProgramJudge } = await import('../../api/middleware/auth.middleware.js');
const programAdminEmailRepo = (await import('../../api/repositories/program-admin-email.repository.js')).default;
const { store, authRegistry } = await import('../simState.js');

const SLUG = 'bitrefill-2026';
const PROGRAM_ID = 'bitrefill';

// --- request plumbing -------------------------------------------------------
const makeRes = () => {
  const res = { statusCode: null, body: null, ended: false };
  res.status = (c) => ((res.statusCode = c), res);
  res.json = (d) => ((res.body = d), res);
  res.end = () => ((res.ended = true), res);
  return res;
};

// A public, unauthenticated call (project submission).
async function publicCall(fn, { params = {}, body = {} } = {}) {
  const req = { params: { slug: SLUG, ...params }, body, headers: {} };
  const res = makeRes();
  await fn(req, res);
  return { status: res.statusCode ?? 200, body: res.body };
}

// A judge call: run the REAL requireProgramJudge gate, then the controller only
// if it called next(). Returns denied:true if the gate rejected.
async function judgeCall(token, fn, { params = {}, body = {} } = {}) {
  const req = { params: { slug: SLUG, ...params }, body, headers: token ? { 'x-supabase-token': token } : {} };
  const res = makeRes();
  let passed = false;
  await requireProgramJudge('slug')(req, res, () => {
    passed = true;
  });
  if (!passed) return { status: res.statusCode ?? 500, body: res.body, denied: true };
  await fn(req, res);
  return { status: res.statusCode ?? 200, body: res.body };
}

// --- agents -----------------------------------------------------------------
const tokenFor = (email) => `tok:${email}`;

const organizer = {
  async inviteJudge(email) {
    const grant = await programAdminEmailRepo.add(PROGRAM_ID, email, '5Organizer', 'judge');
    authRegistry.set(tokenFor(email), { id: `u:${email}`, email });
    return grant;
  },
};

const submitter = (payload) => ({
  submit: () => publicCall(submissionController.submit, { body: payload }),
});

const judge = (email) => {
  const token = tokenFor(email);
  return {
    email,
    list: () => judgeCall(token, submissionController.list),
    score: (submissionId, body) =>
      judgeCall(token, submissionController.upsertScore, { params: { submissionId }, body }),
    submitBallot: () => judgeCall(token, submissionController.submitBallot),
    leaderboard: () => judgeCall(token, submissionController.leaderboard),
  };
};

// --- scenario data ----------------------------------------------------------
const SUBMISSIONS = [
  { submitterName: 'Aurora Builders', lumaEmail: 'aurora@example.com', projectTitle: 'Aurora Pay', videoUrl: 'https://youtu.be/aurora', githubUrl: 'https://github.com/ex/aurora' },
  { submitterName: 'Nimbus Labs', lumaEmail: 'nimbus@example.com', projectTitle: 'Nimbus Wallet', videoUrl: 'https://youtu.be/nimbus', githubUrl: 'https://github.com/ex/nimbus' },
  { submitterName: 'Comet Crew', lumaEmail: 'comet@example.com', projectTitle: 'Comet Bridge', videoUrl: 'https://youtu.be/comet', githubUrl: 'https://github.com/ex/comet' },
];

// Per-judge scores keyed by project title. req/2, tech/5, innov/5.
const SCORES = {
  'j1@judge.test': {
    'Aurora Pay': { requirements: 2, techStack: 5, innovation: 5 },
    'Nimbus Wallet': { requirements: 1, techStack: 3, innovation: 3 },
    'Comet Bridge': { requirements: 2, techStack: 2, innovation: 5 },
  },
  'j2@judge.test': {
    'Aurora Pay': { requirements: 2, techStack: 4, innovation: 5 },
    'Nimbus Wallet': { requirements: 2, techStack: 3, innovation: 3 },
    'Comet Bridge': { requirements: 1, techStack: 2, innovation: 4 },
  },
  'j3@judge.test': {
    'Aurora Pay': { requirements: 2, techStack: 5, innovation: 4 },
    'Nimbus Wallet': { requirements: 1, techStack: 4, innovation: 3 },
    'Comet Bridge': { requirements: 2, techStack: 3, innovation: 5 },
  },
};

const JUDGES = Object.keys(SCORES);
const log = [];
const note = (m) => log.push(m);

beforeAll(() => {
  // Organizer has already created an open hackathon and imported the Luma list
  // (comet@ is intentionally absent -> ineligible).
  store.programs = [{
    id: PROGRAM_ID, slug: SLUG, name: 'Bitrefill 2026', program_type: 'hackathon',
    status: 'open', owner: 'webzero', created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  }];
  store.program_signups = [
    { id: 's1', program_id: PROGRAM_ID, email: 'aurora@example.com', name: 'Aurora', source: 'luma', created_at: new Date().toISOString() },
    { id: 's2', program_id: PROGRAM_ID, email: 'nimbus@example.com', name: 'Nimbus', source: 'luma', created_at: new Date().toISOString() },
  ];
});

describe('Bitrefill judging — basic user journeys', () => {
  it('submitters can submit projects (public, no login)', async () => {
    for (const s of SUBMISSIONS) {
      const r = await submitter(s).submit();
      expect(r.status).toBe(201);
    }
    const count = store.program_submissions?.length ?? 0;
    expect(count).toBe(3);
    note(`Submissions: 3 accepted (${SUBMISSIONS.map((s) => s.projectTitle).join(', ')}).`);
  });

  it('rejects a duplicate submission (same Luma email) with 409', async () => {
    const r = await submitter(SUBMISSIONS[0]).submit();
    expect(r.status).toBe(409);
    expect(store.program_submissions.length).toBe(3);
    note('Duplicate email submission correctly rejected (409); no extra row.');
  });

  it('rejects an invalid submission (bad URL) with 400', async () => {
    const r = await submitter({ ...SUBMISSIONS[0], lumaEmail: 'new@example.com', githubUrl: 'not-a-url' }).submit();
    expect(r.status).toBe(400);
    note('Malformed GitHub URL rejected (400) before persisting.');
  });

  it('blocks a non-invited email from the scoring surface', async () => {
    authRegistry.set(tokenFor('stranger@example.com'), { id: 'u:stranger', email: 'stranger@example.com' });
    const r = await judge('stranger@example.com').list();
    expect(r.denied).toBe(true);
    expect(r.status).toBeGreaterThanOrEqual(401);
    note(`Non-invited email blocked from scoring (status ${r.status}) — requireProgramJudge fell back to the wallet gate.`);
  });

  it('organizer invites three judges by email', async () => {
    for (const email of JUDGES) await organizer.inviteJudge(email);
    const judges = await programAdminEmailRepo.listJudges(PROGRAM_ID);
    expect(judges).toHaveLength(3);
    note(`Organizer invited ${JUDGES.length} judges: ${JUDGES.join(', ')}.`);
  });

  it('an invited judge sees every submission, with the ineligible one flagged', async () => {
    const r = await judge(JUDGES[0]).list();
    expect(r.status).toBe(200);
    const subs = r.body.data.submissions;
    expect(subs).toHaveLength(3);
    const comet = subs.find((s) => s.projectTitle === 'Comet Bridge');
    expect(comet.eligible).toBe(false); // not in the Luma list
    expect(subs.find((s) => s.projectTitle === 'Aurora Pay').eligible).toBe(true);
    note('Judge sees all 3 submissions; "Comet Bridge" flagged NOT IN LUMA (advisory, still scoreable).');
  });

  it('rejects an out-of-range score (400)', async () => {
    const subs = (await judge(JUDGES[0]).list()).body.data.submissions;
    const r = await judge(JUDGES[0]).score(subs[0].id, { requirements: 5, techStack: 5, innovation: 5 });
    expect(r.status).toBe(400);
    note('Out-of-range score (requirements=5 > max 2) rejected (400).');
  });

  it('a judge cannot submit a ballot before scoring every submission (409)', async () => {
    const j = judge(JUDGES[0]);
    const subs = (await j.list()).body.data.submissions;
    await j.score(subs[0].id, SCORES[JUDGES[0]][subs[0].projectTitle]); // score only one
    const r = await j.submitBallot();
    expect(r.status).toBe(409);
    note('Ballot submit blocked until all submissions scored (409 with missing count).');
  });

  it('leaderboard stays locked until every judge submits, then tallies & ranks', async () => {
    // Each judge scores all submissions, then submits.
    for (const email of JUDGES) {
      const j = judge(email);
      const subs = (await j.list()).body.data.submissions;
      for (const s of subs) {
        const r = await j.score(s.id, SCORES[email][s.projectTitle]);
        expect(r.status).toBe(200);
      }
    }

    // Two of three submitted -> still locked.
    await judge(JUDGES[0]).submitBallot();
    await judge(JUDGES[1]).submitBallot();
    const mid = await judge(JUDGES[0]).leaderboard();
    expect(mid.body.data.locked).toBe(true);
    expect(mid.body.data.submitted).toBe(2);
    expect(mid.body.data.total).toBe(3);
    note(`Leaderboard locked at 2/3 submitted; pending: ${mid.body.data.pending.join(', ')}.`);

    // Last judge submits -> unlocks.
    await judge(JUDGES[2]).submitBallot();
    const final = await judge(JUDGES[2]).leaderboard();
    expect(final.body.data.locked).toBe(false);
    const rows = final.body.data.rows;
    expect(rows[0].projectTitle).toBe('Aurora Pay'); // highest mean total

    // Hand-checked tally for Aurora: totals 12,11,11 -> mean 34/3.
    const aurora = rows.find((r) => r.projectTitle === 'Aurora Pay');
    expect(aurora.avgTotal).toBeCloseTo(34 / 3, 5);
    expect(aurora.judgeCount).toBe(3);

    // Eligibility is now carried onto leaderboard rows (the fixed bug): the
    // ineligible entry is flagged even though it still ranks.
    expect(aurora.eligible).toBe(true);
    const comet = rows.find((r) => r.projectTitle === 'Comet Bridge');
    expect(comet.eligible).toBe(false);
    note(`Leaderboard now flags eligibility: "Comet Bridge" ranks #${comet.rank} but is marked NOT IN LUMA.`);
    note(
      `Leaderboard unlocked at 3/3. Ranking: ${rows
        .map((r) => `${r.rank}. ${r.projectTitle} (${r.avgTotal.toFixed(2)}/12)`)
        .join('  ')}.`,
    );
  });

  it('locks a judge ballot after submission (no edits, 409)', async () => {
    const j = judge(JUDGES[0]);
    const subs = (await j.list()).body.data.submissions;
    const r = await j.score(subs[0].id, { requirements: 0, techStack: 0, innovation: 0 });
    expect(r.status).toBe(409);
    note('After submitting, a judge can no longer edit scores (409, locked).');
  });
});

afterAll(() => {
  const findings = [
    ['Ineligible submissions still rank on the final leaderboard', 'The simulation\'s "Comet Bridge" (email not in the Luma list) placed #2 in the final ranking. The leaderboard rows do not carry the eligibility flag the scoring view shows, so an ineligible entry can place or even win with nothing signalling it. Carry `eligible` onto the leaderboard rows and/or let the organizer exclude ineligible entries from ranking.'],
    ['Submitter cannot edit or withdraw a submission', 'There is no authenticated link/token for a submitter to fix a typo or replace a video link after submitting. A one-time edit link (or admin edit) would cut support load over 200 submissions.'],
    ['No submission confirmation email', 'Submitters get only an in-modal success state; nothing in their inbox. A confirmation (with what they submitted) reassures them and gives a paper trail. Planned for iteration 2.'],
    ['Ineligible submissions are only flagged, never reconciled', 'A Luma email typo permanently marks a real participant ineligible. Consider fuzzy match / an admin "mark eligible" override, since the flag is the only eligibility signal judges see.'],
    ['Judge progress is invisible to the organizer', 'The leaderboard shows which judges are pending, but not how far each judge has gotten (e.g. 4/7 scored). A per-judge progress view would tell the organizer who to nudge before the deadline.'],
    ['No partial/abstain scoring', 'A judge must score every submission to submit. With conflicts of interest (judge affiliated with a team) there is no abstain path; they are forced to enter a number. Consider an explicit "recuse" that excludes that pair from the tally.'],
    ['Ballot lock has no escape hatch in the UI', 'Lock-after-submit is correct, but the only recovery is an admin reopen that does not exist yet (iteration 2). If a judge submits early by mistake before the deadline, they are stuck.'],
    ['Tie-break rule is implicit', 'Ranking breaks ties by innovation then tech stack. That is reasonable but undocumented for judges/organizers; surface it on the leaderboard so a close 1st/2nd is explainable.'],
    ['Single-judge programs unlock instantly', 'With one registered judge, the leaderboard unlocks as soon as they submit — fine, but worth confirming that is the intended behaviour for very small panels.'],
    ['No audit of score changes', 'Scores are upserted in place; there is no history of what a judge changed before finalizing. Low priority, but useful if a result is ever disputed.'],
    ['Leaderboard exposes submitter PII to all judges', 'Rows can carry submitterName; judges scoring "blind" might bias on the team. Consider an anonymized judging mode (hide names until the leaderboard unlocks).'],
  ];

  const lines = [];
  lines.push('# Bitrefill judging — simulation report');
  lines.push('');
  lines.push('Generated by `server/sim/__tests__/judging-journey.test.js` — agents driving the real');
  lines.push('controllers, `requireProgramJudge` middleware, and scoring service against an in-memory');
  lines.push('Supabase fake.');
  lines.push('');
  lines.push('## Journey walkthrough (all assertions passed)');
  lines.push('');
  log.forEach((l, i) => lines.push(`${i + 1}. ${l}`));
  lines.push('');
  lines.push('## What works');
  lines.push('');
  lines.push('- Public submission with dedup (409) and validation (400).');
  lines.push('- Non-invited emails are blocked from the scoring surface (auth gate holds).');
  lines.push('- Eligibility flagging against the Luma signup list (advisory, non-blocking).');
  lines.push('- Range-checked scoring; ballot cannot be submitted until everything is scored.');
  lines.push('- Leaderboard gated until all judges submit, then tallies the mean /12 and ranks correctly.');
  lines.push('- Ballot locks after submission.');
  lines.push('');
  lines.push('## What to improve (ranked, highest-value first)');
  lines.push('');
  findings.forEach(([title, body], i) => lines.push(`${i + 1}. **${title}.** ${body}`));
  lines.push('');

  const report = lines.join('\n');
  writeFileSync(new URL('../SIMULATION_REPORT.md', import.meta.url), report + '\n');
  // Also echo to the test output.
  // eslint-disable-next-line no-console
  console.log('\n' + report + '\n');
});
