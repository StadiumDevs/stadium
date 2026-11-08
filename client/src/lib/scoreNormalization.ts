// Per-judge score normalization for rubric judging. Line-for-line port of
// server/api/services/score-normalization.service.js (see that file for the
// method) so the playground normalizes exactly like production.

export type NormalizationMethod = "zscore" | "offset";
export type NormalizationConfig = { enabled: boolean; method: NormalizationMethod; minScoresForZ: number };
export type JudgeMethod = "zscore" | "center";

export const DEFAULT_NORMALIZATION: NormalizationConfig = { enabled: true, method: "zscore", minScoresForZ: 8 };

type Entry = { submissionId: string; judgeEmail: string; x: number };
type Contribution = { judgeEmail: string; method: JudgeMethod; value: number };
type JudgeStat = { n: number; mean: number; sd: number; method: JudgeMethod };

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

export function fitJudgeOffsets(entries: Entry[], { maxIter = 500, tol = 1e-9 } = {}) {
  const byP = new Map<string, Entry[]>();
  const byJ = new Map<string, Entry[]>();
  for (const e of entries) {
    if (!byP.has(e.submissionId)) byP.set(e.submissionId, []);
    if (!byJ.has(e.judgeEmail)) byJ.set(e.judgeEmail, []);
    byP.get(e.submissionId)!.push(e);
    byJ.get(e.judgeEmail)!.push(e);
  }
  const quality = new Map([...byP].map(([p, es]) => [p, mean(es.map((e) => e.x))] as [string, number]));
  const bias = new Map([...byJ.keys()].map((j) => [j, 0] as [string, number]));
  for (let it = 0; it < maxIter; it += 1) {
    let delta = 0;
    for (const [j, es] of byJ) bias.set(j, mean(es.map((e) => e.x - quality.get(e.submissionId)!)));
    const shift = mean([...bias.values()]);
    for (const j of bias.keys()) bias.set(j, bias.get(j)! - shift);
    for (const [p, es] of byP) {
      const q = mean(es.map((e) => e.x - bias.get(e.judgeEmail)!));
      delta = Math.max(delta, Math.abs(q - quality.get(p)!));
      quality.set(p, q);
    }
    if (delta < tol) break;
  }
  return { quality, bias };
}

export type NormalizedProject = {
  normTotal: number;
  normByCriterion: Record<string, number>;
  offsetTotal: number;
  contributions: Contribution[];
};

export function normalizeTrack({
  criteria,
  bonusIds = [],
  scores,
  config = {},
}: {
  criteria: { id: string; min?: number; max: number; weight?: number }[];
  bonusIds?: string[];
  scores: { submissionId: string; judgeEmail: string; criteria: Record<string, number | null> }[];
  config?: Partial<NormalizationConfig>;
}) {
  const minScoresForZ = config.minScoresForZ ?? DEFAULT_NORMALIZATION.minScoresForZ;
  const totalOf = (crit: Record<string, number | null>) => criteria.reduce((sum, c) => sum + (crit[c.id] ?? 0) * (c.weight ?? 1), 0);
  const totals = scores.map((s) => ({ submissionId: s.submissionId, judgeEmail: s.judgeEmail, x: totalOf(s.criteria) }));

  const total = normalizeValues(totals, { minScoresForZ });
  const offsets = fitJudgeOffsets(totals);

  const perCriterion: Record<string, ReturnType<typeof normalizeValues>> = {};
  for (const c of criteria) {
    if (bonusIds.includes(c.id)) continue;
    const entries = scores.map((s) => ({ submissionId: s.submissionId, judgeEmail: s.judgeEmail, x: s.criteria[c.id] ?? 0 }));
    perCriterion[c.id] = normalizeValues(entries, { minScoresForZ, range: [c.min ?? 0, c.max] });
  }

  const projects = new Map<string, NormalizedProject>();
  for (const [id, p] of total.byProject) {
    const normByCriterion: Record<string, number> = {};
    for (const c of criteria) {
      normByCriterion[c.id] = bonusIds.includes(c.id)
        ? mean(scores.filter((s) => s.submissionId === id).map((s) => s.criteria[c.id] ?? 0))
        : perCriterion[c.id].byProject.get(id)!.value;
    }
    projects.set(id, { normTotal: p.value, normByCriterion, offsetTotal: offsets.quality.get(id)!, contributions: p.contributions });
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
