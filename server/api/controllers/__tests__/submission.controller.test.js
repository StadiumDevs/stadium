import { describe, it, expect, vi, beforeEach } from 'vitest';

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
  default: { create: vi.fn(), findById: vi.fn(), findByEmail: vi.fn(), updateSubmission: vi.fn(), setPaid: vi.fn(), setPrize: vi.fn(), listByProgramId: vi.fn(), countByProgramId: vi.fn() },
}));
vi.mock('../../services/submission-confirmation.service.js', () => ({
  default: { send: vi.fn() },
}));
vi.mock('../../repositories/submission-score.repository.js', () => ({
  default: { upsert: vi.fn(), upsertMany: vi.fn() },
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

const programService = (await import('../../services/program.service.js')).default;
const scoringService = (await import('../../services/scoring.service.js')).default;
const programRepo = (await import('../../repositories/program.repository.js')).default;
const submissionRepo = (await import('../../repositories/program-submission.repository.js')).default;
const ballotRepo = (await import('../../repositories/program-judge-ballot.repository.js')).default;
const scoreRepo = (await import('../../repositories/submission-score.repository.js')).default;
const signupRepo = (await import('../../repositories/program-signup.repository.js')).default;
const confirmationService = (await import('../../services/submission-confirmation.service.js')).default;
const prizeAwardService = (await import('../../services/prize-award.service.js')).default;
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
  projectBrief: 'A mechanical computer that runs programs from punched cards.',
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

  it('403s an email that is not on the checked-in guest list', async () => {
    programService.findBySlug.mockResolvedValue(PROGRAM);
    signupRepo.existsByEmail.mockResolvedValue(false);
    const req = { params: { slug: 'bitrefill' }, body: GOOD_BODY };
    const res = mockRes();
    await submissionController.submit(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(submissionRepo.create).not.toHaveBeenCalled();
  });

  it('lets a SUBMIT_TEST_EMAILS address bypass the checked-in gate', async () => {
    programService.findBySlug.mockResolvedValue(PROGRAM);
    signupRepo.existsByEmail.mockResolvedValue(false); // NOT on the signup list
    submissionRepo.findByEmail.mockResolvedValue(null);
    submissionRepo.create.mockResolvedValue({
      submission: { id: 'engine-ab12', lumaEmail: 'ada@example.com', submitterName: 'Ada', projectTitle: 'Engine' },
      duplicate: false,
    });
    confirmationService.send.mockResolvedValue({ ok: true });
    const prev = process.env.SUBMIT_TEST_EMAILS;
    process.env.SUBMIT_TEST_EMAILS = 'ADA@example.com'; // case-insensitive match
    try {
      const req = { params: { slug: 'bitrefill' }, body: GOOD_BODY };
      const res = mockRes();
      await submissionController.submit(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(submissionRepo.create).toHaveBeenCalled();
    } finally {
      process.env.SUBMIT_TEST_EMAILS = prev;
    }
  });

  it('201s on a first submission and emails a confirmation', async () => {
    programService.findBySlug.mockResolvedValue(PROGRAM);
    signupRepo.existsByEmail.mockResolvedValue(true);
    submissionRepo.findByEmail.mockResolvedValue(null);
    submissionRepo.create.mockResolvedValue({
      submission: { id: 'engine-ab12', lumaEmail: 'ada@example.com', submitterName: 'Ada', projectTitle: 'Engine' },
      duplicate: false,
    });
    confirmationService.send.mockResolvedValue({ ok: true });
    const req = { params: { slug: 'bitrefill' }, body: GOOD_BODY };
    const res = mockRes();
    await submissionController.submit(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(submissionRepo.create).toHaveBeenCalledWith(expect.objectContaining({ late: false }));
    expect(confirmationService.send).toHaveBeenCalledWith(expect.objectContaining({ resubmitted: false }));
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'success', data: { id: 'engine-ab12', late: false }, resubmitted: false, emailSent: true }),
    );
  });

  it('resubmits (200) by overwriting the existing entry, not a 409', async () => {
    programService.findBySlug.mockResolvedValue(PROGRAM);
    signupRepo.existsByEmail.mockResolvedValue(true);
    submissionRepo.findByEmail.mockResolvedValue({ id: 'engine-ab12', lumaEmail: 'ada@example.com' });
    submissionRepo.updateSubmission.mockResolvedValue({ id: 'engine-ab12', lumaEmail: 'ada@example.com', submitterName: 'Ada', projectTitle: 'Engine v2' });
    confirmationService.send.mockResolvedValue({ ok: true });
    const req = { params: { slug: 'bitrefill' }, body: { ...GOOD_BODY, projectTitle: 'Engine v2' } };
    const res = mockRes();
    await submissionController.submit(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(submissionRepo.updateSubmission).toHaveBeenCalledWith('engine-ab12', expect.objectContaining({ projectTitle: 'Engine v2' }));
    expect(submissionRepo.create).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ resubmitted: true }));
  });

  it('flags a submission after the deadline as late', async () => {
    programService.findBySlug.mockResolvedValue({ ...PROGRAM, eventEndsAt: '2020-01-01T00:00:00.000Z' });
    signupRepo.existsByEmail.mockResolvedValue(true);
    submissionRepo.findByEmail.mockResolvedValue(null);
    submissionRepo.create.mockResolvedValue({ submission: { id: 'late-1', lumaEmail: 'ada@example.com' }, duplicate: false });
    confirmationService.send.mockResolvedValue({ ok: false, reason: 'provider_not_configured' });
    const req = { params: { slug: 'bitrefill' }, body: GOOD_BODY };
    const res = mockRes();
    await submissionController.submit(req, res);
    expect(submissionRepo.create).toHaveBeenCalledWith(expect.objectContaining({ late: true }));
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: { id: 'late-1', late: true }, emailSent: false }));
  });
});

