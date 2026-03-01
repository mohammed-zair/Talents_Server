import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import SectionHeader from "../components/shared/SectionHeader";
import Card from "../components/shared/Card";
import Button from "../components/shared/Button";
import Skeleton from "../components/shared/Skeleton";
import { companyApi } from "../services/api/api";
import type { ApplicationItem } from "../types";
import { useLanguage } from "../contexts/LanguageContext";

const getApiBaseUrl = () =>
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000/api";

const stages: Array<ApplicationItem["status"]> = [
  "pending",
  "reviewed",
  "shortlisted",
  "accepted",
  "hired",
  "rejected",
];

const statusLabel = (status: ApplicationItem["status"], language: "en" | "ar") => {
  const map = {
    pending: { en: "Pending", ar: "قيد المراجعة" },
    reviewed: { en: "Reviewed", ar: "تمت المراجعة" },
    shortlisted: { en: "Shortlisted", ar: "قائمة مختصرة" },
    accepted: { en: "Accepted", ar: "مقبول" },
    hired: { en: "Hired", ar: "تم التوظيف" },
    rejected: { en: "Rejected", ar: "مرفوض" },
  };
  return map[status]?.[language] ?? status;
};

type MatrixPoint = {
  skill: string;
  value: number;
  target: number;
  missing: boolean;
};

const buildFallbackMatrix = (application: ApplicationItem): MatrixPoint[] => {
  const skillsBag = new Set((application.candidate_skills || []).map((s) => s.toLowerCase()));
  const reqSource = `${application.job.title} ${(application.ai_insights?.cleaned_job_description || "")}`.toLowerCase();
  const known = [
    "react",
    "typescript",
    "javascript",
    "node",
    "python",
    "sql",
    "aws",
    "docker",
  ];
  const required = known.filter((skill) => reqSource.includes(skill)).slice(0, 6);
  const normalizedRequired = required.length ? required : ["react", "typescript", "sql", "communication", "aws", "docker"];
  return normalizedRequired.map((skill) => {
    const matched = Array.from(skillsBag).some((candidateSkill) => candidateSkill.includes(skill));
    return {
      skill,
      value: matched ? 84 : 26,
      target: 100,
      missing: !matched,
    };
  });
};

const parseJsonMaybe = (value: unknown) => {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const toList = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.filter(Boolean).map((item: unknown) => String(item));
};

