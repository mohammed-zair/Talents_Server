import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Card from "../components/shared/Card";
import SectionHeader from "../components/shared/SectionHeader";
import SplitViewPanel from "../components/dashboard/SplitViewPanel";
import RadialGauge from "../components/shared/RadialGauge";
import Skeleton from "../components/shared/Skeleton";
import { companyApi } from "../services/api/api";
import type { ApplicationItem } from "../types";
import { useLanguage } from "../contexts/LanguageContext";

const ApplicationList: React.FC = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["company-applications"],
    queryFn: companyApi.getApplications,
  });
  const applications = data ?? [];
  const selectedCandidate =
    applications.find((item) => item.id === selectedId)?.candidate ?? null;

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow={language === "ar" ? "الطلبات" : "Applications"}
        title={language === "ar" ? "محرك المرشحين" : "Split-View Candidate Engine"}
        subtitle={
          language === "ar"
            ? "انقر مرشحًا لفتح لوحة الذكاء الاصطناعي."
            : "Click a candidate to open the AI slide-out panel."
        }
      />

      <Card>
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            {language === "ar" ? "الطلبات النشطة" : "Active Applications"}
          </p>
          <span className="text-xs text-[var(--text-muted)]">
            {language === "ar" ? "محدث اليوم" : "Updated today"}
          </span>
        </div>
        <div className="mt-4 space-y-3">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
          ) : (
            applications.map((application: ApplicationItem) => (
              <button
                key={application.id}
                type="button"
                onClick={() => {
                  setSelectedId(application.id);
                  navigate(`/applications/${application.id}`);
                }}
                className="smooth-hover flex w-full items-center justify-between rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4 text-start hover:-translate-y-0.5"
              >
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">
                    {application.candidate.name}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {application.jobTitle} · {application.candidate.location}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="rounded-full bg-[var(--chip-bg)] px-3 py-1 text-xs font-semibold text-[var(--text-primary)]">
                    {application.stage}
                  </span>
                  <RadialGauge
                    value={application.candidate.atsScore.score}
                    max={application.candidate.atsScore.max}
                    size={52}
                  />
                </div>
              </button>
            ))
          )}
        </div>
      </Card>

      <Card>
        <p className="text-sm font-semibold text-[var(--text-primary)]">Loading State Preview</p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      </Card>

      <SplitViewPanel candidate={selectedCandidate} onClose={() => setSelectedId(null)} />
    </div>
  );
};

export default ApplicationList;
