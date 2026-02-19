import React, { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { BarChart3, Bookmark, Briefcase, Sparkles, User } from "lucide-react";
import { seekerApi } from "../services/api";
import { useLanguage } from "../contexts/LanguageContext";
import { getApiErrorMessage } from "../utils/apiError";
import { getStoredUser } from "../utils/auth";

const resolveAssetUrl = (url?: string | null) => {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  const base = import.meta.env.VITE_ASSET_BASE_URL || import.meta.env.VITE_API_URL || "";
  return `${base}${url.startsWith("/") ? "" : "/"}${url}`;
};

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
  const aiInsights = useMemo(() => {
    const base = latestInsight?.ai_insights || latestInsight?.insights || {};
    return typeof base === "object" && base ? base : {};
  }, [latestInsight]);

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
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User size={18} className="text-[var(--text-muted)]" />
              <h2 className="text-lg font-semibold">{t("profileInfo")}</h2>
            </div>
            <Link className="btn-ghost" to="/settings">
              {t("editProfile")}
            </Link>
          </div>
          <div className="space-y-2 text-sm">
            <p><span className="text-[var(--text-muted)]">{t("fullName")}: </span>{user?.full_name || "-"}</p>
            <p><span className="text-[var(--text-muted)]">{t("email")}: </span>{user?.email || "-"}</p>
            <p><span className="text-[var(--text-muted)]">{t("phone")}: </span>{user?.phone || "-"}</p>
          </div>
        </div>

        <div className="glass-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 size={18} className="text-[var(--text-muted)]" />
              <h2 className="text-lg font-semibold">{t("cvAiInsights")}</h2>
            </div>
            <Link className="btn-ghost" to="/cv-lab">
              {t("viewFullAnalysis")}
            </Link>
          </div>
          {aiCvsQ.isLoading && (
            <div className="space-y-2">
              <div className="h-4 w-40 animate-pulse rounded-full bg-[var(--border)]" />
              <div className="h-4 w-28 animate-pulse rounded-full bg-[var(--border)]" />
              <div className="h-12 animate-pulse rounded-xl bg-[var(--border)]/60" />
            </div>
          )}
          {aiCvsQ.isError && (
            <div className="text-sm text-red-300">
              {getApiErrorMessage(aiCvsQ.error, t("insightsFailed"))}
              <button className="btn-ghost mt-2" onClick={() => aiCvsQ.refetch()}>
                {t("retry")}
              </button>
            </div>
          )}
          {!aiCvsQ.isLoading && !aiCvsQ.isError && (
            <>
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
                  {typeof atsScore === "number" && (
                    <p className="text-xs text-[var(--text-muted)]">{t("atsScoreHint")}</p>
                  )}
                  <p className="text-[var(--text-muted)]">{summary}</p>
                </div>
              ) : (
                <p className="text-sm text-[var(--text-muted)]">{t("noAiInsightsYet")}</p>
              )}
            </>
          )}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="glass-card p-4">
          <div className="mb-2 flex items-center gap-2">
            <Sparkles size={16} className="text-[var(--text-muted)]" />
            <h3 className="font-semibold">{t("strengths")}</h3>
          </div>
          <ul className="space-y-1 text-sm text-[var(--text-muted)]">
            {strengths.length === 0 && <li>{t("noData")}</li>}
            {strengths.map((item: string, idx: number) => (
              <li key={`${item}-${idx}`}>• {item}</li>
            ))}
          </ul>
        </div>

        <div className="glass-card p-4">
          <div className="mb-2 flex items-center gap-2">
            <Sparkles size={16} className="text-[var(--text-muted)]" />
            <h3 className="font-semibold">{t("weaknesses")}</h3>
          </div>
          <ul className="space-y-1 text-sm text-[var(--text-muted)]">
            {weaknesses.length === 0 && <li>{t("noData")}</li>}
            {weaknesses.map((item: string, idx: number) => (
              <li key={`${item}-${idx}`}>• {item}</li>
            ))}
          </ul>
        </div>

        <div className="glass-card p-4">
          <div className="mb-2 flex items-center gap-2">
            <Sparkles size={16} className="text-[var(--text-muted)]" />
            <h3 className="font-semibold">{t("recommendations")}</h3>
          </div>
          <ul className="space-y-1 text-sm text-[var(--text-muted)]">
            {recommendations.length === 0 && <li>{t("noData")}</li>}
            {recommendations.map((item: string, idx: number) => (
              <li key={`${item}-${idx}`}>• {item}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="glass-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bookmark size={18} className="text-[var(--text-muted)]" />
            <h2 className="text-lg font-semibold">{t("savedJobs")}</h2>
          </div>
          <Link className="btn-ghost" to="/opportunities">
            {t("browseJobs")}
          </Link>
        </div>
        {savedJobsQ.isError && (
          <div className="text-sm text-red-300">
            {getApiErrorMessage(savedJobsQ.error, t("savedJobsLoadFailed"))}
            <button className="btn-ghost mt-2" onClick={() => savedJobsQ.refetch()}>
              {t("retry")}
            </button>
          </div>
        )}
        <div className="space-y-2">
          {savedJobsQ.isLoading && (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, idx) => (
                <div key={idx} className="h-20 animate-pulse rounded-xl bg-[var(--border)]/60" />
              ))}
            </div>
          )}
          {!savedJobsQ.isLoading && savedItems.length === 0 && (
            <p className="text-sm text-[var(--text-muted)]">{t("noData")}</p>
          )}
          {!savedJobsQ.isLoading &&
            savedItems.map((s: any) => {
              const job = s.JobPosting || s.job_posting || {};
              const jobId = Number(job.job_id || s.job_id);
              const imageUrl = resolveAssetUrl(job.job_image_url || job.image_url);
              return (
                <div key={jobId} className="rounded-2xl border border-[var(--border)] p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--glass)]">
                      {imageUrl ? (
                        <img src={imageUrl} alt={job.title} className="h-full w-full object-cover" />
                      ) : (
                        <Briefcase size={20} className="text-[var(--text-muted)]" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{job.title || t("company")}</p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {job.Company?.name || t("company")} · {job.location || t("remote")}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Link className="btn-primary" to="/opportunities" state={{ jobId }}>
                      {t("viewJob")}
                    </Link>
                    <Link className="btn-ghost" to="/opportunities" state={{ jobId }}>
                      {t("apply")}
                    </Link>
                    <button
                      className="btn-ghost text-red-300"
                      aria-label={`${t("remove")} ${job.title || t("company")}`}
                      onClick={() => {
                        if (!window.confirm(t("confirmRemoveSaved"))) return;
                        removeSavedMutation.mutate(jobId);
                      }}
                    >
                      {t("remove")}
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;



