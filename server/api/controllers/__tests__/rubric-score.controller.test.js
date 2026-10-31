import { describe, it, expect, vi, beforeEach } from 'vitest';

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
const rubricRepo = (await import('../../repositories/submission-rubric-score.repository.js')).default;
const submissionController = (await import('../submission.controller.js')).default;

const mockRes = () => {
  const res = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res;
};

const judgeReq = (over = {}) => ({
  params: { slug: 'free-society-hack-2026', submissionId: 's1', track: 'privacy' },
  user: { email: 'judge-a@example.com', programId: 'fsh', canJudge: true, tracks: ['privacy'] },
  body: { criteria: { works: 3 }, notes: '', session: 'evening' },
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  submissionRepo.findById.mockResolvedValue({ id: 's1', programId: 'fsh' });
  rubricRepo.upsert.mockImplementation(async (x) => ({ ...x, id: 'r1' }));
});

describe('SubmissionController.upsertRubricScore', () => {
  it('autosaves a partial score for the verified judge, ignoring a body judgeEmail', async () => {
    const req = judgeReq({ body: { criteria: { works: 3, private: null }, judgeEmail: 'spoof@evil.com', session: 'evening' } });
    const res = mockRes();
    await submissionController.upsertRubricScore(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(rubricRepo.upsert).toHaveBeenCalledWith({
      submissionId: 's1',
      programId: 'fsh',
      judgeEmail: 'judge-a@example.com',
      track: 'privacy',
      criteria: { works: 3, private: null },
      notes: '',
      session: 'evening',
      revisit: false,
      checks: {},
    });
  });

  it('stores what the judge checked before scoring', async () => {
    const res = mockRes();
    await submissionController.upsertRubricScore(judgeReq({ body: { criteria: {}, checks: { video: true, repo: true } } }), res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(rubricRepo.upsert).toHaveBeenCalledWith(expect.objectContaining({ checks: { video: true, repo: true } }));
  });

  it('stores the judge\'s revisit flag', async () => {
    const res = mockRes();
    await submissionController.upsertRubricScore(judgeReq({ body: { criteria: { works: 2 }, revisit: true } }), res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(rubricRepo.upsert).toHaveBeenCalledWith(expect.objectContaining({ revisit: true }));
  });

  it('saves a full score too (same row, later)', async () => {
    const criteria = { works: 3, private: 2, easy: 2, needed: 3, continuing: 3, bonus: 1 };
    const res = mockRes();
    await submissionController.upsertRubricScore(judgeReq({ body: { criteria } }), res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(rubricRepo.upsert).toHaveBeenCalledWith(expect.objectContaining({ criteria }));
  });

  it('403s a judge scoring a track they are not on', async () => {
    const req = judgeReq({ params: { slug: 'fsh', submissionId: 's1', track: 'agentic' }, body: { criteria: { innovation: 3 } } });
    const res = mockRes();
    await submissionController.upsertRubricScore(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(rubricRepo.upsert).not.toHaveBeenCalled();
  });

  it('lets a judge with no track limit (tracks null) score any track', async () => {
    const req = judgeReq({
      params: { slug: 'fsh', submissionId: 's1', track: 'agentic' },
      user: { email: 'j@x.com', programId: 'fsh', canJudge: true, tracks: null },
      body: { criteria: { innovation: 3 } },
    });
    const res = mockRes();
    await submissionController.upsertRubricScore(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('403s a wallet admin (no email identity)', async () => {
    const req = judgeReq({ user: { address: '5Admin', programSlug: 'fsh', isGlobalAdmin: true, canJudge: true } });
    const res = mockRes();
    await submissionController.upsertRubricScore(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(rubricRepo.upsert).not.toHaveBeenCalled();
  });

  it('404s a submission from another program', async () => {
    submissionRepo.findById.mockResolvedValue({ id: 's1', programId: 'other' });
    const res = mockRes();
    await submissionController.upsertRubricScore(judgeReq(), res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('400s an invalid score', async () => {
    const res = mockRes();
    await submissionController.upsertRubricScore(judgeReq({ body: { criteria: { works: 9 } } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(rubricRepo.upsert).not.toHaveBeenCalled();
  });

  it('500s when the database fails', async () => {
    rubricRepo.upsert.mockRejectedValue(new Error('db'));
    const res = mockRes();
    await submissionController.upsertRubricScore(judgeReq(), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('SubmissionController.listMyRubricScores', () => {
  it("returns only the caller's scores", async () => {
    rubricRepo.listByJudge.mockResolvedValue([{ id: 'r1' }]);
    const res = mockRes();
    await submissionController.listMyRubricScores(judgeReq(), res);
    expect(rubricRepo.listByJudge).toHaveBeenCalledWith('fsh', 'judge-a@example.com');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ status: 'success', data: [{ id: 'r1' }] });
  });

  it('resolves the program from the slug when the session has no programId', async () => {
    programService.findBySlug.mockResolvedValue({ id: 'fsh' });
    rubricRepo.listByJudge.mockResolvedValue([]);
    const res = mockRes();
    await submissionController.listMyRubricScores(judgeReq({ user: { email: 'j@x.com', canJudge: true } }), res);
    expect(rubricRepo.listByJudge).toHaveBeenCalledWith('fsh', 'j@x.com');
  });

  it('403s a wallet admin', async () => {
    const res = mockRes();
    await submissionController.listMyRubricScores(judgeReq({ user: { address: '5Admin', canJudge: true } }), res);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
