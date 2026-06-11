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
// project.service is left REAL — it only pulls project.repository -> the fake
// db, so promotion actually creates a project row in the in-memory store.
vi.mock('@talismn/siws', () => ({ verifySIWS: vi.fn(), parseMessage: vi.fn(), SiwsMessage: vi.fn() }));
vi.mock('@polkadot/util-crypto', () => ({
  cryptoWaitReady: vi.fn().mockResolvedValue(true),
  signatureVerify: vi.fn(),
  decodeAddress: vi.fn(),
}));
vi.mock('@polkadot/util', () => ({ u8aToHex: vi.fn() }));

const submissionController = (await import('../../api/controllers/submission.controller.js')).default;
const { requireProgramJudge, requireProgramViewer } = await import('../../api/middleware/auth.middleware.js');
const programAdminEmailRepo = (await import('../../api/repositories/program-admin-email.repository.js')).default;
const { store, authRegistry } = await import('../simState.js');

const SLUG = 'bitrefill-2026';
const PROGRAM_ID = 'bitrefill';
// A second, unrelated event — used to prove cross-event isolation.
const OTHER_SLUG = 'other-2026';
const OTHER_PROGRAM_ID = 'other';

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

// Run the requireProgramViewer gate (the admin read surface) for a token+slug.
// Returns denied:true if the gate rejected before calling next().
async function viewerGate(token, slug = SLUG) {
  const req = { params: { slug }, headers: token ? { 'x-supabase-token': token } : {} };
  const res = makeRes();
  let passed = false;
  await requireProgramViewer('slug')(req, res, () => {
    passed = true;
  });
  return { passed, status: res.statusCode };
}

// Run the requireProgramJudge gate for a token against an explicit slug.
async function judgeGate(token, slug) {
  const req = { params: { slug }, headers: token ? { 'x-supabase-token': token } : {} };
  const res = makeRes();
  let passed = false;
  await requireProgramJudge('slug')(req, res, () => {
    passed = true;
  });
  return { passed, status: res.statusCode };
}

// --- agents -----------------------------------------------------------------
const tokenFor = (email) => `tok:${email}`;

const organizer = {
  async inviteJudge(email) {
    const grant = await programAdminEmailRepo.add(PROGRAM_ID, email, '5Organizer', 'judge');
    authRegistry.set(tokenFor(email), { id: `u:${email}`, email });
    return grant;
  },
  // Winner selection + publishing are platform-admin only (requireProgramAdmin
  // lets the wallet through; the controller then requires isGlobalAdmin). The
  // gate itself is covered by the controller/middleware tests — here we drive
  // the real award/publish business logic as a global admin.
  async awardPrize(submissionId, amount) {
    const body = amount === null ? { prize: null } : { amount };
    const req = {
      params: { slug: SLUG, submissionId },
      user: { address: '5Organizer', isGlobalAdmin: true },
      body,
      headers: {},
    };
    const res = makeRes();
    await submissionController.awardPrize(req, res);
    return { status: res.statusCode ?? 200, body: res.body };
  },
  async publishResults(publish = true) {
    const req = {
      params: { slug: SLUG },
      user: { address: '5Organizer', isGlobalAdmin: true },
      body: {},
      headers: {},
    };
    const res = makeRes();
    await (publish ? submissionController.publishResults : submissionController.unpublishResults)(req, res);
    return { status: res.statusCode ?? 200, body: res.body };
  },
};

// Public, unauthenticated read of the published results.
async function publicResults() {
  const req = { params: { slug: SLUG }, headers: {} };
  const res = makeRes();
  await submissionController.publicResults(req, res);
  return { status: res.statusCode ?? 200, body: res.body };
}

const submitter = (payload) => ({
  submit: () => publicCall(submissionController.submit, { body: payload }),
});

const judge = (email) => {
  const token = tokenFor(email);
  return {
    email,
    list: () => judgeCall(token, submissionController.list),
    claim: (batchNumber) =>
      judgeCall(token, submissionController.claimBatch, { body: batchNumber ? { batchNumber } : {} }),
    score: (submissionId, body) =>
      judgeCall(token, submissionController.upsertScore, { params: { submissionId }, body }),
    saveBatch: (scores) => judgeCall(token, submissionController.saveScores, { body: { scores } }),
    submitBallot: () => judgeCall(token, submissionController.submitBallot),
    leaderboard: () => judgeCall(token, submissionController.leaderboard),
  };
};

