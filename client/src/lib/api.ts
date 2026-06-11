// Fallbacks: production so Vercel deploy works without env; dev so local works without .env
const PRODUCTION_API = 'https://stadium-production-996a.up.railway.app/api';
const DEV_API = 'http://localhost:2000/api';
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.PROD ? PRODUCTION_API : DEV_API);

// Expose for debugging in console (e.g. type __STADIUM_API_BASE__)
if (typeof window !== "undefined") {
  (window as unknown as { __STADIUM_API_BASE__?: string }).__STADIUM_API_BASE__ = API_BASE_URL;
}

// Mock mode: when true, reads return fixtures from ./mockWinners and writes are
// simulated (localStorage + in-memory). Controlled by VITE_USE_MOCK_DATA — set to
// "true" in Vercel Preview so branch previews never call the production API.
// Expose for console debugging: window.__STADIUM_MOCK__
const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === 'true';
if (typeof window !== "undefined") {
  (window as unknown as { __STADIUM_MOCK__?: boolean }).__STADIUM_MOCK__ = USE_MOCK_DATA;
}

class ApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const mapStatusToMessage = (status: number) => {
  switch (status) {
    case 400:
      return "Your request looks invalid. Please check and try again.";
    case 401:
      return "Please sign in to continue.";
    case 403:
      return "You are not permitted to change this project.";
    case 404:
      return "We couldn't find what you're looking for.";
    case 500:
      return "Something went wrong on our side. Please try again later.";
    default:
      return "An unexpected error occurred. Please try again.";
  }
};

/**
 * Auth credentials accepted by admin-mutating API methods.
 *
 * - `string` (legacy) — treated as a one-shot SIWS payload; sent as
 *   `x-siws-auth: <value>`. All existing callers pass this shape.
 * - `Record<string,string>` (modern) — pre-built header map. Used by
 *   `useWalletAuth.getAdminBearerHeaders()` which returns either
 *   `{ Authorization: 'Bearer …' }` (session token) or `{ 'x-siws-auth': … }`
 *   (one-shot fallback when the session exchange fails).
 *
 * `undefined` means no auth header is sent (caller is responsible).
 */
export type AdminAuthArg = string | Record<string, string> | undefined;

/** Convert AdminAuthArg → header entries that can be spread into a fetch. */
export const adminAuthHeaders = (a: AdminAuthArg): Record<string, string> => {
  if (!a) return {};
  if (typeof a === "string") return { "x-siws-auth": a };
  return a;
};

const request = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  if (typeof window !== "undefined" && import.meta.env.DEV) {
    console.debug("[api]", url.slice(0, 80) + (url.length > 80 ? "…" : ""));
  }

  // Ensure we never drop the default Content-Type when custom headers are provided
  const config: RequestInit = { ...options };
  const defaultHeaders: Record<string, string> = { "Content-Type": "application/json" };
  const optionHeaders = (options.headers || {}) as Record<string, string>;
  config.headers = { ...defaultHeaders, ...optionHeaders };

  const response = await fetch(url, config);

  if (!response.ok) {
    let message = mapStatusToMessage(response.status);
    try {
      const body = await response.json();
      if (body && typeof body.message === "string" && body.message.trim()) {
        message = body.error ? `${body.message}: ${body.error}` : body.message;
      }
    } catch {
      // ignore non-JSON or empty body
    }
    throw new ApiError(message, response.status);
  }

  // Some endpoints may return 204 No Content
  if (response.status === 204) return null;
  return response.json();
};

