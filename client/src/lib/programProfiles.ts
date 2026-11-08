import type { ApiPrizeTier, JudgedTrack, SubmissionTrack } from "./api";
import type { NormalizationConfig } from "./scoreNormalization";

/**
 * Per-program configuration for hackathons that go beyond the Bitrefill shape:
 * tracks, a per-track judging rubric, extra submission fields, live project
 * display, milestones and check-ins. Keyed by program slug. A program with no
 * profile behaves exactly as before (the Bitrefill flow).
 */

export type RubricCriterion = {
  id: string;
  label: string;
  weight: number;
  /** Lowest score (default 0). Scores run min..max in steps of 1. */
  min?: number;
  /** Highest score. */
  max: number;
  /** Optional descriptor per score (index = score), shown as the scoring options. */
  levels?: string[];
  /** Counted as the bonus for the "most judges gave the bonus" tie-break. */
  isBonus?: boolean;
};

export type TieBreak =
  | { kind: "criterion"; id: string; label: string }
  | { kind: "bonusCount"; label: string };

export type Rubric = {
  criteria: RubricCriterion[];
  tieBreaks: TieBreak[];
  /** A project whose average on this criterion is at or below `maxAvg` can't win a prize. */
  winnerGate?: { criterionId: string; maxAvg: number; message: string };
  /** Per-judge normalization (scoreNormalization.ts). Mirrors server RUBRIC_RANKING. */
  normalization?: NormalizationConfig;
  /** Full judge instructions, linked from the judge view. */
  guideUrl?: string;
};

export type ProgramTrack = {
  id: JudgedTrack;
  label: string;
  shortLabel: string;
  /** Prize tiers whose label starts with this prefix belong to the track. */
  prizePrefix: string;
  rubric: Rubric;
  /** Requires a testnet transaction id on submit. */
  requiresTxid: boolean;
};

/** A judge's profile. `email` is null for other judges (the server shows a judge only their own). */
/** A judge and the tracks they may score (normalised: never null on the client). */
export type ProgramJudge = { email: string | null; name: string; tracks: JudgedTrack[] };

/** The judging batch a submission belongs to, from its first submission time. */
export const batchFor = (profile: ProgramProfile, createdAt: string): string | null => {
  const batches = profile.judgingSessions;
  if (!batches.length) return null;
  const at = Date.parse(createdAt);
  if (!Number.isFinite(at)) return batches[batches.length - 1].id;
  return (batches.find((b) => b.until && at <= Date.parse(b.until)) ?? batches[batches.length - 1]).id;
};

/** An automatic submission category: matched by keyword prefixes in the title, pitch and brief. */
export type SubmissionCategory = { id: string; label: string; keywords: string[] };

export type MilestoneStep = { id: "agree" | "checkin" | "deliver" | "share" | "payout"; label: string; due: string };

export type ProgramProfile = {
  slug: string;
  tracks: ProgramTrack[];
  allowBothTracks: boolean;
  /** Teammates besides the point person (server: trackedPrograms.js maxTeam). */
  maxTeammates?: number;
  themes: string[];
  /**
   * Categories that submissions are sorted into automatically, by keyword
   * (submissionCategories.ts), in priority order for ties. Not chosen by teams.
   */
  categories?: SubmissionCategory[];
  appTypes: string[];
  /** Show submitted projects on the public page immediately, not only after results. */
  showSubmissionsLive: boolean;
  /** The venue on a map (Google Maps); the page links the location to it. */
  venueMapUrl?: string;
  /** The event's own time zone: dates and times on the page show in it, not the viewer's. */
  timeZone?: { id: string; label: string };
  /**
   * Judging batches, in order (also the session a score is saved in). A
   * submission joins the first batch whose `until` is at or after its first
   * submission time; the last takes the rest. Mirrors
   * server/api/constants/trackedPrograms.js (judgingBatches).
   */
  judgingSessions: { id: string; label: string; until: string | null; short: string }[];
  milestone: {
    /** The award flag (not a prize tier) that carries a tracked milestone. */
    flagLabel: string;
    /** How many podium projects may carry the flag. */
    maxFlags: number;
    track: JudgedTrack;
    payoutAmount: number;
    payoutCurrency: string;
    steps: MilestoneStep[];
  };
  /** Public block-explorer page for a testnet transaction, so anyone can verify it. */
  txExplorerUrl?: (txid: string) => string;
};

