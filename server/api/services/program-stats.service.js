// The prize winners and submission stats page. Pure: the controller loads the
// program's submissions, rubric scores, judges and event ratings and passes
// them in. Mirrors client/src/lib/programStats.ts (the playground computes the
// page itself); program-stats-parity.test.js checks both agree.
//
// Rules from the brief:
// - Test entries are excluded everywhere (callers pass counted entries only).
// - Projects only in the unscored track (Agentic Commerce, judged by
//   Bitrefill) never get a score, a zero or a blank bar: they're in counts and
//   categories, and in score views only in a "not scored" list.
// - Feedback: numeric questions only, per question and track, never names,
//   emails, projects or free text; questions under the minimum are hidden.
// - Hackers are matched across teams on email, not name.

import { RUBRICS } from '../constants/rubrics.js';
import { EXPERIENCE_RATING_CATEGORIES } from '../constants/experienceRatings.js';
import { UNCATEGORIZED } from '../constants/programStats.js';
import { computeLeaderboard } from './rubric-leaderboard.service.js';
import { buildPrivacyReview, privacyReviewChecks } from './privacy-review.service.js';

const round1 = (n) => Math.round(n * 10) / 10;
const norm = (t) =>
  String(t ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
const present = (v) => typeof v === 'string' && v.trim().length > 0;
const email = (v) => (typeof v === 'string' ? v.trim().toLowerCase() : '');

export const TRACK_LABELS = { privacy: 'Privacy', both: 'Both tracks', agentic: 'Agentic Commerce only' };
const JUDGED_LABELS = { privacy: 'Privacy', agentic: 'Agentic Commerce' };
export const RATING_LABELS = {
  overall: 'Overall experience',
  organisation: 'Organisation & logistics',
  support: 'Mentors & organiser support',
  tools: 'Sponsor tools & docs',
};

/** The category for a project: id match first, then title; else Uncategorized. */
export function categorize(categories, s) {
  for (const c of categories) if (c.ids?.includes(s.id)) return { id: c.id, label: c.label, by: 'id' };
  const t = norm(s.projectTitle);
  for (const c of categories) {
    if (c.titles.some((x) => t === norm(x) || t.startsWith(`${norm(x)} `))) return { id: c.id, label: c.label, by: 'title' };
  }
  return { ...UNCATEGORIZED, by: null };
}

/** For an unmatched project: the category whose keywords hit most often in its text. */
export function suggestCategory(categories, s) {
  const text = ` ${norm([s.projectTitle, s.details?.pitch, s.projectBrief].filter(Boolean).join(' '))} `;
  let best = null;
  let bestHits = 0;
  for (const c of categories) {
    const hits = (c.keywords ?? []).filter((k) => text.includes(` ${norm(k)}`)).length;
    if (hits > bestHits) {
      best = c.label;
      bestHits = hits;
    }
  }
  return best;
}

const hasPrize = (s) => Object.keys(s.prizes ?? {}).length > 0;
const projectRef = (s) => ({
  id: s.id,
  title: s.projectTitle,
  track: s.details?.track ?? null,
  // Only prize winners have a public project page.
  linkable: hasPrize(s),
});

/** Teammates and the point person, deduped by email within the team. */
function peopleOf(s) {
  const out = [];
  const seen = new Set();
  const add = (name, mail) => {
    const key = email(mail) || `name:${s.id}:${norm(name)}`;
    if (!name && !mail) return;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ key, name: (name ?? '').trim() });
  };
  add(s.submitterName, s.lumaEmail);
  for (const m of s.details?.team ?? []) add(m?.name, m?.email);
  return out;
}

/**
 * @param {object} args
 * @param {object} args.program        { slug, prizeTiers }
 * @param {object[]} args.submissions  counted entries only (no test entries, no abandoned drafts)
 * @param {object[]} args.scores       rubric score rows
 * @param {object[]} args.judges       judge rows
 * @param {{ submissionId: string, category: string, score: number }[]} args.ratings
 * @param {object} args.config         PROGRAM_STATS[slug]
 * @param {object|null} [args.review]  the privacy track tech review fixture (loadPrivacyReview), if the config has one
 * @param {Date} [args.now]
 */
