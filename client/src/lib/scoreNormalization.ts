// Per-judge score normalization for rubric judging. Line-for-line port of
// server/api/services/score-normalization.service.js (see that file for the
// method) so the playground normalizes exactly like production. The server
// test normalization-parity.test.js imports this file and checks both agree.

export type NormalizationMethod = "offset" | "zscore";
export type LowCountBias = "zero" | "shrink";
export type NormalizationConfig = {
  enabled: boolean;
  method: NormalizationMethod;
  /** Normalize a track only once this many judges have scored in it. */
  minJudges: number;
  /** Offset model: judges with fewer scores get bias 0 or a shrunk bias. */
  minScoresPerJudge: number;
  lowCountBias: LowCountBias;
  /** Z-score option: judges with fewer scores are only mean-centered. */
  minScoresForZ: number;
};
export type JudgeMethod = "zscore" | "center" | "offset";

export const DEFAULT_NORMALIZATION: NormalizationConfig = {
  enabled: true,
  method: "offset",
  minJudges: 2,
  minScoresPerJudge: 8,
  lowCountBias: "zero",
  minScoresForZ: 8,
};

export const UNAVAILABLE_REASON = (minJudges: number) => `Needs scores from at least ${minJudges} judges`;

type Entry = { submissionId: string; judgeEmail: string; x: number };
type Contribution = { judgeEmail: string; method: JudgeMethod; value: number };
type JudgeStat = { n: number; mean: number; sd: number; method: "zscore" | "center" };

const EPS = 1e-9;
const mean = (ns: number[]) => (ns.length ? ns.reduce((a, b) => a + b, 0) / ns.length : 0);
const sd = (ns: number[]) => {
  if (ns.length < 2) return 0;
  const m = mean(ns);
  return Math.sqrt(ns.reduce((a, x) => a + (x - m) ** 2, 0) / (ns.length - 1));
};
const clip = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

export function normalizeValues(entries: Entry[], { minScoresForZ, range }: { minScoresForZ: number; range?: [number, number] }) {
  const all = entries.map((e) => e.x);
  const gMean = mean(all);
  const gSd = sd(all);

  const judges = new Map<string, number[]>();
  for (const e of entries) {
    if (!judges.has(e.judgeEmail)) judges.set(e.judgeEmail, []);
    judges.get(e.judgeEmail)!.push(e.x);
  }
  const stats = new Map<string, JudgeStat>();
  for (const [email, xs] of judges) {
    const m = mean(xs);
    const s = sd(xs);
    stats.set(email, { n: xs.length, mean: m, sd: s, method: xs.length >= minScoresForZ && s > EPS ? "zscore" : "center" });
  }

  const byProject = new Map<string, { value: number; contributions: Contribution[] }>();
  for (const e of entries) {
    const j = stats.get(e.judgeEmail)!;
    const value = j.method === "zscore" ? gMean + (gSd * (e.x - j.mean)) / j.sd : gMean + (e.x - j.mean);
    if (!byProject.has(e.submissionId)) byProject.set(e.submissionId, { value: 0, contributions: [] });
    byProject.get(e.submissionId)!.contributions.push({ judgeEmail: e.judgeEmail, method: j.method, value });
  }
  for (const p of byProject.values()) {
    const v = mean(p.contributions.map((c) => c.value));
    p.value = range ? clip(v, range[0], range[1]) : v;
  }
  return { byProject, judges: stats };
}

export function fitJudgeOffsets(
  entries: Entry[],
  {
    minScoresPerJudge = 0,
    lowCountBias = "zero",
    maxIter = 2000,
    tol = 1e-12,
  }: { minScoresPerJudge?: number; lowCountBias?: LowCountBias; maxIter?: number; tol?: number } = {},
) {
  const byP = new Map<string, Entry[]>();
  const byJ = new Map<string, Entry[]>();
  for (const e of entries) {
    if (!byP.has(e.submissionId)) byP.set(e.submissionId, []);
    if (!byJ.has(e.judgeEmail)) byJ.set(e.judgeEmail, []);
    byP.get(e.submissionId)!.push(e);
    byJ.get(e.judgeEmail)!.push(e);
  }
  const lowCount = new Set([...byJ].filter(([, es]) => es.length < minScoresPerJudge).map(([j]) => j));
  const free = [...byJ.keys()].filter((j) => !lowCount.has(j));
  const quality = new Map([...byP].map(([p, es]) => [p, mean(es.map((e) => e.x))] as [string, number]));
  const bias = new Map([...byJ.keys()].map((j) => [j, 0] as [string, number]));
  for (let it = 0; it < maxIter; it += 1) {
    for (const [j, es] of byJ) {
      const b = mean(es.map((e) => e.x - quality.get(e.submissionId)!));
      if (!lowCount.has(j)) bias.set(j, b);
      else bias.set(j, lowCountBias === "shrink" ? (b * es.length) / minScoresPerJudge : 0);
    }
    const centreOn = free.length ? free : [...byJ.keys()];
    const shift = [...bias.values()].reduce((a, b) => a + b, 0) / centreOn.length;
    for (const j of centreOn) bias.set(j, bias.get(j)! - shift);
    let delta = 0;
    for (const [p, es] of byP) {
      const q = mean(es.map((e) => e.x - bias.get(e.judgeEmail)!));
      delta = Math.max(delta, Math.abs(q - quality.get(p)!));
      quality.set(p, q);
    }
    if (delta < tol) break;
  }
  return { quality, bias, lowCount };
}

