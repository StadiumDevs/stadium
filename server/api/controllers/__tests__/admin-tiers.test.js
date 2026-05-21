import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../repositories/app-admin.repository.js', () => ({
  default: {
    list: vi.fn(),
    add: vi.fn(),
    remove: vi.fn(),
    count: vi.fn(),
    isAppAdmin: vi.fn(),
  },
}));
vi.mock('../../repositories/global-admin.repository.js', () => ({
  default: { list: vi.fn(), add: vi.fn(), remove: vi.fn() },
}));

const appRepo = (await import('../../repositories/app-admin.repository.js')).default;
const globalRepo = (await import('../../repositories/global-admin.repository.js')).default;
const ctrl = await import('../admin-tiers.controller.js');

const res = () => {
  const r = {};
  r.status = vi.fn(() => r);
  r.json = vi.fn(() => r);
  r.end = vi.fn(() => r);
  return r;
};

const REQUESTING_ADMIN = { user: { chain: 'substrate', address: '5Alice', tier: 'app' } };

describe('admin-tiers.controller — app admins', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lists app admins', async () => {
    appRepo.list.mockResolvedValue([{ wallet: '5A', label: 'Sacha' }]);
    const r = res();
    await ctrl.listAppAdmins({ ...REQUESTING_ADMIN }, r);
    expect(r.status).toHaveBeenCalledWith(200);
    expect(r.json).toHaveBeenCalledWith({ status: 'success', data: [{ wallet: '5A', label: 'Sacha' }] });
  });

  it('rejects add with invalid chain', async () => {
    const r = res();
    await ctrl.addAppAdmin(
      { ...REQUESTING_ADMIN, body: { walletChain: 'bitcoin', wallet: '5A' } },
      r,
    );
    expect(r.status).toHaveBeenCalledWith(422);
    expect(appRepo.add).not.toHaveBeenCalled();
  });

  it('rejects add with empty wallet', async () => {
    const r = res();
    await ctrl.addAppAdmin(
      { ...REQUESTING_ADMIN, body: { walletChain: 'substrate', wallet: '' } },
      r,
    );
    expect(r.status).toHaveBeenCalledWith(422);
  });

  it('returns 422 when repo rejects address normalization', async () => {
    appRepo.add.mockResolvedValue(null);
    const r = res();
    await ctrl.addAppAdmin(
      { ...REQUESTING_ADMIN, body: { walletChain: 'ethereum', wallet: 'not-an-address' } },
      r,
    );
    expect(r.status).toHaveBeenCalledWith(422);
  });

  it('records addedBy from the calling admin', async () => {
    appRepo.add.mockImplementation((p) => Promise.resolve({ ...p }));
    const r = res();
    await ctrl.addAppAdmin(
      { ...REQUESTING_ADMIN, body: { walletChain: 'substrate', wallet: '5Bob', label: 'Bob' } },
      r,
    );
    expect(appRepo.add).toHaveBeenCalledWith(
      expect.objectContaining({
        walletChain: 'substrate',
        wallet: '5Bob',
        label: 'Bob',
        addedBy: 'substrate:5Alice',
      }),
    );
    expect(r.status).toHaveBeenCalledWith(201);
  });

  it('refuses to remove the last app admin', async () => {
    appRepo.count.mockResolvedValue(1);
    const r = res();
    await ctrl.removeAppAdmin(
      { params: { wallet: '5Alice' }, query: { chain: 'substrate' }, user: REQUESTING_ADMIN.user },
      r,
    );
    expect(r.status).toHaveBeenCalledWith(409);
    expect(appRepo.remove).not.toHaveBeenCalled();
  });

  it('allows removing one when ≥ 2 app admins exist', async () => {
    appRepo.count.mockResolvedValue(2);
    appRepo.remove.mockResolvedValue(true);
    const r = res();
    await ctrl.removeAppAdmin(
      { params: { wallet: '5Bob' }, query: { chain: 'substrate' }, user: REQUESTING_ADMIN.user },
      r,
    );
    expect(appRepo.remove).toHaveBeenCalledWith('substrate', '5Bob');
    expect(r.status).toHaveBeenCalledWith(204);
  });
});

describe('admin-tiers.controller — global admins', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lists global admins', async () => {
    globalRepo.list.mockResolvedValue([{ wallet: '5G' }]);
    const r = res();
    await ctrl.listGlobalAdmins({ ...REQUESTING_ADMIN }, r);
    expect(r.status).toHaveBeenCalledWith(200);
  });

  it('does NOT enforce a last-one guard on global admins', async () => {
    // Distinct from app_admins — global_admins can be cleared, env fallback
    // still provides at least one admin path.
    globalRepo.remove.mockResolvedValue(true);
    const r = res();
    await ctrl.removeGlobalAdmin(
      { params: { wallet: '5Bob' }, query: { chain: 'substrate' }, user: REQUESTING_ADMIN.user },
      r,
    );
    expect(appRepo.count).not.toHaveBeenCalled();
    expect(globalRepo.remove).toHaveBeenCalled();
    expect(r.status).toHaveBeenCalledWith(204);
  });
});
