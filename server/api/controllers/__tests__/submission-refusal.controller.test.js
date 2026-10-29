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
const refusalRepo = (await import('../../repositories/submission-refusal.repository.js')).default;
const auditLog = (await import('../../services/program-audit-log.service.js')).default;
const submissionController = (await import('../submission.controller.js')).default;

const mockRes = () => {
  const res = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res;
};

const FSH = { id: 'fsh', slug: 'free-society-hack-2026', name: 'Free Society Hack', eventEndsAt: '2026-11-05T00:00:00+05:30' };
const details = {
  track: 'privacy', themes: ['1. Private payment rails'], pitch: 'Shielded checkout.', team: [], appType: 'CLI',
  technologies: ['WebZjs'], testnetTxid: 'd'.repeat(64), nextStep: 'Pilot.', nextStepLinks: [], frictionAreas: [], anonymous: false,
};
const body = {
  submitterName: 'Sam', lumaEmail: 'Sam@Example.com', projectTitle: 'Late Ledger', projectBrief: 'b',
  videoUrl: 'https://youtu.be/x', githubUrl: 'https://github.com/x/y', details, company: '',
};
const MASTER = { address: '5Master', chain: 'substrate', isGlobalAdmin: true, programSlug: FSH.slug };
const PROGRAM_ADMIN = { address: '5ProgAdmin', chain: 'substrate', isGlobalAdmin: false, programId: 'fsh' };
const refusal = (over = {}) => ({
  id: 'ref-1', programId: 'fsh', lumaEmail: 'sam@example.com', payload: body, reasonCode: 'not_checked_in',
  reason: 'Only checked-in attendees can submit.', status: 'refused', createdAt: '2026-11-04T14:20:00.000Z', ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  programService.findBySlug.mockResolvedValue(FSH);
  signupRepo.existsByEmail.mockResolvedValue(true);
  submissionRepo.findByEmail.mockResolvedValue(null);
  submissionRepo.create.mockImplementation(async (x) => ({ submission: { id: 'new-entry', ...x }, duplicate: false }));
  confirmationService.send.mockResolvedValue({ ok: true });
  refusalRepo.create.mockResolvedValue({ id: 'ref-1' });
  refusalRepo.setReviewed.mockImplementation(async (id, x) => ({ id, ...x }));
});

