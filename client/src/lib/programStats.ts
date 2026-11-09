// The prize winners and submission stats page. Line-for-line port of
// server/api/services/program-stats.service.js (buildStats, computeChecks,
// categorize, suggestCategory, statsFingerprint) so the playground builds the
// page exactly like production. The server's program-stats-parity.test.js
// imports this file and checks both agree.

import type { ApiRubricLeaderboard } from "./api";
import { EXPERIENCE_RATING_CATEGORIES } from "./experienceRatings";
import { getProgramProfile } from "./programProfiles";
import { UNCATEGORIZED, type ProgramStatsConfig, type SubmissionCategory } from "./programStatsConfig";
import { buildPrivacyReview, privacyReviewChecks, type PrivacyReview, type PrivacyReviewChecks, type PrivacyReviewData } from "./privacyReview";

// ── Snapshot types (what the stats endpoints return) ──

export type StatsProject = { id: string; title: string; track: string | null; linkable: boolean };
export type StatsWinner = {
  place: number;
  prize: { label: string; amount: number | string; currency: string };
  project: StatsProject;
  ecosystemPrize: boolean;
  score: number | null;
};
export type StatsCompositeRow = {
  rank: number;
  project: StatsProject;
  score: number;
  noJudgeScore: boolean;
  breakdown: {
    judge: number | null;
    support: number;
    milestone: number;
    shipped: { publicUrl: number; demoVideo: number; repo: number };
  };
};
export type StatsFeedbackQuestion = {
  id: string;
  label: string;
  n: number;
  avg: number | null;
  distribution: Record<number, number>;
  suppressed: boolean;
};
export type ProgramStats = {
  programSlug: string;
  generatedAt: string;
  normalized: boolean;
  scoreMax: number;
  unscoredNote: string;
  winners: Record<string, StatsWinner[]>;
  headline: { submissions: number; hackers: number; teams: number; byTrack: Record<string, number> };
  /** Admin only (CSV download in the admin preview): never in the published snapshot. */
  composite?: StatsCompositeRow[];
  perTrack: { id: string; label: string; count: number; projects: StatsProject[] }[];
  perCategory: { id: string; label: string; total: number; segments: { track: string; count: number; projects: StatsProject[] }[] }[];
  topByCategory: {
    id: string;
    label: string;
    scored: { project: StatsProject; score: number; winner: boolean }[];
    unscored: StatsProject[];
    notJudged: StatsProject[];
  }[];
  /** Per rubric criterion of the judged track: every scored project, highest first. */
  topByCriterion?: { id: string; max: number; rows: { project: StatsProject; score: number; winner: boolean }[] }[];
  feedback: { minResponses: number; groups: { id: string; label: string; none: boolean; questions: StatsFeedbackQuestion[] }[] };
  /** Privacy track tech review (from the versioned fixture), when the program has one. */
  privacyReview?: PrivacyReview | null;
};
export type ProgramStatsChecks = {
  mismatches: string[];
  duplicates: string[];
  uncategorized: { id: string; title: string; suggested: string | null }[];
  gaps: { noDescription: string[]; noRepo: string[]; noDemoVideo: string[] };
  testEntries: string[];
  privacyReview?: PrivacyReviewChecks | null;
};

/** The submission fields the stats read (a subset of ApiTrackedSubmission). */
export type StatsSubmission = {
  id: string;
  projectTitle: string;
  submitterName?: string | null;
  lumaEmail?: string | null;
  videoUrl?: string | null;
  githubUrl?: string | null;
  projectBrief?: string | null;
  prizes?: Record<string, { label: string; amount: number | string; currency: string } | null | undefined> | null;
  ecosystemPrize?: boolean;
  details?: {
    track: string;
    pitch?: string | null;
    publicUrl?: string | null;
    nextStep?: string | null;
    team?: { name?: string | null; email?: string | null }[] | null;
    anonymous?: boolean | null;
    milestone?: { sentence?: string | null; partnerName?: string | null; partnerProject?: string | null } | null;
  } | null;
};

// ── Port ──

