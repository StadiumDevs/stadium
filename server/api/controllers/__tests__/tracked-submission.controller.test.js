import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../repositories/submission-experience-rating.repository.js', () => ({
  default: { getForSubmission: vi.fn(async () => ({})), upsertForSubmission: vi.fn(async () => []), aggregateByProgram: vi.fn(async () => ({})) },
}));
vi.mock('../../auth/supabaseUser.js', () => ({
  getSupabaseUser: vi.fn(async (token) => (token && token.startsWith('tok:') ? { id: 'u', email: token.slice(4) } : null)),
  extractSupabaseToken: (req) => req.headers?.['x-supabase-token'] ?? null,
}));
vi.mock('../../repositories/submission-refusal.repository.js', () => ({
  default: { create: vi.fn(async () => ({ id: 'ref-1' })), listByProgram: vi.fn(), findById: vi.fn(), setReviewed: vi.fn() },
}));
vi.mock('../../services/program.service.js', () => ({ default: { findBySlug: vi.fn() } }));
vi.mock('../../services/scoring.service.js', () => ({
  default: {
    listForJudge: vi.fn(),
    submitBallot: vi.fn(),
    leaderboard: vi.fn(),
    promoteToProject: vi.fn(),
    isJudgingComplete: vi.fn(),
    publicResults: vi.fn(),
    claimBatch: vi.fn(),
  },
}));
vi.mock('../../repositories/program.repository.js', () => ({
  default: { setResultsPublished: vi.fn() },
}));
vi.mock('../../repositories/submission-editor.repository.js', () => ({
  default: { findByProgramEmail: vi.fn(async () => null), listBySubmission: vi.fn(async () => []), add: vi.fn(), remove: vi.fn() },
}));
vi.mock('../../repositories/program-submission.repository.js', () => ({
  default: { findForEditor: vi.fn(async () => null), countDrafts: vi.fn(async () => 0), markFeedbackSubmitted: vi.fn(), create: vi.fn(), findById: vi.fn(), findByEmail: vi.fn(), updateSubmission: vi.fn(), setPaid: vi.fn(), setPrize: vi.fn(), listByProgramId: vi.fn(), countByProgramId: vi.fn(), delete: vi.fn() },
}));
vi.mock('../../services/submission-webhook.service.js', async (importOriginal) => ({
  ...(await importOriginal()),
  notifySubmissionEvent: vi.fn(async () => true),
}));
vi.mock('../../services/submission-confirmation.service.js', () => ({
  default: { send: vi.fn() },
}));
vi.mock('../../repositories/submission-score.repository.js', () => ({
  default: { upsert: vi.fn(), upsertMany: vi.fn() },
}));
vi.mock('../../repositories/submission-rubric-score.repository.js', () => ({
  default: { upsert: vi.fn(), listByJudge: vi.fn() },
}));
vi.mock('../../repositories/program-admin-email.repository.js', () => ({
  default: { listJudges: vi.fn() },
}));
vi.mock('../../repositories/program-signup.repository.js', () => ({
  default: { countByProgramId: vi.fn(), existsByEmail: vi.fn() },
}));
vi.mock('../../repositories/program-judge-ballot.repository.js', () => ({
  default: { isSubmitted: vi.fn() },
}));
vi.mock('../../services/program-audit-log.service.js', () => ({ default: { logSafe: vi.fn() } }));
vi.mock('../../services/prize-award.service.js', () => ({
  default: { notifyWinners: vi.fn() },
}));
vi.mock('../../services/luma-sync.service.js', () => ({
  default: { isActive: vi.fn(() => false), syncProgram: vi.fn() },
}));

const programService = (await import('../../services/program.service.js')).default;
const submissionRepo = (await import('../../repositories/program-submission.repository.js')).default;
const signupRepo = (await import('../../repositories/program-signup.repository.js')).default;
const confirmationService = (await import('../../services/submission-confirmation.service.js')).default;
const adminEmailRepo = (await import('../../repositories/program-admin-email.repository.js')).default;
const submissionController = (await import('../submission.controller.js')).default;
const { notifySubmissionEvent } = await import('../../services/submission-webhook.service.js');

const mockRes = () => {
  const res = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res;
};

