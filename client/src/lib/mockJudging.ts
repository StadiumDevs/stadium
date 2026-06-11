// In-memory + localStorage mock for the Bitrefill judging flow, used when
// VITE_USE_MOCK_DATA=true (Vercel preview). Mirrors the server contract in
// server/api/services/scoring.service.js closely enough to exercise the UI:
// score drafts persist to localStorage, and the leaderboard unlocks once the
// mock judge submits their ballot (one other judge is pre-submitted, so the
// "waiting on N of M judges" gate is visible first).
import type {
  ApiJudgeView,
  ApiLeaderboard,
  ApiLeaderboardRow,
  ApiPrizeTier,
  ApiPublicResultEntry,
  ApiPublicResults,
  ApiScore,
  ApiSubmission,
  ApiSubmissionRow,
} from "./api";
import { mockPrograms } from "./mockPrograms";

const MOCK_JUDGE_EMAIL = "you@judge.test";
// Two registered judges total; "other" has already submitted a full ballot.
const OTHER_JUDGE_EMAIL = "other@judge.test";

const MOCK_SUBMISSIONS: ApiSubmission[] = [
  {
    id: "sub-aurora",
    programId: "mock-program",
    submitterName: "Aurora Builders",
    lumaEmail: "aurora@example.com",
    projectTitle: "Aurora Pay",
    projectBrief:
      "Aurora Pay is a one-tap stablecoin checkout for merchants. Shoppers pay in any token and the merchant settles in USDC, with gas abstracted away.",
    videoUrl: "https://youtu.be/aurora",
    githubUrl: "https://github.com/example/aurora",
    createdAt: "2026-06-01T10:00:00.000Z",
    updatedAt: "2026-06-01T10:00:00.000Z",
  },
  {
    id: "sub-nimbus",
    programId: "mock-program",
    submitterName: "Nimbus Labs",
    lumaEmail: "nimbus@example.com",
    projectTitle: "Nimbus Wallet",
    projectBrief:
      "Nimbus Wallet is a mobile-first smart wallet with social recovery. It lets users recover funds through trusted contacts instead of seed phrases.",
    videoUrl: "https://youtu.be/nimbus",
    githubUrl: "https://github.com/example/nimbus",
    createdAt: "2026-06-01T11:00:00.000Z",
    updatedAt: "2026-06-01T11:00:00.000Z",
  },
  {
    id: "sub-comet",
    programId: "mock-program",
    // Not in the signup list -> flagged ineligible (advisory only).
    submitterName: "Comet Crew",
    lumaEmail: "not-registered@example.com",
    projectTitle: "Comet Bridge",
    projectBrief:
      "Comet Bridge moves assets across chains with a single signature. It batches routes to find the cheapest path and refunds any unused bridging fees.",
    videoUrl: "https://youtu.be/comet",
    githubUrl: "https://github.com/example/comet",
    createdAt: "2026-06-01T12:00:00.000Z",
    updatedAt: "2026-06-01T12:00:00.000Z",
  },
];

const ELIGIBLE_EMAILS = new Set(["aurora@example.com", "nimbus@example.com"]);

// The other judge's finalized scores (drive the unlocked leaderboard numbers).
const OTHER_JUDGE_SCORES: Record<string, { requirements: number; techStack: number; innovation: number }> = {
  "sub-aurora": { requirements: 2, techStack: 5, innovation: 4 },
  "sub-nimbus": { requirements: 1, techStack: 3, innovation: 3 },
  "sub-comet": { requirements: 2, techStack: 2, innovation: 5 },
};

const SCORES_KEY = "stadium_mock_scores_v1";
const BALLOT_KEY = "stadium_mock_ballot_v1";
const PROMOTED_KEY = "stadium_mock_promoted_v1";
const PAID_KEY = "stadium_mock_paid_v1";
// Awarded prizes (submissionId -> { amount, currency, label }) and the results
// publish timestamp, set by a platform admin after judging completes.
const PRIZE_KEY = "stadium_mock_prizes_v1";
const PUBLISHED_KEY = "stadium_mock_results_published_v1";

type MockPrize = { amount: number; currency: string; label: string };
const readPrizes = (): Record<string, MockPrize> => {
  try {
    return JSON.parse(localStorage.getItem(PRIZE_KEY) || "{}");
  } catch {
    return {};
  }
};
// Submissions added through the public submit form during a preview session.
// Persisted so they survive navigation/reload and show up in the judging list.
const ADDED_KEY = "stadium_mock_submissions_v1";

const readAdded = (): ApiSubmission[] => {
  try {
    return JSON.parse(localStorage.getItem(ADDED_KEY) || "[]");
  } catch {
    return [];
  }
};
const writeAdded = (s: ApiSubmission[]) => localStorage.setItem(ADDED_KEY, JSON.stringify(s));

// The full submission set the judging UI sees: the seed rows plus anything
// submitted through the public form this session.
const allSubmissions = (): ApiSubmission[] => [...MOCK_SUBMISSIONS, ...readAdded()];

