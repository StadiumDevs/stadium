import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../db.js', () => ({
  supabase: { from: vi.fn() },
}));

const { supabase } = await import('../../../db.js');
const repo = (await import('../program.repository.js')).default;

const row = { id: 'p1', slug: 'fsh', name: 'FSH', content: { a: 1 }, created_at: 't0', updated_at: 't1' };

function makeChain(result) {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    order: vi.fn(() => chain),
    update: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
    single: vi.fn(() => Promise.resolve(result)),
    then: (resolve) => resolve(result),
  };
  return chain;
}

describe('ProgramRepository (egress)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repo.clearCache();
  });

  it('never selects * or the large stats_snapshot for program rows', async () => {
    const chain = makeChain({ data: row, error: null });
    supabase.from.mockReturnValue(chain);
    await repo.findBySlug('fsh');
    await repo.findById('p1');
    const listChain = makeChain({ data: [row], error: null });
    supabase.from.mockReturnValue(listChain);
    await repo.list();
    for (const c of [chain, listChain]) {
      for (const [cols] of c.select.mock.calls) {
        expect(cols).not.toBe('*');
        expect(cols).not.toMatch(/stats_snapshot/);
        expect(cols).toMatch(/results_ranking/);
      }
    }
  });

  it('serves repeat lookups from the cache, as copies', async () => {
    supabase.from.mockReturnValue(makeChain({ data: row, error: null }));
    const a = await repo.findBySlug('fsh');
    a.content.a = 99; // a caller mutating its copy must not touch the cache
    const b = await repo.findBySlug('fsh');
    expect(supabase.from).toHaveBeenCalledTimes(1);
    expect(b.content).toEqual({ a: 1 });
  });

  it('a write clears the cache so the next read is fresh', async () => {
    supabase.from.mockReturnValue(makeChain({ data: row, error: null }));
    await repo.findBySlug('fsh');
    supabase.from.mockReturnValue(makeChain({ data: { ...row, name: 'Renamed' }, error: null }));
    await repo.updateBySlug('fsh', { name: 'Renamed' });
    const after = await repo.findBySlug('fsh');
    expect(after.name).toBe('Renamed');
    expect(supabase.from).toHaveBeenCalledTimes(3);
  });

  it('the stats snapshot is cached per slug and cleared when republished', async () => {
    supabase.from.mockReturnValue(makeChain({ data: { stats_snapshot: { v: 1 } }, error: null }));
    expect(await repo.getStatsSnapshot('fsh')).toEqual({ v: 1 });
    expect(await repo.getStatsSnapshot('fsh')).toEqual({ v: 1 });
    expect(supabase.from).toHaveBeenCalledTimes(1);
    supabase.from.mockReturnValue(makeChain({ data: row, error: null }));
    await repo.setStatsSnapshot('fsh', { v: 2 }, 't2');
    supabase.from.mockReturnValue(makeChain({ data: { stats_snapshot: { v: 2 } }, error: null }));
    expect(await repo.getStatsSnapshot('fsh')).toEqual({ v: 2 });
  });
});