export function computeStats({ program, submissions, scores, judges, ratings, config, review = null, now = new Date() }) {
  // Judge signal: the live (normalized when available) leaderboard of the judged track.
  const board = computeLeaderboard({ track: config.judgeTrack, submissions: submissions.filter((s) => s.details), scores, judges, now });
  return buildStats({ program, submissions, board, ratings, config, review, now });
}

/**
 * The stats from a ready leaderboard of the judged track (pure; the client
 * playground passes its own board, programStats.ts mirrors this function).
 */
export function buildStats({ program, submissions, board, ratings, config, review = null, now = new Date() }) {
  const { categories, weights, judgeTrack, unscoredTrack, minFeedbackResponses } = config;
  const subs = submissions.filter((s) => s.details);
  const onlyUnscored = (s) => s.details.track === unscoredTrack.track;
  const scoreMax = config.scoreMax ?? RUBRICS[judgeTrack].reduce((a, c) => a + c.max, 0);
  const judged = new Map(
    board.rows
      .filter((r) => r.judgeCount > 0)
      .map((r) => [r.submissionId, r.normTotal ?? r.avgTotal]),
  );
  const normalized = !!board.normalization?.enabled && board.normalization?.available !== false;

  // 1. Prize winners, per judged track. The judged track is ranked by score
  // (highest first, so the place is the rank); Agentic Commerce has no Stadium
  // score, so best prize first. Ties: bigger prize, then title.
  const winners = {};
  for (const track of Object.keys(JUDGED_LABELS)) {
    const amount = (w) => Number(w.prize.amount);
    winners[track] = subs
      .filter((s) => s.prizes?.[track])
      .map((s) => ({
        prize: { label: s.prizes[track].label, amount: s.prizes[track].amount, currency: s.prizes[track].currency },
        project: projectRef(s),
        ecosystemPrize: track === judgeTrack && !!s.ecosystemPrize,
        // Agentic Commerce winners show without scores.
        score: track === judgeTrack && judged.has(s.id) ? round1(judged.get(s.id)) : null,
      }))
      .sort((a, b) => (b.score ?? -Infinity) - (a.score ?? -Infinity) || amount(b) - amount(a) || a.project.title.localeCompare(b.project.title))
      .map((w, i) => ({ place: i + 1, ...w }));
  }

  // Hackers, deduped across teams on email.
  const hackers = new Set();
  for (const s of subs) for (const p of peopleOf(s)) hackers.add(p.key);

  // 2. Headline numbers.
  const byTrack = { privacy: 0, both: 0, agentic: 0 };
  for (const s of subs) byTrack[s.details.track] = (byTrack[s.details.track] ?? 0) + 1;
  const headline = {
    submissions: subs.length,
    hackers: hackers.size,
    teams: subs.length,
    byTrack,
  };

  // 3. Composite: likely to continue and get support (0–100).
  const shippedMax = Object.values(weights.shipped).reduce((a, b) => a + b, 0);
  const composite = subs
    .map((s) => {
      const judgeValue = onlyUnscored(s) ? null : judged.get(s.id) ?? null;
      const support = s.ecosystemPrize || present(s.details?.milestone?.partnerName) || present(s.details?.milestone?.partnerProject);
      const milestone = present(s.details?.nextStep) || present(s.details?.milestone?.sentence);
      const shipped = {
        publicUrl: present(s.details?.publicUrl) ? weights.shipped.publicUrl : 0,
        demoVideo: present(s.videoUrl) ? weights.shipped.demoVideo : 0,
        repo: present(s.githubUrl) ? weights.shipped.repo : 0,
      };
      const parts = {
        judge: judgeValue == null ? null : (weights.judge * judgeValue) / scoreMax,
        support: support ? weights.support : 0,
        milestone: milestone ? weights.milestone : 0,
        shipped: shipped.publicUrl + shipped.demoVideo + shipped.repo,
      };
      const others = parts.support + parts.milestone + parts.shipped;
      const othersMax = weights.support + weights.milestone + shippedMax;
      // No judge score: ranked on the other signals, scaled up to 100.
      const score = parts.judge == null ? (100 * others) / othersMax : parts.judge + others;
      return {
        project: projectRef(s),
        score: round1(score),
        noJudgeScore: parts.judge == null,
        breakdown: {
          judge: parts.judge == null ? null : round1(parts.judge),
          support: parts.support,
          milestone: parts.milestone,
          shipped,
        },
      };
    })
    .sort((a, b) => b.score - a.score || a.project.title.localeCompare(b.project.title))
    .map((r, i) => ({ rank: i + 1, ...r }));

  // 4. Submissions per track, then per category split by track.
  const perTrack = Object.keys(TRACK_LABELS).map((t) => ({
    id: t,
    label: TRACK_LABELS[t],
    count: byTrack[t] ?? 0,
    projects: subs.filter((s) => s.details.track === t).map(projectRef),
  }));
  const catOf = new Map(subs.map((s) => [s.id, categorize(categories, s)]));
  const catList = [...categories.map((c) => ({ id: c.id, label: c.label })), UNCATEGORIZED];
  const perCategory = catList
    .map((c) => {
      const mine = subs.filter((s) => catOf.get(s.id).id === c.id);
      return {
        id: c.id,
        label: c.label,
        total: mine.length,
        segments: Object.keys(TRACK_LABELS).map((t) => {
          const seg = mine.filter((s) => s.details.track === t);
          return { track: t, count: seg.length, projects: seg.map(projectRef) };
        }),
      };
    })
    .filter((c) => c.total > 0 || c.id !== UNCATEGORIZED.id);

  // 5. Top scored projects per category (judged track only).
  const topByCategory = perCategory.map((c) => {
    const mine = subs.filter((s) => catOf.get(s.id).id === c.id);
    return {
      id: c.id,
      label: c.label,
      scored: mine
        .filter((s) => !onlyUnscored(s) && judged.has(s.id))
        .map((s) => ({ project: projectRef(s), score: round1(judged.get(s.id)), winner: hasPrize(s) }))
        .sort((a, b) => b.score - a.score || a.project.title.localeCompare(b.project.title)),
      unscored: mine.filter((s) => !onlyUnscored(s) && !judged.has(s.id)).map(projectRef),
      notJudged: mine.filter(onlyUnscored).map(projectRef),
    };
  });

  // 6. Top projects per rubric criterion (judged track only): the values the
  // track was ranked on (normalized when the board is), every scored project.
  const rowOf = new Map(board.rows.filter((r) => r.judgeCount > 0).map((r) => [r.submissionId, r]));
  const criterionValue = (r, id) => (normalized && r.normByCriterion ? r.normByCriterion[id] : r.avgByCriterion?.[id]) ?? 0;
  const topByCriterion = (RUBRICS[judgeTrack] ?? []).map((c) => ({
    id: c.id,
    max: c.max,
    rows: subs
      .filter((s) => !onlyUnscored(s) && rowOf.has(s.id) && judged.has(s.id))
      .map((s) => ({ project: projectRef(s), score: round1(criterionValue(rowOf.get(s.id), c.id)), total: judged.get(s.id), winner: hasPrize(s) }))
      .sort((a, b) => b.score - a.score || b.total - a.total || a.project.title.localeCompare(b.project.title))
      .map(({ total: _total, ...x }) => x),
  }));

  // 7. Event feedback: numeric questions only, per track and overall.
  const trackOf = new Map(subs.map((s) => [s.id, s.details.track]));
  const ratingRows = ratings.filter((r) => trackOf.has(r.submissionId) && Number.isFinite(Number(r.score)));
  const summarize = (rows) =>
    EXPERIENCE_RATING_CATEGORIES.map((q) => {
      const xs = rows.filter((r) => r.category === q).map((r) => Number(r.score));
      const suppressed = xs.length < minFeedbackResponses;
      const distribution = {};
      for (let v = 1; v <= 5; v += 1) distribution[v] = suppressed ? 0 : xs.filter((x) => x === v).length;
      return {
        id: q,
        label: RATING_LABELS[q] ?? q,
        n: suppressed ? 0 : xs.length,
        avg: suppressed || !xs.length ? null : round1(xs.reduce((a, b) => a + b, 0) / xs.length),
        distribution,
        suppressed,
      };
    });
  const feedbackGroups = [{ id: 'all', label: 'All tracks' }, ...Object.entries(TRACK_LABELS).map(([id, label]) => ({ id, label }))];
  const feedback = {
    minResponses: minFeedbackResponses,
    groups: feedbackGroups.map((g) => {
      const rows = g.id === 'all' ? ratingRows : ratingRows.filter((r) => trackOf.get(r.submissionId) === g.id);
      return { id: g.id, label: g.label, none: rows.length === 0, questions: rows.length ? summarize(rows) : [] };
    }),
  };

  return {
    programSlug: program.slug,
    generatedAt: now.toISOString(),
    normalized,
    scoreMax,
    unscoredNote: unscoredTrack.note,
    winners,
    headline,
    composite,
    perTrack,
    perCategory,
    topByCategory,
    topByCriterion,
    feedback,
    // 8. Privacy track tech review (from the versioned fixture).
    ...(review ? { privacyReview: buildPrivacyReview(review, subs) } : {}),
  };
}

