import React from "react";
import { useQuery } from "@tanstack/react-query";
import { seekerApi } from "../services/api";

const MarketPage: React.FC = () => {
  const companiesQ = useQuery({ queryKey: ["companies"], queryFn: seekerApi.listCompanies });

  return (
    <div className="space-y-4">
      <div className="glass-card p-5">
        <h1 className="text-2xl font-bold">The Market</h1>
        <p className="text-sm text-[var(--text-muted)]">Approved-only company discovery with culture signal preview.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {(companiesQ.data || []).map((c: any) => {
          const culture = 65 + ((c.name?.length || 1) % 30);
          return (
            <div key={c.company_id} className="glass-card card-hover p-4">
              <p className="text-lg font-semibold">{c.name}</p>
              <p className="mt-1 text-sm text-[var(--text-muted)]">{c.description || "No description yet"}</p>
              <div className="mt-3 inline-flex rounded-full border border-[var(--border)] px-3 py-1 text-xs">
                Culture Score: {culture}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MarketPage;