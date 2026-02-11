import React from "react";
import { useQuery } from "@tanstack/react-query";
import { animate } from "framer-motion";
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
import Button from "../components/shared/Button";
import { useLanguage } from "../contexts/LanguageContext";
import { companyApi } from "../services/api/api";

const CompanyDashboard: React.FC = () => {
  const { language } = useLanguage();
  const isRtl = language === "ar";
  const { data: dashboard } = useQuery({
    queryKey: ["company-dashboard"],
    queryFn: companyApi.getDashboard,
  });

  const copy = {
    en: {
      eyebrow: "Intelligence Hub",
      title: "Market‑Grade Recruiting Intelligence",
      subtitle:
        "Macro signals only. Zero candidate names. Optimized for executive review.",
      marketPulse: "Market Pulse",
      availableTalent: "Available High‑Intent Talent",
      topReact: "Top 5% of React Developers in-region are currently active",
      strengthRadar: "Competency Radar",
      successForecast: "Success Forecast",
      hires30: "Estimated hires in next 30 days",
      cvPurchased: "Total CVs purchased",
      alignmentIndex: "Strategic Alignment Index",
      qualityVsQuantity: "Quality vs Quantity",
      copilot: "AI Co‑Pilot",
      copilotText:
        "Market trend shows a 15% increase in Python salaries; consider adjusting your Senior Dev posting to stay competitive.",
      jobFunnel: "Job Performance Funnel",
      activeJobs: "Active Jobs",
      totalApplicants: "Total Applicants",
      competencyCurve: "Competency Distribution",
      impact: "Net Talent Acquisition",
      fulfilled: "Total Positions Fulfilled via Talents We Trust",
      actions: "Quick Actions",
      createJob: "Create Strategic Job",
      credits: "Purchase Talent Credits",
      report: "Export Executive Report",
    },
    ar: {
      eyebrow: "مركز الذكاء",
      title: "ذكاء توظيف بمستوى السوق",
      subtitle: "إشارات كلية فقط. بدون أسماء مرشحين. مصمم للإدارة.",
      marketPulse: "نبض السوق",
      availableTalent: "مواهب عالية النية متاحة",
      topReact: "أفضل 5% من مطوري React في المنطقة متاحون الآن",
      strengthRadar: "رادار الكفاءات",
      successForecast: "توقع النجاح",
      hires30: "التعيينات المتوقعة خلال 30 يوماً",
      cvPurchased: "إجمالي السير المشتراة",
      alignmentIndex: "مؤشر المواءمة الاستراتيجية",
      qualityVsQuantity: "الجودة مقابل الكمية",
      copilot: "المساعد الذكي",
      copilotText:
        "يرصد السوق ارتفاعاً بنسبة 15% في رواتب Python؛ ننصح بمراجعة إعلان المطور الكبير.",
      jobFunnel: "قمع أداء الوظائف",
      activeJobs: "الوظائف النشطة",
      totalApplicants: "إجمالي المتقدمين",
      competencyCurve: "توزيع الكفاءة",
      impact: "صافي اكتساب المواهب",
      fulfilled: "إجمالي الوظائف التي تم شغلها عبر Talents We Trust",
      actions: "إجراءات سريعة",
      createJob: "إنشاء وظيفة استراتيجية",
      credits: "شراء رصيد المواهب",
      report: "تصدير تقرير تنفيذي",
    },
  }[language];

  const stats = [
    { label: copy.activeJobs, value: dashboard?.jobs_count ?? 0, icon: BriefcaseBusiness },
    { label: copy.totalApplicants, value: dashboard?.applications_count ?? 0, icon: FileBarChart2 },
    { label: language === "ar" ? "قيد المراجعة" : "Reviewed", value: dashboard?.reviewed_count ?? 0, icon: Activity },
    { label: language === "ar" ? "المميزين" : "Starred", value: dashboard?.starred_count ?? 0, icon: Target, glow: true },
  ];

  const topApplicant = dashboard?.top_applicant ?? null;
  const topSummary =
    topApplicant?.ai_insights?.ai_intelligence?.contextual_summary ||
    topApplicant?.ai_insights?.ai_intelligence?.professional_summary ||
    "";

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow={copy.eyebrow}
        title={copy.title}
        subtitle={copy.subtitle}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Card
            key={stat.label}
            className={`flex flex-col gap-3 ${
              stat.glow ? "shadow-[0_0_15px_rgba(0,168,232,0.3)]" : ""
            }`}
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
              eyebrow={copy.marketPulse}
              title={copy.availableTalent}
              subtitle={copy.topReact}
            />
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <RadarCard title={copy.strengthRadar} />
              <ForecastCard label={copy.successForecast} note={copy.qualityVsQuantity} />
            </div>
          </div>
        </Card>

        <Card className="border border-teal-400/40 shadow-[0_0_15px_rgba(0,168,232,0.3)]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--chip-bg)]">
              <Wand2 size={18} className="text-teal-300" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
                {language === "ar" ? "أفضل مرشح" : "Top Applicant"}
              </p>
              <p className="text-sm text-[var(--text-primary)]">
                {topApplicant
                  ? `${topApplicant.candidate?.name ?? "Candidate"} · ${topApplicant.job?.title ?? "Job"}`
                  : language === "ar"
                  ? "لا يوجد مرشح بعد"
                  : "No applicant yet"}
              </p>
              {topSummary ? (
                <p className="mt-2 text-xs text-[var(--text-muted)]">{topSummary}</p>
              ) : null}
              {topApplicant?.score !== undefined && topApplicant?.score !== null ? (
                <p className="mt-2 text-xs text-[var(--accent)]">
                  {language === "ar" ? "الدرجة" : "Score"}: {topApplicant.score}
                </p>
              ) : null}
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
                title="1,482"
                subtitle={copy.fulfilled}
              />
            </div>
          </Card>

          <Card>
            <SectionHeader
              eyebrow={copy.actions}
              title={copy.actions}
              subtitle={language === "ar" ? "إجراءات فورية للقيادة" : "Executive‑ready controls"}
            />
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <Button className="justify-center">
                <BriefcaseBusiness size={16} className="me-2" />
                {copy.createJob}
              </Button>
              <Button variant="outline" className="justify-center">
                <ShoppingCart size={16} className="me-2" />
                {copy.credits}
              </Button>
              <Button variant="outline" className="justify-center">
                <FileBarChart2 size={16} className="me-2" />
                {copy.report}
              </Button>
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

  return (
    <p className="text-3xl font-semibold text-[var(--text-primary)]">{display}</p>
  );
};