describe('submit records every refusal with its reason, answering as before', () => {
  it('not on the Luma list: 403, recorded as not_checked_in with the message shown', async () => {
    signupRepo.existsByEmail.mockResolvedValue(false);
    const res = mockRes();
    await submissionController.submit({ params: { slug: FSH.slug }, body }, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(refusalRepo.create).toHaveBeenCalledWith({
      programId: 'fsh', body, reasonCode: 'not_checked_in',
      reason: 'Only checked-in attendees can submit. Use the email you checked in with on Luma.',
    });
    expect(auditLog.logSafe).toHaveBeenCalledWith(expect.objectContaining({ action: 'submission.refused', metadata: expect.objectContaining({ reasonCode: 'not_checked_in', email: 'sam@example.com' }) }));
  });

  it('invalid fields: 400, recorded as invalid with the validation message', async () => {
    const res = mockRes();
    await submissionController.submit({ params: { slug: FSH.slug }, body: { ...body, details: { ...details, testnetTxid: 'nope' } } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(refusalRepo.create.mock.calls[0][0]).toMatchObject({ reasonCode: 'invalid', reason: 'A testnet transaction id is 64 hex characters' });
  });

  it('a broken base field is recorded too', async () => {
    const res = mockRes();
    await submissionController.submit({ params: { slug: FSH.slug }, body: { ...body, videoUrl: 'not a url' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(refusalRepo.create.mock.calls[0][0].reasonCode).toBe('invalid');
  });

  it('a failure to record never changes the answer', async () => {
    signupRepo.existsByEmail.mockResolvedValue(false);
    refusalRepo.create.mockRejectedValue(new Error('db down'));
    const res = mockRes();
    await submissionController.submit({ params: { slug: FSH.slug }, body }, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('honeypot hits and attempts with no usable email are not recorded', async () => {
    await submissionController.submit({ params: { slug: FSH.slug }, body: { ...body, company: 'spam inc' } }, mockRes());
    await submissionController.submit({ params: { slug: FSH.slug }, body: { ...body, lumaEmail: 'nope' } }, mockRes());
    expect(refusalRepo.create).not.toHaveBeenCalled();
  });

  it('an accepted submission is not recorded as a refusal', async () => {
    const res = mockRes();
    await submissionController.submit({ params: { slug: FSH.slug }, body }, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(refusalRepo.create).not.toHaveBeenCalled();
  });
});

describe('listRefusals', () => {
  it('returns the program\'s refusals', async () => {
    refusalRepo.listByProgram.mockResolvedValue([refusal()]);
    const res = mockRes();
    await submissionController.listRefusals({ params: { slug: FSH.slug }, user: PROGRAM_ADMIN }, res);
    expect(refusalRepo.listByProgram).toHaveBeenCalledWith('fsh');
    expect(res.json).toHaveBeenCalledWith({ status: 'success', data: [refusal()] });
  });
});

describe('acceptRefusal (master admin only)', () => {
  const req = (user = MASTER, id = 'ref-1') => ({ params: { slug: FSH.slug, refusalId: id }, user });

  it('creates the entry with the attempt\'s time and details, marks it accepted, logs it', async () => {
    refusalRepo.findById.mockResolvedValue(refusal());
    const res = mockRes();
    await submissionController.acceptRefusal(req(), res);
    expect(res.status).toHaveBeenCalledWith(200);
    const created = submissionRepo.create.mock.calls[0][0];
    expect(created).toMatchObject({
      programId: 'fsh', lumaEmail: 'Sam@Example.com', createdAt: '2026-11-04T14:20:00.000Z', acceptedFromRefusalId: 'ref-1', late: false,
    });
    expect(created.details).toMatchObject({ track: 'privacy', testnetTxid: 'd'.repeat(64) });
    expect(refusalRepo.setReviewed).toHaveBeenCalledWith('ref-1', { status: 'accepted', reviewedBy: '5Master', acceptedSubmissionId: 'new-entry' });
    expect(auditLog.logSafe).toHaveBeenCalledWith(expect.objectContaining({ action: 'submission.refusal_accepted', targetId: 'new-entry' }));
  });

  it('refuses a program admin who is not a master admin', async () => {
    const res = mockRes();
    await submissionController.acceptRefusal(req(PROGRAM_ADMIN), res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(submissionRepo.create).not.toHaveBeenCalled();
  });

  it('422s stored data that still doesn\'t validate', async () => {
    refusalRepo.findById.mockResolvedValue(refusal({ reasonCode: 'invalid', payload: { ...body, details: { ...details, testnetTxid: 'nope' } } }));
    const res = mockRes();
    await submissionController.acceptRefusal(req(), res);
    expect(res.status).toHaveBeenCalledWith(422);
    expect(submissionRepo.create).not.toHaveBeenCalled();
  });

  it('409s when that email already has an entry, or the refusal is already accepted', async () => {
    refusalRepo.findById.mockResolvedValue(refusal());
    submissionRepo.findByEmail.mockResolvedValue({ id: 'existing' });
    const res = mockRes();
    await submissionController.acceptRefusal(req(), res);
    expect(res.status).toHaveBeenCalledWith(409);
    refusalRepo.findById.mockResolvedValue(refusal({ status: 'accepted' }));
    const res2 = mockRes();
    await submissionController.acceptRefusal(req(), res2);
    expect(res2.status).toHaveBeenCalledWith(409);
  });

  it('404s a refusal from another program', async () => {
    refusalRepo.findById.mockResolvedValue(refusal({ programId: 'other' }));
    const res = mockRes();
    await submissionController.acceptRefusal(req(), res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('a dismissed refusal can still be accepted later', async () => {
    refusalRepo.findById.mockResolvedValue(refusal({ status: 'dismissed' }));
    const res = mockRes();
    await submissionController.acceptRefusal(req(), res);
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

describe('dismissRefusal (master admin only)', () => {
  it('marks it dismissed (kept) and logs it', async () => {
    refusalRepo.findById.mockResolvedValue(refusal());
    const res = mockRes();
    await submissionController.dismissRefusal({ params: { slug: FSH.slug, refusalId: 'ref-1' }, user: { ...MASTER, programId: 'fsh' } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(refusalRepo.setReviewed).toHaveBeenCalledWith('ref-1', { status: 'dismissed', reviewedBy: '5Master' });
    expect(auditLog.logSafe).toHaveBeenCalledWith(expect.objectContaining({ action: 'submission.refusal_dismissed' }));
  });
  it('refuses a program admin', async () => {
    const res = mockRes();
    await submissionController.dismissRefusal({ params: { slug: FSH.slug, refusalId: 'ref-1' }, user: PROGRAM_ADMIN }, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
