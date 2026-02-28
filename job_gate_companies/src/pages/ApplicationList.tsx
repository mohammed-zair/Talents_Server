import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Card from "../components/shared/Card";
import SectionHeader from "../components/shared/SectionHeader";
import Button from "../components/shared/Button";
import Skeleton from "../components/shared/Skeleton";
import { useLanguage } from "../contexts/LanguageContext";
import { companyApi } from "../services/api/api";
import type { ApplicationItem } from "../types";

const getApiBaseUrl = () =>
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000/api";

const statusLabel = (status: ApplicationItem["status"], language: "en" | "ar") => {
  const map = {
    pending: { en: "Pending", ar: "Ù‚ÙŠØ¯ Ø§Ù„Ù…Ø±Ø§Ø¬Ø¹Ø©" },
    reviewed: { en: "Reviewed", ar: "ØªÙ…Øª Ø§Ù„Ù…Ø±Ø§Ø¬Ø¹Ø©" },
    shortlisted: { en: "Shortlisted", ar: "Ù‚Ø§Ø¦Ù…Ø© Ù…Ø®ØªØµØ±Ø©" },
    accepted: { en: "Accepted", ar: "Ù…Ù‚Ø¨ÙˆÙ„" },
    hired: { en: "Hired", ar: "ØªÙ… Ø§Ù„ØªÙˆØ¸ÙŠÙ" },
    rejected: { en: "Rejected", ar: "Ù…Ø±ÙÙˆØ¶" },
  };
  return map[status]?.[language] ?? status;
};

