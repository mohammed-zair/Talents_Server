﻿import React, { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Briefcase, Loader2, Mic, RefreshCw, Sparkles } from "lucide-react";
import { seekerApi } from "../services/api";
import { useLanguage } from "../contexts/LanguageContext";
import { getApiErrorMessage } from "../utils/apiError";

const SESSION_KEY = "twt_ai_session";

type ChatMessage = { role: string; text: string };

type InsightsData = {
  is_complete?: boolean;
  current_step?: string;
  score?: {
    score?: number;
    checklist?: string[];
  };
  final_summary?: any;
  session_title?: string | null;
};

const normalizeMessages = (raw: any): ChatMessage[] => {
  const payload = raw?.session || raw?.data?.session || raw;
  const list =
    payload?.conversation || payload?.messages || payload?.history || (Array.isArray(payload) ? payload : null);
  if (!Array.isArray(list)) return [];
  return list.map((m: any) => ({
    role: m.role || m.sender || "assistant",
    text: m.text || m.message || m.content || "",
  }));
};

const getSessionTitle = (session: any) =>
  session?.session_title || session?.job_posting_meta?.session_title || session?.metadata?.session_title || "";

const formatSessionLabel = (s: any, t: (key: string) => string) => {
  const mode = s?.mode || s?.initial_data?.mode || s?.metadata?.mode;
  const label = mode === "mock_interview" ? t("sessionLabelMock") : t("sessionLabelCareer");
  const created = s?.created_at || s?.createdAt || s?.started_at;
  const date = created ? new Date(created).toLocaleString() : "";
  return date ? `${label} · ${date}` : label;
};

