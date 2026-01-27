import React, { useMemo, useState } from "react";
import Card from "../components/shared/Card";
import SectionHeader from "../components/shared/SectionHeader";
import RadialGauge from "../components/shared/RadialGauge";
import Button from "../components/shared/Button";
import { useLanguage } from "../contexts/LanguageContext";

type MockStage = "review" | "shortlist" | "interview" | "hold";

interface MockCandidate {
  id: string;
  name: string;
  role: string;
  location: string;
  experienceYears: number;
  education: string;
  atsScore: { score: number; max: number; label: string };
  insights: string[];
  recommendation: string;
  cvUrl: string;
  stage: MockStage;
  submittedAt: string;
}

const MOCK_CANDIDATES: MockCandidate[] = [
  {
    id: "c-101",
    name: "Sara Al‑Harbi",
    role: "Senior Backend Engineer",
    location: "Riyadh",
    experienceYears: 7,
    education: "BSc Computer Science",
    atsScore: { score: 92, max: 100, label: "Top Match" },
    insights: ["Strong Java & Spring", "Led 3 microservices migrations", "AWS Certified"],
    recommendation: "Advance to interview. High system design strength.",
    cvUrl: "/download/app-release.apk",
    stage: "shortlist",
    submittedAt: "2026-01-23",
  },
  {
    id: "c-102",
    name: "Omar K.",
    role: "Full‑Stack Developer",
    location: "Jeddah",
    experienceYears: 4,
    education: "BEng Software Engineering",
    atsScore: { score: 84, max: 100, label: "Strong Fit" },
    insights: ["React + Node.js", "Built ATS integrations", "Agile team lead"],
    recommendation: "Proceed with technical screen.",
    cvUrl: "/download/app-release.apk",
    stage: "review",
    submittedAt: "2026-01-24",
  },
  {
    id: "c-103",
    name: "Lina S.",
    role: "Data Analyst",
    location: "Dammam",
    experienceYears: 3,
    education: "MSc Data Science",
    atsScore: { score: 78, max: 100, label: "Good Potential" },
    insights: ["Power BI + SQL", "Forecasting experience", "Strong presentation"],
    recommendation: "Review portfolio. Consider data task.",
    cvUrl: "/download/app-release.apk",
    stage: "review",
    submittedAt: "2026-01-22",
  },
  {
    id: "c-104",
    name: "Yousef M.",
    role: "DevOps Engineer",
    location: "Riyadh",
    experienceYears: 6,
    education: "BSc IT",
    atsScore: { score: 88, max: 100, label: "High Fit" },
    insights: ["Kubernetes + Terraform", "CI/CD pipelines", "Cost optimization wins"],
    recommendation: "Schedule interview. Strong infra impact.",
    cvUrl: "/download/app-release.apk",
    stage: "shortlist",
    submittedAt: "2026-01-21",
  },
  {
    id: "c-105",
    name: "Alya N.",
    role: "Product Manager",
    location: "Remote",
    experienceYears: 5,
    education: "MBA",
    atsScore: { score: 81, max: 100, label: "Solid Fit" },
    insights: ["Roadmap ownership", "B2B SaaS background", "User research heavy"],
    recommendation: "Move to stakeholder interview.",
    cvUrl: "/download/app-release.apk",
    stage: "interview",
    submittedAt: "2026-01-20",
  },
];

const stageLabel = (stage: MockStage, language: "en" | "ar") => {
  const map = {
    review: { en: "Review", ar: "مراجعة" },
    shortlist: { en: "Shortlist", ar: "قائمة قصيرة" },
    interview: { en: "Interview", ar: "مقابلة" },
    hold: { en: "On Hold", ar: "معلّق" },
  };
  return map[stage][language];
};

