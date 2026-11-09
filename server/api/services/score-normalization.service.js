// Per-judge score normalization for rubric judging. Pure: no I/O.
// Mirrors client/src/lib/scoreNormalization.ts so the playground and
// production normalize the same way (normalization-parity.test.js checks it).
//
// Default method, 'offset' (additive judge-offset model):
//   score = project quality + judge bias, least squares, biases summing to 0
//   over the judges in the fit.
// - Only judges with at least one counted (complete, not abstained) score in
//   the track are in the fit. Assigned judges who haven't scored are left out.
// - Because the biases sum to 0, a project scored by every judge in the fit
//   keeps exactly its raw average. Only projects some judges didn't score move:
//   down when their judges were lenient, up when harsh. Ranks of fully scored
//   projects can still change, because partly scored ones move past them.
// - A judge with fewer than `minScoresPerJudge` scores gets bias 0
//   (lowCountBias 'zero') or a bias scaled by n / minScoresPerJudge ('shrink');
//   the other judges are re-centred so the biases still sum to 0.
// - The total is fitted directly (normTotal). Each non-bonus criterion is fitted
//   separately and clipped to its range, for display and tie-breaks only; bonus
//   criteria stay raw. The fit is linear, so normTotal equals the sum of the
//   criterion fits except where a criterion was clipped or for the bonus.
// - Normalization needs at least `minJudges` scoring judges in the track;
//   below that the track stays raw (available: false).
//
// Optional method, 'zscore': a judge's scores become grandMean + grandSD × z,
// z = (x − judge mean) ÷ judge SD, once the judge has `minScoresForZ` scores and
// a non-zero SD; otherwise grandMean + (x − judge mean). This rescales every
// judge's spread, so it also moves projects every judge scored.
//
// Missing scores stay missing: only the scores passed in count. Zero is a
// valid score. Abstentions count as missing.

const EPS = 1e-9;
const mean = (ns) => (ns.length ? ns.reduce((a, b) => a + b, 0) / ns.length : 0);
/** Sample SD (n − 1), 0 below two values. */
const sd = (ns) => {
  if (ns.length < 2) return 0;
  const m = mean(ns);
  return Math.sqrt(ns.reduce((a, x) => a + (x - m) ** 2, 0) / (ns.length - 1));
};
const clip = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

export const DEFAULT_NORMALIZATION = Object.freeze({
  enabled: true,
  method: 'offset',
  minJudges: 2,
  minScoresPerJudge: 8,
  lowCountBias: 'zero',
  minScoresForZ: 8,
});

export const UNAVAILABLE_REASON = (minJudges) => `Needs scores from at least ${minJudges} judges`;

/**
 * Z-score normalization of one set of values (a total or one criterion).
 * @param {{ submissionId: string, judgeEmail: string, x: number }[]} entries
 * @param {{ minScoresForZ: number, range?: [number, number] }} opts
 */
export function normalizeValues(entries, { minScoresForZ, range }) {
  const all = entries.map((e) => e.x);
  const gMean = mean(all);
  const gSd = sd(all);

  const judges = new Map();
  for (const e of entries) {
    if (!judges.has(e.judgeEmail)) judges.set(e.judgeEmail, []);
    judges.get(e.judgeEmail).push(e.x);
  }
  const stats = new Map();
  for (const [email, xs] of judges) {
    const m = mean(xs);
    const s = sd(xs);
    stats.set(email, { n: xs.length, mean: m, sd: s, method: xs.length >= minScoresForZ && s > EPS ? 'zscore' : 'center' });
  }

  const byProject = new Map();
  for (const e of entries) {
    const j = stats.get(e.judgeEmail);
    const value = j.method === 'zscore' ? gMean + (gSd * (e.x - j.mean)) / j.sd : gMean + (e.x - j.mean);
    if (!byProject.has(e.submissionId)) byProject.set(e.submissionId, { value: 0, contributions: [] });
    byProject.get(e.submissionId).contributions.push({ judgeEmail: e.judgeEmail, method: j.method, value });
  }
  for (const p of byProject.values()) {
    const v = mean(p.contributions.map((c) => c.value));
    p.value = range ? clip(v, range[0], range[1]) : v;
  }
  return { byProject, judges: stats };
}

/**
 * Additive judge-offset model: x = quality[project] + bias[judge], least
 * squares with the biases summing to 0, by alternating updates. Judges with
 * fewer than `minScoresPerJudge` scores get bias 0 ('zero') or a shrunk bias
 * ('shrink'); the other judges are re-centred so the sum stays 0.
 * @param {{ submissionId: string, judgeEmail: string, x: number }[]} entries
 * @returns {{ quality: Map<string, number>, bias: Map<string, number>, lowCount: Set<string> }}
 */
