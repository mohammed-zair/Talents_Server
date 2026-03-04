import React from "react";
import { useQuery } from "@tanstack/react-query";
import { animate } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  Target,
  BriefcaseBusiness,
  FileBarChart2,
  ShoppingCart,
  Wand2,
} from "lucide-react";
import Card from "../components/shared/Card";
import SectionHeader from "../components/shared/SectionHeader";
import { useLanguage } from "../contexts/LanguageContext";
import { companyApi } from "../services/api/api";
import type { TopApplicantEntry } from "../types";

const CompanyDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isRtl = language === "ar";
  const { data: dashboard } = useQuery({
    queryKey: ["company-dashboard"],
    queryFn: companyApi.getDashboard,
  });

  const copy = {
    en: {
      eyebrow: "Intelligence Hub",
      title: "Market-Grade Recruiting Intelligence",
      subtitle: "Macro signals only. Zero candidate names. Optimized for executive review.",
      jobFunnel: "Job Performance Funnel",
      activeJobs: "Active Jobs",
      totalApplicants: "Total Applicants",
      competencyCurve: "Competency Distribution",
      reviewed: "Reviewed",
      starred: "Starred",
      impact: "Net Talent Acquisition",
      highQualitySeekersX2: "High Quality Job Seekers",
      top5Latest: "Top 5 Applicants (Latest Job)",
      noApplicants: "No applicants yet",
      score: "Score",
      actions: "Quick Actions",
      quickActionsSubtitle: "Direct hiring workflows for faster execution",
      createJob: "Create New Job Offer",
      createJobDesc: "Publish a new role with core requirements in minutes.",
      createJobCta: "Start Now",
      huntHeadCv: "Hunt a Head CV",
      huntHeadCvDesc: "Request high-intent CVs through targeted sourcing.",
      huntHeadCvCta: "Start Hunting",
      hireBest: "Hire Best Applicant",
      hireBestDesc: "Jump to top-ranked applicants and move to hiring decision.",
      hireBestCta: "Review Applicants",
    },
    ar: {
      eyebrow: "مركز الذكاء",
      title: "ذكاء توظيف بمستوى السوق",
      subtitle: "إشارات كلية فقط. بدون أسماء مرشحين. مصمم للإدارة.",
      jobFunnel: "قمع أداء الوظائف",
      activeJobs: "الوظائف النشطة",
      totalApplicants: "إجمالي المتقدمين",
      competencyCurve: "توزيع الكفاءة",
      reviewed: "قيد المراجعة",
      starred: "المميزين",
      impact: "صافي اكتساب المواهب",
      highQualitySeekersX2: "إجمالي الباحثين المتميزين",
      top5Latest: "أفضل 5 مرشحين (آخر وظيفة)",
      noApplicants: "لا يوجد مرشحون بعد",
      score: "الدرجة",
      actions: "إجراءات سريعة",
      quickActionsSubtitle: "اختصارات تنفيذية للتوظيف أسرع",
      createJob: "إنشاء عرض وظيفي جديد",
      createJobDesc: "ابدأ نشر وظيفة جديدة مع المتطلبات الأساسية خلال دقائق.",
      createJobCta: "ابدأ الآن",
      huntHeadCv: "اصطد سيرة Headhunt",
      huntHeadCvDesc: "اطلب سيرة مرشح متميز بسرعة عبر أدوات الاستهداف.",
      huntHeadCvCta: "ابحث الآن",
      hireBest: "وظّف أفضل مرشح",
      hireBestDesc: "انتقل مباشرة إلى أعلى المرشحين وابدأ قرار التوظيف.",
      hireBestCta: "راجع المرشحين",
    },
  }[language];

  const stats = [
    { label: copy.activeJobs, value: dashboard?.jobs_count ?? 0, icon: BriefcaseBusiness },
    { label: copy.totalApplicants, value: dashboard?.applications_count ?? 0, icon: FileBarChart2 },
    { label: copy.reviewed, value: dashboard?.reviewed_count ?? 0, icon: Activity },
    { label: copy.starred, value: dashboard?.starred_count ?? 0, icon: Target, glow: true },
  ];

  const topApplicants: TopApplicantEntry[] =
    dashboard?.latest_job_offer?.top_applicants && dashboard.latest_job_offer.top_applicants.length > 0
      ? dashboard.latest_job_offer.top_applicants
      : dashboard?.top_applicants && dashboard.top_applicants.length > 0
      ? dashboard.top_applicants
      : dashboard?.top_applicant
      ? [dashboard.top_applicant]
      : [];

  const latestJobOffer = dashboard?.latest_job_offer ?? null;
  const qualityMetrics = [
    {
      label: "Average AI Score",
      value: latestJobOffer?.avg_ai_score ?? null,
      color: "bg-cyan-400",
    },
    {
      label: "Average ATS Score",
      value: latestJobOffer?.avg_ats_score ?? null,
      color: "bg-teal-400",
    },
  ];

  return (
    <div className="space-y-8">
      <SectionHeader eyebrow={copy.eyebrow} title={copy.title} subtitle={copy.subtitle} />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Card
            key={stat.label}
            className={`flex flex-col gap-3 ${stat.glow ? "shadow-[0_0_15px_rgba(0,168,232,0.3)]" : ""}`}
          >
            <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
              <span>{stat.label}</span>
              <stat.icon size={16} className="text-[var(--accent)]" />
            </div>
            <CountUpValue value={stat.value} />
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 opacity-50">
            <div className="absolute -top-10 right-6 h-32 w-32 rounded-full bg-cyan-400/20 blur-3xl" />
            <div className="absolute bottom-4 left-8 h-24 w-24 rounded-full bg-teal-400/20 blur-3xl" />
          </div>
          <div className="relative">
            <SectionHeader
              eyebrow="Candidate Quality"
              title={latestJobOffer?.title || "Latest Job Offer"}
              subtitle={
                latestJobOffer?.created_at
                  ? `Posted: ${new Date(latestJobOffer.created_at).toLocaleDateString()}`
                  : "No job posting yet"
              }
            />
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <QualityBarsCard title="Quality Metrics" metrics={qualityMetrics} />
              <StarredGaugeCard
                label="Starred Candidates"
                value={latestJobOffer?.starred_count ?? 0}
                total={latestJobOffer?.applications_count ?? 0}
              />
            </div>
          </div>
        </Card>

        <Card className="border border-teal-400/40 shadow-[0_0_15px_rgba(0,168,232,0.3)]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--chip-bg)]">
              <Wand2 size={18} className="text-teal-300" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">{copy.top5Latest}</p>
              {topApplicants.length === 0 ? (
                <p className="text-sm text-[var(--text-primary)]">{copy.noApplicants}</p>
              ) : (
                <div className="mt-2 space-y-3">
                  {topApplicants.slice(0, 5).map((applicant, index) => {
                    const summary =
                      applicant?.ai_insights?.ai_intelligence?.contextual_summary ||
                      applicant?.ai_insights?.ai_intelligence?.professional_summary ||
                      "";

                    return (
                      <div
                        key={String(applicant.application_id ?? `${applicant.candidate?.id ?? "candidate"}-${index}`)}
                        className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)]/40 p-2"
                      >
                        <p className="text-sm text-[var(--text-primary)]">
                          {index + 1}. {applicant.candidate?.name ?? "Candidate"} - {applicant.job?.title ?? "Job"}
                        </p>
                        {summary ? <p className="mt-1 text-xs text-[var(--text-muted)]">{summary}</p> : null}
                        {applicant?.score !== undefined && applicant?.score !== null ? (
                          <p className="mt-1 text-xs text-[var(--accent)]">
                            {copy.score}: {applicant.score}
                          </p>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Card>
          <SectionHeader
            eyebrow={copy.jobFunnel}
            title={`${copy.activeJobs} vs ${copy.totalApplicants}`}
            subtitle={copy.competencyCurve}
          />
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <FunnelMetric label={copy.activeJobs} value={dashboard?.jobs_count ?? 0} />
            <FunnelMetric label={copy.totalApplicants} value={dashboard?.applications_count ?? 0} />
          </div>
          <div className="mt-6">
            <BellCurve isRtl={isRtl} />
          </div>
        </Card>

        <div className="grid gap-6">
          <Card className="relative overflow-hidden">
            <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(0,168,232,0.18),transparent_55%)]" />
            <div className="relative">
              <SectionHeader
                eyebrow={copy.impact}
                title={String(dashboard?.high_quality_job_seekers_x2 ?? 0)}
                subtitle={copy.highQualitySeekersX2}
              />
            </div>
          </Card>

          <Card>
            <SectionHeader eyebrow={copy.actions} title={copy.actions} subtitle={copy.quickActionsSubtitle} />
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)]/40 p-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                  <BriefcaseBusiness size={16} className="text-[var(--accent)]" />
                  <span>{copy.createJob}</span>
                </div>
                <p className="mt-2 text-xs text-[var(--text-muted)]">{copy.createJobDesc}</p>
                <button
                  type="button"
                  onClick={() => navigate("/jobs")}
                  className="mt-3 w-full rounded-lg border border-[var(--panel-border)] px-3 py-2 text-xs hover:bg-[var(--chip-bg)]"
                >
                  {copy.createJobCta}
                </button>
              </div>

              <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)]/40 p-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                  <ShoppingCart size={16} className="text-[var(--accent)]" />
                  <span>{copy.huntHeadCv}</span>
                </div>
                <p className="mt-2 text-xs text-[var(--text-muted)]">{copy.huntHeadCvDesc}</p>
                <button
                  type="button"
                  onClick={() => navigate("/cv-requests")}
                  className="mt-3 w-full rounded-lg border border-[var(--panel-border)] px-3 py-2 text-xs hover:bg-[var(--chip-bg)]"
                >
                  {copy.huntHeadCvCta}
                </button>
              </div>

              <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)]/40 p-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                  <FileBarChart2 size={16} className="text-[var(--accent)]" />
                  <span>{copy.hireBest}</span>
                </div>
                <p className="mt-2 text-xs text-[var(--text-muted)]">{copy.hireBestDesc}</p>
                <button
                  type="button"
                  onClick={() => navigate("/applications")}
                  className="mt-3 w-full rounded-lg border border-[var(--panel-border)] px-3 py-2 text-xs hover:bg-[var(--chip-bg)]"
                >
                  {copy.hireBestCta}
                </button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CompanyDashboard;