const FSH = { id: 'fsh', slug: 'free-society-hack-2026', name: 'Free Society Hack', eventEndsAt: null };
const BITREFILL = { id: 'bitrefill', slug: 'bitrefill-2026', name: 'Bitrefill', eventEndsAt: null };
const base = {
  submitterName: 'Priya Nair',
  lumaEmail: 'priya@example.com',
  projectTitle: 'Chai Ledger',
  projectBrief: 'Shielded checkout for cafés.',
  videoUrl: 'https://youtu.be/abc',
  githubUrl: 'https://github.com/x/chai',
  ratings: { overall: 4, organisation: 5, support: 4, tools: 3 },
};
const details = {
  privacyNote: 'Amounts and memos are shielded; our server stores order ids next to emails.', bitrefillFeedback: { worked: 'The MCP was quick to set up.', didnt: 'Test products were hard to find.' }, track: 'privacy',
  themes: ['1. Private payment rails'],
  pitch: 'Shielded ZEC checkout.',
  team: [],
  appType: 'web app',
  publicUrl: 'https://chai.example.com',
  technologies: ['WebZjs'],
  testnetTxid: 'b'.repeat(64),
  nextStep: 'Pilot by 4 Dec.',
  contact: { app: 'telegram', handle: 'arjun_builds' },
  nextStepLinks: [],
  frictionAreas: [],
  frictionNotes: null,
  anonymous: true,
  txCheck: { status: 'verified' },
};

// A complete Bitrefill survey (required to finalize Agentic and Both entries).
const SURVEY = {
  surfaces: ['Hosted MCP', 'x402 payments'],
  surfacesPrimary: 'x402 payments',
  agentEnv: 'Cursor',
  deadlineStatus: 'A purchase worked, but I handled (or mocked) the payment',
  biggestBlocker: 'The x402 flow',
  couldntHandle: '',
  wouldKeepBuilding: 'Yes, already planning to',
};
const agentic = { ...details, track: 'agentic', themes: [], testnetTxid: null, privacyNote: null };

beforeEach(() => {
  vi.clearAllMocks();
  signupRepo.existsByEmail.mockResolvedValue(true);
  submissionRepo.findByEmail.mockResolvedValue(null);
  submissionRepo.create.mockImplementation(async (x) => ({ submission: { id: 'new', ...x }, duplicate: false }));
  confirmationService.send.mockResolvedValue({ ok: true });
});