type StoredScores = Record<string, { requirements: number; techStack: number; innovation: number; notes: string }>;

const readScores = (): StoredScores => {
  try {
    return JSON.parse(localStorage.getItem(SCORES_KEY) || "{}");
  } catch {
    return {};
  }
};
const writeScores = (s: StoredScores) => localStorage.setItem(SCORES_KEY, JSON.stringify(s));
const ballotSubmitted = () => localStorage.getItem(BALLOT_KEY) === "submitted";

const readPromoted = (): Record<string, string> => {
  try {
    return JSON.parse(localStorage.getItem(PROMOTED_KEY) || "{}");
  } catch {
    return {};
  }
};

const readPaid = (): Record<string, boolean> => {
  try {
    return JSON.parse(localStorage.getItem(PAID_KEY) || "{}");
  } catch {
    return {};
  }
};

const toScore = (submissionId: string): ApiScore | null => {
  const raw = readScores()[submissionId];
  if (!raw) return null;
  return {
    submissionId,
    judgeEmail: MOCK_JUDGE_EMAIL,
    requirements: raw.requirements,
    techStack: raw.techStack,
    innovation: raw.innovation,
    notes: raw.notes || null,
  };
};

export const mockJudging = {
  judgeView(): ApiJudgeView {
    const submitted = ballotSubmitted();
    const promoted = readPromoted();
    const paid = readPaid();
    const prizes = readPrizes();
    const addedEmails = new Set(readAdded().map((s) => s.lumaEmail));
    const submissions: ApiSubmissionRow[] = allSubmissions().map((s) => {
      const prize = prizes[s.id] ?? null;
      return {
        ...s,
        // Seed rows use the fixed signup list; submissions added through the
        // public form are assumed eligible (the form asks for the Luma email).
        eligible: ELIGIBLE_EMAILS.has(s.lumaEmail) || addedEmails.has(s.lumaEmail),
        promotedProjectId: promoted[s.id] ?? null,
        paid: paid[s.id] ?? false,
        prizeAmount: prize ? prize.amount : null,
        prizeCurrency: prize ? prize.currency : null,
        prizeLabel: prize ? prize.label : null,
        myScore: toScore(s.id),
      };
    });
    // Two registered judges in the mock; the other is pre-submitted, so progress
    // is 1/2 before this judge submits and 2/2 after.
    const ballotProgress = { submitted: submitted ? 2 : 1, total: 2 };
    return {
      locked: submitted,
      ballotStatus: submitted ? "submitted" : "in_progress",
      ballotProgress,
      submissions,
    };
  },

  // Append a submission from the public submit form so it shows up in judging.
  addSubmission(payload: {
    submitterName: string;
    lumaEmail: string;
    projectTitle: string;
    projectBrief: string;
    videoUrl: string;
    githubUrl: string;
  }): ApiSubmission {
    const now = new Date().toISOString();
    const added = readAdded();
    const sub: ApiSubmission = {
      id: `sub-added-${added.length + 1}-${now}`,
      programId: "mock-program",
      submitterName: payload.submitterName,
      lumaEmail: payload.lumaEmail,
      projectTitle: payload.projectTitle,
      projectBrief: payload.projectBrief,
      videoUrl: payload.videoUrl,
      githubUrl: payload.githubUrl,
      createdAt: now,
      updatedAt: now,
    };
    writeAdded([...added, sub]);
    return sub;
  },

  setPaid(submissionId: string, paid: boolean): ApiSubmission {
    const paidMap = readPaid();
    paidMap[submissionId] = paid;
    localStorage.setItem(PAID_KEY, JSON.stringify(paidMap));
    const all = allSubmissions();
    const base = all.find((s) => s.id === submissionId) ?? all[0];
    return { ...base, paid, paidAt: paid ? "2026-06-10T00:00:00.000Z" : null, paidBy: paid ? "mock-admin" : null };
  },

  promote(submissionId: string): { projectId: string; alreadyPromoted?: boolean } {
    const promoted = readPromoted();
    if (promoted[submissionId]) return { projectId: promoted[submissionId], alreadyPromoted: true };
    const projectId = `proj-${submissionId}`;
    promoted[submissionId] = projectId;
    localStorage.setItem(PROMOTED_KEY, JSON.stringify(promoted));
    return { projectId };
  },

  // Platform admin: assign a prize tier (winner) or clear it (prize = null).
  awardPrize(submissionId: string, prize: MockPrize | null): ApiSubmission {
    const prizes = readPrizes();
    if (prize) prizes[submissionId] = prize;
    else delete prizes[submissionId];
    localStorage.setItem(PRIZE_KEY, JSON.stringify(prizes));
    const all = allSubmissions();
    const base = all.find((s) => s.id === submissionId) ?? all[0];
    return {
      ...base,
      prizeAmount: prize ? prize.amount : null,
      prizeCurrency: prize ? prize.currency : null,
      prizeLabel: prize ? prize.label : null,
      awardedAt: prize ? "2026-06-11T00:00:00.000Z" : null,
      awardedBy: prize ? "mock-admin" : null,
    };
  },

  // Platform admin: publish / unpublish the public results. Returns the timestamp.
  setResultsPublished(publish: boolean): string | null {
    const at = publish ? "2026-06-11T00:00:00.000Z" : null;
    if (publish) localStorage.setItem(PUBLISHED_KEY, at as string);
    else localStorage.removeItem(PUBLISHED_KEY);
    return at;
  },

  // Public, PII-free results — only once published. Winners first (prize desc).
  publicResults(): ApiPublicResults {
    const tiers = (mockPrograms.find((p) => p.slug === "bitrefill-2026")?.prizeTiers as ApiPrizeTier[]) ?? null;
    const publishedAt = localStorage.getItem(PUBLISHED_KEY);
    if (!publishedAt) return { published: false, prizeTiers: tiers, submissions: [] };
    const prizes = readPrizes();
    const submissions: ApiPublicResultEntry[] = allSubmissions()
      .map((s) => {
        const prize = prizes[s.id] ?? null;
        return {
          projectTitle: s.projectTitle,
          projectBrief: s.projectBrief ?? null,
          submitterName: s.submitterName,
          videoUrl: s.videoUrl,
          githubUrl: s.githubUrl,
          prize: prize ? { amount: prize.amount, currency: prize.currency, label: prize.label } : null,
        };
      })
      .sort((a, b) => (b.prize?.amount ?? -1) - (a.prize?.amount ?? -1));
    return { published: true, prizeTiers: tiers, submissions };
  },

  saveScore(submissionId: string, payload: { requirements: number; techStack: number; innovation: number; notes?: string }): ApiScore {
    const scores = readScores();
    scores[submissionId] = {
      requirements: payload.requirements,
      techStack: payload.techStack,
      innovation: payload.innovation,
      notes: payload.notes || "",
    };
    writeScores(scores);
    return toScore(submissionId) as ApiScore;
  },

  submitBallot(): { ok: boolean; missing?: number; total: number } {
    const scores = readScores();
    const all = allSubmissions();
    const missing = all.filter((s) => !scores[s.id]).length;
    if (missing > 0) return { ok: false, missing, total: all.length };
    localStorage.setItem(BALLOT_KEY, "submitted");
    return { ok: true, total: all.length };
  },

  leaderboard(): ApiLeaderboard {
    const total = 2; // two registered judges
    if (!ballotSubmitted()) {
      return { locked: true, submitted: 1, total, pending: [MOCK_JUDGE_EMAIL] };
    }
    const mine = readScores();
    const prizes = readPrizes();
    const addedEmails = new Set(readAdded().map((s) => s.lumaEmail));
    const rows: ApiLeaderboardRow[] = allSubmissions().map((s) => {
      const a = OTHER_JUDGE_SCORES[s.id];
      const b = mine[s.id];
      const prize = prizes[s.id] ?? null;
      // Seed rows have the other judge's finalized score; submissions added
      // this session do not, so they average over this judge alone.
      const judges = a ? [a, b] : [b];
      const avg = (sel: (j: { requirements: number; techStack: number; innovation: number }) => number) =>
        judges.reduce((t, j) => t + sel(j), 0) / judges.length;
      const avgRequirements = avg((j) => j.requirements);
      const avgTechStack = avg((j) => j.techStack);
      const avgInnovation = avg((j) => j.innovation);
      return {
        rank: 0,
        submissionId: s.id,
        projectTitle: s.projectTitle,
        submitterName: s.submitterName,
        githubUrl: s.githubUrl,
        videoUrl: s.videoUrl,
        eligible: ELIGIBLE_EMAILS.has(s.lumaEmail) || addedEmails.has(s.lumaEmail),
        avgTotal: avgRequirements + avgTechStack + avgInnovation,
        avgRequirements,
        avgTechStack,
        avgInnovation,
        judgeCount: judges.length,
        prizeAmount: prize ? prize.amount : null,
        prizeCurrency: prize ? prize.currency : null,
        prizeLabel: prize ? prize.label : null,
      };
    })
      .sort((x, y) => y.avgTotal - x.avgTotal || y.avgInnovation - x.avgInnovation)
      .map((r, i) => ({ ...r, rank: i + 1 }));
    return { locked: false, submitted: total, total, rows };
  },

  resetForTests() {
    localStorage.removeItem(SCORES_KEY);
    localStorage.removeItem(BALLOT_KEY);
    localStorage.removeItem(PROMOTED_KEY);
    localStorage.removeItem(PAID_KEY);
    localStorage.removeItem(ADDED_KEY);
    localStorage.removeItem(PRIZE_KEY);
    localStorage.removeItem(PUBLISHED_KEY);
  },
};

export { MOCK_JUDGE_EMAIL, OTHER_JUDGE_EMAIL };
