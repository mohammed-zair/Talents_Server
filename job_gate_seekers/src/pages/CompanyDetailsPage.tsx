﻿﻿﻿﻿﻿﻿﻿﻿import React, { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useParams } from "react-router-dom";
import { Bookmark, Briefcase, Sparkles } from "lucide-react";
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

const getPlaceholderScore = (job: any) => {
  const seed = Number(job?.job_id ?? 0);
  return 45 + (seed * 13) % 56;
};

const resolveAssetUrl = (url?: string | null) => {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const base = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/?api\/?$/, "");
  const normalized = url.startsWith("/") ? url : `/${url}`;
  return `${base}${normalized}`;
};

const CompanyDetailsPage: React.FC = () => {
  const { companyId } = useParams();
  const { t, language } = useLanguage();
  const isRtl = language === "ar";
  const location = useLocation();
  const backState = (location.state as any)?.marketSearch;

  const queryClient = useQueryClient();

  const companyQ = useQuery({
    queryKey: ["company", companyId],
    queryFn: () => seekerApi.getCompanyDetails(Number(companyId)),
    enabled: !!companyId,
  });

  const savedJobsQ = useQuery({ queryKey: ["saved-jobs"], queryFn: seekerApi.getSavedJobs });
  const savedIds = useMemo(() => {
    const list = Array.isArray(savedJobsQ.data) ? savedJobsQ.data : [];
    return new Set(list.map((j: any) => j.job_id || j.JobPosting?.job_id));
  }, [savedJobsQ.data]);

  const saveMutation = useMutation({
    mutationFn: async (jobId: number) => {
      if (savedIds.has(jobId)) {
        await seekerApi.removeSavedJob(jobId);
      } else {
        await seekerApi.saveJob(jobId);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["saved-jobs"] }),
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
            <div className="flex flex-wrap items-center gap-4">
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
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {jobs.map((job: any) => {
                const score = getPlaceholderScore(job);
                const baseLabel = score >= 90 ? t("highlyMatched") : score >= 70 ? t("forYou") : "";
                const badgeClass =
                  score >= 90 ? "bg-emerald-500/20 text-emerald-200" : "bg-sky-500/20 text-sky-200";
                const isSaved = savedIds.has(job.job_id);
                const imageUrl = resolveAssetUrl(job.job_image_url);

                const badgeLabel = baseLabel ? `${baseLabel} · ${t("aiComingSoon")}` : "";

                return (
                  <div key={job.job_id || job.id} className="glass-card card-hover overflow-hidden rounded-3xl min-h-[360px] sm:min-h-[420px]">
                    <div className="relative">
                      {imageUrl ? (
                        <img src={imageUrl} alt={job.title} className="h-40 w-full object-cover" />
                      ) : (
                        <div className="flex h-40 items-center justify-center bg-[var(--glass)]">
                          <Briefcase size={28} className="text-[var(--text-muted)]" />
                        </div>
                      )}
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
                      {badgeLabel && (
                        <span className={`absolute ${isRtl ? "left-3" : "right-3"} top-3 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${badgeClass}`}>
                          <Sparkles size={12} />
                          {badgeLabel}
                        </span>
                      )}
                    </div>
                    <div className="flex h-full flex-col p-4">
                      <div className="text-lg font-semibold">{job.title || t("applicationFallback")}</div>
                      <div className="text-xs text-[var(--text-muted)]">
                        {company?.name || t("company")} · {job.location || t("remote")}
                      </div>
                      <p className="mt-2 text-sm text-[var(--text-muted)] line-clamp-2">
                        {job.description || t("noDescriptionYet")}
                      </p>
                      <div className="mt-auto flex items-center gap-2 pt-4">
                        <Link
                          className="btn-primary"
                          to="/opportunities"
                          state={{ companyId: company.company_id, jobId: job.job_id }}
                        >
                          {t("apply")}
                        </Link>
                        <button
                          className="btn-ghost"
                          onClick={() => saveMutation.mutate(job.job_id)}
                          aria-label={isSaved ? t("saved") : t("save")}
                        >
                          <Bookmark
                            size={18}
                            className={isSaved ? "text-[var(--accent)]" : "text-[var(--text-muted)]"}
                            fill={isSaved ? "currentColor" : "none"}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
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
