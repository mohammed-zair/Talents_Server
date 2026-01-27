import React from "react";
import { motion, animate } from "framer-motion";
import { dashboardData, candidates } from "../data/mockData";
import { useAI } from "../hooks/useAI/useAI";
import Card from "../components/shared/Card";
import SectionHeader from "../components/shared/SectionHeader";
import PulseHeader from "../components/dashboard/PulseHeader";
import MagicSearchBar from "../components/dashboard/MagicSearchBar";
import WeightAdjuster from "../components/dashboard/WeightAdjuster";
import PipelineFunnel from "../components/dashboard/PipelineFunnel";
import StrategicMatchCard from "../components/dashboard/StrategicMatchCard";
import RetentionTeaser from "../components/dashboard/RetentionTeaser";
import JobCreationStepper from "../components/dashboard/JobCreationStepper";
import { useLanguage } from "../contexts/LanguageContext";

const CompanyDashboard: React.FC = () => {
  const { query, setQuery, weights, setWeights, rankedCandidates } = useAI(candidates);
  const { language } = useLanguage();
  const isRtl = language === "ar";

  const copy = {
    en: {
      title: "Company Command Center",
      subtitle: "AI-guided recruiting intelligence with live ATS resonance.",
      pulse:
        "AI Analysis complete: 5 strategic matches found for Project Manager role.",
      pipelineEyebrow: "Active Talent Pipelines",
      pipelineTitle: "Pipeline Velocity",
      pipelineSubtitle: "Stage distribution across active requisitions.",
      searchPlaceholder:
        'Try: "Senior Devs in Riyadh with Python who worked at startups"',
      strategicEyebrow: "Strategic Matches",
      strategicTitle: "High-Confidence Candidate Signals",
      strategicSubtitle: "AI re-ranked by ATS resonance and role fit.",
      hiringVelocity: "Hiring Velocity",
      hiringNote: "Based on current applicants, you are likely to fill this role in 12 days.",
      focusTitle: "Focus Now",
      focusSubtitle: "Expiring roles and high ATS matches that need review.",
      expiringJobs: "Expiring Jobs",
      unreviewedMatches: "Unreviewed Top Matches",
    },
    ar: {
      title: "مركز قيادة الشركة",
      subtitle: "ذكاء توظيف مدعوم بالذكاء الاصطناعي مع مؤشر ATS حي.",
      pulse: "اكتمل التحليل: تم العثور على 5 تطابقات إستراتيجية.",
      pipelineEyebrow: "مسارات المواهب النشطة",
      pipelineTitle: "سرعة المسار",
      pipelineSubtitle: "توزيع المراحل عبر الشواغر النشطة.",
      searchPlaceholder: 'مثال: "مطورو بايثون في الرياض بخبرة شركات ناشئة"',
      strategicEyebrow: "تطابقات إستراتيجية",
      strategicTitle: "إشارات مرشحين عالية الثقة",
      strategicSubtitle: "إعادة ترتيب بالذكاء الاصطناعي وفق الدور.",
      hiringVelocity: "سرعة التوظيف",
      hiringNote: "بناءً على الطلبات الحالية، من المرجح إغلاق الدور خلال ١٢ يومًا.",
      focusTitle: "التركيز الآن",
      focusSubtitle: "وظائف منتهية قريبًا وتطابقات ATS تحتاج مراجعة.",
      expiringJobs: "وظائف قاربت الانتهاء",
      unreviewedMatches: "تطابقات عالية غير مُراجعة",
    },
  }[language];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">
            Talents We Trust
          </p>
          <h1 className="heading-serif text-3xl font-semibold text-[var(--text-primary)]">
            {copy.title}
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            {copy.subtitle}
          </p>
        </div>
        <PulseHeader
          message={copy.pulse}
          candidates={rankedCandidates}
          hiringVelocityDays={12}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {dashboardData.metrics.map((metric) => (
          <Card key={metric.label} className="flex flex-col gap-3">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
              {metric.label}
            </p>
            <CountUpValue value={metric.value} />
            <p className="text-xs text-[var(--accent)]">{metric.delta}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Card className="mesh-bg">
          <SectionHeader
            eyebrow={copy.pipelineEyebrow}
            title={copy.pipelineTitle}
            subtitle={copy.pipelineSubtitle}
          />
          <div className="mt-6">
            <PipelineFunnel stages={dashboardData.pipeline} />
          </div>
        </Card>
        <div className="space-y-4">
          <MagicSearchBar
            value={query}
            onChange={setQuery}
            placeholder={copy.searchPlaceholder}
          />
          <WeightAdjuster weights={weights} onChange={setWeights} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Card className="h-full">
          <SectionHeader
            eyebrow={copy.strategicEyebrow}
            title={copy.strategicTitle}
            subtitle={copy.strategicSubtitle}
          />
          <div className="mt-6 space-y-4">
            {rankedCandidates.map((candidate, index) => (
              <motion.div
                key={candidate.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <StrategicMatchCard candidate={candidate} />
              </motion.div>
            ))}
          </div>
        </Card>
        <div className="space-y-6">
          <HiringVelocityWidget isRtl={isRtl} title={copy.hiringVelocity} note={copy.hiringNote} />
          <FocusList
            isRtl={isRtl}
            title={copy.focusTitle}
            subtitle={copy.focusSubtitle}
            expiringTitle={copy.expiringJobs}
            matchesTitle={copy.unreviewedMatches}
          />
          <RetentionTeaser />
          <JobCreationStepper />
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
    <p className="text-3xl font-semibold text-[var(--text-primary)]">
      {display}
    </p>
  );
};

const HiringVelocityWidget: React.FC<{ isRtl: boolean; title: string; note: string }> = ({
  isRtl,
  title,
  note,
}) => {
  const data = [12, 18, 14, 22, 20, 26, 18];
  const max = Math.max(...data, 1);
  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * 180;
      const y = 60 - (value / max) * 50;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <Card>
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-[var(--text-primary)]">{title}</p>
        <span className="rounded-full bg-[var(--chip-bg)] px-3 py-1 text-xs font-semibold text-[var(--text-primary)]">
          12d
        </span>
      </div>
      <svg
        viewBox="0 0 180 70"
        className="mt-4 h-20 w-full"
        style={{ transform: isRtl ? "scaleX(-1)" : "scaleX(1)" }}
      >
        <polyline
          fill="none"
          stroke="var(--accent)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
        {data.map((value, index) => {
          const x = (index / (data.length - 1)) * 180;
          const y = 60 - (value / max) * 50;
          return <circle key={x} cx={x} cy={y} r={3} fill="var(--accent)" />;
        })}
      </svg>
      <p className="text-xs text-[var(--text-muted)]">{note}</p>
    </Card>
  );
};

const FocusList: React.FC<{
  isRtl: boolean;
  title: string;
  subtitle: string;
  expiringTitle: string;
  matchesTitle: string;
}> = ({ isRtl, title, subtitle, expiringTitle, matchesTitle }) => {
  const focusItems = [
    { label: expiringTitle, value: "3", meta: "48h" },
    { label: matchesTitle, value: "7", meta: "ATS > 80" },
  ];

  return (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">{title}</p>
          <p className="text-xs text-[var(--text-muted)]">{subtitle}</p>
        </div>
        <span className="text-xs text-[var(--accent)]">{isRtl ? "عاجل" : "Urgent"}</span>
      </div>
      <div className="mt-4 space-y-3">
        {focusItems.map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] px-4 py-3 text-sm text-[var(--text-primary)]"
          >
            <span>{item.label}</span>
            <span className="text-xs text-[var(--text-muted)]">
              {item.value} · {item.meta}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
};
