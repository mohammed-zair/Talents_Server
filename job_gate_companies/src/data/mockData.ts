import type { ApplicationItem, CandidateProfile, CompanyDashboardData } from "../types";

export const candidates: CandidateProfile[] = [
  {
    id: "cand-001",
    name: "Leila Farouk",
    role: "Senior Product Manager",
    location: "Riyadh",
    experienceYears: 8,
    education: "MBA, INSEAD",
    atsScore: { score: 92, max: 100, percentile: 98, label: "Top 5%" },
    insightTags: ["✨ Top 5% Match", "⚡ Fast Growth Pattern"],
    skills: [
      { name: "Product Strategy", level: "strong" },
      { name: "Go-to-Market", level: "strong" },
      { name: "Data Analytics", level: "strong" },
      { name: "AI Roadmaps", level: "gap" },
    ],
    summaryBullets: [
      "Scaled a fintech product to 1.2M users in 18 months.",
      "Led cross-functional teams across MEA with 34% retention uplift.",
      "Introduced AI-driven experimentation to improve conversion by 21%.",
    ],
    companyHistory: ["FinEdge", "Noor Labs", "Saudi Digital Bank"],
  },
  {
    id: "cand-002",
    name: "Omar Haddad",
    role: "Lead Backend Engineer",
    location: "Dubai",
    experienceYears: 10,
    education: "BSc, KAUST",
    atsScore: { score: 87, max: 100, percentile: 90, label: "High Impact" },
    insightTags: ["🎓 Elite Education", "⚡ Fast Growth Pattern"],
    skills: [
      { name: "Node.js", level: "strong" },
      { name: "Microservices", level: "strong" },
      { name: "Kubernetes", level: "strong" },
      { name: "GraphQL", level: "gap" },
    ],
    summaryBullets: [
      "Reduced infra costs by 28% through multi-cloud routing.",
      "Built hiring analytics pipelines used by 30+ orgs.",
      "Mentored 12 engineers into senior roles.",
    ],
    companyHistory: ["GulfPay", "Sia Systems", "Kayan Tech"],
  },
  {
    id: "cand-003",
    name: "Mona Khalil",
    role: "Talent Intelligence Analyst",
    location: "Jeddah",
    experienceYears: 6,
    education: "MSc, LSE",
    atsScore: { score: 81, max: 100, percentile: 85, label: "Strategic Fit" },
    insightTags: ["✨ Top 10% Match", "🎓 Elite Education"],
    skills: [
      { name: "People Analytics", level: "strong" },
      { name: "Tableau", level: "strong" },
      { name: "Python", level: "strong" },
      { name: "Compensation Modeling", level: "gap" },
    ],
    summaryBullets: [
      "Delivered hiring insights that cut time-to-hire by 19%.",
      "Designed predictive dashboards for retention risk.",
      "Aligned recruiter scorecards with AI-driven benchmarks.",
    ],
    companyHistory: ["Nexa Talent", "TalentLoop", "Horizon HR"],
  },
];

export const dashboardData: CompanyDashboardData = {
  company_name: "Demo Company",
  jobs_count: 4,
  applications_count: 128,
  pending_count: 22,
  reviewed_count: 64,
  accepted_count: 12,
  rejected_count: 30,
  starred_count: 6,
  top_applicant: {
    application_id: "app-001",
    candidate: {
      id: candidates[0].id,
      name: candidates[0].name,
      email: "leila@example.com",
    },
    job: { id: "job-001", title: "Principal Product Manager" },
    score: 92,
  },
};

export const applications: ApplicationItem[] = [
  {
    id: "app-001",
    status: "reviewed",
    submittedAt: "2026-01-20",
    is_starred: true,
    candidate: candidates[0],
    job: { id: "job-001", title: "Principal Product Manager" },
    cv: { id: "cv-001", title: "Leila CV", url: "/mock/cv/1.pdf" },
    ai_score: 92,
  },
  {
    id: "app-002",
    status: "pending",
    submittedAt: "2026-01-22",
    is_starred: false,
    candidate: candidates[1],
    job: { id: "job-002", title: "Lead Backend Engineer" },
    cv: { id: "cv-002", title: "Omar CV", url: "/mock/cv/2.pdf" },
    ai_score: 87,
  },
  {
    id: "app-003",
    status: "accepted",
    submittedAt: "2026-01-18",
    is_starred: false,
    candidate: candidates[2],
    job: { id: "job-003", title: "Talent Intelligence Lead" },
    cv: { id: "cv-003", title: "Mona CV", url: "/mock/cv/3.pdf" },
    ai_score: 81,
  },
];