const RadarCard: React.FC<{ title: string }> = ({ title }) => {
  const metrics = [
    { label: "System Design", value: 86 },
    { label: "DevOps", value: 62 },
    { label: "Security", value: 74 },
    { label: "Leadership", value: 68 },
  ];

  return (
    <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)]/40 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">{title}</p>
      <div className="mt-4 space-y-2">
        {metrics.map((metric) => (
          <div key={metric.label} className="space-y-1">
            <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
              <span>{metric.label}</span>
              <span className="text-[var(--text-primary)]">{metric.value}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-[var(--panel-border)]">
              <div
                className="h-2 rounded-full bg-[var(--accent)]"
                style={{ width: `${metric.value}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ForecastCard: React.FC<{ label: string; note: string }> = ({ label, note }) => {
  return (
    <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)]/40 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">{label}</p>
      <div className="mt-4 flex items-center justify-between">
        <div>
          <p className="text-3xl font-semibold text-[var(--text-primary)]">18</p>
          <p className="text-xs text-[var(--text-muted)]">Next 30 days</p>
        </div>
        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[var(--panel-border)] bg-[var(--panel-bg)]/40">
          <span className="text-xs text-[var(--text-primary)]">+22%</span>
        </div>
      </div>
      <p className="mt-3 text-xs text-[var(--text-muted)]">{note}</p>
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
  const points = [
    "0,70",
    "20,55",
    "40,40",
    "60,28",
    "80,22",
    "100,28",
    "120,40",
    "140,55",
    "160,70",
  ];

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