type GetProjectsParams = {
  page?: number;
  limit?: number;
  search?: string;
  status?: string; // legacy client param; mapped to projectState
  projectState?: string;
  hackathonId?: string;
  winnersOnly?: boolean;
  /** When true, only projects that won a main track (bountyPrize[].name contains "main track") */
  mainTrackOnly?: boolean;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

/** Project shape returned by getProjects (includes M2 fields from server) */
export type ApiProject = {
  id: string;
  projectName: string;
  description: string;
  teamMembers?: { name: string; walletAddress?: string }[];
  projectRepo?: string;
  demoUrl?: string;
  slidesUrl?: string;
  /** Live/production website URL */
  liveUrl?: string;
  donationAddress?: string;
  bountyPrize?: { name: string; amount: number; hackathonWonAtId: string }[];
  techStack?: string[];
  categories?: string[];
  m2Status?: "building" | "under_review" | "completed";
  completionDate?: string;
  submittedDate?: string;
  updatedAt?: string;
  hackathon?: { id: string; name: string; endDate: string; eventStartedAt?: string };
  /**
   * Canonical event/track row (Phase 1 #93). Populated when the project's
   * `program_id` resolves to a row in `programs`. `hackathon` above stays
   * around as the legacy flat-column view for callers not yet migrated.
   */
  program?: {
    id: string;
    name: string;
    slug: string;
    programType: ApiProgram["programType"];
    status: ApiProgram["status"];
    eventStartsAt?: string | null;
    eventEndsAt?: string | null;
    location?: string | null;
  } | null;
  finalSubmission?: {
    repoUrl?: string;
    demoUrl?: string;
    docsUrl?: string;
    summary?: string;
    submittedDate?: string;
    submittedBy?: string;
  };
  totalPaid?: Array<{
    milestone: "M1" | "M2" | "BOUNTY";
    amount: number;
    currency: "USDC" | "DOT";
    transactionProof: string;
    bountyName?: string;
  }>;
};

/** Shape of a row in `project_funding_signals` (Phase 1 revamp, #42). */
export type ApiFundingSignal = {
  id?: string;
  projectId: string;
  isSeeking: boolean;
  fundingType?: "grant" | "bounty" | "pre_seed" | "seed" | "other" | null;
  amountRange?: string | null;
  description?: string | null;
  updatedBy?: string | null;
  updatedAt?: string | null;
};

/** Shape of a row in `program_applications` (Phase 1 revamp, #43). */
export type ApiProgramApplication = {
  id: string;
  programId: string;
  projectId: string;
  status: "submitted" | "accepted" | "rejected" | "withdrawn";
  applicationFields: Record<string, unknown>;
  submittedBy: string;
  submittedAt: string;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  reviewNotes?: string | null;
};

/** Shape of a row in the `program_admins` table (Phase 3 #95). */
export type ApiProgramAdmin = {
  programId: string;
  walletChain: "substrate" | "ethereum" | "solana";
  wallet: string;
  createdAt: string;
};

/** An email-keyed program admin (social sign-in onboarding). View-only. */
export type ApiProgramAdminEmail = {
  programId: string;
  email: string;
  /** 'admin' = view access; 'judge' = scoped write access to scoring only. */
  role: "admin" | "judge";
  invitedBy: string | null;
  createdAt: string;
};

/** A public project submission (Bitrefill intake). */
export type ApiSubmission = {
  id: string;
  programId: string;
  submitterName: string;
  lumaEmail: string;
  projectTitle: string;
  /** 2-3 sentence brief: what the project is and what it does. */
  projectBrief: string;
  videoUrl: string;
  githubUrl: string;
  /** Set once an admin promotes this submission into a Stadium project. */
  promotedProjectId?: string | null;
  /** Payout tracking: an admin marks the (winning) submission as paid. */
  paid?: boolean;
  paidAt?: string | null;
  paidBy?: string | null;
  /** Winner prize (null = not a winner). Assigned by a platform admin post-judging. */
  prizeAmount?: number | null;
  prizeCurrency?: string | null;
  prizeLabel?: string | null;
  awardedAt?: string | null;
  awardedBy?: string | null;
  createdAt: string;
  updatedAt: string;
};

/** A prize tier configurable per program; awarded amount snapshots one of these. */
export type ApiPrizeTier = { amount: number; currency: string; label: string };

/** One judge's score for one submission (rubric: req 0-2, tech 0-5, innov 0-5). */
export type ApiScore = {
  submissionId: string;
  judgeEmail: string;
  requirements: number;
  techStack: number;
  innovation: number;
  notes: string | null;
};

/** A submission row as seen by a judge: eligibility flag + their own score. */
export type ApiSubmissionRow = ApiSubmission & {
  eligible: boolean;
  myScore: ApiScore | null;
  /** Which batch (of batchSize) this submission falls in. */
  batchNumber?: number;
};

/** Coverage of one batch: how many judges claimed it + whether this judge has. */
export type ApiBatchInfo = {
  batchNumber: number;
  size: number;
  claimCount: number;
  claimedByMe: boolean;
};

export type ApiJudgeView = {
  locked: boolean;
  ballotStatus: "in_progress" | "submitted";
  /** How many registered judges have submitted, so a judge can see who's left. */
  ballotProgress?: { submitted: number; total: number };
  /** Batch claiming: the fixed batch size, this judge's claims, and coverage. */
  batchSize?: number;
  claimedBatches?: number[];
  batches?: ApiBatchInfo[];
  submissions: ApiSubmissionRow[];
};

export type ApiLeaderboardRow = {
  rank: number;
  submissionId: string;
  projectTitle: string;
  submitterName?: string;
  githubUrl?: string;
  videoUrl?: string;
  /** False when the submitter's Luma email isn't in the signup list. */
  eligible?: boolean;
  avgTotal: number;
  avgRequirements: number;
  avgTechStack: number;
  avgInnovation: number;
  judgeCount: number;
  /** Individual per-judge scores (submitted judges only) for the breakdown view. */
  judgeScores?: { judgeEmail: string; requirements: number; techStack: number; innovation: number; total: number }[];
  /** Current prize on this submission (null = not a winner). */
  prizeAmount?: number | null;
  prizeCurrency?: string | null;
  prizeLabel?: string | null;
};

export type ApiLeaderboard =
  // Locked = not yet full coverage (some submission has no score from a submitted judge).
  | { locked: true; submissionsScored: number; submissionsTotal: number; pendingJudges: string[] }
  | { locked: false; submitted: number; total: number; rows: ApiLeaderboardRow[] };

/** One row in the unified program inbox (signups + applications merged). */
export type ApiInboxEntry = {
  source: "signup" | "application";
  id: string;
  when: string | null;
  name: string | null;
  email: string | null;
  identifier: string;
  status: string | null;
  wallet: string | null;
  walletChain: string | null;
};

/** Row in `project_continuations` ('What's next, milestone 3?' submissions). */
export type ApiProjectContinuation = {
  id: string;
  projectId: string;
  currentStatus: string;
  wantSupport: boolean;
  supportFor: string | null;
  nextStepUrl: string | null;
  submittedBy: string;
  submittedByChain: "substrate" | "ethereum" | "solana";
  createdAt: string;
};

/** Tier-0 / tier-1 admin record. Same shape for both tables. */
export type ApiAdminTierEntry = {
  walletChain: "substrate" | "ethereum" | "solana";
  wallet: string;
  label?: string | null;
  addedBy?: string | null;
  createdAt?: string;
};

/** One row in the per-program audit log. */
export type ApiAuditLogEntry = {
  id: string;
  programId: string;
  actorChain: string | null;
  actorWallet: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

/** Shape of a row in the `programs` table (Phase 1 revamp). */
/** A single curated link on a lineup item (website, docs, more-info). */
export type ProgramContentLink = { label: string; url: string };

/** One product/project showcased in a `lineup` content section. */
export type ProgramLineupItem = {
  name: string;
  blurb?: string;
  tryItems?: string[];
  links?: ProgramContentLink[];
};

/** One verbatim highlight in a `feedback` content section. */
export type ProgramFeedbackItem = {
  product?: string;
  quote: string;
  rating?: string;
  recommend?: boolean;
};

/** One metric tile in a `stats` content section. */
export type ProgramStat = { label: string; value: string };

/**
 * Ordered, typed section that renders as an on-brand panel on the program
 * detail page. Stored as JSONB in `programs.content`; reusable per program.
 */
export type ProgramContentSection =
  | { type: "text"; title?: string; body: string }
  | { type: "steps"; title?: string; items: string[] }
  | { type: "schedule"; title?: string; rows: { time: string; label: string }[] }
  | { type: "lineup"; title?: string; items: ProgramLineupItem[] }
  | { type: "stats"; title?: string; items: ProgramStat[] }
  | { type: "feedback"; title?: string; items: ProgramFeedbackItem[] }
  | { type: "cta"; title?: string; label: string; url: string };

export type ApiProgram = {
  id: string;
  name: string;
  slug: string;
  programType: "dogfooding" | "pitch_off" | "hackathon" | "m2_incubator";
  description?: string | null;
  status: "draft" | "open" | "closed" | "completed";
  owner: string;
  applicationsOpenAt?: string | null;
  applicationsCloseAt?: string | null;
  eventStartsAt?: string | null;
  eventEndsAt?: string | null;
  location?: string | null;
  maxApplicants?: number | null;
  eventUrl?: string | null;
  content?: ProgramContentSection[] | null;
  /** Prize tiers for judging (null ⇒ app default). Configurable per program. */
  prizeTiers?: ApiPrizeTier[] | null;
  /** Set when a platform admin publishes results to the public program page. */
  resultsPublishedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

/** At-a-glance counts for the program admin/judge header (no PII). */
export type ApiProgramStats = { confirmedParticipants: number; submissionsCount: number };

/** Public, PII-free results payload for the program page (gated on publish). */
export type ApiPublicResultEntry = {
  projectTitle: string;
  projectBrief?: string | null;
  submitterName: string;
  videoUrl: string;
  githubUrl: string;
  prize: ApiPrizeTier | null;
};
export type ApiPublicResults = {
  published: boolean;
  prizeTiers?: ApiPrizeTier[] | null;
  submissions: ApiPublicResultEntry[];
};

/** Per-program sponsor / partner with goals + follow-up tracking. */
export type ApiProgramSponsor = {
  id: string;
  programId: string;
  name: string;
  submissionTarget?: number | null;
  targetProfiles: string[];
  applicationInstructions?: string | null;
  followUpNotes?: string | null;
  applyUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

/** Shape of a row in `program_signups` (Luma CSV imports). */
export type ApiProgramSignup = {
  id: string;
  programId: string;
  email: string;
  name?: string | null;
  wallet?: string | null;
  registeredAt?: string | null;
  source: string;
  rawRow?: Record<string, unknown> | null;
  importedInBatchAt?: string | null;
  createdAt?: string;
};

/** Public, PII-free project card from GET /programs/:slug/projects. */
export type ApiProgramProject = {
  name: string;
  description?: string | null;
  repoUrl?: string | null;
  docsUrl?: string | null;
  tags: string[];
};

/** Summary returned by POST /programs/:slug/signups/import. */
export type ProgramSignupImportSummary = {
  dryRun: boolean;
  totalParsed: number;
  skippedNoEmail: number;
  duplicates: number;
  newCount: number;
  newPreview: Array<{ email: string; name?: string | null; wallet?: string | null }>;
  duplicatePreview: Array<{ email: string; name?: string | null }>;
  inserted: ApiProgramSignup[];
};

/** Shape of a row in `project_updates` (Phase 1 revamp, #39). */
export type ApiProjectUpdate = {
  id: string;
  projectId: string;
  body: string;
  linkUrl?: string | null;
  createdBy: string;
  createdAt: string;
};

export const api = {
  submitEntry: async (data: unknown) => {
    if (USE_MOCK_DATA) {
      await new Promise((r) => setTimeout(r, 300));
      return { success: true, data };
    }
    return request("/entry", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  getProjects: async (params?: GetProjectsParams) => {
    // TEMPORARY: Return mock data when server is down
    if (USE_MOCK_DATA) {
      const { getMockWinnersResponse } = await import("./mockWinners");
      const mockResponse = getMockWinnersResponse();
      
      // Filter by hackathonId if specified
      if (params?.hackathonId) {
        mockResponse.data = mockResponse.data.filter(
          (p) => p.hackathon?.id === params.hackathonId
        );
        mockResponse.meta.total = mockResponse.data.length;
        mockResponse.meta.count = mockResponse.data.length;
      }
      
      // Filter winners only if specified
      if (params?.winnersOnly) {
        mockResponse.data = mockResponse.data.filter(
          (p) => p.bountyPrize && p.bountyPrize.length > 0
        );
        mockResponse.meta.total = mockResponse.data.length;
        mockResponse.meta.count = mockResponse.data.length;
      }
      if (params?.mainTrackOnly) {
        mockResponse.data = mockResponse.data.filter((p) =>
          p.bountyPrize?.some((b) => b.name.toLowerCase().includes("main track"))
        );
        mockResponse.meta.total = mockResponse.data.length;
        mockResponse.meta.count = mockResponse.data.length;
      }
      return Promise.resolve(mockResponse);
    }
    
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", params.page.toString());
    if (params?.limit) searchParams.set("limit", params.limit.toString());
    if (params?.search) searchParams.set("search", params.search);
    if (params?.projectState) searchParams.set("projectState", params.projectState);
    if (params?.status) searchParams.set("projectState", params.status);
    if (params?.hackathonId) searchParams.set("hackathonId", params.hackathonId);
    if (params?.winnersOnly !== undefined) searchParams.set("winnersOnly", String(params.winnersOnly));
    if (params?.mainTrackOnly !== undefined) searchParams.set("mainTrackOnly", String(params.mainTrackOnly));
    if (params?.sortBy) searchParams.set("sortBy", params.sortBy);
    if (params?.sortOrder) searchParams.set("sortOrder", params.sortOrder);

    const queryString = searchParams.toString();
    return request(`/m2-program${queryString ? `?${queryString}` : ""}`);
  },

  getProject: async (id: string) => {
    // TEMPORARY: Return mock data when server is down
    if (USE_MOCK_DATA) {
      const { mockWinningProjects } = await import("./mockWinners");
      const mockProject = mockWinningProjects.find((p) => p.id === id);

      if (mockProject) {
        return Promise.resolve({
          status: "success",
          data: mockProject
        });
      }

      // Fall back to localStorage-persisted projects (e.g. created via createProject in mock mode)
      const stored = localStorage.getItem("projects");
      if (stored) {
        const lsProjects: ApiProject[] = JSON.parse(stored);
        const lsProject = lsProjects.find((p) => p.id === id);
        if (lsProject) {
          return Promise.resolve({ status: "success", data: lsProject });
        }
      }

      // If project not found in mock data, return 404-like response
      throw new ApiError("Project not found", 404);
    }

    return request(`/m2-program/${id}`);
  },

  updateProjectTeam: async (projectId: string, teamMembers: Array<{ name: string; walletAddress?: string; customUrl?: string }>, authHeader: string) => {
    if (USE_MOCK_DATA) {
      await new Promise((r) => setTimeout(r, 300));
      const { mockWinningProjects } = await import("./mockWinners");
      const mockProject = mockWinningProjects.find((p) => p.id === projectId);
      if (mockProject) (mockProject as unknown as { teamMembers: unknown }).teamMembers = teamMembers;
      return { success: true };
    }
    return request(`/m2-program/${projectId}/team`, {
      method: "POST",
      headers: adminAuthHeaders(authHeader),
      body: JSON.stringify({ teamMembers }),
    });
  },

  updateProjectCategories: async (projectId: string, categories: string[], authHeader: string) => {
    if (USE_MOCK_DATA) {
      await new Promise((r) => setTimeout(r, 300));
      const { mockWinningProjects } = await import("./mockWinners");
      const mockProject = mockWinningProjects.find((p) => p.id === projectId);
      if (mockProject) (mockProject as unknown as { categories: string[] }).categories = categories;
      return { success: true };
    }
    return request(`/m2-program/${projectId}`, {
      method: "PATCH",
      headers: { ...adminAuthHeaders(authHeader), "Content-Type": "application/json" },
      body: JSON.stringify({ categories }),
    });
  },

  submitForReview: async (projectId: string, submission: {
    repoUrl: string;
    demoUrl: string;
    docsUrl: string;
    summary: string;
  }, authHeader?: AdminAuthArg) => {
    if (USE_MOCK_DATA) {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Update project in localStorage
      const stored = localStorage.getItem('projects');
      if (stored) {
        const projects = JSON.parse(stored);
        const index = projects.findIndex((p: any) => p.id === projectId);
        if (index !== -1) {
          projects[index].finalSubmission = {
            ...submission,
            submittedDate: new Date().toISOString()
          };
          // Note: Status stays "building" until admin changes it to "under_review"
          localStorage.setItem('projects', JSON.stringify(projects));
        }
      }
      
      // Also try to get from mock data and update in-memory
      const { mockWinningProjects } = await import("./mockWinners");
      const mockProject = mockWinningProjects.find((p) => p.id === projectId);
      if (mockProject) {
        (mockProject as any).finalSubmission = {
          ...submission,
          submittedDate: new Date().toISOString()
        };
      }
      
      return { success: true };
    }
    
    // Real API call (server route is submit-m2, not submit-review)
    return request(`/m2-program/${projectId}/submit-m2`, {
      method: 'POST',
      headers: { ...adminAuthHeaders(authHeader), "Content-Type": "application/json" },
      body: JSON.stringify(submission)
    });
  },

  updateTeam: async (projectId: string, data: {
    teamMembers: Array<{
      name: string;
      walletAddress?: string;
      walletChain?: 'substrate' | 'ethereum' | 'solana';
      role?: string;
      twitter?: string;
      github?: string;
      linkedin?: string;
      customUrl?: string;
    }>;
    donationAddress?: string;
    donationChain?: 'substrate' | 'ethereum' | 'solana';
  }, authHeader?: AdminAuthArg) => {
    if (USE_MOCK_DATA) {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Update project in localStorage
      const stored = localStorage.getItem('projects');
      if (stored) {
        const projects = JSON.parse(stored);
        const index = projects.findIndex((p: any) => p.id === projectId);
        if (index !== -1) {
          projects[index].teamMembers = data.teamMembers;
          if (data.donationAddress) {
            projects[index].donationAddress = data.donationAddress;
          }
          localStorage.setItem('projects', JSON.stringify(projects));
        }
      }
      
      return { success: true };
    }
    
    // Real API call - update team members
    const teamResult = await request(`/m2-program/${projectId}/team`, {
      method: 'POST',
      headers: { ...adminAuthHeaders(authHeader), "Content-Type": "application/json" },
      body: JSON.stringify({ teamMembers: data.teamMembers })
    });

    // If there's a donation address, update it separately
    if (data.donationAddress) {
      await request(`/m2-program/${projectId}/payout-address`, {
        method: 'PATCH',
        headers: { ...adminAuthHeaders(authHeader), "Content-Type": "application/json" },
        body: JSON.stringify({
          donationAddress: data.donationAddress,
          donationChain: data.donationChain || 'substrate',
        })
      });
    }

    return teamResult;
  },

  webzeroApprove: async (projectId: string, authHeader?: AdminAuthArg) => {
    if (USE_MOCK_DATA) {
      await new Promise((resolve) => setTimeout(resolve, 500));

      const stored = localStorage.getItem('projects');
      if (stored) {
        const projects = JSON.parse(stored);
        const index = projects.findIndex((p: { id: string }) => p.id === projectId);
        if (index !== -1) {
          projects[index].m2Status = 'completed';
          projects[index].changesRequested = undefined;
          localStorage.setItem('projects', JSON.stringify(projects));
        }
      }

      const { mockWinningProjects } = await import('./mockWinners');
      const mockProject = mockWinningProjects.find((p) => p.id === projectId);
      if (mockProject) {
        mockProject.m2Status = 'completed';
        mockProject.changesRequested = undefined;
      }

      return { success: true };
    }

    return request(`/m2-program/${projectId}/approve`, {
      method: "POST",
      headers: { ...adminAuthHeaders(authHeader), "Content-Type": "application/json" },
      body: JSON.stringify({
        m2Status: 'completed',
        webzeroApproved: true,
        webzeroApprovalDate: new Date().toISOString(),
      }),
    });
  },

  requestChanges: async (projectId: string, feedback: string, authHeader?: AdminAuthArg) => {
    if (USE_MOCK_DATA) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const requestedDate = new Date().toISOString();
      const changesRequested = { feedback, requestedBy: 'admin', requestedDate };

      const stored = localStorage.getItem('projects');
      if (stored) {
        const projects = JSON.parse(stored);
        const index = projects.findIndex((p: { id: string }) => p.id === projectId);
        if (index !== -1) {
          projects[index].m2Status = 'building';
          projects[index].changesRequested = changesRequested;
          localStorage.setItem('projects', JSON.stringify(projects));
        }
      }

      const { mockWinningProjects } = await import('./mockWinners');
      const mockProject = mockWinningProjects.find((p) => p.id === projectId);
      if (mockProject) {
        mockProject.m2Status = 'building';
        mockProject.changesRequested = changesRequested;
      }

      return { success: true };
    }

    return request(`/m2-program/${projectId}/request-changes`, {
      method: "POST",
      headers: { ...adminAuthHeaders(authHeader), "Content-Type": "application/json" },
      body: JSON.stringify({
        feedback,
        requestedChangesDate: new Date().toISOString(),
      }),
    });
  },

  submitM2Agreement: async (projectId: string, agreement: {
    mentorName: string;
    agreedDate: string;
    agreedFeatures: string[];
    documentation?: string[];
    successCriteria?: string;
  }, authHeader?: AdminAuthArg) => {
    if (USE_MOCK_DATA) {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Update project in localStorage
      const stored = localStorage.getItem('projects');
      if (stored) {
        const projects = JSON.parse(stored);
        const index = projects.findIndex((p: any) => p.id === projectId);
        if (index !== -1) {
          projects[index].m2Agreement = agreement;
          localStorage.setItem('projects', JSON.stringify(projects));
        }
      }
      
      // Also try to get from mock data and update in-memory
      const { mockWinningProjects } = await import("./mockWinners");
      const mockProject = mockWinningProjects.find((p) => p.id === projectId);
      if (mockProject) {
        (mockProject as any).m2Agreement = agreement;
      }
      
      return { success: true };
    }
    
    // Real API call
    return request(`/m2-program/${projectId}/m2-agreement`, {
      method: 'POST',
      headers: { ...adminAuthHeaders(authHeader), "Content-Type": "application/json" },
      body: JSON.stringify(agreement)
    });
  },

  updateM2Agreement: async (
    projectId: string,
    data: {
      agreedFeatures: string[];
      documentation: string[];
      successCriteria: string;
    },
    authHeader?: AdminAuthArg
  ) => {
    if (USE_MOCK_DATA) {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Update project in localStorage
      const stored = localStorage.getItem('projects');
      if (stored) {
        const projects = JSON.parse(stored);
        const index = projects.findIndex((p: any) => p.id === projectId);
        if (index !== -1) {
          projects[index].m2Agreement = {
            ...projects[index].m2Agreement,
            agreedFeatures: data.agreedFeatures,
            documentation: data.documentation,
            successCriteria: data.successCriteria,
            lastUpdatedBy: 'team',
            lastUpdatedDate: new Date().toISOString()
          };
          localStorage.setItem('projects', JSON.stringify(projects));
        }
      }
      
      // Also try to get from mock data and update in-memory
      const { mockWinningProjects } = await import("./mockWinners");
      const mockProject = mockWinningProjects.find((p) => p.id === projectId);
      if (mockProject && (mockProject as any).m2Agreement) {
        (mockProject as any).m2Agreement = {
          ...(mockProject as any).m2Agreement,
          agreedFeatures: data.agreedFeatures,
          documentation: data.documentation,
          successCriteria: data.successCriteria,
          lastUpdatedBy: 'team',
          lastUpdatedDate: new Date().toISOString()
        };
      }
      
      return { success: true };
    }
    
    // Real API call
    return request(`/m2-program/${projectId}/m2-agreement`, {
      method: 'PATCH',
      headers: { ...adminAuthHeaders(authHeader), "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
  },

  updateProjectStatus: async (projectId: string, status: 'building' | 'under_review' | 'completed', authHeader?: AdminAuthArg) => {
    if (USE_MOCK_DATA) {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // In mock mode, update localStorage
      const stored = localStorage.getItem('projects')
      if (stored) {
        const projects = JSON.parse(stored)
        const index = projects.findIndex((p: any) => p.id === projectId)
        if (index !== -1) {
          projects[index].m2Status = status
          if (status === 'completed') {
            projects[index].completionDate = new Date().toISOString()
          }
          localStorage.setItem('projects', JSON.stringify(projects))
        }
      }
      
      return { success: true }
    }
    
    // Real API call
    return request(`/m2-program/${projectId}`, {
      method: "PATCH",
      headers: { ...adminAuthHeaders(authHeader), "Content-Type": "application/json" },
      body: JSON.stringify({
        m2Status: status,
      }),
    })
  },

  updateTeamMembers: async (
    projectId: string,
    teamMembers: Array<{
      name: string;
      walletAddress?: string;
      role?: string;
      twitter?: string;
      github?: string;
      linkedin?: string;
      customUrl?: string;
    }>,
    authHeader?: AdminAuthArg
  ) => {
    if (USE_MOCK_DATA) {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Update project in localStorage
      const stored = localStorage.getItem('projects');
      if (stored) {
        const projects = JSON.parse(stored);
        const index = projects.findIndex((p: any) => p.id === projectId);
        if (index !== -1) {
          projects[index].teamMembers = teamMembers;
          localStorage.setItem('projects', JSON.stringify(projects));
        }
      }
      
      return { success: true };
    }
    
    // Real API call
    return request(`/m2-program/${projectId}/team`, {
      method: 'POST',
      headers: { ...adminAuthHeaders(authHeader), "Content-Type": "application/json" },
      body: JSON.stringify({ teamMembers })
    });
  },

  updatePayoutAddress: async (
    projectId: string,
    donationAddress: string,
    authHeader?: AdminAuthArg,
    donationChain: 'substrate' | 'ethereum' | 'solana' = 'substrate'
  ) => {
    if (USE_MOCK_DATA) {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Update project in localStorage
      const stored = localStorage.getItem('projects');
      if (stored) {
        const projects = JSON.parse(stored);
        const index = projects.findIndex((p: any) => p.id === projectId);
        if (index !== -1) {
          projects[index].donationAddress = donationAddress;
          localStorage.setItem('projects', JSON.stringify(projects));
        }
      }
      
      return { success: true };
    }
    
    // Real API call
    return request(`/m2-program/${projectId}`, {
      method: 'PATCH',
      headers: { ...adminAuthHeaders(authHeader), "Content-Type": "application/json" },
      body: JSON.stringify({ donationAddress, donationChain })
    });
  },

  updateProjectDetails: async (
    projectId: string,
    data: {
      projectName?: string;
      description?: string;
      projectRepo?: string;
      demoUrl?: string;
      slidesUrl?: string;
      liveUrl?: string;
      categories?: string[];
      techStack?: string[];
      bountiesProcessed?: boolean;
      projectState?: string;
      bountyPrize?: Array<{
        name: string;
        amount: number;
        hackathonWonAtId: string;
        txHash?: string;
      }>;
      finalSubmission?: {
        repoUrl?: string;
        demoUrl?: string;
        docsUrl?: string;
        summary?: string;
        submittedDate?: string;
        submittedBy?: string;
      };
      hackathon?: {
        id?: string;
        name?: string;
        endDate?: string;
        eventStartedAt?: string;
      };
    },
    authHeader?: AdminAuthArg
  ) => {
    if (USE_MOCK_DATA) {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Update project in localStorage
      const stored = localStorage.getItem('projects');
      if (stored) {
        const projects = JSON.parse(stored);
        const index = projects.findIndex((p: any) => p.id === projectId);
        if (index !== -1) {
          Object.assign(projects[index], data);
          localStorage.setItem('projects', JSON.stringify(projects));
        }
      }
      
      return { success: true };
    }
    
    // Real API call
    return request(`/m2-program/${projectId}`, {
      method: 'PATCH',
      headers: { ...adminAuthHeaders(authHeader), "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
  },

  confirmPayment: async (
    projectId: string,
    data: {
      milestone: 'M1' | 'M2' | 'BOUNTY';
      amount: number;
      currency: 'USDC' | 'DOT';
      transactionProof: string;
      bountyName?: string; // Required for BOUNTY milestone
    },
    authHeader?: AdminAuthArg
  ) => {
    if (USE_MOCK_DATA) {
      if (!['M1', 'M2', 'BOUNTY'].includes(data.milestone)) {
        throw new ApiError('Invalid milestone. Must be M1, M2, or BOUNTY', 400);
      }
      if (!data.amount || data.amount <= 0) {
        throw new ApiError('Invalid amount', 400);
      }
      if (!['USDC', 'DOT'].includes(data.currency)) {
        throw new ApiError('Invalid currency. Must be USDC or DOT', 400);
      }
      if (!data.transactionProof || !data.transactionProof.startsWith('http')) {
        throw new ApiError('Valid transaction proof URL is required', 400);
      }
      if (data.milestone === 'BOUNTY' && !data.bountyName) {
        throw new ApiError('bountyName is required for BOUNTY payments', 400);
      }

      await new Promise((resolve) => setTimeout(resolve, 500));

      const { mockWinningProjects } = await import('./mockWinners');
      const mockProject = mockWinningProjects.find((p) => p.id === projectId);
      if (!mockProject) {
        throw new ApiError('Project not found', 404);
      }

      const totalPaid = (mockProject.totalPaid as Array<{
        milestone: string;
        bountyName?: string;
      }> | undefined) ?? [];
      const alreadyPaid =
        data.milestone === 'BOUNTY'
          ? totalPaid.some(
              (p) => p.milestone === 'BOUNTY' && p.bountyName === data.bountyName,
            )
          : totalPaid.some((p) => p.milestone === data.milestone);
      if (alreadyPaid) {
        throw new ApiError(
          data.milestone === 'BOUNTY'
            ? `Bounty "${data.bountyName}" has already been paid`
            : `${data.milestone} has already been paid`,
          400,
        );
      }

      const paidDate = new Date().toISOString();
      const paymentEntry: Record<string, unknown> = {
        milestone: data.milestone,
        amount: data.amount,
        currency: data.currency,
        transactionProof: data.transactionProof,
        paidDate,
      };
      if (data.milestone === 'BOUNTY') paymentEntry.bountyName = data.bountyName;

      const nextTotalPaid = [...totalPaid, paymentEntry];
      (mockProject as { totalPaid?: unknown }).totalPaid = nextTotalPaid;
      if (data.milestone === 'M2') {
        mockProject.m2Status = 'completed';
        mockProject.completionDate = paidDate;
      }

      const stored = localStorage.getItem('projects');
      if (stored) {
        const projects = JSON.parse(stored);
        const index = projects.findIndex((p: { id: string }) => p.id === projectId);
        if (index !== -1) {
          projects[index].totalPaid = nextTotalPaid;
          if (data.milestone === 'M2') {
            projects[index].m2Status = 'completed';
            projects[index].completionDate = paidDate;
          }
          localStorage.setItem('projects', JSON.stringify(projects));
        }
      }

      return { success: true };
    }
    
    // Real API call
    return request(`/m2-program/${projectId}/confirm-payment`, {
      method: 'POST',
      headers: { ...adminAuthHeaders(authHeader), "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
  },

  /**
   * Phase 1 revamp: programs (Dogfooding, M2, etc.). See
   * docs/stadium-revamp-phase-1-spec.md §4.1.
   */
  listPrograms: async (params?: { status?: ApiProgram["status"] }): Promise<{ status: string; data: ApiProgram[] }> => {
    if (USE_MOCK_DATA) {
      const { mockPrograms } = await import("./mockPrograms");
      const filtered = params?.status
        ? mockPrograms.filter((p) => p.status === params.status)
        : mockPrograms;
      return { status: "success", data: filtered };
    }
    const qs = params?.status ? `?status=${encodeURIComponent(params.status)}` : "";
    return request(`/programs${qs}`);
  },

  getProgramBySlug: async (slug: string): Promise<{ status: string; data: ApiProgram }> => {
    if (USE_MOCK_DATA) {
      const { mockPrograms } = await import("./mockPrograms");
      const program = mockPrograms.find((p) => p.slug === slug);
      if (!program) throw new ApiError("Program not found", 404);
      return { status: "success", data: program };
    }
    return request(`/programs/${encodeURIComponent(slug)}`);
  },

  /**
   * Phase 1 revamp: project updates (Block B, issues #39–#41).
   */
  getProjectUpdates: async (projectId: string): Promise<{ status: string; data: ApiProjectUpdate[] }> => {
    if (USE_MOCK_DATA) {
      const { mockProjectUpdates } = await import("./mockProjectUpdates");
      const filtered = mockProjectUpdates
        .filter((u) => u.projectId === projectId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return { status: "success", data: filtered };
    }
    return request(`/m2-program/${encodeURIComponent(projectId)}/updates`);
  },

  postProjectUpdate: async (
    projectId: string,
    payload: { body: string; linkUrl?: string | null },
    authHeader?: AdminAuthArg,
  ): Promise<{ status: string; data: ApiProjectUpdate }> => {
    if (USE_MOCK_DATA) {
      const { mockProjectUpdates } = await import("./mockProjectUpdates");
      const created: ApiProjectUpdate = {
        id: `upd-mock-${Date.now()}`,
        projectId,
        body: payload.body.trim(),
        linkUrl: payload.linkUrl ? payload.linkUrl.trim() : null,
        createdBy: "mock-wallet",
        createdAt: new Date().toISOString(),
      };
      mockProjectUpdates.unshift(created);
      return { status: "success", data: created };
    }
    return request(`/m2-program/${encodeURIComponent(projectId)}/updates`, {
      method: "POST",
      headers: { ...adminAuthHeaders(authHeader), "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  /**
   * Phase 1 revamp: funding signal (#42).
   */
  getFundingSignal: async (projectId: string): Promise<{ status: string; data: ApiFundingSignal }> => {
    if (USE_MOCK_DATA) {
      const { mockFundingSignals } = await import("./mockFundingSignals");
      const signal = mockFundingSignals[projectId] || {
        projectId,
        isSeeking: false,
        fundingType: null,
        amountRange: null,
        description: null,
        updatedBy: null,
        updatedAt: null,
      };
      return { status: "success", data: signal };
    }
    return request(`/m2-program/${encodeURIComponent(projectId)}/funding-signal`);
  },

  updateFundingSignal: async (
    projectId: string,
    payload: {
      isSeeking: boolean;
      fundingType?: ApiFundingSignal["fundingType"];
      amountRange?: string | null;
      description?: string | null;
    },
    authHeader?: AdminAuthArg,
  ): Promise<{ status: string; data: ApiFundingSignal }> => {
    if (USE_MOCK_DATA) {
      const { mockFundingSignals } = await import("./mockFundingSignals");
      const updated: ApiFundingSignal = {
        projectId,
        isSeeking: payload.isSeeking,
        fundingType: payload.fundingType || null,
        amountRange: payload.amountRange ?? null,
        description: payload.description ?? null,
        updatedBy: "mock-wallet",
        updatedAt: new Date().toISOString(),
      };
      mockFundingSignals[projectId] = updated;
      return { status: "success", data: updated };
    }
    return request(`/m2-program/${encodeURIComponent(projectId)}/funding-signal`, {
      method: "PATCH",
      headers: { ...adminAuthHeaders(authHeader), "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  /**
   * Phase 1 revamp: admin program management (Block F, issue #46).
   */
  createProgram: async (
    payload: Partial<ApiProgram> & { name: string; slug: string; programType: ApiProgram["programType"]; status: ApiProgram["status"] },
    authHeader?: AdminAuthArg,
  ): Promise<{ status: string; data: ApiProgram }> => {
    if (USE_MOCK_DATA) {
      const { mockPrograms } = await import("./mockPrograms");
      if (mockPrograms.some((p) => p.slug === payload.slug)) {
        throw new ApiError("A program with that slug already exists.", 409);
      }
      const created: ApiProgram = {
        id: payload.id || `mock-${Date.now()}`,
        owner: "webzero",
        description: payload.description ?? null,
        applicationsOpenAt: payload.applicationsOpenAt ?? null,
        applicationsCloseAt: payload.applicationsCloseAt ?? null,
        eventStartsAt: payload.eventStartsAt ?? null,
        eventEndsAt: payload.eventEndsAt ?? null,
        location: payload.location ?? null,
        maxApplicants: payload.maxApplicants ?? null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...payload,
      };
      mockPrograms.unshift(created);
      return { status: "success", data: created };
    }
    return request(`/programs`, {
      method: "POST",
      headers: { ...adminAuthHeaders(authHeader), "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  updateProgram: async (
    slug: string,
    patch: Partial<ApiProgram>,
    authHeader?: AdminAuthArg,
  ): Promise<{ status: string; data: ApiProgram }> => {
    if (USE_MOCK_DATA) {
      const { mockPrograms } = await import("./mockPrograms");
      const idx = mockPrograms.findIndex((p) => p.slug === slug);
      if (idx === -1) throw new ApiError("Program not found", 404);
      if (patch.slug && patch.slug !== slug && mockPrograms.some((p) => p.slug === patch.slug)) {
        throw new ApiError("A program with that slug already exists.", 409);
      }
      const merged = { ...mockPrograms[idx], ...patch, updatedAt: new Date().toISOString() };
      mockPrograms[idx] = merged;
      return { status: "success", data: merged };
    }
    return request(`/programs/${encodeURIComponent(slug)}`, {
      method: "PATCH",
      headers: { ...adminAuthHeaders(authHeader), "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
  },

  // --- Program sponsors ---

  listProgramSponsors: async (
    slug: string,
  ): Promise<{ status: string; data: ApiProgramSponsor[] }> => {
    if (USE_MOCK_DATA) {
      const { mockProgramSponsors } = await import("./mockPrograms");
      return { status: "success", data: mockProgramSponsors[slug] || [] };
    }
    return request(`/programs/${encodeURIComponent(slug)}/sponsors`);
  },

  createProgramSponsor: async (
    slug: string,
    payload: Omit<ApiProgramSponsor, "id" | "programId" | "createdAt" | "updatedAt">,
    authHeader?: AdminAuthArg,
  ): Promise<{ status: string; data: ApiProgramSponsor }> => {
    if (USE_MOCK_DATA) {
      const { mockProgramSponsors } = await import("./mockPrograms");
      const created: ApiProgramSponsor = {
        id: `sponsor-${Date.now()}`,
        programId: slug,
        ...payload,
      };
      mockProgramSponsors[slug] = [...(mockProgramSponsors[slug] || []), created];
      return { status: "success", data: created };
    }
    return request(`/programs/${encodeURIComponent(slug)}/sponsors`, {
      method: "POST",
      headers: { ...adminAuthHeaders(authHeader), "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  updateProgramSponsor: async (
    slug: string,
    sponsorId: string,
    patch: Partial<Omit<ApiProgramSponsor, "id" | "programId" | "createdAt" | "updatedAt">>,
    authHeader?: AdminAuthArg,
  ): Promise<{ status: string; data: ApiProgramSponsor }> => {
    if (USE_MOCK_DATA) {
      const { mockProgramSponsors } = await import("./mockPrograms");
      const list = mockProgramSponsors[slug] || [];
      const idx = list.findIndex((s) => s.id === sponsorId);
      if (idx === -1) throw new ApiError("Sponsor not found", 404);
      const merged = { ...list[idx], ...patch };
      list[idx] = merged;
      return { status: "success", data: merged };
    }
    return request(`/programs/${encodeURIComponent(slug)}/sponsors/${encodeURIComponent(sponsorId)}`, {
      method: "PATCH",
      headers: { ...adminAuthHeaders(authHeader), "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
  },

  deleteProgramSponsor: async (
    slug: string,
    sponsorId: string,
    authHeader?: AdminAuthArg,
  ): Promise<{ status: string }> => {
    if (USE_MOCK_DATA) {
      const { mockProgramSponsors } = await import("./mockPrograms");
      const list = mockProgramSponsors[slug] || [];
      mockProgramSponsors[slug] = list.filter((s) => s.id !== sponsorId);
      return { status: "success" };
    }
    await request(`/programs/${encodeURIComponent(slug)}/sponsors/${encodeURIComponent(sponsorId)}`, {
      method: "DELETE",
      headers: adminAuthHeaders(authHeader),
    });
    return { status: "success" };
  },

  // --- Program projects (public, PII-free aggregate from signups) ---

  listProgramProjects: async (
    slug: string,
  ): Promise<{ status: string; data: ApiProgramProject[]; meta: { count: number } }> => {
    if (USE_MOCK_DATA) {
      const { projectCardsFromMockSignups } = await import("./mockPrograms");
      const data = projectCardsFromMockSignups(slug);
      return { status: "success", data, meta: { count: data.length } };
    }
    return request(`/programs/${encodeURIComponent(slug)}/projects`);
  },

  // --- Program signups (Luma CSV) ---

  listProgramSignups: async (
    slug: string,
    authHeader?: AdminAuthArg,
  ): Promise<{
    status: string;
    data: ApiProgramSignup[];
    meta: { count: number; lastImportedAt: string | null };
  }> => {
    if (USE_MOCK_DATA) {
      const { mockProgramSignups } = await import("./mockPrograms");
      const list = mockProgramSignups[slug] || [];
      const lastImportedAt = list.reduce<string | null>((acc, s) => {
        if (!s.importedInBatchAt) return acc;
        if (!acc || s.importedInBatchAt > acc) return s.importedInBatchAt;
        return acc;
      }, null);
      return { status: "success", data: list, meta: { count: list.length, lastImportedAt } };
    }
    return request(`/programs/${encodeURIComponent(slug)}/signups`, {
      headers: adminAuthHeaders(authHeader),
    });
  },

  importProgramSignups: async (
    slug: string,
    csv: string,
    options: { dryRun: boolean },
    authHeader?: AdminAuthArg,
  ): Promise<{ status: string; data: ProgramSignupImportSummary }> => {
    if (USE_MOCK_DATA) {
      const { mockProgramSignups, importMockSignups } = await import("./mockPrograms");
      const summary = importMockSignups(slug, csv, options.dryRun);
      return {
        status: "success",
        data: {
          dryRun: options.dryRun,
          ...summary,
          inserted: options.dryRun ? [] : mockProgramSignups[slug] || [],
        },
      };
    }
    const qs = options.dryRun ? "?dry_run=true" : "";
    return request(`/programs/${encodeURIComponent(slug)}/signups/import${qs}`, {
      method: "POST",
      headers: { ...adminAuthHeaders(authHeader), "Content-Type": "application/json" },
      body: JSON.stringify({ csv }),
    });
  },

  deleteProgramSignup: async (
    slug: string,
    signupId: string,
    authHeader?: AdminAuthArg,
  ): Promise<{ status: string }> => {
    if (USE_MOCK_DATA) {
      const { mockProgramSignups } = await import("./mockPrograms");
      const list = mockProgramSignups[slug] || [];
      mockProgramSignups[slug] = list.filter((s) => s.id !== signupId);
      return { status: "success" };
    }
    await request(`/programs/${encodeURIComponent(slug)}/signups/${encodeURIComponent(signupId)}`, {
      method: "DELETE",
      headers: adminAuthHeaders(authHeader),
    });
    return { status: "success" };
  },

  /**
   * Phase 2 revamp: admin create project (issue #80).
   */
  createProject: async (
    payload: Partial<ApiProject> & { projectName: string },
    authHeader?: AdminAuthArg,
  ): Promise<{ status: string; data: ApiProject }> => {
    if (USE_MOCK_DATA) {
      const { mockWinningProjects } = await import("./mockWinners");
      const id =
        payload.id ||
        payload.projectName
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, "")
          .replace(/\s+/g, "-")
          .replace(/-+/g, "-")
          .replace(/^-|-$/g, "")
          .slice(0, 100) +
          `-${Date.now()}`;
      const created: ApiProject = {
        description: "",
        ...payload,
        id,
      };
      (mockWinningProjects as ApiProject[]).unshift(created);

      // Persist to localStorage so the project survives a module reload
      const stored = localStorage.getItem("projects");
      const lsProjects: ApiProject[] = stored ? JSON.parse(stored) : [];
      lsProjects.unshift(created);
      localStorage.setItem("projects", JSON.stringify(lsProjects));

      return { status: "success", data: created };
    }
    return request(`/m2-program`, {
      method: "POST",
      headers: { ...adminAuthHeaders(authHeader), "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  /**
   * Phase 1 revamp: program applications (Block D, issues #43–#44).
   */

  /** List projects where the given wallet is a team member. */
  getProjectsByTeamWallet: async (address: string): Promise<{ status: string; data: ApiProject[] }> => {
    if (USE_MOCK_DATA) {
      const { mockWinningProjects } = await import("./mockWinners");
      const matches = mockWinningProjects
        .filter((p) =>
          (p.teamMembers || []).some((m) => m.walletAddress && m.walletAddress === address),
        )
        .sort((a, b) => {
          const ua = a.updatedAt || "";
          const ub = b.updatedAt || "";
          return ub.localeCompare(ua);
        });
      return { status: "success", data: matches as unknown as ApiProject[] };
    }
    return request(`/m2-program/by-team/${encodeURIComponent(address)}`);
  },

  /** List all applications a given project has submitted. */
  getApplicationsForProject: async (
    projectId: string,
  ): Promise<{ status: string; data: ApiProgramApplication[] }> => {
    if (USE_MOCK_DATA) {
      const { mockProgramApplications } = await import("./mockProgramApplications");
      return {
        status: "success",
        data: mockProgramApplications.filter((a) => a.projectId === projectId),
      };
    }
    return request(`/m2-program/${encodeURIComponent(projectId)}/applications`);
  },

  /** Admin-only: list all applications for a program. */
  listProgramApplications: async (
    slug: string,
    authHeader?: AdminAuthArg,
  ): Promise<{ status: string; data: ApiProgramApplication[] }> => {
    if (USE_MOCK_DATA) {
      const { mockProgramApplications } = await import("./mockProgramApplications");
      const { mockPrograms } = await import("./mockPrograms");
      const program = mockPrograms.find((p) => p.slug === slug);
      if (!program) return { status: "success", data: [] };
      return {
        status: "success",
        data: mockProgramApplications.filter((a) => a.programId === program.id),
      };
    }
    return request(`/programs/${encodeURIComponent(slug)}/applications`, {
      headers: { ...adminAuthHeaders(authHeader), "Content-Type": "application/json" },
    });
  },

  updateApplicationStatus: async (
    slug: string,
    applicationId: string,
    patch: { status: ApiProgramApplication["status"]; reviewNotes?: string | null },
    authHeader?: AdminAuthArg,
  ): Promise<{ status: string; data: ApiProgramApplication }> => {
    if (USE_MOCK_DATA) {
      const { mockProgramApplications } = await import("./mockProgramApplications");
      const idx = mockProgramApplications.findIndex((a) => a.id === applicationId);
      if (idx === -1) throw new ApiError("Application not found", 404);
      const updated: ApiProgramApplication = {
        ...mockProgramApplications[idx],
        status: patch.status,
        reviewedBy: "mock-admin",
        reviewedAt: new Date().toISOString(),
        reviewNotes: patch.reviewNotes ?? null,
      };
      mockProgramApplications[idx] = updated;
      return { status: "success", data: updated };
    }
    return request(`/programs/${encodeURIComponent(slug)}/applications/${encodeURIComponent(applicationId)}`, {
      method: "PATCH",
      headers: { ...adminAuthHeaders(authHeader), "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
  },

  /**
   * Phase 2 revamp: wallet contacts / notification preferences (#71).
   */
  getWalletContact: async (
    address: string,
    chain: 'substrate' | 'ethereum' | 'solana' = 'substrate',
  ): Promise<{ email_set: boolean; notifications_enabled: boolean }> => {
    if (USE_MOCK_DATA) {
      const { mockWalletContacts } = await import("./mockWalletContacts");
      const entry = mockWalletContacts[address];
      return { email_set: !!entry?.email, notifications_enabled: entry?.notificationsEnabled ?? true };
    }
    const res = await request(
      `/wallet-contacts/${encodeURIComponent(address)}?chain=${encodeURIComponent(chain)}`,
    );
    return res.data;
  },

  updateWalletContact: async (
    address: string,
    payload: { email?: string | null; notificationsEnabled?: boolean },
    authHeader?: AdminAuthArg,
  ): Promise<{ email_set: boolean; notifications_enabled: boolean }> => {
    if (USE_MOCK_DATA) {
      const { mockWalletContacts } = await import("./mockWalletContacts");
      const existing = mockWalletContacts[address];
      mockWalletContacts[address] = {
        email: payload.email !== undefined ? payload.email : (existing?.email ?? null),
        notificationsEnabled: payload.notificationsEnabled !== undefined ? payload.notificationsEnabled : (existing?.notificationsEnabled ?? true),
      };
      const updated = mockWalletContacts[address];
      return { email_set: !!updated.email, notifications_enabled: updated.notificationsEnabled };
    }
    const res = await request(`/wallet-contacts/${encodeURIComponent(address)}`, {
      method: "PUT",
      headers: { ...adminAuthHeaders(authHeader), "Content-Type": "application/json" },
      body: JSON.stringify({ email: payload.email, notifications_enabled: payload.notificationsEnabled }),
    });
    return res.data;
  },

  applyToProgram: async (
    slug: string,
    payload: { project_id: string; application_fields: Record<string, unknown> },
    authHeader?: AdminAuthArg,
  ): Promise<{ status: string; data: ApiProgramApplication }> => {
    if (USE_MOCK_DATA) {
      const { mockProgramApplications } = await import("./mockProgramApplications");
      const { mockPrograms } = await import("./mockPrograms");
      const program = mockPrograms.find((p) => p.slug === slug);
      if (!program) throw new ApiError("Program not found", 404);
      if (
        mockProgramApplications.some(
          (a) => a.programId === program.id && a.projectId === payload.project_id,
        )
      ) {
        throw new ApiError("This project has already applied to this program.", 409);
      }
      const created: ApiProgramApplication = {
        id: `app-mock-${Date.now()}`,
        programId: program.id,
        projectId: payload.project_id,
        status: "submitted",
        applicationFields: payload.application_fields,
        submittedBy: "mock-wallet",
        submittedAt: new Date().toISOString(),
        reviewedBy: null,
        reviewedAt: null,
        reviewNotes: null,
      };
      mockProgramApplications.unshift(created);
      return { status: "success", data: created };
    }
    return request(`/programs/${encodeURIComponent(slug)}/applications`, {
      method: "POST",
      headers: { ...adminAuthHeaders(authHeader), "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  /**
   * Public: someone without a Stadium project applies to a program. Emails the
   * team (info@ + cc sacha@); no auth. `company` is a honeypot — leave empty.
   */
  submitNonMemberApplication: async (
    slug: string,
    payload: { name: string; email: string; walletAddress?: string; pitch: string; company?: string },
  ): Promise<{ status: string }> => {
    if (USE_MOCK_DATA) {
      return { status: "success" };
    }
    return request(`/programs/${encodeURIComponent(slug)}/applications/non-member`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  /**
   * Per-event admins (Phase 3 #95). Read is gated on requireProgramAdmin
   * (global admins and per-program admins can list). Add/remove are gated
   * on requireAdmin (global admins only).
   */
  listProgramAdmins: async (
    slug: string,
    authHeader: string,
  ): Promise<{ status: string; data: ApiProgramAdmin[] }> => {
    if (USE_MOCK_DATA) {
      return { status: "success", data: [] };
    }
    return request(`/programs/${encodeURIComponent(slug)}/admins`, {
      headers: adminAuthHeaders(authHeader),
    });
  },

  addProgramAdmin: async (
    slug: string,
    payload: { wallet: string; walletChain: ApiProgramAdmin["walletChain"] },
    authHeader: string,
  ): Promise<{ status: string; data: ApiProgramAdmin }> => {
    if (USE_MOCK_DATA) {
      const created: ApiProgramAdmin = {
        programId: slug,
        walletChain: payload.walletChain,
        wallet: payload.wallet,
        createdAt: new Date().toISOString(),
      };
      return { status: "success", data: created };
    }
    return request(`/programs/${encodeURIComponent(slug)}/admins`, {
      method: "POST",
      headers: { ...adminAuthHeaders(authHeader), "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  removeProgramAdmin: async (
    slug: string,
    wallet: string,
    walletChain: ApiProgramAdmin["walletChain"],
    authHeader: string,
  ): Promise<void> => {
    if (USE_MOCK_DATA) return;
    await request(
      `/programs/${encodeURIComponent(slug)}/admins/${encodeURIComponent(wallet)}?chain=${encodeURIComponent(walletChain)}`,
      {
        method: "DELETE",
        headers: adminAuthHeaders(authHeader),
      },
    );
  },

  // --- Email-keyed program admins (social sign-in onboarding) ---

  listProgramAdminEmails: async (
    slug: string,
    authHeader: AdminAuthArg,
  ): Promise<{ status: string; data: ApiProgramAdminEmail[] }> => {
    if (USE_MOCK_DATA) {
      return { status: "success", data: [] };
    }
    return request(`/programs/${encodeURIComponent(slug)}/admins/emails`, {
      headers: adminAuthHeaders(authHeader),
    });
  },

  inviteProgramAdminEmail: async (
    slug: string,
    email: string,
    authHeader: AdminAuthArg,
    role: "admin" | "judge" = "admin",
  ): Promise<{ status: string; data: ApiProgramAdminEmail; emailSent: boolean; emailReason: string | null }> => {
    if (USE_MOCK_DATA) {
      return {
        status: "success",
        data: { programId: slug, email: email.trim().toLowerCase(), role, invitedBy: null, createdAt: new Date().toISOString() },
        emailSent: false,
        emailReason: "mock_mode",
      };
    }
    return request(`/programs/${encodeURIComponent(slug)}/admins/invite`, {
      method: "POST",
      headers: { ...adminAuthHeaders(authHeader), "Content-Type": "application/json" },
      body: JSON.stringify({ email, role }),
    });
  },

  removeProgramAdminEmail: async (
    slug: string,
    email: string,
    authHeader: AdminAuthArg,
  ): Promise<void> => {
    if (USE_MOCK_DATA) return;
    await request(
      `/programs/${encodeURIComponent(slug)}/admins/emails/${encodeURIComponent(email)}`,
      {
        method: "DELETE",
        headers: adminAuthHeaders(authHeader),
      },
    );
  },

  // --- Project submissions + judge scoring (Bitrefill) ---

  /** Public: submit a project to a program. No auth. */
  submitProjectSubmission: async (
    slug: string,
    payload: {
      submitterName: string;
      lumaEmail: string;
      projectTitle: string;
      projectBrief: string;
      videoUrl: string;
      githubUrl: string;
      company?: string;
    },
  ): Promise<{ status: string; data?: { id: string } }> => {
    if (USE_MOCK_DATA) {
      const { mockJudging } = await import("./mockJudging");
      const sub = mockJudging.addSubmission(payload);
      return { status: "success", data: { id: sub.id } };
    }
    return request(`/programs/${encodeURIComponent(slug)}/submissions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  /** Judge/admin: list submissions with eligibility flag + this judge's scores. */
  listSubmissions: async (
    slug: string,
    authHeader: AdminAuthArg,
  ): Promise<{ status: string; data: ApiJudgeView }> => {
    if (USE_MOCK_DATA) {
      const { mockJudging } = await import("./mockJudging");
      return { status: "success", data: mockJudging.judgeView() };
    }
    return request(`/programs/${encodeURIComponent(slug)}/submissions`, {
      headers: adminAuthHeaders(authHeader),
    });
  },

  /** Judge/admin: save (upsert) this judge's score for one submission. */
  upsertScore: async (
    slug: string,
    submissionId: string,
    payload: { requirements: number; techStack: number; innovation: number; notes?: string },
    authHeader: AdminAuthArg,
  ): Promise<{ status: string; data: ApiScore }> => {
    if (USE_MOCK_DATA) {
      const { mockJudging } = await import("./mockJudging");
      return { status: "success", data: mockJudging.saveScore(submissionId, payload) };
    }
    return request(
      `/programs/${encodeURIComponent(slug)}/submissions/${encodeURIComponent(submissionId)}/score`,
      {
        method: "PUT",
        headers: { ...adminAuthHeaders(authHeader), "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
  },

  /** Judge/admin: claim a batch of 10 to score. No batchNumber → "claim next 10"
   *  (server picks the least-covered batch). Returns the refreshed judge view. */
  claimBatch: async (
    slug: string,
    batchNumber: number | undefined,
    authHeader: AdminAuthArg,
  ): Promise<{ status: string; data: ApiJudgeView; meta?: { claimed: number | null; nothingToClaim: boolean } }> => {
    if (USE_MOCK_DATA) {
      const { mockJudging } = await import("./mockJudging");
      return { status: "success", ...mockJudging.claimBatch(batchNumber) };
    }
    return request(`/programs/${encodeURIComponent(slug)}/scoring/claim-batch`, {
      method: "POST",
      headers: { ...adminAuthHeaders(authHeader), "Content-Type": "application/json" },
      body: JSON.stringify(batchNumber ? { batchNumber } : {}),
    });
  },

  /** Judge/admin: bulk-save a batch of scores at once. */
  saveScores: async (
    slug: string,
    scores: Array<{ submissionId: string; requirements: number; techStack: number; innovation: number; notes?: string }>,
    authHeader: AdminAuthArg,
  ): Promise<{ status: string; data: ApiScore[] }> => {
    if (USE_MOCK_DATA) {
      const { mockJudging } = await import("./mockJudging");
      return { status: "success", data: mockJudging.saveScores(scores) };
    }
    return request(`/programs/${encodeURIComponent(slug)}/scoring/scores`, {
      method: "PUT",
      headers: { ...adminAuthHeaders(authHeader), "Content-Type": "application/json" },
      body: JSON.stringify({ scores }),
    });
  },

  /** Judge/admin: finalize the ballot (requires every submission scored). */
  submitBallot: async (
    slug: string,
    authHeader: AdminAuthArg,
  ): Promise<{ status: string; data: { status: "submitted" } }> => {
    if (USE_MOCK_DATA) {
      const { mockJudging } = await import("./mockJudging");
      const r = mockJudging.submitBallot();
      if (!r.ok) {
        throw new ApiError(
          `Score every submission before submitting (${r.missing} of ${r.total} still unscored).`,
          409,
        );
      }
      return { status: "success", data: { status: "submitted" } };
    }
    return request(`/programs/${encodeURIComponent(slug)}/scoring/submit`, {
      method: "POST",
      headers: adminAuthHeaders(authHeader),
    });
  },

  /** Admin: promote a submission into a Stadium project (payout + team tracking). */
  promoteSubmission: async (
    slug: string,
    submissionId: string,
    authHeader: AdminAuthArg,
  ): Promise<{ status: string; data: { projectId: string; alreadyPromoted?: boolean } }> => {
    if (USE_MOCK_DATA) {
      const { mockJudging } = await import("./mockJudging");
      return { status: "success", data: mockJudging.promote(submissionId) };
    }
    return request(
      `/programs/${encodeURIComponent(slug)}/submissions/${encodeURIComponent(submissionId)}/promote`,
      { method: "POST", headers: adminAuthHeaders(authHeader) },
    );
  },

  /** Admin: mark a submission paid / not paid (payout tracking). */
  setSubmissionPaid: async (
    slug: string,
    submissionId: string,
    paid: boolean,
    authHeader: AdminAuthArg,
  ): Promise<{ status: string; data: ApiSubmission }> => {
    if (USE_MOCK_DATA) {
      const { mockJudging } = await import("./mockJudging");
      return { status: "success", data: mockJudging.setPaid(submissionId, paid) };
    }
    return request(
      `/programs/${encodeURIComponent(slug)}/submissions/${encodeURIComponent(submissionId)}/paid`,
      {
        method: "PATCH",
        headers: { ...adminAuthHeaders(authHeader), "Content-Type": "application/json" },
        body: JSON.stringify({ paid }),
      },
    );
  },

  /** Judge/admin: at-a-glance counts for the program header (no PII). */
  getProgramStats: async (
    slug: string,
    authHeader: AdminAuthArg,
  ): Promise<{ status: string; data: ApiProgramStats }> => {
    if (USE_MOCK_DATA) {
      const { mockJudging } = await import("./mockJudging");
      return { status: "success", data: mockJudging.stats() };
    }
    return request(`/programs/${encodeURIComponent(slug)}/stats`, {
      headers: adminAuthHeaders(authHeader),
    });
  },

  /** Judge/admin: gated leaderboard (locked until all registered judges submit). */
  getLeaderboard: async (
    slug: string,
    authHeader: AdminAuthArg,
  ): Promise<{ status: string; data: ApiLeaderboard }> => {
    if (USE_MOCK_DATA) {
      const { mockJudging } = await import("./mockJudging");
      return { status: "success", data: mockJudging.leaderboard() };
    }
    return request(`/programs/${encodeURIComponent(slug)}/scoring/leaderboard`, {
      headers: adminAuthHeaders(authHeader),
    });
  },

  /**
   * Platform admin: elect a winner by assigning a prize tier, or clear it
   * (pass null). Only allowed once judging is complete; global admins only.
   */
  awardPrize: async (
    slug: string,
    submissionId: string,
    prize: ApiPrizeTier | null,
    authHeader: AdminAuthArg,
  ): Promise<{ status: string; data: ApiSubmission }> => {
    if (USE_MOCK_DATA) {
      const { mockJudging } = await import("./mockJudging");
      return { status: "success", data: mockJudging.awardPrize(submissionId, prize) };
    }
    return request(
      `/programs/${encodeURIComponent(slug)}/submissions/${encodeURIComponent(submissionId)}/prize`,
      {
        method: "PATCH",
        headers: { ...adminAuthHeaders(authHeader), "Content-Type": "application/json" },
        body: JSON.stringify(prize ? { amount: prize.amount } : { prize: null }),
      },
    );
  },

  /** Platform admin: publish / unpublish the public results. Global admins only. */
  publishResults: async (
    slug: string,
    publish: boolean,
    authHeader: AdminAuthArg,
  ): Promise<{ status: string; data: { resultsPublishedAt: string | null } }> => {
    if (USE_MOCK_DATA) {
      const { mockJudging } = await import("./mockJudging");
      return { status: "success", data: { resultsPublishedAt: mockJudging.setResultsPublished(publish) } };
    }
    const action = publish ? "publish" : "unpublish";
    return request(`/programs/${encodeURIComponent(slug)}/results/${action}`, {
      method: "POST",
      headers: adminAuthHeaders(authHeader),
    });
  },

  /** Public: PII-free submissions + winners, only once results are published. */
  getProgramResults: async (slug: string): Promise<{ status: string; data: ApiPublicResults }> => {
    if (USE_MOCK_DATA) {
      const { mockJudging } = await import("./mockJudging");
      return { status: "success", data: mockJudging.publicResults() };
    }
    return request(`/programs/${encodeURIComponent(slug)}/results`);
  },

  // --- Admin tiers (app_admins / global_admins) ---

  /**
   * Self-check: is the connected wallet an app_admin? Cheap probe used to
   * decide whether to show the /admin/app-admins nav entry.
   */
  getMyAdminTier: async (
    authHeader: AdminAuthArg,
  ): Promise<{ status: string; data: { isAppAdmin: boolean; chain: string; address: string } }> => {
    return request(`/admin/me/tier`, { headers: adminAuthHeaders(authHeader) });
  },

  listAppAdmins: async (
    authHeader: AdminAuthArg,
  ): Promise<{ status: string; data: ApiAdminTierEntry[] }> => {
    return request(`/admin/app-admins`, { headers: adminAuthHeaders(authHeader) });
  },

  addAppAdmin: async (
    payload: Pick<ApiAdminTierEntry, "walletChain" | "wallet" | "label">,
    authHeader: AdminAuthArg,
  ): Promise<{ status: string; data: ApiAdminTierEntry }> => {
    return request(`/admin/app-admins`, {
      method: "POST",
      headers: { ...adminAuthHeaders(authHeader), "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  removeAppAdmin: async (
    wallet: string,
    walletChain: ApiAdminTierEntry["walletChain"],
    authHeader: AdminAuthArg,
  ): Promise<void> => {
    await request(
      `/admin/app-admins/${encodeURIComponent(wallet)}?chain=${encodeURIComponent(walletChain)}`,
      { method: "DELETE", headers: adminAuthHeaders(authHeader) },
    );
  },

  listGlobalAdmins: async (
    authHeader: AdminAuthArg,
  ): Promise<{ status: string; data: ApiAdminTierEntry[] }> => {
    return request(`/admin/global-admins`, { headers: adminAuthHeaders(authHeader) });
  },

  addGlobalAdmin: async (
    payload: Pick<ApiAdminTierEntry, "walletChain" | "wallet" | "label">,
    authHeader: AdminAuthArg,
  ): Promise<{ status: string; data: ApiAdminTierEntry }> => {
    return request(`/admin/global-admins`, {
      method: "POST",
      headers: { ...adminAuthHeaders(authHeader), "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  removeGlobalAdmin: async (
    wallet: string,
    walletChain: ApiAdminTierEntry["walletChain"],
    authHeader: AdminAuthArg,
  ): Promise<void> => {
    await request(
      `/admin/global-admins/${encodeURIComponent(wallet)}?chain=${encodeURIComponent(walletChain)}`,
      { method: "DELETE", headers: adminAuthHeaders(authHeader) },
    );
  },

  // --- Program inbox (merged signups + applications, #112) ---

  listProgramInbox: async (
    slug: string,
    authHeader: AdminAuthArg,
  ): Promise<{
    status: string;
    data: ApiInboxEntry[];
    meta: { total: number; signups: number; applications: number };
  }> => {
    if (USE_MOCK_DATA) {
      return { status: "success", data: [], meta: { total: 0, signups: 0, applications: 0 } };
    }
    return request(`/programs/${encodeURIComponent(slug)}/inbox`, {
      headers: adminAuthHeaders(authHeader),
    });
  },

  exportProgramInboxCsv: async (
    slug: string,
    authHeader: AdminAuthArg,
  ): Promise<Blob> => {
    if (USE_MOCK_DATA) {
      return new Blob(["source,when,name,email\n"], { type: "text/csv" });
    }
    const url = `${API_BASE_URL}/programs/${encodeURIComponent(slug)}/inbox.csv`;
    const response = await fetch(url, { headers: adminAuthHeaders(authHeader) });
    if (!response.ok) {
      let message = mapStatusToMessage(response.status);
      try {
        const body = await response.json();
        if (body && typeof body.message === "string" && body.message.trim()) {
          message = body.error ? `${body.message}: ${body.error}` : body.message;
        }
      } catch {
        // non-JSON error body — keep status-based message
      }
      throw new ApiError(message, response.status);
    }
    return response.blob();
  },

  // --- Program audit log ---

  listProgramAuditLog: async (
    slug: string,
    authHeader: AdminAuthArg,
    options: { limit?: number } = {},
  ): Promise<{ status: string; data: ApiAuditLogEntry[] }> => {
    const qs = options.limit ? `?limit=${encodeURIComponent(String(options.limit))}` : "";
    return request(`/programs/${encodeURIComponent(slug)}/audit-log${qs}`, {
      headers: adminAuthHeaders(authHeader),
    });
  },

  // --- Project continuations ('What's next, milestone 3?', #114) ---

  listProjectContinuations: async (
    projectId: string,
    authHeader: AdminAuthArg,
  ): Promise<{ status: string; data: ApiProjectContinuation[] }> => {
    if (USE_MOCK_DATA) {
      return { status: "success", data: [] };
    }
    return request(`/m2-program/${encodeURIComponent(projectId)}/continuations`, {
      headers: adminAuthHeaders(authHeader),
    });
  },

  createProjectContinuation: async (
    projectId: string,
    payload: {
      currentStatus: string;
      wantSupport: boolean;
      supportFor: string | null;
      nextStepUrl: string | null;
    },
    authHeader: AdminAuthArg,
  ): Promise<{ status: string; data: ApiProjectContinuation }> => {
    if (USE_MOCK_DATA) {
      const now = new Date().toISOString();
      return {
        status: "success",
        data: {
          id: `mock-${Date.now()}`,
          projectId,
          currentStatus: payload.currentStatus,
          wantSupport: payload.wantSupport,
          supportFor: payload.supportFor,
          nextStepUrl: payload.nextStepUrl,
          submittedBy: "mock-wallet",
          submittedByChain: "substrate",
          createdAt: now,
        },
      };
    }
    return request(`/m2-program/${encodeURIComponent(projectId)}/continuations`, {
      method: "POST",
      headers: { ...adminAuthHeaders(authHeader), "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },
};

export { ApiError };