const round1 = (n: number) => Math.round(n * 10) / 10;
const norm = (t: unknown) =>
  String(t ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const present = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
const email = (v: unknown) => (typeof v === "string" ? v.trim().toLowerCase() : "");

export const TRACK_LABELS: Record<string, string> = { privacy: "Privacy", both: "Both tracks", agentic: "Agentic Commerce only" };
const JUDGED_LABELS: Record<string, string> = { privacy: "Privacy", agentic: "Agentic Commerce" };
export const RATING_LABELS: Record<string, string> = Object.fromEntries(EXPERIENCE_RATING_CATEGORIES.map((c) => [c.id, c.label]));
const RATING_IDS = EXPERIENCE_RATING_CATEGORIES.map((c) => c.id as string);

export type CategoryHit = { id: string; label: string; by: "id" | "title" | null };

export function categorize(categories: SubmissionCategory[], s: { id: string; projectTitle: string }): CategoryHit {
  for (const c of categories) if (c.ids?.includes(s.id)) return { id: c.id, label: c.label, by: "id" };
  const t = norm(s.projectTitle);
  for (const c of categories) {
    if (c.titles.some((x) => t === norm(x) || t.startsWith(`${norm(x)} `))) return { id: c.id, label: c.label, by: "title" };
  }
  return { ...UNCATEGORIZED, by: null };
}

export function suggestCategory(
  categories: SubmissionCategory[],
  s: { projectTitle: string; projectBrief?: string | null; details?: { pitch?: string | null } | null },
): string | null {
  const text = ` ${norm([s.projectTitle, s.details?.pitch, s.projectBrief].filter(Boolean).join(" "))} `;
  let best: string | null = null;
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

const hasPrize = (s: StatsSubmission) => Object.keys(s.prizes ?? {}).length > 0;
const projectRef = (s: StatsSubmission): StatsProject => ({
  id: s.id,
  title: s.projectTitle,
  track: s.details?.track ?? null,
  linkable: hasPrize(s),
});

function peopleOf(s: StatsSubmission) {
  const out: { key: string; name: string }[] = [];
  const seen = new Set<string>();
  const add = (name: string | null | undefined, mail: string | null | undefined) => {
    const key = email(mail) || `name:${s.id}:${norm(name)}`;
    if (!name && !mail) return;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ key, name: (name ?? "").trim() });
  };
  add(s.submitterName, s.lumaEmail);
  for (const m of s.details?.team ?? []) add(m?.name, m?.email);
  return out;
}

