import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { seekerApi } from "../services/api";
import { useLanguage } from "../contexts/LanguageContext";
import { getApiErrorMessage } from "../utils/apiError";

const toList = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.filter(Boolean).map((v) => String(v));
};

const parseJsonMaybe = (value: unknown) => {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const CANONICAL_SECTION_ORDER = [
  "contact_information",
  "professional_summary",
  "core_competencies",
  "professional_experience",
  "projects",
  "education",
  "certifications_awards",
] as const;

const REQUIRED_SECTIONS = [
  "contact_information",
  "professional_summary",
  "core_competencies",
  "professional_experience",
  "education",
] as const;

const isNonEmptyValue = (value: unknown): boolean => {
  if (value == null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.some((entry) => isNonEmptyValue(entry));
  if (typeof value === "object") return Object.values(value as Record<string, unknown>).some((entry) => isNonEmptyValue(entry));
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "boolean") return true;
  return false;
};

const asString = (value: unknown) => String(value ?? "").trim();
const asArray = (value: unknown) => (Array.isArray(value) ? value : []);

const normalizeContact = (value: unknown) => {
  const obj = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const full_name = asString(obj.name || obj.full_name);
  const professional_title = asString(obj.title || obj.professional_title || obj.role);
  const email = asString(obj.email);
  const phone = asString(obj.phone);
  const location = asString(obj.location);
  const linkedin_url = asString(obj.linkedin || obj.linkedin_url || obj.linkedin_profile);
  return {
    full_name,
    professional_title,
    email,
    phone,
    location,
    linkedin_url,
  };
};

const normalizeExperience = (value: unknown) =>
  asArray(value)
    .map((item) => {
      const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
      const bullets = asArray(row.achievements || row.bullets || row.responsibilities)
        .map((b) => asString(b))
        .filter(Boolean);
      return {
        job_title: asString(row.title || row.job_title || row.role),
        company: asString(row.company || row.organization),
        location: asString(row.location),
        start_date: asString(row.start_date || row.start || row.from),
        end_date: asString(row.end_date || row.end || row.to),
        is_current: Boolean(row.is_current || row.current),
        bullets,
      };
    })
    .filter((row) => isNonEmptyValue(row));

const normalizeProjects = (value: unknown) =>
  asArray(value)
    .map((item) => {
      const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
      const bullets = asArray(row.achievements || row.bullets || row.highlights)
        .map((b) => asString(b))
        .filter(Boolean);
      const tech_stack = asArray(row.tech_stack || row.technologies || row.stack)
        .map((tech) => asString(tech))
        .filter(Boolean);
      return {
        title: asString(row.title || row.name),
        role: asString(row.role),
        start_date: asString(row.start_date || row.start || row.from),
        end_date: asString(row.end_date || row.end || row.to),
        objective: asString(row.objective || row.description || row.summary),
        tech_stack,
        bullets,
      };
    })
    .filter((row) => isNonEmptyValue(row));

const normalizeEducation = (value: unknown) =>
  asArray(value)
    .map((item) => {
      const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
      return {
        degree: asString(row.degree || row.title),
        institution: asString(row.school || row.institution || row.university),
        graduation_year: asString(row.graduation_year || row.year || row.years),
        coursework: asArray(row.coursework).map((c) => asString(c)).filter(Boolean),
      };
    })
    .filter((row) => isNonEmptyValue(row));

const normalizeCertificationsAwards = (structured: Record<string, unknown>) => {
  const certs = asArray(structured.certifications).map((item) => ({
    type: "certification",
    name: asString(item),
    acronym: "",
    issuer: "",
    date: "",
  }));
  const awards = asArray((structured as any).awards).map((item) => ({
    type: "award",
    name: asString(item),
    acronym: "",
    issuer: "",
    date: "",
  }));
  return [...certs, ...awards].filter((entry) => isNonEmptyValue(entry.name));
};

const normalizeSkills = (structured: Record<string, unknown>, features: Record<string, unknown>) => {
  const skillPool = [
    ...asArray(structured.skills).map((s) => asString(s)),
    ...asArray(features.key_skills).map((s) => asString(s)),
  ].filter(Boolean);
  const unique = Array.from(new Set(skillPool));
  return {
    programming: unique,
    frameworks: [],
    tools_platforms: [],
    domain_expertise: [],
    other: [],
  };
};

const buildCvBuilderSchemaV2 = (
  structured: Record<string, unknown>,
  features: Record<string, unknown>
) => {
  const contact_information = normalizeContact(structured.personal_info);
  const professional_summary = asString(structured.summary);
  const core_competencies = normalizeSkills(structured, features);
  const professional_experience = normalizeExperience(structured.experience);
  const projects = normalizeProjects(structured.projects);
  const education = normalizeEducation(structured.education);
  const certifications_awards = normalizeCertificationsAwards(structured);

  const sections = {
    contact_information: {
      exists: isNonEmptyValue(contact_information),
      data: contact_information,
    },
    professional_summary: {
      exists: isNonEmptyValue(professional_summary),
      data: professional_summary,
    },
    core_competencies: {
      exists: isNonEmptyValue(core_competencies),
      data: core_competencies,
    },
    professional_experience: {
      exists: isNonEmptyValue(professional_experience),
      data: professional_experience,
    },
    projects: {
      exists: isNonEmptyValue(projects),
      data: projects,
    },
    education: {
      exists: isNonEmptyValue(education),
      data: education,
    },
    certifications_awards: {
      exists: isNonEmptyValue(certifications_awards),
      data: certifications_awards,
    },
  };

  const missing_required_sections = REQUIRED_SECTIONS.filter(
    (sectionKey) => !sections[sectionKey].exists
  );

  const blocking_errors: string[] = [];
  if (!sections.contact_information.exists) {
    blocking_errors.push("contact_information_missing");
  } else {
    const contactData = sections.contact_information.data;
    if (!contactData.full_name) blocking_errors.push("contact_full_name_missing");
    if (!contactData.email) blocking_errors.push("contact_email_missing");
    if (!contactData.phone) blocking_errors.push("contact_phone_missing");
    if (!contactData.location) blocking_errors.push("contact_location_missing");
  }

  return {
    schema_version: 2,
    section_order: [...CANONICAL_SECTION_ORDER],
    sections,
    missing_required_sections,
    validation: {
      blocking_errors,
      warnings: missing_required_sections.map((key) => `${key}_missing`),
    },
  };
};

const getCvPublicHref = (fileUrl?: string) => {
  if (!fileUrl) return null;
  if (/^https?:\/\//i.test(fileUrl)) return fileUrl;

  const normalized = fileUrl.replace(/\\/g, "/");
  const directIndex = normalized.indexOf("/uploads/");
  if (directIndex >= 0) return `${window.location.origin}${normalized.slice(directIndex)}`;

  const nestedIndex = normalized.indexOf("uploads/");
  if (nestedIndex >= 0) return `${window.location.origin}/${normalized.slice(nestedIndex)}`;

  return null;
};

const CVLabPage: React.FC = () => {
  const [selectedCvId, setSelectedCvId] = useState<number | null>(null);
  const [cvTitle, setCvTitle] = useState("");
  const [analysis, setAnalysis] = useState<any>(null);
  const [analysisInfo, setAnalysisInfo] = useState("");
  const [analysisError, setAnalysisError] = useState("");
  const [enhanceError, setEnhanceError] = useState("");
  const [uploadFeedback, setUploadFeedback] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [selectedInsightId, setSelectedInsightId] = useState<number | null>(null);
  const [enhanceUsedByCv, setEnhanceUsedByCv] = useState<Record<number, boolean>>({});

  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const isRtl = language === "ar";

  const cvsQ = useQuery({ queryKey: ["cvs"], queryFn: seekerApi.listCVs });
  const cvItems = useMemo(() => (Array.isArray(cvsQ.data) ? cvsQ.data : []), [cvsQ.data]);
  const selectedCv = useMemo(
    () => cvItems.find((cv) => cv.cv_id === selectedCvId) || cvItems[0],
    [cvItems, selectedCvId]
  );
  const historyQ = useQuery({
    queryKey: ["cv-analysis-history", selectedCv?.cv_id],
    queryFn: () => seekerApi.getCvAnalysisHistory(selectedCv?.cv_id ?? 0),
    enabled: !!selectedCv?.cv_id,
  });
  const cvAnalysisQ = useQuery({
    queryKey: ["cv-analysis", selectedCv?.cv_id],
    queryFn: () => seekerApi.getCvAnalysis(selectedCv?.cv_id ?? 0),
    enabled: !!selectedCv?.cv_id,
  });
  const historyItems = useMemo(() => (Array.isArray(historyQ.data) ? historyQ.data : []), [historyQ.data]);
  const maxCvReached = cvItems.length >= 3;
  const hasAnalysisRun = historyItems.length > 0;

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCv) throw new Error(t("selectCvFirst"));
      return seekerApi.analyzeCvExisting(selectedCv.cv_id, { useAI: true });
    },
    onSuccess: (data: any) => {
      setAnalysisError("");
      setAnalysis(data);
      if (data?.partial) {
        setAnalysisInfo(t("analysisPartial"));
      } else {
        setAnalysisInfo(t("analysisReady"));
      }
    },
    onError: (error: unknown) => {
      setAnalysis(null);
      setAnalysisInfo("");
      const fallback = t("cvAnalyzeFailed");
      const message = getApiErrorMessage(error, fallback);
      const requestId = (error as any)?.response?.data?.requestId;
      setAnalysisError(requestId ? `${message} [${requestId}]` : message);
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append("cv_file", file);
      fd.append("cv_title", cvTitle.trim() || file.name);
      return seekerApi.uploadCV(fd);
    },
    onSuccess: (data: any) => {
      setUploadError("");
      setUploadFeedback(t("cvUploadSuccess"));
      setCvTitle("");

      const newCvId = Number(data?.cv_id);
      if (Number.isFinite(newCvId) && newCvId > 0) {
        setSelectedCvId(newCvId);
      }

      queryClient.invalidateQueries({ queryKey: ["cvs"] });
    },
    onError: (error: unknown) => {
      setUploadFeedback("");
      setUploadError(getApiErrorMessage(error, t("cvUploadFailed")));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => seekerApi.deleteCV(id),
    onSuccess: () => {
      setAnalysis(null);
      setAnalysisError("");
      setAnalysisInfo("");
      queryClient.invalidateQueries({ queryKey: ["cvs"] });
    },
  });

  const selectedCvHref = getCvPublicHref(selectedCv?.file_url);
  const selectedCvIdSafe = selectedCv?.cv_id ?? null;
  const hasUsedEnhanceForSelectedCv = Boolean(
    selectedCvIdSafe ? enhanceUsedByCv[selectedCvIdSafe] : false
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem("twt_cv_enhance_used");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        const normalized: Record<number, boolean> = {};
        Object.entries(parsed as Record<string, unknown>).forEach(([key, value]) => {
          const n = Number(key);
          if (Number.isFinite(n) && value === true) normalized[n] = true;
        });
        setEnhanceUsedByCv(normalized);
      }
    } catch {
      // ignore invalid local cache
    }
  }, []);

  useEffect(() => {
    if (!historyItems.length) {
      setSelectedInsightId(null);
      return;
    }
    if (!selectedInsightId || !historyItems.some((item) => item?.insight_id === selectedInsightId)) {
      setSelectedInsightId(historyItems[0]?.insight_id ?? null);
    }
  }, [historyItems, selectedInsightId]);

  const activeInsight =
    historyItems.find((item) => item?.insight_id === selectedInsightId) || historyItems[0] || null;
  const rawAiIntelligence =
    activeInsight?.ai_intelligence || analysis?.ai_insights?.ai_intelligence || analysis?.ai_intelligence || {};
  const analysisInsights = parseJsonMaybe(rawAiIntelligence) || {};
  const strategic = analysisInsights?.strategic_analysis || {};
  const strengthItems = toList(analysisInsights?.strengths || strategic?.strengths);
  const weaknessItems = toList(analysisInsights?.weaknesses || strategic?.weaknesses);
  const recommendationItems = toList(
    analysisInsights?.recommendations || analysisInsights?.ats_optimization_tips
  );
  const snapshotFeatures =
    activeInsight?.features_analytics ||
    analysis?.features_analytics ||
    cvAnalysisQ.data?.features_analytics ||
    {};
  const snapshotStructured =
    activeInsight?.structured_data ||
    analysis?.structured_data ||
    cvAnalysisQ.data?.structured_data ||
    {};
  const keySkills = toList(snapshotFeatures?.key_skills);
  const atsScore = activeInsight?.ats_score ?? snapshotFeatures?.ats_score;
  const industryScore = activeInsight?.industry_ranking_score;
  const industryLabel = activeInsight?.industry_ranking_label;
  const experience = snapshotFeatures?.total_years_experience;
  const aiSummary =
    analysisInsights?.summary ||
    analysisInsights?.contextual_summary ||
    analysisInsights?.professional_summary ||
    strategic?.summary ||
    "";

  const buildEnhancePayload = () => {
    const structured = (snapshotStructured && typeof snapshotStructured === "object"
      ? snapshotStructured
      : {}) as Record<string, unknown>;
    const features = (snapshotFeatures && typeof snapshotFeatures === "object"
      ? snapshotFeatures
      : {}) as Record<string, unknown>;
    const builderSchema = buildCvBuilderSchemaV2(structured, features);
    const sections_present = CANONICAL_SECTION_ORDER.filter(
      (section) => builderSchema.sections[section].exists
    );

    return {
      message_type: "cv_builder_v2_seed",
      cv_id: selectedCv?.cv_id,
      cv_title: selectedCv?.title,
      analyzed_at: activeInsight?.created_at || analysis?.created_at || null,
      schema_version: builderSchema.schema_version,
      section_order: builderSchema.section_order,
      sections_present,
      missing_required_sections: builderSchema.missing_required_sections,
      sections: builderSchema.sections,
      validation: builderSchema.validation,
      note:
        sections_present.length === 0
          ? "No structured CV sections were detected from this analysis. Ask the user to upload a clearer ATS-friendly CV."
          : undefined,
    };
  };

  const enhanceMutation = useMutation({
    mutationFn: async () => {
      const payload = buildEnhancePayload();
      const start = await seekerApi.startChat({
        language: language === "ar" ? "arabic" : "english",
        initialData: {},
      });
      const id = start?.session_id || start?.sessionId || start?.id;
      if (!id) throw new Error(t("startFailed"));
      const message = JSON.stringify(payload, null, 2);
      await seekerApi.sendChat({ sessionId: String(id), message });
      return String(id);
    },
    onSuccess: (id: string) => {
      setEnhanceError("");
      localStorage.setItem("twt_ai_session", id);
      if (selectedCvIdSafe) {
        setEnhanceUsedByCv((prev) => {
          const next = { ...prev, [selectedCvIdSafe]: true };
          if (typeof window !== "undefined") {
            window.localStorage.setItem("twt_cv_enhance_used", JSON.stringify(next));
          }
          return next;
        });
      }
      navigate("/ai-consultant");
    },
    onError: (error: unknown) => {
      setEnhanceError(getApiErrorMessage(error, t("enhanceFailed")));
    },
  });

  const hasAnalysisCards =
    Number.isFinite(atsScore) ||
    Number.isFinite(experience) ||
    keySkills.length > 0 ||
    strengthItems.length > 0 ||
    weaknessItems.length > 0 ||
    recommendationItems.length > 0;
  const hasAnyAnalysis = Boolean(analysis || activeInsight);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="glass-card p-4">
        <h2 className="mb-3 text-xl font-semibold">{t("cvPreview")}</h2>
        <p className="mb-3 text-xs text-[var(--text-muted)]">{t("cvLabLeftHint")}</p>

        <label className="mb-3 block text-sm">
          <span className="mb-1 block text-xs text-[var(--text-muted)]">{t("cvTitle")}</span>
          <input
            className="field"
            value={cvTitle}
            onChange={(e) => setCvTitle(e.target.value)}
            placeholder={t("cvTitlePlaceholder")}
            maxLength={120}
          />
        </label>

        <div className="space-y-2">
          {cvItems.length === 0 && (
            <div className="rounded-xl border border-[var(--border)] p-3 text-sm text-[var(--text-muted)]">
              {t("noCvYet")}
            </div>
          )}

          {cvItems.map((cv) => (
            <button
              key={cv.cv_id}
              onClick={() => setSelectedCvId(cv.cv_id)}
              className={`w-full rounded-xl border p-3 text-start ${
                selectedCv?.cv_id === cv.cv_id ? "border-[var(--accent)]" : "border-[var(--border)]"
              }`}
            >
              <div className="font-medium">{cv.title}</div>
              <div className="mt-1 text-xs text-[var(--text-muted)]">
                {cv.created_at ? new Date(cv.created_at).toLocaleDateString() : t("noData")}
              </div>
            </button>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <label className="btn-ghost cursor-pointer">
            {t("uploadCv")}
            <input
              id="cv-upload-input"
              type="file"
              accept=".pdf,.doc,.docx"
              className="hidden"
              aria-describedby="cv-upload-feedback"
              disabled={maxCvReached || uploadMutation.isPending}
              onChange={(e) => {
                setUploadError("");
                setUploadFeedback("");
                if (maxCvReached) {
                  setUploadError(t("cvUploadLimitReached"));
                  return;
                }
                if (e.target.files?.[0]) uploadMutation.mutate(e.target.files[0]);
              }}
            />
          </label>

          {selectedCv && (
            <button
              className="btn-ghost"
              onClick={() => {
                if (window.confirm(t("confirmDeleteCv"))) {
                  deleteMutation.mutate(selectedCv.cv_id);
                }
              }}
            >
              {t("deleteCv")}
            </button>
          )}

          <button
            className={`btn-primary ${analyzeMutation.isPending ? "btn-loading" : ""}`}
            onClick={() => analyzeMutation.mutate()}
            disabled={analyzeMutation.isPending || !selectedCv || hasAnalysisRun}
          >
            {analyzeMutation.isPending ? (
              <span className="loading-orbit" aria-live="polite">
                <span>{t("analyzingCv")}</span>
                <i aria-hidden="true" />
                <i aria-hidden="true" />
                <i aria-hidden="true" />
              </span>
            ) : (
              t("analyze")
            )}
          </button>
        </div>

        <div id="cv-upload-feedback" aria-live="polite">
          {uploadMutation.isPending && (
            <p className="mt-2 text-xs text-[var(--text-muted)]">{t("uploading")}</p>
          )}
          {uploadFeedback && <p className="mt-2 text-sm text-emerald-300">{uploadFeedback}</p>}
          {uploadError && <p className="mt-2 text-sm text-red-300">{uploadError}</p>}
          {analysisInfo && <p className="mt-2 text-sm text-emerald-300">{analysisInfo}</p>}
          {hasAnalysisRun && (
            <p className="mt-2 text-sm text-[var(--text-muted)]">{t("cvAnalyzeOnceHint")}</p>
          )}

          {analysisError && (
            <div className="mt-2 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">
              <p>{analysisError}</p>
              <button className="btn-ghost mt-2" onClick={() => analyzeMutation.mutate()}>
                {t("retryAnalysis")}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="glass-card p-4">
        <h2 className="mb-3 text-xl font-semibold">{t("aiAnalysis")}</h2>

        {hasAnyAnalysis && (
          <div className="mb-4 rounded-xl border border-[var(--border)] p-3">
            <div className="text-sm font-semibold">{t("enhanceTitle")}</div>
            <p className="mt-1 text-xs text-[var(--text-muted)]">{t("enhanceDescription")}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                className={`btn-primary ${enhanceMutation.isPending ? "btn-loading" : ""}`}
                onClick={() => enhanceMutation.mutate()}
                disabled={enhanceMutation.isPending || hasUsedEnhanceForSelectedCv}
              >
                {enhanceMutation.isPending
                  ? t("enhanceStarting")
                  : hasUsedEnhanceForSelectedCv
                    ? (language === "ar" ? "تم الاستخدام لهذه السيرة" : "Already used for this CV")
                    : t("enhanceNow")}
              </button>
              {enhanceError && <p className="text-xs text-red-300">{enhanceError}</p>}
            </div>
          </div>
        )}

        <div className="mt-3 rounded-xl border border-[var(--border)] p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold">{t("analysisHistory")}</p>
            {historyQ.isLoading && <span className="text-xs text-[var(--text-muted)]">{t("loading")}</span>}
          </div>
          {historyQ.isError && (
            <p className="text-xs text-red-300">{t("analysisHistoryFailed")}</p>
          )}
          {!historyQ.isLoading && historyItems.length === 0 && (
            <p className="text-xs text-[var(--text-muted)]">{t("analysisHistoryEmpty")}</p>
          )}
          <div className="space-y-2">
            {historyItems.map((item: any, index: number) => {
              const isActive = item?.insight_id === selectedInsightId;
              const createdAt = item?.created_at ? new Date(item.created_at).toLocaleString() : "";
              const method = item?.analysis_method ? String(item.analysis_method) : t("analysisRun");
              const label = createdAt ? `${method} - ${createdAt}` : method;
              return (
                <div
                  key={item?.insight_id ?? index}
                  className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-start text-xs ${
                    isActive
                      ? "border-[var(--accent)] bg-[var(--accent)]/10"
                      : "border-[var(--border)] hover:border-[var(--accent)]/40"
                  }`}
                >
                  <div>
                    <span className="font-medium">{label}</span>
                    {index === 0 && (
                      <span className={`${isRtl ? "mr-2" : "ml-2"} text-[var(--text-muted)]`}>{t("analysisLatest")}</span>
                    )}
                  </div>
                  <button
                    type="button"
                    className="btn-ghost text-xs"
                    onClick={() => setSelectedInsightId(item?.insight_id ?? null)}
                  >
                    {t("viewAnalysis")}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {hasAnyAnalysis && (
          <div className="mt-4 space-y-3">
            {hasAnalysisCards ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-[var(--border)] p-3">
                    <p className="text-xs text-[var(--text-muted)]">{t("atsScore")}</p>
                    <p className="text-2xl font-semibold">
                      {Number.isFinite(atsScore) ? `${Math.round(atsScore)}%` : "-"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[var(--border)] p-3">
                    <p className="text-xs text-[var(--text-muted)]">{t("experienceYears")}</p>
                    <p className="text-2xl font-semibold">
                      {Number.isFinite(experience) ? `${experience}${t("yearsSuffix")}` : "-"}
                    </p>
                  </div>
                </div>

                {(Number.isFinite(industryScore) || industryLabel) && (
                  <div className="rounded-xl border border-[var(--border)] p-3">
                    <p className="text-xs text-[var(--text-muted)]">{t("industryRanking")}</p>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <p className="text-lg font-semibold">
                        {Number.isFinite(industryScore) ? Math.round(industryScore) : "-"}
                      </p>
                      {industryLabel && (
                        <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-xs">
                          {industryLabel}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {aiSummary && (
                  <div className="rounded-xl border border-[var(--border)] p-3">
                    <p className="mb-2 text-sm font-semibold">{t("aiSummary")}</p>
                    <p className="text-sm text-[var(--text-muted)]">{aiSummary}</p>
                  </div>
                )}

                {keySkills.length > 0 && (
                  <div className="rounded-xl border border-[var(--border)] p-3">
                    <p className="mb-2 text-sm font-semibold">{t("keySkills")}</p>
                    <div className="flex flex-wrap gap-2">
                      {keySkills.slice(0, 12).map((skill) => (
                        <span key={skill} className="badge">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {strengthItems.length > 0 && (
                  <div className="rounded-xl border border-emerald-500/35 bg-emerald-500/5 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-sm font-semibold text-emerald-300">{t("strengths")}</p>
                      <span className="rounded-full border border-emerald-500/40 px-2 py-0.5 text-xs text-emerald-300">
                        {strengthItems.length}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {strengthItems.slice(0, 8).map((item, idx) => (
                        <div
                          key={`${item}-${idx}`}
                          className="rounded-lg border border-emerald-500/20 bg-[var(--glass)] p-2 text-sm"
                        >
                          <span className={`${isRtl ? "ml-2" : "mr-2"} text-xs text-emerald-200`}>{String(idx + 1).padStart(2, "0")}.</span>
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {weaknessItems.length > 0 && (
                  <div className="rounded-xl border border-red-500/35 bg-red-500/5 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-sm font-semibold text-red-300">{t("weaknesses")}</p>
                      <span className="rounded-full border border-red-500/40 px-2 py-0.5 text-xs text-red-300">
                        {weaknessItems.length}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {weaknessItems.slice(0, 8).map((item, idx) => (
                        <div
                          key={`${item}-${idx}`}
                          className="rounded-lg border border-red-500/20 bg-[var(--glass)] p-2 text-sm"
                        >
                          <span className={`${isRtl ? "ml-2" : "mr-2"} text-xs text-red-200`}>{String(idx + 1).padStart(2, "0")}.</span>
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {recommendationItems.length > 0 && (
                  <div className="rounded-xl border border-[var(--border)] p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-sm font-semibold">{t("recommendations")}</p>
                      <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-xs text-[var(--text-muted)]">
                        {recommendationItems.length}
                      </span>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {recommendationItems.slice(0, 10).map((item, idx) => (
                        <div
                          key={`${item}-${idx}`}
                          className="rounded-lg border border-[var(--border)] bg-[var(--glass)] p-2 text-sm"
                        >
                          <span className={`${isRtl ? "ml-2" : "mr-2"} text-xs text-[var(--text-muted)]`}>{String(idx + 1).padStart(2, "0")}.</span>
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <details className="rounded-xl border border-[var(--border)] p-3">
                  <summary className="cursor-pointer text-sm font-semibold">{t("fullAiResponse")}</summary>
                  <div className="mt-3 space-y-3 text-xs">
                    <div>
                      <p className="mb-1 text-[var(--text-muted)]">{t("aiIntelligence")}</p>
                      <pre className="max-h-64 overflow-auto rounded-lg border border-[var(--border)] bg-[var(--glass)] p-2">
                        {JSON.stringify(analysisInsights, null, 2)}
                      </pre>
                    </div>
                    <div>
                      <p className="mb-1 text-[var(--text-muted)]">{t("featuresAnalytics")}</p>
                      <pre className="max-h-64 overflow-auto rounded-lg border border-[var(--border)] bg-[var(--glass)] p-2">
                        {JSON.stringify(snapshotFeatures || {}, null, 2)}
                      </pre>
                    </div>
                    <div>
                      <p className="mb-1 text-[var(--text-muted)]">{t("structuredData")}</p>
                      <pre className="max-h-64 overflow-auto rounded-lg border border-[var(--border)] bg-[var(--glass)] p-2">
                        {JSON.stringify(snapshotStructured || {}, null, 2)}
                      </pre>
                    </div>
                    {activeInsight?.ai_raw_response && (
                      <div>
                        <p className="mb-1 text-[var(--text-muted)]">{t("rawAiResponse")}</p>
                        <pre className="max-h-64 overflow-auto rounded-lg border border-[var(--border)] bg-[var(--glass)] p-2">
                          {JSON.stringify(activeInsight.ai_raw_response || {}, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              </>
            ) : (
              <pre className="max-h-52 overflow-auto rounded-xl border border-[var(--border)] p-3 text-xs">
                {JSON.stringify(activeInsight || analysis, null, 2)}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CVLabPage;
