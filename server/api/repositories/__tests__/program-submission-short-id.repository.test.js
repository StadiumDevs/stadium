import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../db.js', () => ({ supabase: { from: vi.fn() } }));

const { supabase } = await import('../../../db.js');
const repo = (await import('../program-submission.repository.js')).default;

const FULL = 'zcash-now-a-keyless-mcp-server-and-llms-txt-70fbde';
const row = { id: FULL, program_id: 'p1', project_title: 'Zcash Now' };

function chain(result) {
  const c = {
    select: vi.fn(() => c),
    eq: vi.fn(() => c),
    like: vi.fn(() => c),
    limit: vi.fn(() => Promise.resolve(result)),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
  };
  return c;
}

describe('ProgramSubmissionRepository.findByIdOrShortId', () => {
  beforeEach(() => vi.clearAllMocks());

  it('a full id resolves directly, only within its program', async () => {
    supabase.from.mockReturnValue(chain({ data: row, error: null }));
    expect((await repo.findByIdOrShortId('p1', FULL)).id).toBe(FULL);
    supabase.from.mockReturnValue(chain({ data: row, error: null }));
    expect(await repo.findByIdOrShortId('other', FULL)).toBeNull();
  });

  it('a shortened id resolves by program + prefix + suffix when exactly one entry matches', async () => {
    const miss = chain({ data: null, error: null });
    const hit = chain({ data: [row], error: null });
    supabase.from.mockReturnValueOnce(miss).mockReturnValueOnce(hit);
    const s = await repo.findByIdOrShortId('p1', 'zcash-now-a-keyless-mcp-server-70fbde');
    expect(s.id).toBe(FULL);
    expect(hit.eq).toHaveBeenCalledWith('program_id', 'p1');
    expect(hit.like).toHaveBeenCalledWith('id', 'zcash-now-a-keyless-mcp-server-%-70fbde');
  });

  it('two matches (ambiguous) or a value that is not a short id: null', async () => {
    supabase.from.mockReturnValueOnce(chain({ data: null, error: null })).mockReturnValueOnce(chain({ data: [row, { ...row, id: 'x' }], error: null }));
    expect(await repo.findByIdOrShortId('p1', 'zcash-now-a-keyless-mcp-server-70fbde')).toBeNull();
    supabase.from.mockReturnValueOnce(chain({ data: null, error: null }));
    expect(await repo.findByIdOrShortId('p1', 'nope')).toBeNull();
    expect(supabase.from).toHaveBeenCalledTimes(3);
  });
});
