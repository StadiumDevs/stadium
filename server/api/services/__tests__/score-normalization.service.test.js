import { describe, it, expect } from 'vitest';
import { fitJudgeOffsets, normalizeTrack, normalizeValues } from '../score-normalization.service.js';
import { computeLeaderboard } from '../rubric-leaderboard.service.js';
import { RUBRICS } from '../../constants/rubrics.js';

const e = (submissionId, judgeEmail, x) => ({ submissionId, judgeEmail, x });
const one = [{ id: 't', max: 20 }];
const row = (submissionId, judgeEmail, t) => ({ submissionId, judgeEmail, criteria: { t } });
const sum = (ns) => ns.reduce((a, b) => a + b, 0);
const avg = (ns) => sum(ns) / ns.length;

/** Deterministic PRNG (Park–Miller) so the property tests are reproducible. */
const rng = (seed) => {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
};

// ─── Leaderboard fixtures (Privacy rubric: five criteria 0–3 plus a 0/1 bonus) ───
const PRIV = ['works', 'private', 'easy', 'needed', 'continuing'];
/** Privacy criteria adding up to `t` (0..15), filled left to right, bonus 0. */
const crit = (t, overrides = {}) => {
  const c = { bonus: 0 };
  let left = t;
  for (const id of PRIV) {
    c[id] = Math.min(3, left);
    left -= c[id];
  }
  return { ...c, ...overrides };
};
const sub = (id, track = 'privacy') => ({ id, projectTitle: id, submitterName: id, details: { track }, prizes: {}, ecosystemPrize: false });
const sc = (submissionId, judgeEmail, criteria, track = 'privacy') => ({ submissionId, judgeEmail, track, criteria });
const judge = (email, tracks = ['privacy']) => ({ email, name: email, tracks });
const NOW = new Date('2026-11-09T12:00:00Z');
const board = (submissions, scores, judges, track = 'privacy') => computeLeaderboard({ track, submissions, scores, judges, now: NOW });
const byId = (b) => Object.fromEntries(b.rows.map((r) => [r.submissionId, r]));

/**
 * Two judges with 10 shared projects: A is more lenient than B (by 2 on five
 * projects, by 1 on the other five), so the fit gives A +0.75, B −0.75.
 * X is scored only by B (raw 10 → normalized 10.75) and so passes F10.5, a
 * project both judges scored, which keeps its raw 10.5 but drops a rank.
 */
const lenientBoard = (xCriteria = crit(10)) => {
  const pairs = [
    [4, 2], [6, 4], [8, 6], [13, 11], [15, 13], // A − B = 2: raw 3, 5, 7, 12, 14
    [5, 4], [7, 6], [9, 8], [11, 10], [14, 13], // A − B = 1: raw 4.5, 6.5, 8.5, 10.5, 13.5
  ];
  const submissions = [];
  const scores = [];
  for (const [a, b] of pairs) {
    const id = `F${(a + b) / 2}`;
    submissions.push(sub(id));
    scores.push(sc(id, 'a@x', crit(a)), sc(id, 'b@x', crit(b)));
  }
  submissions.push(sub('X'), sub('unscored'));
  scores.push(sc('X', 'b@x', xCriteria));
  return { submissions, scores, judges: [judge('a@x'), judge('b@x')] };
};

/** A random Privacy track: judges with random leniency and random coverage. */
const randomTrack = (r) => {
  const nJudges = 2 + Math.floor(r() * 5);
  const nProjects = 5 + Math.floor(r() * 25);
  const judges = Array.from({ length: nJudges }, (_, j) => `j${j}`);
  const bias = judges.map(() => Math.round((r() - 0.5) * 4));
  const scores = [];
  for (let p = 0; p < nProjects; p += 1) {
    const quality = r() * 15;
    const full = r() < 0.5;
    const who = full ? judges : judges.filter(() => r() < 0.5);
    if (!who.length) who.push(judges[Math.floor(r() * nJudges)]);
    for (const j of who) {
      const b = bias[judges.indexOf(j)];
      const criteria = { bonus: r() < 0.3 ? 1 : 0 };
      for (const id of PRIV) criteria[id] = Math.max(0, Math.min(3, Math.round(quality / 5 + b / 5 + (r() - 0.5) * 2)));
      scores.push({ submissionId: `p${p}`, judgeEmail: j, criteria });
    }
  }
  // Every judge in the list has scored at least once (the fit's judge set).
  const scoring = [...new Set(scores.map((s) => s.judgeEmail))];
  return { scores, scoring };
};
const totalOf = (c) => sum(RUBRICS.privacy.map((k) => c[k.id] ?? 0));

