import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../db.js', () => ({
  supabase: { from: vi.fn() },
}));

const { supabase } = await import('../../../db.js');
const repo = (await import('../wallet-contact.repository.js')).default;

function makeChain(overrides = {}) {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
    upsert: vi.fn(() => chain),
    single: vi.fn(() => Promise.resolve({ data: null, error: null })),
    ...overrides,
  };
  return chain;
}

describe('WalletContactRepository.findByWallet', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns null when no row exists', async () => {
    const chain = makeChain();
    supabase.from.mockReturnValue(chain);

    const result = await repo.findByWallet('5Alice');
    expect(result).toBeNull();
    expect(chain.eq).toHaveBeenCalledWith('wallet_address', '5Alice');
    expect(chain.maybeSingle).toHaveBeenCalled();
  });

  it('throws when supabase returns an error', async () => {
    const chain = makeChain({
      maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: new Error('db error') })),
    });
    supabase.from.mockReturnValue(chain);

    await expect(repo.findByWallet('5Alice')).rejects.toThrow('db error');
  });

  it('returns the camelCase-transformed row when a row exists', async () => {
    const row = {
      wallet_address: '5Alice',
      email: 'alice@example.com',
      notifications_enabled: true,
      created_at: '2026-04-23T00:00:00Z',
      updated_at: '2026-04-23T00:00:00Z',
    };
    const chain = makeChain({
      maybeSingle: vi.fn(() => Promise.resolve({ data: row, error: null })),
    });
    supabase.from.mockReturnValue(chain);

    const result = await repo.findByWallet('5Alice');
    expect(result).toEqual({
      walletAddress: '5Alice',
      email: 'alice@example.com',
      notificationsEnabled: true,
      createdAt: '2026-04-23T00:00:00Z',
      updatedAt: '2026-04-23T00:00:00Z',
    });
  });
});

describe('WalletContactRepository.upsertByWallet', () => {
  beforeEach(() => vi.clearAllMocks());

  function mockFindAndUpsert({ existingRow = null, returnedRow }) {
    // findByWallet uses: from().select().eq().maybeSingle()
    // upsertByWallet uses: from().upsert().select().single()
    // We need supabase.from to return different chain shapes on successive calls.
    const singleFn = vi.fn(() => Promise.resolve({ data: returnedRow, error: null }));
    const upsertSelectFn = vi.fn(() => ({ single: singleFn }));
    const upsertFn = vi.fn(() => ({ select: upsertSelectFn }));

    const findChain = makeChain({
      maybeSingle: vi.fn(() => Promise.resolve({ data: existingRow, error: null })),
    });

    supabase.from
      .mockReturnValueOnce(findChain)        // findByWallet call
      .mockReturnValueOnce({ upsert: upsertFn }); // upsert call

    return { upsertFn, singleFn };
  }

  it('calls upsert with the snake_case row shape and onConflict wallet_address', async () => {
    const returnedRow = {
      wallet_address: '5Alice',
      email: 'alice@example.com',
      notifications_enabled: true,
      created_at: '2026-04-23T00:00:00Z',
      updated_at: '2026-04-23T00:00:00Z',
    };
    const { upsertFn } = mockFindAndUpsert({ existingRow: null, returnedRow });

    await repo.upsertByWallet('5Alice', { email: 'alice@example.com', notificationsEnabled: true });

    expect(upsertFn).toHaveBeenCalledWith(
      expect.objectContaining({
        wallet_address: '5Alice',
        email: 'alice@example.com',
        notifications_enabled: true,
        updated_at: expect.any(String),
      }),
      { onConflict: 'wallet_address' },
    );
    const row = upsertFn.mock.calls[0][0];
    expect(() => new Date(row.updated_at)).not.toThrow();
    expect(new Date(row.updated_at).toISOString()).toBe(row.updated_at);
  });

  it('returns the camelCase-transformed result', async () => {
    const returnedRow = {
      wallet_address: '5Alice',
      email: 'alice@example.com',
      notifications_enabled: false,
      created_at: '2026-04-23T00:00:00Z',
      updated_at: '2026-04-23T01:00:00Z',
    };
    mockFindAndUpsert({ existingRow: null, returnedRow });

    const result = await repo.upsertByWallet('5Alice', { email: 'alice@example.com', notificationsEnabled: false });
    expect(result).toEqual({
      walletAddress: '5Alice',
      email: 'alice@example.com',
      notificationsEnabled: false,
      createdAt: '2026-04-23T00:00:00Z',
      updatedAt: '2026-04-23T01:00:00Z',
    });
  });

  it('preserves existing notificationsEnabled when it is absent from fields', async () => {
    // Regression: partial PUT with only { email } must not reset notificationsEnabled to true.
    const existingRow = {
      wallet_address: '5XYZ',
      email: 'old@x.com',
      notifications_enabled: false,
      created_at: '2026-04-23T00:00:00Z',
      updated_at: '2026-04-23T00:00:00Z',
    };
    const returnedRow = {
      ...existingRow,
      email: 'new@x.com',
      updated_at: '2026-04-23T01:00:00Z',
    };
    const { upsertFn } = mockFindAndUpsert({ existingRow, returnedRow });

    // Note: no notificationsEnabled key in fields
    const result = await repo.upsertByWallet('5XYZ', { email: 'new@x.com' });

    // The upsert row must carry the existing notifications_enabled value (false), not reset to true.
    expect(upsertFn).toHaveBeenCalledWith(
      expect.objectContaining({
        wallet_address: '5XYZ',
        email: 'new@x.com',
        notifications_enabled: false,
      }),
      { onConflict: 'wallet_address' },
    );
    expect(result.notificationsEnabled).toBe(false);
    expect(result.email).toBe('new@x.com');
  });

  it('preserves existing email when it is absent from fields', async () => {
    const existingRow = {
      wallet_address: '5XYZ',
      email: 'keep@x.com',
      notifications_enabled: true,
      created_at: '2026-04-23T00:00:00Z',
      updated_at: '2026-04-23T00:00:00Z',
    };
    const returnedRow = {
      ...existingRow,
      notifications_enabled: false,
      updated_at: '2026-04-23T01:00:00Z',
    };
    const { upsertFn } = mockFindAndUpsert({ existingRow, returnedRow });

    await repo.upsertByWallet('5XYZ', { notificationsEnabled: false });

    expect(upsertFn).toHaveBeenCalledWith(
      expect.objectContaining({
        wallet_address: '5XYZ',
        email: 'keep@x.com',
        notifications_enabled: false,
      }),
      { onConflict: 'wallet_address' },
    );
  });
});
