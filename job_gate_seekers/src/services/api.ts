import axios from "axios";
import type {
  ApiEnvelope,
  Application,
  CVItem,
  Company,
  Consultant,
  JobPosting,
  NotificationItem,
  User,
} from "../types/api";
import { clearSession, getToken } from "../utils/auth";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error?.response?.status === 401) {
      clearSession();
    }
    return Promise.reject(error);
  }
);

const unwrap = <T>(payload: ApiEnvelope<T>): T => {
  if (payload && typeof payload === "object" && "data" in payload) {
    return payload.data as T;
  }
  return payload as T;
};

export const seekerApi = {
  login: async (data: { email: string; password: string }) => {
    const res = await api.post<ApiEnvelope<{ token: string; user: User }>>("/auth/login", data);
    return unwrap(res.data);
  },
  register: async (data: { full_name: string; email: string; password: string; phone?: string }) => {
    const res = await api.post<ApiEnvelope<{ token: string; user: User }>>("/auth/register-jobseeker", data);
    return unwrap(res.data);
  },
  forgotPassword: async (data: { email: string }) => api.post("/auth/forgot-password", data),
  resetPassword: async (data: { email: string; token: string; newPassword: string }) =>
    api.post("/auth/reset-password", data),

  getJobs: async () => {
    const res = await api.get<ApiEnvelope<JobPosting[]>>("/jop_seeker/job-postings");
    return unwrap(res.data) || [];
  },
  getJobDetails: async (id: string) => {
    const res = await api.get<ApiEnvelope<JobPosting>>(`/jop_seeker/job-postings/${id}`);
    return unwrap(res.data);
  },
  getJobForm: async (id: string) => {
    const res = await api.get(`/jop_seeker/job-postings/${id}/form`);
    return unwrap(res.data);
  },

  submitApplication: async (payload: FormData) => {
    const res = await api.post("/jop_seeker/applications", payload, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return unwrap(res.data);
  },
  listApplications: async () => {
    const res = await api.get<ApiEnvelope<Application[]>>("/jop_seeker/applications/user");
    return unwrap(res.data) || [];
  },

  listCVs: async () => {
    const res = await api.get<ApiEnvelope<CVItem[]>>("/jop_seeker/profile/cv");
    const payload = unwrap<any>(res.data);
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.cvs)) return payload.cvs;
    if (Array.isArray(payload?.data)) return payload.data;
    return [];
  },
  uploadCV: async (payload: FormData) => {
    const res = await api.put("/jop_seeker/profile/cv", payload, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return unwrap(res.data);
  },
  deleteCV: async (id: number) => {
    const res = await api.delete(`/jop_seeker/profile/cv/${id}`);
    return unwrap(res.data);
  },

  saveJob: async (jobId: number) => api.post(`/jop_seeker/saved-jobs/${jobId}`),
  getSavedJobs: async () => {
    const res = await api.get("/jop_seeker/saved-jobs");
    return unwrap(res.data) || [];
  },
  removeSavedJob: async (jobId: number) => api.delete(`/jop_seeker/saved-jobs/${jobId}`),

  listNotifications: async () => {
    const res = await api.get<ApiEnvelope<NotificationItem[]>>("/jop_seeker/notifications");
    return unwrap(res.data) || [];
  },
  listUnreadNotifications: async () => {
    const res = await api.get("/jop_seeker/notifications/unread");
    return unwrap(res.data);
  },
  markNotificationRead: async (id: number) => api.put(`/jop_seeker/notifications/${id}/read`),

  listCompanies: async () => {
    const res = await api.get<ApiEnvelope<Company[]>>("/jop_seeker/companies");
    return unwrap(res.data) || [];
  },
  getCompanyDetails: async (id: number) => {
    const res = await api.get<ApiEnvelope<Company>>(`/jop_seeker/companies/${id}`);
    return unwrap(res.data);
  },

  listConsultants: async () => {
    const res = await api.get<ApiEnvelope<Consultant[]>>("/consultant");
    return unwrap(res.data) || [];
  },
  requestConsultation: async (consultantUserId: number, message: string) => {
    const res = await api.post(`/consultant/${consultantUserId}/request-consultation`, { message });
    return unwrap(res.data);
  },
  createBooking: async (payload: {
    consultant_user_id: number;
    start_time: string;
    end_time: string;
  }) => {
    const res = await api.post("/consultant/bookings", payload);
    return unwrap(res.data);
  },

  analyzeCvText: async (payload: { cv_text: string; useAI?: boolean; saveToDb?: boolean; cv_id?: number }) => {
    const res = await api.post("/ai/cv/analyze-text", payload);
    return unwrap(res.data);
  },
  analyzeCvFile: async (payload: FormData) => {
    const res = await api.post("/ai/cv/analyze-file", payload, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return unwrap(res.data);
  },
  getCvAnalysis: async (cvId: number) => {
    const res = await api.get(`/ai/cv/analysis/${cvId}`);
    return unwrap(res.data);
  },
  getUserAiCvs: async () => {
    const res = await api.get("/ai/user/cvs");
    return unwrap(res.data);
  },
  generatePitch: async (payload: { cv_id: number; job_id: number; language?: "en" | "ar" }) => {
    const res = await api.post("/ai/cv/generate-pitch", payload);
    return unwrap(res.data);
  },

  startChat: async (payload: {
    language?: string;
    initialData?: Record<string, unknown>;
    output_language?: string;
    job_posting_id?: number;
    job_description?: string;
  }) => {
    const res = await api.post("/ai/chatbot/start", payload);
    return unwrap(res.data);
  },
  sendChat: async (payload: {
    sessionId?: string;
    session_id?: string;
    message: string;
    job_posting_id?: number;
    job_description?: string;
  }) => {
    const res = await api.post("/ai/chatbot/chat", payload);
    return unwrap(res.data);
  },
  listChatSessions: async () => {
    const res = await api.get("/ai/chatbot/sessions");
    const payload = unwrap<any>(res.data);
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.sessions)) return payload.sessions;
    if (Array.isArray(payload?.data)) return payload.data;
    return [];
  },
  getChatSession: async (sessionId: string) => {
    const res = await api.get(`/ai/chatbot/session/${sessionId}`);
    return unwrap(res.data);
  },
  exportChatDocument: async (payload: {
    session_id?: string;
    sessionId?: string;
    format: "pdf" | "docx";
    language?: string;
  }) => {
    const res = await api.post("/ai/chatbot/export", payload, { responseType: "blob" });
    return res.data;
  },
};

export default api;
