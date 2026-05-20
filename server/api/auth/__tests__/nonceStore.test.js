import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../db.js', () => ({
  supabase: { from: vi.fn() },
}));

const { supabase } = await import('../../../db.js');
const { consumeNonce } = await import('../nonceStore.js');

// from() -> supports insert(...) and delete().lt(...) (opportunistic cleanup).
function mockTable(insertResult) {
  return {
    insert: vi.fn(() => Promise.resolve(insertResult)),
    delete: vi.fn(() => ({ lt: vi.fn(() => Promise.resolve({ error: null })) })),
  };
}

const FUTURE = Date.now() + 600_000;

describe('consumeNonce', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns missing-nonce when the nonce is absent', async () => {
    const result = await consumeNonce('', FUTURE);
    expect(result).toEqual({ ok: false, reason: 'missing-nonce' });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('returns ok the first time a nonce is consumed', async () => {
    supabase.from.mockReturnValue(mockTable({ error: null }));
    const result = await consumeNonce('nonce-abc', FUTURE);
    expect(result).toEqual({ ok: true });
  });

  it('returns replay on a unique-violation (Postgres 23505)', async () => {
    supabase.from.mockReturnValue(mockTable({ error: { code: '23505' } }));
    const result = await consumeNonce('nonce-abc', FUTURE);
    expect(result).toEqual({ ok: false, reason: 'replay' });
  });

  it('rethrows a non-unique-violation database error', async () => {
    supabase.from.mockReturnValue(mockTable({ error: { code: '500', message: 'db down' } }));
    await expect(consumeNonce('nonce-abc', FUTURE)).rejects.toEqual({ code: '500', message: 'db down' });
  });
});