const ApplicationList: React.FC = () => {
  const { language } = useLanguage();
  const apiBase = getApiBaseUrl();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [atsMin, setAtsMin] = useState("");
  const [atsMax, setAtsMax] = useState("");
  const [experienceMin, setExperienceMin] = useState("");
  const [experienceMax, setExperienceMax] = useState("");
  const [skills, setSkills] = useState("");
  const [education, setEducation] = useState("");
  const [location, setLocation] = useState("");
  const [strengths, setStrengths] = useState("");
  const [weaknesses, setWeaknesses] = useState("");
  const [starredOnly, setStarredOnly] = useState(false);
  const [sortMode, setSortMode] = useState<"recent" | "ai" | "experience">("ai");

  const filters = useMemo(() => {
    const parseNumber = (value: string) => {
      const num = Number(value);
      return Number.isNaN(num) ? undefined : num;
    };
    return {
      search: query.trim() || undefined,
      ats_min: parseNumber(atsMin),
      ats_max: parseNumber(atsMax),
      experience_min: parseNumber(experienceMin),
      experience_max: parseNumber(experienceMax),
      skills: skills
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      education: education.trim() || undefined,
      location: location.trim() || undefined,
      strengths: strengths
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      weaknesses: weaknesses
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      starred: starredOnly ? true : undefined,
    };
  }, [
    atsMax,
    atsMin,
    education,
    experienceMax,
    experienceMin,
    location,
    query,
    skills,
    strengths,
    weaknesses,
    starredOnly,
  ]);

  const { data: applications = [], isLoading } = useQuery({
    queryKey: ["company-applications", filters],
    queryFn: () => companyApi.getApplications(filters),
  });

  const enriched = useMemo(() => {
    const skillFilter = filters.skills ?? [];
    return applications.map((item) => {
      const skills = item.candidate_skills ?? [];
      const matchCount = skillFilter.length
        ? skillFilter.filter((q) =>
            skills.some((skill) => String(skill).toLowerCase().includes(q.toLowerCase()))
          ).length
        : 0;
      const tags: string[] = [];
      const ranking = item.ai_insights?.industry_ranking_label;
      if (ranking) tags.push(ranking);
      const strengths =
        item.ai_insights?.ai_intelligence?.strategic_analysis?.strengths || [];
      strengths.slice(0, 2).forEach((s) => tags.push(s));
      return {
        ...item,
        _skillMatchCount: matchCount,
        _tags: tags,
      };
    });
  }, [applications, filters.skills]);

  const sorted = useMemo(() => {
    const skillFilter = (filters.skills ?? []).length > 0;
    const hasExperienceFilter =
      typeof filters.experience_min === "number" || typeof filters.experience_max === "number";
    const hasAtsFilter = typeof filters.ats_min === "number" || typeof filters.ats_max === "number";
    const effectiveSort = skillFilter
      ? "skills"
      : hasExperienceFilter
      ? "experience"
      : hasAtsFilter
      ? "ai"
      : sortMode;

    return [...enriched].sort((a, b) => {
      if (effectiveSort === "skills") {
        if (b._skillMatchCount !== a._skillMatchCount) {
          return b._skillMatchCount - a._skillMatchCount;
        }
        return (b.ai_score ?? 0) - (a.ai_score ?? 0);
      }
      if (effectiveSort === "experience") {
        if ((b.candidate_experience_years ?? 0) !== (a.candidate_experience_years ?? 0)) {
          return (b.candidate_experience_years ?? 0) - (a.candidate_experience_years ?? 0);
        }
        return (b.ai_score ?? 0) - (a.ai_score ?? 0);
      }
      if (effectiveSort === "ai") {
        return (b.ai_score ?? 0) - (a.ai_score ?? 0);
      }
      return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
    });
  }, [enriched, filters, sortMode]);

  const toggleStar = useMutation({
    mutationFn: ({ id, starred }: { id: string; starred?: boolean }) =>
      companyApi.toggleApplicationStar(id, starred),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-applications"] });
    },
  });

  const copy = {
    en: {
      eyebrow: "Applications",
      title: "HR-Curated Candidate Feed",
      subtitle: "Applications sent to your company are shown here in real time.",
      search: "Search candidate, job, or location",
      listTitle: "Incoming Applications",
      viewCv: "Open CV",
      total: "Total",
      pending: "Pending",
      reviewed: "Reviewed",
      empty: "No applications match your search.",
      appliedAt: "Applied",
      job: "Job",
    },
    ar: {
      eyebrow: "Ø§Ù„Ù…ØªÙ‚Ø¯Ù…ÙˆÙ†",
      title: "Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ù…ØªÙ‚Ø¯Ù…ÙŠÙ† Ø­Ø³Ø¨ Ø£ÙØ¶Ù„ ØªØ·Ø§Ø¨Ù‚",
      subtitle: "Ù†Ø¸Ø±Ø© Ø³Ø±ÙŠØ¹Ø© Ø¹Ù„Ù‰ Ø§Ù„Ù…Ø¤Ø´Ø±Ø§Øª ÙˆØ§Ù„ØªØ­Ù„ÙŠÙ„Ø§Øª Ø§Ù„Ø°ÙƒÙŠØ© Ù„Ù„Ù…Ø±Ø´Ø­ÙŠÙ†.",
      search: "Ø§Ø¨Ø­Ø« Ø¹Ù† Ù…ØªÙ‚Ø¯Ù… Ø£Ùˆ Ù…Ù‡Ø§Ø±Ø© Ø£Ùˆ Ù…ÙˆÙ‚Ø¹",
      listTitle: "Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ù…ØªÙ‚Ø¯Ù…ÙŠÙ†",
      viewCv: "Ø¹Ø±Ø¶ Ø§Ù„Ø³ÙŠØ±Ø©",
      total: "Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ",
      pending: "Ù‚ÙŠØ¯ Ø§Ù„Ù…Ø±Ø§Ø¬Ø¹Ø©",
      reviewed: "ØªÙ…Øª Ø§Ù„Ù…Ø±Ø§Ø¬Ø¹Ø©",
      empty: "Ù„Ø§ ØªÙˆØ¬Ø¯ Ø·Ù„Ø¨Ø§Øª Ø¨Ø¹Ø¯.",
      appliedAt: "ØªØ§Ø±ÙŠØ® Ø§Ù„ØªÙ‚Ø¯ÙŠÙ…",
      job: "Ø§Ù„ÙˆØ¸ÙŠÙØ©",
    },
  }[language];

  const stats = useMemo(() => {
    const total = applications.length;
    const pending = applications.filter((c) => c.status === "pending").length;
    const reviewed = applications.filter((c) => c.status === "reviewed").length;
    const shortlisted = applications.filter((c) => c.status === "shortlisted").length;
    const hired = applications.filter((c) => c.status === "hired").length;
    return { total, pending, reviewed, shortlisted, hired };
  }, [applications]);

  const histogram = useMemo(() => {
    const bins = Array.from({ length: 10 }, (_, idx) => ({
      label: `${idx * 10}-${idx * 10 + 9}`,
      count: 0,
    }));
    applications.forEach((item) => {
      const score = item.ai_score;
      if (typeof score !== "number") return;
      const bucket = Math.min(9, Math.max(0, Math.floor(score / 10)));
      bins[bucket].count += 1;
    });
    const maxCount = Math.max(1, ...bins.map((b) => b.count));
    return { bins, maxCount };
  }, [applications]);

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow={copy.eyebrow}
        title={copy.title}
        subtitle={copy.subtitle}
        action={
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={copy.search}
            className="w-72 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] px-4 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
          />
        }
      />

      <Card>
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-[var(--text-primary)]">{copy.listTitle}</p>
          <span className="text-xs text-[var(--text-muted)]">
            {language === "ar" ? "Ù…Ø±ØªÙ‘Ø¨ Ø­Ø³Ø¨ Ø§Ù„Ø£Ø­Ø¯Ø«" : "Sorted by latest"}
          </span>
        </div>

        <div className="mt-4 grid gap-3 rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)]/60 p-4 md:grid-cols-3">
          <input
            value={atsMin}
            onChange={(event) => setAtsMin(event.target.value)}
            placeholder={language === "ar" ? "Ø§Ù„Ø­Ø¯ Ø§Ù„Ø£Ø¯Ù†Ù‰ Ù„Ù„Ø¯Ø±Ø¬Ø©" : "ATS min score"}
            className="rounded-xl border border-[var(--panel-border)] bg-transparent px-3 py-2 text-xs text-[var(--text-primary)]"
          />
          <input
            value={atsMax}
            onChange={(event) => setAtsMax(event.target.value)}
            placeholder={language === "ar" ? "Ø§Ù„Ø­Ø¯ Ø§Ù„Ø£Ø¹Ù„Ù‰ Ù„Ù„Ø¯Ø±Ø¬Ø©" : "ATS max score"}
            className="rounded-xl border border-[var(--panel-border)] bg-transparent px-3 py-2 text-xs text-[var(--text-primary)]"
          />
          <input
            value={skills}
            onChange={(event) => setSkills(event.target.value)}
            placeholder={language === "ar" ? "Ù…Ù‡Ø§Ø±Ø§Øª (React, Node)" : "Skills (React, Node)"}
            className="rounded-xl border border-[var(--panel-border)] bg-transparent px-3 py-2 text-xs text-[var(--text-primary)]"
          />
          <input
            value={experienceMin}
            onChange={(event) => setExperienceMin(event.target.value)}
            placeholder={language === "ar" ? "Ø®Ø¨Ø±Ø© (Ø­Ø¯ Ø£Ø¯Ù†Ù‰)" : "Experience min (years)"}
            className="rounded-xl border border-[var(--panel-border)] bg-transparent px-3 py-2 text-xs text-[var(--text-primary)]"
          />
          <input
            value={experienceMax}
            onChange={(event) => setExperienceMax(event.target.value)}
            placeholder={language === "ar" ? "Ø®Ø¨Ø±Ø© (Ø­Ø¯ Ø£Ø¹Ù„Ù‰)" : "Experience max (years)"}
            className="rounded-xl border border-[var(--panel-border)] bg-transparent px-3 py-2 text-xs text-[var(--text-primary)]"
          />
          <input
            value={education}
            onChange={(event) => setEducation(event.target.value)}
            placeholder={language === "ar" ? "Ø§Ù„Ù…Ø³ØªÙˆÙ‰ Ø§Ù„ØªØ¹Ù„ÙŠÙ…ÙŠ" : "Education level"}
            className="rounded-xl border border-[var(--panel-border)] bg-transparent px-3 py-2 text-xs text-[var(--text-primary)]"
          />
          <input
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            placeholder={language === "ar" ? "Ø§Ù„Ù…ÙˆÙ‚Ø¹" : "Location"}
            className="rounded-xl border border-[var(--panel-border)] bg-transparent px-3 py-2 text-xs text-[var(--text-primary)]"
          />
          <input
            value={strengths}
            onChange={(event) => setStrengths(event.target.value)}
            placeholder={language === "ar" ? "Ù†Ù‚Ø§Ø· Ø§Ù„Ù‚ÙˆØ©" : "AI strengths keywords"}
            className="rounded-xl border border-[var(--panel-border)] bg-transparent px-3 py-2 text-xs text-[var(--text-primary)]"
          />
          <input
            value={weaknesses}
            onChange={(event) => setWeaknesses(event.target.value)}
            placeholder={language === "ar" ? "Ù†Ù‚Ø§Ø· Ø§Ù„Ø¶Ø¹Ù" : "AI weaknesses keywords"}
            className="rounded-xl border border-[var(--panel-border)] bg-transparent px-3 py-2 text-xs text-[var(--text-primary)]"
          />
          <label className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
            <input
              type="checkbox"
              checked={starredOnly}
              onChange={(event) => setStarredOnly(event.target.checked)}
            />
            {language === "ar" ? "Ø§Ù„Ù…ÙØ¶Ù„ÙŠÙ† ÙÙ‚Ø·" : "Starred only"}
          </label>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--text-muted)]">
          <div className="flex items-center gap-2">
            <span>{language === "ar" ? "ØªØ±ØªÙŠØ¨ Ø§Ù„Ù†ØªØ§Ø¦Ø¬" : "Sort results"}</span>
            <select
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value as "recent" | "ai" | "experience")}
              className="rounded-lg border border-[var(--panel-border)] bg-transparent px-2 py-1 text-xs text-[var(--text-primary)]"
            >
              <option value="ai">{language === "ar" ? "Ø£ÙˆÙ„ÙˆÙŠØ© Ø§Ù„Ø°ÙƒØ§Ø¡" : "AI Priority"}</option>
              <option value="recent">{language === "ar" ? "Ø§Ù„Ø£Ø­Ø¯Ø«" : "Most recent"}</option>
            </select>
          </div>
          <span>
            {language === "ar"
              ? "Ø§Ù„ÙØ±Ø² ÙŠØªÙƒÙŠÙ Ù…Ø¹ Ø§Ù„ÙÙ„Ø§ØªØ± ØªÙ„Ù‚Ø§Ø¦ÙŠØ§Ù‹"
              : "Sorting adapts automatically to active filters"}
          </span>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)]/70 p-4 shadow-soft-ambient">
            <p className="text-xs text-[var(--text-muted)]">{copy.total}</p>
            <p className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{stats.total}</p>
          </div>
          <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)]/70 p-4 shadow-soft-ambient">
            <p className="text-xs text-[var(--text-muted)]">{copy.pending}</p>
            <p className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{stats.pending}</p>
          </div>
          <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)]/70 p-4 shadow-soft-ambient">
            <p className="text-xs text-[var(--text-muted)]">{copy.reviewed}</p>
            <p className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{stats.reviewed}</p>
          </div>
          <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)]/70 p-4 shadow-soft-ambient">
            <p className="text-xs text-[var(--text-muted)]">
              {language === "ar" ? "Ù‚Ø§Ø¦Ù…Ø© Ù…Ø®ØªØµØ±Ø©" : "Shortlisted"}
            </p>
            <p className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{stats.shortlisted}</p>
          </div>
          <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)]/70 p-4 shadow-soft-ambient">
            <p className="text-xs text-[var(--text-muted)]">
              {language === "ar" ? "ØªÙ… Ø§Ù„ØªÙˆØ¸ÙŠÙ" : "Hired"}
            </p>
            <p className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{stats.hired}</p>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)]/60 p-4">
          <p className="text-xs text-[var(--text-muted)]">
            {language === "ar" ? "ØªÙˆØ²ÙŠØ¹ Ø¯Ø±Ø¬Ø§Øª Ø§Ù„Ø°ÙƒØ§Ø¡" : "AI Score Distribution"}
          </p>
          <div className="mt-3 flex items-end gap-2">
            {histogram.bins.map((bin) => (
              <div key={bin.label} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-full bg-[var(--accent)]/70"
                  style={{ height: `${(bin.count / histogram.maxCount) * 60 + 8}px` }}
                />
                <span className="text-[10px] text-[var(--text-muted)]">{bin.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 max-h-[520px] space-y-4 overflow-y-auto pe-2">
          {isLoading ? (
            <>
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </>
          ) : sorted.length === 0 ? (
            <div className="rounded-xl border border-[var(--panel-border)] p-4 text-sm text-[var(--text-muted)]">
              {copy.empty}
            </div>
          ) : (
            sorted.map((application, index) => (
              <div
                key={application.id}
                className={`relative grid gap-4 rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)]/80 p-5 lg:grid-cols-[1.2fr_1fr] ${
                  index < 3 ? "shadow-[0_0_25px_var(--glow)]" : "shadow-soft-ambient"
                }`}
              >
                <div
                  className="absolute inset-y-4 start-0 w-1 rounded-full"
                  style={{
                    background:
                      application.status === "accepted"
                        ? "var(--accent)"
                        : application.status === "reviewed"
                        ? "var(--accent-strong)"
                        : "var(--text-muted)",
                  }}
                />
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-[var(--text-primary)]">
                        {application.candidate.name}
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {application.job.title}
                        {application.job.location ? ` - ${application.job.location}` : ""}
                      </p>
                    </div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-[var(--chip-bg)] px-3 py-1 text-xs font-semibold text-[var(--text-primary)]">
                      {statusLabel(application.status, language)}
                    </span>
                    <span className="rounded-full bg-[var(--panel-bg)] px-3 py-1 text-xs font-semibold text-[var(--text-primary)]">
                      {language === "ar" ? "Ø¯Ø±Ø¬Ø©" : "Score"}{" "}
                      {application.ai_score ?? "-"}
                    </span>
                    <button
                      type="button"
                        onClick={() =>
                          toggleStar.mutate({
                            id: application.id,
                            starred: !application.is_starred,
                          })
                        }
                        className={`rounded-full border px-2 py-1 text-xs ${
                          application.is_starred
                            ? "border-[var(--accent)] text-[var(--accent)]"
                            : "border-[var(--panel-border)] text-[var(--text-muted)]"
                        }`}
                      >
                        {application.is_starred
                          ? language === "ar"
                            ? "Ù…Ù…ÙŠØ²"
                            : "Starred"
                          : language === "ar"
                          ? "ØªÙ…ÙŠÙŠØ²"
                          : "Star"}
                      </button>
                  </div>
                </div>

                {application._tags?.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {application._tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-1 text-[11px] text-[var(--text-muted)]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}

                  <div className="mt-4 text-xs text-[var(--text-muted)]">
                    {copy.appliedAt}: {application.submittedAt
                      ? new Date(application.submittedAt).toLocaleDateString()
                      : "-"}
                  </div>
                </div>

                <div className="flex flex-col justify-between rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)]/60 p-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
                      {language === "ar" ? "Ù…Ù„Ù Ø§Ù„Ù…Ø±Ø´Ø­" : "Candidate File"}
                    </p>
                    <p className="mt-2 text-sm text-[var(--text-primary)]">
                      {application.candidate.email || application.candidate.phone || "-"}
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      {language === "ar" ? "Ø§Ù„Ø®Ø¨Ø±Ø©" : "Experience"}:{" "}
                      {application.candidate_experience_years ?? "-"}{" "}
                      {language === "ar" ? "Ø³Ù†ÙˆØ§Øª" : "years"}
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      {copy.job}: {application.job.title}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    className="mt-4 justify-center"
                    onClick={() => {
                      window.open(
                        `${apiBase}/companies/company/applications/${application.id}/cv`,
                        "_blank"
                      );
                    }}
                  >
                    {copy.viewCv}
                  </Button>
                  <Button
                    variant="outline"
                    className="mt-2 justify-center"
                    onClick={() => {
                      if (application.candidate.id) {
                        window.open(
                          `https://talents-we-trust.tech/profile/${application.candidate.id}`,
                          "_blank"
                        );
                      }
                    }}
                    disabled={!application.candidate.id}
                  >
                    {language === "ar" ? "Ø¹Ø±Ø¶ Ø§Ù„Ù…Ù„Ù" : "View profile"}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
};

export default ApplicationList;

