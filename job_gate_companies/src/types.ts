export type ThemeMode = "trust" | "ai" | "cloud";
export type LanguageCode = "en" | "ar";

export interface DashboardMetric {
  label: string;
  value: number | string;
  delta?: string;
}

export interface DashboardPipelineStage {
  label: string;
  count: number;
  color: string;
}

export interface CompanyDashboardData {
  metrics: DashboardMetric[];
  pipeline: DashboardPipelineStage[];
  strategicMatches: CandidateProfile[];
}

export interface JobPosting {
  id: string;
  title: string;
  location: string;
  department: string;
  status: "open" | "closed" | "paused";
  applicants: number;
  createdAt: string;
}

export interface CompanyProfile {
  id?: string;
  name: string;
  industry: string;
  email: string;
  phone?: string;
  logoUrl?: string;
  verified?: boolean;
  lastPasswordChange?: string;
}

export interface CandidateProfile {
  id: string;
  name: string;
  role: string;
  location: string;
  experienceYears: number;
  education: string;
  atsScore: ATSScore;
  insightTags: string[];
  skills: SkillMatch[];
  summaryBullets: string[];
  companyHistory?: string[];
}

export interface ApplicationItem {
  id: string;
  candidate: CandidateProfile;
  jobTitle: string;
  stage: "screening" | "interview" | "offer" | "hired" | "rejected";
  appliedAt: string;
}

export interface ApplicationStatusUpdate {
  status: ApplicationItem["stage"];
}

export interface JobFormQuestion {
  id?: string;
  label: string;
  type: "text" | "multi" | "file";
  options?: string[];
}

export interface JobFormPayload {
  title: string;
  jobId?: string;
  questions: JobFormQuestion[];
}

export interface CVRequest {
  request_id?: number;
  company_id?: number;
  requested_role: string;
  experience_years?: number | null;
  skills?: string[] | null;
  location?: string | null;
  cv_count: number;
  status: "pending" | "approved" | "rejected" | "processed" | "delivered";
  created_at?: string;
  reportUrl?: string;
}

export interface SkillMatch {
  name: string;
  level: "strong" | "gap";
}

export interface ATSScore {
  score: number;
  max: number;
  percentile?: number;
  label?: string;
}

export interface AIAnalysis {
  structured_data: StructuredCV;
  ats_score: number;
  features: CVFeatures;
  processing_time?: number;
}

export interface StructuredCV {
  personal_info?: {
    name?: string;
    email?: string;
    phone?: string;
    location?: string;
  };
  education?: Array<{
    degree?: string;
    school?: string;
    years?: string;
  }>;
  experience?: Array<{
    job?: string;
    title?: string;
    company?: string;
    period?: string;
    achievements?: string[];
  }>;
  skills?: string[];
  achievements?: string[];
  certifications?: string[];
  summary?: string;
}

export interface CVFeatures {
  total_years_experience?: number;
  key_skills?: string[];
  achievement_count?: number;
  has_contact_info?: boolean;
  has_education?: boolean;
  has_experience?: boolean;
  is_ats_compliant?: boolean;
}