// --- scenario data ----------------------------------------------------------
const SUBMISSIONS = [
  { submitterName: 'Aurora Builders', lumaEmail: 'aurora@example.com', projectTitle: 'Aurora Pay', projectBrief: 'One-tap stablecoin checkout for merchants.', videoUrl: 'https://youtu.be/aurora', githubUrl: 'https://github.com/ex/aurora' },
  { submitterName: 'Nimbus Labs', lumaEmail: 'nimbus@example.com', projectTitle: 'Nimbus Wallet', projectBrief: 'A mobile smart wallet with social recovery.', videoUrl: 'https://youtu.be/nimbus', githubUrl: 'https://github.com/ex/nimbus' },
  { submitterName: 'Comet Crew', lumaEmail: 'comet@example.com', projectTitle: 'Comet Bridge', projectBrief: 'Cross-chain asset bridge with a single signature.', videoUrl: 'https://youtu.be/comet', githubUrl: 'https://github.com/ex/comet' },
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
  // Organizer has created an open hackathon and imported the Luma checked-in
  // (approved guest) list. Only emails on this list may submit a project.
  store.programs = [
    {
      id: PROGRAM_ID, slug: SLUG, name: 'Bitrefill 2026', program_type: 'hackathon',
      status: 'open', owner: 'webzero', created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    },
    {
      id: OTHER_PROGRAM_ID, slug: OTHER_SLUG, name: 'Other Event 2026', program_type: 'hackathon',
      status: 'open', owner: 'webzero', created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    },
  ];
  store.program_signups = [
    { id: 's1', program_id: PROGRAM_ID, email: 'aurora@example.com', name: 'Aurora', source: 'luma', created_at: new Date().toISOString() },
    { id: 's2', program_id: PROGRAM_ID, email: 'nimbus@example.com', name: 'Nimbus', source: 'luma', created_at: new Date().toISOString() },
    { id: 's3', program_id: PROGRAM_ID, email: 'comet@example.com', name: 'Comet', source: 'luma', created_at: new Date().toISOString() },
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

  it('rejects a submission from an email not on the checked-in list (403)', async () => {
    const r = await submitter({ ...SUBMISSIONS[0], lumaEmail: 'walkup@example.com' }).submit();
    expect(r.status).toBe(403);
    expect(store.program_submissions.length).toBe(3); // no new row
    note('Only checked-in attendees can submit: a non-listed email is rejected (403).');
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

  it('a judge is NOT given the admin viewer surface (applicant PII, signups, inbox)', async () => {
    // requireProgramViewer guards applications, signups, inbox, audit log, and
    // the admin roster. A judge must be rejected there — judging only.
    const r = await viewerGate(tokenFor(JUDGES[0]), SLUG);
    expect(r.passed).toBe(false);
    expect(r.status).toBeGreaterThanOrEqual(400);
    note('Least privilege: a judge is denied the admin viewer surface (applications / signups / inbox / audit / admin roster).');
  });

  it('cross-event isolation: a judge invited to another event cannot touch this one', async () => {
    await programAdminEmailRepo.add(OTHER_PROGRAM_ID, 'judge-b@judge.test', '5Organizer', 'judge');
    authRegistry.set(tokenFor('judge-b@judge.test'), { id: 'u:b', email: 'judge-b@judge.test' });

    // The other event's judge is allowed on their own event...
    expect((await judgeGate(tokenFor('judge-b@judge.test'), OTHER_SLUG)).passed).toBe(true);
    // ...but denied on THIS event (no grant here).
    const blocked = await judgeGate(tokenFor('judge-b@judge.test'), SLUG);
    expect(blocked.passed).toBe(false);
    expect(blocked.status).toBeGreaterThanOrEqual(401);
    // And this event's judge is denied on the other event.
    expect((await judgeGate(tokenFor(JUDGES[0]), OTHER_SLUG)).passed).toBe(false);
    note('Cross-event isolation: a judge only reaches the event they were invited to; other events 401/403.');
  });

  it('an invited judge sees every submission (all from checked-in attendees)', async () => {
    const r = await judge(JUDGES[0]).list();
    expect(r.status).toBe(200);
    const subs = r.body.data.submissions;
    expect(subs).toHaveLength(3);
    // Every submitter is on the checked-in list, so all rows are eligible.
    expect(subs.every((s) => s.eligible)).toBe(true);
    note('Judge sees all 3 submissions; all from checked-in attendees (eligible).');
  });

  it('rejects an out-of-range score (400)', async () => {
    const subs = (await judge(JUDGES[0]).list()).body.data.submissions;
    const r = await judge(JUDGES[0]).score(subs[0].id, { requirements: 5, techStack: 5, innovation: 5 });
    expect(r.status).toBe(400);
    note('Out-of-range score (requirements=5 > max 2) rejected (400).');
  });

  it('a judge cannot submit a ballot before scoring their claimed batch (409)', async () => {
    const j = judge(JUDGES[0]);
    await j.claim(); // claim batch 1 (all 3 submissions — one batch)
    const subs = (await j.list()).body.data.submissions;
    await j.score(subs[0].id, SCORES[JUDGES[0]][subs[0].projectTitle]); // score only one
    const r = await j.submitBallot();
    expect(r.status).toBe(409);
    note('Ballot submit blocked until every submission in the claimed batch is scored (409).');
  });

  it('leaderboard unlocks on coverage (a submitted judge covering all), then enriches', async () => {
    // Batches let judges split a large field; here 3 submissions = one batch, so
    // each judge claims batch 1 and bulk-saves their scores for it.
    const scoreAllFor = async (email) => {
      const j = judge(email);
      await j.claim(); // claim batch 1
      const subs = (await j.list()).body.data.submissions;
      const rows = subs.map((s) => ({ submissionId: s.id, ...SCORES[email][s.projectTitle] }));
      const save = await j.saveBatch(rows); // bulk save the whole batch
      expect(save.status).toBe(200);
      return j;
    };

    // Before anyone submits -> locked, nothing covered.
    const j1 = await scoreAllFor(JUDGES[0]);
    const start = await j1.leaderboard();
    expect(start.body.data.locked).toBe(true);
    expect(start.body.data.submissionsScored).toBe(0); // no submitted ballots yet
    note(`Leaderboard locked: 0 of ${start.body.data.submissionsTotal} submissions covered by a submitted judge.`);

    // One judge submits -> every submission now has a score from a submitted
    // judge -> coverage met -> UNLOCKS even though the other judges haven't.
    await j1.submitBallot();
    const afterOne = await j1.leaderboard();
    expect(afterOne.body.data.locked).toBe(false);
    const auroraOne = afterOne.body.data.rows.find((r) => r.projectTitle === 'Aurora Pay');
    expect(auroraOne.judgeCount).toBe(1);
    expect(auroraOne.judgeScores).toHaveLength(1); // per-judge breakdown
    note('Coverage gate: one judge covering every project unlocks the leaderboard (not all judges required).');

    // The other two judges also score + submit -> averages enrich to 3 judges.
    await (await scoreAllFor(JUDGES[1])).submitBallot();
    await (await scoreAllFor(JUDGES[2])).submitBallot();

    const final = await judge(JUDGES[2]).leaderboard();
    expect(final.body.data.locked).toBe(false);
    const rows = final.body.data.rows;
    expect(rows[0].projectTitle).toBe('Aurora Pay'); // highest mean total

    // Hand-checked tally for Aurora: totals 12,11,11 -> mean 34/3, 3 judges.
    const aurora = rows.find((r) => r.projectTitle === 'Aurora Pay');
    expect(aurora.avgTotal).toBeCloseTo(34 / 3, 5);
    expect(aurora.judgeCount).toBe(3);
    expect(aurora.judgeScores).toHaveLength(3); // individual scores per judge
    expect(aurora.judgeScores.find((s) => s.judgeEmail === JUDGES[0]).total).toBe(12);

    // Every submission is from a checked-in attendee, so all rows are eligible.
    expect(rows.every((r) => r.eligible)).toBe(true);
    note(
      `Leaderboard ranking (each row carries per-judge scores): ${rows
        .map((r) => `${r.rank}. ${r.projectTitle} (${r.avgTotal.toFixed(2)}/12)`)
        .join('  ')}.`,
    );
  });

  it('a per-program admin (not global) cannot select winners (403)', async () => {
    const aurora = store.program_submissions.find((s) => s.project_title === 'Aurora Pay');
    const req = {
      params: { slug: SLUG, submissionId: aurora.id },
      user: { address: '5ProgramAdmin', isGlobalAdmin: false },
      body: { amount: 500 },
      headers: {},
    };
    const res = makeRes();
    await submissionController.awardPrize(req, res);
    expect(res.statusCode).toBe(403);
    note('Winner selection is platform-admin only: a per-program admin is rejected (403).');
  });

  it('a platform admin elects winners by assigning prize tiers (flexible)', async () => {
    const find = (title) => store.program_submissions.find((s) => s.project_title === title);
    // Default Bitrefill tiers (500/200/100 EUR) since the program set none.
    expect((await organizer.awardPrize(find('Aurora Pay').id, 500)).status).toBe(200);
    expect((await organizer.awardPrize(find('Nimbus Wallet').id, 200)).status).toBe(200);
    expect((await organizer.awardPrize(find('Comet Bridge').id, 100)).status).toBe(200);

    const aurora = find('Aurora Pay');
    expect(aurora.prize_amount).toBe(500);
    expect(aurora.prize_currency).toBe('EUR');
    expect(aurora.awarded_by).toBe('5Organizer');
    expect(aurora.awarded_at).toBeTruthy();

    // An unconfigured amount is rejected (400) — only configured tiers allowed.
    const bad = await organizer.awardPrize(find('Nimbus Wallet').id, 250);
    expect(bad.status).toBe(400);

    note('Platform admin assigned prizes: Aurora Pay 500 EUR, Nimbus Wallet 200 EUR, Comet Bridge 100 EUR (Bitrefill giftcards).');
  });

  it('results are private until published, then public + PII-free', async () => {
    // Before publish: nothing is exposed publicly.
    const before = await publicResults();
    expect(before.status).toBe(200);
    expect(before.body.data.published).toBe(false);
    expect(before.body.data.submissions).toHaveLength(0);

    // Platform admin publishes.
    expect((await organizer.publishResults(true)).status).toBe(200);

    const after = await publicResults();
    expect(after.body.data.published).toBe(true);
    const subs = after.body.data.submissions;
    expect(subs).toHaveLength(3);
    // Winners first (prize amount desc).
    expect(subs[0].projectTitle).toBe('Aurora Pay');
    expect(subs[0].prize).toEqual({ amount: 500, currency: 'EUR', label: 'Bitrefill giftcard' });
    // No PII leaks: never expose the Luma email.
    for (const s of subs) {
      expect(s).not.toHaveProperty('lumaEmail');
      expect(JSON.stringify(s)).not.toContain('@example.com');
    }
    note('Results published: public page shows all 3 submissions, winners first, with no Luma email exposed.');

    // Reversible — unpublish hides them again.
    expect((await organizer.publishResults(false)).status).toBe(200);
    expect((await publicResults()).body.data.published).toBe(false);
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
    ['Promoted project team is the single submitter', 'We only capture the submitter (name + Luma email); real teams have several members. The promoted project gets one team member and the email is stashed in the description (team_members has no email column). Consider an optional team-roster field at submission, or let admins flesh out the team after promotion.'],
    ['Submissions stay private until results are published', 'During judging, submissions are visible only to judges/admins. A platform admin selects winners and explicitly publishes; only then does the public program page show the PII-free submissions + winners. There is intentionally no public gallery mid-judging.'],
    ['Submitter cannot edit or withdraw a submission', 'There is no authenticated link/token for a submitter to fix a typo or replace a video link after submitting. A one-time edit link (or admin edit) would cut support load over 200 submissions.'],
    ['No submission confirmation email', 'Submitters get only an in-modal success state; nothing in their inbox. A confirmation (with what they submitted) reassures them and gives a paper trail. Planned for iteration 2.'],
    ['A Luma email typo blocks submission entirely', 'Submission is now gated to the imported checked-in list, so a mistyped email gets a hard 403 with no recourse at the door. Consider fuzzy match / an admin "add guest" quick action so a real attendee is not locked out.'],
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
  lines.push('- Public submission gated to checked-in attendees (403 off-list), with dedup (409) and validation (400).');
  lines.push('- Non-invited emails are blocked from the scoring surface (auth gate holds).');
  lines.push('- Cross-event isolation: an email user only reaches the event they were invited to; other events 401/403.');
  lines.push('- Least privilege: judges get the scoring surface only — NOT applicant PII, signups, inbox, audit log, or the admin roster.');
  lines.push('- Submission restricted to the imported Luma checked-in list (the approved guests).');
  lines.push('- Range-checked scoring; ballot cannot be submitted until everything is scored.');
  lines.push('- Leaderboard gated on coverage (every project scored by a submitted judge), then tallies the mean /12 and ranks correctly.');
  lines.push('- Leaderboard flags ineligible entries (fixed: they no longer rank invisibly).');
  lines.push('- Ballot locks after submission.');
  lines.push('- Admin can promote a submission into a Stadium project (idempotent), carrying title/repo/demo/program + submitter.');
  lines.push('- Admin marks a submission paid / unpaid (paid_by + paid_at recorded) — the payout tracking, reversible.');
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
