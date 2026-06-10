import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../services/program.service.js', () => ({ default: { findBySlug: vi.fn() } }));
vi.mock('../../services/scoring.service.js', () => ({
  default: { listForJudge: vi.fn(), submitBallot: vi.fn(), leaderboard: vi.fn(), promoteToProject: vi.fn() },
}));
vi.mock('../../repositories/program-submission.repository.js', () => ({
  default: { create: vi.fn(), findById: vi.fn(), setPaid: vi.fn() },
}));
vi.mock('../../repositories/submission-score.repository.js', () => ({
  default: { upsert: vi.fn() },
}));
vi.mock('../../repositories/program-judge-ballot.repository.js', () => ({
  default: { isSubmitted: vi.fn() },
}));
vi.mock('../../services/program-audit-log.service.js', () => ({ default: { logSafe: vi.fn() } }));

const programService = (await import('../../services/program.service.js')).default;
const scoringService = (await import('../../services/scoring.service.js')).default;
const submissionRepo = (await import('../../repositories/program-submission.repository.js')).default;
const ballotRepo = (await import('../../repositories/program-judge-ballot.repository.js')).default;
const scoreRepo = (await import('../../repositories/submission-score.repository.js')).default;
const submissionController = (await import('../submission.controller.js')).default;

const mockRes = () => {
  const res = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  res.end = vi.fn(() => res);
  return res;
};

const PROGRAM = { id: 'bitrefill', slug: 'bitrefill', name: 'Bitrefill' };
const GOOD_BODY = {
  submitterName: 'Ada',
  lumaEmail: 'ada@example.com',
  projectTitle: 'Engine',
  videoUrl: 'https://youtu.be/x',
  githubUrl: 'https://github.com/ada/x',
};

beforeEach(() => vi.clearAllMocks());

