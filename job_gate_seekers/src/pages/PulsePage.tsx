import React, { Suspense, lazy, useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { seekerApi } from "../services/api";
import { useLanguage } from "../contexts/LanguageContext";
import { getStoredUser } from "../utils/auth";
import { getApiErrorMessage } from "../utils/apiError";

const PulseInsightsCharts = lazy(
  () => import("../components/pulse/PulseInsightsCharts")
);

const PulsePage: React.FC = () => {
  const user = getStoredUser();
  const { t } = useLanguage();
  const [appsQ, cvsQ, jobsQ, savedQ] = useQueries({
    queries: [
      { queryKey: ["apps"], queryFn: seekerApi.listApplications, retry: false },
      { queryKey: ["cvs"], queryFn: seekerApi.listCVs },
      { queryKey: ["jobs"], queryFn: () => seekerApi.getJobs({ page: 0, limit: 6 }) },
      { queryKey: ["saved-jobs"], queryFn: seekerApi.getSavedJobs },
    ],
  });

  const applications = useMemo(
    () => (Array.isArray(appsQ.data) ? appsQ.data : []),
    [appsQ.data]
  );
  const savedJobs = useMemo(
    () => (Array.isArray(savedQ.data) ? savedQ.data : []),
    [savedQ.data]
  );
  const jobs = useMemo(() => jobsQ.data?.items || [], [jobsQ.data]);

  const funnel = useMemo(() => {
    const stages = { applied: 0, interview: 0, offer: 0 };
    applications.forEach((a: any) => {
      const s = String(a.status || "").toLowerCase();
      if (s.includes("offer")) stages.offer += 1;
      else if (s.includes("interview")) stages.interview += 1;
      else stages.applied += 1;
    });
    return stages;
  }, [applications]);

  const atsScore = useMemo(() => {
    const score = cvsQ.data?.[0]?.ats_score;
    return typeof score === "number" ? Math.round(score) : null;
  }, [cvsQ.data]);

  const radarData = useMemo(() => {
    return [];
  }, []);

  return (
    <div className="space-y-4">
      <div className="glass-card p-6">
        <p className="text-sm text-[var(--text-muted)]">{t("goodMorning")}, {user?.full_name || t("seeker")}.</p>
        <h1 className="mt-2 text-2xl font-bold">
          {t("profileMatchPrefix")} {atsScore !== null ? `${atsScore}%` : t("matchUnavailable")} {t("profileMatchMiddle")} {Math.min(jobs.length, 3)} {t("profileMatchSuffix")}
        </h1>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link className="btn-primary" to="/cv-lab">{t("goToCvLab")}</Link>
          <Link className="btn-ghost" to="/opportunities">{t("browseJobs")}</Link>
          <Link className="btn-ghost" to="/ai-consultant">{t("startAiConsultant")}</Link>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-4">
        <div className="glass-card p-4">
          <p className="text-xs text-[var(--text-muted)]">{t("currentCvStrength")}</p>
          <p className="mt-2 text-3xl font-semibold">{atsScore !== null ? `${atsScore}%` : "-"}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-[var(--text-muted)]">{t("applications")}</p>
          <p className="mt-2 text-3xl font-semibold">{applications.length}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-[var(--text-muted)]">{t("savedJobs")}</p>
          <p className="mt-2 text-3xl font-semibold">{savedJobs.length}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-[var(--text-muted)]">{t("recommendedJobs")}</p>
          <p className="mt-2 text-3xl font-semibold">{jobs.length}</p>
        </div>
      </div>

      {(appsQ.isError || jobsQ.isError || cvsQ.isError) && (
        <div className="glass-card p-4 text-sm text-red-300">
          {getApiErrorMessage(appsQ.error || jobsQ.error || cvsQ.error, t("dashboardLoadFailed"))}
          <button className="btn-ghost mt-3" onClick={() => { appsQ.refetch(); jobsQ.refetch(); cvsQ.refetch(); }}>
            {t("retry")}
          </button>
        </div>
      )}

      <Suspense fallback={<PulseChartsSkeleton />}>
        <PulseInsightsCharts
          t={t}
          atsScore={atsScore}
          funnel={funnel}
          radarData={radarData}
        />
      </Suspense>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="glass-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{t("recentApplications")}</h2>
            <Link className="btn-ghost" to="/applications">{t("viewAll")}</Link>
          </div>
          <div className="mt-3 space-y-2">
            {applications.slice(0, 3).map((app: any) => (
              <div key={app.application_id} className="rounded-xl border border-[var(--border)] p-3 text-sm">
                <div className="font-semibold">{app.JobPosting?.title || t("applicationFallback")}</div>
                <div className="text-xs text-[var(--text-muted)]">{app.status}</div>
              </div>
            ))}
            {applications.length === 0 && (
              <p className="text-sm text-[var(--text-muted)]">{t("noApplicationsYet")}</p>
            )}
          </div>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{t("recommendedJobs")}</h2>
            <Link className="btn-ghost" to="/opportunities">{t("viewAll")}</Link>
          </div>
          <div className="mt-3 space-y-2">
            {jobs.map((job: any) => (
              <div key={job.job_id} className="rounded-xl border border-[var(--border)] p-3 text-sm">
                <div className="font-semibold">{job.title}</div>
                <div className="text-xs text-[var(--text-muted)]">{job.Company?.name || t("company")}</div>
              </div>
            ))}
            {jobs.length === 0 && (
              <p className="text-sm text-[var(--text-muted)]">{t("noJobsFound")}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PulsePage;

const PulseChartsSkeleton: React.FC = () => (
  <div className="grid gap-4 xl:grid-cols-3">
    {Array.from({ length: 3 }).map((_, idx) => (
      <div key={idx} className="glass-card p-4">
        <div className="h-4 w-28 animate-pulse rounded-full bg-[var(--border)]" />
        <div className="mt-4 h-56 animate-pulse rounded-2xl bg-[var(--border)]/60" />
      </div>
    ))}
  </div>
);