const CountUpValue: React.FC<{ value: string | number }> = ({ value }) => {
  const isNumber = typeof value === "number" || !Number.isNaN(Number(value));
  if (!isNumber) {
    return <p className="text-3xl font-semibold text-[var(--text-primary)]">{value}</p>;
  }
  const numeric = typeof value === "number" ? value : Number(value);
  const [display, setDisplay] = React.useState(0);

  React.useEffect(() => {
    const controls = animate(0, numeric, {
      duration: 1.2,
      ease: "easeOut",
      onUpdate: (latest) => setDisplay(Math.round(latest)),
    });
    return () => controls.stop();
  }, [numeric]);

  return <p className="text-3xl font-semibold text-[var(--text-primary)]">{display}</p>;
};

const QualityBarsCard: React.FC<{
  title: string;
  metrics: Array<{ label: string; value: number | null; color: string }>;
}> = ({ title, metrics }) => {
  const hasData = metrics.some((metric) => typeof metric.value === "number");
  return (
    <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)]/40 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">{title}</p>
      {!hasData ? (
        <p className="mt-4 text-xs text-[var(--text-muted)]">No quality data yet</p>
      ) : (
        <div className="mt-4 space-y-3">
          {metrics.map((metric) => {
            const value = typeof metric.value === "number" ? Math.max(0, Math.min(100, metric.value)) : null;
            return (
              <div key={metric.label} className="space-y-1">
                <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                  <span>{metric.label}</span>
                  <span className="text-[var(--text-primary)]">{value === null ? "-" : `${value.toFixed(1)}%`}</span>
                </div>
                <div className="h-2 w-full rounded-full bg-[var(--panel-border)]">
                  <div className={`h-2 rounded-full ${metric.color}`} style={{ width: `${value ?? 0}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const StarredGaugeCard: React.FC<{ label: string; value: number; total: number }> = ({
  label,
  value,
  total,
}) => {
  const percent = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
  const circumference = 2 * Math.PI * 28;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)]/40 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">{label}</p>
      <div className="mt-4 flex items-center justify-between">
        <div>
          <p className="text-3xl font-semibold text-[var(--text-primary)]">{value}</p>
          <p className="text-xs text-[var(--text-muted)]">of {total} applicants</p>
        </div>
        <svg viewBox="0 0 72 72" className="h-16 w-16 -rotate-90">
          <circle cx="36" cy="36" r="28" fill="none" stroke="var(--panel-border)" strokeWidth="8" />
          <circle
            cx="36"
            cy="36"
            r="28"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
          <text x="36" y="40" textAnchor="middle" className="rotate-90 fill-current text-[10px] text-[var(--text-primary)]">
            {percent}%
          </text>
        </svg>
      </div>
    </div>
  );
};

const FunnelMetric: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)]/40 p-4">
    <p className="text-xs text-[var(--text-muted)]">{label}</p>
    <p className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{value}</p>
  </div>
);

const BellCurve: React.FC<{ isRtl: boolean }> = ({ isRtl }) => {
  const points = ["0,70", "20,55", "40,40", "60,28", "80,22", "100,28", "120,40", "140,55", "160,70"];

  return (
    <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)]/40 p-4">
      <svg
        viewBox="0 0 160 80"
        className="h-24 w-full"
        style={{ transform: isRtl ? "scaleX(-1)" : "scaleX(1)" }}
      >
        <polyline
          fill="none"
          stroke="var(--accent)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points.join(" ")}
        />
        <circle cx="80" cy="22" r="4" fill="var(--accent)" />
      </svg>
      <div className="mt-2 flex items-center justify-between text-xs text-[var(--text-muted)]">
        <span>Low</span>
        <span>Strategic Match Threshold 60%</span>
        <span>High</span>
      </div>
    </div>
  );
};
