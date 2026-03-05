import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  FiActivity,
  FiBarChart2,
  FiBriefcase,
  FiCheckCircle,
  FiClock,
  FiRefreshCw,
  FiTrendingUp,
  FiUsers,
} from "react-icons/fi";
import axiosInstance from "../utils/axiosConfig";
import { extractData } from "../utils/api";

const MONTHS_TO_SHOW = 12;

const formatMonthLabel = (year, monthIndex) =>
  new Date(year, monthIndex, 1).toLocaleString("en-US", { month: "short" });

const monthKeyFromDate = (value) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const getLastMonths = (count = MONTHS_TO_SHOW) => {
  const now = new Date();
  const out = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    out.push({ key, label: formatMonthLabel(d.getFullYear(), d.getMonth()) });
  }
  return out;
};

const toPercent = (value) => `${Number(value || 0).toFixed(1)}%`;

const safeArray = (value) => (Array.isArray(value) ? value : []);

const normalizeApplications = (apps) =>
  safeArray(apps).map((app) => ({
    ...app,
    status: String(app?.status || "pending").toLowerCase(),
  }));

const statusColor = {
  pending: "#f59e0b",
  reviewed: "#6366f1",
  shortlisted: "#06b6d4",
  accepted: "#8b5cf6",
  hired: "#10b981",
  rejected: "#ef4444",
};