describe('SubmissionController.submit — tracked programs', () => {
  it('stores validated details (track, txid, anonymous) for a checked-in builder', async () => {
    programService.findBySlug.mockResolvedValue(FSH);
    const res = mockRes();
    await submissionController.submit({ params: { slug: FSH.slug }, body: { ...base, details } }, res);
    expect(res.status).toHaveBeenCalledWith(201);
    const arg = submissionRepo.create.mock.calls[0][0];
    expect(arg.details).toMatchObject({ track: 'privacy', testnetTxid: 'b'.repeat(64), anonymous: true });
    expect(arg.details).not.toHaveProperty('txCheck');
  });

  it('400s a tracked submission without details', async () => {
    programService.findBySlug.mockResolvedValue(FSH);
    const res = mockRes();
    await submissionController.submit({ params: { slug: FSH.slug }, body: base }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(submissionRepo.create).not.toHaveBeenCalled();
  });

  it('400s a malformed txid', async () => {
    programService.findBySlug.mockResolvedValue(FSH);
    const res = mockRes();
    await submissionController.submit({ params: { slug: FSH.slug }, body: { ...base, details: { ...details, testnetTxid: 'MOCK-1' } } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ status: 'error', message: 'A testnet transaction id is 64 hex characters' });
  });

  it('a resubmit replaces the details on the existing entry', async () => {
    programService.findBySlug.mockResolvedValue(FSH);
    submissionRepo.findByEmail.mockResolvedValue({ id: 'old', programId: 'fsh', feedback: SURVEY });
    submissionRepo.updateSubmission.mockImplementation(async (id, x) => ({ id, ...x }));
    const res = mockRes();
    await submissionController.submit(
      { params: { slug: FSH.slug }, headers: { 'x-supabase-token': 'tok:priya@example.com' }, body: { ...base, details: { ...details, track: 'both' } } },
      res,
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(submissionRepo.updateSubmission.mock.calls[0][1].details.track).toBe('both');
  });

  it('leaves the Bitrefill (untracked) flow unchanged: details are ignored', async () => {
    programService.findBySlug.mockResolvedValue(BITREFILL);
    const res = mockRes();
    await submissionController.submit({ params: { slug: BITREFILL.slug }, body: { ...base, details } }, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(submissionRepo.create.mock.calls[0][0]).not.toHaveProperty('details');
  });

  it('still refuses someone who did not check in on Luma', async () => {
    programService.findBySlug.mockResolvedValue(FSH);
    signupRepo.existsByEmail.mockResolvedValue(false);
    const res = mockRes();
    await submissionController.submit({ params: { slug: FSH.slug }, body: { ...base, details } }, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});

describe('SubmissionController.submit — mobile fixes and viewing key', () => {
  const priya = { 'x-supabase-token': 'tok:priya@example.com' };

  // Regression: SUBMIT FEEDBACK saves a draft first; on phones the GitHub link
  // came without https:// and the draft was refused ("A valid GitHub URL...").
  it('a draft with a GitHub link typed without https:// is saved, with https://', async () => {
    programService.findBySlug.mockResolvedValue(FSH);
    const res = mockRes();
    await submissionController.submit(
      {
        params: { slug: FSH.slug },
        headers: priya,
        body: { submitterName: 'Priya Nair', lumaEmail: 'priya@example.com', projectTitle: 'Chai Ledger', githubUrl: 'github.com/x/chai', intent: 'draft', details: { track: 'privacy' } },
      },
      res,
    );
    expect(res.status).toHaveBeenCalledWith(201);
    const arg = submissionRepo.create.mock.calls[0][0];
    expect(arg.githubUrl).toBe('https://github.com/x/chai');
    expect(arg.status).toBe('draft');
  });

  it('finalizing without the event feedback is still refused', async () => {
    programService.findBySlug.mockResolvedValue(FSH);
    const { ratings: _r, ...noRatings } = base;
    const res = mockRes();
    await submissionController.submit({ params: { slug: FSH.slug }, headers: priya, body: { ...noRatings, details, intent: 'finalize' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'feedback_required' }));
    expect(submissionRepo.create).not.toHaveBeenCalled();
  });

  it('stores the viewing key and birth height with the details', async () => {
    programService.findBySlug.mockResolvedValue(FSH);
    const key = 'uviewtest1' + 'q'.repeat(120);
    const res = mockRes();
    await submissionController.submit(
      { params: { slug: FSH.slug }, body: { ...base, details: { ...details, viewingKey: key, birthHeight: '3100000' } } },
      res,
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(submissionRepo.create.mock.calls[0][0].details).toMatchObject({ viewingKey: key, birthHeight: 3100000 });
  });

  it('400s a viewing key that is not a testnet UFVK (draft or full)', async () => {
    programService.findBySlug.mockResolvedValue(FSH);
    const res = mockRes();
    await submissionController.submit({ params: { slug: FSH.slug }, body: { ...base, details: { ...details, viewingKey: 'uview1abc' } } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    const res2 = mockRes();
    await submissionController.submit(
      { params: { slug: FSH.slug }, headers: priya, body: { submitterName: 'P', lumaEmail: 'priya@example.com', projectTitle: 'T', intent: 'draft', details: { track: 'privacy', birthHeight: '1.5' } } },
      res2,
    );
    expect(res2.status).toHaveBeenCalledWith(400);
    expect(res2.json).toHaveBeenCalledWith({ status: 'error', message: 'The wallet birth height must be a whole number' });
  });
});

describe('SubmissionController.submit — Bitrefill survey (Free Society Hack)', () => {
  const priya = { 'x-supabase-token': 'tok:priya@example.com' };
  const submit = async (body, headers = {}) => {
    programService.findBySlug.mockResolvedValue(FSH);
    const res = mockRes();
    await submissionController.submit({ params: { slug: FSH.slug }, headers, body }, res);
    return res;
  };

  it('refuses an Agentic entry finalized without the survey', async () => {
    const res = await submit({ ...base, details: agentic });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('Bitrefill survey') }));
    expect(submissionRepo.create).not.toHaveBeenCalled();
  });

  it('refuses a Both entry with a half-answered survey', async () => {
    const res = await submit({ ...base, feedback: { ...SURVEY, biggestBlocker: '' }, details: { ...details, track: 'both' } });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('biggest blocker') }));
  });

  it('stores the survey with a Both entry that answered it', async () => {
    const res = await submit({ ...base, feedback: SURVEY, details: { ...details, track: 'both' } });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(submissionRepo.create.mock.calls[0][0].feedback).toEqual(SURVEY);
  });

  it('a Privacy entry needs no survey, and stores none even if sent', async () => {
    const res = await submit({ ...base, feedback: SURVEY, details });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(submissionRepo.create.mock.calls[0][0].feedback).toBeNull();
  });

  it('an Agentic draft may skip the survey', async () => {
    const res = await submit({ submitterName: 'Priya Nair', lumaEmail: 'priya@example.com', projectTitle: 'Chai', intent: 'draft', details: { track: 'agentic' } }, priya);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(submissionRepo.create.mock.calls[0][0].status).toBe('draft');
  });

  it('an update that does not resend the survey keeps the stored answers', async () => {
    submissionRepo.findByEmail.mockResolvedValue({ id: 'old', programId: 'fsh', status: 'submitted', feedbackSubmittedAt: '2026-11-04T10:00:00Z', feedback: SURVEY });
    submissionRepo.updateSubmission.mockImplementation(async (id, x) => ({ id, ...x }));
    const { ratings: _r, ...noRatings } = base;
    const res = await submit({ ...noRatings, details: agentic }, priya);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(submissionRepo.updateSubmission.mock.calls[0][1]).not.toHaveProperty('feedback');
  });

  it('an update with nothing stored and no survey is refused', async () => {
    submissionRepo.findByEmail.mockResolvedValue({ id: 'old', programId: 'fsh', status: 'submitted', feedbackSubmittedAt: '2026-11-04T10:00:00Z', feedback: null });
    const { ratings: _r, ...noRatings } = base;
    const res = await submit({ ...noRatings, details: agentic }, priya);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(submissionRepo.updateSubmission).not.toHaveBeenCalled();
  });

  it('the Bitrefill program (untracked) keeps its survey optional on the server', async () => {
    programService.findBySlug.mockResolvedValue(BITREFILL);
    const res = mockRes();
    await submissionController.submit({ params: { slug: BITREFILL.slug }, body: base }, res);
    expect(res.status).toHaveBeenCalledWith(201);
  });
});

describe('SubmissionController.submit — n8n webhook events', () => {
  const priya = { 'x-supabase-token': 'tok:priya@example.com' };
  const save = async (body) => {
    programService.findBySlug.mockResolvedValue(FSH);
    submissionRepo.updateSubmission.mockImplementation(async (id, x) => ({ id, ...x }));
    const res = mockRes();
    await submissionController.submit({ params: { slug: FSH.slug }, headers: priya, body }, res);
    return res;
  };
  const draftBody = { submitterName: 'Priya Nair', lumaEmail: 'priya@example.com', projectTitle: 'Chai', intent: 'draft', details: { track: 'privacy' } };

  it('a first draft sends submission.draft_created', async () => {
    const res = await save(draftBody);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(notifySubmissionEvent).toHaveBeenCalledWith('submission.draft_created', expect.objectContaining({ previousStatus: null, program: FSH }));
  });

  it('a draft saved again sends nothing', async () => {
    submissionRepo.findByEmail.mockResolvedValue({ id: 'old', programId: 'fsh', status: 'draft' });
    const res = await save(draftBody);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(notifySubmissionEvent).not.toHaveBeenCalled();
  });

  it('finalizing a draft sends submission.finalized with previousStatus draft', async () => {
    submissionRepo.findByEmail.mockResolvedValue({ id: 'old', programId: 'fsh', status: 'draft' });
    const res = await save({ ...base, details, intent: 'finalize' });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(notifySubmissionEvent).toHaveBeenCalledWith(
      'submission.finalized',
      expect.objectContaining({ previousStatus: 'draft', submission: expect.objectContaining({ status: 'submitted' }) }),
    );
  });

  it('saving a submitted entry again sends submission.updated', async () => {
    submissionRepo.findByEmail.mockResolvedValue({ id: 'old', programId: 'fsh', status: 'submitted', feedbackSubmittedAt: '2026-11-04T10:00:00Z' });
    const res = await save({ ...base, details });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(notifySubmissionEvent).toHaveBeenCalledWith('submission.updated', expect.objectContaining({ previousStatus: 'submitted' }));
  });

  it('a failing webhook never fails the save', async () => {
    notifySubmissionEvent.mockRejectedValueOnce(new Error('down'));
    const res = await save(draftBody);
    expect(res.status).toHaveBeenCalledWith(201);
  });
});

describe('SubmissionController.listJudges', () => {
  const judges = [
    { email: 'judge-a@example.com', name: 'Judge A', tracks: ['privacy'] },
    { email: 'judge-b@example.com', name: null, tracks: null },
  ];
  it('gives admins every email', async () => {
    adminEmailRepo.listJudges.mockResolvedValue(judges);
    const res = mockRes();
    await submissionController.listJudges({ params: { slug: 'fsh' }, user: { address: '5Admin', programId: 'fsh' } }, res);
    expect(res.json.mock.calls[0][0].data).toEqual([
      { name: 'Judge A', tracks: ['privacy'], email: 'judge-a@example.com' },
      { name: 'judge-b', tracks: null, email: 'judge-b@example.com' },
    ]);
  });
  it('gives a judge only their own email', async () => {
    adminEmailRepo.listJudges.mockResolvedValue(judges);
    const res = mockRes();
    await submissionController.listJudges({ params: { slug: 'fsh' }, user: { email: 'Judge-A@example.com', role: 'judge', programId: 'fsh' } }, res);
    expect(res.json.mock.calls[0][0].data.map((j) => j.email)).toEqual(['judge-a@example.com', null]);
  });
});

describe('SubmissionController.listTracked', () => {
  it('returns each submission with its judging batch', async () => {
    programService.findBySlug.mockResolvedValue({ ...FSH, resultsPublishedAt: null });
    submissionRepo.listByProgramId.mockResolvedValue([
      { id: 'a', createdAt: '2026-11-04T14:00:00.000Z' }, // 19:30 IST
      { id: 'b', createdAt: '2026-11-04T15:00:00.000Z' }, // 20:30 IST
    ]);
    const res = mockRes();
    await submissionController.listTracked({ params: { slug: 'free-society-hack-2026' }, user: { email: 'j@x.com', programId: 'fsh' } }, res);
    const data = res.json.mock.calls[0][0].data;
    expect(data.submissions.map((s) => [s.id, s.batch])).toEqual([['a', 'evening'], ['b', 'morning']]);
    expect(data.batches.map((b) => b.id)).toEqual(['evening', 'morning']);
    expect(data.resultsPublishedAt).toBeNull();
  });
  it('includes drafts that have a track (status kept), not drafts with no track yet', async () => {
    programService.findBySlug.mockResolvedValue({ ...FSH, resultsPublishedAt: null });
    submissionRepo.listByProgramId.mockResolvedValue([
      { id: 'final', status: 'submitted', createdAt: '2026-11-04T14:00:00.000Z', details: { track: 'privacy' } },
      { id: 'draft', status: 'draft', createdAt: '2026-11-04T14:00:00.000Z', details: { track: 'agentic' } },
      { id: 'empty', status: 'draft', createdAt: '2026-11-04T14:00:00.000Z', details: { track: null } },
    ]);
    const res = mockRes();
    await submissionController.listTracked({ params: { slug: 'free-society-hack-2026' }, user: { email: 'j@x.com', programId: 'fsh', role: 'judge' } }, res);
    expect(res.json.mock.calls[0][0].data.submissions.map((s) => [s.id, s.status])).toEqual([['final', 'submitted'], ['draft', 'draft']]);
  });
  it('batches by when the team finalized, not when the draft was opened', async () => {
    programService.findBySlug.mockResolvedValue({ ...FSH, resultsPublishedAt: null });
    submissionRepo.listByProgramId.mockResolvedValue([
      // Draft opened 18:00 IST, finalized 20:30 IST: morning.
      { id: 'a', createdAt: '2026-11-04T12:30:00.000Z', finalizedAt: '2026-11-04T15:00:00.000Z' },
    ]);
    const res = mockRes();
    await submissionController.listTracked({ params: { slug: 'free-society-hack-2026' }, user: { email: 'j@x.com', programId: 'fsh' } }, res);
    expect(res.json.mock.calls[0][0].data.submissions[0].batch).toBe('morning');
  });
  it('hides who last edited an anonymous entry from judges, not from admins', async () => {
    programService.findBySlug.mockResolvedValue({ ...FSH, resultsPublishedAt: null });
    const row = { id: 'a', createdAt: '2026-11-04T12:30:00.000Z', details: { anonymous: true }, lastEditedAt: '2026-11-04T14:00:00.000Z', lastEditedByName: 'Priya', lastEditedByEmail: 'priya@example.com' };
    submissionRepo.listByProgramId.mockResolvedValue([row]);
    const asJudge = mockRes();
    await submissionController.listTracked({ params: { slug: 'free-society-hack-2026' }, user: { email: 'j@x.com', programId: 'fsh', role: 'judge' } }, asJudge);
    expect(asJudge.json.mock.calls[0][0].data.submissions[0]).toMatchObject({ lastEditedAt: row.lastEditedAt, lastEditedByName: null, lastEditedByEmail: null });
    expect(asJudge.json.mock.calls[0][0].data).not.toHaveProperty('draftCount');
    const asAdmin = mockRes();
    submissionRepo.countDrafts.mockResolvedValue(3);
    await submissionController.listTracked({ params: { slug: 'free-society-hack-2026' }, user: { email: 'a@x.com', programId: 'fsh', role: 'admin' } }, asAdmin);
    expect(asAdmin.json.mock.calls[0][0].data.submissions[0].lastEditedByName).toBe('Priya');
    expect(asAdmin.json.mock.calls[0][0].data.draftCount).toBe(3);
  });
  it('404s a program that is not tracked', async () => {
    const res = mockRes();
    await submissionController.listTracked({ params: { slug: 'bitrefill-2026' }, user: { email: 'j@x.com' } }, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});
