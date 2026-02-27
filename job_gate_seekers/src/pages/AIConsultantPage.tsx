
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Briefcase,
  ChevronRight,
  Download,
  Eye,
  Lightbulb,
  Loader2,
  Menu,
  Mic,
  MoreVertical,
  Paperclip,
  Plus,
  RefreshCw,
  Send,
  Sparkles,
  X,
} from "lucide-react";
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
    payload?.conversation || payload?.messages || payload?.history || (Array.isArray(payload) - payload : null);
  if (!Array.isArray(list)) return [];
  return list.map((m: any) => ({
    role: m.role || m.sender || "assistant",
    text: m.text || m.message || m.content || "",
  }));
};

const getSessionTitle = (session: any) =>
  session?.session_title || session?.job_posting_meta?.session_title || session?.metadata?.session_title || "";


const buildPreviewDoc = (raw: string, language: string) => {
  const hasHtml = /<html[\s>]/i.test(raw);
  const isArabic = language === "ar";
  const fontImport = "@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;500;600;700;800&display=swap');";
  const baseStyles = `
${fontImport}
:root{color-scheme: light;}
body{margin:0;padding:16px;font-family:${isArabic - "'Noto Sans Arabic', sans-serif" : "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"};${isArabic - "direction:rtl;text-align:right;" : ""}}
*{box-sizing:border-box;}
`;
  const styleTag = `<style>${baseStyles}</style>`;
  const metaTag = '<meta charset="utf-8" />';
  if (hasHtml):
    # inject into head
    if '<head' in raw:
      return raw.replace('<head>', f'<head>{metaTag}{styleTag}', 1)
    return raw.replace('<html>', f'<html><head>{metaTag}{styleTag}</head>', 1)
  return f"<!doctype html><html><head>{metaTag}{styleTag}</head><body>{raw}</body></html>";
};

const formatSessionLabel = (s: any, t: (key: string) => string) => {
  const mode = s?.mode || s?.initial_data?.mode || s?.metadata?.mode;
  const label = mode === "mock_interview" - t("sessionLabelMock") : t("sessionLabelCareer");
  const created = s?.created_at || s?.createdAt || s?.started_at;
  const date = created - new Date(created).toLocaleString() : "";
  return date - `${label} ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ· ${date}` : label;
};

