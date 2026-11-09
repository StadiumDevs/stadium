// The prize winners and submission stats page, per program slug. Mirrors
// server/api/constants/programStats.js (program-stats-parity.test.js on the
// server checks both copies agree). Everything else on the page is computed from the
// database; only the category map and the composite weights are config.

/** A category: matched by submission id (wins) or by title; keywords only suggest one for unmatched projects. */
export type SubmissionCategory = { id: string; label: string; titles: string[]; ids?: string[]; keywords?: string[] };

export type CompositeWeights = {
  judge: number;
  support: number;
  milestone: number;
  shipped: { publicUrl: number; demoVideo: number; repo: number };
};

export type ProgramStatsConfig = {
  categories: SubmissionCategory[];
  weights: CompositeWeights;
  expected?: { submissions: number; byTrack: Record<string, number> };
  judgeTrack: "privacy" | "agentic";
  unscoredTrack: { track: "privacy" | "agentic"; note: string };
  minFeedbackResponses: number;
  /** Privacy track tech review: the fixture version to read (server/fixtures/<slug>/privacy-track-review/v<version>.json). */
  privacyReview?: { version: string };
};

/**
 * Categories: each project is matched by id (`ids`, wins when present) or by
 * title. A title matches when, lowercased with punctuation collapsed to
 * spaces, it equals a listed title or starts with one followed by a space
 * ("Courier: private agentic commerce gateway" matches "Courier"). Unmatched
 * projects show as Uncategorized and are flagged in the admin preview, with a
 * suggestion from `keywords`.
 */
export const FSH_CATEGORIES: SubmissionCategory[] = [
  {
    id: "agent-guardrails",
    label: "Agent spend guardrails",
    titles: ["ZPermit", "Pactora", "Obscura", "Pegasus", "Ironclad", "ZecGuard", "Z-Bits", "Errand", "Top-up Guard", "Shroud"],
    keywords: ["guard", "limit", "permit", "policy", "spend", "budget", "allowance"],
  },
  {
    id: "private-shopping",
    label: "Private shopping by memo or chat",
    titles: [
      "Whisper-Shop", "hushcart", "PocketPilot", "Chupke", "Courier", "Lucky Buy", "ZecRecharge", "Shielded Shopping Agent",
      "ZecCircle", "Munim", "Oboro", "Keyo", "Entesila", "NightShiftAgent", "LifeOS", "SwipeRefill",
    ],
    keywords: ["shop", "buy", "order", "memo", "chat", "telegram", "recharge", "top up", "topup", "gift card"],
  },
  {
    id: "rewards-payroll",
    label: "Rewards, gifting and payroll",
    titles: ["BuyOnCue", "SHIPREWARD", "GhostCommits", "Meritum", "GiftRelay", "Zealed", "ZecHunt", "zshagun", "Zool", "Secret Bankroll"],
    keywords: ["reward", "gift", "payroll", "bounty", "tip", "salary", "contributor"],
  },
  {
    id: "merchant-payments",
    label: "Merchant and everyday payments",
    titles: ["Sikka", "ZebraScan", "ShieldCheckout", "Z-Pay", "Tandem", "Hisaab"],
    keywords: ["merchant", "checkout", "invoice", "qr", "point of sale", "split", "ledger"],
  },
  {
    id: "trading-crosschain",
    label: "Private trading and cross-chain",
    titles: ["ColdTrail", "Finity", "hushfolio", "MaZe", "ZapOut"],
    keywords: ["trade", "swap", "bridge", "cross-chain", "portfolio", "dex"],
  },
  {
    id: "proofs",
    label: "Proofs and attestations",
    titles: ["Vouch", "Zsol", "Z-Solvency", "zpulse"],
    keywords: ["proof", "attest", "solvency", "reserves", "verify", "credential"],
  },
  {
    id: "wallet-network",
    label: "Wallet and network privacy",
    titles: ["Ghost Layer", "Mirage", "FLex", "Veylor", "Zeno Wallet", "Cloister"],
    keywords: ["wallet", "mixnet", "network", "nym", "tor", "address"],
  },
  {
    id: "devtools-education",
    label: "Developer tools and education",
    // Two different teams submitted "zcash-now"; both match.
    titles: ["zcash-now", "Z402", "Zec Start", "zkLane"],
    keywords: ["sdk", "developer", "library", "cli", "learn", "docs", "education"],
  },
];

export const UNCATEGORIZED = { id: "uncategorized", label: "Uncategorized" } as const;

// Composite "likely to continue and get support" score, out of 100.
export const FSH_COMPOSITE_WEIGHTS: CompositeWeights = {
  // Normalized judge total on the Privacy rubric, as a share of its maximum.
  judge: 45,
  // Ecosystem Prize flag, or a partner assigned on the milestone.
  support: 20,
  // A milestone / next step stated.
  milestone: 20,
  // Shipped evidence, each present.
  shipped: { publicUrl: 5, demoVideo: 5, repo: 5 },
};

// What the database should match (fsh-final-submissions-all-projects.csv, 63
// rows less the "Example Project" test entry). Shown as mismatches in the
// admin preview; never shown publicly.
export const FSH_EXPECTED = {
  submissions: 62,
  byTrack: { privacy: 24, both: 24, agentic: 14 },
};

export const PROGRAM_STATS: Record<string, ProgramStatsConfig> = {
  "free-society-hack-2026": {
    categories: FSH_CATEGORIES,
    weights: FSH_COMPOSITE_WEIGHTS,
    expected: FSH_EXPECTED,
    // The rubric track whose normalized total is the judge signal.
    judgeTrack: "privacy" as const,
    // Not judged in Stadium (Bitrefill judged it): never show a score.
    unscoredTrack: { track: "agentic" as const, note: "Not scored (Agentic Commerce, judged by Bitrefill)" },
    // Feedback questions with fewer responses are hidden.
    minFeedbackResponses: 3,
    // Privacy track tech review: reads
    // server/fixtures/free-society-hack-2026/privacy-track-review/v<version>.json.
    privacyReview: { version: "1.0" },
  },
};

export const programStatsFor = (slug: string): ProgramStatsConfig | null => PROGRAM_STATS[slug] ?? null;
