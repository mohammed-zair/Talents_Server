import React from "react";
import { useQuery } from "@tanstack/react-query";
import { seekerApi } from "../services/api";

const ApplicationsPage: React.FC = () => {
  const appsQ = useQuery({ queryKey: ["apps"], queryFn: seekerApi.listApplications });

  return (
    <div className="space-y-4">
      <div className="glass-card p-5">
        <h1 className="text-2xl font-bold">Applications</h1>
      </div>
      <div className="grid gap-3">
        {(appsQ.data || []).map((a: any) => (
          <div key={a.application_id} className="glass-card p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="font-semibold">{a.JobPosting?.title || `Application #${a.application_id}`}</p>
                <p className="text-sm text-[var(--text-muted)]">{a.JobPosting?.Company?.name || "Company"}</p>
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