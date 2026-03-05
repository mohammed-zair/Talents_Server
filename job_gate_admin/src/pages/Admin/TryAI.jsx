import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Header } from "../../components";
import axiosInstance from "../../utils/axiosConfig";
import { extractData } from "../../utils/api";

const parseJsonMaybe = (value) => {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const toList = (value) => {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || "").trim()).filter(Boolean);
};

const scoreTone = (score) => {
  const n = Number(score);
  if (!Number.isFinite(n)) {
    return {
      label: "N/A",
      className: "border-slate-300 bg-slate-50 text-slate-700",
      bar: "bg-slate-400",
    };
  }
  if (n >= 75) {
    return {
      label: "Strong",
      className: "border-emerald-300 bg-emerald-50 text-emerald-700",
      bar: "bg-emerald-500",
    };
  }
  if (n >= 50) {
    return {
      label: "Moderate",
      className: "border-amber-300 bg-amber-50 text-amber-700",
      bar: "bg-amber-500",
    };
  }
  return {
    label: "Risk",
    className: "border-rose-300 bg-rose-50 text-rose-700",
    bar: "bg-rose-500",
  };
};

const boolBadge = (value) => {
  const ok = Boolean(value);
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-semibold ${
        ok
          ? "border-emerald-300 bg-emerald-50 text-emerald-700"
          : "border-rose-300 bg-rose-50 text-rose-700"
      }`}
    >
      {ok ? "Yes" : "No"}
    </span>
  );
};

const TryAI = () => {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [useAI, setUseAI] = useState(true);
  const [saveToDb, setSaveToDb] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("summary");
  const [sessionQuery, setSessionQuery] = useState("");

  const loadSessions = async () => {
    try {
      setSessionsLoading(true);
      const response = await axiosInstance.get("/ai/chatbot/sessions");
      const payload = extractData(response);
      setSessions(payload?.sessions || []);
    } catch {
      setSessions([]);
    } finally {
      setSessionsLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const handleFileChange = (event) => {
    setFile(event.target.files?.[0] || null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setResult(null);

    if (!file) {
      setError("Please select a CV file (PDF or DOCX).");
      return;
    }

    try {
      setLoading(true);
      const form = new FormData();
      form.append("file", file);
      if (title) form.append("title", title);
      form.append("useAI", String(useAI));
      form.append("saveToDb", String(saveToDb));

      const response = await axiosInstance.post("/ai/cv/analyze-file", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const payload = extractData(response);
      setResult(payload);
      setActiveTab("summary");
    } catch (err) {
      setError(err?.response?.data?.message || "AI analysis failed.");
    } finally {
      setLoading(false);
    }
  };

  const features = parseJsonMaybe(result?.features || result?.features_analytics || {}) || {};
  const structuredData =
    parseJsonMaybe(result?.structured_data || result?.data_json || result?.cv_structured_data || {}) ||
    {};
  const aiIntelligence = parseJsonMaybe(
    result?.ai_intelligence || result?.insights || result?.intelligence || {}
  ) || {};

  const strengths = toList(aiIntelligence?.strengths || aiIntelligence?.strategic_analysis?.strengths);
  const weaknesses = toList(aiIntelligence?.weaknesses || aiIntelligence?.strategic_analysis?.weaknesses);
  const recommendations = toList(
    aiIntelligence?.recommendations || aiIntelligence?.ats_optimization_tips
  );
  const interviewQuestions = toList(aiIntelligence?.interview_questions);

  const atsScore = result?.ats_score ?? features?.ats_score ?? null;
  const tone = scoreTone(atsScore);

  const parseQualityChecks = [
    { label: "Contact Info", ok: features?.has_contact_info },
    { label: "Education", ok: features?.has_education },
    { label: "Experience", ok: features?.has_experience },
    { label: "ATS Compliant", ok: features?.is_ats_compliant },
  ];

  const filteredSessions = useMemo(() => {
    const q = sessionQuery.trim().toLowerCase();
    const sorted = [...sessions].sort(
      (a, b) => new Date(b?.updated_at || 0).getTime() - new Date(a?.updated_at || 0).getTime()
    );
    if (!q) return sorted;
    return sorted.filter((s) => String(s?.session_id || "").toLowerCase().includes(q));
  }, [sessions, sessionQuery]);

  const tabs = [
    { id: "summary", label: "Summary" },
    { id: "features", label: "Features" },
    { id: "structured", label: "Structured Data" },
    { id: "raw", label: "Raw JSON" },
    { id: "sessions", label: "Sessions" },
  ];

  return (
    <div className="m-2 mt-24 rounded-3xl bg-white p-2 md:m-10 md:p-10">
      <Header category="Admin" title="Try AI" />

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <aside className="space-y-4">
          <div className="rounded-2xl border border-indigo-200 bg-[linear-gradient(145deg,#eef2ff,#ffffff)] p-5 shadow-sm">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Control Panel</h3>
              <p className="text-xs text-gray-500">Upload CV and run analysis pipeline</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                  CV File
                </label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileChange}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Title (Optional)
                </label>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="e.g. Senior Frontend CV"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={useAI}
                  onChange={(event) => setUseAI(event.target.checked)}
                />
                Use AI parsing
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={saveToDb}
                  onChange={(event) => setSaveToDb(event.target.checked)}
                />
                Save analysis to database
              </label>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full overflow-hidden rounded-lg border border-indigo-600 bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
              >
                <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.3),transparent)] opacity-0 transition-opacity group-hover:opacity-100" />
                <span className="relative inline-flex items-center gap-2">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="m12 3 2.5 5.2L20 9l-4 3.8 1 5.2L12 15l-5 3 1-5.2L4 9l5.5-.8L12 3z" />
                  </svg>
                  {loading ? "Analyzing..." : "Analyze CV"}
                </span>
              </button>
            </form>
            <Link
              to="/ai-chatbot"
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-indigo-300 bg-white py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8z" />
              </svg>
              Open AI Chatbot
            </Link>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-800">Resume Sessions</h4>
              <button
                type="button"
                onClick={loadSessions}
                className="rounded-md border border-indigo-200 px-2 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
              >
                Refresh
              </button>
            </div>
            <input
              value={sessionQuery}
              onChange={(event) => setSessionQuery(event.target.value)}
              placeholder="Search session ID"
              className="mb-3 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs"
            />
            {sessionsLoading && <p className="text-xs text-gray-500">Loading sessions...</p>}
            {!sessionsLoading && filteredSessions.length === 0 && (
              <p className="text-xs text-gray-500">No matching sessions.</p>
            )}
            {!sessionsLoading && filteredSessions.length > 0 && (
              <div className="max-h-[280px] space-y-2 overflow-auto pe-1">
                {filteredSessions.slice(0, 10).map((session) => (
                  <div key={session.session_id} className="rounded-lg border border-gray-200 bg-white p-3">
                    <p className="line-clamp-1 break-all text-xs font-semibold text-gray-800">
                      {session.session_id}
                    </p>
                    <div className="mt-1 flex items-center justify-between text-[11px] text-gray-500">
                      <span>{session.language || "english"}</span>
                      <span>
                        {session.updated_at
                          ? new Date(session.updated_at).toLocaleString()
                          : "-"}
                      </span>
                    </div>
                    <Link
                      to={`/ai-chatbot?sessionId=${session.session_id}`}
                      className="mt-2 inline-flex w-full items-center justify-center rounded-md border border-indigo-300 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
                    >
                      Resume Session
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>

        <main className="rounded-2xl border border-gray-200 bg-white p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">AI Analysis Workspace</h3>
              <p className="text-sm text-gray-500">Review quality signals, extracted data, and raw payload.</p>
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          {!result && !loading && !error && (
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 py-14 text-center text-gray-500">
              Upload a CV to generate AI analysis.
            </div>
          )}

          {loading && (
            <div className="space-y-3">
              <div className="h-24 animate-pulse rounded-xl bg-gray-100" />
              <div className="h-32 animate-pulse rounded-xl bg-gray-100" />
              <div className="h-48 animate-pulse rounded-xl bg-gray-100" />
            </div>
          )}

          {result && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3">
                  <p className="text-xs uppercase tracking-wide text-indigo-500">ATS Score</p>
                  <p className="mt-1 text-2xl font-bold text-indigo-900">{atsScore ?? "-"}</p>
                  <span className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${tone.className}`}>
                    {tone.label}
                  </span>
                </div>
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Method</p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">{result.analysis_method || "-"}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Processing Time</p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">{result.processing_time || "-"}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Years Experience</p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">{features.total_years_experience ?? "-"}</p>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-800">Parse Quality</p>
                  <p className="text-xs text-gray-500">Key field validation</p>
                </div>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                  {parseQualityChecks.map((item) => (
                    <div key={item.label} className="rounded-lg border border-gray-200 bg-gray-50 p-2">
                      <p className="mb-1 text-[11px] text-gray-500">{item.label}</p>
                      {boolBadge(item.ok)}
                    </div>
                  ))}
                </div>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                  <div
                    className={`h-full ${tone.bar}`}
                    style={{ width: `${Math.max(0, Math.min(100, Number(atsScore) || 0))}%` }}
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                      activeTab === tab.id
                        ? "border-indigo-600 bg-indigo-600 text-white"
                        : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {activeTab === "summary" && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-gray-200 p-4">
                    <p className="text-sm font-semibold text-gray-800">Contextual Summary</p>
                    <p className="mt-2 text-sm leading-7 text-gray-700">
                      {aiIntelligence?.contextual_summary ||
                        aiIntelligence?.professional_summary ||
                        aiIntelligence?.summary ||
                        "No summary available."}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Strengths</p>
                      <ul className="mt-2 space-y-1 text-xs text-emerald-900">
                        {strengths.length
                          ? strengths.slice(0, 6).map((item) => <li key={`st-${item}`}>• {item}</li>)
                          : <li>• No strengths found.</li>}
                      </ul>
                    </div>
                    <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">Weaknesses</p>
                      <ul className="mt-2 space-y-1 text-xs text-rose-900">
                        {weaknesses.length
                          ? weaknesses.slice(0, 6).map((item) => <li key={`wk-${item}`}>• {item}</li>)
                          : <li>• No weaknesses found.</li>}
                      </ul>
                    </div>
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Recommendations</p>
                      <ul className="mt-2 space-y-1 text-xs text-amber-900">
                        {recommendations.length
                          ? recommendations.slice(0, 6).map((item) => <li key={`rc-${item}`}>• {item}</li>)
                          : <li>• No recommendations found.</li>}
                      </ul>
                    </div>
                  </div>
                  <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Interview Questions</p>
                    <ul className="mt-2 space-y-1 text-xs text-indigo-900">
                      {interviewQuestions.length
                        ? interviewQuestions.slice(0, 6).map((item) => <li key={`iq-${item}`}>• {item}</li>)
                        : <li>• No interview questions found.</li>}
                    </ul>
                  </div>
                </div>
              )}

              {activeTab === "features" && (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {[
                    { label: "ATS Score", value: atsScore ?? "-" },
                    { label: "Total Years Experience", value: features.total_years_experience ?? "-" },
                    { label: "Achievement Count", value: features.achievement_count ?? "-" },
                    { label: "Has Contact Info", value: String(Boolean(features.has_contact_info)) },
                    { label: "Has Education", value: String(Boolean(features.has_education)) },
                    { label: "Has Experience", value: String(Boolean(features.has_experience)) },
                    { label: "ATS Compliant", value: String(Boolean(features.is_ats_compliant)) },
                    { label: "Key Skills", value: Array.isArray(features.key_skills) ? features.key_skills.join(", ") : "-" },
                  ].map((item) => (
                    <div key={item.label} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                      <p className="text-xs text-gray-500">{item.label}</p>
                      <p className="mt-1 break-words text-sm font-semibold text-gray-900">{item.value}</p>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === "structured" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                      <p className="text-xs uppercase tracking-wide text-gray-500">Personal</p>
                      <pre className="mt-2 whitespace-pre-wrap text-xs text-gray-800">
                        {JSON.stringify(structuredData?.personal_info || {}, null, 2)}
                      </pre>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                      <p className="text-xs uppercase tracking-wide text-gray-500">Skills</p>
                      <p className="mt-2 text-xs text-gray-800">
                        {Array.isArray(structuredData?.skills) && structuredData.skills.length
                          ? structuredData.skills.join(", ")
                          : "No skills found."}
                      </p>
                    </div>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <p className="text-xs uppercase tracking-wide text-gray-500">Experience</p>
                    <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap text-xs text-gray-800">
                      {JSON.stringify(structuredData?.experience || [], null, 2)}
                    </pre>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <p className="text-xs uppercase tracking-wide text-gray-500">Education & Projects</p>
                    <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap text-xs text-gray-800">
                      {JSON.stringify(
                        {
                          education: structuredData?.education || [],
                          projects: structuredData?.projects || [],
                          languages: structuredData?.languages || [],
                        },
                        null,
                        2
                      )}
                    </pre>
                  </div>
                </div>
              )}

              {activeTab === "raw" && (
                <pre className="max-h-[520px] overflow-auto rounded-xl bg-gray-900 p-4 text-xs text-gray-100">
                  {JSON.stringify(result, null, 2)}
                </pre>
              )}

              {activeTab === "sessions" && (
                <div className="space-y-2">
                  {filteredSessions.length === 0 && (
                    <p className="text-sm text-gray-500">No sessions available.</p>
                  )}
                  {filteredSessions.slice(0, 12).map((session) => (
                    <div
                      key={`tab-${session.session_id}`}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 p-3"
                    >
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{session.session_id}</p>
                        <p className="text-xs text-gray-500">
                          {session.language || "english"} ·{" "}
                          {session.updated_at ? new Date(session.updated_at).toLocaleString() : "-"}
                        </p>
                      </div>
                      <Link
                        to={`/ai-chatbot?sessionId=${session.session_id}`}
                        className="rounded-md border border-indigo-300 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
                      >
                        Resume
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default TryAI;