export const maxScore = (rubric: Rubric) =>
  rubric.criteria.reduce((sum, c) => sum + c.max * c.weight, 0);

export const weightedTotal = (rubric: Rubric, criteria: Record<string, number | null>) =>
  rubric.criteria.reduce((sum, c) => sum + (criteria[c.id] ?? 0) * c.weight, 0);

export const isFullyScored = (rubric: Rubric, criteria: Record<string, number | null>) =>
  rubric.criteria.every((c) => typeof criteria[c.id] === "number");

export const PRIVACY_JUDGING_GUIDE_URL = "https://app.notion.com/p/Privacy-track-judging-guide-4023e52aeb158049acc3e80512df018d";

// Final five-criterion Privacy rubric (brief, 28 Oct): unweighted 0-3 plus a
// 0/1 Bonus, max 16. Ties: Continuing, then Needed. Works 0 can't win.
const PRIVACY_RUBRIC: Rubric = {
  criteria: [
    {
      id: "works",
      label: "Works: how much of the demonstrated core flow is real?",
      weight: 1,
      max: 3,
      levels: [
        "Nothing meaningfully interacts with Zcash",
        "The Zcash interaction is mocked or simulated",
        "Real shielded testnet interaction, but a core step is incomplete, manual or unverified",
        "The demonstrated core flow works as intended, with no core step faked, manual or bypassed, and with verifiable evidence",
      ],
    },
    {
      id: "private",
      label: "Private: does it protect information appropriately?",
      weight: 1,
      max: 3,
      levels: [
        "No meaningful privacy protection, or serious undisclosed exposure",
        "Shielded transactions, but significant metadata or data exposure is not adequately addressed",
        "Shielded transactions and a considered privacy design, with remaining limitations identified",
        "Privacy is designed into the flow; disclosures are minimized, and remaining exposures and trust assumptions are clearly explained",
      ],
    },
    {
      id: "easy",
      label: "Easy: can its intended user use it?",
      weight: 1,
      max: 3,
      levels: [
        "Only the builder can use it",
        "Usable with the builder's help",
        "Usable by the intended audience with the README or provided instructions",
        "A representative user can complete the core task unaided, in minutes",
      ],
    },
    {
      id: "needed",
      label: "Needed: is there evidence of a real need?",
      weight: 1,
      max: 3,
      levels: [
        "No clear user or problem",
        "A user is named, but the need is assumed",
        "A specific user problem is explained and backed by evidence, such as a documented ecosystem gap or conversations with users",
        "Strong validation: target users have requested it, a partner wants to adopt or pilot it, or users have demonstrated demand",
      ],
    },
    {
      id: "continuing",
      label: "Continuing: is the builder moving it forward?",
      weight: 1,
      max: 3,
      levels: [
        "No next milestone",
        "A vague plan",
        "A concrete 30-day plan with an identifiable beneficiary",
        "Already taking concrete steps: an upstream PR, an active issue, a partner discussion, a pilot or engaged users",
      ],
    },
    {
      id: "bonus",
      label: "Bonus",
      weight: 1,
      max: 1,
      isBonus: true,
      levels: [
        "Nothing exceptional",
        "Genuinely exceptional and not captured above: original technical contribution, elegant solution, or reusable ecosystem contribution",
      ],
    },
  ],
  tieBreaks: [
    { kind: "criterion", id: "continuing", label: "Continuing" },
    { kind: "criterion", id: "needed", label: "Needed" },
  ],
  winnerGate: {
    criterionId: "works",
    maxAvg: 0,
    message: "Average Works score is 0: this project can't be selected as a winner.",
  },
  normalization: { enabled: true, method: "zscore", minScoresForZ: 8 },
  guideUrl: PRIVACY_JUDGING_GUIDE_URL,
};