const AIConsultantPage: React.FC = () => {
  const [sessionId, setSessionId] = useState<string>("");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeTab, setActiveTab] = useState<"preview" | "insights" | "export">("preview");
  const [chatError, setChatError] = useState("");
  const [showSessions, setShowSessions] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [titleError, setTitleError] = useState("");
  const [titleSuccess, setTitleSuccess] = useState("");
  const [sessionSuccess, setSessionSuccess] = useState("");
  const [exportFormat, setExportFormat] = useState<"pdf" | "docx" | null>(null);
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(SESSION_KEY);
    if (stored) setSessionId(stored);
  }, []);

  useEffect(() => {
    if (sessionId) localStorage.setItem(SESSION_KEY, sessionId);
    if (!sessionId) {
      setMessages([]);
      setTitleDraft("");
    }
  }, [sessionId]);

  useEffect(() => {
    if (sessionId) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [sessionId]);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [message]);

  useEffect(() => {
    if (!titleSuccess) return;
    const timer = window.setTimeout(() => setTitleSuccess(""), 2000);
    return () => window.clearTimeout(timer);
  }, [titleSuccess]);

  useEffect(() => {
    if (!sessionSuccess) return;
    const timer = window.setTimeout(() => setSessionSuccess(""), 2500);
    return () => window.clearTimeout(timer);
  }, [sessionSuccess]);

  const sessionsQ = useQuery({ queryKey: ["chat-sessions"], queryFn: seekerApi.listChatSessions });
  const sessionItems = useMemo(() => (Array.isArray(sessionsQ.data) ? sessionsQ.data : []), [sessionsQ.data]);
  const selectedSession = useMemo(
    () => sessionItems.find((s: any) => String(s.session_id || s.id || "") === sessionId),
    [sessionItems, sessionId]
  );

  useEffect(() => {
    if (!selectedSession) return;
    setTitleDraft(getSessionTitle(selectedSession) || "");
  }, [selectedSession]);

  const sessionQ = useQuery({
    queryKey: ["chat-session", sessionId],
    queryFn: () => seekerApi.getChatSession(sessionId),
    enabled: !!sessionId,
  });

  useEffect(() => {
    if (!sessionQ.data) return;
    const normalized = normalizeMessages(sessionQ.data);
    if (normalized.length) setMessages(normalized);
  }, [sessionQ.data]);

  const previewQ = useQuery({
    queryKey: ["chat-preview", sessionId, language],
    queryFn: () => seekerApi.getChatPreview(sessionId, language === "ar" ? "ar" : "en"),
    enabled: !!sessionId,
  });
  const previewAvailable = Boolean(previewQ.data);

  const insightsQ = useQuery<InsightsData>({
    queryKey: ["chat-insights", sessionId],
    queryFn: () => seekerApi.getChatInsights(sessionId),
    enabled: !!sessionId,
  });

  const startMutation = useMutation({
    mutationFn: (mockInterview: boolean) =>
      seekerApi.startChat({
        language: language === "ar" ? "arabic" : "english",
        initialData: { mode: mockInterview ? "mock_interview" : "career_advisor" },
      }),
    onSuccess: (data: any) => {
      const id = data?.session_id || data?.sessionId || data?.id;
      if (id) setSessionId(String(id));
      setMessages([]);
      setChatError("");
      queryClient.invalidateQueries({ queryKey: ["chat-sessions"] });
      setTimeout(() => inputRef.current?.focus(), 50);
    },
    onError: (error: unknown) => {
      setChatError(getApiErrorMessage(error, t("startFailed")));
    },
  });

  const chatMutation = useMutation({
    mutationFn: () => seekerApi.sendChat({ sessionId, message }),
    onSuccess: (data: any) => {
      const reply = data?.reply || data?.message || data?.text || "";
      setMessages((prev) => [...prev, { role: "user", text: message }, { role: "assistant", text: reply }]);
      setMessage("");
      setChatError("");
      queryClient.invalidateQueries({ queryKey: ["chat-preview", sessionId, language] });
      queryClient.invalidateQueries({ queryKey: ["chat-insights", sessionId] });
      queryClient.invalidateQueries({ queryKey: ["chat-sessions"] });
    },
    onError: (error: unknown) => {
      setChatError(getApiErrorMessage(error, t("sendFailed")));
    },
  });

  const renameMutation = useMutation({
    mutationFn: (title: string) => seekerApi.updateChatSession(sessionId, { title }),
    onSuccess: () => {
      setTitleError("");
      setTitleSuccess(t("titleSaved"));
      queryClient.invalidateQueries({ queryKey: ["chat-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["chat-insights", sessionId] });
    },
    onError: (error: unknown) => {
      setTitleError(getApiErrorMessage(error, t("renameFailed")));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => seekerApi.deleteChatSession(id),
    onSuccess: (_data, id) => {
      setTitleError("");
      setSessionSuccess(t("sessionDeleted"));
      if (sessionId === id) {
        setSessionId("");
        setMessages([]);
        localStorage.removeItem(SESSION_KEY);
      }
      queryClient.invalidateQueries({ queryKey: ["chat-sessions"] });
    },
    onError: (error: unknown) => {
      setTitleError(getApiErrorMessage(error, t("deleteFailed")));
    },
  });

  const exportMutation = useMutation({
    mutationFn: (format: "pdf" | "docx") =>
      seekerApi.exportChatDocument({ sessionId, format, language: language === "ar" ? "ar" : "en" }),
    onSuccess: (blob: Blob, format: "pdf" | "docx") => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `cv-${sessionId}.${format}`;
      link.click();
      window.URL.revokeObjectURL(url);
      setExportFormat(null);
    },
    onError: (error: unknown) => {
      setExportFormat(null);
      setChatError(getApiErrorMessage(error, t("exportFailed")));
    },
  });

  const insights = insightsQ.data;
  const scoreValue = typeof insights?.score?.score === "number" ? insights?.score?.score : null;
  const checklist = Array.isArray(insights?.score?.checklist) ? insights?.score?.checklist : [];
  const finalSummaryRaw = insights?.final_summary;
  const finalSummary =
    finalSummaryRaw && typeof finalSummaryRaw === "string" ? { summary: finalSummaryRaw } : finalSummaryRaw;
  const improvements = Array.isArray(finalSummary?.improvements) ? finalSummary?.improvements : [];
  const requirements = finalSummary?.job_requirements || "";

  const scoreHint =
    scoreValue === null
      ? ""
      : scoreValue >= 85
        ? t("scoreHintExcellent")
        : scoreValue >= 70
          ? t("scoreHintGood")
          : t("scoreHintImprove");

  return (
    <div className="grid gap-4 lg:grid-cols-[1.1fr_2fr_2fr]">
      <div className="glass-card p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t("sessions")}</h2>
          <button className="btn-ghost lg:hidden" onClick={() => setShowSessions((s) => !s)}>
            {showSessions ? t("hideSessions") : t("showSessions")}
          </button>
        </div>
        <p className="mb-3 text-xs text-[var(--text-muted)]">{t("aiConsultantIntro")}</p>

        <div className="mb-3 flex flex-wrap gap-2">
          <button className="btn-primary" onClick={() => startMutation.mutate(false)} disabled={startMutation.isPending}>
            {t("startCareerAdvisor")}
          </button>
          <button className="btn-primary" onClick={() => startMutation.mutate(true)} disabled={startMutation.isPending}>
            {t("startMockInterview")}
          </button>
        </div>

        {sessionId && (
          <div className="mb-3 rounded-xl border border-[var(--border)] p-3">
            <label className="text-xs text-[var(--text-muted)]" htmlFor="session-title">
              {t("sessionTitle")}
            </label>
            <input
              id="session-title"
              className="field mt-2"
              value={titleDraft}
              placeholder={t("titlePlaceholder")}
              onChange={(e) => setTitleDraft(e.target.value)}
            />
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                className="btn-ghost"
                onClick={() => renameMutation.mutate(titleDraft.trim())}
                disabled={renameMutation.isPending}
              >
                {t("saveTitle")}
              </button>
              <button
                className="btn-ghost text-red-300"
                onClick={() => {
                  if (!window.confirm(t("confirmDeleteSession"))) return;
                  deleteMutation.mutate(sessionId);
                }}
                disabled={deleteMutation.isPending}
              >
                {t("deleteSession")}
              </button>
            </div>
            {titleError && <p className="mt-2 text-xs text-red-300">{titleError}</p>}
            {titleSuccess && <p className="mt-2 text-xs text-emerald-300">{titleSuccess}</p>}
          </div>
        )}

        {sessionsQ.isError && <p className="text-sm text-red-300">{t("sessionsLoadFailed")}</p>}
        {sessionsQ.isLoading && <p className="text-sm text-[var(--text-muted)]">{t("loading")}</p>}
        {!sessionsQ.isLoading && sessionItems.length === 0 && (
          <div className="rounded-xl border border-[var(--border)] p-4 text-sm text-[var(--text-muted)]">
            <div className="mb-2 flex items-center gap-2 text-[var(--text-primary)]">
              <Sparkles size={16} />
              {t("noSessionsYet")}
            </div>
            <div>{t("chatEmpty")}</div>
          </div>
        )}

        {sessionSuccess && <p className="mb-2 text-xs text-emerald-300">{sessionSuccess}</p>}

        <div className={`space-y-2 ${showSessions ? "block" : "hidden"} lg:block max-h-[calc(100vh-18rem)] overflow-auto pr-1`}>
          {sessionItems.map((s: any) => {
            const id = String(s.session_id || s.id || "");
            const label = formatSessionLabel(s, t);
            const last = s?.last_message || s?.lastMessage || "";
            const title = getSessionTitle(s) || t("untitledSession");
            const mode = s?.mode || s?.initial_data?.mode || s?.metadata?.mode;
            const ModeIcon = mode === "mock_interview" ? Mic : Briefcase;
            return (
              <button
                key={id}
                className={`w-full rounded-xl border p-3 text-left ${
                  id === sessionId
                    ? "border-[var(--accent)] bg-[var(--accent)]/10"
                    : "border-[var(--border)] hover:border-[var(--accent)]/50"
                }`}
                onClick={() => setSessionId(id)}
              >
                <div className="flex items-center gap-2 font-medium">
                  <ModeIcon size={14} />
                  <span>{title}</span>
                </div>
                <div className="mt-1 text-xs text-[var(--text-muted)]">{label}</div>
                {last ? <div className="mt-1 text-xs text-[var(--text-muted)]">{t("lastMessage")}: {last}</div> : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="glass-card flex h-[78vh] flex-col p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t("chatPanel")}</h2>
          {sessionId ? <span className="text-xs text-[var(--text-muted)]">{sessionId}</span> : null}
        </div>

        {!sessionId && (
          <div className="rounded-xl border border-[var(--border)] p-4 text-sm text-[var(--text-muted)]">
            {t("chatEmpty")}
          </div>
        )}

        <div
          className="flex-1 space-y-2 overflow-auto rounded-xl border border-[var(--border)] p-3"
          role="log"
          aria-live="polite"
          aria-relevant="additions"
          aria-atomic="false"
        >
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`max-w-[80%] whitespace-pre-wrap rounded-xl p-3 text-sm ${
                m.role === "user" ? "ml-auto bg-[var(--accent)] text-black" : "bg-[var(--glass)]"
              }`}
            >
              {m.text}
            </div>
          ))}
          {chatMutation.isPending && (
            <div className="max-w-[60%] rounded-xl bg-[var(--glass)] p-3 text-sm">
              <div className="flex items-center gap-2">
                <span>{t("typing")}</span>
                <span className="inline-flex gap-1">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-[var(--text-muted)] [animation-delay:-0.2s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-[var(--text-muted)] [animation-delay:-0.1s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-[var(--text-muted)]" />
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="mt-3">
          <label className="sr-only" htmlFor="ai-message">
            {t("messageLabel")}
          </label>
          <div className="flex gap-2">
            <textarea
              id="ai-message"
              className="field min-h-[44px] max-h-40 resize-none"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t("askPlaceholder")}
              disabled={!sessionId}
              ref={inputRef}
              rows={1}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (!sessionId || !message || chatMutation.isPending) return;
                  chatMutation.mutate();
                }
              }}
            />
            <button
              className="btn-primary"
              onClick={() => chatMutation.mutate()}
              disabled={!sessionId || !message || chatMutation.isPending}
            >
              {t("send")}
            </button>
          </div>
          {chatError && <p className="mt-2 text-sm text-red-300">{chatError}</p>}
        </div>
      </div>

      <div className="glass-card p-4">
        <div className="mb-3 flex gap-2 overflow-auto" role="tablist" aria-label={t("aiConsultant")}>
          <button
            role="tab"
            aria-selected={activeTab === "preview"}
            className={`btn-ghost border-b-2 ${
              activeTab === "preview" ? "nav-active border-[var(--accent)]" : "border-transparent"
            }`}
            onClick={() => setActiveTab("preview")}
          >
            {t("previewPanel")}
          </button>
          <button
            role="tab"
            aria-selected={activeTab === "insights"}
            className={`btn-ghost border-b-2 ${
              activeTab === "insights" ? "nav-active border-[var(--accent)]" : "border-transparent"
            }`}
            onClick={() => setActiveTab("insights")}
          >
            {t("insightsPanel")}
          </button>
          <button
            role="tab"
            aria-selected={activeTab === "export"}
            className={`btn-ghost border-b-2 ${
              activeTab === "export" ? "nav-active border-[var(--accent)]" : "border-transparent"
            }`}
            onClick={() => setActiveTab("export")}
          >
            {t("exportPanel")}
          </button>
        </div>

        {activeTab === "preview" && (
          <div className="rounded-xl border border-[var(--border)] p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-xs text-[var(--text-muted)]">{t("previewPanel")}</div>
              <button
                className="btn-ghost flex items-center gap-2 text-xs"
                onClick={() => previewQ.refetch()}
                disabled={!sessionId || previewQ.isLoading}
              >
                <RefreshCw size={14} />
                {t("refreshPreview")}
              </button>
            </div>
            {!sessionId && <p className="text-sm text-[var(--text-muted)]">{t("selectSessionHint")}</p>}
            {sessionId && previewQ.isLoading && <p className="text-sm text-[var(--text-muted)]">{t("previewLoading")}</p>}
            {sessionId && previewQ.isError && <p className="text-sm text-red-300">{t("previewFailed")}</p>}
            {sessionId && !previewQ.isLoading && !previewQ.isError && !previewAvailable && (
              <p className="text-sm text-[var(--text-muted)]">{t("previewEmpty")}</p>
            )}
            {sessionId && previewQ.data && (
              <iframe
                title="cv-preview"
                className="h-[60vh] min-h-[300px] w-full rounded-lg border border-[var(--border)] bg-white"
                srcDoc={previewQ.data}
              />
            )}
          </div>
        )}

        {activeTab === "insights" && (
          <div className="rounded-xl border border-[var(--border)] p-3">
            {!sessionId && <p className="text-sm text-[var(--text-muted)]">{t("selectSessionHint")}</p>}
            {sessionId && insightsQ.isLoading && (
              <div className="space-y-3">
                <div className="h-6 w-28 animate-pulse rounded-full bg-[var(--border)]" />
                <div className="h-24 animate-pulse rounded-xl bg-[var(--border)]/70" />
                <div className="h-20 animate-pulse rounded-xl bg-[var(--border)]/70" />
              </div>
            )}
            {sessionId && insightsQ.isError && <p className="text-sm text-red-300">{t("insightsFailed")}</p>}
            {sessionId && !insightsQ.isLoading && !insightsQ.isError && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className={`rounded-full px-2 py-1 ${insights?.is_complete ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"}`}>
                    {insights?.is_complete ? t("insightsStatusComplete") : t("insightsStatusInProgress")}
                  </span>
                  {insights?.current_step ? (
                    <span className="text-[var(--text-muted)]">· {insights.current_step}</span>
                  ) : null}
                </div>

                {scoreValue === null && !finalSummary && checklist.length === 0 && (
                  <p className="text-sm text-[var(--text-muted)]">{t("insightsEmpty")}</p>
                )}

                {scoreValue !== null && (
                  <div className="rounded-xl border border-[var(--border)] p-3">
                    <div className="text-xs uppercase text-[var(--text-muted)]">{t("insightsScore")}</div>
                    <div className="mt-2 flex items-end justify-between gap-2">
                      <div className="text-3xl font-semibold">{scoreValue}</div>
                      {scoreHint && <div className="text-xs text-[var(--text-muted)]">{scoreHint}</div>}
                    </div>
                    <div className="mt-2 h-2 w-full rounded-full bg-[var(--border)]">
                      <div
                        className="h-2 rounded-full bg-[var(--accent)]"
                        style={{ width: `${Math.min(100, Math.max(0, scoreValue))}%` }}
                      />
                    </div>
                  </div>
                )}

                {checklist.length > 0 && (
                  <div className="rounded-xl border border-[var(--border)] p-3">
                    <div className="text-xs uppercase text-[var(--text-muted)]">{t("insightsChecklist")}</div>
                    <ul className="mt-2 list-disc space-y-1 pl-4 text-sm">
                      {checklist.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {finalSummary?.summary && (
                  <div className="rounded-xl border border-[var(--border)] p-3">
                    <div className="text-xs uppercase text-[var(--text-muted)]">{t("insightsSummary")}</div>
                    <p className="mt-2 text-sm">{finalSummary.summary}</p>
                  </div>
                )}

                {improvements.length > 0 && (
                  <div className="rounded-xl border border-[var(--border)] p-3">
                    <div className="text-xs uppercase text-[var(--text-muted)]">{t("insightsImprovements")}</div>
                    <ul className="mt-2 list-disc space-y-1 pl-4 text-sm">
                      {improvements.map((item: string, idx: number) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {requirements && (
                  <div className="rounded-xl border border-[var(--border)] p-3">
                    <div className="text-xs uppercase text-[var(--text-muted)]">{t("insightsRequirements")}</div>
                    <p className="mt-2 text-sm whitespace-pre-wrap">{requirements}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === "export" && (
          <div className="space-y-2">
            <button
              className="btn-primary w-full"
              onClick={() => {
                setExportFormat("pdf");
                exportMutation.mutate("pdf");
              }}
              disabled={!sessionId || !previewAvailable || exportMutation.isPending}
            >
              {exportMutation.isPending && exportFormat === "pdf" && (
                <Loader2 size={16} className="mr-2 inline animate-spin" />
              )}
              {t("exportPdf")}
            </button>
            <button
              className="btn-ghost w-full"
              onClick={() => {
                setExportFormat("docx");
                exportMutation.mutate("docx");
              }}
              disabled={!sessionId || !previewAvailable || exportMutation.isPending}
            >
              {exportMutation.isPending && exportFormat === "docx" && (
                <Loader2 size={16} className="mr-2 inline animate-spin" />
              )}
              {t("exportDocx")}
            </button>
            {!previewAvailable && sessionId && (
              <p className="text-xs text-[var(--text-muted)]">{t("exportDisabledHint")}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AIConsultantPage;