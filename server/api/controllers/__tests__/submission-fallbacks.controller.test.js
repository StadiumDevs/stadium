import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../auth/supabaseUser.js', () => ({
  getSupabaseUser: vi.fn(async (token) => (token && token.startsWith('tok:') ? { id: 'u', email: token.slice(4) } : null)),
  extractSupabaseToken: (req) => req.headers?.['x-supabase-token'] ?? null,
}));
vi.mock('../../services/program.service.js', () => ({ default: { findBySlug: vi.fn() } }));
vi.mock('../../repositories/program-submission.repository.js', () => ({
  default: { create: vi.fn(), findById: vi.fn(), findByEmail: vi.fn(), updateSubmission: vi.fn(), listByProgramId: vi.fn() },
}));
vi.mock('../../repositories/program-signup.repository.js', () => ({ default: { existsByEmail: vi.fn() } }));
vi.mock('../../repositories/submission-refusal.repository.js', () => ({ default: { create: vi.fn(async () => ({ id: 'ref' })) } }));
vi.mock('../../services/submission-confirmation.service.js', () => ({ default: { send: vi.fn(async () => ({ ok: true })) } }));
vi.mock('../../services/luma-sync.service.js', () => ({ default: { isActive: vi.fn(() => true), syncProgram: vi.fn() } }));
vi.mock('../../services/program-audit-log.service.js', () => ({ default: { logSafe: vi.fn() } }));

const programService = (await import('../../services/program.service.js')).default;
const submissionRepo = (await import('../../repositories/program-submission.repository.js')).default;
const signupRepo = (await import('../../repositories/program-signup.repository.js')).default;
const refusalRepo = (await import('../../repositories/submission-refusal.repository.js')).default;
const mail = (await import('../../services/submission-confirmation.service.js')).default;
const luma = (await import('../../services/luma-sync.service.js')).default;
const submissionController = (await import('../submission.controller.js')).default;

const mockRes = () => {
  const res = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res;
};
// Synced just now, so an unverified miss does NOT re-sync (the 25 s floor).
const FSH = {
  id: 'fsh',
  slug: 'free-society-hack-2026',
  name: 'Free Society Hack',
  eventEndsAt: null,
  lastGuestSyncAt: new Date().toISOString(),
  lastGuestSyncStatus: 'ok',
  resultsPublishedAt: null,
};
const details = {
  track: 'privacy',
  themes: ['1. Private payment rails'],
  pitch: 'Checkout.',
  team: [{ name: 'Arjun', email: 'arjun@x.com', role: 'fe' }],
  appType: 'CLI',
  technologies: ['WebZjs'],
  testnetTxid: 'a'.repeat(64),
  nextStep: 'Pilot.',
  nextStepLinks: [],
  frictionAreas: [],
  anonymous: false,
};
const body = (email = 'walkin@example.com') => ({
  submitterName: 'Walk In',
  lumaEmail: email,
  projectTitle: 'Walk-in Wallet',
  projectBrief: 'b',
  videoUrl: 'https://youtu.be/x',
  githubUrl: 'https://github.com/x/y',
  details,
});
const run = async (b, token) => {
  const res = mockRes();
  await submissionController.submit(
    { params: { slug: FSH.slug }, headers: token ? { 'x-supabase-token': token } : {}, body: b },
    res,
  );
  return res;
};

beforeEach(() => {
  vi.clearAllMocks();
  programService.findBySlug.mockResolvedValue(FSH);
  submissionRepo.findByEmail.mockResolvedValue(null);
  submissionRepo.create.mockImplementation(async (x) => ({ submission: { id: 'new', ...x }, duplicate: false }));
  submissionRepo.updateSubmission.mockImplementation(async (id, x) => ({ id, ...x }));
  luma.syncProgram.mockResolvedValue({ status: 'ok' });
});