describe('normalizeValues (z-score option)', () => {
  // A: p1 10, p2 8, p3 6 (mean 8, SD 2). B: p1 14, p2 12 (mean 13, SD √2).
  // Grand: 10, 8, 6, 14, 12 → mean 10, SD √10.
  const entries = [e('p1', 'A', 10), e('p2', 'A', 8), e('p3', 'A', 6), e('p1', 'B', 14), e('p2', 'B', 12)];

  it('mean-centers judges below the z-score minimum (hand-checked)', () => {
    const { byProject, judges } = normalizeValues(entries, { minScoresForZ: 8 });
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

  it('clips to the range when given one', () => {
    const { byProject } = normalizeValues([e('p1', 'A', 3), e('p2', 'A', 0), e('p1', 'B', 3), e('p2', 'B', 3)], {
      minScoresForZ: 8,
      range: [0, 3],
    });
    for (const p of byProject.values()) {
      expect(p.value).toBeLessThanOrEqual(3);
      expect(p.value).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('fitJudgeOffsets', () => {
  it('recovers an additive judge bias on domain-assigned data', () => {
    const entries = [];
    for (let i = 0; i < 12; i += 1) {
      for (const j of ['A', 'B', 'C']) entries.push(e(`p${i}`, j, 4 + i));
      if (i < 6) entries.push(e(`p${i}`, 'L', 4 + i + 1.5));
    }
    const { quality, bias } = fitJudgeOffsets(entries);
    expect(bias.get('L') - bias.get('A')).toBeCloseTo(1.5, 6);
    expect(sum([...bias.values()])).toBeCloseTo(0, 9);
    for (let i = 1; i < 12; i += 1) expect(quality.get(`p${i}`) - quality.get(`p${i - 1}`)).toBeCloseTo(1, 6);
  });

  it('a lenient judge pulls down only the projects other judges missed; a harsh one pushes them up', () => {
    // A, B, C score p0..p9 exactly at quality; L (+2) and H (−2) also score
    // every one of them, then each scores one project nobody else did.
    const entries = [];
    for (let i = 0; i < 10; i += 1) {
      for (const j of ['A', 'B', 'C']) entries.push(e(`p${i}`, j, 4 + i));
      entries.push(e(`p${i}`, 'L', 4 + i + 2), e(`p${i}`, 'H', 4 + i - 2));
    }
    entries.push(e('onlyL', 'L', 12), e('onlyH', 'H', 8));
    const { quality, bias } = fitJudgeOffsets(entries, { minScoresPerJudge: 8 });
    expect(bias.get('L')).toBeCloseTo(2, 6);
    expect(bias.get('H')).toBeCloseTo(-2, 6);
    expect(quality.get('onlyL')).toBeCloseTo(10, 6); // 12 − 2
    expect(quality.get('onlyH')).toBeCloseTo(10, 6); // 8 + 2
    for (let i = 0; i < 10; i += 1) expect(quality.get(`p${i}`)).toBeCloseTo(4 + i, 9);
  });
});

describe('offset model: projects every scoring judge scored keep their raw average', () => {
  it('holds on 200 random tracks (total and every criterion), and their relative order is the raw order', () => {
    const r = rng(20261109);
    let checked = 0;
    for (let t = 0; t < 200; t += 1) {
      const { scores, scoring } = randomTrack(r);
      const out = normalizeTrack({ criteria: RUBRICS.privacy, bonusIds: ['bonus'], scores });
      if (!out.available) continue;
      const full = [];
      for (const [id, p] of out.projects) {
        const mine = scores.filter((s) => s.submissionId === id);
        if (new Set(mine.map((s) => s.judgeEmail)).size !== scoring.length) continue;
        const raw = avg(mine.map((s) => totalOf(s.criteria)));
        expect(Math.abs(p.normTotal - raw)).toBeLessThan(1e-9);
        for (const c of PRIV) expect(Math.abs(p.normByCriterion[c] - avg(mine.map((s) => s.criteria[c])))).toBeLessThan(1e-9);
        full.push({ id, raw, norm: p.normTotal });
        checked += 1;
      }
      const rawOrder = [...full].sort((a, b) => b.raw - a.raw || a.id.localeCompare(b.id)).map((x) => x.id);
      const normOrder = [...full].sort((a, b) => b.norm - a.norm || a.id.localeCompare(b.id)).map((x) => x.id);
      // Equal raw values can differ by ~1e-15 after the fit, so compare by value.
      expect(normOrder.map((id) => full.find((x) => x.id === id).raw)).toEqual(rawOrder.map((id) => full.find((x) => x.id === id).raw));
    }
    expect(checked).toBeGreaterThan(500);
  });

  it('when every judge scored every project, nothing moves: normTotal = avgTotal and no rank changes', () => {
    const submissions = [];
    const scores = [];
    for (let i = 0; i < 9; i += 1) {
      submissions.push(sub(`p${i}`));
      scores.push(sc(`p${i}`, 'a@x', crit(i + 3)), sc(`p${i}`, 'b@x', crit(i + 1)), sc(`p${i}`, 'c@x', crit(Math.min(15, i + 5))));
    }
    const b = board(submissions, scores, [judge('a@x'), judge('b@x'), judge('c@x')]);
    expect(b.normalization.available).toBe(true);
    for (const r of b.rows) {
      expect(r.fullyScored).toBe(true);
      expect(r.normTotal).toBeCloseTo(r.avgTotal, 12);
      expect(r.rankChange).toBe(0);
    }
    // a sits in the middle, b is 2 lower and c 2 higher: biases 0, −2, +2.
    expect(b.judgeStats.find((j) => j.judgeEmail === 'a@x').bias).toBeCloseTo(0, 9);
    expect(b.judgeStats.find((j) => j.judgeEmail === 'b@x').bias).toBeCloseTo(-2, 9);
    expect(b.judgeStats.find((j) => j.judgeEmail === 'c@x').bias).toBeCloseTo(2, 9);
  });

  it("a fully scored project keeps its score but its rank can change when a partly scored one passes it", () => {
    const { submissions, scores, judges } = lenientBoard();
    const b = board(submissions, scores, judges);
    const by = byId(b);
    expect(b.judgeStats.find((j) => j.judgeEmail === 'a@x').bias).toBeCloseTo(0.75, 9);
    expect(b.judgeStats.find((j) => j.judgeEmail === 'b@x').bias).toBeCloseTo(-0.75, 9);
    expect(by.X).toMatchObject({ avgTotal: 10, rawRank: 5, normRank: 4, rankChange: 1, fullyScored: false });
    expect(by.X.normTotal).toBeCloseTo(10.75, 9);
    expect(by['F10.5']).toMatchObject({ avgTotal: 10.5, rawRank: 4, normRank: 5, rankChange: -1, fullyScored: true });
    expect(by['F10.5'].normTotal).toBeCloseTo(10.5, 12);
    expect(by['F10.5'].coverage).toEqual({ scored: 2, of: 2 });
    expect(by.X.coverage).toEqual({ scored: 1, of: 2 });
  });
});

describe('who counts as "every judge"', () => {
  it('assigning an extra judge with no scores changes nothing', () => {
    const { submissions, scores, judges } = lenientBoard();
    const before = board(submissions, scores, judges);
    const after = board(submissions, scores, [...judges, judge('idle@x'), judge('idle2@x', [])]);
    expect(after.judges).toContain('idle@x');
    expect(after.rows).toEqual(before.rows);
    expect(after.judgeStats).toEqual(before.judgeStats);
    expect(after.normalization).toEqual(before.normalization);
  });

  it('an abstention counts as a missing score: excluded from the fit and from the judge count', () => {
    const { submissions, scores, judges } = lenientBoard();
    const before = board(submissions, scores, judges);
    const withAbstain = [...scores, { ...sc('X', 'a@x', crit(15)), abstained: true }, { ...sc('F3', 'c@x', crit(15)), abstained: true }];
    const after = board(submissions, withAbstain, [...judges, judge('c@x')]);
    expect(after.rows).toEqual(before.rows);
    expect(after.normalization.scoringJudges).toBe(2);
    // One judge plus one abstaining judge is still below the minimum.
    const solo = board([sub('p')], [sc('p', 'a@x', crit(9)), { ...sc('p', 'b@x', crit(9)), abstained: true }], judges);
    expect(solo.normalization.available).toBe(false);
  });

  it('an incomplete score sheet is ignored', () => {
    const { submissions, scores, judges } = lenientBoard();
    const before = board(submissions, scores, judges);
    const half = { ...sc('X', 'a@x', { works: 3, private: 3 }) };
    const after = board(submissions, [...scores, half], judges);
    expect(after.rows).toEqual(before.rows);
  });
});

describe('a track normalizes only once 2 judges have scored', () => {
  const two = [judge('a@x'), judge('b@x')];

  it('0 or 1 scoring judges: raw results, "normalization unavailable", no NaN', () => {
    for (const scores of [[], [sc('p1', 'a@x', crit(9)), sc('p2', 'a@x', crit(4))]]) {
      const b = board([sub('p1'), sub('p2')], scores, two);
      expect(b.normalization).toMatchObject({ enabled: true, available: false, reason: 'Needs scores from at least 2 judges', minJudges: 2 });
      for (const r of b.rows) {
        expect(r).toMatchObject({ normTotal: null, normByCriterion: null, normRank: null, rankChange: 0 });
        expect(r.rank).toBe(r.rawRank);
        for (const v of [r.avgTotal, ...Object.values(r.avgByCriterion)]) expect(Number.isNaN(v)).toBe(false);
      }
      expect(JSON.stringify(b)).not.toMatch(/NaN/);
    }
  });

  it("a second judge's complete sheet turns it on", () => {
    const scores = [sc('p1', 'a@x', crit(9)), sc('p2', 'a@x', crit(4))];
    expect(board([sub('p1'), sub('p2')], scores, two).normalization.available).toBe(false);
    const on = board([sub('p1'), sub('p2')], [...scores, sc('p1', 'b@x', crit(7))], two);
    expect(on.normalization).toMatchObject({ available: true, reason: null, scoringJudges: 2 });
    for (const r of on.rows) expect(Number.isFinite(r.normTotal)).toBe(true);
  });

  it('each track is gated on its own count: Privacy normalizes while Agentic (no scores) stays raw', () => {
    const submissions = [sub('both1', 'both'), sub('both2', 'both'), sub('priv', 'privacy')];
    const scores = [sc('both1', 'a@x', crit(9)), sc('both2', 'b@x', crit(6)), sc('priv', 'a@x', crit(3)), sc('priv', 'b@x', crit(5))];
    const judges = [judge('a@x', []), judge('b@x', [])];
    const privacy = board(submissions, scores, judges, 'privacy');
    const agentic = board(submissions, scores, judges, 'agentic');
    expect(privacy.normalization.available).toBe(true);
    expect(agentic.normalization).toMatchObject({ available: false, scoringJudges: 0 });
    expect(agentic.judges).toHaveLength(2); // assigned, but not scoring
    expect(agentic.rows.every((r) => r.normTotal === null && r.coverage.of === 0 && !r.fullyScored)).toBe(true);
  });
});

describe('total vs criteria', () => {
  it('normTotal is fitted on the total; criteria are fitted separately, so they agree except where a criterion is clipped', () => {
    // X: B only, Works 3 (max). B is harsh (−0.75 on the total), so X's Works
    // fit would be above 3 and is clipped; its total is not.
    const { submissions, scores, judges } = lenientBoard(crit(10, { works: 3 }));
    const by = byId(board(submissions, scores, judges));
    const sumCrit = (r) => sum(PRIV.map((c) => r.normByCriterion[c])) + r.normByCriterion.bonus;
    // Fully scored, nothing clipped: criteria = raw averages and add up to normTotal.
    const f = by['F10.5'];
    for (const c of PRIV) expect(f.normByCriterion[c]).toBeCloseTo(f.avgByCriterion[c], 12);
    expect(sumCrit(f)).toBeCloseTo(f.normTotal, 9);
    // X: Works is clipped to 3, so the criteria add up to less than normTotal.
    expect(by.X.normByCriterion.works).toBe(3);
    expect(by.X.normTotal).toBeCloseTo(10.75, 9);
    expect(sumCrit(by.X)).toBeLessThan(by.X.normTotal - 1e-6);
  });

  it('the fit is linear: without clipping, normTotal equals the sum of the criterion fits (bonus 0)', () => {
    const r = rng(7);
    for (let t = 0; t < 50; t += 1) {
      const { scores } = randomTrack(r);
      for (const s of scores) s.criteria.bonus = 0;
      const out = normalizeTrack({ criteria: RUBRICS.privacy, bonusIds: ['bonus'], scores });
      if (!out.available) continue;
      const unclipped = normalizeTrack({ criteria: RUBRICS.privacy.map((c) => ({ ...c, min: -100, max: 100 })), bonusIds: ['bonus'], scores });
      for (const [id, p] of unclipped.projects) {
        expect(sum(PRIV.map((c) => p.normByCriterion[c]))).toBeCloseTo(p.normTotal, 6);
        expect(p.normTotal).toBeCloseTo(out.projects.get(id).normTotal, 12);
      }
    }
  });
});

describe('judges with few scores', () => {
  // A and B agree on 10 projects. S scores 3: p0 and p1 (also scored by A and
  // B) at +3, and 'onlyS', which nobody else scored.
  const lowCountScores = () => {
    const scores = [];
    for (let i = 0; i < 10; i += 1) scores.push(row(`p${i}`, 'A', 4 + i), row(`p${i}`, 'B', 4 + i));
    scores.push(row('p0', 'S', 7), row('p1', 'S', 8), row('onlyS', 'S', 12));
    return scores;
  };

  it("'zero': a judge with 3 scores and a large apparent bias barely moves the projects they scored", () => {
    const scores = lowCountScores();
    const out = normalizeTrack({ criteria: one, scores, config: { minScoresPerJudge: 8, lowCountBias: 'zero' } });
    const S = out.judgeStats.find((j) => j.judgeEmail === 'S');
    expect(S).toMatchObject({ n: 3, bias: 0, lowCount: true });
    expect(Math.abs(out.projects.get('onlyS').normTotal - 12)).toBeLessThanOrEqual(0.1);
    expect(sum(out.judgeStats.map((j) => j.bias))).toBeCloseTo(0, 12);
    // Without the rule, S's bias would be fitted and onlyS would drop by ~2.
    const free = normalizeTrack({ criteria: one, scores, config: { minScoresPerJudge: 0 } });
    expect(free.projects.get('onlyS').normTotal).toBeLessThan(10.5);
  });

  it("'shrink': the bias is scaled by n / minScoresPerJudge, and the biases still sum to 0", () => {
    const scores = lowCountScores();
    const out = normalizeTrack({ criteria: one, scores, config: { minScoresPerJudge: 8, lowCountBias: 'shrink' } });
    const S = out.judgeStats.find((j) => j.judgeEmail === 'S');
    // At convergence S's bias is 3/8 of S's mean residual against the fitted qualities.
    const q = (id) => out.projects.get(id).normTotal;
    const residual = avg([7 - q('p0'), 8 - q('p1'), 12 - q('onlyS')]);
    expect(S.bias).toBeCloseTo((3 / 8) * residual, 9);
    expect(S.bias).toBeGreaterThan(0);
    expect(sum(out.judgeStats.map((j) => j.bias))).toBeCloseTo(0, 12);
    // Projects every judge scored still keep their raw average.
    expect(q('p0')).toBeCloseTo(avg([4, 4, 7]), 9);
  });
});

describe('missing scores and edge cases', () => {
  it('unscored projects: null normalized values, no normalized rank, listed last; adding one changes nothing else', () => {
    const { submissions, scores, judges } = lenientBoard();
    const b = board(submissions, scores, judges);
    const u = byId(b).unscored;
    expect(u).toMatchObject({ normTotal: null, normByCriterion: null, normRank: null, rankChange: 0, judgeCount: 0, fullyScored: false });
    expect(b.rows[b.rows.length - 1].submissionId).toBe('unscored');
    const more = board([...submissions, sub('unscored2')], scores, judges);
    const strip = (rows) => rows.filter((r) => r.judgeCount > 0);
    expect(strip(more.rows)).toEqual(strip(b.rows));
  });

  it('a disconnected judge, a single score, all zeros and identical scores all stay finite', () => {
    const cases = [
      [row('p1', 'A', 5), row('p2', 'A', 7), row('p1', 'B', 6), row('lonely', 'D', 9)],
      [row('p', 'A', 4)],
      [row('p1', 'A', 0), row('p2', 'A', 0), row('p1', 'B', 0)],
      [row('p1', 'A', 5), row('p2', 'A', 5), row('p1', 'B', 5), row('p2', 'B', 5)],
    ];
    for (const scores of cases) {
      const out = normalizeTrack({ criteria: one, scores, config: { minJudges: 1 } });
      for (const p of out.projects.values()) {
        expect(Number.isFinite(p.normTotal)).toBe(true);
        expect(p.normByCriterion.t).toBeGreaterThanOrEqual(0);
        expect(p.normByCriterion.t).toBeLessThanOrEqual(20);
      }
      for (const j of out.judgeStats) expect(Number.isFinite(j.bias)).toBe(true);
    }
    const lonely = normalizeTrack({ criteria: one, scores: cases[0], config: { minJudges: 1 } });
    expect(lonely.projects.get('lonely').normTotal).toBeCloseTo(9 - lonely.judgeStats.find((j) => j.judgeEmail === 'D').bias, 9);
    expect(normalizeTrack({ criteria: one, scores: cases[2] }).projects.get('p1').normTotal).toBe(0);
  });
});

describe('eligibility reads raw averages', () => {
  it('raw Works 0 blocks a win even when the normalized Works is above 0', () => {
    const { submissions, scores, judges } = lenientBoard(crit(10, { works: 0, bonus: 0, private: 3, easy: 3, needed: 3, continuing: 1 }));
    const x = byId(board(submissions, scores, judges)).X;
    expect(x.avgByCriterion.works).toBe(0);
    expect(x.normByCriterion.works).toBeGreaterThan(0);
    expect(x.winnerBlocked).toMatch(/Works score is 0/);
  });
});

describe('z-score method (config option)', () => {
  const zscore = { method: 'zscore', minScoresPerJudge: 0 };

  it('corrects a lenient judge (z-score and offset both recover the true order)', () => {
    const scores = [];
    for (let i = 0; i < 12; i += 1) {
      for (const j of ['A', 'B', 'C']) scores.push(row(`p${i}`, j, 4 + i));
      if (i % 2 === 0) scores.push(row(`p${i}`, 'L', 4 + i + 5));
    }
    const order = (m) => [...m.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
    const truth = Array.from({ length: 12 }, (_, i) => `p${11 - i}`);
    const raw = new Map(Array.from({ length: 12 }, (_, i) => [`p${i}`, avg(scores.filter((s) => s.submissionId === `p${i}`).map((s) => s.criteria.t))]));
    expect(order(raw)).not.toEqual(truth);
    const { projects, judgeStats } = normalizeTrack({ criteria: one, scores, config: { ...zscore, minScoresForZ: 6 } });
    expect(order(new Map([...projects].map(([id, p]) => [id, p.normTotal])))).toEqual(truth);
    expect(order(new Map([...projects].map(([id, p]) => [id, p.offsetTotal])))).toEqual(truth);
    const L = judgeStats.find((j) => j.judgeEmail === 'L');
    expect(L.bias - judgeStats.find((j) => j.judgeEmail === 'A').bias).toBeCloseTo(5, 6);
    expect(L.method).toBe('zscore');
  });

  it('switches a judge to z-scores at the minimum and moves every project that judge scored', () => {
    const base = [];
    for (let i = 0; i < 8; i += 1) base.push(row(`p${i}`, 'A', i), row(`p${i}`, 'B', 2 * i));
    const seven = base.filter((s) => !(s.judgeEmail === 'B' && s.submissionId === 'p7'));
    const before = normalizeTrack({ criteria: one, scores: seven, config: zscore });
    const after = normalizeTrack({ criteria: one, scores: base, config: zscore });
    expect(before.judgeStats.find((j) => j.judgeEmail === 'B').method).toBe('center');
    expect(after.judgeStats.find((j) => j.judgeEmail === 'B').method).toBe('zscore');
    expect(after.projects.get('p0').normTotal).not.toBeCloseTo(before.projects.get('p0').normTotal, 6);
  });

  it('z-score moves fully scored projects too (why offset is the default)', () => {
    const scores = [];
    for (let i = 0; i < 9; i += 1) scores.push(row(`p${i}`, 'A', i), row(`p${i}`, 'B', 3 * i));
    const z = normalizeTrack({ criteria: one, scores, config: zscore });
    const off = normalizeTrack({ criteria: one, scores });
    expect(Math.abs(z.projects.get('p0').normTotal - 0)).toBeGreaterThan(0.5);
    expect(off.projects.get('p0').normTotal).toBeCloseTo(0, 12);
  });
});

describe('leaderboard fields', () => {
  it('reports both tie-breaks, the board config and the recalculation time', () => {
    // T1 and T2 both raw 9 (A 10, B 8) but T1 has more Continuing. Y is scored by A only.
    const { submissions, scores, judges } = lenientBoard();
    submissions.push(sub('T1'), sub('T2'));
    scores.push(
      sc('T1', 'a@x', { works: 3, private: 3, easy: 1, needed: 1, continuing: 2, bonus: 0 }),
      sc('T1', 'b@x', { works: 3, private: 3, easy: 0, needed: 0, continuing: 2, bonus: 0 }),
      sc('T2', 'a@x', { works: 3, private: 3, easy: 2, needed: 1, continuing: 1, bonus: 0 }),
      sc('T2', 'b@x', { works: 3, private: 3, easy: 1, needed: 0, continuing: 1, bonus: 0 }),
    );
    const b = board(submissions, scores, judges);
    const by = byId(b);
    expect(by.T2.rawTieBrokenBy).toBe('Continuing');
    expect(by.T2.normTieBrokenBy).toBe('Continuing');
    expect(by.T2.tieBrokenBy).toBe('Continuing');
    expect(b.normalization).toMatchObject({ enabled: true, method: 'offset', minJudges: 2, minScoresPerJudge: 8, lowCountBias: 'zero', available: true });
    expect(b.computedAt).toBe('2026-11-09T12:00:00.000Z');
    expect(by.X.judgeScores[0]).toMatchObject({ judgeEmail: 'b@x', method: 'offset' });
    const biasB = b.judgeStats.find((j) => j.judgeEmail === 'b@x').bias;
    expect(by.X.judgeScores[0].normContribution).toBeCloseTo(10 - biasB, 9);
  });
});