describe('SubmissionController.submit (public)', () => {
  it('silently accepts honeypot hits without persisting', async () => {
    const req = { params: { slug: 'bitrefill' }, body: { ...GOOD_BODY, company: 'bot inc' } };
    const res = mockRes();
    await submissionController.submit(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(submissionRepo.create).not.toHaveBeenCalled();
  });

  it('404s for an unknown program', async () => {
    programService.findBySlug.mockResolvedValue(null);
    const req = { params: { slug: 'nope' }, body: GOOD_BODY };
    const res = mockRes();
    await submissionController.submit(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('400s on invalid fields', async () => {
    programService.findBySlug.mockResolvedValue(PROGRAM);
    const req = { params: { slug: 'bitrefill' }, body: { ...GOOD_BODY, githubUrl: 'not-a-url' } };
    const res = mockRes();
    await submissionController.submit(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(submissionRepo.create).not.toHaveBeenCalled();
  });

  it('409s on a duplicate Luma email', async () => {
    programService.findBySlug.mockResolvedValue(PROGRAM);
    submissionRepo.create.mockResolvedValue({ submission: { id: 'x' }, duplicate: true });
    const req = { params: { slug: 'bitrefill' }, body: GOOD_BODY };
    const res = mockRes();
    await submissionController.submit(req, res);
    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('201s with the new id on success', async () => {
    programService.findBySlug.mockResolvedValue(PROGRAM);
    submissionRepo.create.mockResolvedValue({ submission: { id: 'engine-ab12' }, duplicate: false });
    const req = { params: { slug: 'bitrefill' }, body: GOOD_BODY };
    const res = mockRes();
    await submissionController.submit(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ status: 'success', data: { id: 'engine-ab12' } });
  });
});

describe('SubmissionController.upsertScore (judge)', () => {
  it('409s when the judge ballot is already submitted (locked)', async () => {
    ballotRepo.isSubmitted.mockResolvedValue(true);
    const req = {
      params: { slug: 'bitrefill', submissionId: 's1' },
      user: { email: 'judge@x.com', programId: 'bitrefill', canJudge: true },
      body: { requirements: 2, techStack: 5, innovation: 5 },
    };
    const res = mockRes();
    await submissionController.upsertScore(req, res);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(scoreRepo.upsert).not.toHaveBeenCalled();
  });

  it('saves a valid score for the verified judge email (not a body field)', async () => {
    ballotRepo.isSubmitted.mockResolvedValue(false);
    submissionRepo.findById.mockResolvedValue({ id: 's1', programId: 'bitrefill' });
    scoreRepo.upsert.mockResolvedValue({ id: 'sc1' });
    const req = {
      params: { slug: 'bitrefill', submissionId: 's1' },
      user: { email: 'judge@x.com', programId: 'bitrefill', canJudge: true },
      body: { requirements: 1, techStack: 3, innovation: 4, notes: 'ok', judgeEmail: 'spoof@evil.com' },
    };
    const res = mockRes();
    await submissionController.upsertScore(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(scoreRepo.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ judgeEmail: 'judge@x.com', submissionId: 's1', programId: 'bitrefill' }),
    );
  });

  it('404s when the submission belongs to another program', async () => {
    ballotRepo.isSubmitted.mockResolvedValue(false);
    submissionRepo.findById.mockResolvedValue({ id: 's1', programId: 'other-program' });
    const req = {
      params: { slug: 'bitrefill', submissionId: 's1' },
      user: { email: 'judge@x.com', programId: 'bitrefill', canJudge: true },
      body: { requirements: 1, techStack: 3, innovation: 4 },
    };
    const res = mockRes();
    await submissionController.upsertScore(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe('SubmissionController.promote (admin)', () => {
  it('201s with the new project id', async () => {
    programService.findBySlug.mockResolvedValue(PROGRAM);
    scoringService.promoteToProject.mockResolvedValue({ project: { id: 'aurora-ab12' } });
    const req = { params: { slug: 'bitrefill', submissionId: 's1' }, user: { address: '5Admin' } };
    const res = mockRes();
    await submissionController.promote(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ status: 'success', data: { projectId: 'aurora-ab12' } });
  });

  it('200s (not 201) when already promoted', async () => {
    programService.findBySlug.mockResolvedValue(PROGRAM);
    scoringService.promoteToProject.mockResolvedValue({ alreadyPromoted: true, projectId: 'existing-1' });
    const req = { params: { slug: 'bitrefill', submissionId: 's1' }, user: { address: '5Admin' } };
    const res = mockRes();
    await submissionController.promote(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('404s an unknown submission', async () => {
    programService.findBySlug.mockResolvedValue(PROGRAM);
    scoringService.promoteToProject.mockResolvedValue({ notFound: true });
    const req = { params: { slug: 'bitrefill', submissionId: 'nope' }, user: { address: '5Admin' } };
    const res = mockRes();
    await submissionController.promote(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe('SubmissionController.setPaid (admin)', () => {
  it('marks a submission paid, recording the actor', async () => {
    programService.findBySlug.mockResolvedValue(PROGRAM);
    submissionRepo.findById.mockResolvedValue({ id: 's1', programId: 'bitrefill' });
    submissionRepo.setPaid.mockResolvedValue({ id: 's1', paid: true });
    const req = { params: { slug: 'bitrefill', submissionId: 's1' }, user: { address: '5Admin' }, body: { paid: true } };
    const res = mockRes();
    await submissionController.setPaid(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(submissionRepo.setPaid).toHaveBeenCalledWith('s1', true, '5Admin');
  });

  it('404s a submission from another program', async () => {
    programService.findBySlug.mockResolvedValue(PROGRAM);
    submissionRepo.findById.mockResolvedValue({ id: 's1', programId: 'other-program' });
    const req = { params: { slug: 'bitrefill', submissionId: 's1' }, user: { address: '5Admin' }, body: { paid: true } };
    const res = mockRes();
    await submissionController.setPaid(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(submissionRepo.setPaid).not.toHaveBeenCalled();
  });
});
