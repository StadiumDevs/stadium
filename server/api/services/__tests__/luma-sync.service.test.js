import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../luma.client.js', () => ({
  fetchEligibleGuests: vi.fn(),
  isConfigured: vi.fn(() => true),
}));
vi.mock('../../repositories/program-signup.repository.js', () => ({
  default: { replaceLumaGuests: vi.fn(), countBySource: vi.fn() },
}));
vi.mock('../../repositories/program.repository.js', () => ({
  default: { setGuestSyncState: vi.fn() },
}));

const luma = await import('../luma.client.js');
const signupRepo = (await import('../../repositories/program-signup.repository.js')).default;
const programRepo = (await import('../../repositories/program.repository.js')).default;
const service = (await import('../luma-sync.service.js')).default;

const PROGRAM = { id: 'prog-1', slug: 'bitrefill-2026', lumaEventId: 'evt-1' };
const G = (email) => ({ email, name: null });

beforeEach(() => {
  vi.clearAllMocks();
  luma.isConfigured.mockReturnValue(true);
  signupRepo.replaceLumaGuests.mockResolvedValue({ upserted: 0, removed: 0 });
  signupRepo.countBySource.mockResolvedValue(0);
  programRepo.setGuestSyncState.mockResolvedValue();
});

describe('lumaSyncService.isActive', () => {
  it('false without an event id', () => {
    expect(service.isActive({ id: 'p', lumaEventId: null })).toBe(false);
  });
  it('false when the server has no LUMA_API_KEY', () => {
    luma.isConfigured.mockReturnValue(false);
    expect(service.isActive(PROGRAM)).toBe(false);
  });
  it('true with both', () => {
    expect(service.isActive(PROGRAM)).toBe(true);
  });
});

describe('lumaSyncService.syncProgram', () => {
  it('not_configured short-circuits with no fetch', async () => {
    luma.isConfigured.mockReturnValue(false);
    const r = await service.syncProgram(PROGRAM);
    expect(r.status).toBe('not_configured');
    expect(luma.fetchEligibleGuests).not.toHaveBeenCalled();
  });

  it('ok: mirrors the checked-in set and stamps state', async () => {
    luma.fetchEligibleGuests.mockResolvedValue({
      total: 3,
      eligible: [G('a@x.io'), G('b@x.io')],
      truncated: false,
    });
    signupRepo.replaceLumaGuests.mockResolvedValue({ upserted: 2, removed: 0 });

    const r = await service.syncProgram(PROGRAM);
    expect(r).toMatchObject({ status: 'ok', checkedIn: 2, upserted: 2 });
    expect(signupRepo.replaceLumaGuests).toHaveBeenCalledWith('prog-1', [G('a@x.io'), G('b@x.io')]);
    expect(programRepo.setGuestSyncState).toHaveBeenCalledWith(
      'prog-1',
      expect.objectContaining({ status: 'ok' }),
    );
  });

  it('empty_guard: a 0-result sweep does NOT wipe a non-empty cache', async () => {
    luma.fetchEligibleGuests.mockResolvedValue({ total: 0, eligible: [], truncated: false });
    signupRepo.countBySource.mockResolvedValue(120); // cache currently has 120

    const r = await service.syncProgram(PROGRAM);
    expect(r.status).toBe('empty_guard');
    expect(signupRepo.replaceLumaGuests).not.toHaveBeenCalled();
    expect(programRepo.setGuestSyncState).toHaveBeenCalledWith(
      'prog-1',
      expect.objectContaining({ status: 'empty_guard' }),
    );
  });

  it('0 check-ins is allowed to write when the cache is also empty (pre-event)', async () => {
    luma.fetchEligibleGuests.mockResolvedValue({ total: 50, eligible: [], truncated: false });
    signupRepo.countBySource.mockResolvedValue(0);

    const r = await service.syncProgram(PROGRAM);
    expect(r.status).toBe('ok');
    expect(signupRepo.replaceLumaGuests).toHaveBeenCalledWith('prog-1', []);
  });

  it('truncated: never overwrites on a partial sweep', async () => {
    luma.fetchEligibleGuests.mockResolvedValue({ total: 9999, eligible: [G('a@x.io')], truncated: true });
    const r = await service.syncProgram(PROGRAM);
    expect(r.status).toBe('truncated');
    expect(signupRepo.replaceLumaGuests).not.toHaveBeenCalled();
  });

  it('error: surfaces error:<msg> and still stamps the timestamp', async () => {
    luma.fetchEligibleGuests.mockRejectedValue(new Error('Luma 429'));
    const r = await service.syncProgram(PROGRAM);
    expect(r.status).toMatch(/^error:/);
    expect(programRepo.setGuestSyncState).toHaveBeenCalledWith(
      'prog-1',
      expect.objectContaining({ status: expect.stringMatching(/^error:/) }),
    );
  });

  it('single-flight: concurrent syncs share one Luma sweep', async () => {
    let resolve;
    luma.fetchEligibleGuests.mockReturnValue(new Promise((r) => { resolve = r; }));
    const p1 = service.syncProgram(PROGRAM);
    const p2 = service.syncProgram(PROGRAM);
    resolve({ total: 1, eligible: [G('a@x.io')], truncated: false });
    await Promise.all([p1, p2]);
    expect(luma.fetchEligibleGuests).toHaveBeenCalledTimes(1);
  });
});