export function buildStats({
  program,
  submissions,
  board,
  ratings,
  config,
  review = null,
  now = new Date(),
}: {
  program: { slug: string };
  submissions: StatsSubmission[];
  board: Pick<ApiRubricLeaderboard, "rows" | "normalization">;
  ratings: { submissionId: string; category: string; score: number }[];
  config: ProgramStatsConfig & { scoreMax: number };
  review?: PrivacyReviewData | null;
  now?: Date;
}): ProgramStats {
  const { categories, weights, judgeTrack, unscoredTrack, minFeedbackResponses } = config;
  const subs = submissions.filter((s): s is StatsSubmission & { details: NonNullable<StatsSubmission["details"]> } => !!s.details);
  const onlyUnscored = (s: (typeof subs)[number]) => s.details.track === unscoredTrack.track;
  const scoreMax = config.scoreMax;
  const judged = new Map(
    board.rows.filter((r) => r.judgeCount > 0).map((r) => [r.submissionId, r.normTotal ?? r.avgTotal] as [string, number]),
  );
  const normalized = !!board.normalization?.enabled && board.normalization?.available !== false;

  const winners: Record<string, StatsWinner[]> = {};
  for (const track of Object.keys(JUDGED_LABELS)) {
    const amount = (w: Omit<StatsWinner, "place">) => Number(w.prize.amount);
    winners[track] = subs
      .filter((s) => s.prizes?.[track])
      .map((s) => ({
        prize: { label: s.prizes![track]!.label, amount: s.prizes![track]!.amount, currency: s.prizes![track]!.currency },
        project: projectRef(s),
        ecosystemPrize: track === judgeTrack && !!s.ecosystemPrize,
        score: track === judgeTrack && judged.has(s.id) ? round1(judged.get(s.id)!) : null,
      }))
      .sort((a, b) => (b.score ?? -Infinity) - (a.score ?? -Infinity) || amount(b) - amount(a) || a.project.title.localeCompare(b.project.title))
      .map((w, i) => ({ place: i + 1, ...w }));
  }

  const hackers = new Set<string>();
  for (const s of subs) for (const p of peopleOf(s)) hackers.add(p.key);

  const byTrack: Record<string, number> = { privacy: 0, both: 0, agentic: 0 };
  for (const s of subs) byTrack[s.details.track] = (byTrack[s.details.track] ?? 0) + 1;
  const headline = {
    submissions: subs.length,
    hackers: hackers.size,
    teams: subs.length,
    byTrack,
  };

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
      const mine = subs.filter((s) => catOf.get(s.id)!.id === c.id);
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

  const topByCategory = perCategory.map((c) => {
    const mine = subs.filter((s) => catOf.get(s.id)!.id === c.id);
    return {
      id: c.id,
      label: c.label,
      scored: mine
        .filter((s) => !onlyUnscored(s) && judged.has(s.id))
        .map((s) => ({ project: projectRef(s), score: round1(judged.get(s.id)!), winner: hasPrize(s) }))
        .sort((a, b) => b.score - a.score || a.project.title.localeCompare(b.project.title)),
      unscored: mine.filter((s) => !onlyUnscored(s) && !judged.has(s.id)).map(projectRef),
      notJudged: mine.filter(onlyUnscored).map(projectRef),
    };
  });

  const rowOf = new Map(board.rows.filter((r) => r.judgeCount > 0).map((r) => [r.submissionId, r]));
  const criterionValue = (r: (typeof board.rows)[number], id: string) =>
    (normalized && r.normByCriterion ? r.normByCriterion[id] : r.avgByCriterion?.[id]) ?? 0;
  const rubricCriteria = getProgramProfile(program.slug)?.tracks.find((t) => t.id === judgeTrack)?.rubric.criteria ?? [];
  const topByCriterion = rubricCriteria.map((c) => ({
    id: c.id,
    max: c.max,
    rows: subs
      .filter((s) => !onlyUnscored(s) && rowOf.has(s.id) && judged.has(s.id))
      .map((s) => ({ project: projectRef(s), score: round1(criterionValue(rowOf.get(s.id)!, c.id)), total: judged.get(s.id)!, winner: hasPrize(s) }))
      .sort((a, b) => b.score - a.score || b.total - a.total || a.project.title.localeCompare(b.project.title))
      .map(({ total: _total, ...x }) => x),
  }));

  const trackOf = new Map(subs.map((s) => [s.id, s.details.track]));
  const ratingRows = ratings.filter((r) => trackOf.has(r.submissionId) && Number.isFinite(Number(r.score)));
  const summarize = (rows: typeof ratingRows): StatsFeedbackQuestion[] =>
    RATING_IDS.map((q) => {
      const xs = rows.filter((r) => r.category === q).map((r) => Number(r.score));
      const suppressed = xs.length < minFeedbackResponses;
      const distribution: Record<number, number> = {};
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
  const feedbackGroups = [{ id: "all", label: "All tracks" }, ...Object.entries(TRACK_LABELS).map(([id, label]) => ({ id, label }))];
  const feedback = {
    minResponses: minFeedbackResponses,
    groups: feedbackGroups.map((g) => {
      const rows = g.id === "all" ? ratingRows : ratingRows.filter((r) => trackOf.get(r.submissionId) === g.id);
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

export function computeChecks({
  counted,
  testEntries = [],
  stats,
  config,
  review = null,
}: {
  counted: StatsSubmission[];
  testEntries?: { projectTitle: string }[];
  stats: ProgramStats;
  config: ProgramStatsConfig;
  review?: PrivacyReviewData | null;
}): ProgramStatsChecks {
  const { expected, categories } = config;
  const subs = counted.filter((s) => s.details);
  const mismatches: string[] = [];
  if (expected) {
    if (stats.headline.submissions !== expected.submissions) {
      mismatches.push(`Submissions: ${stats.headline.submissions} in the database, ${expected.submissions} expected`);
    }
    for (const [t, n] of Object.entries(expected.byTrack ?? {})) {
      const got = stats.headline.byTrack[t] ?? 0;
      if (got !== n) mismatches.push(`${TRACK_LABELS[t] ?? t}: ${got} in the database, ${n} expected`);
    }
  }

  const dupes: string[] = [];
  const findDupes = (label: string, keyOf: (s: StatsSubmission) => string | null) => {
    const seen = new Map<string, string>();
    for (const s of subs) {
      const k = keyOf(s);
      if (!k) continue;
      if (seen.has(k)) dupes.push(`${label}: "${seen.get(k)}" and "${s.projectTitle}"`);
      else seen.set(k, s.projectTitle);
    }
  };
  findDupes("Same title", (s) => norm(s.projectTitle));
  findDupes("Same repo", (s) => (present(s.githubUrl) ? s.githubUrl.trim().toLowerCase().replace(/\/+$/, "") : null));
  findDupes("Same public URL", (s) => (present(s.details?.publicUrl) ? s.details!.publicUrl!.trim().toLowerCase().replace(/\/+$/, "") : null));
  findDupes("Same point person", (s) => email(s.lumaEmail) || null);

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

export const statsFingerprint = (stats: ProgramStats | null) => {
  if (!stats) return null;
  const { generatedAt, ...rest } = stats;
  return JSON.stringify(rest);
};

/** What gets published: the stats without the admin-only composite ranking. */
export const publicSnapshot = (stats: ProgramStats): ProgramStats => {
  // Admin-only composite; multiple-teams data is no longer published (older snapshots may still have it).
  const { composite: _composite, multiTeam: _multiTeam, ...rest } = stats as ProgramStats & { multiTeam?: unknown };
  if (rest.headline && "multiTeamHackers" in rest.headline) {
    const { multiTeamHackers: _m, ...headline } = rest.headline as ProgramStats["headline"] & { multiTeamHackers?: number };
    return { ...rest, headline };
  }
  return rest;
};
