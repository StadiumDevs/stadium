import { describe, it, expect } from 'vitest';
import { fitJudgeOffsets, normalizeTrack, normalizeValues } from '../score-normalization.service.js';
import { computeLeaderboard } from '../rubric-leaderboard.service.js';

const e = (submissionId, judgeEmail, x) => ({ submissionId, judgeEmail, x });
const one = [{ id: 't', max: 20 }];
const row = (submissionId, judgeEmail, t) => ({ submissionId, judgeEmail, criteria: { t } });

describe('normalizeValues', () => {
  // A: p1 10, p2 8, p3 6 (mean 8, SD 2). B: p1 14, p2 12 (mean 13, SD √2).
  // Grand: 10, 8, 6, 14, 12 → mean 10, SD √10.
  const entries = [e('p1', 'A', 10), e('p2', 'A', 8), e('p3', 'A', 6), e('p1', 'B', 14), e('p2', 'B', 12)];

  it('mean-centers judges below the z-score minimum (hand-checked)', () => {
    const { byProject, judges } = normalizeValues(entries, { minScoresForZ: 8 });
    // A: 10 + (x − 8) → 12, 10, 8. B: 10 + (x − 13) → 11, 9.
    expect(byProject.get('p1').value).toBeCloseTo(11.5, 9);
    expect(byProject.get('p2').value).toBeCloseTo(9.5, 9);
    expect(byProject.get('p3').value).toBeCloseTo(8, 9);
    expect(judges.get('A')).toMatchObject({ n: 3, mean: 8, method: 'center' });
    expect(judges.get('A').sd).toBeCloseTo(2, 9);
  });

  it('z-scores judges at the minimum and rescales to grand mean + grand SD × z (hand-checked)', () => {
    const { byProject, judges } = normalizeValues(entries, { minScoresForZ: 2 });
    const g = Math.sqrt(10);
    const zB = 1 / Math.SQRT2;
    expect(judges.get('B').method).toBe('zscore');
    expect(byProject.get('p1').value).toBeCloseTo((10 + g * 1 + 10 + g * zB) / 2, 9);
    expect(byProject.get('p2').value).toBeCloseTo((10 + 10 - g * zB) / 2, 9);
    expect(byProject.get('p3').value).toBeCloseTo(10 - g, 9);
  });

  it('a judge with SD 0 falls back to mean-centering, with no NaN', () => {
    const flat = Array.from({ length: 9 }, (_, i) => e(`p${i}`, 'F', 5)).concat(
      Array.from({ length: 9 }, (_, i) => e(`p${i}`, 'G', i)),
    );
    const { byProject, judges } = normalizeValues(flat, { minScoresForZ: 8 });
    expect(judges.get('F').method).toBe('center');
    expect(judges.get('G').method).toBe('zscore');
    for (const p of byProject.values()) expect(Number.isFinite(p.value)).toBe(true);
  });

  it('a single score yields finite values; zero is a valid score', () => {
    const { byProject } = normalizeValues([e('p', 'A', 0)], { minScoresForZ: 8 });
    expect(byProject.get('p').value).toBe(0);
  });

  it('clips to the range when given one', () => {
    const { byProject } = normalizeValues([e('p1', 'A', 3), e('p2', 'A', 0), e('p1', 'B', 3), e('p2', 'B', 3)], {
      minScoresForZ: 8,
      range: [0, 3],
    });
    // Grand mean 2.25. A (mean 1.5) gives p1 2.25 + 1.5 = 3.75 and B (mean 3)
    // gives 2.25, so p1 averages exactly 3; nothing leaves 0..3.
    for (const p of byProject.values()) {
      expect(p.value).toBeLessThanOrEqual(3);
      expect(p.value).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('fitJudgeOffsets', () => {
  it('recovers an additive judge bias on domain-assigned data', () => {
    // Quality 4..15. Three panel judges score everything exactly; L scores only
    // the first 6 (its domain) at +1.5.
    const entries = [];
    for (let i = 0; i < 12; i += 1) {
      for (const j of ['A', 'B', 'C']) entries.push(e(`p${i}`, j, 4 + i));
      if (i < 6) entries.push(e(`p${i}`, 'L', 4 + i + 1.5));
    }
    const { quality, bias } = fitJudgeOffsets(entries);
    expect(bias.get('L') - bias.get('A')).toBeCloseTo(1.5, 6);
    expect([...bias.values()].reduce((a, b) => a + b, 0)).toBeCloseTo(0, 9);
    for (let i = 1; i < 12; i += 1) expect(quality.get(`p${i}`) - quality.get(`p${i - 1}`)).toBeCloseTo(1, 6);
  });
});

describe('normalizeTrack', () => {
  // 12 projects, quality 4..15. Three panel judges score all of them exactly;
  // a lenient judge L scores every other one at +5.
  const lenientTrack = () => {
    const scores = [];
    for (let i = 0; i < 12; i += 1) {
      for (const j of ['A', 'B', 'C']) scores.push(row(`p${i}`, j, 4 + i));
      if (i % 2 === 0) scores.push(row(`p${i}`, 'L', 4 + i + 5));
    }
    return scores;
  };
  const order = (m) => [...m.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
  const truth = Array.from({ length: 12 }, (_, i) => `p${11 - i}`);

  it("corrects a lenient judge: raw ranking is wrong, normalized and offset rankings are right", () => {
    const scores = lenientTrack();
    const raw = new Map();
    for (let i = 0; i < 12; i += 1) {
      const xs = scores.filter((s) => s.submissionId === `p${i}`).map((s) => s.criteria.t);
      raw.set(`p${i}`, xs.reduce((a, b) => a + b, 0) / xs.length);
    }
    expect(order(raw)).not.toEqual(truth);

    const { projects, judgeStats } = normalizeTrack({ criteria: one, scores, config: { minScoresForZ: 6 } });
    expect(order(new Map([...projects].map(([id, p]) => [id, p.normTotal])))).toEqual(truth);
    expect(order(new Map([...projects].map(([id, p]) => [id, p.offsetTotal])))).toEqual(truth);
    const L = judgeStats.find((j) => j.judgeEmail === 'L');
    const A = judgeStats.find((j) => j.judgeEmail === 'A');
    expect(L.bias - A.bias).toBeCloseTo(5, 6);
    expect(L.method).toBe('zscore');
  });

  it("switches a judge to z-scores at the minimum and moves every project that judge scored", () => {
    const base = [];
    for (let i = 0; i < 8; i += 1) base.push(row(`p${i}`, 'A', i), row(`p${i}`, 'B', 2 * i));
    const seven = base.filter((s) => !(s.judgeEmail === 'B' && s.submissionId === 'p7'));
    const before = normalizeTrack({ criteria: one, scores: seven });
    const after = normalizeTrack({ criteria: one, scores: base });
    expect(before.judgeStats.find((j) => j.judgeEmail === 'B').method).toBe('center');
    expect(after.judgeStats.find((j) => j.judgeEmail === 'B').method).toBe('zscore');
    // p0 wasn't edited, but B's 8th score changed B's method, mean and SD.
    expect(after.projects.get('p0').normTotal).not.toBeCloseTo(before.projects.get('p0').normTotal, 6);
  });

  it('normalizes each criterion within its range and leaves bonus raw', () => {
    const criteria = [{ id: 'works', max: 3 }, { id: 'bonus', max: 1 }];
    const scores = [
      { submissionId: 'p1', judgeEmail: 'A', criteria: { works: 3, bonus: 1 } },
      { submissionId: 'p2', judgeEmail: 'A', criteria: { works: 0, bonus: 0 } },
      { submissionId: 'p1', judgeEmail: 'B', criteria: { works: 3, bonus: 1 } },
      { submissionId: 'p2', judgeEmail: 'B', criteria: { works: 3, bonus: 1 } },
    ];
    const { projects } = normalizeTrack({ criteria, bonusIds: ['bonus'], scores });
    expect(projects.get('p1').normByCriterion.bonus).toBe(1);
    expect(projects.get('p2').normByCriterion.bonus).toBe(0.5);
    for (const p of projects.values()) {
      expect(p.normByCriterion.works).toBeGreaterThanOrEqual(0);
      expect(p.normByCriterion.works).toBeLessThanOrEqual(3);
    }
    expect(projects.get('p1').normByCriterion.works).toBeGreaterThan(projects.get('p2').normByCriterion.works);
  });
});

describe('leaderboard with normalization', () => {
  const sub = (id) => ({ id, projectTitle: id, submitterName: id, details: { track: 'privacy' }, prizes: {}, ecosystemPrize: false });
  const P = (works, priv, easy, needed, continuing, bonus) => ({ works, private: priv, easy, needed, continuing, bonus });
  const sc = (submissionId, judgeEmail, criteria) => ({ submissionId, judgeEmail, track: 'privacy', criteria });
  const judges = [
    { email: 'a@x.com', name: 'A', tracks: ['privacy'] },
    { email: 'h@x.com', name: 'Harsh', tracks: ['privacy'] },
  ];

  it('ranks by normalized total, keeps the raw rank and the rank change', () => {
    // 'mid' is scored only by the lenient judge A (12); 'good' only by the harsh
    // judge H (11). A's mean is 9, H's is 5.5; centered on the grand mean 7.25, good (12.75) beats mid (10.25).
    const submissions = [sub('good'), sub('mid'), sub('lowA'), sub('lowH'), sub('unscored')];
    const scores = [
      sc('mid', 'a@x.com', P(3, 3, 2, 2, 2, 0)), // 12
      sc('lowA', 'a@x.com', P(1, 1, 1, 1, 2, 0)), // 6
      sc('good', 'h@x.com', P(3, 2, 2, 2, 2, 0)), // 11
      sc('lowH', 'h@x.com', P(0, 0, 0, 0, 0, 0)), // 0 is a valid score
    ];
    const b = computeLeaderboard({ track: 'privacy', submissions, scores, judges, now: new Date('2026-11-08T12:00:00Z') });
    const by = Object.fromEntries(b.rows.map((r) => [r.submissionId, r]));
    expect(b.rows.map((r) => r.submissionId)).toEqual(['good', 'mid', 'lowA', 'lowH', 'unscored']);
    expect(by.good).toMatchObject({ rank: 1, normRank: 1, rawRank: 2, rankChange: 1 });
    expect(by.mid).toMatchObject({ rank: 2, rawRank: 1, rankChange: -1 });
    expect(by.unscored).toMatchObject({ normTotal: null, judgeCount: 0 });
    expect(by.lowH.winnerBlocked).toMatch(/Works score is 0/);
    expect(b.normalization).toMatchObject({ enabled: true, method: 'zscore', minScoresForZ: 8 });
    expect(b.computedAt).toBe('2026-11-08T12:00:00.000Z');
    expect(b.judgeStats.map((j) => [j.judgeEmail, j.method])).toEqual([
      ['a@x.com', 'center'],
      ['h@x.com', 'center'],
    ]);
    expect(by.good.judgeScores[0]).toMatchObject({ method: 'center' });
    expect(by.good.normContribution === undefined).toBe(true);
    expect(typeof by.good.judgeScores[0].normContribution).toBe('number');
  });
});
