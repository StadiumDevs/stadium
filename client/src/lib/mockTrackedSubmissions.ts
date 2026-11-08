// localStorage-backed mock store for programs with a profile (programProfiles.ts),
// used when VITE_USE_MOCK_DATA=true. Keyed by program slug and seeded from the
// program's fixture, so the playground can be reset and re-seeded at any time.
// The Bitrefill flow keeps using mockJudging.ts unchanged.
import type {
  ApiJudgingProgressRow,
  ApiPrizeTier,
  ApiPublicSubmission,
  ApiPublicSubmissions,
  ApiRubricLeaderboard,
  ApiRubricLeaderboardRow,
  ApiRubricScore,
  ApiSubmissionDetails,
  ApiSubmissionMilestone,
  ApiTrackedSubmission,
  JudgedTrack,
  SubmissionTrack,
} from "./api";
import {
  batchFor,
  getProgramProfile,
  isFullyScored,
  judgedTracksOf,
  rubricDraftKey,
  trackById,
  weightedTotal,
  type ProgramJudge,
} from "./programProfiles";
import { buildFreeSocietyHackSeed, FSH_JUDGES, type TrackedSeed } from "./mocks/freeSocietyHack.seed";
import { checkTestnetTx } from "./txCheck";
import { mockPrograms } from "./mockPrograms";
import { toPublicSubmission } from "./trackedDisplay";
import { DEFAULT_NORMALIZATION, normalizeTrack } from "./scoreNormalization";

const SEEDS: Record<string, { build: () => TrackedSeed; judges: ProgramJudge[] }> = {
  "free-society-hack-2026": { build: buildFreeSocietyHackSeed, judges: FSH_JUDGES },
};

const stateKey = (slug: string) => `stadium_mock_tracked_${slug}_v7`;

// Mirrors the server: submissions close at the program's eventEndsAt, and a
// draft still unfinalized after that is abandoned (out of every final list).
const closedFor = (slug: string) => {
  const end = mockPrograms.find((p) => p.slug === slug)?.eventEndsAt;
  return !!end && Date.now() >= Date.parse(end);
};
const isAbandonedIn = (slug: string, s: { status?: string | null }) => s.status === "draft" && closedFor(slug);

const read = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};
const write = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable (private window / quota) — the session keeps working in memory.
  }
};

// In-memory fallback so the store still works when localStorage throws.
const memory: Record<string, TrackedSeed> = {};

const load = (slug: string): TrackedSeed => {
  const seed = SEEDS[slug];
  const stored = read<TrackedSeed | null>(stateKey(slug), null);
  if (stored) return stored;
  if (memory[slug]) return memory[slug];
  const fresh = seed ? seed.build() : { submissions: [], scores: [], resultsPublishedAt: null };
  memory[slug] = fresh;
  write(stateKey(slug), fresh);
  return fresh;
};
const save = (slug: string, state: TrackedSeed) => {
  memory[slug] = state;
  write(stateKey(slug), state);
};

const now = () => new Date().toISOString();
const mean = (ns: number[]) => (ns.length ? ns.reduce((a, b) => a + b, 0) / ns.length : 0);
const EPS = 1e-9;

const toPublic = (s: ApiTrackedSubmission, published: boolean): ApiPublicSubmission =>
  toPublicSubmission(s, { showPrizes: published });

const bestPrize = (s: { prizes: Partial<Record<JudgedTrack, ApiPrizeTier>> }) =>
  Math.max(-1, ...Object.values(s.prizes).map((p) => p?.amount ?? -1));

export type TrackedSubmitPayload = {
  submitterName: string;
  lumaEmail: string;
  projectTitle: string;
  projectBrief: string;
  videoUrl: string;
  githubUrl: string;
  late?: boolean;
  details: Omit<ApiSubmissionDetails, "txCheck" | "milestone">;
  /** The program's feedback survey; absent = keep what's stored. */
  feedback?: ApiTrackedSubmission["feedback"];
  /** Accepting a refused attempt keeps the attempt's time (and judging batch). */
  createdAt?: string;
};

