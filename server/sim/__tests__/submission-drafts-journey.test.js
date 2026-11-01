/**
 * Free Society Hack: a team's submission from first draft to the judges' queue.
 *
 * Drives the REAL controllers (submit, mine, feedback, editors, judge queue,
 * leaderboard, progress, rubric scores) against the in-memory Supabase fake:
 * the point person saves a draft on the server, comes back to it, gives a
 * checked-in teammate edit access, the teammate edits, the team submits the
 * event feedback, then finalizes; only then do the judges of each track see
 * it, with the last-edit stamp. A later update keeps it submitted.
 *
 * Run: cd server && npx vitest run sim/__tests__/submission-drafts-journey.test.js
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
vi.mock('../../api/services/submission-confirmation.service.js', () => ({ default: { send: vi.fn(async () => ({ ok: true })) } }));

const submissionController = (await import('../../api/controllers/submission.controller.js')).default;
const trackedResults = (await import('../../api/controllers/tracked-results.controller.js')).default;
const confirmation = (await import('../../api/services/submission-confirmation.service.js')).default;
const { requireProgramJudge } = await import('../../api/middleware/auth.middleware.js');
const { store, authRegistry } = await import('../simState.js');

const SLUG = 'free-society-hack-2026';
const PROGRAM_ID = 'fsh';
const TX1 = 'b2'.repeat(32);
const OWNER = 'priya@example.com';
const MATE = 'arjun@example.com';
const LATE_MATE = 'nisha@example.com';
const RATINGS = { overall: 5, organisation: 4, support: 4, tools: 3 };

const makeRes = () => {
  const res = { statusCode: null, body: null };
  res.status = (c) => ((res.statusCode = c), res);
  res.json = (d) => ((res.body = d), res);
  res.end = () => res;
  return res;
};
const tokenFor = (email) => `tok:${email}`;
const as = async (email, fn, { params = {}, body = {} } = {}) => {
  const res = makeRes();
  await fn({ params: { slug: SLUG, ...params }, body, headers: email ? { 'x-supabase-token': tokenFor(email) } : {} }, res);
  return { status: res.statusCode ?? 200, body: res.body };
};
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

const fullDetails = (over = {}) => ({
  track: 'both',
  themes: ['1. Private payment rails'],
  pitch: 'An agent that buys top-ups with shielded ZEC.',
  team: [
    { name: 'Arjun', email: MATE, role: 'backend' },
    { name: 'Nisha', email: LATE_MATE, role: 'design' },
  ],
  appType: 'agent',
  publicUrl: null,
  technologies: ['WebZjs', 'Bitrefill MCP'],
  testnetTxid: TX1,
  nextStep: 'Pilot with a Mumbai shop by 4 Dec.',
  nextStepLinks: [],
  frictionNotes: null,
  privacyNote: 'Amounts are shielded; our server stores order ids next to phone numbers.',
  bitrefillFeedback: { worked: 'MCP set up in minutes.', didnt: 'Jio plan names were hard to match.' },
  anonymous: false,
  ...over,
});
const base = {
  submitterName: 'Priya',
  lumaEmail: OWNER,
  projectTitle: 'Topup Agent',
  projectBrief: 'Buys mobile top-ups privately.',
  videoUrl: 'https://youtu.be/topup',
  githubUrl: 'https://github.com/priya/topup-agent',
  agreedToTerms: true,
};
const row = () => store.program_submissions.find((s) => s.luma_email === OWNER);
const queueFor = async (judge) => (await asJudge(judge, submissionController.listTracked)).body.data.submissions;

beforeAll(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  at('2026-11-04T12:00:00+05:30');
  store.programs = [
    {
      id: PROGRAM_ID, slug: SLUG, name: 'Free Society Hack', program_type: 'hackathon', status: 'open', owner: 'webzero',
      event_ends_at: '2026-11-05T00:00:00+05:30', created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      prize_tiers: [],
    },
  ];
  // The Luma checked-in list: Priya and Arjun. Nisha registered but never checked in.
  store.program_signups = [OWNER, MATE].map((email, i) => ({
    id: `g${i}`, program_id: PROGRAM_ID, email, name: email.split('@')[0], source: 'luma', created_at: new Date().toISOString(),
  }));
  store.program_admin_emails = [
    { program_id: PROGRAM_ID, email: 'zec-judge@example.com', role: 'judge', name: 'Zec Judge', tracks: ['privacy'], created_at: new Date().toISOString() },
    { program_id: PROGRAM_ID, email: 'bit-judge@example.com', role: 'judge', name: 'Bit Judge', tracks: ['agentic'], created_at: new Date().toISOString() },
  ];
  for (const e of [OWNER, MATE, LATE_MATE, 'zec-judge@example.com', 'bit-judge@example.com', 'stranger@example.com']) {
    authRegistry.set(tokenFor(e), { id: `u:${e}`, email: e });
  }
});
afterAll(() => vi.useRealTimers());

describe('Submission drafts: save on the server, come back, teammates, feedback, finalize', () => {
  it('a draft needs a verified email', async () => {
    const r = await as(null, submissionController.submit, { body: { ...base, intent: 'draft', details: { track: 'both' } } });
    expect(r.status).toBe(401);
    expect(store.program_submissions ?? []).toHaveLength(0);
  });

  it('the point person saves a partial draft: stored as a draft, no email, no ratings needed', async () => {
    const r = await as(OWNER, submissionController.submit, {
      body: { submitterName: 'Priya', lumaEmail: OWNER, projectTitle: 'Topup Agent', intent: 'draft', details: { track: 'both', pitch: 'Half an idea' } },
    });
    expect(r.status).toBe(201);
    expect(r.body.data.status).toBe('draft');
    const s = row();
    expect(s).toMatchObject({ status: 'draft', finalized_at: null, feedback_submitted_at: null, project_title: 'Topup Agent', track: 'both' });
    expect(s.details.pitch).toBe('Half an idea');
    expect(s).toMatchObject({ last_edited_by_email: OWNER, last_edited_by_name: 'Priya' });
    expect(confirmation.send).not.toHaveBeenCalled();
  });

  it('drafts are in no judge queue, leaderboard, progress or public list, and cannot be scored', async () => {
    expect(await queueFor('zec-judge@example.com')).toHaveLength(0);
    expect(await queueFor('bit-judge@example.com')).toHaveLength(0);
    const board = await asJudge('zec-judge@example.com', trackedResults.leaderboard, { params: { track: 'privacy' } });
    expect(board.body.data.rows).toHaveLength(0);
    const progress = await asJudge('zec-judge@example.com', trackedResults.judgingProgress);
    expect(progress.body.data.every((p) => p.total === 0)).toBe(true);
    const pub = await as(null, submissionController.publicSubmissions);
    expect(pub.body.data.submissions).toHaveLength(0);
    const score = await asJudge('zec-judge@example.com', submissionController.upsertRubricScore, {
      params: { submissionId: row().id, track: 'privacy' },
      body: { criteria: { works: 3 } },
    });
    expect(score.status).toBe(409);
  });

  it('the point person comes back later: the saved draft loads unchanged', async () => {
    at('2026-11-04T15:00:00+05:30');
    const r = await as(OWNER, submissionController.mySubmission);
    expect(r.status).toBe(200);
    expect(r.body.data).toMatchObject({ status: 'draft', role: 'owner', projectTitle: 'Topup Agent', editors: [], feedbackSubmittedAt: null });
    expect(r.body.data.details.pitch).toBe('Half an idea');
  });

  it('the point person fills more in and adds teammates to the team list', async () => {
    const r = await as(OWNER, submissionController.submit, { body: { ...base, intent: 'draft', details: fullDetails({ pitch: 'Top-ups with shielded ZEC' }) } });
    expect(r.status).toBe(200);
    expect(row().status).toBe('draft');
    expect(row().details.team.map((m) => m.email)).toEqual([MATE, LATE_MATE]);
  });

  it('edit access: only checked-in teammates on the team list, only by the point person', async () => {
    // Not checked in on Luma.
    const notIn = await as(OWNER, submissionController.addEditor, { body: { email: LATE_MATE } });
    expect(notIn.status).toBe(403);
    expect(notIn.body.code).toBe('not_checked_in');
    // Not on the team list.
    const notOnTeam = await as(OWNER, submissionController.addEditor, { body: { email: 'stranger@example.com' } });
    expect(notOnTeam.status).toBe(400);
    // Checked in and on the team: granted.
    const ok = await as(OWNER, submissionController.addEditor, { body: { email: MATE } });
    expect(ok.status).toBe(201);
    expect(ok.body.data.editors).toEqual([MATE]);
    // A teammate can't hand out access.
    const byMate = await as(MATE, submissionController.addEditor, { body: { email: LATE_MATE } });
    expect(byMate.status).toBe(403);
  });

  it('the teammate opens the same draft and saves an edit; the stamp names them', async () => {
    at('2026-11-04T17:10:00+05:30');
    const mine = await as(MATE, submissionController.mySubmission);
    expect(mine.status).toBe(200);
    expect(mine.body.data).toMatchObject({ role: 'editor', lumaEmail: OWNER, status: 'draft' });
    // The teammate can't move the entry to their own email or rename the point person.
    const r = await as(MATE, submissionController.submit, {
      body: { ...base, submitterName: 'Arjun', lumaEmail: MATE, intent: 'draft', details: fullDetails({ pitch: 'Edited by Arjun' }) },
    });
    expect(r.status).toBe(200);
    expect(store.program_submissions).toHaveLength(1);
    expect(row()).toMatchObject({ luma_email: OWNER, submitter_name: 'Priya', status: 'draft' });
    expect(row().details.pitch).toBe('Edited by Arjun');
    expect(row()).toMatchObject({ last_edited_by_email: MATE, last_edited_by_name: 'Arjun', last_edited_at: new Date('2026-11-04T17:10:00+05:30').toISOString() });
  });

  it('finalize is refused until the event feedback is submitted', async () => {
    const r = await as(OWNER, submissionController.submit, { body: { ...base, intent: 'finalize', details: fullDetails() } });
    expect(r.status).toBe(400);
    expect(r.body.code).toBe('feedback_required');
    expect(row().status).toBe('draft');
  });

  it('the team submits the feedback (once), then finalizes: fully submitted for judge review', async () => {
    const fb = await as(MATE, submissionController.submitFeedback, { body: { ratings: RATINGS, eventLiked: 'The mentors.' } });
    expect(fb.status).toBe(200);
    const stamped = row().feedback_submitted_at;
    expect(stamped).toBeTruthy();
    expect(store.submission_experience_ratings.filter((x) => x.submission_id === row().id)).toHaveLength(4);

    at('2026-11-04T19:45:00+05:30');
    const r = await as(OWNER, submissionController.submit, { body: { ...base, intent: 'finalize', details: fullDetails() } });
    expect(r.status).toBe(200);
    expect(r.body.data.status).toBe('submitted');
    expect(row()).toMatchObject({ status: 'submitted', finalized_at: new Date('2026-11-04T19:45:00+05:30').toISOString(), feedback_submitted_at: stamped });
    expect(confirmation.send).toHaveBeenCalledTimes(1);
  });

  it('now each track judge sees it, batched by finalize time, with the last edit', async () => {
    const zec = await queueFor('zec-judge@example.com');
    const bit = await queueFor('bit-judge@example.com');
    for (const q of [zec, bit]) {
      expect(q).toHaveLength(1);
      expect(q[0]).toMatchObject({ projectTitle: 'Topup Agent', status: 'submitted', batch: 'evening', lastEditedByName: 'Priya', lastEditedByEmail: OWNER });
    }
    const score = await asJudge('zec-judge@example.com', submissionController.upsertRubricScore, {
      params: { submissionId: row().id, track: 'privacy' },
      body: { criteria: { works: 3 } },
    });
    expect(score.status).toBe(200);
  });

  it('a later update keeps it submitted, never asks for feedback again, and moves the stamp', async () => {
    at('2026-11-04T23:30:00+05:30');
    const before = row().finalized_at;
    // Even a "draft" save of a finalized entry is a full save: it stays submitted.
    const r = await as(MATE, submissionController.submit, { body: { ...base, intent: 'draft', details: fullDetails({ pitch: 'Final pitch' }) } });
    expect(r.status).toBe(200);
    expect(row()).toMatchObject({ status: 'submitted', finalized_at: before, last_edited_by_name: 'Arjun' });
    expect(row().details.pitch).toBe('Final pitch');
    // ...and is fully validated: it can't drop a required field.
    const bad = await as(MATE, submissionController.submit, { body: { ...base, intent: 'draft', details: fullDetails({ privacyNote: '' }) } });
    expect(bad.status).toBe(400);
    expect(row().details.privacyNote).toBeTruthy();
  });

  it('the deadline: saves at 23:59:59 IST pass; at 00:00 IST builders are refused, judges still score', async () => {
    at('2026-11-04T23:59:59+05:30');
    const before = await as(MATE, submissionController.submit, { body: { ...base, details: fullDetails({ pitch: 'Last second' }) } });
    expect(before.status).toBe(200);
    expect(row().details.pitch).toBe('Last second');

    at('2026-11-05T00:00:00+05:30'); // 2026-11-04T18:30:00Z
    const after = await as(OWNER, submissionController.submit, { body: { ...base, details: fullDetails({ pitch: 'Too late' }) } });
    expect(after.status).toBe(403);
    expect(after.body.code).toBe('submissions_closed');
    expect(row().details.pitch).toBe('Last second');
    // Drafts, new entries, feedback and edit access are closed too.
    const draft = await as(OWNER, submissionController.submit, { body: { ...base, intent: 'draft', details: fullDetails() } });
    expect(draft.status).toBe(403);
    const fresh = await as(MATE, submissionController.submit, { body: { ...base, lumaEmail: MATE, intent: 'draft' } });
    expect(fresh.status).toBe(403);
    const fb = await as(OWNER, submissionController.submitFeedback, { body: { ratings: RATINGS } });
    expect(fb.status).toBe(403);
    const ed = await as(OWNER, submissionController.removeEditor, { params: { email: MATE } });
    expect(ed.status).toBe(403);
    // The team can still read it; judges still score and re-score.
    expect((await as(OWNER, submissionController.mySubmission)).status).toBe(200);
    for (const works of [2, 3]) {
      const score = await asJudge('zec-judge@example.com', submissionController.upsertRubricScore, {
        params: { submissionId: row().id, track: 'privacy' },
        body: { criteria: { works } },
      });
      expect(score.status).toBe(200);
    }
    at('2026-11-04T23:40:00+05:30');
  });

  it('taking a teammate off the team list removes their edit access', async () => {
    const r = await as(OWNER, submissionController.submit, {
      body: { ...base, details: fullDetails({ team: [{ name: 'Nisha', email: LATE_MATE, role: 'design' }] }) },
    });
    expect(r.status).toBe(200);
    expect(store.submission_editors.filter((e) => e.submission_id === row().id)).toHaveLength(0);
    const mine = await as(MATE, submissionController.mySubmission);
    expect(mine.status).toBe(404);
  });
});
