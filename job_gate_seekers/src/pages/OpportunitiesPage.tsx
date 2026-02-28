import React, { useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import { Bookmark, Briefcase, Sparkles } from "lucide-react";
import { seekerApi } from "../services/api";
import { useLanguage } from "../contexts/LanguageContext";
import { getApiErrorMessage } from "../utils/apiError";

const PAGE_SIZE = 8;

const resolveAssetUrl = (url?: string | null) => {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  const base = import.meta.env.VITE_ASSET_BASE_URL || import.meta.env.VITE_API_URL || "";
  return `${base}${url.startsWith("/") ? "" : "/"}${url}`;
};

const getPlaceholderScore = (job: any) => {
  const seed = Number(job?.job_id ?? 0);
  return 45 + (seed * 13) % 56;
};

type FormField = {
  field_id: number;
  title: string;
  description?: string;
  is_required?: boolean;
  input_type: "text" | "number" | "email" | "file" | "select" | "textarea" | "checkbox" | "radio";
  options?: string[];
  choices?: string[];
};

const OpportunitiesPage: React.FC = () => {
  const { language, t } = useLanguage();
  const isRtl = language === "ar";
  const queryClient = useQueryClient();
  const [actionMsg, setActionMsg] = useState("");
  const [activeJob, setActiveJob] = useState<any | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string | string[]>>({});
  const [coverLetter, setCoverLetter] = useState("");
  const [selectedCvId, setSelectedCvId] = useState<number | "">("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [showAnalyzePrompt, setShowAnalyzePrompt] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const selectedCompanyId = (location.state as any)?.companyId;
  const requestedJobId = (location.state as any)?.jobId;
  const openedJobId = useRef<number | null>(null);

  const cvsQ = useQuery({ queryKey: ["cvs"], queryFn: seekerApi.listCVs });
  const savedJobsQ = useQuery({ queryKey: ["saved-jobs"], queryFn: seekerApi.getSavedJobs });
  const applicationsQ = useQuery({ queryKey: ["applications"], queryFn: seekerApi.listApplications });

  const jobsQ = useInfiniteQuery({
    queryKey: ["jobs-infinite", selectedCompanyId],
    queryFn: async ({ pageParam = 0 }) => {
      const page = Number(pageParam || 0);
      const response = await seekerApi.getJobs({
        page,
        limit: PAGE_SIZE,
        companyId: selectedCompanyId,
      });
      const items = response.items || [];
      const nextPage = page + 1 < (response.pages || 1) ? page + 1 : undefined;
      return { items, nextPage };
    },
    initialPageParam: 0,
    getNextPageParam: (last) => last.nextPage,
  });

  const jobDetailsQ = useQuery({
    queryKey: ["job-details", activeJob?.job_id],
    queryFn: () => seekerApi.getJobDetails(String(activeJob?.job_id)),
    enabled: !!activeJob,
  });

  const formQ = useQuery({
    queryKey: ["job-form", activeJob?.job_id],
    queryFn: () => seekerApi.getJobForm(String(activeJob?.job_id)),
    enabled: !!activeJob,
  });

  const quickApply = useMutation({
    mutationFn: async (payload: { job: any; formData: FormData }) => {
      const job = payload.job;
      await seekerApi.generatePitch({ cv_id: Number(payload.formData.get("cv_id")), job_id: job.job_id, language });
      await seekerApi.submitApplication(payload.formData);
      return true;
    },
    onSuccess: () => {
      setFormSuccess(t("applicationSubmitted"));
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      setTimeout(() => setFormSuccess(""), 3000);
    },
    onError: (e: any) => setFormError(getApiErrorMessage(e, t("applyFailed"))),
  });

  const saveMutation = useMutation({
    mutationFn: async (jobId: number) => {
      const savedIds = new Set((savedJobsQ.data || []).map((j: any) => j.job_id || j.JobPosting?.job_id));
      if (savedIds.has(jobId)) {
        await seekerApi.removeSavedJob(jobId);
      } else {
        await seekerApi.saveJob(jobId);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["saved-jobs"] }),
    onError: (e: any) => setActionMsg(getApiErrorMessage(e, t("saveFailed"))),
  });

  useEffect(() => {
    if (!actionMsg) return;
    const handle = window.setTimeout(() => setActionMsg(""), 3000);
    return () => window.clearTimeout(handle);
  }, [actionMsg]);

  const jobs = useMemo(() => {
    return jobsQ.data?.pages.flatMap((p) => p.items) || [];
  }, [jobsQ.data]);

  useEffect(() => {
    if (!requestedJobId) return;
    if (openedJobId.current === requestedJobId) return;
    const found = jobs.find((job: any) => job.job_id === requestedJobId);
    if (found) {
      setActiveJob(found);
      openedJobId.current = requestedJobId;
    }
  }, [jobs, requestedJobId]);

  const savedIds = useMemo(() => {
    const list = Array.isArray(savedJobsQ.data) ? savedJobsQ.data : [];
    return new Set(list.map((j: any) => j.job_id || j.JobPosting?.job_id));
  }, [savedJobsQ.data]);

  const appliedIds = useMemo(() => {
    const list = Array.isArray(applicationsQ.data) ? applicationsQ.data : [];
    return new Set(list.map((a: any) => a.job_id || a.JobPosting?.job_id));
  }, [applicationsQ.data]);

  const formFields: FormField[] = Array.isArray((formQ.data as any)?.fields) ? (formQ.data as any).fields : [];
  const formType = (formQ.data as any)?.form_type;
  const requireCv = Boolean((formQ.data as any)?.require_cv);
  const selectedCvNumeric = selectedCvId ? Number(selectedCvId) : null;

  const cvAnalysisQ = useQuery({
    queryKey: ["cv-analysis-history", selectedCvNumeric],
    queryFn: () => seekerApi.getCvAnalysisHistory(selectedCvNumeric || 0),
    enabled: !!selectedCvNumeric,
  });
  const cvAnalysisItems = useMemo(
    () => (Array.isArray(cvAnalysisQ.data) ? cvAnalysisQ.data : []),
    [cvAnalysisQ.data]
  );
  const hasAnalyzedCv = Boolean(selectedCvNumeric && cvAnalysisItems.length > 0);

  const resetModal = () => {
    setActiveJob(null);
    setFormValues({});
    setCoverLetter("");
    setSelectedCvId("");
    setUploadFile(null);
    setFormError("");
    setFormSuccess("");
  };

  const submitApplication = async () => {
    if (!activeJob) return;
    if (formType === "external_link") {
      const url = (formQ.data as any)?.external_form_url;
      if (url) window.open(url, "_blank", "noopener,noreferrer");
      return;
    }

    setFormError("");
    if (!hasAnalyzedCv || uploadFile) {
      setShowAnalyzePrompt(true);
      return;
    }
    const missingField = formFields.find((f) => {
      if (!f.is_required) return false;
      const value = formValues[String(f.field_id || f.title)];
      if (Array.isArray(value)) return value.length === 0;
      return !value;
    });
    if (missingField) {
      setFormError(`${t("fieldRequired")}: ${missingField.title}`);
      return;
    }
    let cvId = selectedCvId ? Number(selectedCvId) : null;

    if (requireCv && !cvId && !uploadFile) {
      setFormError(t("cvRequired"));
      return;
    }

    if (uploadFile) {
      try {
        const fd = new FormData();
        const file = uploadFile;
        fd.append("cv_file", file);
        fd.append("cv_title", file.name);
        const uploaded = await seekerApi.uploadCV(fd);
        cvId = uploaded?.cv_id || null;
        if (cvId) {
          setSelectedCvId(cvId);
          seekerApi.getCvAnalysis(cvId).catch(() => null);
          queryClient.invalidateQueries({ queryKey: ["cvs"] });
        }
      } catch (e: any) {
        setFormError(getApiErrorMessage(e, t("cvUploadFailed")));
        return;
      }
    }

    const formData = new FormData();
    formData.append("job_id", String(activeJob.job_id));
    if (cvId) formData.append("cv_id", String(cvId));
    if (coverLetter) formData.append("cover_letter", coverLetter);

    if (formFields.length) {
      const payload: Record<string, string | string[]> = {};
      formFields.forEach((f) => {
        const key = String(f.field_id || f.title);
        if (formValues[key]) payload[key] = formValues[key];
      });
      formData.append("form_data", JSON.stringify(payload));
    }

    await quickApply.mutateAsync({ job: activeJob, formData });
  };

  return (
    <div className="space-y-4">
      <div className="glass-card p-5">
        <h1 className="text-2xl font-bold">{t("opportunitiesTitle")}</h1>
        <p className="text-sm text-[var(--text-muted)]">{t("opportunitiesSubtitle")}</p>
      </div>

      {selectedCompanyId && (
        <div className="glass-card p-3 text-sm text-[var(--text-muted)]">
          {t("filteredByCompany")}
        </div>
      )}

      {actionMsg && <div className="glass-card p-3 text-sm">{actionMsg}</div>}

      {jobsQ.isLoading && (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="glass-card p-4">
              <div className="h-4 w-2/3 animate-pulse rounded-full bg-[var(--border)]" />
              <div className="mt-2 h-3 w-full animate-pulse rounded-full bg-[var(--border)]" />
              <div className="mt-4 h-9 w-32 animate-pulse rounded-full bg-[var(--border)]" />
            </div>
          ))}
        </div>
      )}

      {jobsQ.isError && (
        <div className="glass-card p-4 text-sm text-red-300">
          {getApiErrorMessage(jobsQ.error, t("jobsLoadFailed"))}
          <button className="btn-ghost mt-3" onClick={() => jobsQ.refetch()}>{t("retry")}</button>
        </div>
      )}

      {!jobsQ.isLoading && !jobsQ.isError && jobs.length === 0 && (
        <div className="glass-card p-4 text-sm text-[var(--text-muted)]">
          {t("noJobsFound")}
        </div>
      )}

      {!jobsQ.isLoading && !jobsQ.isError && jobs.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {jobs.map((job: any) => {
            const isSaved = savedIds.has(job.job_id);
            const isApplied = appliedIds.has(job.job_id);
            const score = getPlaceholderScore(job);
            const baseLabel = score >= 90 ? t("highlyMatched") : score >= 70 ? t("forYou") : "";
            const badgeClass =
              score >= 90 ? "bg-emerald-500/20 text-emerald-200" : "bg-sky-500/20 text-sky-200";
            const imageUrl = resolveAssetUrl(job.job_image_url);

            const badgeLabel = baseLabel ? `${baseLabel} · ${t("aiComingSoon")}` : "";

            return (
              <div key={job.job_id} className="glass-card card-hover overflow-hidden rounded-2xl">
                <div className="relative">
                  {imageUrl ? (
                    <img src={imageUrl} alt={job.title} className="h-32 w-full object-cover" />
                  ) : (
                    <div className="flex h-32 items-center justify-center bg-[var(--glass)]">
                      <Briefcase size={32} className="text-[var(--text-muted)]" />
                    </div>
                  )}
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
                  {badgeLabel && (
                    <span className={`absolute ${isRtl ? "left-3" : "right-3"} top-3 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${badgeClass}`}>
                      <Sparkles size={12} />
                      {badgeLabel}
                    </span>
                  )}
                  {isApplied && (
                    <span className={`absolute ${isRtl ? "right-3" : "left-3"} top-3 rounded-full bg-emerald-500/20 px-2 py-1 text-[10px] font-semibold text-emerald-200`}>
                      {t("applied")}
                    </span>
                  )}
                </div>
                <div className="flex h-full flex-col p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-base font-semibold">{job.title}</h3>
                    <button
                      className="btn-ghost p-2"
                      onClick={() => saveMutation.mutate(job.job_id)}
                      aria-label={isSaved ? t("saved") : t("save")}
                    >
                      <Bookmark
                        size={16}
                        className={isSaved ? "text-[var(--accent)]" : "text-[var(--text-muted)]"}
                        fill={isSaved ? "currentColor" : "none"}
                      />
                    </button>
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">
                    {job.Company?.name || t("company")} · {job.location || t("remote")}
                  </p>
                  <p className="mt-2 text-sm text-[var(--text-muted)] line-clamp-2">
                    {job.description || t("noDescriptionYet")}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      className="btn-primary px-3 py-2 text-xs"
                      onClick={() => setActiveJob(job)}
                      disabled={isApplied}
                    >
                      {isApplied ? t("applied") : t("apply")}
                    </button>
                    <button
                      className="btn-ghost px-3 py-2 text-xs"
                      onClick={() => setActiveJob(job)}
                    >
                      {t("viewDetails")}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {jobsQ.hasNextPage && !jobsQ.isLoading && (
        <div className="text-center">
          <button className="btn-ghost" onClick={() => jobsQ.fetchNextPage()} aria-label={t("loadMore")}>
            {t("loadMore")}
          </button>
        </div>
      )}

      {activeJob && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/50 p-4 sm:items-center">
          <div className="glass-card w-full max-w-3xl max-h-[85vh] overflow-y-auto p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">{activeJob.title}</h2>
                <p className="text-sm text-[var(--text-muted)]">
                  {activeJob.Company?.name || t("company")} · {activeJob.location || t("remote")}
                </p>
              </div>
              <button className="btn-ghost" onClick={resetModal}>{t("close")}</button>
            </div>

            {jobDetailsQ.isLoading && <p className="mt-4 text-sm text-[var(--text-muted)]">{t("loading")}</p>}
            {jobDetailsQ.isError && (
              <p className="mt-4 text-sm text-red-300">{getApiErrorMessage(jobDetailsQ.error, t("jobDetailsFailed"))}</p>
            )}

            {jobDetailsQ.data && (
              <div className="mt-4 space-y-2 text-sm text-[var(--text-muted)]">
                {jobDetailsQ.data.description && (
                  <div>
                    <div className="text-xs uppercase text-[var(--text-muted)]">{t("jobDescription")}</div>
                    <p>{jobDetailsQ.data.description}</p>
                  </div>
                )}
                {jobDetailsQ.data.requirements && (
                  <div>
                    <div className="text-xs uppercase text-[var(--text-muted)]">{t("jobRequirements")}</div>
                    <p>{jobDetailsQ.data.requirements}</p>
                  </div>
                )}
              </div>
            )}

            <div className="mt-5 border-t border-[var(--border)] pt-4">
              {formQ.isLoading && <p className="text-sm text-[var(--text-muted)]">{t("loading")}</p>}
              {formQ.isError && <p className="text-sm text-red-300">{getApiErrorMessage(formQ.error, t("formLoadFailed"))}</p>}

              {formType === "external_link" && (
                <div className="space-y-2">
                  <p className="text-sm text-[var(--text-muted)]">{t("externalFormNote")}</p>
                  <button className="btn-primary" onClick={submitApplication}>{t("openExternalForm")}</button>
                </div>
              )}

              {formType !== "external_link" && !formQ.isLoading && !formQ.isError && (
                <div className="space-y-4">
                  {formFields.map((field) => {
                    const key = String(field.field_id || field.title);
                    const rawValue = formValues[key];
                    const value = Array.isArray(rawValue) ? "" : rawValue || "";
                    const options = field.options || field.choices || [];
                    return (
                      <div key={key}>
                        <label className="text-xs text-[var(--text-muted)]">
                          {field.title}{field.is_required ? " *" : ""}
                        </label>
                        {field.input_type === "textarea" && (
                          <textarea
                            className="field mt-2 min-h-[120px]"
                            value={value}
                            onChange={(e) => setFormValues((prev) => ({ ...prev, [key]: e.target.value }))}
                            placeholder={field.description || ""}
                          />
                        )}
                        {(field.input_type === "text" || field.input_type === "email" || field.input_type === "number") && (
                          <input
                            type={field.input_type}
                            className="field mt-2"
                            value={value}
                            onChange={(e) => setFormValues((prev) => ({ ...prev, [key]: e.target.value }))}
                            placeholder={field.description || ""}
                          />
                        )}
                        {field.input_type === "radio" && options.length > 0 && (
                          <div className="mt-2 grid gap-2 sm:grid-cols-2">
                            {options.map((opt: string) => (
                              <label key={opt} className="flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm">
                                <input
                                  type="radio"
                                  name={`field-${key}`}
                                  checked={value === opt}
                                  onChange={() => setFormValues((prev) => ({ ...prev, [key]: opt }))}
                                />
                                <span>{opt}</span>
                              </label>
                            ))}
                          </div>
                        )}
                        {field.input_type === "checkbox" && options.length > 0 && (
                          <div className="mt-2 grid gap-2 sm:grid-cols-2">
                            {options.map((opt: string) => {
                              const list = Array.isArray(rawValue) ? rawValue : [];
                              const checked = list.includes(opt);
                              return (
                                <label key={opt} className="flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => {
                                      const next = checked ? list.filter((v) => v !== opt) : [...list, opt];
                                      setFormValues((prev) => ({ ...prev, [key]: next }));
                                    }}
                                  />
                                  <span>{opt}</span>
                                </label>
                              );
                            })}
                          </div>
                        )}
                        {field.input_type === "select" && options.length > 0 && (
                          <select
                            className="field mt-2"
                            value={value}
                            onChange={(e) => setFormValues((prev) => ({ ...prev, [key]: e.target.value }))}
                          >
                            <option value="">{t("selectOption")}</option>
                            {options.map((opt: string) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        )}
                        {field.input_type === "select" && options.length === 0 && (
                          <input
                            className="field mt-2"
                            value={value}
                            onChange={(e) => setFormValues((prev) => ({ ...prev, [key]: e.target.value }))}
                            placeholder={t("selectOption")}
                          />
                        )}
                        {field.input_type === "file" && (
                          <input
                            className="field mt-2"
                            value={value}
                            onChange={(e) => setFormValues((prev) => ({ ...prev, [key]: e.target.value }))}
                            placeholder={t("fileFieldNote")}
                          />
                        )}
                        {field.description && <p className="mt-1 text-xs text-[var(--text-muted)]">{field.description}</p>}
                      </div>
                    );
                  })}

                  <div>
                    <label className="text-xs text-[var(--text-muted)]">{t("coverLetter")}</label>
                    <textarea
                      className="field mt-2 min-h-[120px]"
                      value={coverLetter}
                      onChange={(e) => setCoverLetter(e.target.value)}
                      placeholder={t("coverLetterPlaceholder")}
                    />
                  </div>

                  <div className="rounded-xl border border-[var(--border)] p-3">
                    <div className="text-sm font-semibold">{t("chooseCv")}</div>
                    <div className="mt-2 grid gap-2 md:grid-cols-2">
                      <select
                        className="field"
                        value={selectedCvId}
                        onChange={(e) => setSelectedCvId(e.target.value ? Number(e.target.value) : "")}
                      >
                        <option value="">{t("selectCv")}</option>
                        {(cvsQ.data || []).map((cv: any) => (
                          <option key={cv.cv_id} value={cv.cv_id}>{cv.title || `CV #${cv.cv_id}`}</option>
                        ))}
                      </select>
                      <input
                        type="file"
                        className="field"
                        accept=".pdf,.doc,.docx"
                        onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                      />
                    </div>
                    {requireCv && <p className="mt-2 text-xs text-[var(--text-muted)]">{t("cvRequired")}</p>}
                  </div>

                  {formError && <p className="text-sm text-red-300">{formError}</p>}
                  {formSuccess && <p className="text-sm text-emerald-300">{formSuccess}</p>}

                  <div className="flex gap-2">
                    <button className="btn-primary" onClick={submitApplication} disabled={quickApply.isPending}>
                      {t("submitApplication")}
                    </button>
                    <button className="btn-ghost" onClick={resetModal}>{t("cancel")}</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showAnalyzePrompt && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4">
          <div className="glass-card w-full max-w-md p-5">
            <h3 className="text-lg font-semibold">{t("analyzeRequiredTitle")}</h3>
            <p className="mt-2 text-sm text-[var(--text-muted)]">{t("analyzeRequiredDesc")}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                className="btn-primary"
                onClick={() => {
                  setShowAnalyzePrompt(false);
                  navigate("/cv-lab");
                }}
              >
                {t("goToCvLab")}
              </button>
              <button className="btn-ghost" onClick={() => setShowAnalyzePrompt(false)}>
                {t("close")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OpportunitiesPage;




