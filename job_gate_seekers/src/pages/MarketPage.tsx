import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { seekerApi } from "../services/api";
import { useLanguage } from "../contexts/LanguageContext";

const MarketPage: React.FC = () => {
  const companiesQ = useQuery({ queryKey: ["companies"], queryFn: seekerApi.listCompanies });
  const companyItems = useMemo(() => (Array.isArray(companiesQ.data) ? companiesQ.data : []), [companiesQ.data]);
  const { t } = useLanguage();

  return (
    <div className="space-y-4">
      <div className="glass-card p-5">
        <h1 className="text-2xl font-bold">{t("marketTitle")}</h1>
        <p className="text-sm text-[var(--text-muted)]">{t("marketSubtitle")}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {companyItems.map((c: any) => {
          const culture = 65 + ((c.name?.length || 1) % 30);
          return (
            <div key={c.company_id} className="glass-card card-hover p-4">
              <p className="text-lg font-semibold">{c.name}</p>
              <p className="mt-1 text-sm text-[var(--text-muted)]">{c.description || t("noDescriptionYet")}</p>
              <div className="mt-3 inline-flex rounded-full border border-[var(--border)] px-3 py-1 text-xs">
                {t("cultureScore")}: {culture}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MarketPage;
