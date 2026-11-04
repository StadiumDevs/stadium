import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../services/program.service.js', () => ({ default: { findBySlug: vi.fn() } }));
vi.mock('../../repositories/program-submission.repository.js', () => ({
  default: { findById: vi.fn(), setTrack: vi.fn(), listByProgramId: vi.fn(), updateTracked: vi.fn() },
}));
vi.mock('../../repositories/submission-rubric-score.repository.js', () => ({ default: { listByProgram: vi.fn(async () => []) } }));
vi.mock('../../repositories/program-admin-email.repository.js', () => ({ default: { listJudges: vi.fn(async () => []) } }));
vi.mock('../../services/tx-check.service.js', () => ({ checkAndStore: vi.fn() }));
vi.mock('../../auth/supabaseUser.js', () => ({ extractSupabaseToken: vi.fn(), getSupabaseUser: vi.fn() }));
vi.mock('../../services/program-audit-log.service.js', () => ({ default: { logSafe: vi.fn() } }));

const programService = (await import('../../services/program.service.js')).default;
const submissionRepo = (await import('../../repositories/program-submission.repository.js')).default;
const auditLog = (await import('../../services/program-audit-log.service.js')).default;
const controller = (await import('../tracked-results.controller.js')).default;

const FSH = { id: 'fsh', slug: 'free-society-hack-2026' };
const ADMIN = { isGlobalAdmin: true, address: '5Admin', chain: 'polkadot' };
const entry = (over = {}) => ({ id: 's1', programId: 'fsh', track: null, details: { track: null, pitch: 'x' }, prizes: {}, ...over });

const mockRes = () => {
  const res = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res;
};
const call = async (body, user = ADMIN, params = {}) => {
  const res = mockRes();
  await controller.setTrack({ params: { slug: FSH.slug, submissionId: 's1', ...params }, body, user }, res);
  return res;
};

beforeEach(() => {
  vi.clearAllMocks();
  programService.findBySlug.mockResolvedValue(FSH);
  submissionRepo.findById.mockResolvedValue(entry());
  submissionRepo.setTrack.mockImplementation(async (id, track) => entry({ track, details: { track, pitch: 'x' } }));
});

describe('setTrack (platform admin)', () => {
  it('sets the track on an entry with none and audit-logs from/to', async () => {
    const res = await call({ track: 'privacy' });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(submissionRepo.setTrack).toHaveBeenCalledWith('s1', 'privacy');
    expect(res.json.mock.calls[0][0].data.details.track).toBe('privacy');
    expect(auditLog.logSafe).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'tracked.set_track', targetId: 's1', metadata: { from: null, to: 'privacy' } }),
    );
  });

  it('refuses anyone who is not a platform admin', async () => {
    const res = await call({ track: 'privacy' }, { role: 'admin', address: '5ProgramAdmin' });
    expect(res.status).toHaveBeenCalledWith(403);
    expect(submissionRepo.setTrack).not.toHaveBeenCalled();
  });

  it('rejects an unknown track', async () => {
    const res = await call({ track: 'gaming' });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(submissionRepo.setTrack).not.toHaveBeenCalled();
  });

  it("404s an entry from another program", async () => {
    submissionRepo.findById.mockResolvedValue(entry({ programId: 'other' }));
    const res = await call({ track: 'agentic' });
    expect(res.status).toHaveBeenCalledWith(404);
    expect(submissionRepo.setTrack).not.toHaveBeenCalled();
  });

  it('refuses to leave a track the entry holds a prize in', async () => {
    submissionRepo.findById.mockResolvedValue(
      entry({ track: 'both', details: { track: 'both' }, prizes: { privacy: { amount: 300, label: 'Privacy: 2nd' } } }),
    );
    const res = await call({ track: 'agentic' });
    expect(res.status).toHaveBeenCalledWith(409);
    expect(submissionRepo.setTrack).not.toHaveBeenCalled();
  });

  it('allows a change that keeps the prized track', async () => {
    submissionRepo.findById.mockResolvedValue(
      entry({ track: 'privacy', details: { track: 'privacy' }, prizes: { privacy: { amount: 300 } } }),
    );
    const res = await call({ track: 'both' });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(submissionRepo.setTrack).toHaveBeenCalledWith('s1', 'both');
  });

  it('is a no-op when the track is unchanged', async () => {
    submissionRepo.findById.mockResolvedValue(entry({ track: 'agentic', details: { track: 'agentic' } }));
    const res = await call({ track: 'agentic' });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(submissionRepo.setTrack).not.toHaveBeenCalled();
    expect(auditLog.logSafe).not.toHaveBeenCalled();
  });
});

describe('leaderboard leaves abandoned drafts out', () => {
  const rows = [
    { id: 'f', programId: 'fsh', status: 'submitted', projectTitle: 'Final', details: { track: 'privacy' }, prizes: {} },
    { id: 'd', programId: 'fsh', status: 'draft', projectTitle: 'Draft', details: { track: 'privacy' }, prizes: {} },
  ];
  const board = async (program) => {
    programService.findBySlug.mockResolvedValue(program);
    submissionRepo.listByProgramId.mockResolvedValue(rows);
    const res = mockRes();
    await controller.leaderboard({ params: { slug: FSH.slug, track: 'privacy' }, user: ADMIN }, res);
    return res.json.mock.calls[0][0].data.rows.map((r) => r.submissionId);
  };

  it('keeps a draft while submissions are open', async () => {
    expect((await board({ ...FSH, eventEndsAt: '2099-01-01T00:00:00Z' })).sort()).toEqual(['d', 'f']);
  });

  it('drops it once they have closed', async () => {
    expect(await board({ ...FSH, eventEndsAt: '2000-01-01T00:00:00Z' })).toEqual(['f']);
  });
});
