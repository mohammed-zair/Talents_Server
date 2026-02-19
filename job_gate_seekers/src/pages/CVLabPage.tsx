import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { seekerApi } from "../services/api";
import { useLanguage } from "../contexts/LanguageContext";
import { getApiErrorMessage } from "../utils/apiError";

const weakTerms = ["responsible for", "helped", "worked on", "tasked with"];
const strongTerms = ["led", "delivered", "optimized", "increased", "built"];

const escapeRegex = (input: string) => input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const buildWordBoundaryRegex = (term: string) =>
  new RegExp(`\\b${escapeRegex(term).replace(/\\s+/g, "\\\\s+")}\\b`, "i");

const toList = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.filter(Boolean).map((v) => String(v));
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
  const [text, setText] = useState("");
  const [analysis, setAnalysis] = useState<any>(null);
  const [analysisInfo, setAnalysisInfo] = useState("");
  const [analysisError, setAnalysisError] = useState("");
  const [uploadFeedback, setUploadFeedback] = useState("");
  const [uploadError, setUploadError] = useState("");

  const queryClient = useQueryClient();
  const { t } = useLanguage();

  const cvsQ = useQuery({ queryKey: ["cvs"], queryFn: seekerApi.listCVs });
  const cvItems = useMemo(() => (Array.isArray(cvsQ.data) ? cvsQ.data : []), [cvsQ.data]);
  const selectedCv = useMemo(
    () => cvItems.find((cv) => cv.cv_id === selectedCvId) || cvItems[0],
    [cvItems, selectedCvId]
  );

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

  const weakFound = weakTerms.filter((w) => buildWordBoundaryRegex(w).test(text));
  const strongFound = strongTerms.filter((s) => buildWordBoundaryRegex(s).test(text));
  const selectedCvHref = getCvPublicHref(selectedCv?.file_url);

  const analysisInsights = analysis?.ai_insights?.ai_intelligence || analysis?.ai_intelligence || {};
  const strengthItems = toList(analysisInsights?.strengths);
  const weaknessItems = toList(analysisInsights?.weaknesses);
  const recommendationItems = toList(analysisInsights?.recommendations);
  const keySkills = toList(analysis?.features_analytics?.key_skills);
  const atsScore = analysis?.features_analytics?.ats_score;
  const experience = analysis?.features_analytics?.total_years_experience;

  const hasAnalysisCards =
    Number.isFinite(atsScore) ||
    Number.isFinite(experience) ||
    keySkills.length > 0 ||
    strengthItems.length > 0 ||
    weaknessItems.length > 0 ||
    recommendationItems.length > 0;

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
              className={`w-full rounded-xl border p-3 text-left ${
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
              onChange={(e) => {
                setUploadError("");
                setUploadFeedback("");
                if (e.target.files?.[0]) uploadMutation.mutate(e.target.files[0]);
              }}
            />
          </label>

          {selectedCvHref && (
            <a className="btn-ghost" href={selectedCvHref} target="_blank" rel="noreferrer">
              {t("previewCv")}
            </a>
          )}

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
            disabled={analyzeMutation.isPending || !selectedCv}
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
        <h2 className="mb-3 text-xl font-semibold">{t("aiRecommendations")}</h2>
        <p className="mb-3 text-xs text-[var(--text-muted)]">{t("cvLabRightHint")}</p>

        <textarea
          className="field min-h-[180px]"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("pasteBulletsPlaceholder")}
        />

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-red-500/40 p-3 text-sm">
            <p className="font-semibold text-red-300">{t("weakPhrasing")}</p>
            <p>{weakFound.length ? weakFound.join(", ") : t("noWeakPhrases")}</p>
          </div>
          <div className="rounded-xl border border-emerald-500/40 p-3 text-sm">
            <p className="font-semibold text-emerald-300">{t("strongImpact")}</p>
            <p>{strongFound.length ? strongFound.join(", ") : t("addImpactVerbs")}</p>
          </div>
        </div>

        {analysis && (
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
                  <div className="rounded-xl border border-emerald-500/35 p-3">
                    <p className="mb-2 text-sm font-semibold text-emerald-300">{t("strengths")}</p>
                    <ul className="list-disc space-y-1 pl-5 text-sm">
                      {strengthItems.slice(0, 6).map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {weaknessItems.length > 0 && (
                  <div className="rounded-xl border border-red-500/35 p-3">
                    <p className="mb-2 text-sm font-semibold text-red-300">{t("weaknesses")}</p>
                    <ul className="list-disc space-y-1 pl-5 text-sm">
                      {weaknessItems.slice(0, 6).map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {recommendationItems.length > 0 && (
                  <div className="rounded-xl border border-[var(--border)] p-3">
                    <p className="mb-2 text-sm font-semibold">{t("recommendations")}</p>
                    <ul className="list-disc space-y-1 pl-5 text-sm">
                      {recommendationItems.slice(0, 8).map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <pre className="max-h-52 overflow-auto rounded-xl border border-[var(--border)] p-3 text-xs">
                {JSON.stringify(analysis, null, 2)}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CVLabPage;
