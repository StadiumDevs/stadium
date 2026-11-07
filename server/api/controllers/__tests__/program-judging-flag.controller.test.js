import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../services/program.service.js', () => ({
  default: { findBySlug: vi.fn(), updateBySlug: vi.fn() },
}));
vi.mock('../../services/program-audit-log.service.js', () => ({ default: { logSafe: vi.fn() } }));

const programService = (await import('../../services/program.service.js')).default;
const programController = (await import('../program.controller.js')).default;

const PROGRAM = { id: 'p1', slug: 'free-society-hack-2026', judgingInProgress: false };
const PLATFORM_ADMIN = { isGlobalAdmin: true, address: '5Admin', chain: 'polkadot' };
const EVENT_ADMIN = { isGlobalAdmin: false, address: '5EventAdmin', chain: 'polkadot', programSlug: PROGRAM.slug };

const mockRes = () => {
  const res = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res;
};
const call = async (body, user) => {
  const res = mockRes();
  await programController.updateProgram({ params: { slug: PROGRAM.slug }, body, user }, res);
  return res;
};

beforeEach(() => {
  vi.clearAllMocks();
  programService.findBySlug.mockResolvedValue(PROGRAM);
  programService.updateBySlug.mockImplementation(async (_slug, patch) => ({ ...PROGRAM, ...patch }));
});

describe('updateProgram judgingInProgress (platform admin only)', () => {
  it('lets a platform admin turn judging in progress on', async () => {
    const res = await call({ judgingInProgress: true }, PLATFORM_ADMIN);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(programService.updateBySlug).toHaveBeenCalledWith(PROGRAM.slug, { judgingInProgress: true });
    expect(res.json.mock.calls[0][0].data.judgingInProgress).toBe(true);
  });

  it('lets a platform admin turn it back off', async () => {
    const res = await call({ judgingInProgress: false }, PLATFORM_ADMIN);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(programService.updateBySlug).toHaveBeenCalledWith(PROGRAM.slug, { judgingInProgress: false });
  });

  it('refuses an event admin', async () => {
    const res = await call({ judgingInProgress: true }, EVENT_ADMIN);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(programService.updateBySlug).not.toHaveBeenCalled();
  });

  it('refuses a request with no user', async () => {
    const res = await call({ judgingInProgress: true }, undefined);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(programService.updateBySlug).not.toHaveBeenCalled();
  });

  it('rejects a non-boolean value', async () => {
    const res = await call({ judgingInProgress: 'yes' }, PLATFORM_ADMIN);
    expect(res.status).toHaveBeenCalledWith(422);
    expect(programService.updateBySlug).not.toHaveBeenCalled();
  });

  it('still lets an event admin edit other fields', async () => {
    const res = await call({ location: 'Berlin' }, EVENT_ADMIN);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(programService.updateBySlug).toHaveBeenCalledWith(PROGRAM.slug, { location: 'Berlin' });
  });
});