export function fitJudgeOffsets(entries, { minScoresPerJudge = 0, lowCountBias = 'zero', maxIter = 2000, tol = 1e-12 } = {}) {
  const byP = new Map();
  const byJ = new Map();
  for (const e of entries) {
    if (!byP.has(e.submissionId)) byP.set(e.submissionId, []);
    if (!byJ.has(e.judgeEmail)) byJ.set(e.judgeEmail, []);
    byP.get(e.submissionId).push(e);
    byJ.get(e.judgeEmail).push(e);
  }
  const lowCount = new Set([...byJ].filter(([, es]) => es.length < minScoresPerJudge).map(([j]) => j));
  const free = [...byJ.keys()].filter((j) => !lowCount.has(j));
  const quality = new Map([...byP].map(([p, es]) => [p, mean(es.map((e) => e.x))]));
  const bias = new Map([...byJ.keys()].map((j) => [j, 0]));
  for (let it = 0; it < maxIter; it += 1) {
    for (const [j, es] of byJ) {
      const b = mean(es.map((e) => e.x - quality.get(e.submissionId)));
      if (!lowCount.has(j)) bias.set(j, b);
      else bias.set(j, lowCountBias === 'shrink' ? (b * es.length) / minScoresPerJudge : 0);
    }
    // Re-centre so the biases sum to 0: on the free judges, or on everyone
    // when every judge is below the minimum.
    const centreOn = free.length ? free : [...byJ.keys()];
    const shift = [...bias.values()].reduce((a, b) => a + b, 0) / centreOn.length;
    for (const j of centreOn) bias.set(j, bias.get(j) - shift);
    let delta = 0;
    for (const [p, es] of byP) {
      const q = mean(es.map((e) => e.x - bias.get(e.judgeEmail)));
      delta = Math.max(delta, Math.abs(q - quality.get(p)));
      quality.set(p, q);
    }
    if (delta < tol) break;
  }
  return { quality, bias, lowCount };
}

/**
 * Normalizes a whole track.
 * @param {object} args
 * @param {{ id: string, min?: number, max: number, weight?: number }[]} args.criteria
 * @param {string[]} args.bonusIds  criteria shown raw
 * @param {{ submissionId: string, judgeEmail: string, criteria: Record<string, number>, abstained?: boolean }[]} args.scores
 *        complete score sheets for this track only (abstentions are dropped here)
 * @param {Partial<typeof DEFAULT_NORMALIZATION>} [args.config]
 */
export function normalizeTrack({ criteria, bonusIds = [], scores, config = {} }) {
  const cfg = { ...DEFAULT_NORMALIZATION, ...config };
  const counted = scores.filter((s) => !s.abstained);
  const scoringJudges = [...new Set(counted.map((s) => s.judgeEmail))];
  const base = { method: cfg.method, minJudges: cfg.minJudges, scoringJudges: scoringJudges.length, minScoresForZ: cfg.minScoresForZ };

  if (scoringJudges.length < cfg.minJudges) {
    return {
      ...base,
      available: false,
      reason: UNAVAILABLE_REASON(cfg.minJudges),
      projects: new Map(),
      judgeStats: scoringJudges.map((judgeEmail) => {
        const xs = counted.filter((s) => s.judgeEmail === judgeEmail);
        return { judgeEmail, n: xs.length, mean: null, sd: null, method: null, bias: null, lowCount: false };
      }),
    };
  }

  const totalOf = (crit) => criteria.reduce((sum, c) => sum + (crit[c.id] ?? 0) * (c.weight ?? 1), 0);
  const totals = counted.map((s) => ({ submissionId: s.submissionId, judgeEmail: s.judgeEmail, x: totalOf(s.criteria) }));
  const offsetOpts = { minScoresPerJudge: cfg.minScoresPerJudge, lowCountBias: cfg.lowCountBias };
  const isOffset = cfg.method === 'offset';

  const z = normalizeValues(totals, { minScoresForZ: cfg.minScoresForZ });
  const offsets = fitJudgeOffsets(totals, offsetOpts);

  const perCriterion = {};
  for (const c of criteria) {
    if (bonusIds.includes(c.id)) continue;
    const entries = counted.map((s) => ({ submissionId: s.submissionId, judgeEmail: s.judgeEmail, x: s.criteria[c.id] ?? 0 }));
    const range = [c.min ?? 0, c.max];
    if (isOffset) {
      const fit = fitJudgeOffsets(entries, offsetOpts);
      perCriterion[c.id] = (id) => clip(fit.quality.get(id), range[0], range[1]);
    } else {
      const fit = normalizeValues(entries, { minScoresForZ: cfg.minScoresForZ, range });
      perCriterion[c.id] = (id) => fit.byProject.get(id).value;
    }
  }

  const projects = new Map();
  for (const [id, zp] of z.byProject) {
    const normByCriterion = {};
    for (const c of criteria) {
      normByCriterion[c.id] = bonusIds.includes(c.id)
        ? mean(counted.filter((s) => s.submissionId === id).map((s) => s.criteria[c.id] ?? 0))
        : perCriterion[c.id](id);
    }
    const offsetTotal = offsets.quality.get(id);
    const contributions = isOffset
      ? totals
          .filter((t) => t.submissionId === id)
          .map((t) => ({ judgeEmail: t.judgeEmail, method: 'offset', value: t.x - offsets.bias.get(t.judgeEmail) }))
      : zp.contributions;
    projects.set(id, { normTotal: isOffset ? offsetTotal : zp.value, normByCriterion, zTotal: zp.value, offsetTotal, contributions });
  }

  const judgeStats = [...z.judges].map(([judgeEmail, j]) => ({
    judgeEmail,
    n: j.n,
    mean: j.mean,
    sd: j.sd,
    method: isOffset ? 'offset' : j.method,
    bias: offsets.bias.get(judgeEmail) ?? 0,
    lowCount: offsets.lowCount.has(judgeEmail),
  }));

  return { ...base, available: true, reason: null, projects, judgeStats };
}