const AIConsultantPage: React.FC = () => {
  const [sessionId, setSessionId] = useState<string>("");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeTab, setActiveTab] = useState<"preview" | "insights" | "export">("preview");
  const [chatError, setChatError] = useState("");
  const [showSessions, setShowSessions] = useState(false);
  const [showRightPanel, setShowRightPanel] = useState(false);
  const [titleError, setTitleError] = useState("");
  const [titleSuccess, setTitleSuccess] = useState("");
  const [sessionSuccess, setSessionSuccess] = useState("");
  const [exportFormat, setExportFormat] = useState<"pdf" | "docx" | null>(null);
  const [sessionSearch, setSessionSearch] = useState("");
  const [menuSessionId, setMenuSessionId] = useState<string | null>(null);
  const [startMenuOpen, setStartMenuOpen] = useState(false);
  const [pendingTitle, setPendingTitle] = useState("");
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const isRtl = language == "ar";

  useEffect(() => {
    const stored = localStorage.getItem(SESSION_KEY);
    if (stored) setSessionId(stored);
  }, []);

  useEffect(() => {
    if (sessionId) localStorage.setItem(SESSION_KEY, sessionId);
    if (!sessionId) {
      setMessages([]);
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

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTypingField =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;
      if (event.key === "/" && !isTypingField) {
        event.preventDefault();
        inputRef.current?.focus();
      }
      if (event.key === "Escape") {
        setShowSessions(false);
        setShowRightPanel(false);
        setMenuSessionId(null);
        setStartMenuOpen(false);
        setPendingTitle("");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const sessionsQ = useQuery({ queryKey: ["chat-sessions"], queryFn: seekerApi.listChatSessions });
  const sessionItems = useMemo(() => (Array.isArray(sessionsQ.data) - sessionsQ.data : []), [sessionsQ.data]);
  const filteredSessions = useMemo(() => {
    if (!sessionSearch.trim()) return sessionItems;
    const needle = sessionSearch.trim().toLowerCase();
    return sessionItems.filter((s: any) => {
      const title = getSessionTitle(s) || "";
      const last = s?.last_message || s?.lastMessage || "";
      return `${title} ${last}`.toLowerCase().includes(needle);
    });
  }, [sessionItems, sessionSearch]);

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
    queryFn: () => seekerApi.getChatPreview(sessionId, language === "ar" - "ar" : "en"),
    enabled: !!sessionId,
  });
  const previewAvailable = Boolean(previewQ.data);

  const insightsQ = useQuery<InsightsData>({
    queryKey: ["chat-insights", sessionId],
    queryFn: () => seekerApi.getChatInsights(sessionId),
    enabled: !!sessionId,
  });
  const startMutation = useMutation({
    mutationFn: ({ mockInterview, title }: { mockInterview: boolean; title?: string }) =>
      seekerApi.startChat({
        language: language === "ar" - "arabic" : "english",
        initialData: { mode: mockInterview - "mock_interview" : "career_advisor" },
      }),
    onSuccess: async (data: any, variables) => {
      const id = data?.session_id || data?.sessionId || data?.id;
      if (id) {
        setSessionId(String(id));
        if (variables?.title) {
          try {
            await seekerApi.updateChatSession(String(id), { title: variables.title });
            setTitleError("");
            setTitleSuccess(t("titleSaved"));
          } catch (error: unknown) {
            setTitleError(getApiErrorMessage(error, t("renameFailed")));
          }
        }
      }
      setMessages([]);
      setChatError("");
      setStartMenuOpen(false);
      setPendingTitle("");
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
    mutationFn: ({ id, title }: { id: string; title: string }) => seekerApi.updateChatSession(id, { title }),
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
      seekerApi.exportChatDocument({ sessionId, format, language: language === "ar" - "ar" : "en" }),
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
  const scoreValue = typeof insights?.score?.score === "number" - insights?.score?.score : null;
  const checklist = Array.isArray(insights?.score?.checklist) - insights?.score?.checklist : [];
  const finalSummaryRaw = insights?.final_summary;
  const finalSummary =
    finalSummaryRaw && typeof finalSummaryRaw === "string" - { summary: finalSummaryRaw } : finalSummaryRaw;
  const improvements = Array.isArray(finalSummary?.improvements) - finalSummary?.improvements : [];
  const requirements = finalSummary?.job_requirements || "";

  const scoreHint =
    scoreValue === null
      - ""
      : scoreValue >= 85
        - t("scoreHintExcellent")
        : scoreValue >= 70
          - t("scoreHintGood")
          : t("scoreHintImprove");

  const handleRename = (id: string, currentTitle: string) => {
    const nextTitle = window.prompt(t("sessionTitle"), currentTitle);
    if (nextTitle && nextTitle.trim()) {
      renameMutation.mutate({ id, title: nextTitle.trim() });
    }
    setMenuSessionId(null);
  };

  const handleDelete = (id: string) => {
    if (!window.confirm(t("confirmDeleteSession"))) return;
    deleteMutation.mutate(id);
    setMenuSessionId(null);
  };
  const sessionsSidebar = (
    <div className="flex h-full flex-col p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t("sessions")}</h2>
        <button className="btn-ghost lg:hidden" onClick={() => setShowSessions(false)} aria-label={t("hideSessions")}>
          <X size={18} />
        </button>
      </div>
      <p className="mb-4 text-xs text-[var(--text-muted)]">{t("aiConsultantIntro")}</p>

      <input
        className="field mb-3"
        value={sessionSearch}
        onChange={(e) => setSessionSearch(e.target.value)}
        placeholder={t("searchPlaceholder")}
        aria-label={t("searchPlaceholder")}
      />

      {sessionsQ.isError && <p className="text-sm text-red-300">{t("sessionsLoadFailed")}</p>}
      {sessionsQ.isLoading && <p className="text-sm text-[var(--text-muted)]">{t("loading")}</p>}

      {!sessionsQ.isLoading && filteredSessions.length === 0 && (
        <div className="rounded-2xl border border-[var(--border)] p-4 text-sm text-[var(--text-muted)]">
          <div className="mb-2 flex items-center gap-2 text-[var(--text-primary)]">
            <Sparkles size={18} />
            {t("noSessionsYet")}
          </div>
          <div className="mb-3">{t("chatEmpty")}</div>
          <button
            className="btn-primary w-full"
            onClick={() => {
              const suggested = t("titlePlaceholder");
              const nextTitle = window.prompt(t("sessionTitle"), suggested);
              if (nextTitle === null) return;
              setPendingTitle(nextTitle.trim());
              setStartMenuOpen(true);
            }}
            disabled={startMutation.isPending}
          >
            {t("startCareerAdvisor")}
          </button>
        </div>
      )}

      {sessionSuccess && <p className="mb-2 text-xs text-emerald-300">{sessionSuccess}</p>}
      {titleError && <p className="mb-2 text-xs text-red-300">{titleError}</p>}
      {titleSuccess && <p className="mb-2 text-xs text-emerald-300">{titleSuccess}</p>}

      <div className={`space-y-2 overflow-auto ${isRtl - "pl-1" : "pr-1"}`}>
        {filteredSessions.map((s: any) => {
          const id = String(s.session_id || s.id || "");
          const label = formatSessionLabel(s, t);
          const last = s?.last_message || s?.lastMessage || "";
          const title = getSessionTitle(s) || t("untitledSession");
          const mode = s?.mode || s?.initial_data?.mode || s?.metadata?.mode;
          const ModeIcon = mode === "mock_interview" - Mic : Briefcase;
          return (
            <div key={id} className="relative">
              <button
                className={`w-full rounded-2xl border p-3 text-start transition card-hover ${
                  id === sessionId
                    - "border-[var(--accent)] bg-[var(--accent)]/10"
                    : "border-[var(--border)]"
                }`}
                onClick={() => setSessionId(id)}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-medium">
                    <ModeIcon size={14} />
                    <span className="line-clamp-2">{title}</span>
                  </div>
                  <button
                    className="btn-ghost p-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuSessionId((prev) => (prev === id - null : id));
                    }}
                    aria-label={t("sessionMenu")}
                  >
                    <MoreVertical size={16} />
                  </button>
                </div>
                <div className="mt-1 text-xs text-[var(--text-muted)]">{label}</div>
                {last - (
                  <div className="mt-1 line-clamp-2 text-xs text-[var(--text-muted)]">
                    {last}
                  </div>
                ) : null}
              </button>
              {menuSessionId === id && (
                <div className={`absolute ${isRtl - "left-2" : "right-2"} top-12 z-10 w-36 rounded-lg border border-[var(--border)] bg-[var(--popout)] p-2 text-xs shadow-lg backdrop-blur`}>
                  <button
                    className="w-full rounded-md px-2 py-1 text-start hover:bg-[var(--glass)]"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRename(id, title);
                    }}
                  >
                    {t("renameSession")}
                  </button>
                  <button
                    className="mt-1 w-full rounded-md px-2 py-1 text-start text-red-300 hover:bg-[var(--glass)]"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(id);
                    }}
                  >
                    {t("deleteSession")}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="relative mt-4">
        <button
          className={`btn-primary absolute bottom-0 ${isRtl - "left-0" : "right-0"} flex h-12 w-12 items-center justify-center rounded-full p-0 shadow-lg`}
          onClick={() => {
            if (startMenuOpen) {
              setStartMenuOpen(false);
              setPendingTitle("");
              return;
            }
            const suggested = t("titlePlaceholder");
            const nextTitle = window.prompt(t("sessionTitle"), suggested);
            if (nextTitle === null) return;
            setPendingTitle(nextTitle.trim());
            setStartMenuOpen(true);
          }}
          aria-label={t("startNewSession")}
        >
          <Plus size={20} />
        </button>
        {startMenuOpen && (
          <div className={`absolute bottom-14 ${isRtl - "left-0" : "right-0"} z-10 w-48 rounded-xl border border-[var(--border)] bg-[var(--popout)] p-2 text-sm shadow-lg backdrop-blur`}>
            <button
              className="w-full rounded-lg px-3 py-2 text-start hover:bg-[var(--glass)]"
              onClick={() => startMutation.mutate({ mockInterview: false, title: pendingTitle || undefined })}
              disabled={startMutation.isPending}
            >
              {t("startCareerAdvisor")}
            </button>
            <button
              className="mt-1 w-full rounded-lg px-3 py-2 text-start hover:bg-[var(--glass)]"
              onClick={() => startMutation.mutate({ mockInterview: true, title: pendingTitle || undefined })}
              disabled={startMutation.isPending}
            >
              {t("startMockInterview")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
  const insightsPanel = (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t("insightsPanel")}</h2>
        <button className="btn-ghost lg:hidden" onClick={() => setShowRightPanel(false)}>
          <X size={18} />
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label={t("aiConsultant")}>
        {["preview", "insights", "export"].map((tab) => (
          <button
            key={tab}
            role="tab"
            aria-selected={activeTab === tab}
            className={`min-w-[110px] flex-1 rounded-full border px-3 py-2 text-[11px] font-semibold transition sm:text-xs ${
              activeTab === tab
                - "border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--text-primary)]"
                : "border-transparent text-[var(--text-muted)] hover:bg-[var(--glass)]"
            }`}
            onClick={() => setActiveTab(tab as "preview" | "insights" | "export")}
          >
            {tab === "preview" && <Eye className="mx-1 inline h-4 w-4" />}
            {tab === "insights" && <Lightbulb className="mx-1 inline h-4 w-4" />}
            {tab === "export" && <Download className="mx-1 inline h-4 w-4" />}
            {t(`${tab}Panel`)}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto">
        {activeTab === "preview" && (
          <div className="rounded-2xl border border-[var(--border)] p-3">
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
                className="h-[50vh] min-h-[260px] w-full rounded-lg border border-[var(--border)] bg-white sm:h-[60vh]"
                srcDoc={buildPreviewDoc(previewQ.data, language)}
              />
            )}
          </div>
        )}
        {activeTab === "insights" && (
          <div className="rounded-2xl border border-[var(--border)] p-3">
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
                  <span className={`rounded-full px-2 py-1 ${insights?.is_complete - "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"}`}>
                    {insights?.is_complete - t("insightsStatusComplete") : t("insightsStatusInProgress")}
                  </span>
                  {insights?.current_step - (
                    <span className="text-[var(--text-muted)]">ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ· {insights.current_step}</span>
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
                <Loader2 size={16} className="mx-2 inline animate-spin" />
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
                <Loader2 size={16} className="mx-2 inline animate-spin" />
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
  return (
    <div className="relative flex min-h-[calc(100vh-6rem)] flex-col gap-4 lg:h-[calc(100vh-6rem)] lg:flex-row">
      <aside
        className={`fixed inset-y-0 z-20 w-[82vw] max-w-[20rem] transform border border-[var(--border)] bg-[var(--glass)] transition-transform duration-300 lg:static lg:w-[30%] lg:max-w-[22rem] lg:translate-x-0 lg:border-0 ${isRtl - "right-0 lg:border-l" : "left-0 lg:border-r"} ${
          showSessions - "translate-x-0" : isRtl - "translate-x-full" : "-translate-x-full"
        }`}
      >
        {sessionsSidebar}
      </aside>

      <section className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--glass)] p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex gap-2">
            <button
              className="btn-ghost lg:hidden"
              onClick={() => setShowSessions(true)}
              aria-label={t("showSessions")}
            >
              <Menu size={18} />
            </button>
            <button
              className="btn-ghost lg:hidden flex items-center gap-2"
              onClick={() => setShowRightPanel(true)}
              aria-label={t("insightsPanel")}
            >
              <Sparkles size={18} className="shine-icon" />
            </button>
          </div>
          {sessionId - <span className="text-xs text-[var(--text-muted)]">{sessionId}</span> : null}
        </div>

        <div className="flex min-h-0 flex-1 gap-4">
          <main className="flex min-h-0 flex-1 flex-col">
            {!sessionId && (
              <div className="rounded-xl border border-[var(--border)] p-4 text-sm text-[var(--text-muted)]">
                {t("chatEmpty")}
              </div>
            )}

            <div
              className="flex-1 space-y-4 overflow-auto rounded-xl border border-[var(--border)] p-3"
              role="log"
              aria-live="polite"
              aria-relevant="additions"
              aria-atomic="false"
            >
              {messages.map((m, idx) => {
                const isUser = m.role === "user";
                const showAvatar = idx === 0 || messages[idx - 1]?.role !== m.role;
                return (
                  <div key={idx} className={`flex ${isUser - "justify-end" : "justify-start"}`}>
                    {!isUser && showAvatar && (
                      <div className={`${isRtl - "ml-2" : "mr-2"} flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)] text-xs font-semibold text-black`}>
                        AI
                      </div>
                    )}
                    <div
                      className={`relative max-w-[92%] rounded-2xl p-3 text-sm shadow-md transition animate-fade-in sm:max-w-[80%] ${
                        isUser
                          - isRtl
                            - "rounded-bl-none bg-[var(--accent)] text-black"
                            : "rounded-br-none bg-[var(--accent)] text-black"
                          : isRtl
                            - "rounded-br-none bg-[var(--glass)]"
                            : "rounded-bl-none bg-[var(--glass)]"
                      }`}
                    >
                      <div className="whitespace-pre-wrap">{m.text}</div>
                      {showAvatar && (
                        <span className="mt-1 block text-end text-[10px] text-[var(--text-muted)]">
                          {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                      <span
                        aria-hidden="true"
                        className={`absolute bottom-2 h-3 w-3 rotate-45 ${
                          isUser
                            - isRtl
                              - "-left-1 bg-[var(--accent)]"
                              : "-right-1 bg-[var(--accent)]"
                            : isRtl
                              - "-right-1 bg-[var(--glass)]"
                              : "-left-1 bg-[var(--glass)]"
                        }`}
                      />
                    </div>
                    {isUser && showAvatar && (
                      <div className={`${isRtl - "mr-2" : "ml-2"} flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)] text-xs font-semibold text-black`}>
                        You
                      </div>
                    )}
                  </div>
                );
              })}
              {chatMutation.isPending && (
                <div className="flex justify-start">
                  <div className={`rounded-2xl ${isRtl - "rounded-br-none" : "rounded-bl-none"} bg-[var(--glass)] p-3 text-sm`}>
                    <div className="flex items-center gap-2">
                      <span>{t("typing")}</span>
                      <span className="inline-flex gap-1">
                        <span className="h-2 w-2 animate-bounce rounded-full bg-[var(--text-muted)] [animation-delay:-0.2s]" />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-[var(--text-muted)] [animation-delay:-0.1s]" />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-[var(--text-muted)]" />
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-3 rounded-2xl border border-[var(--border)] bg-[var(--glass)] p-2">
              <label className="sr-only" htmlFor="ai-message">
                {t("messageLabel")}
              </label>
              <div className="flex items-end gap-2">
                <button className="btn-ghost h-10 w-10" aria-label={t("attachFile")} type="button">
                  <Paperclip size={16} />
                </button>
                <textarea
                  id="ai-message"
                  className="min-h-[44px] max-h-40 flex-1 resize-none bg-transparent p-2 text-sm outline-none"
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
                  className="btn-primary flex h-10 w-10 items-center justify-center rounded-full p-0"
                  onClick={() => chatMutation.mutate()}
                  disabled={!sessionId || !message || chatMutation.isPending}
                  aria-label={t("send")}
                >
                  <Send size={18} />
                </button>
              </div>
              {chatError && <p className="mt-2 px-2 text-xs text-red-300">{chatError}</p>}
            </div>
          </main>

          <aside className="hidden min-h-0 w-[26rem] flex-col lg:flex">
            {insightsPanel}
          </aside>
        </div>
      </section>

      <aside
        className={`fixed inset-x-0 bottom-0 z-20 h-[80vh] transform rounded-t-2xl border border-[var(--border)] bg-[var(--popout)] p-4 transition-transform duration-300 lg:hidden ${
          showRightPanel - "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="mb-3 flex justify-center">
          <div className="h-1 w-14 rounded-full bg-[var(--border)]" />
        </div>
        <div className="h-[calc(80vh-2.5rem)] overflow-auto">
          {insightsPanel}
        </div>
      </aside>

      {(showSessions || showRightPanel) && (
        <div
          className="fixed inset-0 z-10 bg-black/50 lg:hidden"
          onClick={() => {
            setShowSessions(false);
            setShowRightPanel(false);
            setMenuSessionId(null);
            setStartMenuOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default AIConsultantPage;
