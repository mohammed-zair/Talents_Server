import React from "react";
import { useLanguage } from "../contexts/LanguageContext";

const ConsultantMarketplacePage: React.FC = () => {
  const { t } = useLanguage();

  return (
    <div className="space-y-4">
      <div className="glass-card p-6">
        <h1 className="text-2xl font-bold">{t("consultantMarketplace")}</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">{t("consultingComingSoonSubtitle")}</p>
      </div>

      <div className="glass-card p-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-4 py-2 text-sm">
          <span className="h-2 w-2 rounded-full bg-amber-400" />
          {t("consultingComingSoon")}
        </div>
        <p className="mt-4 text-sm text-[var(--text-muted)]">
          {t("consultingComingSoonDetails")}
        </p>
      </div>
    </div>
  );
};

export default ConsultantMarketplacePage;