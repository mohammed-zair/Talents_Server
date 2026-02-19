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

const ensureArray = <T>(payload: any, keys: string[] = []): T[] => {
  if (Array.isArray(payload)) return payload as T[];
  for (const key of keys) {
    if (Array.isArray(payload?.[key])) return payload[key] as T[];
  }
  if (Array.isArray(payload?.data)) return payload.data as T[];
  return [];
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

  getJobs: async (params?: { page?: number; limit?: number; companyId?: number | string }) => {
    const query: Record<string, any> = {};
    if (typeof params?.page === "number") query.page = params.page;
    if (typeof params?.limit === "number") query.limit = params.limit;
    if (params?.companyId) query.company_id = params.companyId;
    const res = await api.get<ApiEnvelope<any>>("/jop_seeker/job-postings", { params: query });
    const data = unwrap<any>(res.data);
    if (Array.isArray(data)) {
      return { items: data as JobPosting[], page: 0, limit: data.length, total: data.length, pages: 1 };
    }
    const items = ensureArray<JobPosting>(data, ["items", "jobs"]);
    return {
      items,
      page: Number(data?.page ?? 0),
      limit: Number(data?.limit ?? items.length),
      total: Number(data?.total ?? items.length),
      pages: Number(data?.pages ?? 1),
    };
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
    return ensureArray<Application>(unwrap<any>(res.data), ["applications"]);
  },

  listCVs: async () => {
    const res = await api.get<ApiEnvelope<CVItem[]>>("/jop_seeker/profile/cv");
    return ensureArray<CVItem>(unwrap<any>(res.data), ["cvs"]);
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
    return ensureArray<any>(unwrap<any>(res.data), ["saved_jobs", "savedJobs", "jobs"]);
  },
  removeSavedJob: async (jobId: number) => api.delete(`/jop_seeker/saved-jobs/${jobId}`),

  listNotifications: async () => {
    const res = await api.get<ApiEnvelope<NotificationItem[]>>("/jop_seeker/notifications");
    return ensureArray<NotificationItem>(unwrap<any>(res.data), ["notifications"]);
  },
  listUnreadNotifications: async () => {
    const res = await api.get("/jop_seeker/notifications/unread");
    return unwrap(res.data);
  },
  markNotificationRead: async (id: number) => api.put(`/jop_seeker/notifications/${id}/read`),

  listCompanies: async () => {
    const res = await api.get<ApiEnvelope<Company[]>>("/jop_seeker/companies");
    return ensureArray<Company>(unwrap<any>(res.data), ["companies"]);
  },
  getCompanyDetails: async (id: number) => {
    const res = await api.get<ApiEnvelope<Company>>(`/jop_seeker/companies/${id}`);
    return unwrap(res.data);
  },

  listConsultants: async () => {
    try {
      const res = await api.get<ApiEnvelope<Consultant[]>>("/consultant");
      return ensureArray<Consultant>(unwrap<any>(res.data), ["consultants"]);
    } catch (error: any) {
      if (error?.response?.status !== 404) throw error;
      const res = await api.get<ApiEnvelope<Consultant[]>>("/consultants");
      return ensureArray<Consultant>(unwrap<any>(res.data), ["consultants"]);
    }
  },
  requestConsultation: async (consultantUserId: number, message: string) => {
    try {
      const res = await api.post(`/consultant/${consultantUserId}/request-consultation`, { message });
      return unwrap(res.data);
    } catch (error: any) {
      if (error?.response?.status !== 404) throw error;
      const res = await api.post(`/consultants/${consultantUserId}/request-consultation`, { message });
      return unwrap(res.data);
    }
  },
  createBooking: async (payload: {
    consultant_user_id: number;
    start_time: string;
    end_time: string;
  }) => {
    try {
      const res = await api.post("/consultant/bookings", payload);
      return unwrap(res.data);
    } catch (error: any) {
      if (error?.response?.status !== 404) throw error;
      const res = await api.post("/consultants/bookings", payload);
      return unwrap(res.data);
    }
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
    return ensureArray<any>(unwrap<any>(res.data), ["cvs"]);
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
    return ensureArray<any>(unwrap<any>(res.data), ["sessions"]);
  },
  getChatSession: async (sessionId: string) => {
    const res = await api.get(`/ai/chatbot/session/${sessionId}`);
    return unwrap(res.data);
  },
  getChatPreview: async (sessionId: string, language?: string) => {
    const params = language ? `?language=${encodeURIComponent(language)}` : "";
    const res = await api.get(`/ai/chatbot/preview/${sessionId}${params}`, { responseType: "text" });
    return res.data as string;
  },
  getChatInsights: async (sessionId: string) => {
    const res = await api.get(`/ai/chatbot/insights/${sessionId}`);
    return unwrap(res.data);
  },
  updateChatSession: async (sessionId: string, payload: { title?: string }) => {
    const res = await api.patch(`/ai/chatbot/session/${sessionId}`, payload);
    return unwrap(res.data);
  },
  deleteChatSession: async (sessionId: string) => {
    const res = await api.delete(`/ai/chatbot/session/${sessionId}`);
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
