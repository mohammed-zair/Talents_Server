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
  company_name?: string;
  jobs_count?: number;
  applications_count?: number;
  pending_count?: number;
  reviewed_count?: number;
  accepted_count?: number;
  rejected_count?: number;
  starred_count?: number;
  top_applicant?: {
    application_id?: number | string;
    candidate?: {
      id?: number | string | null;
      name?: string;
      email?: string | null;
    };
    job?: {
      id?: number | string | null;
      title?: string;
    };
    ai_insights?: AIInsightsRecord | null;
    score?: number | null;
  } | null;
}

export interface JobPosting {
  id: string;
  title: string;
  location: string;
  department: string;
  industry?: string;
  description?: string;
  requirements?: string;
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
  role?: string;
  location?: string;
  experienceYears?: number;
  education?: string;
  atsScore?: ATSScore;
  insightTags?: string[];
  skills?: SkillMatch[];
  summaryBullets?: string[];
  companyHistory?: string[];
  email?: string;
  phone?: string;
}

export interface ApplicationItem {
  id: string;
  status: "pending" | "reviewed" | "shortlisted" | "accepted" | "hired" | "rejected";
  submittedAt: string;
  is_starred?: boolean;
  candidate: CandidateProfile;
  job: {
    id: string;
    title: string;
    location?: string;
  };
  cv?: {
    id?: string;
    title?: string;
    url?: string;
  };
  ai_insights?: AIInsightsRecord | null;
  ai_score?: number | null;
  candidate_location?: string | null;
  candidate_education?: string | null;
  candidate_experience_years?: number | null;
  candidate_skills?: string[];
  cv_structured_data?: StructuredCV | null;
  cv_features?: CVFeatures | null;
  _skillMatchCount?: number;
  _tags?: string[];
  reviewNotes?: string | null;
}

export interface ApplicationStatusUpdate {
  status: ApplicationItem["status"];
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

export interface AIInsightsRecord {
  ai_intelligence?: {
    contextual_summary?: string;
    professional_summary?: string;
    strategic_analysis?: {
      strengths?: string[];
      weaknesses?: string[];
      red_flags?: string[];
      culture_growth_fit?: string[];
    };
    ats_optimization_tips?: string[];
    industry_ranking_score?: number;
    industry_ranking_label?: string;
    interview_questions?: string[];
    smart_match_pitch?: string;
    competency_matrix?: Array<{
      required_skill: string;
      candidate_proficiency: number;
      job_target?: number;
      is_missing?: boolean;
    }>;
  };
  ats_score?: number;
  industry_ranking_score?: number;
  industry_ranking_label?: string;
  cleaned_job_description?: string | null;
  smart_match_pitch?: string | null;
}
