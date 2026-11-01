import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../db.js', async () => {
  const { createFakeSupabase } = await import('../../../sim/fakeSupabase.js');
  return { supabase: createFakeSupabase().supabase };
});

const repo = (await import('../submission-experience-rating.repository.js')).default;

describe('SubmissionExperienceRatingRepository', () => {
  it('stores one row per category and a resubmit overwrites instead of duplicating', async () => {
    await repo.upsertForSubmission({ submissionId: 's1', programId: 'p1', ratings: { overall: 2, tools: 3 } });
    await repo.upsertForSubmission({ submissionId: 's1', programId: 'p1', ratings: { overall: 5, tools: 4 } });
    const rows = await repo.listByProgramId('p1');
    expect(rows).toHaveLength(2);
    expect(Object.fromEntries(rows.map((r) => [r.category, r.score]))).toEqual({ overall: 5, tools: 4 });
    expect(rows[0]).toMatchObject({ submissionId: 's1', programId: 'p1' });
  });

  it('does nothing for empty ratings', async () => {
    expect(await repo.upsertForSubmission({ submissionId: 's9', programId: 'p9', ratings: null })).toEqual([]);
    expect(await repo.listByProgramId('p9')).toEqual([]);
  });

  it('averages per category within one program, to one decimal', async () => {
    await repo.upsertForSubmission({ submissionId: 'a', programId: 'p2', ratings: { overall: 4, support: 5 } });
    await repo.upsertForSubmission({ submissionId: 'b', programId: 'p2', ratings: { overall: 5, support: 5 } });
    await repo.upsertForSubmission({ submissionId: 'c', programId: 'p2', ratings: { overall: 4 } });
    await repo.upsertForSubmission({ submissionId: 'x', programId: 'other', ratings: { overall: 1 } });
    expect(await repo.aggregateByProgram('p2')).toEqual({
      overall: { avg: 4.3, count: 3 },
      support: { avg: 5, count: 2 },
    });
    expect(await repo.aggregateByProgram('empty')).toEqual({});
  });
});