describe('submit — fallbacks and email verification', () => {
  it('unverified and not on the list: 403 with code not_checked_in, no forced re-sync (recent sync)', async () => {
    signupRepo.existsByEmail.mockResolvedValue(false);
    const res = await run(body());
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'not_checked_in' }));
    expect(luma.syncProgram).not.toHaveBeenCalled();
  });

  it('verified and found after a fresh Luma sync: created (201)', async () => {
    signupRepo.existsByEmail.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const res = await run(body(), 'tok:walkin@example.com');
    expect(luma.syncProgram).toHaveBeenCalledTimes(1); // forced despite the recent sync
    expect(res.status).toHaveBeenCalledWith(201);
    expect(submissionRepo.create).toHaveBeenCalled();
  });

  it('verified but still not on the list: held for approval (202), recorded as verified, pending email sent', async () => {
    signupRepo.existsByEmail.mockResolvedValue(false);
    const res = await run(body(), 'tok:walkin@example.com');
    expect(res.status).toHaveBeenCalledWith(202);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'pending', code: 'pending_review' }));
    expect(refusalRepo.create).toHaveBeenCalledWith(expect.objectContaining({ reasonCode: 'not_checked_in', emailVerified: true }));
    expect(submissionRepo.create).not.toHaveBeenCalled();
    expect(mail.send).toHaveBeenCalledWith(expect.objectContaining({ pendingReview: true, email: 'walkin@example.com' }));
  });

  it('a token for another email does not count as verified', async () => {
    signupRepo.existsByEmail.mockResolvedValue(false);
    const res = await run(body(), 'tok:someone.else@example.com');
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('the Luma feed being unreachable for a verified builder is a retry (503)', async () => {
    signupRepo.existsByEmail.mockResolvedValue(false);
    luma.syncProgram.mockResolvedValue({ status: 'error: timeout' });
    const res = await run(body(), 'tok:walkin@example.com');
    expect(res.status).toHaveBeenCalledWith(503);
  });

  it('updating an existing entry: 401 verify_to_update without a token, 200 with the matching one', async () => {
    signupRepo.existsByEmail.mockResolvedValue(true);
    submissionRepo.findByEmail.mockResolvedValue({ id: 'old', programId: 'fsh' });
    const denied = await run(body('priya@example.com'));
    expect(denied.status).toHaveBeenCalledWith(401);
    expect(denied.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'verify_to_update' }));
    expect(refusalRepo.create).toHaveBeenCalledWith(expect.objectContaining({ reasonCode: 'update_unverified' }));
    expect(submissionRepo.updateSubmission).not.toHaveBeenCalled();
    const wrong = await run(body('priya@example.com'), 'tok:mallory@example.com');
    expect(wrong.status).toHaveBeenCalledWith(401);
    const ok = await run(body('priya@example.com'), 'tok:priya@example.com');
    expect(ok.status).toHaveBeenCalledWith(200);
    expect(submissionRepo.updateSubmission).toHaveBeenCalledTimes(1);
  });

  it('the confirmation email carries the tracked details', async () => {
    signupRepo.existsByEmail.mockResolvedValue(true);
    await run(body());
    expect(mail.send).toHaveBeenCalledWith(expect.objectContaining({ details: expect.objectContaining({ track: 'privacy' }) }));
  });
});

describe('GET submissions/mine', () => {
  it("401 without a verified email; 404 with none; the caller's own entry otherwise", async () => {
    const r1 = mockRes();
    await submissionController.mySubmission({ params: { slug: FSH.slug }, headers: {} }, r1);
    expect(r1.status).toHaveBeenCalledWith(401);
    const r2 = mockRes();
    await submissionController.mySubmission({ params: { slug: FSH.slug }, headers: { 'x-supabase-token': 'tok:nobody@x.com' } }, r2);
    expect(r2.status).toHaveBeenCalledWith(404);
    submissionRepo.findByEmail.mockResolvedValue({ id: 's', lumaEmail: 'priya@example.com', projectTitle: 'Chai', details, prizeAmount: 1 });
    const r3 = mockRes();
    await submissionController.mySubmission({ params: { slug: FSH.slug }, headers: { 'x-supabase-token': 'tok:priya@example.com' } }, r3);
    expect(submissionRepo.findByEmail).toHaveBeenLastCalledWith('fsh', 'priya@example.com');
    const data = r3.json.mock.calls[0][0].data;
    expect(data).toMatchObject({ lumaEmail: 'priya@example.com', projectTitle: 'Chai', details });
    expect(data).not.toHaveProperty('prizeAmount');
  });
});

describe('GET submissions/public', () => {
  it('no emails anywhere; anonymous entries hide names; untracked programs 404', async () => {
    submissionRepo.listByProgramId.mockResolvedValue([
      { id: 'a', submitterName: 'Priya', lumaEmail: 'priya@example.com', projectTitle: 'Chai', details: { ...details, checkIns: [{ day: 14 }] } },
      { id: 'b', submitterName: 'Sid', lumaEmail: 'sid@example.com', projectTitle: 'Memo', details: { ...details, anonymous: true } },
    ]);
    const res = mockRes();
    await submissionController.publicSubmissions({ params: { slug: FSH.slug } }, res);
    const data = res.json.mock.calls[0][0].data;
    const text = JSON.stringify(data);
    expect(text).not.toMatch(/@/);
    expect(text).not.toContain('checkIns');
    expect(data.published).toBe(false);
    expect(data.submissions[0].details.team).toEqual([{ name: 'Arjun', role: 'fe' }]);
    expect(data.submissions[1].submitterName).toBe('Anonymous');
    expect(data.submissions[1].details.team).toEqual([{ name: 'Teammate', role: 'fe' }]);
    const r404 = mockRes();
    await submissionController.publicSubmissions({ params: { slug: 'bitrefill-2026' } }, r404);
    expect(r404.status).toHaveBeenCalledWith(404);
  });
});
