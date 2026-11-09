import { describe, it, expect } from 'vitest';
import { publicScores, rubricMax } from '../public-scores.service.js';
import { computeLeaderboard } from '../rubric-leaderboard.service.js';

const sub = (id, track) => ({ id, projectTitle: id, submitterName: 'x', status: 'submitted', details: { track } });
const judges = ['a@x', 'b@x', 'c@x'].map((email) => ({ email, tracks: ['privacy'] }));
const score = (submissionId, judgeEmail, v) => ({
  submissionId,
  judgeEmail,
  track: 'privacy',
  criteria: { works: v, private: v, easy: v, needed: v, continuing: v, bonus: 0 },
});

describe('public card scores', () => {
  const submissions = [sub('p1', 'privacy'), sub('p2', 'both'), sub('p3', 'privacy'), sub('g1', 'agentic')];
  const scores = [score('p1', 'a@x', 3), score('p1', 'b@x', 2), score('p2', 'a@x', 1), score('p2', 'c@x', 2)];
  const boards = {
    privacy: computeLeaderboard({ track: 'privacy', submissions, scores, judges }),
    agentic: computeLeaderboard({ track: 'agentic', submissions, scores, judges }),
  };

  it('scores only scored projects in tracks with scoring judges, never per-judge data', () => {
    const { bySubmission, judgesByTrack } = publicScores({ boards, ranking: { privacy: { normalized: false } } });
    expect(judgesByTrack).toEqual({ privacy: 3 });
    expect(bySubmission.get('p1')).toMatchObject({ privacy: { score: 12.5, max: rubricMax('privacy'), judges: 2 } });
    expect(bySubmission.get('p2')).toMatchObject({ privacy: { score: 7.5, max: 16, judges: 2 } });
    expect(bySubmission.has('p3')).toBe(false);
    expect(bySubmission.has('g1')).toBe(false);
    expect(JSON.stringify([...bySubmission.entries()])).not.toMatch(/@/);
  });

  it('skips a track judged outside Stadium', () => {
    const agentic = computeLeaderboard({
      track: 'agentic',
      submissions,
      scores: [{ submissionId: 'g1', judgeEmail: 'a@x', track: 'agentic', criteria: { requirements: 4, techStack: 4, innovation: 4 } }],
      judges: [{ email: 'a@x', tracks: ['agentic'] }],
    });
    const all = publicScores({ boards: { ...boards, agentic }, ranking: null });
    const without = publicScores({ boards: { ...boards, agentic }, ranking: null, unscoredTrack: 'agentic' });
    expect(Object.keys(without.judgesByTrack)).toEqual(['privacy']);
    expect(without.bySubmission.has('g1')).toBe(false);
    expect(all.judgesByTrack.agentic).toBe(1);
    expect(all.bySubmission.get('g1')).toMatchObject({ agentic: { score: 12, max: 15, judges: 1 } });
  });

  it('per category: the raw averages when ranked raw, with the track average and max', () => {
    const { bySubmission } = publicScores({ boards, ranking: { privacy: { normalized: false } } });
    const crit = bySubmission.get('p1').privacy.criteria;
    expect(crit.map((c) => c.id)).toEqual(['works', 'private', 'easy', 'needed', 'continuing', 'bonus']);
    // p1: judges gave 3 and 2 on every criterion -> 2.5; p2: 1 and 2 -> 1.5; track average 2.
    expect(crit.find((c) => c.id === 'works')).toEqual({ id: 'works', score: 2.5, max: 3, trackAvg: 2 });
    expect(crit.find((c) => c.id === 'bonus')).toEqual({ id: 'bonus', score: 0, max: 1, trackAvg: 0 });
  });

  it('per category: the normalized values when the track was ranked normalized', () => {
    const row = boards.privacy.rows.find((r) => r.submissionId === 'p1');
    const { bySubmission } = publicScores({ boards, ranking: { privacy: { normalized: true } } });
    const works = bySubmission.get('p1').privacy.criteria.find((c) => c.id === 'works');
    const expected = row.normByCriterion ? Math.round(row.normByCriterion.works * 10) / 10 : 2.5;
    expect(works.score).toBe(expected);
  });

  it('uses the normalized total when the track was ranked normalized at publish', () => {
    const row = boards.privacy.rows.find((r) => r.submissionId === 'p1');
    const { bySubmission } = publicScores({ boards, ranking: { privacy: { normalized: true } } });
    const expected = row.normTotal != null ? Math.round(row.normTotal * 10) / 10 : 12.5;
    expect(bySubmission.get('p1').privacy.score).toBe(expected);
  });
});
