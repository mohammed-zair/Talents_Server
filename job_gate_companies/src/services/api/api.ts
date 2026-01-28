import axios from "axios";
import toast from "react-hot-toast";
import type {
  AIAnalysis,
  ApplicationItem,
  CompanyDashboardData,
  CompanyProfile,
  CVRequest,
  JobFormPayload,
  JobPosting,
} from "../../types";
import { clearToken, getToken } from "../auth";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000/api";

export const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    if (status === 401) {
      clearToken();
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
  getDashboard: async () => {
    const { data } = await api.get<CompanyDashboardData>("/companies/company/dashboard");
    return data;
  },
  getJobPostings: async () => {
    const { data } = await api.get("/companies/company/job-postings");
    const normalized =
      Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
    return normalized as JobPosting[];
  },
  createJobPosting: async (payload: FormData) => {
    const { data } = await api.post<JobPosting>("/companies/company/job-postings", payload, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },
  getApplications: async () => {
    const { data } = await api.get("/companies/company/applications");
    const normalized =
      Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
    return normalized as ApplicationItem[];
  },
  getApplicationById: async (id: string) => {
    const { data } = await api.get<ApplicationItem>(`/companies/company/applications/${id}`);
    return data;
  },
  updateApplicationStatus: async (id: string, status: string) => {
    const { data } = await api.put(`/companies/company/applications/${id}`, { status });
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
      data?: { token?: string; accessToken?: string };
    }>("/companies/login", payload);
    return data;
  },
  companyRegister: async (payload: {
    name: string;
    email: string;
    license_doc_url: string;
    password: string;
    confirm_password: string;
    phone?: string;
    description?: string;
    logo_url?: string;
  }) => {
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
  trackCompanyRequest: async (payload: { request_id: string; email?: string }) => {
    const { data } = await api.post("/company-requests/track", payload);
    return data;
  },
};