// Bitrefill's criteria, each scored 1 to 5 (max 15, averaged across the
// judges), in its order. Ties go to How innovative. Mirrors server rubrics.js.
const AGENTIC_RUBRIC: Rubric = {
  criteria: [
    { id: "techStack", label: "Use of the Bitrefill tech stack", weight: 1, min: 1, max: 5 },
    { id: "requirements", label: "Followed the requirements", weight: 1, min: 1, max: 5 },
    { id: "innovation", label: "How innovative the submission is", weight: 1, min: 1, max: 5 },
  ],
  tieBreaks: [{ kind: "criterion", id: "innovation", label: "How innovative" }],
  normalization: { enabled: true, method: "zscore", minScoresForZ: 8 },
};

export const FREE_SOCIETY_HACK_SLUG = "free-society-hack-2026";

export const FREE_SOCIETY_HACK_PRIZE_TIERS: ApiPrizeTier[] = [
  { amount: 1300, currency: "USD", label: "Privacy: top prize" },
  { amount: 300, currency: "USD", label: "Privacy: second prize" },
  { amount: 200, currency: "USD", label: "Privacy: third prize" },
  { amount: 1000, currency: "USD", label: "Agentic Commerce: most innovative" },
  { amount: 800, currency: "USD", label: "Agentic Commerce: second" },
  { amount: 600, currency: "USD", label: "Agentic Commerce: third" },
  { amount: 100, currency: "USD", label: "Agentic Commerce: best feedback" },
];

const FREE_SOCIETY_HACK: ProgramProfile = {
  slug: FREE_SOCIETY_HACK_SLUG,
  tracks: [
    {
      id: "privacy",
      label: "Privacy (Zcash)",
      shortLabel: "PRIVACY",
      prizePrefix: "Privacy:",
      rubric: PRIVACY_RUBRIC,
      requiresTxid: true,
    },
    {
      id: "agentic",
      label: "Agentic Commerce (by Bitrefill)",
      shortLabel: "AGENTIC COMMERCE",
      prizePrefix: "Agentic Commerce:",
      rubric: AGENTIC_RUBRIC,
      requiresTxid: false,
    },
  ],
  allowBothTracks: true,
  // Solo or a team of up to 4, including the point person.
  maxTeammates: 3,
  themes: ["1. Private payment rails", "2. The first five minutes", "3. Privacy beyond the transaction"],
  // Free Society Hack submission categories (both tracks), in tie-break order.
  categories: [
    { id: "agents", label: "Agents", keywords: ["agent", "agentic", "autonomous", "mcp", "llm", "a2a", "x402"] },
    { id: "rewards", label: "Rewards", keywords: ["reward", "loyalty", "cashback", "points", "gift card", "voucher", "tip", "airdrop", "bounty", "incentive", "allowance", "faucet"] },
    { id: "wallets", label: "Wallets", keywords: ["wallet", "address book", "viewing key", "seed phrase", "custody", "multisig", "key vault", "lightwalletd"] },
    { id: "business", label: "Business", keywords: ["merchant", "invoice", "payroll", "payslip", "business", "checkout", "point of sale", "receipt", "accounting", "commission", "bill", "subscription", "escrow", "remittance", "store", "shop"] },
    { id: "education", label: "Education", keywords: ["learn", "education", "tutorial", "course", "teach", "student", "quiz", "explorer", "explainer", "onboarding"] },
    { id: "assistants", label: "Assistants", keywords: ["assistant", "concierge", "copilot", "chatbot", "pilot", "voice", "chat"] },
    { id: "verification", label: "Verification", keywords: ["verify", "verification", "proof", "attest", "identity", "credential", "kyc", "age", "audit", "reserves"] },
    { id: "trading", label: "Trading", keywords: ["trade", "trading", "swap", "dex", "exchange", "arbitrage", "market", "portfolio", "price", "router", "liquidity"] },
    { id: "activism", label: "Activism", keywords: ["activis", "protest", "donation", "donate", "journalis", "censorship", "human rights", "whistleblow", "dissident", "ballot", "vote", "petition", "feedback box"] },
  ],
  appTypes: ["web app", "mobile app", "SDK or library", "CLI", "agent", "other"],
  showSubmissionsLive: true,
  timeZone: { id: "Asia/Kolkata", label: "IST" },
  venueMapUrl: "https://www.google.com/maps/search/?api=1&query=19.0727556%2C72.8711671&query_place_id=ChIJWdw8iu3I5zsRk3p59YTdif8",
  judgingSessions: [
    { id: "evening", label: "Evening · Wed 4 Nov 20:00–22:00", until: "2026-11-04T20:00:00+05:30", short: "EVENING · IN BY 20:00" },
    { id: "morning", label: "Morning · Thu 5 Nov 08:00–10:00", until: null, short: "MORNING · AFTER 20:00" },
  ],
  milestone: {
    flagLabel: "Ecosystem Prize",
    maxFlags: 2,
    track: "privacy",
    payoutAmount: 100,
    payoutCurrency: "USD",
    steps: [
      { id: "agree", label: "Agree with partner", due: "2026-11-13" },
      { id: "checkin", label: "Check-in", due: "2026-11-19" },
      { id: "deliver", label: "Deliver (partner confirms)", due: "2026-12-04" },
      { id: "share", label: "Share at ZecHub Friday Lounge", due: "2026-12-04" },
      { id: "payout", label: "$100 released", due: "2026-12-11" },
    ],
  },
  txExplorerUrl: (txid) => `https://testnet.zcashexplorer.app/transactions/${encodeURIComponent(txid)}`,
};

