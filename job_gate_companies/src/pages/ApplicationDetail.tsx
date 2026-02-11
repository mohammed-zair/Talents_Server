import React, { useState } from "react";
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
    pending: { en: "Pending", ar: "??? ????????" },
    reviewed: { en: "Reviewed", ar: "??? ????????" },
    shortlisted: { en: "Shortlisted", ar: "??? ????????" },
    accepted: { en: "Accepted", ar: "?????" },
    hired: { en: "Hired", ar: "?????" },
    rejected: { en: "Rejected", ar: "?????" },
  };
  return map[status]?.[language] ?? status;
};

const ApplicationDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [fading, setFading] = useState(false);
  const [refreshingInsights, setRefreshingInsights] = useState(false);
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
      aiScore: "CV Score",
      aiSummary: "Contextual Summary",
      aiStrengths: "Strengths",
      aiWeaknesses: "Weaknesses",
      aiCulture: "Culture & Growth Fit",
      aiTips: "ATS Optimization Tips",
      aiRanking: "Industry Ranking",
      aiJobContext: "Job Context (Cleaned)",
    },
    ar: {
      headerEyebrow: "??? ???????",
      headerTitle: "???? ??????",
      timeline: "?? ??????",
      advance: "??? ????????",
      shortlist: "???????",
      accept: "????",
      hire: "????? ???",
      archive: "???",
      notFound: "?? ??? ?????? ??? ?????.",
      candidate: "??????",
      job: "???????",
      appliedAt: "????? ???????",
      cv: "??? ??????",
      aiTitle: "???? ?????? ??????",
      aiScore: "????? CV",
      aiSummary: "????? ???????",
      aiStrengths: "????? ????",
      aiWeaknesses: "????? ????",
      aiCulture: "????? ????????",
      aiTips: "?????? ATS",
      aiRanking: "????? ??????",
      aiJobContext: "????? ?????? (?????)",
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
      toast.success(language === "ar" ? "?? ????? ??????" : "Status updated");
      queryClient.invalidateQueries({ queryKey: ["application", id] });
      queryClient.invalidateQueries({ queryKey: ["company-applications"] });
      setFading(false);
    },
    onError: () => {
      toast.error(language === "ar" ? "???? ????? ??????" : "Failed to update status");
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

  const insights = data.ai_insights;
  const intelligence = insights?.ai_intelligence;
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
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-6">
        <SectionHeader
          eyebrow={copy.headerEyebrow}
          title={copy.headerTitle}
          subtitle={`${data.candidate.name} ? ${data.job.title}`}
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
                {language === "ar" ? "?????? ???????????? ????????????" : "CV Analysis Snapshot"}
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
                      {intelligence.strategic_analysis.strengths.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {Array.isArray(intelligence?.strategic_analysis?.weaknesses) && (
                  <div>
                    <p className="text-xs text-[var(--text-muted)]">{copy.aiWeaknesses}</p>
                    <ul className="mt-1 list-disc space-y-1 ps-5">
                      {intelligence.strategic_analysis.weaknesses.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {Array.isArray(intelligence?.strategic_analysis?.culture_growth_fit) && (
                  <div>
                    <p className="text-xs text-[var(--text-muted)]">{copy.aiCulture}</p>
                    <ul className="mt-1 list-disc space-y-1 ps-5">
                      {intelligence.strategic_analysis.culture_growth_fit.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {Array.isArray(intelligence?.ats_optimization_tips) && (
                  <div>
                    <p className="text-xs text-[var(--text-muted)]">{copy.aiTips}</p>
                    <ul className="mt-1 list-disc space-y-1 ps-5">
                      {intelligence.ats_optimization_tips.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {Array.isArray(intelligence?.interview_questions) && (
                  <div>
                    <p className="text-xs text-[var(--text-muted)]">
                      {language === "ar" ? "أسئلة المقابلة" : "Interview Questions"}
                    </p>
                    <ul className="mt-1 list-disc space-y-1 ps-5">
                      {intelligence.interview_questions.map((item) => (
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
  );
};

export default ApplicationDetail;
