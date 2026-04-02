import React, { Suspense, lazy, useMemo } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { seekerApi } from "../services/api";
import { useLanguage } from "../contexts/LanguageContext";
import { getStoredUser } from "../utils/auth";
import { getApiErrorMessage } from "../utils/apiError";

const PulseInsightsCharts = lazy(
  () => import("../components/pulse/PulseInsightsCharts")
);

const toRecord = (value: unknown): Record<string, any> =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, any>) : {};

const parseMaybeJson = (value: unknown): unknown => {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const toStringList = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === "string") return item.trim();
      if (item && typeof item === "object") {
        const row = item as Record<string, unknown>;
        return String(row.name || row.skill || row.title || "").trim();
      }
      return "";
    })
    .filter(Boolean);
};

const extractInsightSkills = (insight: any): string[] => {
  if (!insight) return [];
  const features = toRecord(parseMaybeJson(insight.features_analytics));
  const structured = toRecord(parseMaybeJson(insight.structured_data));
  const ai = toRecord(
    parseMaybeJson(
      insight.ai_intelligence ||
        insight.ai_insights?.ai_intelligence ||
        insight.ai_insights ||
        insight.insights
    )
  );
  const core = toRecord(ai.core_competencies);
  const all = [
    ...toStringList(features.key_skills),
    ...toStringList(structured.skills),
    ...toStringList(core.programming),
    ...toStringList(core.frameworks),
    ...toStringList(core.tools_platforms),
    ...toStringList(core.domain_expertise),
    ...toStringList(core.other),
  ];
  return Array.from(new Set(all.map((s) => s.toLowerCase())));
};

const extractAnalysisSkills = (analysis: any): string[] => {
  if (!analysis) return [];
  const features = toRecord(parseMaybeJson(analysis.features_analytics));
  const structured = toRecord(parseMaybeJson(analysis.structured_data));
  const all = [
    ...toStringList(features.key_skills),
    ...toStringList(structured.skills),
  ];
  return Array.from(new Set(all.map((s) => s.toLowerCase())));
};

const clampScore = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

