// Final judge scores on the public project cards, once results are published.
// Each card shows the score its track was ranked on when results were published
// (programs.results_ranking): the normalized total when that track was ranked
// normalized, the average judge total otherwise. Never per-judge data or emails.
// Mirrored by client/src/lib/mockTrackedSubmissions.ts (publicList).

import { RUBRICS } from '../constants/rubrics.js';

const round1 = (n) => Math.round(n * 10) / 10;
export const rubricMax = (track) => (RUBRICS[track] ?? []).reduce((a, c) => a + c.max, 0);

/**
 * @param {Record<string, { rows: object[] }>} boards  computeLeaderboard per rubric track
 * @param {Record<string, { normalized: boolean }>|null} ranking  stored at publish time
 * @param {string|null} [unscoredTrack]  a track judged outside Stadium (never shows a score)
 * @returns {{ bySubmission: Map<string, Record<string, { score: number, max: number }>>, judgesByTrack: Record<string, number> }}
 */
export function publicScores({ boards, ranking, unscoredTrack = null }) {
  const bySubmission = new Map();
  const judgesByTrack = {};
  for (const [track, board] of Object.entries(boards)) {
    if (track === unscoredTrack) continue;
    const scored = board.rows.filter((r) => r.judgeCount > 0);
    if (!scored.length) continue;
    const normalized = !!ranking?.[track]?.normalized;
    judgesByTrack[track] = new Set(scored.flatMap((r) => r.judgeScores.map((j) => j.judgeEmail))).size;
    for (const r of scored) {
      const value = normalized && r.normTotal != null ? r.normTotal : r.avgTotal;
      if (value == null) continue;
      const mine = bySubmission.get(r.submissionId) ?? {};
      mine[track] = { score: round1(value), max: rubricMax(track) };
      bySubmission.set(r.submissionId, mine);
    }
  }
  return { bySubmission, judgesByTrack };
}
