export type Language = "en" | "ar";
export type Theme = "dark" | "light" | "premium";

export type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
} & T;

export type User = {
  user_id: number;
  full_name: string;
  email: string;
  phone?: string;
  preferred_language?: Language;
  user_type: "seeker" | "admin" | "consultant" | "company";
};

export type JobPosting = {
  job_id: number;
  title: string;
  description?: string;
  requirements?: string;
  location?: string;
  industry?: string;
  salary_min?: number;
  salary_max?: number;
  job_image_url?: string | null;
  form_type?: "internal_form" | "external_link";
  external_form_url?: string;
  created_at?: string;
  is_anonymous?: boolean;
  Company?: {
    company_id?: number | null;
    name: string;
    logo_url?: string;
    description?: string;
  };
};

export type Application = {
  application_id: number;
  status: string;
  submitted_at: string;
  review_notes?: string;
  analysis_status?: "not_requested" | "pending" | "succeeded" | "failed";
  analysis_error_message?: string | null;
  analysis_started_at?: string | null;
  analysis_completed_at?: string | null;
  analysis_retry_count?: number;
  analysis_source?: "cv_lab" | "application_upload" | null;
  ai_score?: number | null;
  ai_summary?: string | null;
  JobPosting?: JobPosting;
  CV?: {
    cv_id: number;
    title?: string;
    file_url?: string;
    cv_source?: "cv_lab" | "application_upload";
  };
};

export type CVItem = {
  cv_id: number;
  title: string;
  file_url: string;
  file_type?: string;
  allow_promotion?: boolean;
  cv_source?: "cv_lab" | "application_upload";
  created_at?: string;
  ats_score?: number | null;
};

export type Company = {
  company_id: number;
  name: string;
  email?: string;
  phone?: string;
  description?: string;
  logo_url?: string;
};

export type Consultant = {
  consultant_id: number;
  bio?: string;
  expertise_fields?: string[];
  hourly_rate?: number;
  clients_served?: number;
  User?: {
    user_id: number;
    full_name: string;
    email?: string;
    phone?: string;
  };
};

export type NotificationItem = {
  push_id: number;
  user_id: number;
  title: string;
  message: string;
  created_at: string;
  is_read?: boolean;
};
