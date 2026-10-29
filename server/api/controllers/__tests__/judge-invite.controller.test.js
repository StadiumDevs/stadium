import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../services/program.service.js', () => ({ default: { findBySlug: vi.fn() } }));
vi.mock('../../repositories/program-admin-email.repository.js', () => ({ default: { add: vi.fn() } }));
vi.mock('../../services/program-admin-invite.service.js', () => ({ default: { send: vi.fn() } }));
vi.mock('../../services/program-audit-log.service.js', () => ({ default: { logSafe: vi.fn() } }));

const programService = (await import('../../services/program.service.js')).default;
const repo = (await import('../../repositories/program-admin-email.repository.js')).default;
const inviteService = (await import('../../services/program-admin-invite.service.js')).default;
const programController = (await import('../program.controller.js')).default;

const mockRes = () => {
  const res = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res;
};
const req = (body, slug = 'free-society-hack-2026') => ({ params: { slug }, body, user: { address: '5Admin' } });

beforeEach(() => {
  vi.clearAllMocks();
  programService.findBySlug.mockImplementation(async (slug) => ({ id: slug === 'bitrefill-2026' ? 'bitrefill' : 'fsh', slug, name: 'P' }));
  repo.add.mockImplementation(async (programId, email, by, role, profile) => ({ programId, email, role, ...profile }));
  inviteService.send.mockResolvedValue({ ok: true });
});

describe('inviteAdminEmail — judge profile', () => {
  it('saves a judge with a name and their tracks', async () => {
    const res = mockRes();
    await programController.inviteAdminEmail(req({ email: 'judge-a@example.com', role: 'judge', name: ' Judge A ', tracks: ['privacy', 'privacy'] }), res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(repo.add).toHaveBeenCalledWith('fsh', 'judge-a@example.com', '5Admin', 'judge', { name: 'Judge A', tracks: ['privacy'] });
  });

  it('422s unknown or empty tracks', async () => {
    for (const tracks of [['defi'], [], 'privacy']) {
      const res = mockRes();
      await programController.inviteAdminEmail(req({ email: 'j@x.com', role: 'judge', tracks }), res);
      expect(res.status).toHaveBeenCalledWith(422);
    }
    expect(repo.add).not.toHaveBeenCalled();
  });

  it('422s tracks on a program with no judging tracks', async () => {
    const res = mockRes();
    await programController.inviteAdminEmail(req({ email: 'j@x.com', role: 'judge', tracks: ['privacy'] }, 'bitrefill-2026'), res);
    expect(res.status).toHaveBeenCalledWith(422);
  });

  it('422s a name over 100 characters', async () => {
    const res = mockRes();
    await programController.inviteAdminEmail(req({ email: 'j@x.com', role: 'judge', name: 'x'.repeat(101) }), res);
    expect(res.status).toHaveBeenCalledWith(422);
  });

  it('ignores tracks for an admin invite, and omits what was not sent', async () => {
    const res = mockRes();
    await programController.inviteAdminEmail(req({ email: 'a@x.com', role: 'admin', tracks: ['privacy'] }), res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(repo.add).toHaveBeenCalledWith('fsh', 'a@x.com', '5Admin', 'admin', {});
  });

  it('null tracks clears a restriction (every track); omitted tracks keeps what is stored', async () => {
    const res = mockRes();
    await programController.inviteAdminEmail(req({ email: 'j@x.com', role: 'judge', tracks: null }), res);
    expect(repo.add).toHaveBeenCalledWith('fsh', 'j@x.com', '5Admin', 'judge', { tracks: null });
    await programController.inviteAdminEmail(req({ email: 'j@x.com', role: 'judge' }), mockRes());
    expect(repo.add).toHaveBeenLastCalledWith('fsh', 'j@x.com', '5Admin', 'judge', {});
  });
});
