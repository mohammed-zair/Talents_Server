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
  Company?: {
    company_id: number;
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
  JobPosting?: JobPosting;
  CV?: {
    cv_id: number;
    title?: string;
    file_url?: string;
  };
};

export type CVItem = {
  cv_id: number;
  title: string;
  file_url: string;
  file_type?: string;
  allow_promotion?: boolean;
  created_at?: string;
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