const ApplicationList: React.FC = () => {
  const { language } = useLanguage();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    const base = [...MOCK_CANDIDATES].sort(
      (a, b) => b.atsScore.score - a.atsScore.score
    );
    if (!search) return base;
    return base.filter(
      (item) =>
        item.name.toLowerCase().includes(search) ||
        item.role.toLowerCase().includes(search) ||
        item.location.toLowerCase().includes(search)
    );
  }, [query]);

  const copy = {
    en: {
      eyebrow: "Applications",
      title: "HR‑Curated Candidate Feed",
      subtitle:
        "Only HR‑approved CVs appear here with AI insights and recommendations.",
      search: "Search candidate, role, or location",
      listTitle: "Incoming Profiles",
      insights: "AI Insights",
      recommendation: "Recommendation",
      viewCv: "Open CV",
      experience: "yrs",
      highMatch: "High match",
      total: "Total",
      shortlist: "Shortlist",
      empty: "No candidates match your search.",
    },
    ar: {
      eyebrow: "الطلبات",
      title: "مرشحون معتمدون من الموارد البشرية",
      subtitle:
        "تظهر هنا فقط السير الذاتية المعتمدة مع ملخصات الذكاء والتوصيات.",
      search: "ابحث بالاسم أو الدور أو الموقع",
      listTitle: "المرشحون الواردون",
      insights: "رؤى الذكاء",
      recommendation: "التوصية",
      viewCv: "فتح السيرة",
      experience: "سنوات",
      highMatch: "تطابق مرتفع",
      total: "الإجمالي",
      shortlist: "قائمة قصيرة",
      empty: "لا توجد نتائج مطابقة.",
    },
  }[language];

  const stats = useMemo(() => {
    const total = filtered.length;
    const highMatch = filtered.filter((c) => c.atsScore.score >= 85).length;
    const shortlist = filtered.filter((c) => c.stage === "shortlist").length;
    return { total, highMatch, shortlist };
  }, [filtered]);

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow={copy.eyebrow}
        title={copy.title}
        subtitle={copy.subtitle}
        action={
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={copy.search}
            className="w-72 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] px-4 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
          />
        }
      />

      <Card>
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            {copy.listTitle}
          </p>
          <span className="text-xs text-[var(--text-muted)]">
            {language === "ar" ? "مرتبة حسب التطابق" : "Sorted by match"}
          </span>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)]/50 p-4">
            <p className="text-xs text-[var(--text-muted)]">{copy.total}</p>
            <p className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{stats.total}</p>
          </div>
          <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)]/50 p-4">
            <p className="text-xs text-[var(--text-muted)]">{copy.highMatch}</p>
            <p className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{stats.highMatch}</p>
          </div>
          <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)]/50 p-4">
            <p className="text-xs text-[var(--text-muted)]">{copy.shortlist}</p>
            <p className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{stats.shortlist}</p>
          </div>
        </div>

        <div className="mt-5 max-h-[520px] space-y-4 overflow-y-auto pe-2">
          {filtered.length === 0 ? (
            <div className="rounded-xl border border-[var(--panel-border)] p-4 text-sm text-[var(--text-muted)]">
              {copy.empty}
            </div>
          ) : (
            filtered.map((candidate) => (
              <div
                key={candidate.id}
                className="grid gap-4 rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4 lg:grid-cols-[1.2fr_1fr]"
              >
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-[var(--text-primary)]">
                        {candidate.name}
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {candidate.role} · {candidate.location} ·{" "}
                        {candidate.experienceYears} {copy.experience}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="rounded-full bg-[var(--chip-bg)] px-3 py-1 text-xs font-semibold text-[var(--text-primary)]">
                        {stageLabel(candidate.stage, language)}
                      </span>
                      <RadialGauge
                        value={candidate.atsScore.score}
                        max={candidate.atsScore.max}
                        size={50}
                      />
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)]/40 p-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
                        {copy.insights}
                      </p>
                      <ul className="mt-2 space-y-1 text-xs text-[var(--text-primary)]">
                        {candidate.insights.map((item, idx) => (
                          <li key={`${candidate.id}-insight-${idx}`}>• {item}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)]/40 p-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
                        {copy.recommendation}
                      </p>
                      <p className="mt-2 text-xs text-[var(--text-primary)]">
                        {candidate.recommendation}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col justify-between rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)]/40 p-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
                      {language === "ar" ? "ملف المرشح" : "Candidate File"}
                    </p>
                    <p className="mt-2 text-sm text-[var(--text-primary)]">
                      {candidate.education}
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      {language === "ar" ? "تم الإرسال" : "Submitted"}:{" "}
                      {candidate.submittedAt}
                    </p>
                    <p className="mt-3 text-xs text-[var(--text-muted)]">
                      {language === "ar"
                        ? "تمت مشاركة هذا المرشح من قبل فريق الموارد البشرية."
                        : "This candidate was shared by the HR team."}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    className="mt-4 justify-center"
                    onClick={() => window.open(candidate.cvUrl, "_blank")}
                  >
                    {copy.viewCv}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
};

export default ApplicationList;