/**
 * Admin-only checks against the final CSV and the data: never published.
 * @param {object[]} counted  counted entries
 * @param {object[]} testEntries  excluded test entries
 */
export function computeChecks({ counted, testEntries = [], stats, config, review = null }) {
  const { expected, categories } = config;
  const subs = counted.filter((s) => s.details);
  const mismatches = [];
  if (expected) {
    if (stats.headline.submissions !== expected.submissions) {
      mismatches.push(`Submissions: ${stats.headline.submissions} in the database, ${expected.submissions} expected`);
    }
    for (const [t, n] of Object.entries(expected.byTrack ?? {})) {
      const got = stats.headline.byTrack[t] ?? 0;
      if (got !== n) mismatches.push(`${TRACK_LABELS[t] ?? t}: ${got} in the database, ${n} expected`);
    }
  }

  const dupes = [];
  const findDupes = (label, keyOf) => {
    const seen = new Map();
    for (const s of subs) {
      const k = keyOf(s);
      if (!k) continue;
      if (seen.has(k)) dupes.push(`${label}: "${seen.get(k)}" and "${s.projectTitle}"`);
      else seen.set(k, s.projectTitle);
    }
  };
  findDupes('Same title', (s) => norm(s.projectTitle));
  findDupes('Same repo', (s) => (present(s.githubUrl) ? s.githubUrl.trim().toLowerCase().replace(/\/+$/, '') : null));
  findDupes('Same public URL', (s) => (present(s.details?.publicUrl) ? s.details.publicUrl.trim().toLowerCase().replace(/\/+$/, '') : null));
  findDupes('Same point person', (s) => email(s.lumaEmail) || null);

  const uncategorized = subs
    .filter((s) => categorize(categories, s).id === UNCATEGORIZED.id)
    .map((s) => ({ id: s.id, title: s.projectTitle, suggested: suggestCategory(categories, s) }));

  const gaps = {
    noDescription: subs.filter((s) => !present(s.details?.pitch) && !present(s.projectBrief)).map((s) => s.projectTitle),
    noRepo: subs.filter((s) => !present(s.githubUrl)).map((s) => s.projectTitle),
    noDemoVideo: subs.filter((s) => !present(s.videoUrl)).map((s) => s.projectTitle),
  };

  return {
    mismatches,
    duplicates: dupes,
    uncategorized,
    gaps,
    testEntries: testEntries.map((s) => s.projectTitle),
    ...(review ? { privacyReview: privacyReviewChecks(review, subs) } : {}),
  };
}

/** What gets published: the stats without the admin-only composite ranking. */
export const publicSnapshot = (stats) => {
  if (!stats) return stats;
  // Admin-only composite; multiple-teams data is no longer published (older snapshots may still have it).
  const { composite: _composite, multiTeam: _multiTeam, ...rest } = stats;
  if (rest.headline && 'multiTeamHackers' in rest.headline) {
    const { multiTeamHackers: _m, ...headline } = rest.headline;
    return { ...rest, headline };
  }
  return rest;
};

/** Stable JSON without the generation time, to tell whether live stats differ from the snapshot. */
export const statsFingerprint = (stats) => {
  if (!stats) return null;
  const { generatedAt, ...rest } = stats;
  return JSON.stringify(rest);
};