describe('SubmissionController.upsertScore (judge)', () => {
  it('lets a judge re-save a score after submitting (editable, not locked)', async () => {
    ballotRepo.isSubmitted.mockResolvedValue(true); // already submitted
    submissionRepo.findById.mockResolvedValue({ id: 's1', programId: 'bitrefill' });
    scoreRepo.upsert.mockResolvedValue({ id: 'sc1' });
    const req = {
      params: { slug: 'bitrefill', submissionId: 's1' },
      user: { email: 'judge@x.com', programId: 'bitrefill', canJudge: true },
      body: { requirements: 2, techStack: 5, innovation: 5 },
    };
    const res = mockRes();
    await submissionController.upsertScore(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(scoreRepo.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ judgeEmail: 'judge@x.com', submissionId: 's1' }),
    );
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

describe('SubmissionController.promote (platform admin)', () => {
  const globalAdmin = { address: '5Admin', isGlobalAdmin: true };

  it('403s a non-global admin (email or per-program wallet)', async () => {
    const req = { params: { slug: 'bitrefill', submissionId: 's1' }, user: { email: 'admin@x.com', isGlobalAdmin: false } };
    const res = mockRes();
    await submissionController.promote(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(scoringService.promoteToProject).not.toHaveBeenCalled();
  });

  it('201s with the new project id', async () => {
    programService.findBySlug.mockResolvedValue(PROGRAM);
    scoringService.promoteToProject.mockResolvedValue({ project: { id: 'aurora-ab12' } });
    const req = { params: { slug: 'bitrefill', submissionId: 's1' }, user: globalAdmin };
    const res = mockRes();
    await submissionController.promote(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ status: 'success', data: { projectId: 'aurora-ab12' } });
  });

  it('200s (not 201) when already promoted', async () => {
    programService.findBySlug.mockResolvedValue(PROGRAM);
    scoringService.promoteToProject.mockResolvedValue({ alreadyPromoted: true, projectId: 'existing-1' });
    const req = { params: { slug: 'bitrefill', submissionId: 's1' }, user: globalAdmin };
    const res = mockRes();
    await submissionController.promote(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('404s an unknown submission', async () => {
    programService.findBySlug.mockResolvedValue(PROGRAM);
    scoringService.promoteToProject.mockResolvedValue({ notFound: true });
    const req = { params: { slug: 'bitrefill', submissionId: 'nope' }, user: globalAdmin };
    const res = mockRes();
    await submissionController.promote(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe('SubmissionController.setPaid (platform admin)', () => {
  const globalAdmin = { address: '5Admin', isGlobalAdmin: true };

  it('403s a non-global admin (payouts stay wallet/global)', async () => {
    const req = { params: { slug: 'bitrefill', submissionId: 's1' }, user: { email: 'admin@x.com', isGlobalAdmin: false }, body: { paid: true } };
    const res = mockRes();
    await submissionController.setPaid(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(submissionRepo.setPaid).not.toHaveBeenCalled();
  });

  it('marks a submission paid, recording the actor', async () => {
    programService.findBySlug.mockResolvedValue(PROGRAM);
    submissionRepo.findById.mockResolvedValue({ id: 's1', programId: 'bitrefill' });
    submissionRepo.setPaid.mockResolvedValue({ id: 's1', paid: true });
    const req = { params: { slug: 'bitrefill', submissionId: 's1' }, user: globalAdmin, body: { paid: true } };
    const res = mockRes();
    await submissionController.setPaid(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(submissionRepo.setPaid).toHaveBeenCalledWith('s1', true, '5Admin');
  });

  it('404s a submission from another program', async () => {
    programService.findBySlug.mockResolvedValue(PROGRAM);
    submissionRepo.findById.mockResolvedValue({ id: 's1', programId: 'other-program' });
    const req = { params: { slug: 'bitrefill', submissionId: 's1' }, user: globalAdmin, body: { paid: true } };
    const res = mockRes();
    await submissionController.setPaid(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(submissionRepo.setPaid).not.toHaveBeenCalled();
  });
});

describe('SubmissionController.claimBatch (judge)', () => {
  const judgeReq = (body = {}) => ({
    params: { slug: 'bitrefill' },
    user: { email: 'judge@x.com', programId: 'bitrefill', canJudge: true },
    body,
  });

  it('409s when the ballot is already submitted', async () => {
    ballotRepo.isSubmitted.mockResolvedValue(true);
    const res = mockRes();
    await submissionController.claimBatch(judgeReq(), res);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(scoringService.claimBatch).not.toHaveBeenCalled();
  });

  it('claims and returns the refreshed view', async () => {
    ballotRepo.isSubmitted.mockResolvedValue(false);
    scoringService.claimBatch.mockResolvedValue({ claimed: 2, view: { batches: [] } });
    const res = mockRes();
    await submissionController.claimBatch(judgeReq({ batchNumber: 2 }), res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(scoringService.claimBatch).toHaveBeenCalledWith('bitrefill', 'judge@x.com', 2);
  });

  it('400s an invalid batch number', async () => {
    ballotRepo.isSubmitted.mockResolvedValue(false);
    scoringService.claimBatch.mockResolvedValue({ invalid: true });
    const res = mockRes();
    await submissionController.claimBatch(judgeReq({ batchNumber: 99 }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('SubmissionController.saveScores (judge bulk)', () => {
  const baseReq = (scores) => ({
    params: { slug: 'bitrefill' },
    user: { email: 'judge@x.com', programId: 'bitrefill', canJudge: true },
    body: { scores },
  });

  it('lets a judge bulk re-save after submitting (editable, not locked)', async () => {
    ballotRepo.isSubmitted.mockResolvedValue(true); // already submitted
    submissionRepo.listByProgramId.mockResolvedValue([{ id: 's1' }]);
    scoreRepo.upsertMany.mockResolvedValue([{ id: 'a' }]);
    const res = mockRes();
    await submissionController.saveScores(baseReq([{ submissionId: 's1', requirements: 1, techStack: 1, innovation: 1 }]), res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(scoreRepo.upsertMany).toHaveBeenCalled();
  });

  it('400s an unknown submission in the batch', async () => {
    ballotRepo.isSubmitted.mockResolvedValue(false);
    submissionRepo.listByProgramId.mockResolvedValue([{ id: 's1' }]);
    const res = mockRes();
    await submissionController.saveScores(baseReq([{ submissionId: 'nope', requirements: 1, techStack: 1, innovation: 1 }]), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(scoreRepo.upsertMany).not.toHaveBeenCalled();
  });

  it('bulk-upserts valid scores for the verified judge email', async () => {
    ballotRepo.isSubmitted.mockResolvedValue(false);
    submissionRepo.listByProgramId.mockResolvedValue([{ id: 's1' }, { id: 's2' }]);
    scoreRepo.upsertMany.mockResolvedValue([{ id: 'a' }, { id: 'b' }]);
    const res = mockRes();
    await submissionController.saveScores(
      baseReq([
        { submissionId: 's1', requirements: 2, techStack: 5, innovation: 5, judgeEmail: 'spoof@evil.com' },
        { submissionId: 's2', requirements: 1, techStack: 3, innovation: 2 },
      ]),
      res,
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(scoreRepo.upsertMany).toHaveBeenCalledWith([
      expect.objectContaining({ submissionId: 's1', programId: 'bitrefill', judgeEmail: 'judge@x.com', requirements: 2 }),
      expect.objectContaining({ submissionId: 's2', programId: 'bitrefill', judgeEmail: 'judge@x.com' }),
    ]);
  });
});

describe('SubmissionController.awardPrize (platform admin)', () => {
  const globalAdmin = { address: '5Admin', isGlobalAdmin: true };

  it('403s a per-program admin (not a global admin)', async () => {
    const req = {
      params: { slug: 'bitrefill', submissionId: 's1' },
      user: { address: '5ProgAdmin', isGlobalAdmin: false },
      body: { amount: 500 },
    };
    const res = mockRes();
    await submissionController.awardPrize(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(submissionRepo.setPrize).not.toHaveBeenCalled();
  });

  it('403s a judge (email session, no isGlobalAdmin)', async () => {
    const req = {
      params: { slug: 'bitrefill', submissionId: 's1' },
      user: { email: 'judge@x.com', canJudge: true },
      body: { amount: 500 },
    };
    const res = mockRes();
    await submissionController.awardPrize(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('409s when judging is not complete', async () => {
    programService.findBySlug.mockResolvedValue(PROGRAM);
    scoringService.isJudgingComplete.mockResolvedValue(false);
    const req = { params: { slug: 'bitrefill', submissionId: 's1' }, user: globalAdmin, body: { amount: 500 } };
    const res = mockRes();
    await submissionController.awardPrize(req, res);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(submissionRepo.setPrize).not.toHaveBeenCalled();
  });

  it('400s an amount not in the program tiers', async () => {
    programService.findBySlug.mockResolvedValue(PROGRAM);
    scoringService.isJudgingComplete.mockResolvedValue(true);
    submissionRepo.findById.mockResolvedValue({ id: 's1', programId: 'bitrefill' });
    const req = { params: { slug: 'bitrefill', submissionId: 's1' }, user: globalAdmin, body: { amount: 999 } };
    const res = mockRes();
    await submissionController.awardPrize(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(submissionRepo.setPrize).not.toHaveBeenCalled();
  });

  it('assigns a default-tier prize, snapshotting currency + label', async () => {
    programService.findBySlug.mockResolvedValue(PROGRAM); // no prizeTiers -> DEFAULT_PRIZE_TIERS
    scoringService.isJudgingComplete.mockResolvedValue(true);
    submissionRepo.findById.mockResolvedValue({ id: 's1', programId: 'bitrefill' });
    submissionRepo.setPrize.mockResolvedValue({ id: 's1', prizeAmount: 500 });
    const req = { params: { slug: 'bitrefill', submissionId: 's1' }, user: globalAdmin, body: { amount: 500 } };
    const res = mockRes();
    await submissionController.awardPrize(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(submissionRepo.setPrize).toHaveBeenCalledWith(
      's1',
      { amount: 500, currency: 'EUR', label: 'Bitrefill giftcard' },
      '5Admin',
    );
  });

  it('clears a prize when body.prize is null', async () => {
    programService.findBySlug.mockResolvedValue(PROGRAM);
    scoringService.isJudgingComplete.mockResolvedValue(true);
    submissionRepo.findById.mockResolvedValue({ id: 's1', programId: 'bitrefill' });
    submissionRepo.setPrize.mockResolvedValue({ id: 's1', prizeAmount: null });
    const req = { params: { slug: 'bitrefill', submissionId: 's1' }, user: globalAdmin, body: { prize: null } };
    const res = mockRes();
    await submissionController.awardPrize(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(submissionRepo.setPrize).toHaveBeenCalledWith('s1', null, '5Admin');
  });
});

describe('SubmissionController results publish (platform admin)', () => {
  it('403s a per-program admin', async () => {
    const req = { params: { slug: 'bitrefill' }, user: { address: '5ProgAdmin', isGlobalAdmin: false } };
    const res = mockRes();
    await submissionController.publishResults(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(programRepo.setResultsPublished).not.toHaveBeenCalled();
  });

  it('publish sets a timestamp and notifies winners', async () => {
    programService.findBySlug.mockResolvedValue(PROGRAM);
    programRepo.setResultsPublished.mockResolvedValue({ resultsPublishedAt: '2026-06-11T00:00:00.000Z' });
    prizeAwardService.notifyWinners.mockResolvedValue({ ok: true, sent: 0, failed: 0 });
    const req = { params: { slug: 'bitrefill' }, user: { address: '5Admin', isGlobalAdmin: true } };
    const res = mockRes();
    await submissionController.publishResults(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    const [slug, publishedAt] = programRepo.setResultsPublished.mock.calls[0];
    expect(slug).toBe('bitrefill');
    expect(publishedAt).toBeTruthy(); // non-null timestamp
    expect(prizeAwardService.notifyWinners).toHaveBeenCalledWith({ program: PROGRAM });
  });

  it('unpublish clears the timestamp and does NOT notify winners', async () => {
    programService.findBySlug.mockResolvedValue(PROGRAM);
    programRepo.setResultsPublished.mockResolvedValue({ resultsPublishedAt: null });
    const req = { params: { slug: 'bitrefill' }, user: { address: '5Admin', isGlobalAdmin: true } };
    const res = mockRes();
    await submissionController.unpublishResults(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(programRepo.setResultsPublished).toHaveBeenCalledWith('bitrefill', null);
    expect(prizeAwardService.notifyWinners).not.toHaveBeenCalled();
  });
});

describe('SubmissionController.programStats (judge/admin)', () => {
  it('404s an unknown program', async () => {
    programService.findBySlug.mockResolvedValue(null);
    const res = mockRes();
    await submissionController.programStats({ params: { slug: 'nope' } }, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns confirmed participants + submissions count', async () => {
    programService.findBySlug.mockResolvedValue(PROGRAM);
    signupRepo.countByProgramId.mockResolvedValue(42);
    submissionRepo.countByProgramId.mockResolvedValue(7);
    const res = mockRes();
    await submissionController.programStats({ params: { slug: 'bitrefill' } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      status: 'success',
      data: { confirmedParticipants: 42, submissionsCount: 7 },
    });
  });
});

describe('SubmissionController.publicResults (public)', () => {
  it('404s an unknown program', async () => {
    programService.findBySlug.mockResolvedValue(null);
    const req = { params: { slug: 'nope' } };
    const res = mockRes();
    await submissionController.publicResults(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns the service payload', async () => {
    programService.findBySlug.mockResolvedValue(PROGRAM);
    scoringService.publicResults.mockResolvedValue({ published: false, submissions: [] });
    const req = { params: { slug: 'bitrefill' } };
    const res = mockRes();
    await submissionController.publicResults(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ status: 'success', data: { published: false, submissions: [] } });
  });
});
