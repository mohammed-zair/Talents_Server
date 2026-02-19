import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation, useParams } from "react-router-dom";
import { seekerApi } from "../services/api";
import { useLanguage } from "../contexts/LanguageContext";
import { getApiErrorMessage } from "../utils/apiError";

const initials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  const first = parts[0][0] || "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return `${first}${last}`.toUpperCase();
};

const CompanyDetailsPage: React.FC = () => {
  const { companyId } = useParams();
  const { t } = useLanguage();
  const location = useLocation();
  const backState = (location.state as any)?.marketSearch;

  const companyQ = useQuery({
    queryKey: ["company", companyId],
    queryFn: () => seekerApi.getCompanyDetails(Number(companyId)),
    enabled: !!companyId,
  });

  const company = companyQ.data as any;
  const jobs =
    company?.JobPostings ||
    company?.job_postings ||
    company?.jobs ||
    company?.job_postings_list ||
    [];

  return (
    <div className="space-y-4">
      <div className="glass-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{t("companyDetails")}</h1>
            <p className="text-sm text-[var(--text-muted)]">{t("marketSubtitle")}</p>
          </div>
          <Link className="btn-ghost" to="/market" state={{ marketSearch: backState || "" }}>
            {t("backToMarket")}
          </Link>
        </div>
      </div>

      {companyQ.isLoading && (
        <div className="glass-card p-4">
          <div className="h-6 w-40 animate-pulse rounded-full bg-[var(--border)]" />
          <div className="mt-3 h-4 w-full animate-pulse rounded-full bg-[var(--border)]" />
          <div className="mt-2 h-4 w-4/5 animate-pulse rounded-full bg-[var(--border)]" />
        </div>
      )}

      {companyQ.isError && (
        <div className="glass-card p-4">
          <p className="text-sm text-red-300">{getApiErrorMessage(companyQ.error, t("companyLoadFailed"))}</p>
          <button className="btn-ghost mt-3" onClick={() => companyQ.refetch()}>
            {t("retry")}
          </button>
        </div>
      )}

      {!companyQ.isLoading && !companyQ.isError && !company && (
        <div className="glass-card p-4 text-sm text-[var(--text-muted)]">{t("companyNotFound")}</div>
      )}

      {company && (
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="glass-card p-5">
            <div className="flex items-center gap-4">
              {company.logo_url ? (
                <img
                  src={company.logo_url}
                  alt={company.name}
                  className="h-16 w-16 rounded-2xl border border-[var(--border)] object-cover"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--glass)] text-lg font-semibold">
                  {initials(company.name || "")}
                </div>
              )}
              <div>
                <h2 className="text-2xl font-semibold">{company.name}</h2>
                <p className="text-sm text-[var(--text-muted)]">{t("ratingPending")}</p>
              </div>
            </div>

            <div className="mt-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">{t("companyOverview")}</h3>
              <p className="mt-2 text-sm text-[var(--text-muted)]">{company.description || t("noDescriptionYet")}</p>
            </div>
          </div>

          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">{t("companyContact")}</h3>
            <div className="mt-3 space-y-2 text-sm">
              <div>
                <div className="text-xs text-[var(--text-muted)]">{t("companyEmail")}</div>
                <div>{company.email || t("notProvided")}</div>
              </div>
              <div>
                <div className="text-xs text-[var(--text-muted)]">{t("companyPhone")}</div>
                <div>{company.phone || t("notProvided")}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {company && (
        <div className="glass-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">{t("companyJobs")}</h3>
            <Link className="btn-ghost" to="/opportunities" state={{ companyId: company.company_id }}>
              {t("viewAllJobs")}
            </Link>
          </div>
          {Array.isArray(jobs) && jobs.length > 0 ? (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {jobs.map((job: any) => (
                <div key={job.job_id || job.id} className="rounded-xl border border-[var(--border)] p-3">
                  <div className="font-semibold">{job.title || t("applicationFallback")}</div>
                  <div className="text-xs text-[var(--text-muted)]">{job.location || t("remote")}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-[var(--text-muted)]">{t("noJobsYet")}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default CompanyDetailsPage;
