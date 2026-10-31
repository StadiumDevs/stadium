import { describe, it, expect } from 'vitest';
import { computeLeaderboard, computeJudgingProgress, winnerBlockedReason } from '../rubric-leaderboard.service.js';

const sub = (id, track = 'privacy') => ({ id, projectTitle: id, submitterName: id, details: { track }, prizes: {}, ecosystemPrize: false });
const P = (works, priv, easy, needed, continuing, bonus) => ({ works, private: priv, easy, needed, continuing, bonus });
const sc = (submissionId, judgeEmail, criteria, track = 'privacy') => ({ submissionId, judgeEmail, track, criteria });
const judges = [
  { email: 'a@x.com', name: 'A', tracks: ['privacy'] },
  { email: 'b@x.com', name: 'B', tracks: ['privacy'] },
  { email: 'c@x.com', name: 'C', tracks: ['agentic'] },
];

describe('rubric leaderboard', () => {
  it('ranks by average total; ties go to Continuing, then Needed, and say which decided', () => {
    const submissions = [sub('low'), sub('needed'), sub('cont'), sub('top')];
    const scores = [
      sc('top', 'a@x.com', P(3, 3, 3, 3, 3, 1)),
      sc('cont', 'a@x.com', P(3, 2, 2, 2, 3, 0)), // 12, continuing 3
      sc('needed', 'a@x.com', P(3, 2, 2, 3, 2, 0)), // 12, continuing 2, needed 3
      sc('low', 'a@x.com', P(1, 1, 1, 1, 1, 0)),
      sc('low', 'b@x.com', P(1, 1, 1, 1, null, 0)), // partial: not counted
    ];
    const b = computeLeaderboard({ track: 'privacy', submissions, scores, judges });
    expect(b.rows.map((r) => [r.submissionId, r.rank, r.tieBrokenBy])).toEqual([
      ['top', 1, null],
      ['cont', 2, null],
      ['needed', 3, 'Continuing'],
      ['low', 4, null],
    ]);
    expect(b.judges).toEqual(['a@x.com', 'b@x.com']);
    expect(b.rows.find((r) => r.submissionId === 'low').judgeCount).toBe(1);
    expect(b.submissionsFullyScored).toBe(0);
  });

  it('a Both entry is ranked in each track; the Works-0 gate applies to Privacy only', () => {
    const submissions = [sub('both', 'both')];
    const scores = [sc('both', 'a@x.com', P(0, 3, 3, 3, 3, 0)), sc('both', 'c@x.com', { requirements: 5, techStack: 5, innovation: 5 }, 'agentic')];
    expect(computeLeaderboard({ track: 'agentic', submissions, scores, judges }).rows[0]).toMatchObject({ avgTotal: 15, winnerBlocked: null });
    expect(winnerBlockedReason('privacy', scores, 'both')).toMatch(/Works score is 0/);
    expect(winnerBlockedReason('agentic', scores, 'both')).toBeNull();
  });

  it('judging progress counts fully scored pairs in each judge tracks', () => {
    const submissions = [sub('p1'), sub('both', 'both'), sub('ag', 'agentic')];
    const scores = [sc('p1', 'a@x.com', P(1, 1, 1, 1, 1, 0)), sc('both', 'a@x.com', P(1, 1, null, 1, 1, 0))];
    const rows = computeJudgingProgress({ submissions, scores, judges });
    expect(rows.find((r) => r.name === 'A')).toMatchObject({ scored: 1, total: 2 });
    expect(rows.find((r) => r.name === 'C')).toMatchObject({ scored: 0, total: 2 });
  });
});
