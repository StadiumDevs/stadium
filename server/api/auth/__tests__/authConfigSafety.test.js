import { describe, it, expect, vi, beforeAll } from 'vitest';
import { Keyring } from '@polkadot/keyring';
import { cryptoWaitReady, encodeAddress, decodeAddress } from '@polkadot/util-crypto';
import { u8aToHex } from '@polkadot/util';
import {
  DEV_ACCOUNTS,
  devAccountName,
  isDevAccount,
  isProductionRuntime,
  findEnvProblems,
  findAdminRowProblems,
  checkAuthConfigAtStartup,
  UnsafeAuthConfigError,
} from '../authConfigSafety.js';

const ALICE = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
const BOB = '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty';
// A real, non-dev substrate address (the generic //Alice//1 derivation is not
// in the list; use an arbitrary key instead).
const NOT_DEV = encodeAddress(new Uint8Array(32).fill(7), 42);
const SAFE_PROD_ENV = { NODE_ENV: 'production', EXPECTED_DOMAIN: 'stadium.joinwebzero.com' };
const silent = () => ({ error: vi.fn(), warn: vi.fn() });

describe('DEV_ACCOUNTS', () => {
  beforeAll(async () => {
    await cryptoWaitReady();
  });

  it('matches what the public dev seed actually derives', () => {
    for (const [uri, type, address] of DEV_ACCOUNTS) {
      const derived = new Keyring({ type, ss58Format: 42 }).addFromUri(uri).address;
      expect(`${uri} ${type} ${address}`).toBe(`${uri} ${type} ${derived}`);
    }
  });

  it('covers Alice–Ferdie for sr25519, ed25519 and ecdsa, plus sr25519 stash', () => {
    const names = ['Alice', 'Bob', 'Charlie', 'Dave', 'Eve', 'Ferdie'];
    for (const n of names) {
      for (const type of ['sr25519', 'ed25519', 'ecdsa']) {
        expect(DEV_ACCOUNTS.some(([u, t]) => u === `//${n}` && t === type)).toBe(true);
      }
      expect(DEV_ACCOUNTS.some(([u]) => u === `//${n}//stash`)).toBe(true);
    }
  });
});

describe('devAccountName', () => {
  it('recognises SS58-42', () => {
    expect(devAccountName('substrate', ALICE)).toBe('//Alice (sr25519)');
  });

  it('recognises other SS58 prefixes of the same key (Polkadot 0, Kusama 2)', () => {
    const pk = decodeAddress(ALICE);
    expect(devAccountName('substrate', encodeAddress(pk, 0))).toBe('//Alice (sr25519)');
    expect(devAccountName('substrate', encodeAddress(pk, 2))).toBe('//Alice (sr25519)');
  });

  it('recognises the normalized public-key hex the admin tables store', () => {
    const hex = u8aToHex(decodeAddress(BOB));
    expect(devAccountName('substrate', hex)).toBe('//Bob (sr25519)');
    expect(devAccountName('substrate', hex.toUpperCase().replace('0X', '0x'))).toBe('//Bob (sr25519)');
  });

  it('returns null for non-dev, invalid and non-substrate input', () => {
    expect(devAccountName('substrate', NOT_DEV)).toBeNull();
    expect(devAccountName('substrate', 'not-an-address')).toBeNull();
    expect(devAccountName('substrate', '')).toBeNull();
    expect(devAccountName('substrate', undefined)).toBeNull();
    expect(devAccountName('ethereum', ALICE)).toBeNull();
    expect(isDevAccount('substrate', NOT_DEV)).toBe(false);
    expect(isDevAccount('substrate', ALICE)).toBe(true);
  });
});

describe('isProductionRuntime', () => {
  it.each([
    [{ NODE_ENV: 'production' }, true],
    [{ RAILWAY_ENVIRONMENT_NAME: 'production' }, true],
    [{ NODE_ENV: 'development', RAILWAY_ENVIRONMENT_NAME: 'production' }, true],
    [{ NODE_ENV: 'development' }, false],
    [{ NODE_ENV: 'test', RAILWAY_ENVIRONMENT_NAME: 'staging' }, false],
    [{}, false],
  ])('%o → %s', (env, expected) => {
    expect(isProductionRuntime(env)).toBe(expected);
  });
});

describe('findEnvProblems', () => {
  it('accepts a safe production env', () => {
    expect(findEnvProblems({ ...SAFE_PROD_ENV, ADMIN_WALLETS: NOT_DEV })).toEqual([]);
  });

  it('flags a dev account in ADMIN_WALLETS under any SS58 prefix', () => {
    const aliceOnPolkadot = encodeAddress(decodeAddress(ALICE), 0);
    const problems = findEnvProblems({ ...SAFE_PROD_ENV, ADMIN_WALLETS: `${NOT_DEV},${aliceOnPolkadot}` });
    expect(problems).toEqual(['ADMIN_WALLETS contains dev account //Alice (sr25519)']);
  });

  it('flags chain-tagged dev accounts in AUTHORIZED_SIGNERS', () => {
    const problems = findEnvProblems({ ...SAFE_PROD_ENV, AUTHORIZED_SIGNERS: `substrate:${BOB}` });
    expect(problems).toEqual(['AUTHORIZED_SIGNERS contains dev account //Bob (sr25519)']);
  });

  it('checks both lists even though the runtime only reads one', () => {
    const problems = findEnvProblems({ ...SAFE_PROD_ENV, ADMIN_WALLETS: ALICE, AUTHORIZED_SIGNERS: BOB });
    expect(problems).toHaveLength(2);
  });

  it('flags DISABLE_SIWS_DOMAIN_CHECK=true', () => {
    expect(findEnvProblems({ ...SAFE_PROD_ENV, DISABLE_SIWS_DOMAIN_CHECK: 'true' })).toEqual([
      'DISABLE_SIWS_DOMAIN_CHECK=true disables SIWS domain binding',
    ]);
  });

  it('flags EXPECTED_DOMAIN unset, blank or localhost', () => {
    expect(findEnvProblems({ NODE_ENV: 'production' })[0]).toMatch(/EXPECTED_DOMAIN is unset/);
    expect(findEnvProblems({ NODE_ENV: 'production', EXPECTED_DOMAIN: '  ' })[0]).toMatch(/unset/);
    expect(findEnvProblems({ NODE_ENV: 'production', EXPECTED_DOMAIN: 'localhost' })).toEqual([
      'EXPECTED_DOMAIN is "localhost"',
    ]);
  });
});

