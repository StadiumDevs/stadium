import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../db.js', () => ({
  supabase: { from: vi.fn() },
}));

const { supabase } = await import('../../../db.js');
const repo = (await import('../submission-rubric-score.repository.js')).default;

function makeChain(overrides = {}) {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    upsert: vi.fn(() => chain),
    single: vi.fn(() => Promise.resolve({ data: null, error: null })),
    ...overrides,
  };
  return chain;
}

const row = {
  id: 'r1',
  submission_id: 's1',
  program_id: 'p1',
  judge_email: 'judge@x.com',
  track: 'privacy',
  criteria: { works: 3, private: null },
  notes: null,
  session: 'evening',
  revisit: true,
  created_at: 't0',
  updated_at: 't1',
};

describe('SubmissionRubricScoreRepository', () => {
  beforeEach(() => vi.clearAllMocks());

  it('upserts on (submission, judge, track) with a lowercased email and transforms the row', async () => {
    const chain = makeChain({ single: vi.fn(() => Promise.resolve({ data: row, error: null })) });
    supabase.from.mockReturnValue(chain);
    const saved = await repo.upsert({
      submissionId: 's1',
      programId: 'p1',
      judgeEmail: ' Judge@X.com ',
      track: 'privacy',
      criteria: { works: 3, private: null },
      notes: '',
      session: 'evening',
      revisit: true,
    });
    expect(supabase.from).toHaveBeenCalledWith('submission_rubric_scores');
    const [payload, opts] = chain.upsert.mock.calls[0];
    expect(opts).toEqual({ onConflict: 'submission_id,judge_email,track' });
    expect(payload).toMatchObject({ submission_id: 's1', program_id: 'p1', judge_email: 'judge@x.com', track: 'privacy', notes: null, revisit: true });
    expect(saved).toMatchObject({ submissionId: 's1', judgeEmail: 'judge@x.com', track: 'privacy', criteria: { works: 3, private: null }, notes: '', session: 'evening', revisit: true });
  });

  it('lists one judge’s scores in a program', async () => {
    const chain = makeChain();
    chain.eq = vi.fn(() => chain);
    let calls = 0;
    chain.eq.mockImplementation(() => (++calls === 2 ? Promise.resolve({ data: [row], error: null }) : chain));
    supabase.from.mockReturnValue(chain);
    const list = await repo.listByJudge('p1', 'JUDGE@x.com');
    expect(chain.eq).toHaveBeenCalledWith('program_id', 'p1');
    expect(chain.eq).toHaveBeenCalledWith('judge_email', 'judge@x.com');
    expect(list).toHaveLength(1);
    expect(list[0].submissionId).toBe('s1');
  });

  it('throws on a database error', async () => {
    const chain = makeChain({ single: vi.fn(() => Promise.resolve({ data: null, error: new Error('db') })) });
    supabase.from.mockReturnValue(chain);
    await expect(
      repo.upsert({ submissionId: 's1', programId: 'p1', judgeEmail: 'j@x.com', track: 'privacy', criteria: {} }),
    ).rejects.toThrow('db');
  });
});
