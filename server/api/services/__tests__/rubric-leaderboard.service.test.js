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

describe('lean rows (listForJudgingTotals / listByProgramForTotals) give the same totals', () => {
  it('progress and leaderboard totals match the full rows', () => {
    const full = [
      { ...sub('p1'), details: { track: 'privacy', team: [{ name: 'X' }], about: 'long text' }, feedback: { a: 1 } },
      { ...sub('both', 'both'), details: { track: 'both', about: 'long text' } },
      { ...sub('nodetails'), details: null },
    ];
    // What the lean read returns: details reduced to { track } (null when no details).
    const lean = full.map((s) => ({ id: s.id, projectTitle: s.projectTitle, submitterName: s.submitterName, prizes: {}, ecosystemPrize: false, details: { track: s.details?.track ?? null } }));
    const scores = [
      { ...sc('p1', 'a@x.com', P(3, 3, 3, 3, 3, 1)), notes: 'great', session: 'am', checks: { v: true } },
      { ...sc('both', 'b@x.com', P(2, 2, 2, 2, 2, 0)), notes: 'ok' },
    ];
    const leanScores = scores.map(({ notes, session, checks, ...x }) => x);
    expect(computeJudgingProgress({ submissions: lean, scores: leanScores, judges })).toEqual(
      computeJudgingProgress({ submissions: full, scores, judges }),
    );
    const strip = (b) => ({ ...b, computedAt: null, rows: b.rows.map((r) => ({ ...r, judgeScores: r.judgeScores.map(({ notes, session, ...j }) => j) })) });
    const now = new Date('2026-11-11T00:00:00Z');
    expect(strip(computeLeaderboard({ track: 'privacy', submissions: lean, scores: leanScores, judges, now }))).toEqual(
      strip(computeLeaderboard({ track: 'privacy', submissions: full, scores, judges, now })),
    );
  });
});
