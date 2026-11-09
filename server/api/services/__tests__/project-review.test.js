// The overall review on project pages: strengths and possible weaknesses built
// only from the scores, with the rubric's own wording. Client logic, tested here.
import { describe, it, expect } from 'vitest';
import { projectReview, criterionName } from '../../../../client/src/lib/projectReview.ts';
import { getProgramProfile } from '../../../../client/src/lib/programProfiles.ts';

const rubric = getProgramProfile('free-society-hack-2026').tracks.find((t) => t.id === 'privacy').rubric;
const sc = (vals, avg = 1.5, bonus = 0) => ({
  score: 0,
  max: 16,
  judges: 6,
  criteria: [
    ...['works', 'private', 'easy', 'needed', 'continuing'].map((id) => ({ id, score: vals[id] ?? 1.5, max: 3, trackAvg: avg })),
    { id: 'bonus', score: bonus, max: 1, trackAvg: 0.2 },
  ],
});

describe('project review', () => {
  it('short criterion names from the rubric labels', () => {
    expect(rubric.criteria.map((c) => criterionName(c.label))).toEqual(['Works', 'Private', 'Easy', 'Needed', 'Continuing', 'Bonus']);
  });

  it('strengths: best margin over the track average first, max 2, with the rubric wording', () => {
    const r = projectReview(sc({ works: 3, private: 2.4, easy: 2 }), rubric);
    expect(r.strengths.map((l) => l.id)).toEqual(['works', 'private']);
    expect(r.strengths[0]).toMatchObject({ name: 'Works', score: 3, max: 3, trackAvg: 1.5 });
    expect(r.strengths[0].text).toBe(rubric.criteria.find((c) => c.id === 'works').levels[3]);
  });

  it('possible weaknesses: lowest first, never also a strength', () => {
    const r = projectReview(sc({ works: 3, needed: 0.4, continuing: 1 }), rubric);
    expect(r.weaknesses.map((l) => l.id)).toEqual(['needed', 'continuing']);
    expect(r.weaknesses[0].text).toBe(rubric.criteria.find((c) => c.id === 'needed').levels[0]);
    expect(r.weaknesses.some((l) => r.strengths.find((s) => s.id === l.id))).toBe(false);
  });

  it('empty when nothing stands out; bonus noted only when awarded', () => {
    const flat = projectReview(sc({}, 1.5), rubric);
    expect(flat.strengths).toEqual([]);
    expect(flat.weaknesses).toEqual([]);
    expect(flat.bonus).toBeNull();
    expect(projectReview(sc({}, 1.5, 0.5), rubric).bonus).toEqual({ score: 0.5, max: 1 });
  });
});
