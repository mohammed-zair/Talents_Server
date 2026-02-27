import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { seekerApi } from "../services/api";
import { useLanguage } from "../contexts/LanguageContext";

const ApplicationsPage: React.FC = () => {
  const appsQ = useQuery({
    queryKey: ["apps"],
    queryFn: seekerApi.listApplications,
    retry: false,
  });
  const appItems = useMemo(() => (Array.isArray(appsQ.data) ? appsQ.data : []), [appsQ.data]);
  const { t } = useLanguage();

  return (
    <div className="space-y-4">
      <div className="glass-card p-5">
        <h1 className="text-2xl font-bold">{t("applicationsTitle")}</h1>
      </div>
      <div className="grid gap-3">
        {appItems.map((a: any) => (
          <div key={a.application_id} className="glass-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{a.JobPosting?.title || `${t("applicationFallback")} #${a.application_id}`}</p>
                <p className="text-sm text-[var(--text-muted)]">{a.JobPosting?.Company?.name || t("company")}</p>
              </div>
              <span className="badge">{a.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ApplicationsPage;
