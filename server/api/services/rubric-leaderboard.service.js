// Per-track rubric leaderboard for tracked programs (Free Society Hack). Pure:
// the controller loads submissions, scores and judges and passes them in.
// Mirrors client/src/lib/mockTrackedSubmissions.ts (leaderboard) so the
// playground and production rank the same way.

import { RUBRICS, RUBRIC_RANKING } from '../constants/rubrics.js';

const EPS = 1e-9;
const mean = (ns) => (ns.length ? ns.reduce((a, b) => a + b, 0) / ns.length : 0);

/** The judged tracks a submission takes part in ("both" = privacy and agentic). */
export const judgedTracksOf = (track) => (track === 'both' ? ['privacy', 'agentic'] : [track]);

export const isFullyScored = (track, criteria) =>
  RUBRICS[track].every((c) => typeof criteria?.[c.id] === 'number');

const total = (track, criteria) => RUBRICS[track].reduce((sum, c) => sum + (criteria?.[c.id] ?? 0), 0);

/** Fully scored rows for one submission and track. */
const countedScores = (scores, submissionId, track) =>
  scores.filter((x) => x.submissionId === submissionId && x.track === track && isFullyScored(track, x.criteria));

/** At least one judge has fully scored this project in this track. */
export const hasFullScore = (track, scores, submissionId) => countedScores(scores, submissionId, track).length > 0;

/** Why this project can't win in this track (the Works-0 gate), or null. */
export function winnerBlockedReason(track, scores, submissionId) {
  const gate = RUBRIC_RANKING[track]?.winnerGate;
  if (!gate) return null;
  const counted = countedScores(scores, submissionId, track);
  if (counted.length === 0) return null;
  const avg = mean(counted.map((x) => x.criteria[gate.criterionId] ?? 0));
  return avg <= gate.maxAvg + EPS ? gate.message : null;
}

/** Judges who score this track (tracks NULL = every track). */
export const judgesForTrack = (judges, track) =>
  judges.filter((j) => !Array.isArray(j.tracks) || j.tracks.length === 0 || j.tracks.includes(track));

/**
 * @param {object} args
 * @param {'privacy'|'agentic'} args.track
 * @param {object[]} args.submissions  repository rows (with details, prizes, ecosystemPrize)
 * @param {object[]} args.scores       rubric score rows for the program
 * @param {object[]} args.judges       program_admin_emails judge rows ({ email, name, tracks })
 */
export function computeLeaderboard({ track, submissions, scores, judges }) {
  const ranking = RUBRIC_RANKING[track];
  const trackJudges = judgesForTrack(judges, track).map((j) => j.email);
  const entries = submissions.filter((s) => s.details && judgedTracksOf(s.details.track).includes(track));

  const rows = entries.map((s) => {
    const counted = countedScores(scores, s.id, track);
    const avgByCriterion = {};
    for (const c of RUBRICS[track]) avgByCriterion[c.id] = mean(counted.map((x) => x.criteria[c.id] ?? 0));
    return {
      rank: 0,
      submissionId: s.id,
      projectTitle: s.projectTitle,
      submitterName: s.submitterName,
      track: s.details.track,
      avgTotal: mean(counted.map((x) => total(track, x.criteria))),
      avgByCriterion,
      bonusCount: ranking.bonusId ? counted.filter((x) => (x.criteria[ranking.bonusId] ?? 0) > 0).length : 0,
      judgeCount: counted.length,
      tieBrokenBy: null,
      judgeScores: counted.map((x) => ({
        judgeEmail: x.judgeEmail,
        total: total(track, x.criteria),
        criteria: x.criteria,
        notes: x.notes ?? '',
        session: x.session ?? '',
      })),
      txCheck: s.details.txCheck ?? null,
      prize: s.prizes?.[track] ?? null,
      ecosystemPrize: !!s.ecosystemPrize,
      winnerBlocked: winnerBlockedReason(track, scores, s.id),
    };
  });

  const tieValue = (r, i) => {
    const tb = ranking.tieBreaks[i];
    return tb.kind === 'bonusCount' ? r.bonusCount : r.avgByCriterion[tb.id] ?? 0;
  };
  rows.sort((a, b) => {
    if (Math.abs(b.avgTotal - a.avgTotal) > EPS) return b.avgTotal - a.avgTotal;
    for (let i = 0; i < ranking.tieBreaks.length; i += 1) {
      const d = tieValue(b, i) - tieValue(a, i);
      if (Math.abs(d) > EPS) return d;
    }
    return 0;
  });
  rows.forEach((r, i) => {
    r.rank = i + 1;
    const prev = rows[i - 1];
    if (prev && Math.abs(prev.avgTotal - r.avgTotal) <= EPS) {
      const decider = ranking.tieBreaks.findIndex((_, t) => Math.abs(tieValue(prev, t) - tieValue(r, t)) > EPS);
      r.tieBrokenBy = decider >= 0 ? ranking.tieBreaks[decider].label : 'unresolved';
    }
  });

  return {
    track,
    judges: trackJudges,
    submissionsTotal: entries.length,
    submissionsFullyScored: rows.filter((r) => r.judgeCount === trackJudges.length).length,
    rows,
  };
}

/** Per judge: fully scored (submission, track) pairs out of everything in their tracks. */
export function computeJudgingProgress({ submissions, scores, judges }) {
  return judges.map((j) => {
    const tracks = Array.isArray(j.tracks) && j.tracks.length ? j.tracks : Object.keys(RUBRICS);
    let scored = 0;
    let totalCount = 0;
    for (const s of submissions) {
      if (!s.details) continue;
      for (const t of judgedTracksOf(s.details.track)) {
        if (!tracks.includes(t)) continue;
        totalCount += 1;
        const x = scores.find((sc) => sc.submissionId === s.id && sc.track === t && sc.judgeEmail === j.email);
        if (x && isFullyScored(t, x.criteria)) scored += 1;
      }
    }
    return { email: j.email, name: j.name || j.email.split('@')[0], tracks, scored, total: totalCount };
  });
}
