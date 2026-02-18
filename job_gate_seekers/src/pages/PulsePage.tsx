import React, { Suspense, lazy, useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { seekerApi } from "../services/api";
import { useLanguage } from "../contexts/LanguageContext";
import { getStoredUser } from "../utils/auth";

const PulseInsightsCharts = lazy(
  () => import("../components/pulse/PulseInsightsCharts")
);

const PulsePage: React.FC = () => {
  const user = getStoredUser();
  const { t } = useLanguage();
  const [appsQ, cvsQ, jobsQ] = useQueries({
    queries: [
      { queryKey: ["apps"], queryFn: seekerApi.listApplications, retry: false },
      { queryKey: ["cvs"], queryFn: seekerApi.listCVs },
      { queryKey: ["jobs"], queryFn: seekerApi.getJobs },
    ],
  });

  const applications = useMemo(
    () => (Array.isArray(appsQ.data) ? appsQ.data : []),
    [appsQ.data]
  );
  const matchRoles = Math.min((jobsQ.data?.length || 0), 3);
  const atsScore = useMemo(() => {
    const hasCv = (cvsQ.data?.length || 0) > 0;
    const base = hasCv ? 72 : 38;
    return Math.min(96, base + Math.min(applications.length * 3, 20));
  }, [cvsQ.data, applications.length]);

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

  const radarData = [
    { skill: "AI", seeker: 68, market: 82 },
    { skill: "Communication", seeker: 74, market: 77 },
    { skill: "Domain", seeker: 62, market: 80 },
    { skill: "Leadership", seeker: 58, market: 70 },
    { skill: "Tools", seeker: 71, market: 83 },
  ];

  return (
    <div className="space-y-4">
      <div className="glass-card p-6">
        <p className="text-sm text-[var(--text-muted)]">{t("goodMorning")}, {user?.full_name || t("seeker")}.</p>
        <h1 className="mt-2 text-2xl font-bold">{t("profileMatchPrefix")} {atsScore}% {t("profileMatchMiddle")} {matchRoles} {t("profileMatchSuffix")}</h1>
      </div>

      <Suspense fallback={<PulseChartsSkeleton />}>
        <PulseInsightsCharts
          t={t}
          atsScore={atsScore}
          funnel={funnel}
          radarData={radarData}
        />
      </Suspense>
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
