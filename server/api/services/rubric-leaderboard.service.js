// Per-track rubric leaderboard for tracked programs (Free Society Hack). Pure:
// the controller loads submissions, scores and judges and passes them in.
// Mirrors client/src/lib/mockTrackedSubmissions.ts (leaderboard) so the
// playground and production rank the same way.

import { RUBRICS, RUBRIC_RANKING } from '../constants/rubrics.js';
import { DEFAULT_NORMALIZATION, normalizeTrack } from './score-normalization.service.js';

const EPS = 1e-9;
const mean = (ns) => (ns.length ? ns.reduce((a, b) => a + b, 0) / ns.length : 0);

/** The judged tracks a submission takes part in ("both" = privacy and agentic). */
export const judgedTracksOf = (track) => (!track ? [] : track === 'both' ? ['privacy', 'agentic'] : [track]);

export const isFullyScored = (track, criteria) =>
  RUBRICS[track].every((c) => typeof criteria?.[c.id] === 'number');

const total = (track, criteria) => RUBRICS[track].reduce((sum, c) => sum + (criteria?.[c.id] ?? 0), 0);

/** Complete, not abstained (an abstention counts as a missing score). */
const counts = (track, x) => !x.abstained && isFullyScored(track, x.criteria);

/** Fully scored rows for one submission and track. */
const countedScores = (scores, submissionId, track) =>
  scores.filter((x) => x.submissionId === submissionId && x.track === track && counts(track, x));

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
 * @param {Date} [args.now]             when the board is computed (the "Last recalculated" time)
 */
