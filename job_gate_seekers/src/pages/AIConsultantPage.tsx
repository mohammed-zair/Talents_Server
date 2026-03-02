import React, { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Briefcase,
  Download,
  Eye,
  Lightbulb,
  Loader2,
  Menu,
  Mic,
  MoreVertical,
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

type ChatMessage = { role: "user" | "assistant"; text: string; id?: string; pending?: boolean };
type BuilderSection = { exists?: boolean; data?: any };
type BuilderSeed = {
  message_type?: string;
  schema_version?: number;
  cv_id?: number;
  cv_title?: string;
  analyzed_at?: string | null;
  section_order?: string[];
  sections?: Record<string, BuilderSection>;
  missing_required_sections?: string[];
  validation?: { blocking_errors?: string[]; warnings?: string[] };
};

type InsightsData = {
  is_complete?: boolean;
  current_step?: string;
  score?: {
    score?: number;
    checklist?: string[];
  };
  final_summary?: any;
  rewrites?: {
    summary?: { original?: string; improved?: string };
    experience?: Array<{ original?: string; improved?: string } | null>;
    projects?: Array<{ original?: string; improved?: string } | null>;
  };
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

const buildPreviewDoc = (raw: string, language: string) => {
  if (!raw) return "";
  const hasHtml = /<html[\s>]/i.test(raw);
  const isArabic = language === "ar";
  const fontImport =
    "@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;500;600;700;800&display=swap');";
  const baseStyles = `
${fontImport}
:root{color-scheme: light;}
body{margin:0;padding:16px;font-family:${
    isArabic ? "'Noto Sans Arabic', sans-serif" : "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
  };${isArabic ? "direction:rtl;text-align:right;" : ""}}
*{box-sizing:border-box;}
`;
  const styleTag = `<style>${baseStyles}</style>`;
  const metaTag = '<meta charset="utf-8" />';
  if (hasHtml) {
    if (/<head[\s>]/i.test(raw)) {
      return raw.replace(/<head[^>]*>/i, (match) => `${match}${metaTag}${styleTag}`);
    }
    return raw.replace(/<html[^>]*>/i, (match) => `${match}<head>${metaTag}${styleTag}</head>`);
  }
  return `<!doctype html><html><head>${metaTag}${styleTag}</head><body>${raw}</body></html>`;
};

const formatSessionLabel = (s: any, t: (key: string) => string) => {
  const mode = s?.mode || s?.initial_data?.mode || s?.metadata?.mode;
  const label = mode === "mock_interview" ? t("sessionLabelMock") : t("sessionLabelCareer");
  const created = s?.created_at || s?.createdAt || s?.started_at;
  const date = created ? new Date(created).toLocaleString() : "";
  return date ? `${label} - ${date}` : label;
};

const BUILDER_REQUIRED_SECTIONS = [
  "contact_information",
  "professional_summary",
  "core_competencies",
  "professional_experience",
  "education",
];

const EMPTY_EXPERIENCE = {
  job_title: "",
  company: "",
  location: "",
  start_date: "",
  end_date: "",
  is_current: false,
  bullets: [] as string[],
};

const EMPTY_PROJECT = {
  title: "",
  role: "",
  start_date: "",
  end_date: "",
  objective: "",
  tech_stack: [] as string[],
  bullets: [] as string[],
};

const EMPTY_EDUCATION = {
  degree: "",
  institution: "",
  graduation_year: "",
  coursework: [] as string[],
};

const EMPTY_CERT_AWARD = {
  type: "certification",
  name: "",
  acronym: "",
  issuer: "",
  date: "",
};

const ACTION_VERBS = [
  "built",
  "developed",
  "designed",
  "implemented",
  "optimized",
  "improved",
  "led",
  "managed",
  "delivered",
  "created",
  "engineered",
  "increased",
  "reduced",
  "launched",
];

const IMPACT_REGEX = /\b(\d+%|\d+\+?|\$\d+|x\d+|milliseconds?|seconds?|minutes?|hours?|days?)\b/i;

const hasContent = (value: any): boolean => {
  if (value == null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.some((item) => hasContent(item));
  if (typeof value === "object") return Object.values(value).some((item) => hasContent(item));
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "boolean") return value;
  return false;
};

const extractBuilderSeed = (messages: ChatMessage[]): BuilderSeed | null => {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const msg = messages[i];
    if (msg.role !== "user") continue;
    try {
      const parsed = JSON.parse(msg.text);
      if (
        parsed &&
        typeof parsed === "object" &&
        (parsed.message_type === "cv_builder_v2_seed" || parsed.message_type === "cv_builder_v2_update") &&
        parsed.sections &&
        typeof parsed.sections === "object"
      ) {
        return parsed as BuilderSeed;
      }
    } catch {
      // ignore non-json chat messages
    }
  }
  return null;
};

const AIConsultantPage: React.FC = () => {
  const [sessionId, setSessionId] = useState<string>("");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeTab, setActiveTab] = useState<"builder" | "preview" | "insights" | "export">("preview");
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
  const [builderDraft, setBuilderDraft] = useState<BuilderSeed | null>(null);
  const [builderDirty, setBuilderDirty] = useState(false);
  const [builderSyncInfo, setBuilderSyncInfo] = useState("");
  const [builderSyncError, setBuilderSyncError] = useState("");
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const autoStartedRef = useRef(false);
  const isRtl = language === "ar";

  useEffect(() => {
    const stored = localStorage.getItem(SESSION_KEY);
    if (stored) setSessionId(stored);
  }, []);

  useEffect(() => {
    if (sessionId) localStorage.setItem(SESSION_KEY, sessionId);
    if (!sessionId) {
      setMessages([]);
      setBuilderDraft(null);
      setBuilderDirty(false);
      setBuilderSyncInfo("");
      setBuilderSyncError("");
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
  const sessionItems = useMemo(() => (Array.isArray(sessionsQ.data) ? sessionsQ.data : []), [sessionsQ.data]);
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

  const builderSeed = useMemo(() => extractBuilderSeed(messages), [messages]);

  useEffect(() => {
    if (!builderSeed) return;
    if (builderDirty) return;
    setBuilderDraft(JSON.parse(JSON.stringify(builderSeed)));
  }, [builderSeed, builderDirty]);

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
    mutationFn: ({ mockInterview, title }: { mockInterview: boolean; title?: string }) =>
      seekerApi.startChat({
        language: language === "ar" ? "arabic" : "english",
        initialData: { mode: mockInterview ? "mock_interview" : "career_advisor" },
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

  useEffect(() => {
    if (autoStartedRef.current) return;
    if (sessionsQ.isLoading) return;
    if (sessionId) return;
    if (sessionItems.length > 0) return;
    if (startMutation.isPending) return;
    autoStartedRef.current = true;
    startMutation.mutate({ mockInterview: false, title: t("firstChatTitle") });
  }, [sessionId, sessionItems.length, sessionsQ.isLoading, startMutation.isPending, t, startMutation]);

  const chatMutation = useMutation({
    mutationFn: ({ text }: { text: string; pendingId: string }) =>
      seekerApi.sendChat({ sessionId, message: text }),
    onSuccess: (data: any, variables) => {
      const reply = data?.reply || data?.message || data?.text || "";
      const pendingId = variables?.pendingId;
      setMessages((prev) => [
        ...prev.map((m) => (pendingId && m.id === pendingId ? { ...m, pending: false } : m)),
        { role: "assistant", text: reply },
      ]);
      setChatError("");
      queryClient.invalidateQueries({ queryKey: ["chat-preview", sessionId, language] });
      queryClient.invalidateQueries({ queryKey: ["chat-insights", sessionId] });
      queryClient.invalidateQueries({ queryKey: ["chat-sessions"] });
    },
    onError: (error: unknown, variables) => {
      const pendingId = variables?.pendingId;
      setMessages((prev) => prev.map((m) => (pendingId && m.id === pendingId ? { ...m, pending: false } : m)));
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

  const builderSyncMutation = useMutation({
    mutationFn: async () => {
      if (!sessionId || !builderDraft) throw new Error("Builder session is not ready.");
      const payload = {
        ...builderDraft,
        message_type: "cv_builder_v2_update",
        updated_at: new Date().toISOString(),
      };
      await seekerApi.sendChat({ sessionId, message: JSON.stringify(payload, null, 2) });
      return true;
    },
    onSuccess: () => {
      setBuilderSyncError("");
      setBuilderSyncInfo(language === "ar" ? "تم تحديث بيانات السيرة في المحادثة." : "Builder data synced to chat.");
      setBuilderDirty(false);
      queryClient.invalidateQueries({ queryKey: ["chat-preview", sessionId, language] });
      queryClient.invalidateQueries({ queryKey: ["chat-insights", sessionId] });
    },
    onError: (error: unknown) => {
      setBuilderSyncInfo("");
      setBuilderSyncError(getApiErrorMessage(error, "Failed to sync builder data."));
    },
  });

  const builderComputed = useMemo(() => {
    if (!builderDraft?.sections) return null;
    const sections = builderDraft.sections;
    const missingRequired = BUILDER_REQUIRED_SECTIONS.filter((key) => !hasContent(sections?.[key]?.data));
    const contact = sections.contact_information?.data || {};
    const contactBlocking: string[] = [];
    if (!String(contact.full_name || "").trim()) contactBlocking.push("contact_full_name_missing");
    if (!String(contact.email || "").trim()) contactBlocking.push("contact_email_missing");
    if (!String(contact.phone || "").trim()) contactBlocking.push("contact_phone_missing");
    if (!String(contact.location || "").trim()) contactBlocking.push("contact_location_missing");
    return {
      missingRequired,
      blocking: contactBlocking,
      canExport: missingRequired.length === 0 && contactBlocking.length === 0,
    };
  }, [builderDraft]);

  const atsHealth = useMemo(() => {
    if (!builderDraft?.sections) return null;
    const sections = builderDraft.sections;
    const totalSections = 7;
    const existingSections = Object.values(sections).filter((section) =>
      hasContent(section?.data)
    ).length;

    const structureScore = Math.round((existingSections / totalSections) * 100);

    const programmingSkills = Array.isArray(
      sections.core_competencies?.data?.programming
    )
      ? sections.core_competencies.data.programming.length
      : 0;
    const frameworkSkills = Array.isArray(
      sections.core_competencies?.data?.frameworks
    )
      ? sections.core_competencies.data.frameworks.length
      : 0;
    const toolSkills = Array.isArray(
      sections.core_competencies?.data?.tools_platforms
    )
      ? sections.core_competencies.data.tools_platforms.length
      : 0;
    const domainSkills = Array.isArray(
      sections.core_competencies?.data?.domain_expertise
    )
      ? sections.core_competencies.data.domain_expertise.length
      : 0;
    const keywordReadinessRaw =
      programmingSkills + frameworkSkills + toolSkills + domainSkills;
    const keywordReadiness = Math.min(100, keywordReadinessRaw * 8);

    const experienceBullets = (
      Array.isArray(sections.professional_experience?.data)
        ? sections.professional_experience.data
        : []
    ).flatMap((item: any) => (Array.isArray(item?.bullets) ? item.bullets : []));
    const projectBullets = (
      Array.isArray(sections.projects?.data) ? sections.projects.data : []
    ).flatMap((item: any) => (Array.isArray(item?.bullets) ? item.bullets : []));
    const allBullets = [...experienceBullets, ...projectBullets]
      .map((b) => String(b || "").trim())
      .filter(Boolean);

    const measurableBullets = allBullets.filter((bullet) => IMPACT_REGEX.test(bullet));
    const actionVerbBullets = allBullets.filter((bullet) =>
      ACTION_VERBS.some((verb) => new RegExp(`\\b${verb}\\b`, "i").test(bullet))
    );

    const measurableRatio = allBullets.length
      ? measurableBullets.length / allBullets.length
      : 0;
    const actionRatio = allBullets.length ? actionVerbBullets.length / allBullets.length : 0;
    const bulletQuality = Math.round((measurableRatio * 0.7 + actionRatio * 0.3) * 100);

    const globalScore = Math.round(
      structureScore * 0.45 + keywordReadiness * 0.25 + bulletQuality * 0.3
    );

    const warnings: string[] = [];
    if (allBullets.length === 0) warnings.push("no_bullets_found");
    if (allBullets.length > 0 && measurableRatio < 0.35)
      warnings.push("low_measurable_impact_bullets");
    if (allBullets.length > 0 && actionRatio < 0.5)
      warnings.push("low_action_verb_bullets");
    if ((builderComputed?.missingRequired?.length || 0) > 0)
      warnings.push("required_sections_missing");

    return {
      structureScore,
      keywordReadiness,
      bulletQuality,
      globalScore,
      bulletStats: {
        total: allBullets.length,
        measurable: measurableBullets.length,
        actionVerb: actionVerbBullets.length,
      },
      warnings,
    };
  }, [builderDraft, builderComputed?.missingRequired]);

  const exportBlockedByBuilder = Boolean(
    builderDraft && builderComputed && !builderComputed.canExport
  );
  const builderSections = builderDraft?.sections || {};

  const updateBuilderSection = (sectionKey: string, nextData: any) => {
    setBuilderDraft((prev) => {
      if (!prev) return prev;
      const currentSections = prev.sections || {};
      return {
        ...prev,
        sections: {
          ...currentSections,
          [sectionKey]: {
            exists: hasContent(nextData),
            data: nextData,
          },
        },
      };
    });
    setBuilderDirty(true);
  };

  const updateSectionArrayItem = (sectionKey: string, index: number, nextItem: any) => {
    const currentList = Array.isArray(builderSections?.[sectionKey]?.data)
      ? [...builderSections[sectionKey].data]
      : [];
    currentList[index] = nextItem;
    updateBuilderSection(sectionKey, currentList);
  };

  const removeSectionArrayItem = (sectionKey: string, index: number) => {
    const currentList = Array.isArray(builderSections?.[sectionKey]?.data)
      ? [...builderSections[sectionKey].data]
      : [];
    currentList.splice(index, 1);
    updateBuilderSection(sectionKey, currentList);
  };

  const addSectionArrayItem = (sectionKey: string, template: any) => {
    const currentList = Array.isArray(builderSections?.[sectionKey]?.data)
      ? [...builderSections[sectionKey].data]
      : [];
    currentList.push({ ...template });
    updateBuilderSection(sectionKey, currentList);
  };

  const toLines = (value: any) =>
    Array.isArray(value) ? value.map((v) => String(v ?? "")).join("\n") : "";

  const fromLines = (value: string) =>
    value
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

  const experienceRows = Array.isArray(builderSections.professional_experience?.data)
    ? builderSections.professional_experience.data
    : [];
  const projectRows = Array.isArray(builderSections.projects?.data)
    ? builderSections.projects.data
    : [];
  const educationRows = Array.isArray(builderSections.education?.data)
    ? builderSections.education.data
    : [];
  const certAwardRows = Array.isArray(builderSections.certifications_awards?.data)
    ? builderSections.certifications_awards.data
    : [];

  const insights = insightsQ.data;
  const scoreValue = typeof insights?.score?.score === "number" ? insights?.score?.score : null;
  const checklist = Array.isArray(insights?.score?.checklist) ? insights?.score?.checklist : [];
  const finalSummaryRaw = insights?.final_summary;
  const finalSummary =
    finalSummaryRaw && typeof finalSummaryRaw === "string" ? { summary: finalSummaryRaw } : finalSummaryRaw;
  const improvements = Array.isArray(finalSummary?.improvements) ? finalSummary?.improvements : [];
  const requirements = finalSummary?.job_requirements || "";
  const rewrites = insights?.rewrites;
  const rewriteSummary = rewrites?.summary;
  const rewriteExperience = Array.isArray(rewrites?.experience)
    ? rewrites?.experience.filter((item) => item && (item.original || item.improved))
    : [];
  const rewriteProjects = Array.isArray(rewrites?.projects)
    ? rewrites?.projects.filter((item) => item && (item.original || item.improved))
    : [];

  const scoreHint =
    scoreValue === null
      ? ""
      : scoreValue >= 85
        ? t("scoreHintExcellent")
        : scoreValue >= 70
          ? t("scoreHintGood")
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
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              className="btn-primary flex h-9 w-9 items-center justify-center rounded-full p-0"
              onClick={() => {
                const suggested = t("titlePlaceholder");
                const nextTitle = window.prompt(t("sessionTitle"), suggested);
                if (nextTitle === null) return;
                setPendingTitle(nextTitle.trim());
                setStartMenuOpen(true);
              }}
              aria-label="New session"
            >
              <Plus size={16} />
            </button>
            {startMenuOpen && (
              <div
                className={`absolute ${isRtl ? "left-0" : "right-0"} top-12 z-50 w-48 rounded-xl border border-[var(--border)] bg-[var(--popout)] p-2 text-sm shadow-lg backdrop-blur`}
              >
                <button
                  className="w-full rounded-lg px-3 py-2 text-start hover:bg-[var(--glass)]"
                  onClick={() =>
                    startMutation.mutate({
                      mockInterview: false,
                      title: pendingTitle.trim() || undefined,
                    })
                  }
                  disabled={startMutation.isPending}
                >
                  {t("startCareerAdvisor")}
                </button>
                <button
                  className="mt-1 w-full rounded-lg px-3 py-2 text-start hover:bg-[var(--glass)]"
                  onClick={() =>
                    startMutation.mutate({
                      mockInterview: true,
                      title: pendingTitle.trim() || undefined,
                    })
                  }
                  disabled={startMutation.isPending}
                >
                  {t("startMockInterview")}
                </button>
              </div>
            )}
          </div>
          <button className="btn-ghost lg:hidden" onClick={() => setShowSessions(false)} aria-label={t("hideSessions")}>
            <X size={18} />
          </button>
        </div>
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

      <div className={`space-y-2 overflow-auto ${isRtl ? "pl-1" : "pr-1"}`}>
        {filteredSessions.map((s: any) => {
          const id = String(s.session_id || s.id || "");
          const label = formatSessionLabel(s, t);
          const last = s?.last_message || s?.lastMessage || "";
          const title = getSessionTitle(s) || t("untitledSession");
          const mode = s?.mode || s?.initial_data?.mode || s?.metadata?.mode;
          const ModeIcon = mode === "mock_interview" ? Mic : Briefcase;
          return (
            <div key={id} className="relative">
              <button
                className={`w-full rounded-2xl border p-3 text-start transition card-hover ${
                  id === sessionId
                    ? "border-[var(--accent)] bg-[var(--accent)]/10"
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
                      setMenuSessionId((prev) => (prev === id ? null : id));
                    }}
                    aria-label="Session menu"
                  >
                    <MoreVertical size={16} />
                  </button>
                </div>
                <div className="mt-1 text-xs text-[var(--text-muted)]">{label}</div>
                {last ? (
                  <div className="mt-1 line-clamp-2 text-xs text-[var(--text-muted)]">
                    {t("lastMessage")}: {last}
                  </div>
                ) : null}
              </button>
              {menuSessionId === id && (
                <div
                  className={`absolute ${isRtl ? "left-2" : "right-2"} top-12 z-50 w-36 rounded-lg border border-[var(--border)] bg-[var(--popout)] p-2 text-xs shadow-lg backdrop-blur`}
                >
                  <button
                    className="w-full rounded-md px-2 py-1 text-start hover:bg-[var(--glass)]"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRename(id, title);
                    }}
                  >
                    {t("saveTitle")}
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
    </div>
  );

  return (
    <div className="relative flex h-[calc(100vh-6rem)] gap-4">
      <aside
        className={`fixed inset-y-0 z-20 w-[82vw] max-w-[20rem] transform border border-[var(--border)] bg-[var(--popout)] transition-transform duration-300 lg:static lg:w-[30%] lg:max-w-[22rem] lg:translate-x-0 lg:border-0 ${
          isRtl ? "right-0 lg:border-l" : "left-0 lg:border-r"
        } ${showSessions ? "translate-x-0" : isRtl ? "translate-x-full" : "-translate-x-full"}`}
      >
        {sessionsSidebar}
      </aside>

      <main className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--glass)] p-4">
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
              className="btn-ghost lg:hidden"
              onClick={() => setShowRightPanel(true)}
              aria-label={t("insightsPanel")}
            >
              <Sparkles size={18} className="shine-icon" />
            </button>
          </div>
          {sessionId ? <span className="text-xs text-[var(--text-muted)]">{sessionId}</span> : null}
        </div>

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
              <div key={idx} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                {!isUser && showAvatar && (
                  <div
                    className={`${isRtl ? "ml-2" : "mr-2"} flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)] text-xs font-semibold text-black`}
                  >
                    AI
                  </div>
                )}
                <div
                  className={`relative max-w-[92%] rounded-2xl p-3 text-sm shadow-md transition animate-fade-in sm:max-w-[80%] ${
                    isUser
                      ? isRtl
                        ? "rounded-bl-none bg-[var(--accent)] text-black"
                        : "rounded-br-none bg-[var(--accent)] text-black"
                      : isRtl
                        ? "rounded-br-none bg-[var(--glass)]"
                        : "rounded-bl-none bg-[var(--glass)]"
                  }`}
                >
                  <div className="whitespace-pre-wrap">{m.text}</div>
                  {showAvatar && (
                    <span className="mt-1 block text-right text-[10px] text-[var(--text-muted)]">
                      {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  )}
                  {isUser && m.pending && (
                    <span className="mt-1 inline-flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
                      {t("sending")}
                      <span className="inline-flex gap-1">
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--text-muted)] [animation-delay:-0.2s]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--text-muted)] [animation-delay:-0.1s]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--text-muted)]" />
                      </span>
                    </span>
                  )}
                  <span
                    aria-hidden="true"
                    className={`absolute bottom-2 h-3 w-3 rotate-45 ${
                      isUser
                        ? isRtl
                          ? "-left-1 bg-[var(--accent)]"
                          : "-right-1 bg-[var(--accent)]"
                        : isRtl
                          ? "-right-1 bg-[var(--glass)]"
                          : "-left-1 bg-[var(--glass)]"
                    }`}
                  />
                </div>
                {isUser && showAvatar && (
                  <div
                    className={`${isRtl ? "mr-2" : "ml-2"} flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)] text-xs font-semibold text-black`}
                  >
                    You
                  </div>
                )}
              </div>
            );
          })}
          {chatMutation.isPending && (
            <div className="flex justify-start">
              <div
                className={`rounded-2xl ${isRtl ? "rounded-br-none" : "rounded-bl-none"} bg-[var(--glass)] p-3 text-sm`}
              >
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
            <textarea
              id="ai-message"
              className="min-h-[44px] max-h-40 flex-1 resize-none bg-transparent p-2 text-sm outline-none"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t("askPlaceholder")}
              ref={inputRef}
              rows={1}
              onFocus={() => {
                if (!sessionId) setShowSessions(true);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (!sessionId || !message || chatMutation.isPending) return;
                  const outgoing = message.trim();
                  if (!outgoing) return;
                  const pendingId = `pending-${Date.now()}`;
                  setMessages((prev) => [
                    ...prev,
                    { role: "user", text: outgoing, pending: true, id: pendingId },
                  ]);
                  setMessage("");
                  chatMutation.mutate({ text: outgoing, pendingId });
                }
              }}
            />
            <button
              className="btn-primary flex h-10 w-10 items-center justify-center rounded-full p-0"
              onClick={() => {
                if (!sessionId || !message || chatMutation.isPending) return;
                const outgoing = message.trim();
                if (!outgoing) return;
                const pendingId = `pending-${Date.now()}`;
                setMessages((prev) => [
                  ...prev,
                  { role: "user", text: outgoing, pending: true, id: pendingId },
                ]);
                setMessage("");
                chatMutation.mutate({ text: outgoing, pendingId });
              }}
              disabled={!sessionId || !message || chatMutation.isPending}
              aria-label={t("send")}
            >
              <Send size={18} />
            </button>
          </div>
          {!sessionId && (
            <p className="mt-2 px-2 text-xs text-[var(--text-muted)]">{t("selectSessionHint")}</p>
          )}
          {chatError && <p className="mt-2 px-2 text-xs text-red-300">{chatError}</p>}
        </div>
      </main>

      <aside
        className={`fixed inset-x-0 bottom-0 z-20 h-[80vh] transform rounded-t-2xl border border-[var(--border)] bg-[var(--popout)] p-4 transition-transform duration-300 lg:static lg:h-auto lg:w-[26rem] lg:translate-y-0 lg:rounded-2xl ${
          showRightPanel ? "translate-y-0" : "translate-y-full lg:translate-y-0"
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">{t("insightsPanel")}</h2>
            <button className="btn-ghost lg:hidden" onClick={() => setShowRightPanel(false)}>
              <X size={18} />
            </button>
          </div>

          <div className="mb-4 flex gap-2" role="tablist" aria-label={t("aiConsultant")}>
            <button
              role="tab"
              aria-selected={activeTab === "builder"}
              className={`flex-1 rounded-lg py-2 text-xs font-semibold transition ${
                activeTab === "builder"
                  ? "bg-[var(--accent)] text-black"
                  : "text-[var(--text-muted)] hover:bg-[var(--glass)]"
              }`}
              onClick={() => setActiveTab("builder")}
            >
              <Briefcase className="mr-1 inline h-4 w-4" />
              {language === "ar" ? "منشئ السيرة" : "Builder"}
            </button>
            <button
              role="tab"
              aria-selected={activeTab === "preview"}
              className={`flex-1 rounded-lg py-2 text-xs font-semibold transition ${
                activeTab === "preview"
                  ? "bg-[var(--accent)] text-black"
                  : "text-[var(--text-muted)] hover:bg-[var(--glass)]"
              }`}
              onClick={() => setActiveTab("preview")}
            >
              <Eye className="mr-1 inline h-4 w-4" />
              {t("previewPanel")}
            </button>
            <button
              role="tab"
              aria-selected={activeTab === "insights"}
              className={`flex-1 rounded-lg py-2 text-xs font-semibold transition ${
                activeTab === "insights"
                  ? "bg-[var(--accent)] text-black"
                  : "text-[var(--text-muted)] hover:bg-[var(--glass)]"
              }`}
              onClick={() => setActiveTab("insights")}
            >
              <Lightbulb className="mr-1 inline h-4 w-4" />
              {t("insightsPanel")}
            </button>
            <button
              role="tab"
              aria-selected={activeTab === "export"}
              className={`flex-1 rounded-lg py-2 text-xs font-semibold transition ${
                activeTab === "export"
                  ? "bg-[var(--accent)] text-black"
                  : "text-[var(--text-muted)] hover:bg-[var(--glass)]"
              }`}
              onClick={() => setActiveTab("export")}
            >
              <Download className="mr-1 inline h-4 w-4" />
              {t("exportPanel")}
            </button>
          </div>

          <div className="flex-1 overflow-auto">
            {activeTab === "builder" && (
              <div className="rounded-xl border border-[var(--border)] p-3 space-y-3">
                {!builderDraft?.sections && (
                  <p className="text-sm text-[var(--text-muted)]">
                    {language === "ar"
                      ? "لا توجد بيانات منشئ سيرة بعد. ابدأ من CV Lab ثم اضغط Start Improving."
                      : "No builder seed yet. Start from CV Lab and click Start Improving."}
                  </p>
                )}

                {builderDraft?.sections && (
                  <>
                    <div className="rounded-lg border border-[var(--border)] p-2 text-xs">
                      <div className="font-semibold mb-1">
                        {language === "ar" ? "حالة التحقق" : "Validation Status"}
                      </div>
                      <div>
                        {language === "ar" ? "الأقسام المطلوبة الناقصة:" : "Missing required sections:"}{" "}
                        {(builderComputed?.missingRequired || []).join(", ") || (language === "ar" ? "لا يوجد" : "None")}
                      </div>
                      <div className="mt-1">
                        {language === "ar" ? "أخطاء مانعة:" : "Blocking errors:"}{" "}
                        {(builderComputed?.blocking || []).join(", ") || (language === "ar" ? "لا يوجد" : "None")}
                      </div>
                    </div>

                    {atsHealth && (
                      <div className="rounded-lg border border-[var(--border)] p-2 text-xs space-y-2">
                        <div className="font-semibold">
                          {language === "ar" ? "ATS Health" : "ATS Health"}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="rounded border border-[var(--border)] p-2">
                            <div className="text-[var(--text-muted)]">
                              {language === "ar" ? "النتيجة العامة" : "Overall Score"}
                            </div>
                            <div className="text-lg font-semibold">{atsHealth.globalScore}</div>
                          </div>
                          <div className="rounded border border-[var(--border)] p-2">
                            <div className="text-[var(--text-muted)]">
                              {language === "ar" ? "هيكل السيرة" : "Structure"}
                            </div>
                            <div className="text-lg font-semibold">{atsHealth.structureScore}</div>
                          </div>
                          <div className="rounded border border-[var(--border)] p-2">
                            <div className="text-[var(--text-muted)]">
                              {language === "ar" ? "جاهزية الكلمات" : "Keyword Readiness"}
                            </div>
                            <div className="text-lg font-semibold">{atsHealth.keywordReadiness}</div>
                          </div>
                          <div className="rounded border border-[var(--border)] p-2">
                            <div className="text-[var(--text-muted)]">
                              {language === "ar" ? "جودة النقاط" : "Bullet Quality"}
                            </div>
                            <div className="text-lg font-semibold">{atsHealth.bulletQuality}</div>
                          </div>
                        </div>
                        <div>
                          {language === "ar" ? "إحصائيات النقاط:" : "Bullet stats:"}{" "}
                          {atsHealth.bulletStats.measurable}/{atsHealth.bulletStats.total}{" "}
                          {language === "ar" ? "قابلة للقياس" : "measurable"},{" "}
                          {atsHealth.bulletStats.actionVerb}/{atsHealth.bulletStats.total}{" "}
                          {language === "ar" ? "بفعل قوي" : "with action verbs"}
                        </div>
                        {atsHealth.warnings.length > 0 && (
                          <div className="text-amber-300">
                            {language === "ar" ? "تحذيرات الجودة:" : "Quality warnings:"}{" "}
                            {atsHealth.warnings.join(", ")}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="space-y-2">
                      <label className="text-xs text-[var(--text-muted)]">
                        {language === "ar" ? "الاسم الكامل" : "Full Name"}
                      </label>
                      <input
                        className="field"
                        value={builderSections.contact_information?.data?.full_name || ""}
                        onChange={(e) =>
                          updateBuilderSection("contact_information", {
                            ...(builderSections.contact_information?.data || {}),
                            full_name: e.target.value,
                          })
                        }
                      />
                      <label className="text-xs text-[var(--text-muted)]">
                        {language === "ar" ? "المسمى المهني" : "Professional Title"}
                      </label>
                      <input
                        className="field"
                        value={builderSections.contact_information?.data?.professional_title || ""}
                        onChange={(e) =>
                          updateBuilderSection("contact_information", {
                            ...(builderSections.contact_information?.data || {}),
                            professional_title: e.target.value,
                          })
                        }
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          className="field"
                          placeholder={language === "ar" ? "البريد الإلكتروني" : "Email"}
                          value={builderSections.contact_information?.data?.email || ""}
                          onChange={(e) =>
                            updateBuilderSection("contact_information", {
                              ...(builderSections.contact_information?.data || {}),
                              email: e.target.value,
                            })
                          }
                        />
                        <input
                          className="field"
                          placeholder={language === "ar" ? "رقم الهاتف" : "Phone"}
                          value={builderSections.contact_information?.data?.phone || ""}
                          onChange={(e) =>
                            updateBuilderSection("contact_information", {
                              ...(builderSections.contact_information?.data || {}),
                              phone: e.target.value,
                            })
                          }
                        />
                      </div>
                      <input
                        className="field"
                        placeholder={language === "ar" ? "الموقع" : "Location"}
                        value={builderSections.contact_information?.data?.location || ""}
                        onChange={(e) =>
                          updateBuilderSection("contact_information", {
                            ...(builderSections.contact_information?.data || {}),
                            location: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div>
                      <label className="text-xs text-[var(--text-muted)]">
                        {language === "ar" ? "الملخص المهني" : "Professional Summary"}
                      </label>
                      <textarea
                        className="field mt-1 min-h-[90px]"
                        value={builderSections.professional_summary?.data || ""}
                        onChange={(e) => updateBuilderSection("professional_summary", e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="text-xs text-[var(--text-muted)]">
                        {language === "ar" ? "المهارات (Programming مفصولة بفواصل)" : "Skills (Programming comma-separated)"}
                      </label>
                      <textarea
                        className="field mt-1 min-h-[70px]"
                        value={(builderSections.core_competencies?.data?.programming || []).join(", ")}
                        onChange={(e) =>
                          updateBuilderSection("core_competencies", {
                            ...(builderSections.core_competencies?.data || {}),
                            programming: e.target.value
                              .split(",")
                              .map((v: string) => v.trim())
                              .filter(Boolean),
                          })
                        }
                      />
                      <div className="mt-2 grid grid-cols-1 gap-2">
                        <input
                          className="field"
                          placeholder={language === "ar" ? "Frameworks (مفصولة بفواصل)" : "Frameworks (comma-separated)"}
                          value={(builderSections.core_competencies?.data?.frameworks || []).join(", ")}
                          onChange={(e) =>
                            updateBuilderSection("core_competencies", {
                              ...(builderSections.core_competencies?.data || {}),
                              frameworks: e.target.value
                                .split(",")
                                .map((v: string) => v.trim())
                                .filter(Boolean),
                            })
                          }
                        />
                        <input
                          className="field"
                          placeholder={language === "ar" ? "Tools/Platforms (مفصولة بفواصل)" : "Tools/Platforms (comma-separated)"}
                          value={(builderSections.core_competencies?.data?.tools_platforms || []).join(", ")}
                          onChange={(e) =>
                            updateBuilderSection("core_competencies", {
                              ...(builderSections.core_competencies?.data || {}),
                              tools_platforms: e.target.value
                                .split(",")
                                .map((v: string) => v.trim())
                                .filter(Boolean),
                            })
                          }
                        />
                        <input
                          className="field"
                          placeholder={language === "ar" ? "Domain Expertise (مفصولة بفواصل)" : "Domain Expertise (comma-separated)"}
                          value={(builderSections.core_competencies?.data?.domain_expertise || []).join(", ")}
                          onChange={(e) =>
                            updateBuilderSection("core_competencies", {
                              ...(builderSections.core_competencies?.data || {}),
                              domain_expertise: e.target.value
                                .split(",")
                                .map((v: string) => v.trim())
                                .filter(Boolean),
                            })
                          }
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-[var(--text-muted)]">
                          {language === "ar" ? "الخبرة المهنية" : "Professional Experience"}
                        </label>
                        <button
                          type="button"
                          className="btn-ghost text-xs"
                          onClick={() => addSectionArrayItem("professional_experience", EMPTY_EXPERIENCE)}
                        >
                          {language === "ar" ? "إضافة خبرة" : "Add Experience"}
                        </button>
                      </div>
                      {experienceRows.length === 0 && (
                        <p className="text-xs text-[var(--text-muted)]">
                          {language === "ar" ? "لا توجد خبرات مضافة." : "No experience entries yet."}
                        </p>
                      )}
                      {experienceRows.map((row: any, idx: number) => (
                        <div key={`exp-${idx}`} className="rounded-lg border border-[var(--border)] p-2 space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              className="field"
                              placeholder={language === "ar" ? "المسمى الوظيفي" : "Job Title"}
                              value={row?.job_title || ""}
                              onChange={(e) =>
                                updateSectionArrayItem("professional_experience", idx, {
                                  ...row,
                                  job_title: e.target.value,
                                })
                              }
                            />
                            <input
                              className="field"
                              placeholder={language === "ar" ? "الشركة" : "Company"}
                              value={row?.company || ""}
                              onChange={(e) =>
                                updateSectionArrayItem("professional_experience", idx, {
                                  ...row,
                                  company: e.target.value,
                                })
                              }
                            />
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <input
                              className="field"
                              placeholder={language === "ar" ? "الموقع" : "Location"}
                              value={row?.location || ""}
                              onChange={(e) =>
                                updateSectionArrayItem("professional_experience", idx, {
                                  ...row,
                                  location: e.target.value,
                                })
                              }
                            />
                            <input
                              className="field"
                              placeholder={language === "ar" ? "من (YYYY-MM)" : "Start (YYYY-MM)"}
                              value={row?.start_date || ""}
                              onChange={(e) =>
                                updateSectionArrayItem("professional_experience", idx, {
                                  ...row,
                                  start_date: e.target.value,
                                })
                              }
                            />
                            <input
                              className="field"
                              placeholder={language === "ar" ? "إلى (YYYY-MM)" : "End (YYYY-MM)"}
                              value={row?.end_date || ""}
                              onChange={(e) =>
                                updateSectionArrayItem("professional_experience", idx, {
                                  ...row,
                                  end_date: e.target.value,
                                })
                              }
                            />
                          </div>
                          <textarea
                            className="field min-h-[80px]"
                            placeholder={language === "ar" ? "النقاط (سطر لكل نقطة)" : "Bullets (one line per bullet)"}
                            value={toLines(row?.bullets)}
                            onChange={(e) =>
                              updateSectionArrayItem("professional_experience", idx, {
                                ...row,
                                bullets: fromLines(e.target.value),
                              })
                            }
                          />
                          <button
                            type="button"
                            className="btn-ghost text-xs text-red-300"
                            onClick={() => removeSectionArrayItem("professional_experience", idx)}
                          >
                            {language === "ar" ? "حذف الخبرة" : "Remove Experience"}
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-[var(--text-muted)]">
                          {language === "ar" ? "الشهادات والجوائز" : "Certifications & Awards"}
                        </label>
                        <button
                          type="button"
                          className="btn-ghost text-xs"
                          onClick={() => addSectionArrayItem("certifications_awards", EMPTY_CERT_AWARD)}
                        >
                          {language === "ar" ? "إضافة عنصر" : "Add Entry"}
                        </button>
                      </div>
                      {certAwardRows.length === 0 && (
                        <p className="text-xs text-[var(--text-muted)]">
                          {language === "ar" ? "لا توجد شهادات أو جوائز." : "No certifications or awards yet."}
                        </p>
                      )}
                      {certAwardRows.map((row: any, idx: number) => (
                        <div key={`cert-${idx}`} className="rounded-lg border border-[var(--border)] p-2 space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <select
                              className="field"
                              value={row?.type || "certification"}
                              onChange={(e) =>
                                updateSectionArrayItem("certifications_awards", idx, {
                                  ...row,
                                  type: e.target.value,
                                })
                              }
                            >
                              <option value="certification">
                                {language === "ar" ? "شهادة" : "Certification"}
                              </option>
                              <option value="award">
                                {language === "ar" ? "جائزة" : "Award"}
                              </option>
                            </select>
                            <input
                              className="field"
                              placeholder={language === "ar" ? "الاسم" : "Name"}
                              value={row?.name || ""}
                              onChange={(e) =>
                                updateSectionArrayItem("certifications_awards", idx, {
                                  ...row,
                                  name: e.target.value,
                                })
                              }
                            />
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <input
                              className="field"
                              placeholder={language === "ar" ? "الاختصار" : "Acronym"}
                              value={row?.acronym || ""}
                              onChange={(e) =>
                                updateSectionArrayItem("certifications_awards", idx, {
                                  ...row,
                                  acronym: e.target.value,
                                })
                              }
                            />
                            <input
                              className="field"
                              placeholder={language === "ar" ? "الجهة المانحة" : "Issuer"}
                              value={row?.issuer || ""}
                              onChange={(e) =>
                                updateSectionArrayItem("certifications_awards", idx, {
                                  ...row,
                                  issuer: e.target.value,
                                })
                              }
                            />
                            <input
                              className="field"
                              placeholder={language === "ar" ? "التاريخ" : "Date"}
                              value={row?.date || ""}
                              onChange={(e) =>
                                updateSectionArrayItem("certifications_awards", idx, {
                                  ...row,
                                  date: e.target.value,
                                })
                              }
                            />
                          </div>
                          <button
                            type="button"
                            className="btn-ghost text-xs text-red-300"
                            onClick={() => removeSectionArrayItem("certifications_awards", idx)}
                          >
                            {language === "ar" ? "حذف العنصر" : "Remove Entry"}
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-[var(--text-muted)]">
                          {language === "ar" ? "المشاريع" : "Projects"}
                        </label>
                        <button
                          type="button"
                          className="btn-ghost text-xs"
                          onClick={() => addSectionArrayItem("projects", EMPTY_PROJECT)}
                        >
                          {language === "ar" ? "إضافة مشروع" : "Add Project"}
                        </button>
                      </div>
                      {projectRows.length === 0 && (
                        <p className="text-xs text-[var(--text-muted)]">
                          {language === "ar" ? "لا توجد مشاريع مضافة." : "No project entries yet."}
                        </p>
                      )}
                      {projectRows.map((row: any, idx: number) => (
                        <div key={`proj-${idx}`} className="rounded-lg border border-[var(--border)] p-2 space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              className="field"
                              placeholder={language === "ar" ? "عنوان المشروع" : "Project Title"}
                              value={row?.title || ""}
                              onChange={(e) =>
                                updateSectionArrayItem("projects", idx, { ...row, title: e.target.value })
                              }
                            />
                            <input
                              className="field"
                              placeholder={language === "ar" ? "الدور" : "Role"}
                              value={row?.role || ""}
                              onChange={(e) =>
                                updateSectionArrayItem("projects", idx, { ...row, role: e.target.value })
                              }
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              className="field"
                              placeholder={language === "ar" ? "من (YYYY-MM)" : "Start (YYYY-MM)"}
                              value={row?.start_date || ""}
                              onChange={(e) =>
                                updateSectionArrayItem("projects", idx, { ...row, start_date: e.target.value })
                              }
                            />
                            <input
                              className="field"
                              placeholder={language === "ar" ? "إلى (YYYY-MM)" : "End (YYYY-MM)"}
                              value={row?.end_date || ""}
                              onChange={(e) =>
                                updateSectionArrayItem("projects", idx, { ...row, end_date: e.target.value })
                              }
                            />
                          </div>
                          <textarea
                            className="field min-h-[70px]"
                            placeholder={language === "ar" ? "هدف المشروع" : "Project objective"}
                            value={row?.objective || ""}
                            onChange={(e) =>
                              updateSectionArrayItem("projects", idx, { ...row, objective: e.target.value })
                            }
                          />
                          <input
                            className="field"
                            placeholder={language === "ar" ? "التقنيات (مفصولة بفواصل)" : "Tech stack (comma-separated)"}
                            value={Array.isArray(row?.tech_stack) ? row.tech_stack.join(", ") : ""}
                            onChange={(e) =>
                              updateSectionArrayItem("projects", idx, {
                                ...row,
                                tech_stack: e.target.value.split(",").map((v) => v.trim()).filter(Boolean),
                              })
                            }
                          />
                          <textarea
                            className="field min-h-[70px]"
                            placeholder={language === "ar" ? "نقاط الإنجاز (سطر لكل نقطة)" : "Bullet achievements (one line each)"}
                            value={toLines(row?.bullets)}
                            onChange={(e) =>
                              updateSectionArrayItem("projects", idx, {
                                ...row,
                                bullets: fromLines(e.target.value),
                              })
                            }
                          />
                          <button
                            type="button"
                            className="btn-ghost text-xs text-red-300"
                            onClick={() => removeSectionArrayItem("projects", idx)}
                          >
                            {language === "ar" ? "حذف المشروع" : "Remove Project"}
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-[var(--text-muted)]">
                          {language === "ar" ? "التعليم" : "Education"}
                        </label>
                        <button
                          type="button"
                          className="btn-ghost text-xs"
                          onClick={() => addSectionArrayItem("education", EMPTY_EDUCATION)}
                        >
                          {language === "ar" ? "إضافة تعليم" : "Add Education"}
                        </button>
                      </div>
                      {educationRows.length === 0 && (
                        <p className="text-xs text-[var(--text-muted)]">
                          {language === "ar" ? "لا توجد بيانات تعليم مضافة." : "No education entries yet."}
                        </p>
                      )}
                      {educationRows.map((row: any, idx: number) => (
                        <div key={`edu-${idx}`} className="rounded-lg border border-[var(--border)] p-2 space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              className="field"
                              placeholder={language === "ar" ? "الدرجة العلمية" : "Degree"}
                              value={row?.degree || ""}
                              onChange={(e) =>
                                updateSectionArrayItem("education", idx, { ...row, degree: e.target.value })
                              }
                            />
                            <input
                              className="field"
                              placeholder={language === "ar" ? "المؤسسة" : "Institution"}
                              value={row?.institution || ""}
                              onChange={(e) =>
                                updateSectionArrayItem("education", idx, { ...row, institution: e.target.value })
                              }
                            />
                          </div>
                          <input
                            className="field"
                            placeholder={language === "ar" ? "سنة التخرج" : "Graduation Year"}
                            value={row?.graduation_year || ""}
                            onChange={(e) =>
                              updateSectionArrayItem("education", idx, {
                                ...row,
                                graduation_year: e.target.value,
                              })
                            }
                          />
                          <textarea
                            className="field min-h-[60px]"
                            placeholder={language === "ar" ? "مواد ذات صلة (سطر لكل مادة)" : "Relevant coursework (one line each)"}
                            value={toLines(row?.coursework)}
                            onChange={(e) =>
                              updateSectionArrayItem("education", idx, {
                                ...row,
                                coursework: fromLines(e.target.value),
                              })
                            }
                          />
                          <button
                            type="button"
                            className="btn-ghost text-xs text-red-300"
                            onClick={() => removeSectionArrayItem("education", idx)}
                          >
                            {language === "ar" ? "حذف التعليم" : "Remove Education"}
                          </button>
                        </div>
                      ))}
                    </div>

                    <button
                      className="btn-primary w-full"
                      onClick={() => builderSyncMutation.mutate()}
                      disabled={!sessionId || builderSyncMutation.isPending}
                    >
                      {builderSyncMutation.isPending
                        ? language === "ar"
                          ? "جاري المزامنة..."
                          : "Syncing..."
                        : language === "ar"
                          ? "مزامنة مع المحادثة"
                          : "Sync Builder to Chat"}
                    </button>
                    {builderSyncInfo && <p className="text-xs text-emerald-300">{builderSyncInfo}</p>}
                    {builderSyncError && <p className="text-xs text-red-300">{builderSyncError}</p>}
                  </>
                )}
              </div>
            )}

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
                {sessionId && previewQ.isLoading && (
                  <p className="text-sm text-[var(--text-muted)]">{t("previewLoading")}</p>
                )}
                {sessionId && previewQ.isError && <p className="text-sm text-red-300">{t("previewFailed")}</p>}
                {sessionId && !previewQ.isLoading && !previewQ.isError && !previewAvailable && (
                  <p className="text-sm text-[var(--text-muted)]">{t("previewEmpty")}</p>
                )}
                {sessionId && previewQ.data && (
                  <iframe
                    title="cv-preview"
                    className="h-[60vh] min-h-[300px] w-full rounded-lg border border-[var(--border)] bg-white"
                    srcDoc={buildPreviewDoc(previewQ.data, language)}
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
                      <span
                        className={`rounded-full px-2 py-1 ${
                          insights?.is_complete
                            ? "bg-emerald-500/15 text-emerald-300"
                            : "bg-amber-500/15 text-amber-300"
                        }`}
                      >
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

                    {(rewriteSummary || rewriteExperience.length || rewriteProjects.length) && (
                      <div className="rounded-xl border border-[var(--border)] p-3">
                        <div className="text-xs uppercase text-[var(--text-muted)]">{t("rewriteTitle")}</div>
                        {rewriteSummary?.original && rewriteSummary?.improved && (
                          <div className="mt-2 space-y-2">
                            <div className="text-xs text-[var(--text-muted)]">{t("summaryLabel")}</div>
                            <div className="rounded-lg border border-[var(--border)] p-2 text-xs">
                              <div className="text-[var(--text-muted)]">{t("originalText")}</div>
                              <div className="mt-1 whitespace-pre-wrap">{rewriteSummary.original}</div>
                            </div>
                            <div className="rounded-lg border border-[var(--border)] p-2 text-xs">
                              <div className="text-[var(--text-muted)]">{t("improvedText")}</div>
                              <div className="mt-1 whitespace-pre-wrap">{rewriteSummary.improved}</div>
                            </div>
                          </div>
                        )}

                        {rewriteExperience.length > 0 && (
                          <div className="mt-3 space-y-2">
                            {rewriteExperience.slice(0, 3).map((item: any, idx: number) => (
                              <div key={`exp-${idx}`} className="rounded-lg border border-[var(--border)] p-2 text-xs">
                                <div className="mb-1 text-[var(--text-muted)]">
                                  {t("experienceLabel")} {idx + 1}
                                </div>
                                <div className="text-[var(--text-muted)]">{t("originalText")}</div>
                                <div className="mt-1 whitespace-pre-wrap">{item?.original || ""}</div>
                                <div className="mt-2 text-[var(--text-muted)]">{t("improvedText")}</div>
                                <div className="mt-1 whitespace-pre-wrap">{item?.improved || ""}</div>
                              </div>
                            ))}
                          </div>
                        )}

                        {rewriteProjects.length > 0 && (
                          <div className="mt-3 space-y-2">
                            {rewriteProjects.slice(0, 3).map((item: any, idx: number) => (
                              <div key={`proj-${idx}`} className="rounded-lg border border-[var(--border)] p-2 text-xs">
                                <div className="mb-1 text-[var(--text-muted)]">
                                  {t("projectLabel")} {idx + 1}
                                </div>
                                <div className="text-[var(--text-muted)]">{t("originalText")}</div>
                                <div className="mt-1 whitespace-pre-wrap">{item?.original || ""}</div>
                                <div className="mt-2 text-[var(--text-muted)]">{t("improvedText")}</div>
                                <div className="mt-1 whitespace-pre-wrap">{item?.improved || ""}</div>
                              </div>
                            ))}
                          </div>
                        )}
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
                  disabled={!sessionId || !previewAvailable || exportMutation.isPending || exportBlockedByBuilder}
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
                  disabled={!sessionId || !previewAvailable || exportMutation.isPending || exportBlockedByBuilder}
                >
                  {exportMutation.isPending && exportFormat === "docx" && (
                    <Loader2 size={16} className="mr-2 inline animate-spin" />
                  )}
                  {t("exportDocx")}
                </button>
                {!previewAvailable && sessionId && (
                  <p className="text-xs text-[var(--text-muted)]">{t("exportDisabledHint")}</p>
                )}
                {exportBlockedByBuilder && (
                  <p className="text-xs text-amber-300">
                    {language === "ar"
                      ? "أكمل الأقسام المطلوبة في تبويب Builder ثم قم بالمزامنة قبل التصدير."
                      : "Complete required sections in Builder and sync before exporting."}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </aside>

      {(showSessions || showRightPanel) && (
        <div
          className="fixed inset-0 z-10 bg-black/50 backdrop-blur-sm lg:hidden"
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

