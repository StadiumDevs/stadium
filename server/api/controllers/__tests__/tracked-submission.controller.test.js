import { describe, it, expect, vi, beforeEach } from 'vitest';

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
vi.mock('../../repositories/program-submission.repository.js', () => ({
  default: { create: vi.fn(), findById: vi.fn(), findByEmail: vi.fn(), updateSubmission: vi.fn(), setPaid: vi.fn(), setPrize: vi.fn(), listByProgramId: vi.fn(), countByProgramId: vi.fn(), delete: vi.fn() },
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
};
const details = {
  track: 'privacy',
  themes: ['1. Private payment rails'],
  pitch: 'Shielded ZEC checkout.',
  team: [],
  appType: 'web app',
  publicUrl: 'https://chai.example.com',
  technologies: ['WebZjs'],
  testnetTxid: 'b'.repeat(64),
  nextStep: 'Pilot by 4 Dec.',
  nextStepLinks: [],
  frictionAreas: [],
  frictionNotes: null,
  anonymous: true,
  txCheck: { status: 'verified' },
};

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
    submissionRepo.findByEmail.mockResolvedValue({ id: 'old', programId: 'fsh' });
    submissionRepo.updateSubmission.mockImplementation(async (id, x) => ({ id, ...x }));
    const res = mockRes();
    await submissionController.submit({ params: { slug: FSH.slug }, body: { ...base, details: { ...details, track: 'both' } } }, res);
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
    expect(submissionRepo.listByProgramId).toHaveBeenCalledWith('fsh');
  });
  it('404s a program that is not tracked', async () => {
    const res = mockRes();
    await submissionController.listTracked({ params: { slug: 'bitrefill-2026' }, user: { email: 'j@x.com' } }, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});
