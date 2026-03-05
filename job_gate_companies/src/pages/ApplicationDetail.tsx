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
    pending: { en: "Pending", ar: "Ù‚ÙŠØ¯ Ø§Ù„Ù…Ø±Ø§Ø¬Ø¹Ø©" },
    reviewed: { en: "Reviewed", ar: "ØªÙ…Øª Ø§Ù„Ù…Ø±Ø§Ø¬Ø¹Ø©" },
    shortlisted: { en: "Shortlisted", ar: "Ù‚Ø§Ø¦Ù…Ø© Ù…Ø®ØªØµØ±Ø©" },
    accepted: { en: "Accepted", ar: "Ù…Ù‚Ø¨ÙˆÙ„" },
    hired: { en: "Hired", ar: "ØªÙ… Ø§Ù„ØªÙˆØ¸ÙŠÙ" },
    rejected: { en: "Rejected", ar: "Ù…Ø±ÙÙˆØ¶" },
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

const normalizeHrHelper = (value: any) => {
  if (!value || typeof value !== "object") return null;
  const decision = String(value.decision || "consider").toLowerCase();
  return {
    decision: ["hire", "consider", "reject"].includes(decision) ? decision : "consider",
    confidence: Number.isFinite(Number(value.confidence))
      ? Math.max(0, Math.min(100, Math.round(Number(value.confidence))))
      : 55,
    recommendation_summary: String(value.recommendation_summary || "").trim(),
    top_strengths: toList(value.top_strengths),
    key_risks: toList(value.key_risks),
    interview_focus: toList(value.interview_focus),
    next_step: String(value.next_step || "").trim(),
    generated_at: String(value.generated_at || ""),
    source: String(value.source || "fresh"),
  };
};

