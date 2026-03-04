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
import { useLanguage } from "../contexts/LanguageContext";
import { companyApi } from "../services/api/api";
import type { TopApplicantEntry } from "../types";

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
      title: "MarketÃ¢â‚¬â€˜Grade Recruiting Intelligence",
      subtitle:
        "Macro signals only. Zero candidate names. Optimized for executive review.",
      marketPulse: "Market Pulse",
      availableTalent: "Available HighÃ¢â‚¬â€˜Intent Talent",
      topReact: "Top 5% of React Developers in-region are currently active",
      strengthRadar: "Competency Radar",
      successForecast: "Success Forecast",
      hires30: "Estimated hires in next 30 days",
      cvPurchased: "Total CVs purchased",
      alignmentIndex: "Strategic Alignment Index",
      qualityVsQuantity: "Quality vs Quantity",
      copilot: "AI CoÃ¢â‚¬â€˜Pilot",
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
      eyebrow: "Ã™â€¦Ã˜Â±Ã™Æ’Ã˜Â² Ã˜Â§Ã™â€žÃ˜Â°Ã™Æ’Ã˜Â§Ã˜Â¡",
      title: "Ã˜Â°Ã™Æ’Ã˜Â§Ã˜Â¡ Ã˜ÂªÃ™Ë†Ã˜Â¸Ã™Å Ã™Â Ã˜Â¨Ã™â€¦Ã˜Â³Ã˜ÂªÃ™Ë†Ã™â€° Ã˜Â§Ã™â€žÃ˜Â³Ã™Ë†Ã™â€š",
      subtitle: "Ã˜Â¥Ã˜Â´Ã˜Â§Ã˜Â±Ã˜Â§Ã˜Âª Ã™Æ’Ã™â€žÃ™Å Ã˜Â© Ã™ÂÃ™â€šÃ˜Â·. Ã˜Â¨Ã˜Â¯Ã™Ë†Ã™â€  Ã˜Â£Ã˜Â³Ã™â€¦Ã˜Â§Ã˜Â¡ Ã™â€¦Ã˜Â±Ã˜Â´Ã˜Â­Ã™Å Ã™â€ . Ã™â€¦Ã˜ÂµÃ™â€¦Ã™â€¦ Ã™â€žÃ™â€žÃ˜Â¥Ã˜Â¯Ã˜Â§Ã˜Â±Ã˜Â©.",
      marketPulse: "Ã™â€ Ã˜Â¨Ã˜Â¶ Ã˜Â§Ã™â€žÃ˜Â³Ã™Ë†Ã™â€š",
      availableTalent: "Ã™â€¦Ã™Ë†Ã˜Â§Ã™â€¡Ã˜Â¨ Ã˜Â¹Ã˜Â§Ã™â€žÃ™Å Ã˜Â© Ã˜Â§Ã™â€žÃ™â€ Ã™Å Ã˜Â© Ã™â€¦Ã˜ÂªÃ˜Â§Ã˜Â­Ã˜Â©",
      topReact: "Ã˜Â£Ã™ÂÃ˜Â¶Ã™â€ž 5% Ã™â€¦Ã™â€  Ã™â€¦Ã˜Â·Ã™Ë†Ã˜Â±Ã™Å  React Ã™ÂÃ™Å  Ã˜Â§Ã™â€žÃ™â€¦Ã™â€ Ã˜Â·Ã™â€šÃ˜Â© Ã™â€¦Ã˜ÂªÃ˜Â§Ã˜Â­Ã™Ë†Ã™â€  Ã˜Â§Ã™â€žÃ˜Â¢Ã™â€ ",
      strengthRadar: "Ã˜Â±Ã˜Â§Ã˜Â¯Ã˜Â§Ã˜Â± Ã˜Â§Ã™â€žÃ™Æ’Ã™ÂÃ˜Â§Ã˜Â¡Ã˜Â§Ã˜Âª",
      successForecast: "Ã˜ÂªÃ™Ë†Ã™â€šÃ˜Â¹ Ã˜Â§Ã™â€žÃ™â€ Ã˜Â¬Ã˜Â§Ã˜Â­",
      hires30: "Ã˜Â§Ã™â€žÃ˜ÂªÃ˜Â¹Ã™Å Ã™Å Ã™â€ Ã˜Â§Ã˜Âª Ã˜Â§Ã™â€žÃ™â€¦Ã˜ÂªÃ™Ë†Ã™â€šÃ˜Â¹Ã˜Â© Ã˜Â®Ã™â€žÃ˜Â§Ã™â€ž 30 Ã™Å Ã™Ë†Ã™â€¦Ã˜Â§Ã™â€¹",
      cvPurchased: "Ã˜Â¥Ã˜Â¬Ã™â€¦Ã˜Â§Ã™â€žÃ™Å  Ã˜Â§Ã™â€žÃ˜Â³Ã™Å Ã˜Â± Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â´Ã˜ÂªÃ˜Â±Ã˜Â§Ã˜Â©",
      alignmentIndex: "Ã™â€¦Ã˜Â¤Ã˜Â´Ã˜Â± Ã˜Â§Ã™â€žÃ™â€¦Ã™Ë†Ã˜Â§Ã˜Â¡Ã™â€¦Ã˜Â© Ã˜Â§Ã™â€žÃ˜Â§Ã˜Â³Ã˜ÂªÃ˜Â±Ã˜Â§Ã˜ÂªÃ™Å Ã˜Â¬Ã™Å Ã˜Â©",
      qualityVsQuantity: "Ã˜Â§Ã™â€žÃ˜Â¬Ã™Ë†Ã˜Â¯Ã˜Â© Ã™â€¦Ã™â€šÃ˜Â§Ã˜Â¨Ã™â€ž Ã˜Â§Ã™â€žÃ™Æ’Ã™â€¦Ã™Å Ã˜Â©",
      copilot: "Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â³Ã˜Â§Ã˜Â¹Ã˜Â¯ Ã˜Â§Ã™â€žÃ˜Â°Ã™Æ’Ã™Å ",
      copilotText:
        "Ã™Å Ã˜Â±Ã˜ÂµÃ˜Â¯ Ã˜Â§Ã™â€žÃ˜Â³Ã™Ë†Ã™â€š Ã˜Â§Ã˜Â±Ã˜ÂªÃ™ÂÃ˜Â§Ã˜Â¹Ã˜Â§Ã™â€¹ Ã˜Â¨Ã™â€ Ã˜Â³Ã˜Â¨Ã˜Â© 15% Ã™ÂÃ™Å  Ã˜Â±Ã™Ë†Ã˜Â§Ã˜ÂªÃ˜Â¨ PythonÃ˜â€º Ã™â€ Ã™â€ Ã˜ÂµÃ˜Â­ Ã˜Â¨Ã™â€¦Ã˜Â±Ã˜Â§Ã˜Â¬Ã˜Â¹Ã˜Â© Ã˜Â¥Ã˜Â¹Ã™â€žÃ˜Â§Ã™â€  Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â·Ã™Ë†Ã˜Â± Ã˜Â§Ã™â€žÃ™Æ’Ã˜Â¨Ã™Å Ã˜Â±.",
      jobFunnel: "Ã™â€šÃ™â€¦Ã˜Â¹ Ã˜Â£Ã˜Â¯Ã˜Â§Ã˜Â¡ Ã˜Â§Ã™â€žÃ™Ë†Ã˜Â¸Ã˜Â§Ã˜Â¦Ã™Â",
      activeJobs: "Ã˜Â§Ã™â€žÃ™Ë†Ã˜Â¸Ã˜Â§Ã˜Â¦Ã™Â Ã˜Â§Ã™â€žÃ™â€ Ã˜Â´Ã˜Â·Ã˜Â©",
      totalApplicants: "Ã˜Â¥Ã˜Â¬Ã™â€¦Ã˜Â§Ã™â€žÃ™Å  Ã˜Â§Ã™â€žÃ™â€¦Ã˜ÂªÃ™â€šÃ˜Â¯Ã™â€¦Ã™Å Ã™â€ ",
      competencyCurve: "Ã˜ÂªÃ™Ë†Ã˜Â²Ã™Å Ã˜Â¹ Ã˜Â§Ã™â€žÃ™Æ’Ã™ÂÃ˜Â§Ã˜Â¡Ã˜Â©",
      impact: "Ã˜ÂµÃ˜Â§Ã™ÂÃ™Å  Ã˜Â§Ã™Æ’Ã˜ÂªÃ˜Â³Ã˜Â§Ã˜Â¨ Ã˜Â§Ã™â€žÃ™â€¦Ã™Ë†Ã˜Â§Ã™â€¡Ã˜Â¨",
      fulfilled: "Ã˜Â¥Ã˜Â¬Ã™â€¦Ã˜Â§Ã™â€žÃ™Å  Ã˜Â§Ã™â€žÃ™Ë†Ã˜Â¸Ã˜Â§Ã˜Â¦Ã™Â Ã˜Â§Ã™â€žÃ˜ÂªÃ™Å  Ã˜ÂªÃ™â€¦ Ã˜Â´Ã˜ÂºÃ™â€žÃ™â€¡Ã˜Â§ Ã˜Â¹Ã˜Â¨Ã˜Â± Talents We Trust",
      actions: "Ã˜Â¥Ã˜Â¬Ã˜Â±Ã˜Â§Ã˜Â¡Ã˜Â§Ã˜Âª Ã˜Â³Ã˜Â±Ã™Å Ã˜Â¹Ã˜Â©",
      createJob: "Ã˜Â¥Ã™â€ Ã˜Â´Ã˜Â§Ã˜Â¡ Ã™Ë†Ã˜Â¸Ã™Å Ã™ÂÃ˜Â© Ã˜Â§Ã˜Â³Ã˜ÂªÃ˜Â±Ã˜Â§Ã˜ÂªÃ™Å Ã˜Â¬Ã™Å Ã˜Â©",
      credits: "Ã˜Â´Ã˜Â±Ã˜Â§Ã˜Â¡ Ã˜Â±Ã˜ÂµÃ™Å Ã˜Â¯ Ã˜Â§Ã™â€žÃ™â€¦Ã™Ë†Ã˜Â§Ã™â€¡Ã˜Â¨",
      report: "Ã˜ÂªÃ˜ÂµÃ˜Â¯Ã™Å Ã˜Â± Ã˜ÂªÃ™â€šÃ˜Â±Ã™Å Ã˜Â± Ã˜ÂªÃ™â€ Ã™ÂÃ™Å Ã˜Â°Ã™Å ",
    },
  }[language];

  const stats = [
    { label: copy.activeJobs, value: dashboard?.jobs_count ?? 0, icon: BriefcaseBusiness },
    { label: copy.totalApplicants, value: dashboard?.applications_count ?? 0, icon: FileBarChart2 },
    { label: language === "ar" ? "Ã™â€šÃ™Å Ã˜Â¯ Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â±Ã˜Â§Ã˜Â¬Ã˜Â¹Ã˜Â©" : "Reviewed", value: dashboard?.reviewed_count ?? 0, icon: Activity },
    { label: language === "ar" ? "Ã˜Â§Ã™â€žÃ™â€¦Ã™â€¦Ã™Å Ã˜Â²Ã™Å Ã™â€ " : "Starred", value: dashboard?.starred_count ?? 0, icon: Target, glow: true },
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
              eyebrow="Candidate Quality"
              title={latestJobOffer?.title || "Latest Job Offer"}
              subtitle={
                latestJobOffer?.created_at
                  ? `Posted: ${new Date(latestJobOffer.created_at).toLocaleDateString()}`
                  : "No job posting yet"
              }
            />
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <QualityBarsCard
                title="Quality Metrics"
                metrics={qualityMetrics}
              />
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
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
                {language === "ar" ? "Ø£ÙØ¶Ù„ 5 Ù…Ø±Ø´Ø­ÙŠÙ† (Ø¢Ø®Ø± ÙˆØ¸ÙŠÙØ©)" : "Top 5 Applicants (Latest Job)"}
              </p>
              {topApplicants.length === 0 ? (
                <p className="text-sm text-[var(--text-primary)]">
                  {language === "ar" ? "Ã™â€žÃ˜Â§ Ã™Å Ã™Ë†Ã˜Â¬Ã˜Â¯ Ã™â€¦Ã˜Â±Ã˜Â´Ã˜Â­Ã™Ë†Ã™â€  Ã˜Â¨Ã˜Â¹Ã˜Â¯" : "No applicants yet"}
                </p>
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
                        {summary ? (
                          <p className="mt-1 text-xs text-[var(--text-muted)]">{summary}</p>
                        ) : null}
                        {applicant?.score !== undefined && applicant?.score !== null ? (
                          <p className="mt-1 text-xs text-[var(--accent)]">
                            {language === "ar" ? "Ã˜Â§Ã™â€žÃ˜Â¯Ã˜Â±Ã˜Â¬Ã˜Â©" : "Score"}: {applicant.score}
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
                subtitle={
                  language === "ar"
                    ? "Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ø¨Ø§Ø­Ø«ÙŠÙ† Ø§Ù„Ù…ØªÙ…ÙŠØ²ÙŠÙ† Ã—2"
                    : "High Quality Job Seekers Ã—2"
                }
              />
            </div>
          </Card>

          <Card>
            <SectionHeader
              eyebrow={copy.actions}
              title={copy.actions}
              subtitle={
                language === "ar"
                  ? "اختصارات تنفيذية للتوظيف أسرع"
                  : "Direct hiring workflows for faster execution"
              }
            />
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)]/40 p-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                  <BriefcaseBusiness size={16} className="text-[var(--accent)]" />
                  <span>{language === "ar" ? "إنشاء عرض وظيفي جديد" : "Create New Job Offer"}</span>
                </div>
                <p className="mt-2 text-xs text-[var(--text-muted)]">
                  {language === "ar"
                    ? "ابدأ نشر وظيفة جديدة مع المتطلبات الأساسية خلال دقائق."
                    : "Publish a new role with core requirements in minutes."}
                </p>
                <button className="mt-3 w-full rounded-lg border border-[var(--panel-border)] px-3 py-2 text-xs hover:bg-[var(--chip-bg)]">
                  {language === "ar" ? "ابدأ الآن" : "Start Now"}
                </button>
              </div>

              <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)]/40 p-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                  <ShoppingCart size={16} className="text-[var(--accent)]" />
                  <span>{language === "ar" ? "اصطد سيرة Headhunt" : "Hunt a Head CV"}</span>
                </div>
                <p className="mt-2 text-xs text-[var(--text-muted)]">
                  {language === "ar"
                    ? "اطلب سيرة مرشح متميز بسرعة عبر أدوات الاستهداف."
                    : "Request high-intent CVs through targeted sourcing."}
                </p>
                <button className="mt-3 w-full rounded-lg border border-[var(--panel-border)] px-3 py-2 text-xs hover:bg-[var(--chip-bg)]">
                  {language === "ar" ? "ابحث الآن" : "Start Hunting"}
                </button>
              </div>

              <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)]/40 p-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                  <FileBarChart2 size={16} className="text-[var(--accent)]" />
                  <span>{language === "ar" ? "وظّف أفضل مرشح" : "Hire Best Applicant"}</span>
                </div>
                <p className="mt-2 text-xs text-[var(--text-muted)]">
                  {language === "ar"
                    ? "انتقل مباشرة إلى أعلى المرشحين وابدأ قرار التوظيف."
                    : "Jump to top-ranked applicants and move to hiring decision."}
                </p>
                <button className="mt-3 w-full rounded-lg border border-[var(--panel-border)] px-3 py-2 text-xs hover:bg-[var(--chip-bg)]">
                  {language === "ar" ? "راجع المرشحين" : "Review Applicants"}
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

  return (
    <p className="text-3xl font-semibold text-[var(--text-primary)]">{display}</p>
  );
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
                  <div
                    className={`h-2 rounded-full ${metric.color}`}
                    style={{ width: `${value ?? 0}%` }}
                  />
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


