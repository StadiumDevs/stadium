// Final judge scores on the public project cards and project pages, once
// results are published. Each project shows the score its track was ranked on
// when results were published (programs.results_ranking): the normalized
// values when that track was ranked normalized, the average judge values
// otherwise. Per category it also carries the track average, so the page can
// say where a project stands out. Never per-judge data or emails.
// Mirrored by client/src/lib/mockTrackedSubmissions.ts (publicList, publicWinner).

import { RUBRICS } from '../constants/rubrics.js';
import { isCountedEntry } from '../constants/trackedPrograms.js';
import { programStatsFor } from '../constants/programStats.js';
import programSubmissionRepository from '../repositories/program-submission.repository.js';
import submissionRubricScoreRepository from '../repositories/submission-rubric-score.repository.js';
import programAdminEmailRepository from '../repositories/program-admin-email.repository.js';
import { computeLeaderboard } from './rubric-leaderboard.service.js';
import { publicScoresCache } from '../utils/public-data-cache.js';

const round1 = (n) => Math.round(n * 10) / 10;
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
export const rubricMax = (track) => (RUBRICS[track] ?? []).reduce((a, c) => a + c.max, 0);

/**
 * @param {Record<string, { rows: object[] }>} boards  computeLeaderboard per rubric track
 * @param {Record<string, { normalized: boolean }>|null} ranking  stored at publish time
 * @param {string|null} [unscoredTrack]  a track judged outside Stadium (never shows a score)
 * @returns {{
 *   bySubmission: Map<string, Record<string, { score: number, max: number, judges: number, criteria: { id: string, score: number, max: number, trackAvg: number }[] }>>,
 *   judgesByTrack: Record<string, number>
 * }}
 */
export function publicScores({ boards, ranking, unscoredTrack = null }) {
  const bySubmission = new Map();
  const judgesByTrack = {};
  for (const [track, board] of Object.entries(boards)) {
    if (track === unscoredTrack) continue;
    const scored = board.rows.filter((r) => r.judgeCount > 0);
    if (!scored.length) continue;
    const normalized = !!ranking?.[track]?.normalized;
    const criteria = RUBRICS[track] ?? [];
    judgesByTrack[track] = new Set(scored.flatMap((r) => r.judgeScores.map((j) => j.judgeEmail))).size;
    // The values the track was ranked on: normalized when available, raw averages otherwise.
    const useNorm = (r) => normalized && r.normTotal != null && r.normByCriterion != null;
    const totalOf = (r) => (useNorm(r) ? r.normTotal : r.avgTotal);
    const criterionOf = (r, id) => (useNorm(r) ? r.normByCriterion[id] : r.avgByCriterion[id]) ?? 0;
    const trackAvg = Object.fromEntries(criteria.map((c) => [c.id, round1(mean(scored.map((r) => criterionOf(r, c.id))))]));
    for (const r of scored) {
      const total = totalOf(r);
      if (total == null) continue;
      const mine = bySubmission.get(r.submissionId) ?? {};
      mine[track] = {
        score: round1(total),
        max: rubricMax(track),
        judges: r.judgeCount,
        criteria: criteria.map((c) => ({ id: c.id, score: round1(criterionOf(r, c.id)), max: c.max, trackAvg: trackAvg[c.id] })),
      };
      bySubmission.set(r.submissionId, mine);
    }
  }
  return { bySubmission, judgesByTrack };
}

/**
 * Loads a published program's judging data and returns its public scores.
 * Callers check that results are published first.
 */
export async function loadPublicScores(program, tracked) {
  // Same for every visitor: one shared copy, keyed on the publish (and its
  // ranking) so publishing or re-ranking never serves the old scores.
  const key = `${program.id}|${program.resultsPublishedAt ?? ''}|${JSON.stringify(program.resultsRanking ?? null)}`;
  const hit = publicScoresCache.get(key);
  if (hit) return hit;
  const result = await computePublicScores(program, tracked);
  publicScoresCache.set(key, result);
  return result;
}

async function computePublicScores(program, tracked) {
  // Lean reads: only the fields the scoring maths needs (no notes, no survey).
  const [all, scores, judges] = await Promise.all([
    programSubmissionRepository.listForJudgingTotals(program.id),
    submissionRubricScoreRepository.listByProgramForTotals(program.id),
    programAdminEmailRepository.listJudges(program.id),
  ]);
  const counted = all.filter((s) => isCountedEntry(s, tracked, program));
  const boards = Object.fromEntries(Object.keys(RUBRICS).map((t) => [t, computeLeaderboard({ track: t, submissions: counted, scores, judges })]));
  // A track judged outside Stadium (FSH Agentic Commerce, by Bitrefill) never shows a score.
  const unscoredTrack = programStatsFor(program.slug)?.unscoredTrack?.track ?? null;
  return publicScores({ boards, ranking: program.resultsRanking ?? null, unscoredTrack });
}
