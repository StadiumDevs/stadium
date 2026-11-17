// POST /api/programs/:slug/admins must refuse well-known dev accounts in
// production (#301).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../services/program.service.js', () => ({
  default: { findBySlug: vi.fn() },
}));
vi.mock('../../repositories/program-admin.repository.js', () => ({
  default: { add: vi.fn(), list: vi.fn(), remove: vi.fn(), isAdmin: vi.fn() },
}));
vi.mock('../../services/program-audit-log.service.js', () => ({
  default: { logSafe: vi.fn() },
}));

const programService = (await import('../../services/program.service.js')).default;
const programAdminRepository = (await import('../../repositories/program-admin.repository.js')).default;
const programController = (await import('../program.controller.js')).default;

const ALICE = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';

const mockRes = () => {
  const res = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res;
};

describe('ProgramController.addAdmin — dev accounts (#301)', () => {
  const ORIGINAL = process.env.NODE_ENV;
  beforeEach(() => {
    vi.clearAllMocks();
    programService.findBySlug.mockResolvedValue({ id: 'prog-1', slug: 'demo' });
    programAdminRepository.add.mockResolvedValue({ programId: 'prog-1', walletChain: 'substrate', wallet: '0xabc' });
  });
  afterEach(() => {
    process.env.NODE_ENV = ORIGINAL;
  });

  it('returns 400 and does not insert in production', async () => {
    process.env.NODE_ENV = 'production';
    const res = mockRes();
    await programController.addAdmin(
      { params: { slug: 'demo' }, body: { walletChain: 'substrate', wallet: ALICE }, user: {} },
      res,
    );
    expect(res.status).toHaveBeenCalledWith(400);
    expect(programAdminRepository.add).not.toHaveBeenCalled();
  });

  it('allows dev accounts outside production', async () => {
    process.env.NODE_ENV = 'test';
    const res = mockRes();
    await programController.addAdmin(
      { params: { slug: 'demo' }, body: { walletChain: 'substrate', wallet: ALICE }, user: {} },
      res,
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(programAdminRepository.add).toHaveBeenCalled();
  });
});
