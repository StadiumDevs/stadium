// A project's overall review, built only from its published scores: strengths
// and possible weaknesses per rubric category against the track average,
// described with the rubric's own wording for each score level. Deterministic:
// no judge notes and no AI.

import type { ApiPublicTrackScore } from "./api";
import type { Rubric } from "./programProfiles";

export type ReviewLine = { id: string; name: string; score: number; max: number; trackAvg: number; text: string | null };
export type ProjectReview = { strengths: ReviewLine[]; weaknesses: ReviewLine[]; bonus: { score: number; max: number } | null };

/** "Works: how much of the demonstrated core flow is real?" → "Works". */
export const criterionName = (label: string) => label.split(":")[0].trim();

const MARGIN = 0.3;

export function projectReview(score: ApiPublicTrackScore, rubric: Rubric): ProjectReview {
  const byId = new Map(rubric.criteria.map((c) => [c.id, c]));
  const lines: (ReviewLine & { diff: number })[] = [];
  let bonus: ProjectReview["bonus"] = null;
  for (const x of score.criteria) {
    const c = byId.get(x.id);
    if (!c) continue;
    if (c.isBonus) {
      if (x.score > 0) bonus = { score: x.score, max: x.max };
      continue;
    }
    const min = c.min ?? 0;
    const level = c.levels?.[Math.min(c.max, Math.max(min, Math.round(x.score))) - min] ?? null;
    lines.push({ id: x.id, name: criterionName(c.label), score: x.score, max: x.max, trackAvg: x.trackAvg, text: level, diff: x.score - x.trackAvg });
  }
  const strip = ({ diff: _diff, ...l }: ReviewLine & { diff: number }): ReviewLine => l;
  const strengths = lines
    .filter((l) => l.score >= (2 / 3) * l.max || l.diff >= MARGIN)
    .sort((a, b) => b.diff - a.diff || b.score / b.max - a.score / a.max)
    .slice(0, 2);
  const taken = new Set(strengths.map((l) => l.id));
  const weaknesses = lines
    .filter((l) => !taken.has(l.id) && (l.score < 0.5 * l.max || l.diff <= -MARGIN))
    .sort((a, b) => a.score / a.max - b.score / b.max || a.diff - b.diff)
    .slice(0, 2);
  return { strengths: strengths.map(strip), weaknesses: weaknesses.map(strip), bonus };
}