export function computeLeaderboard({ track, submissions, scores, judges, now = new Date() }) {
  const ranking = RUBRIC_RANKING[track];
  const normalization = { ...DEFAULT_NORMALIZATION, ...(ranking.normalization ?? {}) };
  const trackJudges = judgesForTrack(judges, track).map((j) => j.email);
  const entries = submissions.filter((s) => s.details && judgedTracksOf(s.details.track).includes(track));
  const entryIds = new Set(entries.map((s) => s.id));

  // Every counted score in the track feeds the normalization: one judge's new
  // score moves that judge's mean and SD, and so every project they scored.
  const trackScores = scores.filter((x) => x.track === track && entryIds.has(x.submissionId) && counts(track, x));
  const norm = normalizeTrack({
    criteria: RUBRICS[track],
    bonusIds: ranking.bonusId ? [ranking.bonusId] : [],
    scores: trackScores,
    config: normalization,
  });

  // Normalization is on only when configured and enough judges have scored.
  const normOn = normalization.enabled && norm.available;
  const rows = entries.map((s) => {
    const counted = countedScores(trackScores, s.id, track);
    const avgByCriterion = {};
    for (const c of RUBRICS[track]) avgByCriterion[c.id] = mean(counted.map((x) => x.criteria[c.id] ?? 0));
    const n = normOn ? norm.projects.get(s.id) : null;
    const contributionOf = new Map((n?.contributions ?? []).map((c) => [c.judgeEmail, c]));
    return {
      rank: 0,
      rawRank: 0,
      normRank: null,
      rankChange: 0,
      submissionId: s.id,
      projectTitle: s.projectTitle,
      submitterName: s.submitterName,
      track: s.details.track,
      // 'draft' = the team hasn't finalized yet (judged and awarded the same way).
      status: s.status ?? 'submitted',
      avgTotal: mean(counted.map((x) => total(track, x.criteria))),
      avgByCriterion,
      // No scores yet (or normalization off): the normalized values stay null.
      normTotal: n ? n.normTotal : null,
      normByCriterion: n ? n.normByCriterion : null,
      zTotal: n ? n.zTotal : null,
      offsetTotal: n ? n.offsetTotal : null,
      // Coverage over the judges who have scored this track, not those assigned.
      coverage: { scored: counted.length, of: norm.scoringJudges },
      fullyScored: counted.length > 0 && counted.length === norm.scoringJudges,
      bonusCount: ranking.bonusId ? counted.filter((x) => (x.criteria[ranking.bonusId] ?? 0) > 0).length : 0,
      judgeCount: counted.length,
      tieBrokenBy: null,
      rawTieBrokenBy: null,
      normTieBrokenBy: null,
      judgeScores: counted.map((x) => ({
        judgeEmail: x.judgeEmail,
        total: total(track, x.criteria),
        criteria: x.criteria,
        notes: x.notes ?? '',
        session: x.session ?? '',
        normContribution: contributionOf.get(x.judgeEmail)?.value ?? null,
        method: contributionOf.get(x.judgeEmail)?.method ?? null,
      })),
      txCheck: s.details.txCheck ?? null,
      prize: s.prizes?.[track] ?? null,
      ecosystemPrize: !!s.ecosystemPrize,
      // Eligibility reads the raw average: a raw Works 0 means it doesn't work.
      winnerBlocked: winnerBlockedReason(track, scores, s.id),
    };
  });

  const rawOrder = rankBy(rows, ranking, (r) => r.avgTotal, (r) => r.avgByCriterion);
  rawOrder.forEach(({ row, tieBrokenBy }, i) => {
    row.rawRank = i + 1;
    row.rawTieBrokenBy = tieBrokenBy;
  });
  let primary = rawOrder;
  if (normOn) {
    const normOrder = rankBy(rows, ranking, (r) => r.normTotal ?? -Infinity, (r) => r.normByCriterion ?? {});
    normOrder.forEach(({ row, tieBrokenBy }, i) => {
      // Unscored projects have no normalized value, so no normalized rank.
      if (row.normTotal == null) return;
      row.normRank = i + 1;
      row.normTieBrokenBy = tieBrokenBy;
      row.rankChange = row.rawRank - row.normRank;
    });
    primary = normOrder;
  }
  primary.forEach(({ row, tieBrokenBy }, i) => {
    row.rank = i + 1;
    row.tieBrokenBy = tieBrokenBy;
  });

  return {
    track,
    judges: trackJudges,
    submissionsTotal: entries.length,
    submissionsFullyScored: rows.filter((r) => r.judgeCount === trackJudges.length).length,
    normalization: {
      ...normalization,
      available: norm.available,
      reason: norm.reason,
      scoringJudges: norm.scoringJudges,
    },
    judgeStats: norm.judgeStats,
    computedAt: now.toISOString(),
    rows: primary.map((x) => x.row),
  };
}

/**
 * Sorts rows by a total, then the track's tie-breaks (criterion averages or the
 * bonus count). Returns each row with the tie-break that decided it against the
 * row above, or 'unresolved' when every tie-break is equal.
 */
function rankBy(rows, ranking, totalOf, critOf) {
  const tieValue = (r, i) => {
    const tb = ranking.tieBreaks[i];
    return tb.kind === 'bonusCount' ? r.bonusCount : critOf(r)[tb.id] ?? 0;
  };
  const sameTotal = (a, b) => totalOf(a) === totalOf(b) || Math.abs(totalOf(a) - totalOf(b)) <= EPS;
  const sorted = [...rows].sort((a, b) => {
    if (!sameTotal(a, b)) return totalOf(b) - totalOf(a);
    for (let i = 0; i < ranking.tieBreaks.length; i += 1) {
      const d = tieValue(b, i) - tieValue(a, i);
      if (Math.abs(d) > EPS) return d;
    }
    return 0;
  });
  return sorted.map((row, i) => {
    const prev = sorted[i - 1];
    let tieBrokenBy = null;
    if (prev && sameTotal(prev, row)) {
      const decider = ranking.tieBreaks.findIndex((_, t) => Math.abs(tieValue(prev, t) - tieValue(row, t)) > EPS);
      tieBrokenBy = decider >= 0 ? ranking.tieBreaks[decider].label : 'unresolved';
    }
    return { row, tieBrokenBy };
  });
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
