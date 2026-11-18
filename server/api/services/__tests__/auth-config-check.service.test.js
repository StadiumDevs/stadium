import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../repositories/app-admin.repository.js', () => ({ default: { list: vi.fn() } }));
vi.mock('../../repositories/global-admin.repository.js', () => ({ default: { list: vi.fn() } }));
vi.mock('../../repositories/program-admin.repository.js', () => ({ default: { listAll: vi.fn() } }));

const appRepo = (await import('../../repositories/app-admin.repository.js')).default;
const globalRepo = (await import('../../repositories/global-admin.repository.js')).default;
const programRepo = (await import('../../repositories/program-admin.repository.js')).default;
const authConfig = await import('../../auth/authConfigSafety.js');
const svc = await import('../auth-config-check.service.js');

const ALICE_HEX = '0xd43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d';
const SAFE = { NODE_ENV: 'production', EXPECTED_DOMAIN: 'stadium.joinwebzero.com' };
const logger = () => ({ error: vi.fn(), warn: vi.fn() });

describe('auth-config-check.service (#301)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    appRepo.list.mockResolvedValue([]);
    globalRepo.list.mockResolvedValue([]);
    programRepo.listAll.mockResolvedValue([]);
  });

  it('ships warn-only (phase 2a)', () => {
    expect(svc.ENFORCE_SAFE_AUTH_CONFIG).toBe(false);
  });

  it('loads all three admin tables through the repositories', async () => {
    programRepo.listAll.mockResolvedValue([{ walletChain: 'substrate', wallet: ALICE_HEX, programId: 'p1' }]);
    const log = logger();
    const out = await svc.runStartupAuthConfigCheck({ env: SAFE, logger: log });
    expect(out.problems).toEqual(['program_admins contains dev account //Alice (sr25519) (program p1)']);
    expect(log.error).toHaveBeenCalledWith(expect.stringContaining('UNSAFE_AUTH_CONFIG'));
  });

  it('enforce mode: unsafe config still stops boot', async () => {
    globalRepo.list.mockResolvedValue([{ walletChain: 'substrate', wallet: ALICE_HEX }]);
    await expect(
      svc.runStartupAuthConfigCheck({ env: SAFE, logger: logger(), enforce: true }),
    ).rejects.toBeInstanceOf(authConfig.UnsafeAuthConfigError);
  });

  it('an unexpected bug in the check is logged and never stops boot', async () => {
    const log = logger();
    // An env whose reads throw simulates a bug inside the check itself.
    const brokenEnv = new Proxy({}, {
      get() {
        throw new TypeError('boom');
      },
    });
    const out = await svc.runStartupAuthConfigCheck({ env: brokenEnv, logger: log, enforce: true });
    expect(out.failed).toBe(true);
    expect(log.error).toHaveBeenCalledWith(expect.stringContaining('continuing boot'));
  });
});
