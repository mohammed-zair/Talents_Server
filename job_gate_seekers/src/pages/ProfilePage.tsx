import React, { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { seekerApi } from "../services/api";
import { useLanguage } from "../contexts/LanguageContext";
import { getStoredUser } from "../utils/auth";

const ProfilePage: React.FC = () => {
  const { t } = useLanguage();
  const user = getStoredUser();
  const queryClient = useQueryClient();

  const savedJobsQ = useQuery({ queryKey: ["saved-jobs"], queryFn: seekerApi.getSavedJobs });
  const aiCvsQ = useQuery({ queryKey: ["ai-cvs"], queryFn: seekerApi.getUserAiCvs });

  const savedItems = useMemo(
    () => (Array.isArray(savedJobsQ.data) ? savedJobsQ.data : []),
    [savedJobsQ.data]
  );

  const aiCvItems = useMemo(
    () => (Array.isArray(aiCvsQ.data) ? aiCvsQ.data : []),
    [aiCvsQ.data]
  );

  const latestInsight = aiCvItems[0] || null;
  const aiInsights = latestInsight?.ai_insights || latestInsight?.insights || {};

  const strengths = useMemo(() => {
    const list = aiInsights?.strengths || latestInsight?.strengths || [];
    return Array.isArray(list) ? list : [];
  }, [aiInsights, latestInsight]);

  const weaknesses = useMemo(() => {
    const list = aiInsights?.weaknesses || latestInsight?.weaknesses || [];
    return Array.isArray(list) ? list : [];
  }, [aiInsights, latestInsight]);

  const recommendations = useMemo(() => {
    const list = aiInsights?.recommendations || latestInsight?.recommendations || [];
    return Array.isArray(list) ? list : [];
  }, [aiInsights, latestInsight]);

  const summary =
    aiInsights?.summary ||
    latestInsight?.summary ||
    latestInsight?.analysis_summary ||
    t("noAiInsightsYet");

  const atsScore =
    latestInsight?.ats_score ??
    aiInsights?.ats_score ??
    null;

  const removeSavedMutation = useMutation({
    mutationFn: (jobId: number) => seekerApi.removeSavedJob(jobId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["saved-jobs"] }),
  });

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="glass-card p-4">
          <h2 className="mb-3 text-lg font-semibold">{t("profileInfo")}</h2>
          <div className="space-y-2 text-sm">
            <p><span className="text-[var(--text-muted)]">{t("fullName")}: </span>{user?.full_name || "-"}</p>
            <p><span className="text-[var(--text-muted)]">{t("email")}: </span>{user?.email || "-"}</p>
            <p><span className="text-[var(--text-muted)]">{t("phone")}: </span>{user?.phone || "-"}</p>
          </div>
        </div>

        <div className="glass-card p-4">
          <h2 className="mb-3 text-lg font-semibold">{t("cvAiInsights")}</h2>
          {latestInsight ? (
            <div className="space-y-2 text-sm">
              <p>
                <span className="text-[var(--text-muted)]">{t("cvPreview")}: </span>
                {latestInsight.title || `CV #${latestInsight.cv_id || "-"}`}
              </p>
              <p>
                <span className="text-[var(--text-muted)]">{t("atsHealth")}: </span>
                {typeof atsScore === "number" ? `${atsScore}/100` : "-"}
              </p>
              <p className="text-[var(--text-muted)]">{summary}</p>
            </div>
          ) : (
            <p className="text-sm text-[var(--text-muted)]">{t("noAiInsightsYet")}</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="glass-card p-4">
          <h3 className="mb-2 font-semibold">{t("strengths")}</h3>
          <ul className="space-y-1 text-sm text-[var(--text-muted)]">
            {strengths.length === 0 && <li>{t("noData")}</li>}
            {strengths.map((item: string, idx: number) => (
              <li key={`${item}-${idx}`}>• {item}</li>
            ))}
          </ul>
        </div>

        <div className="glass-card p-4">
          <h3 className="mb-2 font-semibold">{t("weaknesses")}</h3>
          <ul className="space-y-1 text-sm text-[var(--text-muted)]">
            {weaknesses.length === 0 && <li>{t("noData")}</li>}
            {weaknesses.map((item: string, idx: number) => (
              <li key={`${item}-${idx}`}>• {item}</li>
            ))}
          </ul>
        </div>

        <div className="glass-card p-4">
          <h3 className="mb-2 font-semibold">{t("recommendations")}</h3>
          <ul className="space-y-1 text-sm text-[var(--text-muted)]">
            {recommendations.length === 0 && <li>{t("noData")}</li>}
            {recommendations.map((item: string, idx: number) => (
              <li key={`${item}-${idx}`}>• {item}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="glass-card p-4">
        <h2 className="mb-3 text-lg font-semibold">{t("savedJobs")}</h2>
        <div className="space-y-2">
          {savedItems.length === 0 && (
            <p className="text-sm text-[var(--text-muted)]">{t("noData")}</p>
          )}
          {savedItems.map((s: any) => (
            <div key={s.job_id || s.JobPosting?.job_id} className="rounded-xl border border-[var(--border)] p-3">
              <p className="font-medium">{s.JobPosting?.title || t("company")}</p>
              <button className="btn-ghost mt-2" onClick={() => removeSavedMutation.mutate(Number(s.JobPosting?.job_id || s.job_id))}>
                {t("remove")}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
