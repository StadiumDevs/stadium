const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:2000/api";

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

  getProjects: (params?: GetProjectsParams) => {
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

  getProject: (id: string) => request(`/projects/${id}`),

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
};

export { ApiError };