const getHrDecisionMeta = (decision: string, language: "en" | "ar") => {
  if (decision === "hire") {
    return {
      label: language === "ar" ? "توظيف" : "Hire",
      chipClass: "border-emerald-400/40 bg-emerald-500/15 text-emerald-200",
      cardClass: "border-emerald-400/35 bg-emerald-500/10",
    };
  }
  if (decision === "reject") {
    return {
      label: language === "ar" ? "رفض" : "Reject",
      chipClass: "border-rose-400/40 bg-rose-500/15 text-rose-200",
      cardClass: "border-rose-400/35 bg-rose-500/10",
    };
  }
  return {
    label: language === "ar" ? "مراجعة" : "Consider",
    chipClass: "border-amber-400/40 bg-amber-500/15 text-amber-100",
    cardClass: "border-amber-400/35 bg-amber-500/10",
  };
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
        {language === "ar" ? "Ø®Ø±ÙŠØ·Ø© ÙØ¬ÙˆØ§Øª Ø§Ù„ÙƒÙØ§Ø¡Ø§Øª" : "Competency Gap Visualizer"}
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
                  {language === "ar" ? "Ù…Ù‡Ø§Ø±Ø© Ù†Ø§Ù‚ØµØ©" : "Missing skill"}
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
  const [hrHelper, setHrHelper] = useState<any>(null);
  const [hrHelperLoading, setHrHelperLoading] = useState(false);
  const [hrHelperError, setHrHelperError] = useState("");
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
      hrHelperTitle: "AI HR Helper",
      hrRun: "AI HR",
      hrRefresh: "Refresh HR",
      hrAts: "ATS Score",
      hrDecision: "Decision",
      hrConfidence: "Confidence",
      hrSummary: "HR Recommendation",
      hrStrengths: "Top Strengths",
      hrRisks: "Key Risks",
      hrInterviewFocus: "Interview Focus",
      hrNextStep: "Next Step",
      hrGeneratedAt: "Generated",
      hrSource: "Source",
      hrNoData: "No HR recommendation yet.",
      hrLoadFailed: "Failed to load HR recommendation",
    },
    ar: {
      headerEyebrow: "Ø³ÙŠØ± Ø§Ù„Ø¹Ù…Ù„",
      headerTitle: "Ù„ÙˆØ­Ø© Ø§ØªØ®Ø§Ø° Ø§Ù„Ù‚Ø±Ø§Ø±",
      timeline: "ØªØ³Ù„Ø³Ù„ Ø§Ù„Ø­Ø§Ù„Ø©",
      advance: "ØªÙ…Øª Ø§Ù„Ù…Ø±Ø§Ø¬Ø¹Ø©",
      shortlist: "Ù‚Ø§Ø¦Ù…Ø© Ù…Ø®ØªØµØ±Ø©",
      accept: "Ù‚Ø¨ÙˆÙ„",
      hire: "ØªÙˆØ¸ÙŠÙ",
      archive: "Ø±ÙØ¶",
      notFound: "Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ø·Ù„Ø¨ Ø¨Ù‡Ø°Ø§ Ø§Ù„Ø±Ù‚Ù….",
      candidate: "Ø§Ù„Ù…Ø±Ø´Ø­",
      job: "Ø§Ù„ÙˆØ¸ÙŠÙØ©",
      appliedAt: "ØªØ§Ø±ÙŠØ® Ø§Ù„ØªÙ‚Ø¯ÙŠÙ…",
      cv: "Ø¹Ø±Ø¶ Ø§Ù„Ø³ÙŠØ±Ø©",
      aiTitle: "Ø°ÙƒØ§Ø¡ Ø§Ù„Ø³ÙŠØ±Ø© Ø§Ù„Ø°Ø§ØªÙŠØ©",
      viewFullInsights: "Ø¹Ø±Ø¶ Ø¬Ù…ÙŠØ¹ Ø§Ù„ØªØ­Ù„ÙŠÙ„",
      closeInsights: "Ø¥ØºÙ„Ø§Ù‚ Ø§Ù„ØªØ­Ù„ÙŠÙ„",
      fullInsightsTitle: "Ø§Ù„ØªØ­Ù„ÙŠÙ„ Ø§Ù„Ø°ÙƒÙŠ Ø§Ù„ÙƒØ§Ù…Ù„",
      aiScore: "Ø¯Ø±Ø¬Ø© Ø§Ù„Ø³ÙŠØ±Ø©",
      aiSummary: "Ù…Ù„Ø®Øµ Ø³ÙŠØ§Ù‚ÙŠ",
      aiStrengths: "Ù†Ù‚Ø§Ø· Ø§Ù„Ù‚ÙˆØ©",
      aiWeaknesses: "Ù†Ù‚Ø§Ø· Ø§Ù„Ø¶Ø¹Ù",
      aiCulture: "Ø§Ù„Ù…Ù„Ø§Ø¡Ù…Ø© Ø§Ù„Ø«Ù‚Ø§ÙÙŠØ© ÙˆØ§Ù„Ù†Ù…Ùˆ",
      aiTips: "Ù†ØµØ§Ø¦Ø­ ØªØ­Ø³ÙŠÙ† ATS",
      aiRecommendations: "Ø§Ù„ØªÙˆØµÙŠØ§Øª",
      aiInterviewQuestions: "Ø£Ø³Ø¦Ù„Ø© Ø§Ù„Ù…Ù‚Ø§Ø¨Ù„Ø©",
      aiRanking: "ØªØµÙ†ÙŠÙ Ø§Ù„ØµÙ†Ø§Ø¹Ø©",
      aiJobContext: "Ø³ÙŠØ§Ù‚ Ø§Ù„ÙˆØ¸ÙŠÙØ© (Ù…Ù†Ù‚Ø­)",
      aiMethod: "Ø·Ø±ÙŠÙ‚Ø© Ø§Ù„ØªØ­Ù„ÙŠÙ„",
      featuresTitle: "Ù…Ø¤Ø´Ø±Ø§Øª Ø§Ù„Ù…ÙŠØ²Ø§Øª",
      structuredTitle: "Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø³ÙŠØ±Ø© Ø§Ù„Ù…Ù‡ÙŠÙƒÙ„Ø©",
      rawTitle: "Ø§Ø³ØªØ¬Ø§Ø¨Ø© Ø§Ù„Ø°ÙƒØ§Ø¡ Ø§Ù„Ø§ØµØ·Ù†Ø§Ø¹ÙŠ Ø§Ù„Ø®Ø§Ù…",
      whyCandidate: "Ù„Ù…Ø§Ø°Ø§ Ù‡Ø°Ø§ Ø§Ù„Ù…Ø±Ø´Ø­ØŸ",
      pitchLoading: "Ø¬Ø§Ø±ÙŠ ØªÙˆÙ„ÙŠØ¯ Ø§Ù„Ù…Ù„Ø®Øµ Ø§Ù„Ø°ÙƒÙŠ...",
      hrHelperTitle: "Ù…Ø³Ø§Ø¹Ø¯ HR Ø§Ù„Ø°ÙƒÙŠ",
      hrRun: "AI HR",
      hrRefresh: "ØªØ­Ø¯ÙŠØ« HR",
      hrAts: "Ø¯Ø±Ø¬Ø© ATS",
      hrDecision: "Ø§Ù„Ù‚Ø±Ø§Ø±",
      hrConfidence: "Ø§Ù„Ø«Ù‚Ø©",
      hrSummary: "ØªÙˆØµÙŠØ© HR",
      hrStrengths: "Ø£Ø¨Ø±Ø² Ù†Ù‚Ø§Ø· Ø§Ù„Ù‚ÙˆØ©",
      hrRisks: "Ø§Ù„Ù…Ø®Ø§Ø·Ø± Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠØ©",
      hrInterviewFocus: "Ù…Ø­Ø§ÙˆØ± Ø§Ù„Ù…Ù‚Ø§Ø¨Ù„Ø©",
      hrNextStep: "Ø§Ù„Ø®Ø·ÙˆØ© Ø§Ù„ØªØ§Ù„ÙŠØ©",
      hrGeneratedAt: "ØªØ§Ø±ÙŠØ® Ø§Ù„ØªÙˆÙ„ÙŠØ¯",
      hrSource: "Ø§Ù„Ù…ØµØ¯Ø±",
      hrNoData: "Ù„Ø§ ØªÙˆØ¬Ø¯ ØªÙˆØµÙŠØ© HR Ø¨Ø¹Ø¯.",
      hrLoadFailed: "ÙØ´Ù„ ØªØ­Ù…ÙŠÙ„ ØªÙˆØµÙŠØ© HR",
    },
  }[language];

  const { data, isLoading } = useQuery({
    queryKey: ["application", id],
    queryFn: () => companyApi.getApplicationById(id ?? ""),
    enabled: Boolean(id),
  });

  const updateStatus = useMutation({
    mutationFn: ({ applicationId, status }: { applicationId: string; status: ApplicationItem["status"] }) =>
      companyApi.updateApplicationStatus(applicationId, status),
    onSuccess: () => {
      toast.success(language === "ar" ? "ØªÙ… ØªØ­Ø¯ÙŠØ« Ø§Ù„Ø­Ø§Ù„Ø©" : "Status updated");
      queryClient.invalidateQueries({ queryKey: ["application", id] });
      queryClient.invalidateQueries({ queryKey: ["company-applications"] });
      setFading(false);
    },
    onError: () => {
      toast.error(language === "ar" ? "ÙØ´Ù„ ØªØ­Ø¯ÙŠØ« Ø§Ù„Ø­Ø§Ù„Ø©" : "Failed to update status");
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
      toast.success(language === "ar" ? "ØªÙ… ØªØ­Ø¯ÙŠØ« Ø§Ù„ØªØ­Ù„ÙŠÙ„" : "AI insights refreshed");
    } catch (err) {
      toast.error(language === "ar" ? "ÙØ´Ù„ ØªØ­Ø¯ÙŠØ« Ø§Ù„ØªØ­Ù„ÙŠÙ„" : "Failed to refresh insights");
    } finally {
      setRefreshingInsights(false);
    }
  };

  const fetchHrHelper = async (refresh = false) => {
    if (!id) return;
    try {
      setHrHelperLoading(true);
      setHrHelperError("");
      const response = await companyApi.getApplicationHrHelper(id, {
        refresh,
        language,
      });
      const normalized = normalizeHrHelper(response?.hr_helper);
      setHrHelper(normalized);
      if (refresh) {
        toast.success(language === "ar" ? "تم تحديث توصية HR" : "HR recommendation refreshed");
      }
      queryClient.invalidateQueries({ queryKey: ["application", id] });
    } catch (error) {
      setHrHelperError(copy.hrLoadFailed);
      toast.error(copy.hrLoadFailed);
    } finally {
      setHrHelperLoading(false);
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
  const hrHelperFromInsight = normalizeHrHelper(intelligence?.hr_helper);
  const hrDecisionMeta = getHrDecisionMeta(hrHelper?.decision || "consider", language);
  const displayScore = formattedAtsScore ?? formattedIndustryScore ?? null;
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

  useEffect(() => {
    if (hrHelperFromInsight) {
      setHrHelper(hrHelperFromInsight);
    }
  }, [insights?.insight_id]);

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
    { key: "experience", label: language === "ar" ? "Ø§Ù„Ø®Ø¨Ø±Ø§Øª" : "Experience" },
    { key: "skills", label: language === "ar" ? "Ø§Ù„Ù…Ù‡Ø§Ø±Ø§Øª" : "Skills" },
    { key: "projects", label: language === "ar" ? "Ø§Ù„Ù…Ø´Ø§Ø±ÙŠØ¹" : "Projects" },
    { key: "education", label: language === "ar" ? "Ø§Ù„ØªØ¹Ù„ÙŠÙ…" : "Education" },
    { key: "certifications", label: language === "ar" ? "Ø§Ù„Ø´Ù‡Ø§Ø¯Ø§Øª" : "Certifications" },
    { key: "languages", label: language === "ar" ? "Ø§Ù„Ù„ØºØ§Øª" : "Languages" },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-cyan-400/30 bg-[rgba(7,10,15,0.7)] p-6 backdrop-blur-xl shadow-[0_10px_45px_rgba(0,168,232,0.2)]">
        <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">{copy.whyCandidate}</p>
        <p className="mt-3 min-h-[90px] text-sm leading-7 text-slate-100">
          {typedPitch || generatedPitch || copy.pitchLoading}
          {isTypingPitch && <span className="ms-1 inline-block h-4 w-[2px] animate-pulse bg-cyan-300 align-middle" />}
        </p>
      </div>
      <RadarChartCard points={radarPoints} language={language} />
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-6">
        <SectionHeader
          eyebrow={copy.headerEyebrow}
          title={copy.headerTitle}
          subtitle={`${data.candidate.name} â€¢ ${data.job.title}`}
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
          {structured && (
            <div className="mt-6 border-t border-[var(--panel-border)] pt-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
                {language === "ar" ? "Ù…Ù„Ø®Øµ ØªØ­Ù„ÙŠÙ„ Ø§Ù„Ø³ÙŠØ±Ø©" : "CV Analysis Snapshot"}
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

          <div className="mt-6 border-t border-[var(--panel-border)] pt-4">

              <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
                {copy.aiTitle}
              </p>
              <Button
                variant="outline"
                className="group relative mt-2 w-full justify-center overflow-hidden border-cyan-400/40 bg-[linear-gradient(120deg,rgba(34,211,238,0.14),rgba(99,102,241,0.14))] text-cyan-100 shadow-[0_0_20px_rgba(34,211,238,0.18)] hover:border-cyan-300 hover:text-white"
                onClick={refreshInsights}
                disabled={refreshingInsights}
              >
                <span className="pointer-events-none absolute -inset-x-8 top-0 h-full -skew-x-12 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.28),transparent)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <span className="relative flex items-center gap-2">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 1 1-2.64-6.36" />
                    <path d="M21 3v6h-6" />
                  </svg>
                {refreshingInsights
                  ? language === "ar"
                    ? "Ø¬Ø§Ø±ÙŠ Ø§Ù„ØªØ­Ø¯ÙŠØ«..."
                    : "Refreshing..."
                  : language === "ar"
                    ? "ØªØ­Ø¯ÙŠØ« Ø§Ù„ØªØ­Ù„ÙŠÙ„"
                    : "Refresh AI Insights"}
                </span>
              </Button>
              <Button
                variant="outline"
                className="group relative mt-2 w-full justify-center overflow-hidden border-indigo-400/40 bg-[linear-gradient(120deg,rgba(99,102,241,0.16),rgba(34,211,238,0.12))] text-indigo-100 shadow-[0_0_20px_rgba(99,102,241,0.2)] hover:border-indigo-300 hover:text-white"
                onClick={() => setShowInsightsModal(true)}
              >
                <span className="pointer-events-none absolute -inset-x-8 top-0 h-full -skew-x-12 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.28),transparent)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <span className="relative flex items-center gap-2">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  {copy.viewFullInsights}
                </span>
              </Button>
              <div className="mt-4 rounded-2xl border border-cyan-400/25 bg-[linear-gradient(135deg,rgba(5,10,20,0.95),rgba(12,20,32,0.92))] p-4 shadow-[0_10px_36px_rgba(0,168,232,0.12)]">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs uppercase tracking-[0.22em] text-cyan-200">
                    {copy.hrHelperTitle}
                  </p>
                  {hrHelper && (
                    <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase ${hrDecisionMeta.chipClass}`}>
                      {hrDecisionMeta.label}
                    </span>
                  )}
                </div>
                <div className="mt-3 flex gap-2">
                  <Button
                    variant="outline"
                    className="group relative w-full justify-center overflow-hidden border-cyan-400/40 bg-[linear-gradient(120deg,rgba(34,211,238,0.15),rgba(16,185,129,0.15))] text-cyan-100 shadow-[0_0_20px_rgba(34,211,238,0.2)] hover:border-cyan-300 hover:text-white"
                    onClick={() => fetchHrHelper(false)}
                    disabled={hrHelperLoading}
                  >
                    <span className="pointer-events-none absolute -inset-x-8 top-0 h-full -skew-x-12 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.28),transparent)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                    <span className="relative flex items-center gap-2">
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2l2.9 6.1L22 9l-5 4.8 1.2 7.2L12 17.8 5.8 21l1.2-7.2L2 9l7.1-.9L12 2z" />
                      </svg>
                      {hrHelperLoading ? (language === "ar" ? "جارٍ التحميل..." : "Loading...") : copy.hrRun}
                    </span>
                  </Button>
                  <Button
                    variant="outline"
                    className="group relative w-full justify-center overflow-hidden border-violet-400/40 bg-[linear-gradient(120deg,rgba(167,139,250,0.15),rgba(56,189,248,0.15))] text-violet-100 shadow-[0_0_20px_rgba(167,139,250,0.18)] hover:border-violet-300 hover:text-white"
                    onClick={() => fetchHrHelper(true)}
                    disabled={hrHelperLoading}
                  >
                    <span className="pointer-events-none absolute -inset-x-8 top-0 h-full -skew-x-12 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.28),transparent)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                    <span className="relative flex items-center gap-2">
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 12a9 9 0 0 1 15.5-6.4" />
                        <path d="M21 12a9 9 0 0 1-15.5 6.4" />
                        <path d="M18.5 3.5V9h-5.5" />
                        <path d="M5.5 20.5V15H11" />
                      </svg>
                      {copy.hrRefresh}
                    </span>
                  </Button>
                </div>
                {hrHelperError && <p className="mt-2 text-xs text-red-400">{hrHelperError}</p>}
                {hrHelper ? (
                  <div className="mt-4 space-y-3 text-sm text-slate-100">
                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="rounded-xl border border-cyan-400/25 bg-cyan-500/10 p-3">
                        <p className="text-[11px] uppercase tracking-[0.15em] text-cyan-200">{copy.hrAts}</p>
                        <p className="mt-1 text-xl font-semibold text-white">{formattedAtsScore ?? "-"}</p>
                      </div>
                      <div className={`rounded-xl border p-3 ${hrDecisionMeta.cardClass}`}>
                        <p className="text-[11px] uppercase tracking-[0.15em] text-slate-300">{copy.hrDecision}</p>
                        <p className="mt-1 text-lg font-semibold text-white">{hrDecisionMeta.label}</p>
                      </div>
                      <div className="rounded-xl border border-indigo-400/25 bg-indigo-500/10 p-3">
                        <p className="text-[11px] uppercase tracking-[0.15em] text-indigo-200">{copy.hrConfidence}</p>
                        <p className="mt-1 text-xl font-semibold text-white">{hrHelper.confidence}%</p>
                      </div>
                    </div>

                    <div className="rounded-xl border border-indigo-400/20 bg-[rgba(18,25,41,0.8)] p-3">
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-700/50">
                        <div
                          className="h-full rounded-full bg-[linear-gradient(90deg,#38bdf8,#a78bfa)]"
                          style={{ width: `${Math.max(0, Math.min(100, hrHelper.confidence))}%` }}
                        />
                      </div>
                    </div>

                    {hrHelper.recommendation_summary && (
                      <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 p-3">
                        <p className="text-[11px] uppercase tracking-[0.15em] text-cyan-200">{copy.hrSummary}</p>
                        <p className="mt-2 leading-7">{hrHelper.recommendation_summary}</p>
                      </div>
                    )}

                    <div className="grid gap-3 md:grid-cols-3">
                      {hrHelper.top_strengths.length > 0 && (
                        <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3">
                          <p className="text-[11px] uppercase tracking-[0.15em] text-emerald-200">{copy.hrStrengths}</p>
                          <ul className="mt-2 space-y-1 text-xs leading-6">
                            {hrHelper.top_strengths.map((item: string) => (
                              <li key={`hr-s-${item}`} className="rounded-md bg-white/5 px-2 py-1">
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {hrHelper.key_risks.length > 0 && (
                        <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-3">
                          <p className="text-[11px] uppercase tracking-[0.15em] text-rose-200">{copy.hrRisks}</p>
                          <ul className="mt-2 space-y-1 text-xs leading-6">
                            {hrHelper.key_risks.map((item: string) => (
                              <li key={`hr-r-${item}`} className="rounded-md bg-white/5 px-2 py-1">
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {hrHelper.interview_focus.length > 0 && (
                        <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-3">
                          <p className="text-[11px] uppercase tracking-[0.15em] text-amber-100">{copy.hrInterviewFocus}</p>
                          <ul className="mt-2 space-y-1 text-xs leading-6">
                            {hrHelper.interview_focus.map((item: string) => (
                              <li key={`hr-i-${item}`} className="rounded-md bg-white/5 px-2 py-1">
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {hrHelper.next_step && (
                      <div className="rounded-xl border border-violet-400/30 bg-violet-500/10 p-3">
                        <p className="text-[11px] uppercase tracking-[0.15em] text-violet-200">{copy.hrNextStep}</p>
                        <p className="mt-2 text-sm text-white">{hrHelper.next_step}</p>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-slate-300">
                      <span className="rounded-full border border-white/15 bg-white/5 px-2 py-1">
                        {copy.hrSource}: {hrHelper.source || "fresh"}
                      </span>
                      <span className="rounded-full border border-white/15 bg-white/5 px-2 py-1">
                        {copy.hrGeneratedAt}:{" "}
                        {hrHelper.generated_at ? new Date(hrHelper.generated_at).toLocaleString() : "-"}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="mt-3 rounded-lg border border-white/15 bg-white/5 p-3 text-xs text-slate-300">
                    {copy.hrNoData}
                  </p>
                )}
              </div>
              {!insights && (
                <p className="mt-3 text-xs text-[var(--text-muted)]">
                  {language === "ar"
                    ? "Ù„Ø§ ÙŠÙˆØ¬Ø¯ ØªØ­Ù„ÙŠÙ„ Ù…Ø±ØªØ¨Ø· Ø¨Ù‡Ø°Ù‡ Ø§Ù„ÙˆØ¸ÙŠÙØ© Ø¨Ø¹Ø¯. Ø§Ø¶ØºØ· ØªØ­Ø¯ÙŠØ« Ø§Ù„ØªØ­Ù„ÙŠÙ„ Ø£ÙˆÙ„Ø§Ù‹."
                    : "No job-specific AI insight yet. Click Refresh AI Insights first."}
                </p>
              )}
              <div className="mt-3 space-y-3 text-sm text-[var(--text-primary)]">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-cyan-400/30 bg-cyan-500/10 p-3">
                    <p className="text-xs uppercase tracking-[0.15em] text-cyan-200">{copy.aiScore}</p>
                    <p className="mt-1 text-2xl font-semibold text-white">{displayScore ?? "-"}</p>
                  </div>
                  <div className="rounded-xl border border-violet-400/30 bg-violet-500/10 p-3">
                    <p className="text-xs uppercase tracking-[0.15em] text-violet-200">{copy.aiRanking}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-100">
                      {intelligence?.industry_ranking_label || "-"}
                    </p>
                  </div>
                </div>

                {intelligence?.contextual_summary && (
                  <div className="rounded-xl border border-white/15 bg-white/5 p-3">
                    <p className="text-xs uppercase tracking-[0.15em] text-slate-300">{copy.aiSummary}</p>
                    <p className="mt-2 leading-7 text-slate-100">{intelligence.contextual_summary}</p>
                  </div>
                )}

                <div className="grid gap-3 md:grid-cols-2">
                  {Array.isArray(intelligence?.strategic_analysis?.strengths) && (
                    <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3">
                      <p className="text-xs uppercase tracking-[0.15em] text-emerald-200">{copy.aiStrengths}</p>
                      <ul className="mt-2 space-y-1 text-xs leading-6">
                        {intelligence.strategic_analysis.strengths.map((item: string) => (
                          <li key={item} className="rounded-md bg-white/5 px-2 py-1">
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {Array.isArray(intelligence?.strategic_analysis?.weaknesses) && (
                    <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-3">
                      <p className="text-xs uppercase tracking-[0.15em] text-rose-200">{copy.aiWeaknesses}</p>
                      <ul className="mt-2 space-y-1 text-xs leading-6">
                        {intelligence.strategic_analysis.weaknesses.map((item: string) => (
                          <li key={item} className="rounded-md bg-white/5 px-2 py-1">
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  {Array.isArray(intelligence?.strategic_analysis?.culture_growth_fit) && (
                    <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-3">
                      <p className="text-xs uppercase tracking-[0.15em] text-amber-100">{copy.aiCulture}</p>
                      <ul className="mt-2 space-y-1 text-xs leading-6">
                        {intelligence.strategic_analysis.culture_growth_fit.map((item: string) => (
                          <li key={item} className="rounded-md bg-white/5 px-2 py-1">
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {Array.isArray(intelligence?.ats_optimization_tips) && (
                    <div className="rounded-xl border border-sky-400/30 bg-sky-500/10 p-3">
                      <p className="text-xs uppercase tracking-[0.15em] text-sky-200">{copy.aiTips}</p>
                      <ul className="mt-2 space-y-1 text-xs leading-6">
                        {intelligence.ats_optimization_tips.map((item: string) => (
                          <li key={item} className="rounded-md bg-white/5 px-2 py-1">
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {Array.isArray(intelligence?.interview_questions) && (
                  <div className="rounded-xl border border-indigo-400/30 bg-indigo-500/10 p-3">
                    <p className="text-xs uppercase tracking-[0.15em] text-indigo-200">{copy.aiInterviewQuestions}</p>
                    <ul className="mt-2 space-y-1 text-xs leading-6">
                      {intelligence.interview_questions.map((item: string) => (
                        <li key={item} className="rounded-md bg-white/5 px-2 py-1">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {insights?.cleaned_job_description && (
                  <div className="rounded-xl border border-white/15 bg-white/5 p-3">
                    <p className="text-xs uppercase tracking-[0.15em] text-slate-300">{copy.aiJobContext}</p>
                    <p className="mt-2 whitespace-pre-wrap text-xs text-slate-200">
                      {insights.cleaned_job_description}
                    </p>
                  </div>
                )}
              </div>
            </div>
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



