import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Card from "../components/shared/Card";
import SectionHeader from "../components/shared/SectionHeader";
import Button from "../components/shared/Button";
import Skeleton from "../components/shared/Skeleton";
import { useLanguage } from "../contexts/LanguageContext";
import { companyApi } from "../services/api/api";
import type { ApplicationItem } from "../types";

const getApiBaseUrl = () =>
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000/api";

const statusLabel = (status: ApplicationItem["status"], language: "en" | "ar") => {
  const map = {
    pending: { en: "Pending", ar: "??? ????????" },
    reviewed: { en: "Reviewed", ar: "??? ????????" },
    accepted: { en: "Accepted", ar: "?????" },
    rejected: { en: "Rejected", ar: "?????" },
  };
  return map[status]?.[language] ?? status;
};

const ApplicationList: React.FC = () => {
  const { language } = useLanguage();
  const apiBase = getApiBaseUrl();
  const { data: applications = [], isLoading } = useQuery({
    queryKey: ["company-applications"],
    queryFn: companyApi.getApplications,
  });
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    const base = [...applications].sort(
      (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );
    if (!search) return base;
    return base.filter(
      (item) =>
        item.candidate.name.toLowerCase().includes(search) ||
        item.job.title.toLowerCase().includes(search) ||
        (item.job.location || "").toLowerCase().includes(search)
    );
  }, [applications, query]);

  const copy = {
    en: {
      eyebrow: "Applications",
      title: "HR-Curated Candidate Feed",
      subtitle: "Applications sent to your company are shown here in real time.",
      search: "Search candidate, job, or location",
      listTitle: "Incoming Applications",
      viewCv: "Open CV",
      total: "Total",
      pending: "Pending",
      reviewed: "Reviewed",
      empty: "No applications match your search.",
      appliedAt: "Applied",
      job: "Job",
    },
    ar: {
      eyebrow: "???????",
      title: "?????? ??????? ?? ??????? ???????",
      subtitle: "???? ???? ????? ??????? ??????? ??????.",
      search: "???? ?????? ?? ??????? ?? ??????",
      listTitle: "??????? ???????",
      viewCv: "??? ??????",
      total: "????????",
      pending: "??? ????????",
      reviewed: "??? ????????",
      empty: "?? ???? ????? ??????.",
      appliedAt: "????? ???????",
      job: "???????",
    },
  }[language];

  const stats = useMemo(() => {
    const total = filtered.length;
    const pending = filtered.filter((c) => c.status === "pending").length;
    const reviewed = filtered.filter((c) => c.status === "reviewed").length;
    return { total, pending, reviewed };
  }, [filtered]);

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow={copy.eyebrow}
        title={copy.title}
        subtitle={copy.subtitle}
        action={
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={copy.search}
            className="w-72 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] px-4 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
          />
        }
      />

      <Card>
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-[var(--text-primary)]">{copy.listTitle}</p>
          <span className="text-xs text-[var(--text-muted)]">
            {language === "ar" ? "????? ??? ??????" : "Sorted by latest"}
          </span>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)]/70 p-4 shadow-soft-ambient">
            <p className="text-xs text-[var(--text-muted)]">{copy.total}</p>
            <p className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{stats.total}</p>
          </div>
          <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)]/70 p-4 shadow-soft-ambient">
            <p className="text-xs text-[var(--text-muted)]">{copy.pending}</p>
            <p className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{stats.pending}</p>
          </div>
          <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)]/70 p-4 shadow-soft-ambient">
            <p className="text-xs text-[var(--text-muted)]">{copy.reviewed}</p>
            <p className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{stats.reviewed}</p>
          </div>
        </div>

        <div className="mt-5 max-h-[520px] space-y-4 overflow-y-auto pe-2">
          {isLoading ? (
            <>
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-[var(--panel-border)] p-4 text-sm text-[var(--text-muted)]">
              {copy.empty}
            </div>
          ) : (
            filtered.map((application) => (
              <div
                key={application.id}
                className="relative grid gap-4 rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)]/80 p-5 shadow-[0_0_25px_var(--glow)] lg:grid-cols-[1.2fr_1fr]"
              >
                <div
                  className="absolute inset-y-4 start-0 w-1 rounded-full"
                  style={{
                    background:
                      application.status === "accepted"
                        ? "var(--accent)"
                        : application.status === "reviewed"
                        ? "var(--accent-strong)"
                        : "var(--text-muted)",
                  }}
                />
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-[var(--text-primary)]">
                        {application.candidate.name}
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {application.job.title}
                        {application.job.location ? ` - ${application.job.location}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="rounded-full bg-[var(--chip-bg)] px-3 py-1 text-xs font-semibold text-[var(--text-primary)]">
                        {statusLabel(application.status, language)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 text-xs text-[var(--text-muted)]">
                    {copy.appliedAt}: {application.submittedAt
                      ? new Date(application.submittedAt).toLocaleDateString()
                      : "-"}
                  </div>
                </div>

                <div className="flex flex-col justify-between rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)]/60 p-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
                      {language === "ar" ? "??? ??????" : "Candidate File"}
                    </p>
                    <p className="mt-2 text-sm text-[var(--text-primary)]">
                      {application.candidate.email || application.candidate.phone || "-"}
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      {copy.job}: {application.job.title}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    className="mt-4 justify-center"
                    onClick={() => {
                      window.open(
                        `${apiBase}/companies/company/applications/${application.id}/cv`,
                        "_blank"
                      );
                    }}
                  >
                    {copy.viewCv}
                  </Button>
                  <Button
                    variant="outline"
                    className="mt-2 justify-center"
                    onClick={() => {
                      if (application.candidate.id) {
                        window.open(
                          `https://talents-we-trust.tech/profile/${application.candidate.id}`,
                          "_blank"
                        );
                      }
                    }}
                    disabled={!application.candidate.id}
                  >
                    {language === "ar" ? "عرض الملف" : "View profile"}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
};

export default ApplicationList;
