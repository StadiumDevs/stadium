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
  ApiScore,
  ApiSubmission,
  ApiSubmissionRow,
} from "./api";

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
    const submissions: ApiSubmissionRow[] = MOCK_SUBMISSIONS.map((s) => ({
      ...s,
      eligible: ELIGIBLE_EMAILS.has(s.lumaEmail),
      promotedProjectId: promoted[s.id] ?? null,
      myScore: toScore(s.id),
    }));
    return { locked: submitted, ballotStatus: submitted ? "submitted" : "in_progress", submissions };
  },

  promote(submissionId: string): { projectId: string; alreadyPromoted?: boolean } {
    const promoted = readPromoted();
    if (promoted[submissionId]) return { projectId: promoted[submissionId], alreadyPromoted: true };
    const projectId = `proj-${submissionId}`;
    promoted[submissionId] = projectId;
    localStorage.setItem(PROMOTED_KEY, JSON.stringify(promoted));
    return { projectId };
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
    const missing = MOCK_SUBMISSIONS.filter((s) => !scores[s.id]).length;
    if (missing > 0) return { ok: false, missing, total: MOCK_SUBMISSIONS.length };
    localStorage.setItem(BALLOT_KEY, "submitted");
    return { ok: true, total: MOCK_SUBMISSIONS.length };
  },

  leaderboard(): ApiLeaderboard {
    const total = 2; // two registered judges
    if (!ballotSubmitted()) {
      return { locked: true, submitted: 1, total, pending: [MOCK_JUDGE_EMAIL] };
    }
    const mine = readScores();
    const rows: ApiLeaderboardRow[] = MOCK_SUBMISSIONS.map((s) => {
      const a = OTHER_JUDGE_SCORES[s.id];
      const b = mine[s.id];
      const avg = (x: number, y: number) => (x + y) / 2;
      const avgRequirements = avg(a.requirements, b.requirements);
      const avgTechStack = avg(a.techStack, b.techStack);
      const avgInnovation = avg(a.innovation, b.innovation);
      return {
        rank: 0,
        submissionId: s.id,
        projectTitle: s.projectTitle,
        submitterName: s.submitterName,
        githubUrl: s.githubUrl,
        videoUrl: s.videoUrl,
        eligible: ELIGIBLE_EMAILS.has(s.lumaEmail),
        avgTotal: avgRequirements + avgTechStack + avgInnovation,
        avgRequirements,
        avgTechStack,
        avgInnovation,
        judgeCount: 2,
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
  },
};

export { MOCK_JUDGE_EMAIL, OTHER_JUDGE_EMAIL };