export type NormalizedProject = {
  normTotal: number;
  normByCriterion: Record<string, number>;
  zTotal: number;
  offsetTotal: number;
  contributions: Contribution[];
};

export type NormalizedJudgeStat = {
  judgeEmail: string;
  n: number;
  mean: number | null;
  sd: number | null;
  method: JudgeMethod | null;
  bias: number | null;
  lowCount: boolean;
};

export function normalizeTrack({
  criteria,
  bonusIds = [],
  scores,
  config = {},
}: {
  criteria: { id: string; min?: number; max: number; weight?: number }[];
  bonusIds?: string[];
  scores: { submissionId: string; judgeEmail: string; criteria: Record<string, number | null>; abstained?: boolean }[];
  config?: Partial<NormalizationConfig>;
}): {
  method: NormalizationMethod;
  minJudges: number;
  scoringJudges: number;
  minScoresForZ: number;
  available: boolean;
  reason: string | null;
  projects: Map<string, NormalizedProject>;
  judgeStats: NormalizedJudgeStat[];
} {
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

  const totalOf = (crit: Record<string, number | null>) => criteria.reduce((sum, c) => sum + (crit[c.id] ?? 0) * (c.weight ?? 1), 0);
  const totals = counted.map((s) => ({ submissionId: s.submissionId, judgeEmail: s.judgeEmail, x: totalOf(s.criteria) }));
  const offsetOpts = { minScoresPerJudge: cfg.minScoresPerJudge, lowCountBias: cfg.lowCountBias };
  const isOffset = cfg.method === "offset";

  const z = normalizeValues(totals, { minScoresForZ: cfg.minScoresForZ });
  const offsets = fitJudgeOffsets(totals, offsetOpts);

  const perCriterion: Record<string, (id: string) => number> = {};
  for (const c of criteria) {
    if (bonusIds.includes(c.id)) continue;
    const entries = counted.map((s) => ({ submissionId: s.submissionId, judgeEmail: s.judgeEmail, x: s.criteria[c.id] ?? 0 }));
    const range: [number, number] = [c.min ?? 0, c.max];
    if (isOffset) {
      const fit = fitJudgeOffsets(entries, offsetOpts);
      perCriterion[c.id] = (id) => clip(fit.quality.get(id)!, range[0], range[1]);
    } else {
      const fit = normalizeValues(entries, { minScoresForZ: cfg.minScoresForZ, range });
      perCriterion[c.id] = (id) => fit.byProject.get(id)!.value;
    }
  }

  const projects = new Map<string, NormalizedProject>();
  for (const [id, zp] of z.byProject) {
    const normByCriterion: Record<string, number> = {};
    for (const c of criteria) {
      normByCriterion[c.id] = bonusIds.includes(c.id)
        ? mean(counted.filter((s) => s.submissionId === id).map((s) => s.criteria[c.id] ?? 0))
        : perCriterion[c.id](id);
    }
    const offsetTotal = offsets.quality.get(id)!;
    const contributions: Contribution[] = isOffset
      ? totals
          .filter((t) => t.submissionId === id)
          .map((t) => ({ judgeEmail: t.judgeEmail, method: "offset" as const, value: t.x - offsets.bias.get(t.judgeEmail)! }))
      : zp.contributions;
    projects.set(id, { normTotal: isOffset ? offsetTotal : zp.value, normByCriterion, zTotal: zp.value, offsetTotal, contributions });
  }

  const judgeStats: NormalizedJudgeStat[] = [...z.judges].map(([judgeEmail, j]) => ({
    judgeEmail,
    n: j.n,
    mean: j.mean,
    sd: j.sd,
    method: isOffset ? "offset" : j.method,
    bias: offsets.bias.get(judgeEmail) ?? 0,
    lowCount: offsets.lowCount.has(judgeEmail),
  }));

  return { ...base, available: true, reason: null, projects, judgeStats };
}
