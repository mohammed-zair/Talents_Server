import axios from "axios";
import toast from "react-hot-toast";
import type {
  AIAnalysis,
  ApplicationItem,
  CompanyDashboardData,
  CompanyProfile,
  CVRequest,
  JobPosting,
} from "../../types";
import { clearToken } from "../auth";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000/api";

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

const authClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const originalRequest = error?.config;
    const url = String(originalRequest?.url || "");
    const isAuthRequest =
      url.includes("/companies/login") ||
      url.includes("/companies/register") ||
      url.includes("/companies/set-password") ||
      url.includes("/companies/track") ||
      url.includes("/companies/refresh") ||
      url.includes("/companies/logout") ||
      url.includes("/auth/forgot-password") ||
      url.includes("/auth/reset-password");

    if (isAuthRequest) {
      return Promise.reject(error);
    }

    if (status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        await authClient.post("/companies/refresh");
        return api(originalRequest);
      } catch (refreshError) {
        clearToken();
      }
    }
    if (status === 401) {
      toast.error("Session expired. Please log in again.");
      if (typeof window !== "undefined") {
        const base = import.meta.env.BASE_URL || "/";
        const normalized = base.endsWith("/") ? base : `${base}/`;
        window.location.href = `${normalized}login`;
      }
    }
    return Promise.reject(error);
  }
);