describe('findAdminRowProblems', () => {
  it('flags dev accounts in each admin table, by stored hex', () => {
    const aliceHex = u8aToHex(decodeAddress(ALICE));
    const problems = findAdminRowProblems({
      appAdmins: [{ walletChain: 'substrate', wallet: aliceHex }],
      globalAdmins: [{ walletChain: 'substrate', wallet: u8aToHex(decodeAddress(NOT_DEV)) }],
      programAdmins: [{ walletChain: 'substrate', wallet: aliceHex, programId: 'p1' }],
    });
    expect(problems).toEqual([
      'app_admins contains dev account //Alice (sr25519)',
      'program_admins contains dev account //Alice (sr25519) (program p1)',
    ]);
  });

  it('ignores other chains and empty input', () => {
    expect(findAdminRowProblems({ globalAdmins: [{ walletChain: 'ethereum', wallet: '0xabc' }] })).toEqual([]);
    expect(findAdminRowProblems({})).toEqual([]);
  });
});

describe('checkAuthConfigAtStartup', () => {
  it('does nothing outside production (and never touches the DB)', async () => {
    const loadAdminRows = vi.fn();
    const out = await checkAuthConfigAtStartup({
      env: { NODE_ENV: 'development', ADMIN_WALLETS: ALICE },
      loadAdminRows,
      enforce: true,
      logger: silent(),
    });
    expect(out).toEqual({ skipped: true, problems: [], adminRowsChecked: false });
    expect(loadAdminRows).not.toHaveBeenCalled();
  });

  it('warn-only: logs UNSAFE_AUTH_CONFIG and does not throw', async () => {
    const logger = silent();
    const out = await checkAuthConfigAtStartup({
      env: { NODE_ENV: 'production', ADMIN_WALLETS: ALICE },
      loadAdminRows: async () => ({}),
      enforce: false,
      logger,
    });
    expect(out.problems).toHaveLength(2); // Alice + EXPECTED_DOMAIN unset
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('UNSAFE_AUTH_CONFIG'));
  });

  it('enforce: throws UnsafeAuthConfigError listing every problem', async () => {
    await expect(
      checkAuthConfigAtStartup({
        env: { ...SAFE_PROD_ENV },
        loadAdminRows: async () => ({ globalAdmins: [{ walletChain: 'substrate', wallet: BOB }] }),
        enforce: true,
        logger: silent(),
      }),
    ).rejects.toBeInstanceOf(UnsafeAuthConfigError);
  });

  it('enforce: a safe production config passes', async () => {
    const out = await checkAuthConfigAtStartup({
      env: { ...SAFE_PROD_ENV, ADMIN_WALLETS: NOT_DEV },
      loadAdminRows: async () => ({ appAdmins: [{ walletChain: 'substrate', wallet: NOT_DEV }] }),
      enforce: true,
      logger: silent(),
    });
    expect(out).toEqual({ skipped: false, problems: [], adminRowsChecked: true });
  });

  it('retries the admin-table load, then continues if the DB stays down', async () => {
    const logger = silent();
    const loadAdminRows = vi.fn().mockRejectedValue(new Error('ECONNRESET'));
    const out = await checkAuthConfigAtStartup({
      env: { ...SAFE_PROD_ENV },
      loadAdminRows,
      enforce: true,
      logger,
      attempts: 3,
      retryDelayMs: 0,
    });
    expect(loadAdminRows).toHaveBeenCalledTimes(3);
    expect(out).toEqual({ skipped: false, problems: [], adminRowsChecked: false });
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Could not load admin tables'));
  });

  it('treats a hung admin-table load as a failed attempt (no boot hang)', async () => {
    const loadAdminRows = vi.fn(() => new Promise(() => {}));
    const out = await checkAuthConfigAtStartup({
      env: { ...SAFE_PROD_ENV },
      loadAdminRows,
      enforce: true,
      logger: silent(),
      attempts: 2,
      retryDelayMs: 0,
      attemptTimeoutMs: 20,
    });
    expect(loadAdminRows).toHaveBeenCalledTimes(2);
    expect(out.adminRowsChecked).toBe(false);
  });

  it('a transient failure followed by success still checks the tables', async () => {
    const loadAdminRows = vi
      .fn()
      .mockRejectedValueOnce(new Error('blip'))
      .mockResolvedValueOnce({ appAdmins: [{ walletChain: 'substrate', wallet: ALICE }] });
    await expect(
      checkAuthConfigAtStartup({
        env: { ...SAFE_PROD_ENV },
        loadAdminRows,
        enforce: true,
        logger: silent(),
        retryDelayMs: 0,
      }),
    ).rejects.toThrow(/app_admins contains dev account \/\/Alice/);
  });
});
