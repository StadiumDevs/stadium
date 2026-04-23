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

/** Shape of a row in the `programs` table (Phase 1 revamp). */
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
  createdAt?: string;
  updatedAt?: string;
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
      headers: { "x-siws-auth": authHeader },
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
      headers: { "x-siws-auth": authHeader, "Content-Type": "application/json" },
      body: JSON.stringify({ categories }),
    });
  },

  submitForReview: async (projectId: string, submission: {
    repoUrl: string;
    demoUrl: string;
    docsUrl: string;
    summary: string;
  }, authHeader?: string) => {
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
      headers: authHeader ? { "x-siws-auth": authHeader, "Content-Type": "application/json" } : { "Content-Type": "application/json" },
      body: JSON.stringify(submission)
    });
  },

  updateTeam: async (projectId: string, data: {
    teamMembers: Array<{ 
      name: string; 
      walletAddress?: string;
      role?: string;
      twitter?: string;
      github?: string;
      linkedin?: string;
      customUrl?: string;
    }>;
    donationAddress?: string;
  }, authHeader?: string) => {
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
      headers: authHeader ? { "x-siws-auth": authHeader, "Content-Type": "application/json" } : { "Content-Type": "application/json" },
      body: JSON.stringify({ teamMembers: data.teamMembers })
    });

    // If there's a donation address, update it separately
    if (data.donationAddress) {
      await request(`/m2-program/${projectId}/payout-address`, {
        method: 'PATCH',
        headers: authHeader ? { "x-siws-auth": authHeader, "Content-Type": "application/json" } : { "Content-Type": "application/json" },
        body: JSON.stringify({ donationAddress: data.donationAddress })
      });
    }

    return teamResult;
  },

  webzeroApprove: async (projectId: string, authHeader?: string) =>
    request(`/m2-program/${projectId}/approve`, {
      method: "POST",
      headers: authHeader ? { "x-siws-auth": authHeader, "Content-Type": "application/json" } : { "Content-Type": "application/json" },
      body: JSON.stringify({
        m2Status: 'completed',
        webzeroApproved: true,
        webzeroApprovalDate: new Date().toISOString(),
      }),
    }),

  requestChanges: async (projectId: string, feedback: string, authHeader?: string) =>
    request(`/m2-program/${projectId}/request-changes`, {
      method: "POST",
      headers: authHeader ? { "x-siws-auth": authHeader, "Content-Type": "application/json" } : { "Content-Type": "application/json" },
      body: JSON.stringify({
        feedback,
        requestedChangesDate: new Date().toISOString(),
      }),
    }),

  submitM2Agreement: async (projectId: string, agreement: {
    mentorName: string;
    agreedDate: string;
    agreedFeatures: string[];
    documentation?: string[];
    successCriteria?: string;
  }, authHeader?: string) => {
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
      headers: authHeader ? { "x-siws-auth": authHeader, "Content-Type": "application/json" } : { "Content-Type": "application/json" },
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
    authHeader?: string
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
      headers: authHeader ? { "x-siws-auth": authHeader, "Content-Type": "application/json" } : { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
  },

  updateProjectStatus: async (projectId: string, status: 'building' | 'under_review' | 'completed', authHeader?: string) => {
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
      headers: authHeader ? { "x-siws-auth": authHeader, "Content-Type": "application/json" } : { "Content-Type": "application/json" },
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
    authHeader?: string
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
      headers: authHeader ? { "x-siws-auth": authHeader, "Content-Type": "application/json" } : { "Content-Type": "application/json" },
      body: JSON.stringify({ teamMembers })
    });
  },

  updatePayoutAddress: async (
    projectId: string,
    donationAddress: string,
    authHeader?: string
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
      headers: authHeader ? { "x-siws-auth": authHeader, "Content-Type": "application/json" } : { "Content-Type": "application/json" },
      body: JSON.stringify({ donationAddress })
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
    },
    authHeader?: string
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
      headers: authHeader ? { "x-siws-auth": authHeader, "Content-Type": "application/json" } : { "Content-Type": "application/json" },
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
    authHeader?: string
  ) => {
    if (USE_MOCK_DATA) {
      await new Promise(resolve => setTimeout(resolve, 500));
      return { success: true };
    }
    
    // Real API call
    return request(`/m2-program/${projectId}/confirm-payment`, {
      method: 'POST',
      headers: authHeader ? { "x-siws-auth": authHeader, "Content-Type": "application/json" } : { "Content-Type": "application/json" },
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
    authHeader?: string,
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
      headers: authHeader
        ? { "x-siws-auth": authHeader, "Content-Type": "application/json" }
        : { "Content-Type": "application/json" },
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
    authHeader?: string,
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
      headers: authHeader
        ? { "x-siws-auth": authHeader, "Content-Type": "application/json" }
        : { "Content-Type": "application/json" },
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
    authHeader?: string,
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
      headers: authHeader ? { "x-siws-auth": authHeader, "Content-Type": "application/json" } : undefined,
    });
  },

  applyToProgram: async (
    slug: string,
    payload: { project_id: string; application_fields: Record<string, unknown> },
    authHeader?: string,
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
      headers: authHeader
        ? { "x-siws-auth": authHeader, "Content-Type": "application/json" }
        : { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },
};

export { ApiError };