const linePath = (data, width, height, max) => {
  if (!data.length || max <= 0) return "";
  const stepX = data.length > 1 ? width / (data.length - 1) : width;
  return data
    .map((v, i) => {
      const x = i * stepX;
      const y = height - (v / max) * height;
      return `${i === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");
};

const SparkLine = ({ seriesA, seriesB, seriesC }) => {
  const width = 620;
  const height = 180;
  const max = Math.max(1, ...seriesA, ...seriesB, ...seriesC);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center gap-4 text-xs">
        <span className="inline-flex items-center gap-2 text-indigo-600">
          <span className="h-2 w-2 rounded-full bg-indigo-500" /> Applied
        </span>
        <span className="inline-flex items-center gap-2 text-cyan-600">
          <span className="h-2 w-2 rounded-full bg-cyan-500" /> Interview Stage
        </span>
        <span className="inline-flex items-center gap-2 text-emerald-600">
          <span className="h-2 w-2 rounded-full bg-emerald-500" /> Hired
        </span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[220px] w-full">
        <path d={linePath(seriesA, width, height, max)} fill="none" stroke="#6366f1" strokeWidth="3" />
        <path d={linePath(seriesB, width, height, max)} fill="none" stroke="#06b6d4" strokeWidth="3" />
        <path d={linePath(seriesC, width, height, max)} fill="none" stroke="#10b981" strokeWidth="3" />
      </svg>
    </div>
  );
};

const GroupedBars = ({ months }) => {
  const max = Math.max(
    1,
    ...months.map((m) => Math.max(m.applied, m.interviewed, m.hired, m.rejected))
  );

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="space-y-3">
        {months.map((m) => (
          <div key={m.key}>
            <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
              <span>{m.label}</span>
              <span>A:{m.applied} I:{m.interviewed} H:{m.hired} R:{m.rejected}</span>
            </div>
            <div className="grid grid-cols-4 gap-1">
              <div className="h-2 rounded bg-indigo-200">
                <div className="h-2 rounded bg-indigo-500" style={{ width: `${(m.applied / max) * 100}%` }} />
              </div>
              <div className="h-2 rounded bg-cyan-200">
                <div className="h-2 rounded bg-cyan-500" style={{ width: `${(m.interviewed / max) * 100}%` }} />
              </div>
              <div className="h-2 rounded bg-emerald-200">
                <div className="h-2 rounded bg-emerald-500" style={{ width: `${(m.hired / max) * 100}%` }} />
              </div>
              <div className="h-2 rounded bg-rose-200">
                <div className="h-2 rounded bg-rose-500" style={{ width: `${(m.rejected / max) * 100}%` }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const FunnelChart = ({ totals, mode = "count" }) => {
  const stages = [
    { key: "applied", label: "Applied", color: "from-indigo-500 to-indigo-600" },
    { key: "reviewed", label: "Reviewed", color: "from-violet-500 to-violet-600" },
    { key: "interviewed", label: "Interviewed", color: "from-cyan-500 to-cyan-600" },
    { key: "offered", label: "Offered", color: "from-amber-500 to-amber-600" },
    { key: "hired", label: "Hired", color: "from-emerald-500 to-emerald-600" },
  ];

  const applied = Number(totals?.applied || 0);
  const values = stages.map((stage) => {
    const raw = Number(totals?.[stage.key] || 0);
    if (mode === "percent") {
      return stage.key === "applied" ? 100 : applied > 0 ? (raw / applied) * 100 : 0;
    }
    return raw;
  });
  const maxValue = Math.max(1, ...values);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <p className="text-lg font-semibold text-gray-900">Hiring Funnel</p>
      <p className="text-xs text-gray-500">Applied → Reviewed → Interviewed → Offered → Hired</p>
      <div className="mt-4 space-y-3">
        {stages.map((stage, index) => {
          const raw = Number(totals?.[stage.key] || 0);
          const value = values[index];
          const width = Math.max(12, Math.round((value / maxValue) * 100));
          return (
            <div key={stage.key}>
              <div className="mb-1 flex items-center justify-between text-xs text-gray-600">
                <span>{stage.label}</span>
                <span className="font-semibold text-gray-900">
                  {mode === "percent"
                    ? `${Number(value).toFixed(stage.key === "applied" ? 0 : 1)}% (${raw})`
                    : raw}
                </span>
              </div>
              <div className="h-8 rounded-lg bg-slate-100 p-1">
                <div
                  className={`h-full rounded-md bg-gradient-to-r ${stage.color}`}
                  style={{ width: `${width}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const StatusDonut = ({ totals }) => {
  const entries = Object.entries(totals).filter(([, v]) => v > 0);
  const total = entries.reduce((sum, [, v]) => sum + v, 0) || 1;

  let acc = 0;
  const segments = entries.map(([k, v]) => {
    const start = (acc / total) * 100;
    acc += v;
    const end = (acc / total) * 100;
    return `${statusColor[k] || "#94a3b8"} ${start}% ${end}%`;
  });

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <p className="text-sm font-semibold text-gray-800">Application Status Mix</p>
      <div className="mt-4 flex items-center gap-4">
        <div
          className="h-32 w-32 rounded-full border border-gray-100"
          style={{ background: `conic-gradient(${segments.join(",") || "#e5e7eb 0% 100%"})` }}
        />
        <div className="space-y-2 text-xs">
          {Object.entries(totals).map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-6">
              <span className="inline-flex items-center gap-2 capitalize text-gray-600">
                <span className="h-2 w-2 rounded-full" style={{ background: statusColor[k] || "#94a3b8" }} />
                {k}
              </span>
              <span className="font-semibold text-gray-900">{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const Home = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [health, setHealth] = useState({
    status: "unknown",
    service: "Backend",
    version: "-",
    timestamp: null,
    aiEnabled: false,
    aiUrl: "",
  });

  const [users, setUsers] = useState([]);
  const [applications, setApplications] = useState([]);
  const [jobPostings, setJobPostings] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [companyRequests, setCompanyRequests] = useState([]);
  const [cvRequests, setCvRequests] = useState([]);
  const [cvs, setCvs] = useState([]);
  const [marketHealth, setMarketHealth] = useState(null);
  const [rangeMonths, setRangeMonths] = useState(12);
  const [funnelMode, setFunnelMode] = useState("count");

  const fetchAllStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const requests = [
        axiosInstance.get("/admin/users").catch(() => ({ data: [] })),
        axiosInstance.get("/admin/applications").catch(() => ({ data: [] })),
        axiosInstance.get("/admin/job-postings").catch(() => ({ data: [] })),
        axiosInstance.get("/admin/company-requests").catch(() => ({ data: [] })),
        axiosInstance.get("/companies/admin/all").catch(() => ({ data: [] })),
        axiosInstance.get("/admin/headhunt-requests").catch(() => ({ data: [] })),
        axiosInstance.get("/admin/cvs").catch(() => ({ data: [] })),
        axiosInstance.get("/admin/market-health").catch(() => ({ data: null })),
      ];

      const [
        usersRes,
        applicationsRes,
        jobPostingsRes,
        companyReqsRes,
        companiesRes,
        cvRequestsRes,
        cvsRes,
        marketHealthRes,
      ] = await Promise.all(requests);

      setUsers(safeArray(extractData(usersRes)));
      setApplications(normalizeApplications(extractData(applicationsRes)));
      setJobPostings(safeArray(extractData(jobPostingsRes)));
      setCompanyRequests(safeArray(extractData(companyReqsRes)));
      setCompanies(safeArray(extractData(companiesRes)));
      setCvRequests(safeArray(extractData(cvRequestsRes)));
      setCvs(safeArray(extractData(cvsRes)));
      setMarketHealth(extractData(marketHealthRes) || null);

      const healthRes = await axiosInstance.get("/health").catch(() => null);
      const healthPayload = extractData(healthRes) || healthRes?.data || {};
      setHealth({
        status: healthPayload.status || "unknown",
        service: healthPayload.service || "Backend",
        version: healthPayload.version || "-",
        timestamp: healthPayload.timestamp || null,
        aiEnabled: healthPayload.ai_service_enabled || false,
        aiUrl: healthPayload.ai_service_url || "",
      });
    } catch (err) {
      console.error("Error loading home dashboard:", err);
      setError("Failed to load dashboard analytics. Please refresh.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllStats();
  }, []);

  const monthsBase = useMemo(() => getLastMonths(rangeMonths), [rangeMonths]);

  const monthlyPipeline = useMemo(() => {
    const map = new Map(
      monthsBase.map((m) => [
        m.key,
        {
          ...m,
          applied: 0,
          reviewed: 0,
          interviewed: 0,
          offered: 0,
          hired: 0,
          rejected: 0,
        },
      ])
    );

    for (const app of applications) {
      const key = monthKeyFromDate(app?.submitted_at);
      if (!key || !map.has(key)) continue;
      const row = map.get(key);
      row.applied += 1;
      if (app.status === "reviewed") row.reviewed += 1;
      if (app.status === "shortlisted" || app.status === "accepted") row.interviewed += 1;
      if (app.status === "accepted") row.offered += 1;
      if (app.status === "hired") row.hired += 1;
      if (app.status === "rejected") row.rejected += 1;
    }

    return Array.from(map.values());
  }, [applications, monthsBase]);

  const statusTotals = useMemo(() => {
    const totals = {
      pending: 0,
      reviewed: 0,
      shortlisted: 0,
      accepted: 0,
      hired: 0,
      rejected: 0,
    };
    for (const app of applications) {
      if (totals[app.status] !== undefined) totals[app.status] += 1;
      else totals.pending += 1;
    }
    return totals;
  }, [applications]);

  const topRoles = useMemo(() => {
    const roleMap = new Map();
    for (const app of applications) {
      const role = app?.JobPosting?.title || "Untitled Role";
      const current = roleMap.get(role) || { role, applied: 0, hired: 0 };
      current.applied += 1;
      if (app.status === "hired") current.hired += 1;
      roleMap.set(role, current);
    }
    return Array.from(roleMap.values())
      .sort((a, b) => b.applied - a.applied)
      .slice(0, 6);
  }, [applications]);

  const kpis = useMemo(() => {
    const totalApplications = applications.length;
    const interviewed = statusTotals.shortlisted + statusTotals.accepted;
    const hired = statusTotals.hired;
    const reviewed = statusTotals.reviewed;
    const interviewRate = totalApplications ? (interviewed / totalApplications) * 100 : 0;
    const hireRate = totalApplications ? (hired / totalApplications) * 100 : 0;
    const reviewedRate = totalApplications ? (reviewed / totalApplications) * 100 : 0;

    return {
      totalUsers: users.length,
      totalCompanies: companies.length,
      totalJobPostings: jobPostings.length,
      totalApplications,
      totalCVs: cvs.length,
      totalCVRequests: cvRequests.length,
      pendingCompanyRequests: companyRequests.filter((r) => String(r?.status || "").toLowerCase() === "pending").length,
      interviewed,
      hired,
      interviewRate,
      hireRate,
      reviewedRate,
    };
  }, [applications, users, companies, jobPostings, cvs, cvRequests, companyRequests, statusTotals]);

  const trendSeries = useMemo(() => ({
    applied: monthlyPipeline.map((m) => m.applied),
    interviewed: monthlyPipeline.map((m) => m.interviewed),
    hired: monthlyPipeline.map((m) => m.hired),
  }), [monthlyPipeline]);

  const funnelTotals = useMemo(
    () =>
      monthlyPipeline.reduce(
        (acc, m) => {
          acc.applied += m.applied;
          acc.reviewed += m.reviewed;
          acc.interviewed += m.interviewed;
          acc.offered += m.offered;
          acc.hired += m.hired;
          return acc;
        },
        { applied: 0, reviewed: 0, interviewed: 0, offered: 0, hired: 0 }
      ),
    [monthlyPipeline]
  );

  const maxRoleApplied = Math.max(1, ...topRoles.map((r) => r.applied));

  return (
    <div className="mt-24 space-y-6 px-2 md:px-0">
      <div className="relative mx-2 overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-900 to-slate-900 p-8 text-white shadow-xl md:mx-10">
        <div className="absolute -left-24 -top-20 h-56 w-56 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="absolute -right-16 -bottom-16 h-52 w-52 rounded-full bg-violet-400/20 blur-3xl" />

        <div className="relative z-10 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-indigo-100">
              Admin
            </span>
            <h1 className="mt-4 text-2xl font-bold leading-tight text-white md:text-3xl">
              Talent Operations Command Center
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-indigo-100/90">
              Live hiring intelligence, conversion visibility, and real-time execution controls.
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-indigo-100">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5">
                <FiActivity /> Live hiring intelligence
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5">
                <FiTrendingUp /> Monthly funnel and conversion trends
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5">
                <FiClock /> Last check: {health.timestamp ? new Date(health.timestamp).toLocaleString() : "-"}
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-md">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-100/90">
              Control Panel
            </p>
            <div className="mt-3 space-y-3">
              <button
                type="button"
                onClick={fetchAllStats}
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 hover:bg-indigo-50 disabled:opacity-60"
              >
                <FiRefreshCw className={loading ? "animate-spin" : ""} /> {loading ? "Refreshing" : "Refresh Data"}
              </button>
              <div className="grid grid-cols-3 gap-2">
                {[3, 6, 12].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRangeMonths(r)}
                    className={`rounded-lg px-2 py-2 text-[11px] font-semibold transition ${
                      rangeMonths === r
                        ? "bg-white text-slate-900"
                        : "border border-white/15 bg-white/5 text-indigo-100 hover:bg-white/15"
                    }`}
                  >
                    Last {r}M
                  </button>
                ))}
              </div>
              <div className="rounded-lg border border-white/15 bg-black/10 px-3 py-2 text-xs text-indigo-100/90">
                Active window: <span className="font-semibold text-white">Last {rangeMonths} months</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mx-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 md:mx-10">
          {error}
        </div>
      )}

      <div className="mx-2 grid grid-cols-1 gap-4 md:mx-10 md:grid-cols-2 xl:grid-cols-6">
        {[
          { label: "Job Seekers", value: kpis.totalUsers, icon: <FiUsers /> },
          { label: "Companies", value: kpis.totalCompanies, icon: <FiBriefcase /> },
          { label: "Total Applications", value: kpis.totalApplications, icon: <FiBarChart2 /> },
          { label: "Interview Stage", value: kpis.interviewed, icon: <FiActivity /> },
          { label: "Hired", value: kpis.hired, icon: <FiCheckCircle /> },
          { label: "Hire Rate", value: toPercent(kpis.hireRate), icon: <FiTrendingUp /> },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center justify-between text-gray-500">
              <span className="text-xs uppercase tracking-wide">{card.label}</span>
              <span>{card.icon}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{loading ? "..." : card.value}</p>
          </div>
        ))}
      </div>

      <div className="mx-2 grid grid-cols-1 gap-6 md:mx-10 xl:grid-cols-4">
        <div className="xl:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Monthly Talent Funnel Trend</h3>
            <p className="text-xs text-gray-500">Applied vs Interview Stage vs Hired</p>
          </div>
          <SparkLine
            seriesA={trendSeries.applied}
            seriesB={trendSeries.interviewed}
            seriesC={trendSeries.hired}
          />
        </div>
        <StatusDonut totals={statusTotals} />
        <div className="space-y-2">
          <div className="flex justify-end">
            <div className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1">
              {[
                { id: "count", label: "Count" },
                { id: "percent", label: "Conversion %" },
              ].map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setFunnelMode(option.id)}
                  className={`rounded-md px-2 py-1 text-[11px] font-semibold transition ${
                    funnelMode === option.id
                      ? "bg-indigo-600 text-white"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <FunnelChart totals={funnelTotals} mode={funnelMode} />
        </div>
      </div>

      <div className="mx-2 grid grid-cols-1 gap-6 md:mx-10 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Monthly Outcomes (Hired / Interviewed / Rejected)</h3>
            <p className="text-xs text-gray-500">Last {rangeMonths} months</p>
          </div>
          <GroupedBars months={monthlyPipeline} />
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-gray-800">Conversion Snapshot</h3>
            <div className="mt-3 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Reviewed Rate</span>
                <span className="font-semibold text-gray-900">{toPercent(kpis.reviewedRate)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Interview Rate</span>
                <span className="font-semibold text-gray-900">{toPercent(kpis.interviewRate)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Hire Rate</span>
                <span className="font-semibold text-gray-900">{toPercent(kpis.hireRate)}</span>
              </div>
              <div className="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-gray-600">
                Open Jobs: <span className="font-semibold text-gray-900">{kpis.totalJobPostings}</span>
                <br />
                CV Library: <span className="font-semibold text-gray-900">{kpis.totalCVs}</span>
                <br />
                Headhunt Requests: <span className="font-semibold text-gray-900">{kpis.totalCVRequests}</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-gray-800">System Health</h3>
            <div className="mt-3 space-y-2 text-xs text-gray-600">
              <div className="flex justify-between"><span>Status</span><span className="font-semibold capitalize text-gray-900">{health.status}</span></div>
              <div className="flex justify-between"><span>Service</span><span className="font-semibold text-gray-900">{health.service}</span></div>
              <div className="flex justify-between"><span>Version</span><span className="font-semibold text-gray-900">{health.version}</span></div>
              <div className="flex justify-between"><span>AI</span><span className={`font-semibold ${health.aiEnabled ? "text-emerald-600" : "text-gray-400"}`}>{health.aiEnabled ? "Enabled" : "Disabled"}</span></div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-2 grid grid-cols-1 gap-6 md:mx-10 xl:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 xl:col-span-1">
          <h3 className="text-lg font-semibold text-gray-900">Top Roles by Applicants</h3>
          <div className="mt-4 space-y-3">
            {topRoles.length === 0 && <p className="text-sm text-gray-500">No role activity yet.</p>}
            {topRoles.map((role) => (
              <div key={role.role}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-medium text-gray-700">{role.role}</span>
                  <span className="text-gray-500">{role.applied} apps / {role.hired} hired</span>
                </div>
                <div className="h-2 rounded bg-indigo-100">
                  <div className="h-2 rounded bg-indigo-500" style={{ width: `${(role.applied / maxRoleApplied) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 xl:col-span-2">
          <h3 className="text-lg font-semibold text-gray-900">Talent Quality & Skills Intelligence</h3>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500">ATS Trend (Last 6 Months)</p>
              <div className="mt-2 space-y-2">
                {safeArray(marketHealth?.ats_quality_trend).length === 0 && (
                  <p className="text-sm text-gray-500">No ATS trend available.</p>
                )}
                {safeArray(marketHealth?.ats_quality_trend).map((row) => (
                  <div key={row.month} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{row.month}</span>
                    <span className="font-semibold text-gray-900">{row.average_ats_score}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500">Top Skill Demand</p>
              <div className="mt-2 space-y-2">
                {safeArray(marketHealth?.top_skills).length === 0 && (
                  <p className="text-sm text-gray-500">No skills data available.</p>
                )}
                {safeArray(marketHealth?.top_skills).slice(0, 8).map((skill) => (
                  <div key={skill.skill} className="flex items-center justify-between rounded-md bg-white px-2 py-1 text-xs">
                    <span className="font-medium text-gray-700">{skill.skill}</span>
                    <span className="rounded-full bg-indigo-100 px-2 py-0.5 font-semibold text-indigo-700">{skill.demand}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-lg bg-emerald-50 p-3 text-sm">
              <p className="text-xs text-emerald-700">Avg ATS Overall</p>
              <p className="text-xl font-semibold text-emerald-900">{marketHealth?.kpis?.avg_ats_score_overall ?? "-"}</p>
            </div>
            <div className="rounded-lg bg-cyan-50 p-3 text-sm">
              <p className="text-xs text-cyan-700">High Match Success</p>
              <p className="text-xl font-semibold text-cyan-900">{marketHealth?.kpis?.match_success_rate ?? "-"}%</p>
            </div>
            <div className="rounded-lg bg-violet-50 p-3 text-sm">
              <p className="text-xs text-violet-700">Job Velocity</p>
              <p className="text-xl font-semibold text-violet-900">{marketHealth?.kpis?.total_job_velocity_days ?? "-"} days</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-2 rounded-2xl border border-gray-200 bg-white p-5 md:mx-10">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Monthly Hiring Table</h3>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700">Last {rangeMonths}M</span>
            <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-cyan-500" /> Interviewed</span>
            <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Hired</span>
            <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-500" /> Rejected</span>
          </div>
        </div>
        <div className="overflow-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b text-xs uppercase tracking-wide text-gray-500">
                <th className="py-2">Month</th>
                <th className="py-2">Applied</th>
                <th className="py-2">Interviewed</th>
                <th className="py-2">Hired</th>
                <th className="py-2">Rejected</th>
                <th className="py-2">Interview Rate</th>
                <th className="py-2">Hire Rate</th>
              </tr>
            </thead>
            <tbody>
              {monthlyPipeline.map((m) => (
                <tr key={m.key} className="border-b last:border-b-0">
                  <td className="py-2 font-semibold text-gray-800">{m.label}</td>
                  <td className="py-2 text-gray-700">{m.applied}</td>
                  <td className="py-2 text-cyan-700">{m.interviewed}</td>
                  <td className="py-2 text-emerald-700">{m.hired}</td>
                  <td className="py-2 text-rose-700">{m.rejected}</td>
                  <td className="py-2 text-gray-700">{toPercent(m.applied ? (m.interviewed / m.applied) * 100 : 0)}</td>
                  <td className="py-2 text-gray-700">{toPercent(m.applied ? (m.hired / m.applied) * 100 : 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mx-2 mb-8 flex flex-wrap gap-3 md:mx-10">
        <Link to="/applications" className="rounded-lg border border-indigo-300 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100">
          Open Applications
        </Link>
        <Link to="/job-postings" className="rounded-lg border border-cyan-300 bg-cyan-50 px-4 py-2 text-sm font-semibold text-cyan-700 hover:bg-cyan-100">
          Open Job Postings
        </Link>
        <Link to="/company-requests" className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-100">
          Pending Company Requests ({kpis.pendingCompanyRequests})
        </Link>
      </div>
    </div>
  );
};

export default Home;