const PROFILES: Record<string, ProgramProfile> = {
  [FREE_SOCIETY_HACK_SLUG]: FREE_SOCIETY_HACK,
};

export const getProgramProfile = (slug?: string | null): ProgramProfile | null =>
  (slug && PROFILES[slug]) || null;

export const trackById = (profile: ProgramProfile, id: JudgedTrack) =>
  profile.tracks.find((t) => t.id === id) as ProgramTrack;

/** The judged tracks a submission takes part in (none without a track). */
export const judgedTracksOf = (track: SubmissionTrack | null | undefined): JudgedTrack[] =>
  !track ? [] : track === "both" ? ["privacy", "agentic"] : [track];

/**
 * Which track-specific fields to show. With `view` (a judge scoring one track,
 * or a track's leaderboard), only that track's fields; otherwise every field
 * the entry's track has ("both" = privacy and agentic).
 */
export const trackFieldsFor = (entry: SubmissionTrack | null | undefined, view?: JudgedTrack | null) => {
  const entered = entry ? judgedTracksOf(entry) : [];
  const show = (t: JudgedTrack) => entered.includes(t) && (!view || view === t);
  return { privacy: show("privacy"), agentic: show("agentic") };
};

export const tiersForTrack = (tiers: ApiPrizeTier[] | null | undefined, track: ProgramTrack) =>
  (tiers ?? []).filter((t) => t.label.startsWith(track.prizePrefix));

export const trackLabel = (profile: ProgramProfile, track: SubmissionTrack | null | undefined) =>
  !track
    ? "No track"
    : track === "both"
      ? profile.tracks.map((t) => t.shortLabel).join(" + ")
      : trackById(profile, track).shortLabel;

/** Submission tracks an admin can pick, with labels ("both" = every judged track). */
export const submissionTrackOptions = (profile: ProgramProfile): { id: SubmissionTrack; label: string }[] => [
  ...profile.tracks.map((t) => ({ id: t.id as SubmissionTrack, label: t.shortLabel })),
  { id: "both", label: trackLabel(profile, "both") },
];

/** True when the project carries the Ecosystem Prize flag (tracked milestone + payout). */
export const isEcosystem = (s: { ecosystemPrize?: boolean }) => !!s.ecosystemPrize;

/** localStorage key for a judge's unsaved score drafts (survive a reload between sessions). */
export const rubricDraftKey = (slug: string, judgeEmail: string) => `stadium_rubric_drafts_${slug}_${judgeEmail}_v1`;
