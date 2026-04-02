import React, { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { seekerApi } from "../services/api";
import { useLanguage } from "../contexts/LanguageContext";
import { getApiErrorMessage } from "../utils/apiError";

const ApplicationsPage: React.FC = () => {
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();
  const appsQ = useQuery({
    queryKey: ["apps"],
    queryFn: seekerApi.listApplications,
    retry: false,
  });

  const retryAnalysis = useMutation({
    mutationFn: (applicationId: number) => seekerApi.retryApplicationAnalysis(applicationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["apps"] });
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({ queryKey: ["ai-cvs"] });
    },
  });

  const appItems = useMemo(() => (Array.isArray(appsQ.data) ? appsQ.data : []), [appsQ.data]);

  const getAnalysisLabel = (status?: string) => {
    switch (status) {
      case "pending":
        return t("analysisPending");
      case "succeeded":
        return t("analysisSucceeded");
      case "failed":
        return t("analysisFailed");
      default:
        return t("analysisNotRequested");
    }
  };

  const getAnalysisBadgeClass = (status?: string) => {
    switch (status) {
      case "pending":
        return "bg-amber-500/15 text-amber-200";
      case "succeeded":
        return "bg-emerald-500/15 text-emerald-200";
      case "failed":
        return "bg-rose-500/15 text-rose-200";
      default:
        return "bg-slate-500/15 text-slate-200";
    }
  };

  return (
    <div className="space-y-4">
      <div className="glass-card p-5">
        <h1 className="text-2xl font-bold">{t("applicationsTitle")}</h1>
      </div>

      {appsQ.isError && (
        <div className="glass-card p-4 text-sm text-red-300">
          {getApiErrorMessage(appsQ.error, t("dashboardLoadFailed"))}
        </div>
      )}

      <div className="grid gap-3">
        {appItems.map((a: any) => (
          <div key={a.application_id} className="glass-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold">
                  {a.JobPosting?.title || `${t("applicationFallback")} #${a.application_id}`}
                </p>
                <p className="text-sm text-[var(--text-muted)]">
                  {a.JobPosting?.Company?.name || t("company")}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="badge">{a.status}</span>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getAnalysisBadgeClass(a.analysis_status)}`}>
                  {getAnalysisLabel(a.analysis_status)}
                </span>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-[var(--border)] p-3">
                <p className="text-xs uppercase text-[var(--text-muted)]">{t("applicationStatus")}</p>
                <p className="mt-2 text-sm">{a.status}</p>
                <p className="mt-2 text-xs text-[var(--text-muted)]">
                  {t("analysisStatus")}: {getAnalysisLabel(a.analysis_status)}
                </p>
                {a.analysis_completed_at && (
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    {t("analysisCompletedAt")}: {new Date(a.analysis_completed_at).toLocaleString(language === "ar" ? "ar" : "en")}
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-[var(--border)] p-3">
                <p className="text-xs uppercase text-[var(--text-muted)]">{t("analysisSummary")}</p>
                {a.analysis_status === "succeeded" ? (
                  <div className="mt-2 space-y-2 text-sm">
                    <p>{a.ai_summary || t("analysisReady")}</p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {t("atsScore")}: {typeof a.ai_score === "number" ? `${Math.round(a.ai_score)}%` : "-"}
                    </p>
                  </div>
                ) : a.analysis_status === "failed" ? (
                  <div className="mt-2 space-y-2">
                    <p className="text-sm text-rose-200">{t("analysisErrorHint")}</p>
                    {a.analysis_error_message && (
                      <p className="text-xs text-[var(--text-muted)]">{a.analysis_error_message}</p>
                    )}
                    {a.analysis_source === "application_upload" && (
                      <button
                        type="button"
                        className="btn-ghost text-xs"
                        onClick={() => retryAnalysis.mutate(a.application_id)}
                        disabled={retryAnalysis.isPending}
                      >
                        {t("retryApplicationAnalysis")}
                      </button>
                    )}
                  </div>
                ) : a.analysis_status === "pending" ? (
                  <p className="mt-2 text-sm text-amber-200">{t("analysisPending")}</p>
                ) : (
                  <p className="mt-2 text-sm text-[var(--text-muted)]">{t("analysisNotRequested")}</p>
                )}
              </div>
            </div>
          </div>
        ))}

        {!appsQ.isLoading && appItems.length === 0 && (
          <div className="glass-card p-4 text-sm text-[var(--text-muted)]">
            {t("noApplicationsYet")}
          </div>
        )}
      </div>
    </div>
  );
};

export default ApplicationsPage;