const RadarChartCard: React.FC<{
  points: MatrixPoint[];
  language: "en" | "ar";
}> = ({ points, language }) => {
  const size = 280;
  const center = size / 2;
  const radius = 92;
  const rings = [0.25, 0.5, 0.75, 1];

  const toPoint = (idx: number, value: number, total: number) => {
    const angle = (Math.PI * 2 * idx) / total - Math.PI / 2;
    const r = (Math.max(0, Math.min(100, value)) / 100) * radius;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  const polyline = points
    .map((point, idx) => toPoint(idx, point.value, points.length))
    .map((p) => `${p.x},${p.y}`)
    .join(" ");

  return (
    <div className="rounded-3xl border border-cyan-400/25 bg-[rgba(7,10,15,0.72)] p-4 shadow-[0_0_30px_rgba(0,168,232,0.25)]">
      <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">
        {language === "ar" ? "خريطة فجوات الكفاءات" : "Competency Gap Visualizer"}
      </p>
      <div className="mt-4 flex flex-col gap-4 lg:flex-row">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mx-auto">
          <defs>
            <linearGradient id="radarNeon" x1="0%" x2="100%">
              <stop offset="0%" stopColor="#00A8E8" />
              <stop offset="100%" stopColor="#20E3B2" />
            </linearGradient>
          </defs>
          {rings.map((ring) => (
            <circle
              key={ring}
              cx={center}
              cy={center}
              r={radius * ring}
              fill="none"
              stroke="rgba(255,255,255,0.15)"
              strokeWidth={1}
            />
          ))}
          {points.map((_, idx) => {
            const endpoint = toPoint(idx, 100, points.length);
            return (
              <line
                key={`axis-${idx}`}
                x1={center}
                y1={center}
                x2={endpoint.x}
                y2={endpoint.y}
                stroke="rgba(255,255,255,0.2)"
                strokeWidth={1}
              />
            );
          })}
          <polygon points={polyline} fill="rgba(0,168,232,0.2)" stroke="url(#radarNeon)" strokeWidth={2.5} />
          {points.map((point, idx) => {
            const p = toPoint(idx, point.value, points.length);
            return (
              <circle
                key={`dot-${point.skill}`}
                cx={p.x}
                cy={p.y}
                r={4}
                fill={point.missing ? "#ff4d6d" : "#00A8E8"}
                style={point.missing ? { filter: "drop-shadow(0 0 8px #ff4d6d)" } : undefined}
              />
            );
          })}
        </svg>
        <div className="flex-1 space-y-2">
          {points.map((point) => (
            <div
              key={point.skill}
              className={`rounded-2xl border p-2 text-xs ${
                point.missing
                  ? "border-red-400/40 bg-red-500/10 text-red-200 shadow-[0_0_16px_rgba(255,77,109,0.45)]"
                  : "border-cyan-500/30 bg-cyan-500/10 text-slate-100"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold">{point.skill}</span>
                <span>{point.value}%</span>
              </div>
              {point.missing && (
                <p className="mt-1 text-[11px]">
                  {language === "ar" ? "مهارة ناقصة" : "Missing skill"}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

const ApplicationDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [fading, setFading] = useState(false);
  const [refreshingInsights, setRefreshingInsights] = useState(false);
  const [typedPitch, setTypedPitch] = useState("");
  const [isTypingPitch, setIsTypingPitch] = useState(false);
  const [showInsightsModal, setShowInsightsModal] = useState(false);
  const { language } = useLanguage();
  const apiBase = getApiBaseUrl();

  const copy = {
    en: {
      headerEyebrow: "Applications Workflow",
      headerTitle: "Decision Side-Panel",
      timeline: "Status Timeline",
      advance: "Mark Reviewed",
      shortlist: "Shortlist",
      accept: "Accept",
      hire: "Hire",
      archive: "Reject",
      notFound: "No application found.",
      candidate: "Candidate",
      job: "Job",
      appliedAt: "Applied",
      cv: "Open CV",
      aiTitle: "AI CV Intelligence",
      viewFullInsights: "View Full AI Insights",
      closeInsights: "Close Insights",
      fullInsightsTitle: "Full AI Analysis",
      aiScore: "CV Score",
      aiSummary: "Contextual Summary",
      aiStrengths: "Strengths",
      aiWeaknesses: "Weaknesses",
      aiCulture: "Culture & Growth Fit",
      aiTips: "ATS Optimization Tips",
      aiRecommendations: "Recommendations",
      aiInterviewQuestions: "Interview Questions",
      aiRanking: "Industry Ranking",
      aiJobContext: "Job Context (Cleaned)",
      aiMethod: "Analysis Method",
      featuresTitle: "Features Analytics",
      structuredTitle: "Structured CV Data",
      rawTitle: "Raw AI Response",
      whyCandidate: "Why This Candidate?",
      pitchLoading: "Generating smart pitch...",
    },
    ar: {
      headerEyebrow: "سير العمل",
      headerTitle: "لوحة اتخاذ القرار",
      timeline: "تسلسل الحالة",
      advance: "تمت المراجعة",
      shortlist: "قائمة مختصرة",
      accept: "قبول",
      hire: "توظيف",
      archive: "رفض",
      notFound: "لا يوجد طلب بهذا الرقم.",
      candidate: "المرشح",
      job: "الوظيفة",
      appliedAt: "تاريخ التقديم",
      cv: "عرض السيرة",
      aiTitle: "ذكاء السيرة الذاتية",
      viewFullInsights: "عرض جميع التحليل",
      closeInsights: "إغلاق التحليل",
      fullInsightsTitle: "التحليل الذكي الكامل",
      aiScore: "درجة السيرة",
      aiSummary: "ملخص سياقي",
      aiStrengths: "نقاط القوة",
      aiWeaknesses: "نقاط الضعف",
      aiCulture: "الملاءمة الثقافية والنمو",
      aiTips: "نصائح تحسين ATS",
      aiRecommendations: "التوصيات",
      aiInterviewQuestions: "أسئلة المقابلة",
      aiRanking: "تصنيف الصناعة",
      aiJobContext: "سياق الوظيفة (منقح)",
      aiMethod: "طريقة التحليل",
      featuresTitle: "مؤشرات الميزات",
      structuredTitle: "بيانات السيرة المهيكلة",
      rawTitle: "استجابة الذكاء الاصطناعي الخام",
      whyCandidate: "لماذا هذا المرشح؟",
      pitchLoading: "جاري توليد الملخص الذكي...",
    },
  }[language];

  const { data, isLoading } = useQuery({
    queryKey: ["application", id],
    queryFn: () => companyApi.getApplicationById(id ?? ""),
    enabled: Boolean(id),
  });

  const generatePitch = useMutation({
    mutationFn: ({ cvId, jobId }: { cvId: string; jobId: string }) =>
      companyApi.generateSmartMatchPitch({
        cv_id: cvId,
        job_id: jobId,
        language,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["application", id] });
    },
  });

  const updateStatus = useMutation({
    mutationFn: ({ applicationId, status }: { applicationId: string; status: ApplicationItem["status"] }) =>
      companyApi.updateApplicationStatus(applicationId, status),
    onSuccess: () => {
      toast.success(language === "ar" ? "تم تحديث الحالة" : "Status updated");
      queryClient.invalidateQueries({ queryKey: ["application", id] });
      queryClient.invalidateQueries({ queryKey: ["company-applications"] });
      setFading(false);
    },
    onError: () => {
      toast.error(language === "ar" ? "فشل تحديث الحالة" : "Failed to update status");
      setFading(false);
    },
  });

  const handleAction = (status: ApplicationItem["status"]) => {
    if (!id) return;
    setFading(true);
    updateStatus.mutate({ applicationId: id, status });
  };

  const refreshInsights = async () => {
    if (!id) return;
    try {
      setRefreshingInsights(true);
      await companyApi.refreshApplicationInsights(id);
      queryClient.invalidateQueries({ queryKey: ["application", id] });
      toast.success(language === "ar" ? "تم تحديث التحليل" : "AI insights refreshed");
    } catch (err) {
      toast.error(language === "ar" ? "فشل تحديث التحليل" : "Failed to refresh insights");
    } finally {
      setRefreshingInsights(false);
    }
  };

  const insights = data?.ai_insights;
  const intelligence = parseJsonMaybe(insights?.ai_intelligence) as any;
  const structuredFromInsight = parseJsonMaybe(insights?.structured_data) as any;
  const featuresFromInsight = parseJsonMaybe(insights?.features_analytics) as any;
  const structuredForModal = structuredFromInsight || data?.cv_structured_data || null;
  const featuresForModal = featuresFromInsight || data?.cv_features || null;
  const modalSummary =
    intelligence?.summary ||
    intelligence?.contextual_summary ||
    intelligence?.professional_summary ||
    "";
  const modalStrengths = toList(
    intelligence?.strengths || intelligence?.strategic_analysis?.strengths
  );
  const modalWeaknesses = toList(
    intelligence?.weaknesses || intelligence?.strategic_analysis?.weaknesses
  );
  const modalRecommendations = toList(
    intelligence?.recommendations || intelligence?.ats_optimization_tips
  );
  const modalInterviewQuestions = toList(intelligence?.interview_questions);
  const formattedAtsScore =
    typeof insights?.ats_score === "number"
      ? insights.ats_score
      : typeof featuresForModal?.ats_score === "number"
        ? featuresForModal.ats_score
        : null;
  const formattedIndustryScore =
    typeof insights?.industry_ranking_score === "number"
      ? insights.industry_ranking_score
      : typeof intelligence?.industry_ranking_score === "number"
        ? intelligence.industry_ranking_score
        : null;
  const generatedPitch =
    insights?.smart_match_pitch ||
    intelligence?.smart_match_pitch ||
    "";
  const matrixFromInsights = Array.isArray(intelligence?.competency_matrix)
    ? intelligence?.competency_matrix
    : [];
  const radarPoints: MatrixPoint[] = useMemo(() => {
    if (matrixFromInsights.length) {
      return matrixFromInsights.slice(0, 6).map((item: any) => ({
        skill: item.required_skill,
        value: Number(item.candidate_proficiency ?? 0),
        target: Number(item.job_target ?? 100),
        missing: Boolean(item.is_missing ?? Number(item.candidate_proficiency ?? 0) < 60),
      }));
    }
    return data ? buildFallbackMatrix(data) : [];
  }, [matrixFromInsights, data]);

  useEffect(() => {
    if (!generatedPitch && data?.cv?.id && data?.job?.id && !generatePitch.isPending) {
      generatePitch.mutate({ cvId: data.cv.id, jobId: data.job.id });
    }
  }, [
    generatedPitch,
    data?.cv?.id,
    data?.job?.id,
    generatePitch.isPending,
  ]);

  useEffect(() => {
    if (!generatedPitch) {
      setTypedPitch("");
      setIsTypingPitch(false);
      return;
    }
    setTypedPitch("");
    setIsTypingPitch(true);
    let idx = 0;
    const timer = window.setInterval(() => {
      idx += 2;
      setTypedPitch(generatedPitch.slice(0, idx));
      if (idx >= generatedPitch.length) {
        window.clearInterval(timer);
        setIsTypingPitch(false);
      }
    }, 18);
    return () => window.clearInterval(timer);
  }, [generatedPitch]);

  if (isLoading) {
    return (
      <Card>
        <Skeleton className="h-36" />
        <Skeleton className="mt-4 h-24" />
      </Card>
    );
  }

  if (!data) {
    return <Card>{copy.notFound}</Card>;
  }
  const structured = data.cv_structured_data ?? null;
  const structuredSections = [
    { key: "experience", label: language === "ar" ? "الخبرات" : "Experience" },
    { key: "skills", label: language === "ar" ? "المهارات" : "Skills" },
    { key: "projects", label: language === "ar" ? "المشاريع" : "Projects" },
    { key: "education", label: language === "ar" ? "التعليم" : "Education" },
    { key: "certifications", label: language === "ar" ? "الشهادات" : "Certifications" },
    { key: "languages", label: language === "ar" ? "اللغات" : "Languages" },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-cyan-400/30 bg-[rgba(7,10,15,0.7)] p-6 backdrop-blur-xl shadow-[0_10px_45px_rgba(0,168,232,0.2)]">
        <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">{copy.whyCandidate}</p>
        <p className="mt-3 min-h-[90px] text-sm leading-7 text-slate-100">
          {typedPitch || (generatePitch.isPending ? copy.pitchLoading : generatedPitch || copy.pitchLoading)}
          {isTypingPitch && <span className="ms-1 inline-block h-4 w-[2px] animate-pulse bg-cyan-300 align-middle" />}
        </p>
      </div>
      <RadarChartCard points={radarPoints} language={language} />
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-6">
        <SectionHeader
          eyebrow={copy.headerEyebrow}
          title={copy.headerTitle}
          subtitle={`${data.candidate.name} • ${data.job.title}`}
        />
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                {data.candidate.name}
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                {data.candidate.email || data.candidate.phone || "-"}
              </p>
            </div>
            <span className="rounded-full bg-[var(--chip-bg)] px-3 py-1 text-xs font-semibold text-[var(--text-primary)]">
              {statusLabel(data.status, language)}
            </span>
          </div>

          <div className="mt-6 space-y-4">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
              {copy.timeline}
            </p>
            <div className="relative space-y-4 ps-6">
              <div className="absolute inset-y-0 start-2 w-px bg-[var(--panel-border)]" />
              {stages.map((stage, index) => (
                <div key={stage} className="flex items-center gap-3">
                  <div
                    className={`h-3 w-3 rounded-full ${
                      stages.indexOf(data.status) >= index
                        ? "bg-[var(--accent)]"
                        : "bg-slate-300"
                    }`}
                  />
                  <span className="text-sm text-[var(--text-primary)]">
                    {statusLabel(stage, language)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 text-xs text-[var(--text-muted)]">
            {copy.appliedAt}: {data.submittedAt
              ? new Date(data.submittedAt).toLocaleDateString()
              : "-"}
          </div>

          <motion.div
            className="mt-6 flex flex-wrap gap-2"
            animate={{ opacity: fading ? 0.4 : 1 }}
          >
            <Button onClick={() => handleAction("reviewed")}>{copy.advance}</Button>
            <Button variant="outline" onClick={() => handleAction("shortlisted")}>
              {copy.shortlist}
            </Button>
            <Button variant="outline" onClick={() => handleAction("accepted")}>
              {copy.accept}
            </Button>
            <Button variant="outline" onClick={() => handleAction("hired")}>
              {copy.hire}
            </Button>
            <Button
              variant="outline"
              onClick={() => handleAction("rejected")}
              className="border-red-300 text-red-500"
            >
              {copy.archive}
            </Button>
          </motion.div>
        </Card>
      </div>

      <Card>
        <div className="space-y-3 text-sm text-[var(--text-primary)]">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">{copy.candidate}</p>
            <p className="mt-2">{data.candidate.name}</p>
            <p className="text-xs text-[var(--text-muted)]">{data.candidate.email || "-"}</p>
            <p className="text-xs text-[var(--text-muted)]">{data.candidate.phone || "-"}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">{copy.job}</p>
            <p className="mt-2">{data.job.title}</p>
            <p className="text-xs text-[var(--text-muted)]">{data.job.location || "-"}</p>
          </div>
          <Button
            variant="outline"
            className="justify-center"
            onClick={() => {
              window.open(`${apiBase}/companies/company/applications/${data.id}/cv`, "_blank");
            }}
          >
            {copy.cv}
          </Button>
          <Button
            variant="outline"
            className="justify-center"
            onClick={() => {
              if (data.candidate.id) {
                window.open(
                  `https://talents-we-trust.tech/profile/${data.candidate.id}`,
                  "_blank"
                );
              }
            }}
            disabled={!data.candidate.id}
          >
            {language === "ar" ? "عرض الملف" : "View profile"}
          </Button>



          {structured && (
            <div className="mt-6 border-t border-[var(--panel-border)] pt-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
                {language === "ar" ? "ملخص تحليل السيرة" : "CV Analysis Snapshot"}
              </p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {structuredSections.map((section) => {
                  const value = (structured as any)[section.key];
                  if (!value || (Array.isArray(value) && value.length === 0)) {
                    return null;
                  }
                  return (
                    <div
                      key={section.key}
                      className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)]/60 p-3"
                    >
                      <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
                        {section.label}
                      </p>
                      {Array.isArray(value) ? (
                        <ul className="mt-2 list-disc space-y-1 ps-5 text-xs text-[var(--text-primary)]">
                          {value.slice(0, 4).map((item: any, idx: number) => (
                            <li key={`${section.key}-${idx}`}>
                              {typeof item === "string"
                                ? item
                                : item?.title ||
                                  item?.degree ||
                                  item?.position ||
                                  item?.name ||
                                  JSON.stringify(item)}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2 text-xs text-[var(--text-primary)]">
                          {typeof value === "string" ? value : JSON.stringify(value)}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {insights && (
            <div className="mt-6 border-t border-[var(--panel-border)] pt-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
                {copy.aiTitle}
              </p>
              <Button
                variant="outline"
                className="mt-2 w-full justify-center"
                onClick={refreshInsights}
                disabled={refreshingInsights}
              >
                {refreshingInsights
                  ? language === "ar"
                    ? "جاري التحديث..."
                    : "Refreshing..."
                  : language === "ar"
                    ? "تحديث التحليل"
                    : "Refresh AI Insights"}
              </Button>
              <Button
                variant="outline"
                className="mt-2 w-full justify-center"
                onClick={() => setShowInsightsModal(true)}
              >
                {copy.viewFullInsights}
              </Button>
              <div className="mt-3 space-y-3 text-sm text-[var(--text-primary)]">
                <div className="rounded-lg border border-[var(--panel-border)] bg-[var(--panel-bg)] p-3">
                  <p className="text-xs text-[var(--text-muted)]">{copy.aiScore}</p>
                  <p className="text-xl font-semibold">
                    {insights.ats_score ?? intelligence?.industry_ranking_score ?? "-"}
                  </p>
                </div>
                {intelligence?.industry_ranking_label && (
                  <div>
                    <p className="text-xs text-[var(--text-muted)]">{copy.aiRanking}</p>
                    <p>{intelligence.industry_ranking_label}</p>
                  </div>
                )}
                {intelligence?.contextual_summary && (
                  <div>
                    <p className="text-xs text-[var(--text-muted)]">{copy.aiSummary}</p>
                    <p>{intelligence.contextual_summary}</p>
                  </div>
                )}
                {Array.isArray(intelligence?.strategic_analysis?.strengths) && (
                  <div>
                    <p className="text-xs text-[var(--text-muted)]">{copy.aiStrengths}</p>
                    <ul className="mt-1 list-disc space-y-1 ps-5">
                      {intelligence.strategic_analysis.strengths.map((item: string) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {Array.isArray(intelligence?.strategic_analysis?.weaknesses) && (
                  <div>
                    <p className="text-xs text-[var(--text-muted)]">{copy.aiWeaknesses}</p>
                    <ul className="mt-1 list-disc space-y-1 ps-5">
                      {intelligence.strategic_analysis.weaknesses.map((item: string) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {Array.isArray(intelligence?.strategic_analysis?.culture_growth_fit) && (
                  <div>
                    <p className="text-xs text-[var(--text-muted)]">{copy.aiCulture}</p>
                    <ul className="mt-1 list-disc space-y-1 ps-5">
                      {intelligence.strategic_analysis.culture_growth_fit.map((item: string) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {Array.isArray(intelligence?.ats_optimization_tips) && (
                  <div>
                    <p className="text-xs text-[var(--text-muted)]">{copy.aiTips}</p>
                    <ul className="mt-1 list-disc space-y-1 ps-5">
                      {intelligence.ats_optimization_tips.map((item: string) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {Array.isArray(intelligence?.interview_questions) && (
                  <div>
                    <p className="text-xs text-[var(--text-muted)]">{copy.aiInterviewQuestions}</p>
                    <ul className="mt-1 list-disc space-y-1 ps-5">
                      {intelligence.interview_questions.map((item: string) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {insights.cleaned_job_description && (
                  <div>
                    <p className="text-xs text-[var(--text-muted)]">{copy.aiJobContext}</p>
                    <p className="text-xs text-[var(--text-muted)] whitespace-pre-wrap">
                      {insights.cleaned_job_description}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </Card>
      </div>

      {showInsightsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-3xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-base font-semibold text-[var(--text-primary)]">
                {copy.fullInsightsTitle}
              </p>
              <Button variant="outline" onClick={() => setShowInsightsModal(false)}>
                {copy.closeInsights}
              </Button>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-[var(--panel-border)] p-3">
                <p className="text-xs text-[var(--text-muted)]">{copy.aiScore}</p>
                <p className="text-xl font-semibold">{formattedAtsScore ?? "-"}</p>
              </div>
              <div className="rounded-xl border border-[var(--panel-border)] p-3">
                <p className="text-xs text-[var(--text-muted)]">{copy.aiRanking}</p>
                <p className="text-xl font-semibold">
                  {formattedIndustryScore ?? insights?.industry_ranking_label ?? "-"}
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-4">
              {insights?.analysis_method && (
                <div className="rounded-xl border border-[var(--panel-border)] p-3">
                  <p className="text-xs text-[var(--text-muted)]">{copy.aiMethod}</p>
                  <p className="text-sm text-[var(--text-primary)]">{insights.analysis_method}</p>
                </div>
              )}

              {modalSummary && (
                <div className="rounded-xl border border-[var(--panel-border)] p-3">
                  <p className="text-xs text-[var(--text-muted)]">{copy.aiSummary}</p>
                  <p className="text-sm text-[var(--text-primary)]">{modalSummary}</p>
                </div>
              )}

              {modalStrengths.length > 0 && (
                <div className="rounded-xl border border-[var(--panel-border)] p-3">
                  <p className="text-xs text-[var(--text-muted)]">{copy.aiStrengths}</p>
                  <ul className="mt-2 list-disc space-y-1 ps-5 text-sm text-[var(--text-primary)]">
                    {modalStrengths.map((item: string) => (
                      <li key={`strength-${item}`}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {modalWeaknesses.length > 0 && (
                <div className="rounded-xl border border-[var(--panel-border)] p-3">
                  <p className="text-xs text-[var(--text-muted)]">{copy.aiWeaknesses}</p>
                  <ul className="mt-2 list-disc space-y-1 ps-5 text-sm text-[var(--text-primary)]">
                    {modalWeaknesses.map((item: string) => (
                      <li key={`weakness-${item}`}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {modalRecommendations.length > 0 && (
                <div className="rounded-xl border border-[var(--panel-border)] p-3">
                  <p className="text-xs text-[var(--text-muted)]">{copy.aiRecommendations}</p>
                  <ul className="mt-2 list-disc space-y-1 ps-5 text-sm text-[var(--text-primary)]">
                    {modalRecommendations.map((item: string) => (
                      <li key={`rec-${item}`}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {modalInterviewQuestions.length > 0 && (
                <div className="rounded-xl border border-[var(--panel-border)] p-3">
                  <p className="text-xs text-[var(--text-muted)]">{copy.aiInterviewQuestions}</p>
                  <ul className="mt-2 list-disc space-y-1 ps-5 text-sm text-[var(--text-primary)]">
                    {modalInterviewQuestions.map((item: string) => (
                      <li key={`question-${item}`}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {insights?.cleaned_job_description && (
                <div className="rounded-xl border border-[var(--panel-border)] p-3">
                  <p className="text-xs text-[var(--text-muted)]">{copy.aiJobContext}</p>
                  <pre className="mt-2 whitespace-pre-wrap text-xs text-[var(--text-primary)]">
                    {insights.cleaned_job_description}
                  </pre>
                </div>
              )}

              {structuredForModal && (
                <div className="rounded-xl border border-[var(--panel-border)] p-3">
                  <p className="text-xs text-[var(--text-muted)]">{copy.structuredTitle}</p>
                  <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs text-[var(--text-primary)]">
                    {JSON.stringify(structuredForModal, null, 2)}
                  </pre>
                </div>
              )}

              {featuresForModal && (
                <div className="rounded-xl border border-[var(--panel-border)] p-3">
                  <p className="text-xs text-[var(--text-muted)]">{copy.featuresTitle}</p>
                  <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs text-[var(--text-primary)]">
                    {JSON.stringify(featuresForModal, null, 2)}
                  </pre>
                </div>
              )}

              {insights?.ai_raw_response && (
                <div className="rounded-xl border border-[var(--panel-border)] p-3">
                  <p className="text-xs text-[var(--text-muted)]">{copy.rawTitle}</p>
                  <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs text-[var(--text-primary)]">
                    {JSON.stringify(insights.ai_raw_response, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApplicationDetail;