// Average of the rubric's winner-gate criterion across fully-scored judges, or
// null when the track has no gate or nobody has scored the project yet.
const gateAvg = (state: TrackedSeed, slug: string, submissionId: string, track: JudgedTrack): number | null => {
  const profile = getProgramProfile(slug);
  const rubric = profile ? trackById(profile, track).rubric : null;
  if (!rubric?.winnerGate) return null;
  const counted = state.scores.filter(
    (x) => x.submissionId === submissionId && x.track === track && isFullyScored(rubric, x.criteria),
  );
  if (counted.length === 0) return null;
  return mean(counted.map((x) => x.criteria[rubric.winnerGate?.criterionId ?? ""] ?? 0));
};

const winnerBlockedReason = (state: TrackedSeed, slug: string, submissionId: string, track: JudgedTrack) => {
  const profile = getProgramProfile(slug);
  const gate = profile ? trackById(profile, track).rubric.winnerGate : undefined;
  const avg = gateAvg(state, slug, submissionId, track);
  return gate && avg !== null && avg <= gate.maxAvg + EPS ? gate.message : null;
};

export const mockTracked = {
  judges(slug: string): ProgramJudge[] {
    return SEEDS[slug]?.judges ?? [];
  },

  list(slug: string): ApiTrackedSubmission[] {
    const profile = getProgramProfile(slug);
    // Every submission lands in its judging batch by when it first came in.
    return load(slug).submissions.map((s) => ({ ...s, batch: profile ? batchFor(profile, s.createdAt) : null }));
  },

  scores(slug: string): ApiRubricScore[] {
    return load(slug).scores;
  },

  resultsPublishedAt(slug: string): string | null {
    return load(slug).resultsPublishedAt;
  },


  /** Public: every submitted project, live. Winners first once published. */
  publicList(slug: string): ApiPublicSubmissions {
    const state = load(slug);
    const published = !!state.resultsPublishedAt;
    // Like the server: only finalized entries are public (drafts are the team's own).
    const submissions = state.submissions
      .filter((s) => s.status !== "draft")
      .map((s) => toPublic(s, published))
      .sort((a, b) => (published ? bestPrize(b) - bestPrize(a) : 0) || a.createdAt.localeCompare(b.createdAt));
    return { published, submissions };
  },

  /** Public: a winner's project page. Null for non-winners or before publishing. */
  publicWinner(slug: string, id: string): ApiPublicSubmission | null {
    const state = load(slug);
    if (!state.resultsPublishedAt) return null;
    const s = state.submissions.find((x) => x.id === id);
    if (!s || Object.keys(s.prizes).length === 0) return null;
    return toPublic(s, true);
  },

  add(slug: string, payload: TrackedSubmitPayload): ApiTrackedSubmission {
    const state = load(slug);
    const email = payload.lumaEmail.trim().toLowerCase();
    const at = now();
    const existing = state.submissions.find((s) => s.lumaEmail.trim().toLowerCase() === email);
    const base = {
      submitterName: payload.submitterName,
      lumaEmail: payload.lumaEmail,
      projectTitle: payload.projectTitle,
      projectBrief: payload.projectBrief,
      videoUrl: payload.videoUrl,
      githubUrl: payload.githubUrl,
      late: !!payload.late,
      updatedAt: at,
      feedback: payload.feedback !== undefined ? payload.feedback : existing?.feedback ?? null,
    };
    let sub: ApiTrackedSubmission;
    if (existing) {
      // Resubmit by the same point person overwrites in place.
      sub = {
        ...existing,
        ...base,
        details: {
          ...existing.details,
          ...payload.details,
          txCheck: payload.details.testnetTxid === existing.details.testnetTxid ? existing.details.txCheck : null,
        },
      };
      state.submissions = state.submissions.map((s) => (s.id === existing.id ? sub : s));
    } else {
      sub = {
        id: `${slug}-added-${state.submissions.length + 1}-${Date.now()}`,
        programId: slug,
        createdAt: payload.createdAt ?? at,
        ...base,
        details: { ...payload.details, txCheck: null, milestone: null },
        prizes: {},
        ecosystemPrize: false,
      };
      state.submissions = [...state.submissions, sub];
    }
    save(slug, state);
    return sub;
  },

  /** Look the txid up on (mock) testnet and store the result on the submission. */
  async recheckTx(slug: string, id: string): Promise<ApiTrackedSubmission | null> {
    const sub = load(slug).submissions.find((s) => s.id === id);
    if (!sub || !sub.details.testnetTxid) return sub ?? null;
    const txCheck = await checkTestnetTx(sub.details.testnetTxid, { force: true });
    const state = load(slug);
    let next: ApiTrackedSubmission | null = null;
    state.submissions = state.submissions.map((s) => {
      if (s.id !== id) return s;
      next = { ...s, details: { ...s.details, txCheck } };
      return next;
    });
    save(slug, state);
    return next;
  },

  /** Judge view: the submissions in this judge's tracks + their saved scores. */
  judgeView(slug: string, judgeEmail: string) {
    const judge = this.judges(slug).find((j) => j.email === judgeEmail);
    const tracks = judge?.tracks ?? [];
    const state = load(slug);
    const submissions = state.submissions.filter((s) =>
      judgedTracksOf(s.details.track).some((t) => tracks.includes(t)),
    );
    const mine = state.scores.filter((x) => x.judgeEmail === judgeEmail);
    return { judge, tracks, submissions, scores: mine };
  },

  saveScore(slug: string, score: Omit<ApiRubricScore, "updatedAt">): ApiRubricScore {
    const judge = this.judges(slug).find((j) => j.email === score.judgeEmail);
    if (!judge || !judge.tracks.includes(score.track)) {
      throw new Error(`${score.judgeEmail} is not a judge for the ${score.track} track.`);
    }
    const state = load(slug);
    const saved: ApiRubricScore = { ...score, updatedAt: now() };
    const rest = state.scores.filter(
      (x) => !(x.submissionId === score.submissionId && x.judgeEmail === score.judgeEmail && x.track === score.track),
    );
    state.scores = [...rest, saved];
    save(slug, state);
    return saved;
  },

  /** Per judge: fully scored (submission, track) pairs out of everything in their tracks. */
  judgingProgress(slug: string): ApiJudgingProgressRow[] {
    const profile = getProgramProfile(slug);
    const state = load(slug);
    return this.judges(slug).map((j) => {
      let scored = 0;
      let total = 0;
      for (const s of state.submissions) {
        if (isAbandonedIn(slug, s)) continue;
        for (const t of judgedTracksOf(s.details.track)) {
          if (!j.tracks.includes(t)) continue;
          total += 1;
          const rubric = profile ? trackById(profile, t).rubric : null;
          const x = state.scores.find((sc) => sc.submissionId === s.id && sc.track === t && sc.judgeEmail === j.email);
          if (x && (!rubric || isFullyScored(rubric, x.criteria))) scored += 1;
        }
      }
      return { name: j.name, tracks: j.tracks, scored, total };
    });
  },

  leaderboard(slug: string, track: JudgedTrack): ApiRubricLeaderboard {
    const profile = getProgramProfile(slug);
    if (!profile) throw new Error("No profile for program");
    const rubric = trackById(profile, track).rubric;
    const bonus = rubric.criteria.find((c) => c.isBonus);
    const state = load(slug);
    const judges = this.judges(slug).filter((j) => j.tracks.includes(track)).map((j) => j.email);
    const entries = state.submissions.filter((s) => !isAbandonedIn(slug, s) && judgedTracksOf(s.details.track).includes(track));

    const normalization = { ...DEFAULT_NORMALIZATION, ...(rubric.normalization ?? {}) };
    const entryIds = new Set(entries.map((s) => s.id));
    // Every counted score in the track feeds the normalization (mirrors the server).
    const trackScores = state.scores.filter(
      (x) => x.track === track && entryIds.has(x.submissionId) && isFullyScored(rubric, x.criteria),
    );
    const norm = normalizeTrack({
      criteria: rubric.criteria,
      bonusIds: bonus ? [bonus.id] : [],
      scores: trackScores,
      config: normalization,
    });

    const rows: ApiRubricLeaderboardRow[] = entries.map((s) => {
      const counted = trackScores.filter((x) => x.submissionId === s.id);
      const avgByCriterion: Record<string, number> = {};
      for (const c of rubric.criteria) avgByCriterion[c.id] = mean(counted.map((x) => x.criteria[c.id] ?? 0));
      const n = norm.projects.get(s.id);
      const contributionOf = new Map((n?.contributions ?? []).map((c) => [c.judgeEmail, c]));
      return {
        rank: 0,
        rawRank: 0,
        normRank: 0,
        rankChange: 0,
        submissionId: s.id,
        projectTitle: s.projectTitle,
        submitterName: s.submitterName,
        track: s.details.track,
        status: s.status ?? "submitted",
        avgTotal: mean(counted.map((x) => weightedTotal(rubric, x.criteria))),
        avgByCriterion,
        normTotal: n ? (normalization.method === "offset" ? n.offsetTotal : n.normTotal) : null,
        normByCriterion: n ? n.normByCriterion : null,
        zTotal: n ? n.normTotal : null,
        offsetTotal: n ? n.offsetTotal : null,
        bonusCount: bonus ? counted.filter((x) => (x.criteria[bonus.id] ?? 0) > 0).length : 0,
        judgeCount: counted.length,
        tieBrokenBy: null,
        judgeScores: counted.map((x) => ({
          judgeEmail: x.judgeEmail,
          total: weightedTotal(rubric, x.criteria),
          criteria: x.criteria,
          notes: x.notes,
          session: x.session,
          normContribution: contributionOf.get(x.judgeEmail)?.value ?? null,
          method: contributionOf.get(x.judgeEmail)?.method ?? null,
        })),
        txCheck: s.details.txCheck,
        prize: s.prizes[track] ?? null,
        ecosystemPrize: !!s.ecosystemPrize,
        winnerBlocked: winnerBlockedReason(state, slug, s.id, track),
      };
    });

    const rankBy = (totalOf: (r: ApiRubricLeaderboardRow) => number, critOf: (r: ApiRubricLeaderboardRow) => Record<string, number>) => {
      const tieValue = (r: ApiRubricLeaderboardRow, i: number) => {
        const tb = rubric.tieBreaks[i];
        return tb.kind === "bonusCount" ? r.bonusCount : critOf(r)[tb.id] ?? 0;
      };
      const sameTotal = (a: ApiRubricLeaderboardRow, b: ApiRubricLeaderboardRow) =>
        totalOf(a) === totalOf(b) || Math.abs(totalOf(a) - totalOf(b)) <= EPS;
      const sorted = [...rows].sort((a, b) => {
        if (!sameTotal(a, b)) return totalOf(b) - totalOf(a);
        for (let i = 0; i < rubric.tieBreaks.length; i += 1) {
          const d = tieValue(b, i) - tieValue(a, i);
          if (Math.abs(d) > EPS) return d;
        }
        return 0;
      });
      return sorted.map((row, i) => {
        const prev = sorted[i - 1];
        let tieBrokenBy: string | null = null;
        if (prev && sameTotal(prev, row)) {
          const decider = rubric.tieBreaks.findIndex((_, t) => Math.abs(tieValue(prev, t) - tieValue(row, t)) > EPS);
          tieBrokenBy = decider >= 0 ? rubric.tieBreaks[decider].label : "unresolved";
        }
        return { row, tieBrokenBy };
      });
    };
    const rawOrder = rankBy((r) => r.avgTotal, (r) => r.avgByCriterion);
    const normOrder = rankBy((r) => r.normTotal ?? -Infinity, (r) => r.normByCriterion ?? {});
    rawOrder.forEach(({ row }, i) => {
      row.rawRank = i + 1;
    });
    normOrder.forEach(({ row }, i) => {
      row.normRank = i + 1;
    });
    const primary = normalization.enabled ? normOrder : rawOrder;
    for (const { row, tieBrokenBy } of primary) {
      row.rank = (normalization.enabled ? row.normRank : row.rawRank) ?? 0;
      row.rankChange = (row.rawRank ?? 0) - (row.normRank ?? 0);
      row.tieBrokenBy = tieBrokenBy;
    }

    return {
      track,
      judges,
      submissionsTotal: entries.length,
      submissionsFullyScored: rows.filter((r) => r.judgeCount === judges.length).length,
      normalization,
      judgeStats: norm.judgeStats,
      computedAt: new Date().toISOString(),
      rows: primary.map((x) => x.row),
    };
  },

  awardPrize(slug: string, id: string, track: JudgedTrack, prize: ApiPrizeTier | null): ApiTrackedSubmission | null {
    const state = load(slug);
    if (prize) {
      const blocked = winnerBlockedReason(state, slug, id, track);
      if (blocked) throw new Error(blocked);
    }
    let next: ApiTrackedSubmission | null = null;
    state.submissions = state.submissions.map((s) => {
      if (s.id !== id) return s;
      const prizes = { ...s.prizes };
      if (prize) prizes[track] = prize;
      else delete prizes[track];
      // Losing the milestone-track prize also drops the Ecosystem flag.
      const profile = getProgramProfile(slug);
      const keepsFlag = !!s.ecosystemPrize && (!profile || !!prizes[profile.milestone.track]);
      next = { ...s, prizes, ecosystemPrize: keepsFlag };
      return next;
    });
    save(slug, state);
    return next;
  },

  /**
   * Flag a podium project (any prize level in the milestone track) as an
   * Ecosystem Prize winner. Flagging opens its tracked milestone, seeded from the
   * next milestone; unflagging hides it but keeps what was recorded.
   */
  setEcosystemPrize(slug: string, id: string, flagged: boolean): ApiTrackedSubmission {
    const profile = getProgramProfile(slug);
    if (!profile) throw new Error("No profile for program");
    const { track, maxFlags, flagLabel } = profile.milestone;
    const state = load(slug);
    const target = state.submissions.find((s) => s.id === id);
    if (!target) throw new Error("Submission not found");
    if (flagged) {
      if (!target.prizes[track]) throw new Error(`Only ${trackById(profile, track).label} prize winners can get the ${flagLabel}.`);
      const others = state.submissions.filter((s) => s.ecosystemPrize && s.id !== id).length;
      if (others >= maxFlags) throw new Error(`The ${flagLabel} already has ${maxFlags} winners. Unflag one first.`);
    }
    const milestone =
      target.details.milestone ??
      (flagged
        ? {
            sentence: target.details.nextStep,
            partnerName: null,
            partnerProject: null,
            agreedAt: null,
            checkedInAt: null,
            deliveryLink: null,
            partnerConfirmed: null,
            partnerConfirmedAt: null,
            loungeDate: null,
            payoutStatus: "pending" as const,
            payoutReleasedAt: null,
          }
        : null);
    const next: ApiTrackedSubmission = { ...target, ecosystemPrize: flagged, details: { ...target.details, milestone } };
    state.submissions = state.submissions.map((s) => (s.id === id ? next : s));
    save(slug, state);
    return next;
  },

  setTrack(slug: string, id: string, track: SubmissionTrack): ApiTrackedSubmission {
    const state = load(slug);
    const target = state.submissions.find((s) => s.id === id);
    if (!target) throw new Error("Submission not found");
    const keeps = judgedTracksOf(track);
    const lost = (Object.keys(target.prizes || {}) as JudgedTrack[]).filter((t) => target.prizes[t] && !keeps.includes(t));
    if (lost.length) throw new Error(`Remove the ${lost.join(" and ")} prize first.`);
    const next: ApiTrackedSubmission = { ...target, details: { ...target.details, track } };
    state.submissions = state.submissions.map((s) => (s.id === id ? next : s));
    save(slug, state);
    return next;
  },

  setPublished(slug: string, publish: boolean): string | null {
    const state = load(slug);
    state.resultsPublishedAt = publish ? now() : null;
    save(slug, state);
    return state.resultsPublishedAt;
  },

  updateMilestone(slug: string, id: string, patch: Partial<ApiSubmissionMilestone>): ApiTrackedSubmission | null {
    const state = load(slug);
    let next: ApiTrackedSubmission | null = null;
    state.submissions = state.submissions.map((s) => {
      if (s.id !== id || !s.details.milestone) return s;
      next = { ...s, details: { ...s.details, milestone: { ...s.details.milestone, ...patch } } };
      return next;
    });
    save(slug, state);
    return next;
  },

  /** Mock "send": records the send time and returns how many point people it would email. */
  stats(slug: string) {
    const all = load(slug).submissions;
    const draftsCount = all.filter((s) => s.status === "draft").length;
    return { submissionsCount: all.length - draftsCount, draftsCount, submissionsClosed: closedFor(slug) };
  },

  /** Submissions have closed (the program's eventEndsAt passed). */
  submissionsClosed(slug: string): boolean {
    return closedFor(slug);
  },

  isAbandoned(slug: string, s: { status?: string | null }): boolean {
    return isAbandonedIn(slug, s);
  },

  reset(slug: string) {
    try {
      localStorage.removeItem(stateKey(slug));
      for (const j of this.judges(slug)) localStorage.removeItem(rubricDraftKey(slug, j.email));
    } catch {
      // ignore
    }
    delete memory[slug];
    load(slug);
  },
};
