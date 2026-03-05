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
  top_applicant?: TopApplicantEntry | null;
  top_applicants?: TopApplicantEntry[];
  avg_ai_score?: number | null;
  avg_ats_score?: number | null;
  high_quality_job_seekers?: number;
  high_quality_job_seekers_x2?: number;
  latest_job_offer?: {
    job_id?: number | string;
    title?: string;
    created_at?: string | null;
    applications_count?: number;
    avg_ai_score?: number | null;
    avg_ats_score?: number | null;
    starred_count?: number;
    top_applicants?: TopApplicantEntry[];
  } | null;
}

export interface TopApplicantEntry {
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
}

export interface JobPosting {
  id: string;
  title: string;
  location: string;
  department: string;
  industry?: string;
  description?: string;
  requirements?: string;
  jobImageUrl?: string | null;
  is_anonymous?: boolean;
  is_remote?: boolean;
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
  status:
    | "pending"
    | "approved"
    | "processing"
    | "processed"
    | "delivered"
    | "closed"
    | "rejected";
  created_at?: string;
  reportUrl?: string;
  stats?: {
    selected?: number;
    contacting?: number;
    submitted_to_company?: number;
    accepted_by_company?: number;
    rejected_by_company?: number;
    total_candidates?: number;
    delivered_count?: number;
  };
}

export interface CVRequestPipelineCandidate {
  id: number;
  status: "selected" | "contacting" | "submitted_to_company" | "accepted_by_company" | "rejected_by_company";
  priority_rank?: number | null;
  why_candidate?: string | null;
  notes?: string | null;
  candidate: {
    id?: number | null;
    full_name: string;
    email?: string | null;
    phone?: string | null;
  };
  cv?: {
    id?: number | null;
    title?: string | null;
    file_url?: string | null;
    created_at?: string | null;
    ats_score?: number | null;
  } | null;
  source_ai_snapshot?: Record<string, unknown> | null;
  created_at?: string;
  updated_at?: string;
}

export interface CVRequestPipelineData {
  request: CVRequest;
  stats: {
    total_candidates: number;
    selected: number;
    contacting: number;
    submitted_to_company: number;
    accepted_by_company: number;
    rejected_by_company: number;
  };
  timeline: Array<{
    key: string;
    label: string;
    active: boolean;
  }>;
  candidates: CVRequestPipelineCandidate[];
  deliveries: Array<{
    delivery_id: number;
    cv_id: number;
    match_score?: number;
    match_details?: Record<string, unknown> | null;
    delivered_at?: string;
  }>;
  updates: {
    email: Array<{
      email_id: number;
      subject?: string;
      body?: string;
      status?: string;
      sent_at?: string;
      created_at?: string;
    }>;
    push: Array<{
      push_id: number;
      title?: string;
      message?: string;
      is_sent?: boolean;
      sent_at?: string;
      created_at?: string;
    }>;
  };
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
  insight_id?: number;
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
  structured_data?: StructuredCV | Record<string, unknown> | null;
  features_analytics?: CVFeatures | Record<string, unknown> | null;
  ai_raw_response?: Record<string, unknown> | null;
  analysis_method?: string | null;
  ats_score?: number;
  industry_ranking_score?: number;
  industry_ranking_label?: string;
  cleaned_job_description?: string | null;
  smart_match_pitch?: string | null;
  hr_helper?: {
    decision: "hire" | "consider" | "reject";
    confidence: number;
    recommendation_summary: string;
    top_strengths: string[];
    key_risks: string[];
    interview_focus: string[];
    next_step: string;
    generated_at: string;
    source?: "cache" | "fresh" | "fallback";
  };
}
