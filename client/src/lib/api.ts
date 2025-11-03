const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:2000/api";

// TEMPORARY: Mock mode flag - set to true when server is down
const USE_MOCK_DATA = true; // Set to false when server is back up

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

  // Ensure we never drop the default Content-Type when custom headers are provided
  const config: RequestInit = { ...options };
  const defaultHeaders: Record<string, string> = { "Content-Type": "application/json" };
  const optionHeaders = (options.headers || {}) as Record<string, string>;
  config.headers = { ...defaultHeaders, ...optionHeaders };

  const response = await fetch(url, config);

  if (!response.ok) {
    const friendly = mapStatusToMessage(response.status);
    throw new ApiError(friendly, response.status);
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
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

export const api = {
  submitEntry: (data: unknown) =>
    request("/entry", {
      method: "POST",
      body: JSON.stringify(data),
    }),

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
      
      console.log("🔧 Using mock data (server is down)");
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
    if (params?.sortBy) searchParams.set("sortBy", params.sortBy);
    if (params?.sortOrder) searchParams.set("sortOrder", params.sortOrder);

    const queryString = searchParams.toString();
    return request(`/projects${queryString ? `?${queryString}` : ""}`);
  },

  getProject: async (id: string) => {
    // TEMPORARY: Return mock data when server is down
    if (USE_MOCK_DATA) {
      const { mockWinningProjects } = await import("./mockWinners");
      const mockProject = mockWinningProjects.find((p) => p.id === id);
      
      if (mockProject) {
        console.log("🔧 Using mock data for project:", id);
        return Promise.resolve({
          status: "success",
          data: mockProject
        });
      }
      
      // If project not found in mock data, return 404-like response
      throw new ApiError("Project not found", 404);
    }
    
    return request(`/projects/${id}`);
  },

  updateProjectTeam: (projectId: string, teamMembers: Array<{ name: string; walletAddress?: string; customUrl?: string }>, authHeader: string) =>
    request(`/projects/${projectId}/team`, {
      method: "POST",
      headers: { "x-siws-auth": authHeader },
      body: JSON.stringify({ teamMembers }),
    }),

  updateProjectCategories: (projectId: string, categories: string[], authHeader: string) =>
    request(`/projects/${projectId}`, {
      method: "PATCH",
      headers: { "x-siws-auth": authHeader, "Content-Type": "application/json" },
      body: JSON.stringify({ categories }),
    }),

  submitForReview: async (projectId: string, submission: {
    repoUrl: string;
    demoUrl: string;
    docsUrl: string;
    summary: string;
  }, authHeader?: string) => {
    if (USE_MOCK_DATA) {
      console.log('Mock: Submitting M2 for project', projectId, submission);
      
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
    
    // Real API call
    return request(`/projects/${projectId}/submit-review`, {
      method: 'POST',
      headers: authHeader ? { "x-siws-auth": authHeader, "Content-Type": "application/json" } : { "Content-Type": "application/json" },
      body: JSON.stringify(submission)
    });
  },

  updateTeam: async (projectId: string, data: {
    members: Array<{ 
      name: string; 
      wallet: string;
      role?: string;
      twitter?: string;
      github?: string;
      linkedin?: string;
    }>;
    payoutAddress: string;
  }, authHeader?: string) => {
    if (USE_MOCK_DATA) {
      console.log('Mock: Updating team for project', projectId, data);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Update project in localStorage
      const stored = localStorage.getItem('projects');
      if (stored) {
        const projects = JSON.parse(stored);
        const index = projects.findIndex((p: any) => p.id === projectId);
        if (index !== -1) {
          projects[index].teamMembers = data.members.map(m => ({
            name: m.name.trim(),
            walletAddress: m.wallet.trim() || undefined,
            role: m.role?.trim() || undefined,
            twitter: m.twitter?.trim() || undefined,
            github: m.github?.trim() || undefined,
            linkedin: m.linkedin?.trim() || undefined,
          }));
          projects[index].donationAddress = data.payoutAddress.trim();
          localStorage.setItem('projects', JSON.stringify(projects));
        }
      }
      
      // Also try to get from mock data and update in-memory
      const { mockWinningProjects } = await import("./mockWinners");
      const mockProject = mockWinningProjects.find((p) => p.id === projectId);
      if (mockProject) {
        (mockProject as any).teamMembers = data.members.map(m => ({
          name: m.name.trim(),
          walletAddress: m.wallet.trim() || undefined,
          role: m.role?.trim() || undefined,
          twitter: m.twitter?.trim() || undefined,
          github: m.github?.trim() || undefined,
          linkedin: m.linkedin?.trim() || undefined,
        }));
        (mockProject as any).donationAddress = data.payoutAddress.trim();
      }
      
      return { success: true };
    }
    
    // Real API call
    return request(`/projects/${projectId}/team`, {
      method: 'PUT',
      headers: authHeader ? { "x-siws-auth": authHeader, "Content-Type": "application/json" } : { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
  },

  webzeroApprove: async (projectId: string, authHeader?: string) =>
    request(`/projects/${projectId}/approve`, {
      method: "POST",
      headers: authHeader ? { "x-siws-auth": authHeader, "Content-Type": "application/json" } : { "Content-Type": "application/json" },
      body: JSON.stringify({
        m2Status: 'completed',
        webzeroApproved: true,
        webzeroApprovalDate: new Date().toISOString(),
      }),
    }),

  requestChanges: async (projectId: string, feedback: string, authHeader?: string) =>
    request(`/projects/${projectId}/request-changes`, {
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
      console.log('Mock: Submitting M2 Agreement for project', projectId, agreement);
      
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
    return request(`/projects/${projectId}/m2-agreement`, {
      method: 'POST',
      headers: authHeader ? { "x-siws-auth": authHeader, "Content-Type": "application/json" } : { "Content-Type": "application/json" },
      body: JSON.stringify(agreement)
    });
  },

  updateProjectStatus: async (projectId: string, status: 'building' | 'under_review' | 'completed', authHeader?: string) => {
    if (USE_MOCK_DATA) {
      console.log(`Mock: Updating project ${projectId} status to ${status}`)
      
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
    return request(`/projects/${projectId}`, {
      method: "PATCH",
      headers: authHeader ? { "x-siws-auth": authHeader, "Content-Type": "application/json" } : { "Content-Type": "application/json" },
      body: JSON.stringify({
        m2Status: status,
      }),
    })
  },
};

export { ApiError };