const PulsePage: React.FC = () => {
  const user = getStoredUser();
  const { t } = useLanguage();
  const [appsQ, cvsQ, jobsQ, savedQ, aiCvsQ] = useQueries({
    queries: [
      { queryKey: ["apps"], queryFn: seekerApi.listApplications, retry: false },
      { queryKey: ["cvs"], queryFn: seekerApi.listCVs },
      { queryKey: ["jobs"], queryFn: () => seekerApi.getJobs({ page: 0, limit: 6 }) },
      { queryKey: ["saved-jobs"], queryFn: seekerApi.getSavedJobs },
      { queryKey: ["ai-cvs"], queryFn: seekerApi.getUserAiCvs },
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
  const aiCvItems = useMemo(
    () => (Array.isArray(aiCvsQ.data) ? aiCvsQ.data : []),
    [aiCvsQ.data]
  );
  const firstCvId = useMemo(() => {
    const id = Number(cvsQ.data?.[0]?.cv_id);
    return Number.isFinite(id) && id > 0 ? id : null;
  }, [cvsQ.data]);
  const firstCvAnalysisQ = useQuery({
    queryKey: ["cv-analysis", firstCvId],
    queryFn: () => seekerApi.getCvAnalysis(firstCvId as number),
    enabled: !!firstCvId,
  });

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

  const analysisSummary = useMemo(() => {
    let pending = 0;
    let failed = 0;
    let latestReady = null as any;
    applications.forEach((app: any) => {
      if (app.analysis_status === "pending") pending += 1;
      if (app.analysis_status === "failed") failed += 1;
      if (app.analysis_status === "succeeded" && !latestReady) latestReady = app;
    });
    return { pending, failed, latestReady };
  }, [applications]);

  const latestInsight = useMemo(() => {
    if (!aiCvItems.length) return null;
    const toTs = (v: any) => {
      const ts = Date.parse(String(v || ""));
      return Number.isFinite(ts) ? ts : 0;
    };
    return [...aiCvItems].sort((a: any, b: any) => {
      const ta = Math.max(toTs(a?.insight_created_at), toTs(a?.created_at));
      const tb = Math.max(toTs(b?.insight_created_at), toTs(b?.created_at));
      return tb - ta;
    })[0];
  }, [aiCvItems]);

  const atsScore = useMemo(() => {
    const candidates = [
      latestInsight?.ats_score,
      toRecord(parseMaybeJson(latestInsight?.features_analytics)).ats_score,
      firstCvAnalysisQ.data?.ats_score,
      toRecord(parseMaybeJson(firstCvAnalysisQ.data?.features_analytics)).ats_score,
      cvsQ.data?.[0]?.ats_score,
    ];
    for (const value of candidates) {
      if (typeof value === "number" && Number.isFinite(value)) return clampScore(value);
    }
    return null;
  }, [cvsQ.data, firstCvAnalysisQ.data, latestInsight]);

  const radarData = useMemo(() => {
    const seekerSkills = [
      ...extractInsightSkills(latestInsight),
      ...extractAnalysisSkills(firstCvAnalysisQ.data),
    ];
    if (!seekerSkills.length && !jobs.length) return [];

    const marketCorpus = jobs
      .map((job: any) =>
        [job?.title, job?.description, job?.requirements, job?.industry, job?.location]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
      )
      .join(" ");

    const buckets = [
      { skill: "Frontend", keywords: ["react", "vue", "angular", "javascript", "typescript", "css", "html"] },
      { skill: "Backend", keywords: ["node", "express", "django", "laravel", "spring", "api", "sql"] },
      { skill: "Mobile", keywords: ["react native", "flutter", "android", "ios", "swift", "kotlin"] },
      { skill: "DevOps", keywords: ["docker", "kubernetes", "aws", "azure", "gcp", "ci/cd", "devops"] },
      { skill: "Data/AI", keywords: ["python", "ml", "ai", "data", "analytics", "pandas", "tensorflow"] },
    ];

    return buckets.map((bucket) => {
      const seekerMatches = bucket.keywords.filter((kw) =>
        seekerSkills.some((s) => s.includes(kw))
      ).length;
      const marketMatches = bucket.keywords.filter((kw) =>
        marketCorpus.includes(kw)
      ).length;
      return {
        skill: bucket.skill,
        seeker: clampScore((seekerMatches / bucket.keywords.length) * 100),
        market: clampScore((marketMatches / bucket.keywords.length) * 100),
      };
    });
  }, [firstCvAnalysisQ.data, jobs, latestInsight]);

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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
        <div className="glass-card p-4">
          <p className="text-xs text-[var(--text-muted)]">{t("analysisPendingCount")}</p>
          <p className="mt-2 text-3xl font-semibold">{analysisSummary.pending}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-[var(--text-muted)]">{t("analysisFailedCount")}</p>
          <p className="mt-2 text-3xl font-semibold">{analysisSummary.failed}</p>
        </div>
      </div>

      {(appsQ.isError || jobsQ.isError || cvsQ.isError || aiCvsQ.isError) && (
        <div className="glass-card p-4 text-sm text-red-300">
          {getApiErrorMessage(
            appsQ.error || jobsQ.error || cvsQ.error || aiCvsQ.error,
            t("dashboardLoadFailed")
          )}
          <button
            className="btn-ghost mt-3"
            onClick={() => {
              appsQ.refetch();
              jobsQ.refetch();
              cvsQ.refetch();
              aiCvsQ.refetch();
            }}
          >
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

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="glass-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{t("recentApplications")}</h2>
            <Link className="btn-ghost" to="/applications">{t("viewAll")}</Link>
          </div>
          <div className="mt-3 space-y-2">
            {applications.slice(0, 3).map((app: any) => (
              <div key={app.application_id} className="rounded-xl border border-[var(--border)] p-3 text-sm">
                <div className="font-semibold">{app.JobPosting?.title || t("applicationFallback")}</div>
                <div className="mt-1 flex flex-wrap gap-2 text-xs">
                  <span className="text-[var(--text-muted)]">{app.status}</span>
                  {app.analysis_status === "pending" && <span className="text-amber-300">{t("analysisPendingShort")}</span>}
                  {app.analysis_status === "failed" && <span className="text-rose-300">{t("analysisFailedShort")}</span>}
                  {app.analysis_status === "succeeded" && <span className="text-emerald-300">{t("analysisReadyShort")}</span>}
                </div>
              </div>
            ))}
            {applications.length === 0 && (
              <p className="text-sm text-[var(--text-muted)]">{t("noApplicationsYet")}</p>
            )}
          </div>
          {analysisSummary.latestReady && (
            <div className="mt-3 rounded-xl border border-[var(--border)] p-3 text-xs text-[var(--text-muted)]">
              {t("latestAnalysisReady")}: {analysisSummary.latestReady.JobPosting?.title || t("applicationFallback")}
            </div>
          )}
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
  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
    {Array.from({ length: 3 }).map((_, idx) => (
      <div key={idx} className="glass-card p-4">
        <div className="h-4 w-28 animate-pulse rounded-full bg-[var(--border)]" />
        <div className="mt-4 h-56 animate-pulse rounded-2xl bg-[var(--border)]/60" />
      </div>
    ))}
  </div>
);
