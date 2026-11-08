// Per-judge score normalization for rubric judging. Pure: no I/O.
// Mirrors client/src/lib/scoreNormalization.ts so the playground and
// production normalize the same way.
//
// Method (per track, per judge):
// - A judge's scores are z-scored, z = (x − judge mean) ÷ judge SD, over the
//   projects that judge scored, once the judge has at least `minScoresForZ`
//   scores and a non-zero SD. Otherwise they are only mean-centered (x − mean).
// - Each score becomes a contribution in rubric points, so both methods share
//   one scale: z judges give grandMean + grandSD × z, centered judges give
//   grandMean + (x − judge mean). The grand mean and SD are taken over every
//   counted score in the track.
// - A project's normalized score is the mean of its contributions.
// - Criteria are normalized the same way, per judge and per criterion, and
//   clipped to the criterion's range. Bonus criteria stay raw.
// - The additive judge-offset model (score = project quality + judge bias) is
//   fitted alongside as a check, or as the ranking when method = 'offset'. It
//   suits tracks where judges were assigned by domain, which z-scores don't
//   handle well because they assume each judge saw a random mix of projects.
//
// Missing scores stay missing: only the scores passed in count. Zero is a
// valid score.

const EPS = 1e-9;
const mean = (ns) => (ns.length ? ns.reduce((a, b) => a + b, 0) / ns.length : 0);
/** Sample SD (n − 1), 0 below two values. */
const sd = (ns) => {
  if (ns.length < 2) return 0;
  const m = mean(ns);
  return Math.sqrt(ns.reduce((a, x) => a + (x - m) ** 2, 0) / (ns.length - 1));
};
const clip = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

export const DEFAULT_NORMALIZATION = Object.freeze({ enabled: true, method: 'zscore', minScoresForZ: 8 });

/**
 * Normalizes one set of values (a total or one criterion).
 * @param {{ submissionId: string, judgeEmail: string, x: number }[]} entries
 * @param {{ minScoresForZ: number, range?: [number, number] }} opts
 * @returns {{ byProject: Map<string, { value: number, contributions: { judgeEmail: string, method: 'zscore'|'center', value: number }[] }>,
 *            judges: Map<string, { n: number, mean: number, sd: number, method: 'zscore'|'center' }> }}
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
 * squares with the biases summing to 0, by alternating updates.
 * @param {{ submissionId: string, judgeEmail: string, x: number }[]} entries
 * @returns {{ quality: Map<string, number>, bias: Map<string, number> }}
 */
export function fitJudgeOffsets(entries, { maxIter = 500, tol = 1e-9 } = {}) {
  const byP = new Map();
  const byJ = new Map();
  for (const e of entries) {
    if (!byP.has(e.submissionId)) byP.set(e.submissionId, []);
    if (!byJ.has(e.judgeEmail)) byJ.set(e.judgeEmail, []);
    byP.get(e.submissionId).push(e);
    byJ.get(e.judgeEmail).push(e);
  }
  const quality = new Map([...byP].map(([p, es]) => [p, mean(es.map((e) => e.x))]));
  const bias = new Map([...byJ.keys()].map((j) => [j, 0]));
  for (let it = 0; it < maxIter; it += 1) {
    let delta = 0;
    for (const [j, es] of byJ) bias.set(j, mean(es.map((e) => e.x - quality.get(e.submissionId))));
    const shift = mean([...bias.values()]);
    for (const j of bias.keys()) bias.set(j, bias.get(j) - shift);
    for (const [p, es] of byP) {
      const q = mean(es.map((e) => e.x - bias.get(e.judgeEmail)));
      delta = Math.max(delta, Math.abs(q - quality.get(p)));
      quality.set(p, q);
    }
    if (delta < tol) break;
  }
  return { quality, bias };
}

/**
 * Normalizes a whole track.
 * @param {object} args
 * @param {{ id: string, min?: number, max: number, weight?: number }[]} args.criteria
 * @param {string[]} args.bonusIds  criteria shown raw (not z-scored)
 * @param {{ submissionId: string, judgeEmail: string, criteria: Record<string, number> }[]} args.scores
 *        fully scored rows for this track only
 * @param {{ minScoresForZ?: number }} [args.config]
 */
export function normalizeTrack({ criteria, bonusIds = [], scores, config = {} }) {
  const minScoresForZ = config.minScoresForZ ?? DEFAULT_NORMALIZATION.minScoresForZ;
  const totalOf = (crit) => criteria.reduce((sum, c) => sum + (crit[c.id] ?? 0) * (c.weight ?? 1), 0);
  const totals = scores.map((s) => ({ submissionId: s.submissionId, judgeEmail: s.judgeEmail, x: totalOf(s.criteria) }));

  const total = normalizeValues(totals, { minScoresForZ });
  const offsets = fitJudgeOffsets(totals);

  const perCriterion = {};
  for (const c of criteria) {
    if (bonusIds.includes(c.id)) continue;
    const entries = scores.map((s) => ({ submissionId: s.submissionId, judgeEmail: s.judgeEmail, x: s.criteria[c.id] ?? 0 }));
    perCriterion[c.id] = normalizeValues(entries, { minScoresForZ, range: [c.min ?? 0, c.max] });
  }

  const projects = new Map();
  for (const [id, p] of total.byProject) {
    const normByCriterion = {};
    for (const c of criteria) {
      if (bonusIds.includes(c.id)) {
        normByCriterion[c.id] = mean(scores.filter((s) => s.submissionId === id).map((s) => s.criteria[c.id] ?? 0));
      } else {
        normByCriterion[c.id] = perCriterion[c.id].byProject.get(id).value;
      }
    }
    projects.set(id, {
      normTotal: p.value,
      normByCriterion,
      offsetTotal: offsets.quality.get(id),
      contributions: p.contributions,
    });
  }

  const judgeStats = [...total.judges].map(([judgeEmail, j]) => ({
    judgeEmail,
    n: j.n,
    mean: j.mean,
    sd: j.sd,
    method: j.method,
    bias: offsets.bias.get(judgeEmail) ?? 0,
  }));

  return { projects, judgeStats, minScoresForZ };
}
