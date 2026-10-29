/**
 * Free Society Hack (tracked program) judging simulation.
 *
 * Drives the REAL controllers and requireProgramJudge against the in-memory
 * Supabase fake: an organizer invites judges with a name and tracks, builders
 * who checked in on Luma submit tracked entries (before and after the 20:00
 * IST cut-off), and judges autosave rubric scores. Checks what lands in the
 * database: submission details and batches, judge profiles, and per-judge
 * scores (partial, cleared criteria, checks, revisit), plus the guards.
 *
 * Run: cd server && npx vitest run sim/__tests__/rubric-judging-journey.test.js
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

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
vi.mock('@talismn/siws', () => ({ verifySIWS: vi.fn(), parseMessage: vi.fn(), SiwsMessage: vi.fn() }));
vi.mock('@polkadot/util-crypto', () => ({
  cryptoWaitReady: vi.fn().mockResolvedValue(true),
  signatureVerify: vi.fn(),
  decodeAddress: vi.fn(),
}));
vi.mock('@polkadot/util', () => ({ u8aToHex: vi.fn() }));
// Emails are best-effort; keep the run offline.
vi.mock('../../api/services/submission-confirmation.service.js', () => ({ default: { send: vi.fn(async () => ({ ok: true })) } }));
vi.mock('../../api/services/program-admin-invite.service.js', () => ({ default: { send: vi.fn(async () => ({ ok: true })) } }));

const submissionController = (await import('../../api/controllers/submission.controller.js')).default;
const programController = (await import('../../api/controllers/program.controller.js')).default;
const { requireProgramJudge } = await import('../../api/middleware/auth.middleware.js');
const { store, authRegistry } = await import('../simState.js');

const SLUG = 'free-society-hack-2026';
const PROGRAM_ID = 'fsh';
const TX1 = 'a1'.repeat(32);

const makeRes = () => {
  const res = { statusCode: null, body: null };
  res.status = (c) => ((res.statusCode = c), res);
  res.json = (d) => ((res.body = d), res);
  res.end = () => res;
  return res;
};
const call = async (fn, req) => {
  const res = makeRes();
  await fn({ headers: {}, ...req, params: { slug: SLUG, ...(req.params || {}) } }, res);
  return { status: res.statusCode ?? 200, body: res.body };
};
const tokenFor = (email) => `tok:${email}`;
async function asJudge(email, fn, { params = {}, body = {} } = {}) {
  const req = { params: { slug: SLUG, ...params }, body, headers: { 'x-supabase-token': tokenFor(email) } };
  const res = makeRes();
  let passed = false;
  await requireProgramJudge('slug')(req, res, () => {
    passed = true;
  });
  if (!passed) return { status: res.statusCode, body: res.body, denied: true };
  await fn(req, res);
  return { status: res.statusCode ?? 200, body: res.body };
}
const at = (iso) => vi.setSystemTime(new Date(iso));

const details = (over = {}) => ({
  privacyNote: 'Amounts and memos are shielded; our server stores order ids next to emails.', bitrefillFeedback: { worked: 'The MCP was quick to set up.', didnt: 'Test products were hard to find.' }, track: 'privacy',
  themes: ['1. Private payment rails'],
  pitch: 'Shielded ZEC checkout.',
  team: [{ name: 'Arjun', role: 'frontend' }],
  appType: 'web app',
  publicUrl: 'https://chai.example.com',
  technologies: ['WebZjs'],
  testnetTxid: TX1,
  nextStep: 'Pilot by 4 Dec.',
  nextStepLinks: [],
  frictionAreas: ['Faucet'],
  frictionNotes: 'Faucet was down.',
  anonymous: false,
  ...over,
});
const submit = (email, title, d, token = null) =>
  call(submissionController.submit, {
    headers: token ? { 'x-supabase-token': token } : {},
    body: {
      submitterName: title + ' builder',
      lumaEmail: email,
      projectTitle: title,
      projectBrief: 'What it does.',
      videoUrl: 'https://youtu.be/demo',
      githubUrl: 'https://github.com/x/' + title.toLowerCase().replace(/\W+/g, '-'),
      details: d,
    },
  });

beforeAll(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  at('2026-11-04T09:00:00+05:30');
  store.programs = [
    {
      id: PROGRAM_ID, slug: SLUG, name: 'Free Society Hack', program_type: 'hackathon', status: 'open', owner: 'webzero',
      event_ends_at: '2026-11-05T00:00:00+05:30', created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    },
  ];
  // The imported Luma checked-in list: only these can submit.
  store.program_signups = [
    { id: 'g1', program_id: PROGRAM_ID, email: 'priya@example.com', name: 'Priya', source: 'luma', created_at: new Date().toISOString() },
    { id: 'g2', program_id: PROGRAM_ID, email: 'karan@example.com', name: 'Karan', source: 'luma', created_at: new Date().toISOString() },
  ];
});
afterAll(() => vi.useRealTimers());

let chai;
let tab;

describe('Free Society Hack judging — data that lands in the database', () => {
  it('organizer invites judges with a name and tracks (profile saved)', async () => {
    for (const [email, name, tracks] of [
      ['Judge-A@Example.com', 'Judge A', ['privacy']],
      ['judge-b@example.com', 'Judge B', ['privacy']],
      ['bitrefill-1@example.com', 'Bitrefill Judge 1', ['agentic']],
    ]) {
      const r = await call(programController.inviteAdminEmail, { body: { email, role: 'judge', name, tracks }, user: { address: '5Organizer' } });
      expect(r.status).toBe(201);
      authRegistry.set(tokenFor(email.toLowerCase()), { id: `u:${email}`, email: email.toLowerCase() });
    }
    const rows = store.program_admin_emails.filter((r) => r.program_id === PROGRAM_ID);
    expect(rows.map((r) => [r.email, r.role, r.name, r.tracks])).toEqual([
      ['judge-a@example.com', 'judge', 'Judge A', ['privacy']],
      ['judge-b@example.com', 'judge', 'Judge B', ['privacy']],
      ['bitrefill-1@example.com', 'judge', 'Bitrefill Judge 1', ['agentic']],
    ]);
  });

  it('Luma-checked-in builders submit; each lands in its batch by time (20:00 IST cut-off)', async () => {
    at('2026-11-04T19:30:00+05:30');
    const a = await submit('priya@example.com', 'Chai Ledger', details());
    expect(a.status).toBe(201);
    at('2026-11-04T20:30:00+05:30');
    const b = await submit('karan@example.com', 'Tab Settler', details({ track: 'agentic', themes: [], testnetTxid: null }));
    expect(b.status).toBe(201);
    // Not on the Luma list: refused, nothing stored.
    const c = await submit('stranger@example.com', 'Nope', details());
    expect(c.status).toBe(403);
    // Bad payload: refused with the reason.
    const d = await submit('priya@example.com', 'Chai Ledger', details({ testnetTxid: 'MOCK-1' }));
    expect(d.status).toBe(400);

    expect(store.program_submissions).toHaveLength(2);
    chai = store.program_submissions.find((s) => s.project_title === 'Chai Ledger');
    tab = store.program_submissions.find((s) => s.project_title === 'Tab Settler');
    expect(chai.track).toBe('privacy');
    expect(chai.details).toMatchObject({ testnetTxid: TX1, team: [{ name: 'Arjun', email: null, role: 'frontend' }], network: 'testnet (NU7)' });
    expect(tab.track).toBe('agentic');

    const list = await asJudge('judge-a@example.com', submissionController.listTracked);
    expect(list.status).toBe(200);
    const byTitle = Object.fromEntries(list.body.data.submissions.map((s) => [s.projectTitle, s.batch]));
    expect(byTitle).toEqual({ 'Chai Ledger': 'evening', 'Tab Settler': 'morning' });
  });

  it('updating needs the email verified; a verified resubmit after 20:00 keeps the evening batch', async () => {
    at('2026-11-04T21:15:00+05:30');
    // Someone who only knows Priya's email can't overwrite her entry.
    const impostor = await submit('priya@example.com', 'Chai Ledger', details({ pitch: 'Hijacked.' }));
    expect(impostor.status).toBe(401);
    expect(impostor.body.code).toBe('verify_to_update');
    // Priya verifies her email (magic link) and updates.
    authRegistry.set(tokenFor('priya@example.com'), { id: 'u:priya', email: 'priya@example.com' });
    const r = await submit('priya@example.com', 'Chai Ledger', details({ pitch: 'Updated pitch.' }), tokenFor('priya@example.com'));
    expect(r.status).toBe(200);
    const list = await asJudge('judge-a@example.com', submissionController.listTracked);
    const chaiNow = list.body.data.submissions.find((s) => s.projectTitle === 'Chai Ledger');
    expect(chaiNow.batch).toBe('evening');
    expect(chaiNow.details.pitch).toBe('Updated pitch.');
  });

  it('a judge sees the judges by name, with only their own email', async () => {
    const r = await asJudge('judge-a@example.com', submissionController.listJudges);
    expect(r.body.data).toEqual([
      { name: 'Judge A', tracks: ['privacy'], email: 'judge-a@example.com' },
      { name: 'Judge B', tracks: ['privacy'], email: null },
      { name: 'Bitrefill Judge 1', tracks: ['agentic'], email: null },
    ]);
  });

  it('judge scores autosave to their own record: partial, full, then a criterion cleared', async () => {
    const put = (body, track = 'privacy', id = chai.id) =>
      asJudge('judge-a@example.com', submissionController.upsertRubricScore, { params: { submissionId: id, track }, body });
    expect((await put({ criteria: { works: 3 }, checks: { video: true }, session: 'evening' })).status).toBe(200);
    expect((await put({ criteria: { works: 3, private: 2, easy: 2, needed: 3, continuing: 3, bonus: 1 }, checks: { video: true, repo: true, tx: true }, session: 'evening' })).status).toBe(200);
    expect((await put({ criteria: { works: null, private: 2, easy: 2, needed: 3, continuing: 3, bonus: 1 }, checks: { video: true, repo: true, tx: true }, revisit: true, session: 'evening', notes: 'Recheck the demo.' })).status).toBe(200);

    const rows = store.submission_rubric_scores.filter((r) => r.submission_id === chai.id);
    expect(rows).toHaveLength(1); // one row per (submission, judge, track), updated in place
    expect(rows[0]).toMatchObject({
      program_id: PROGRAM_ID,
      judge_email: 'judge-a@example.com',
      track: 'privacy',
      criteria: { works: null, private: 2, easy: 2, needed: 3, continuing: 3, bonus: 1 },
      checks: { video: true, repo: true, tx: true },
      revisit: true,
      notes: 'Recheck the demo.',
      session: 'evening',
    });
  });

  it('guards: wrong track, spoofed identity, another judge sees none of it', async () => {
    const wrong = await asJudge('judge-a@example.com', submissionController.upsertRubricScore, {
      params: { submissionId: tab.id, track: 'agentic' },
      body: { criteria: { innovation: 3 } },
    });
    expect(wrong.status).toBe(403);

    const spoof = await asJudge('judge-b@example.com', submissionController.upsertRubricScore, {
      params: { submissionId: chai.id, track: 'privacy' },
      body: { criteria: { works: 1 }, judgeEmail: 'judge-a@example.com' },
    });
    expect(spoof.status).toBe(200);
    expect(store.submission_rubric_scores.filter((r) => r.submission_id === chai.id).map((r) => r.judge_email).sort()).toEqual([
      'judge-a@example.com',
      'judge-b@example.com',
    ]);
    // Judge A's row is untouched by Judge B.
    expect(store.submission_rubric_scores.find((r) => r.judge_email === 'judge-a@example.com').criteria.works).toBeNull();

    const mineA = await asJudge('judge-a@example.com', submissionController.listMyRubricScores);
    const mineB = await asJudge('judge-b@example.com', submissionController.listMyRubricScores);
    expect(mineA.body.data.map((s) => s.judgeEmail)).toEqual(['judge-a@example.com']);
    expect(mineB.body.data.map((s) => s.judgeEmail)).toEqual(['judge-b@example.com']);

    const agentic = await asJudge('bitrefill-1@example.com', submissionController.upsertRubricScore, {
      params: { submissionId: tab.id, track: 'agentic' },
      body: { criteria: { requirements: 2, techStack: 4, innovation: 5 } },
    });
    expect(agentic.status).toBe(200);
  });

  it('refused submissions are kept with the reason; a master admin accepts one into its original batch', async () => {
    // The two refusals from earlier were recorded with the reason shown.
    const reasons = store.submission_refusals.map((r) => [r.luma_email, r.reason_code, r.reason]);
    expect(reasons).toEqual([
      ['stranger@example.com', 'not_checked_in', 'Only checked-in attendees can submit. Use the email you checked in with on Luma.'],
      ['priya@example.com', 'invalid', 'A testnet transaction id is 64 hex characters'],
      ['priya@example.com', 'update_unverified', 'Verify your email to update your submission.'],
    ]);
    expect(store.program_audit_log.filter((a) => a.action === 'submission.refused')).toHaveLength(3);

    // 19:50 IST: a builder who checked in under another email is refused.
    at('2026-11-04T19:50:00+05:30');
    const refused = await submit('sid.other@example.com', 'Memo Mailbox', details());
    expect(refused.status).toBe(403);
    const row = store.submission_refusals.find((r) => r.luma_email === 'sid.other@example.com');
    expect(row).toMatchObject({ status: 'refused', reason_code: 'not_checked_in' });

    // A program (non-master) admin can't accept it.
    const asProgramAdmin = await call(submissionController.acceptRefusal, {
      params: { refusalId: row.id },
      user: { address: '5ProgAdmin', isGlobalAdmin: false, programId: PROGRAM_ID },
    });
    expect(asProgramAdmin.status).toBe(403);

    // 21:30 IST: the master admin accepts it.
    at('2026-11-04T21:30:00+05:30');
    const ok = await call(submissionController.acceptRefusal, {
      params: { refusalId: row.id },
      user: { address: '5Master', chain: 'substrate', isGlobalAdmin: true, programSlug: SLUG },
    });
    expect(ok.status).toBe(200);
    expect(row).toMatchObject({ status: 'accepted', reviewed_by: '5Master', accepted_submission_id: ok.body.data.submission.id });
    expect(store.program_audit_log.some((a) => a.action === 'submission.refusal_accepted')).toBe(true);

    // It keeps the 19:50 time, so it's in the Evening batch, and judges can score it.
    const list = await asJudge('judge-a@example.com', submissionController.listTracked);
    const memo = list.body.data.submissions.find((s) => s.projectTitle === 'Memo Mailbox');
    expect(memo).toMatchObject({ batch: 'evening', acceptedFromRefusalId: row.id, track: 'privacy' });
    const scored = await asJudge('judge-a@example.com', submissionController.upsertRubricScore, {
      params: { submissionId: memo.id, track: 'privacy' },
      body: { criteria: { works: 2 } },
    });
    expect(scored.status).toBe(200);

    // Accepting twice is refused; the record stays.
    const again = await call(submissionController.acceptRefusal, {
      params: { refusalId: row.id },
      user: { address: '5Master', isGlobalAdmin: true, programSlug: SLUG },
    });
    expect(again.status).toBe(409);
  });

  it('a walk-in verifies their email but is not on Luma: held for approval, then accepted', async () => {
    at('2026-11-04T19:40:00+05:30');
    authRegistry.set(tokenFor('walkin@example.com'), { id: 'u:walkin', email: 'walkin@example.com' });
    const held = await submit('walkin@example.com', 'Walk-in Wallet', details({ testnetTxid: 'c3'.repeat(32) }), tokenFor('walkin@example.com'));
    expect(held.status).toBe(202);
    expect(held.body).toMatchObject({ status: 'pending', code: 'pending_review' });
    const row = store.submission_refusals.find((r) => r.luma_email === 'walkin@example.com');
    expect(row).toMatchObject({ email_verified: true, reason_code: 'not_checked_in', status: 'refused' });
    expect(store.program_submissions.some((s) => s.luma_email === 'walkin@example.com')).toBe(false);

    at('2026-11-04T22:00:00+05:30');
    const ok = await call(submissionController.acceptRefusal, {
      params: { refusalId: row.id },
      user: { address: '5Master', isGlobalAdmin: true, programSlug: SLUG },
    });
    expect(ok.status).toBe(200);
    const list = await asJudge('judge-a@example.com', submissionController.listTracked);
    expect(list.body.data.submissions.find((s) => s.projectTitle === 'Walk-in Wallet').batch).toBe('evening');
  });

  it('the public live list shows every entry with no emails', async () => {
    const r = await call(submissionController.publicSubmissions, {});
    expect(r.status).toBe(200);
    const titles = r.body.data.submissions.map((s) => s.projectTitle).sort();
    expect(titles).toEqual(['Chai Ledger', 'Memo Mailbox', 'Tab Settler', 'Walk-in Wallet']);
    expect(JSON.stringify(r.body)).not.toMatch(/@example\.com/);
  });

  it('someone not invited cannot read or score', async () => {
    authRegistry.set(tokenFor('nobody@example.com'), { id: 'u:nobody', email: 'nobody@example.com' });
    const r = await asJudge('nobody@example.com', submissionController.upsertRubricScore, {
      params: { submissionId: chai.id, track: 'privacy' },
      body: { criteria: { works: 3 } },
    });
    expect(r.denied).toBe(true);
  });
});