export const companyApi = {
  getSession: async () => {
    const { data } = await api.get("/companies/session");
    return data;
  },
  getDashboard: async () => {
    const { data } = await api.get<CompanyDashboardData>("/companies/company/dashboard");
    return (data as any)?.data ?? data;
  },
  getJobPostings: async () => {
    const { data } = await api.get("/companies/company/job-postings");
    const normalized =
      Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
    return (normalized as any[]).map((job) => ({
      id: String(job.job_id ?? job.id ?? ""),
      title: job.title ?? "",
      location: job.location ?? "",
      department: job.department ?? "",
      industry: job.industry ?? "",
      description: job.description ?? "",
      requirements: job.requirements ?? "",
      status: job.status ?? "open",
      applicants: Array.isArray(job.Applications)
        ? job.Applications.length
        : job.applicants ?? 0,
      createdAt: job.created_at ?? job.createdAt ?? "",
    })) as JobPosting[];
  },
  createJobPosting: async (payload: FormData) => {
    const { data } = await api.post<JobPosting>("/companies/company/job-postings", payload);
    return data;
  },
  getApplications: async (filters?: {
    search?: string;
    ats_min?: number;
    ats_max?: number;
    experience_min?: number;
    experience_max?: number;
    skills?: string[];
    education?: string;
    location?: string;
    strengths?: string[];
    weaknesses?: string[];
    starred?: boolean;
    job_id?: string;
  }) => {
    const params: Record<string, string> = {};
    if (filters?.search) params.search = filters.search;
    if (typeof filters?.ats_min === "number") params.ats_min = String(filters.ats_min);
    if (typeof filters?.ats_max === "number") params.ats_max = String(filters.ats_max);
    if (typeof filters?.experience_min === "number")
      params.experience_min = String(filters.experience_min);
    if (typeof filters?.experience_max === "number")
      params.experience_max = String(filters.experience_max);
    if (filters?.skills?.length) params.skills = filters.skills.join(",");
    if (filters?.education) params.education = filters.education;
    if (filters?.location) params.location = filters.location;
    if (filters?.strengths?.length) params.strengths = filters.strengths.join(",");
    if (filters?.weaknesses?.length) params.weaknesses = filters.weaknesses.join(",");
    if (typeof filters?.starred === "boolean") params.starred = String(filters.starred);
    if (filters?.job_id) params.job_id = filters.job_id;

    const { data } = await api.get("/companies/company/applications", { params });
    const normalized =
      Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
    return (normalized as any[]).map((item) => ({
      id: String(item.application_id ?? item.id ?? ""),
      status: item.status ?? "pending",
      submittedAt: item.submitted_at ?? item.submittedAt ?? "",
      is_starred: item.is_starred ?? false,
      candidate: {
        id: String(item.User?.user_id ?? item.user_id ?? ""),
        name: item.User?.full_name ?? item.full_name ?? "Candidate",
        email: item.User?.email ?? item.email,
        phone: item.User?.phone ?? item.phone,
      },
      job: {
        id: String(item.JobPosting?.job_id ?? item.job_id ?? ""),
        title: item.JobPosting?.title ?? item.job_title ?? "Job",
        location: item.JobPosting?.location ?? item.location,
      },
      cv: item.CV
        ? {
            id: String(item.CV?.cv_id ?? ""),
            title: item.CV?.title ?? "CV",
            url: item.CV?.file_url ?? item.cv_url,
          }
        : undefined,
      ai_insights: item.ai_insights ?? null,
      ai_score: item.ai_score ?? null,
      candidate_location: item.candidate_location ?? null,
      candidate_education: item.candidate_education ?? null,
      candidate_experience_years: item.candidate_experience_years ?? null,
      candidate_skills: item.candidate_skills ?? [],
      reviewNotes: item.review_notes ?? null,
    })) as ApplicationItem[];
  },
  getApplicationById: async (id: string) => {
    const { data } = await api.get(`/companies/company/applications/${id}`);
    const item: any = (data as any)?.data ?? data;
    return {
      id: String(item.application_id ?? item.id ?? id),
      status: item.status ?? "pending",
      submittedAt: item.submitted_at ?? item.submittedAt ?? "",
      candidate: {
        id: String(item.User?.user_id ?? item.user_id ?? ""),
        name: item.User?.full_name ?? item.full_name ?? "Candidate",
        email: item.User?.email ?? item.email,
        phone: item.User?.phone ?? item.phone,
      },
      job: {
        id: String(item.JobPosting?.job_id ?? item.job_id ?? ""),
        title: item.JobPosting?.title ?? item.job_title ?? "Job",
        location: item.JobPosting?.location ?? item.location,
      },
      cv: item.CV
        ? {
            id: String(item.CV?.cv_id ?? ""),
            title: item.CV?.title ?? "CV",
            url: item.CV?.file_url ?? item.cv_url,
          }
        : undefined,
      ai_insights: item.ai_insights ?? null,
      ai_score: item.ai_score ?? null,
      is_starred: item.is_starred ?? false,
      cv_structured_data: item.CV?.CVStructuredData?.data_json ?? null,
      cv_features: item.CV?.CVFeaturesAnalytics ?? null,
      reviewNotes: item.review_notes ?? null,
    } as ApplicationItem;
  },
  refreshApplicationInsights: async (id: string) => {
    const { data } = await api.get(`/companies/company/applications/${id}?refresh=1`);
    return data;
  },
  generateSmartMatchPitch: async (payload: {
    cv_id: string;
    job_id: string;
    language?: "en" | "ar";
  }) => {
    const { data } = await api.post("/ai/cv/generate-pitch", payload);
    return (data as any)?.data ?? data;
  },
  updateApplicationStatus: async (id: string, status: string) => {
    const { data } = await api.put(`/companies/company/applications/${id}`, { status });
    return data;
  },
  toggleApplicationStar: async (id: string, starred?: boolean) => {
    const { data } = await api.put(`/companies/company/applications/${id}/star`, {
      starred,
    });
    return data;
  },
  getCompanyProfile: async () => {
    const { data } = await api.get<CompanyProfile>("/companies/company/profile");
    return data;
  },
  updateCompanyProfile: async (payload: FormData) => {
    const { data } = await api.put<CompanyProfile>("/companies/company/profile", payload, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },
  changeCompanyPassword: async (payload: {
    currentPassword: string;
    newPassword: string;
  }) => {
    const { data } = await api.put("/companies/company/change-password", payload);
    return data;
  },
  updateJobPosting: async (id: string, payload: Partial<JobPosting>) => {
    const { data } = await api.put(`/companies/company/job-postings/${id}`, payload);
    return data;
  },
  recalculateJobInsights: async (id: string) => {
    const { data } = await api.post(
      `/companies/company/job-postings/${id}/recalculate-insights`
    );
    return data;
  },
  toggleJobPosting: async (id: string) => {
    const { data } = await api.put(`/companies/company/job-postings/${id}/toggle`);
    return data;
  },
  deleteJobPosting: async (id: string) => {
    const { data } = await api.delete(`/companies/company/job-postings/${id}`);
    return data;
  },
  createJobForm: async (payload: {
    job_id: string;
    require_cv: boolean;
    fields: { label: string; type: "text" | "multi" | "file"; options?: string[] }[];
  }) => {
    const { data } = await api.post("/companies/company/job-forms", payload);
    return data;
  },
  updateJobForm: async (
    jobId: string,
    payload: {
      require_cv: boolean;
      fields: { label: string; type: "text" | "multi" | "file"; options?: string[] }[];
    }
  ) => {
    const { data } = await api.put(`/companies/company/job-postings/${jobId}/form`, payload);
    return data;
  },
  deleteJobForm: async (jobId: string) => {
    const { data } = await api.delete(`/companies/company/job-postings/${jobId}/form`);
    return data;
  },
  getCvRequests: async () => {
    const { data } = await api.get("/company/cv-requests");
    const normalized =
      Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
    return normalized as CVRequest[];
  },
  createCvRequest: async (payload: {
    requested_role: string;
    cv_count: number;
    experience_years?: number | null;
    skills?: string[];
    location?: string;
  }) => {
    const { data } = await api.post<CVRequest>("/company/cv-requests", payload);
    return data;
  },
  getAIAnalysis: async (cvId: string) => {
    const { data } = await api.get<AIAnalysis>(`/ai/cv/analysis/${cvId}`);
    return data;
  },
  analyzeCvText: async (cvText: string) => {
    const { data } = await api.post<AIAnalysis>("/ai/cv/analyze-text", {
      cvText,
      useAI: true,
      saveToDb: false,
    });
    return data;
  },
  analyzeCvFile: async (payload: FormData) => {
    const { data } = await api.post<AIAnalysis>("/ai/cv/analyze-file", payload, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },
};

export const authApi = {
  companyLogin: async (payload: { email: string; password: string }) => {
    const { data } = await api.post<{
      token?: string;
      accessToken?: string;
      company?: {
        company_id?: string | number;
        name?: string;
        email?: string;
        status?: string;
        is_approved?: boolean;
      };
      data?: {
        token?: string;
        accessToken?: string;
        company?: {
          company_id?: string | number;
          name?: string;
          email?: string;
          status?: string;
          is_approved?: boolean;
        };
      };
    }>("/companies/login", payload);
    return data;
  },
  refreshSession: async () => {
    const { data } = await authClient.post("/companies/refresh");
    return data;
  },
  companyLogout: async () => {
    const { data } = await authClient.post("/companies/logout");
    return data;
  },
  companyRegister: async (payload: FormData) => {
    const { data } = await api.post("/companies/register", payload);
    return data;
  },
  setInitialPassword: async (payload: { email: string; password: string; token: string }) => {
    const { data } = await api.post("/companies/set-password", payload);
    return data;
  },
  forgotPassword: async (payload: { email: string }) => {
    const { data } = await api.post("/auth/forgot-password", payload);
    return data;
  },
  resetPassword: async (payload: { email: string; code: string; password: string }) => {
    const { data } = await api.post("/auth/reset-password", payload);
    return data;
  },
  trackCompanyRequest: async (payload: { request_id?: string; email?: string }) => {
    const { data } = await api.post("/companies/track", payload);
    return data;
  },
};
