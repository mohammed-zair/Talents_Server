import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  FileSearch2,
  Download,
  Plus,
  X,
  Eye,
  Mail,
  Bell,
  UserRound,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import SectionHeader from "../components/shared/SectionHeader";
import Card from "../components/shared/Card";
import Button from "../components/shared/Button";
import Skeleton from "../components/shared/Skeleton";
import { companyApi } from "../services/api/api";
import type { CVRequest, CVRequestPipelineData } from "../types";
import { useLanguage } from "../contexts/LanguageContext";

const CVRequests: React.FC = () => {
  const queryClient = useQueryClient();
  const { language } = useLanguage();
  const { data, isLoading } = useQuery({
    queryKey: ["cv-requests"],
    queryFn: companyApi.getCvRequests,
  });

  const [openModal, setOpenModal] = useState(false);
  const [role, setRole] = useState("");
  const [skills, setSkills] = useState("");
  const [location, setLocation] = useState("");
  const [experience, setExperience] = useState<number | "">("");
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);

  const pipelineQuery = useQuery<CVRequestPipelineData>({
    queryKey: ["cv-request-pipeline", activeRequestId],
    queryFn: () => companyApi.getCvRequestPipeline(activeRequestId as string),
    enabled: Boolean(activeRequestId),
  });

  const createRequest = useMutation({
    mutationFn: companyApi.createCvRequest,
    onSuccess: () => {
      toast.success(language === "ar" ? "تم إرسال الطلب" : "CV request sent");
      queryClient.invalidateQueries({ queryKey: ["cv-requests"] });
      setOpenModal(false);
      setRole("");
      setSkills("");
      setLocation("");
      setExperience("");
    },
    onError: () =>
      toast.error(language === "ar" ? "تعذر إرسال الطلب" : "Failed to send CV request"),
  });

  const requests = data ?? [];
  const canSubmit = useMemo(() => role.trim().length >= 2, [role]);

  const statusTone = (status: string) => {
    if (["delivered", "closed"].includes(status)) return "bg-emerald-100 text-emerald-700";
    if (["processing", "processed", "approved"].includes(status)) return "bg-indigo-100 text-indigo-700";
    if (status === "rejected") return "bg-rose-100 text-rose-700";
    return "bg-amber-100 text-amber-700";
  };

  const copy = {
    en: {
      headerEyebrow: "CV Marketplace",
      headerTitle: "Headhunt Requests",
      headerSubtitle: "Track sourcing progress, shortlisted candidates, and HR updates.",
      newRequest: "New Request",
      viewPipeline: "View Pipeline",
      emptyTitle: "No requests yet",
      emptyBody: "Create your first request to start sourcing talent.",
      modalTitle: "Talent Request",
      modalHint: 'Example: "Senior Java Developer, 5 years, Riyadh"',
      modalRoleLabel: "Requested role",
      modalSkillsLabel: "Skills (comma separated)",
      modalLocationLabel: "Preferred location (optional)",
      modalExperienceLabel: "Experience years (optional)",
      modalCountLabel: "How many heads do you need?",
      modalCountHint: "Default is one focused headhunt candidate.",
      send: "Send Request",
      cancel: "Cancel",
      timeline: "Status Timeline",
      shortlist: "Shortlisted Candidates",
      whyCandidate: "Why this candidate",
      noCandidates: "No candidates have been shared yet.",
      updates: "Recent HR Updates",
      pushUpdates: "Push Updates",
      emailUpdates: "Email Updates",
      noUpdates: "No updates yet.",
      cvPower: "ATS",
      openCv: "Open CV",
      close: "Close",
      selected: "Selected",
      contacting: "Contacting",
      submitted: "Submitted",
      accepted: "Accepted",
      rejected: "Rejected",
      totalCandidates: "Total candidates",
      delivered: "Delivered",
    },
    ar: {
      headerEyebrow: "سوق السير الذاتية",
      headerTitle: "طلبات Headhunt",
      headerSubtitle: "تابع تقدم التوريد والمرشحين المختارين وتحديثات الموارد البشرية.",
      newRequest: "طلب جديد",
      viewPipeline: "عرض المسار",
      emptyTitle: "لا توجد طلبات بعد",
      emptyBody: "أنشئ أول طلب للبدء في البحث عن المواهب.",
      modalTitle: "طلب مواهب",
      modalHint: 'مثال: "مطور Java أول، 5 سنوات، الرياض"',
      modalRoleLabel: "المسمى المطلوب",
      modalSkillsLabel: "المهارات (مفصولة بفواصل)",
      modalLocationLabel: "الموقع المفضل (اختياري)",
      modalExperienceLabel: "سنوات الخبرة (اختياري)",
      modalCountLabel: "كم عدد الرؤوس المطلوبة؟",
      modalCountHint: "الافتراضي مرشح واحد كتركيز مباشر.",
      send: "إرسال الطلب",
      cancel: "إلغاء",
      timeline: "مخطط الحالة",
      shortlist: "المرشحون المختارون",
      whyCandidate: "لماذا هذا المرشح",
      noCandidates: "لم يتم مشاركة مرشحين حتى الآن.",
      updates: "آخر تحديثات الموارد البشرية",
      pushUpdates: "تحديثات Push",
      emailUpdates: "تحديثات البريد",
      noUpdates: "لا توجد تحديثات حتى الآن.",
      cvPower: "درجة ATS",
      openCv: "فتح السيرة",
      close: "إغلاق",
      selected: "مختار",
      contacting: "تواصل",
      submitted: "مُرسل للشركة",
      accepted: "مقبول",
      rejected: "مرفوض",
      totalCandidates: "إجمالي المرشحين",
      delivered: "تم التسليم",
    },
  }[language];

  const candidateStatusLabel: Record<string, string> = {
    selected: copy.selected,
    contacting: copy.contacting,
    submitted_to_company: copy.submitted,
    accepted_by_company: copy.accepted,
    rejected_by_company: copy.rejected,
  };

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow={copy.headerEyebrow}
        title={copy.headerTitle}
        subtitle={copy.headerSubtitle}
        action={
          <Button onClick={() => setOpenModal(true)}>
            <Plus size={14} className="me-2" />
            {copy.newRequest}
          </Button>
        }
      />

      <Card>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        ) : requests.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--panel-border)] bg-[var(--panel-bg)]/40 p-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--chip-bg)]">
              <FileSearch2 size={20} />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">{copy.emptyTitle}</h3>
            <p className="mt-2 text-sm text-[var(--text-muted)]">{copy.emptyBody}</p>
            <div className="mt-6">
              <Button onClick={() => setOpenModal(true)}>
                <Plus size={14} className="me-2" />
                {copy.newRequest}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((request: CVRequest) => (
              <div
                key={request.request_id ?? request.requested_role}
                className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{request.requested_role}</p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {request.cv_count} {language === "ar" ? "head" : "heads"} · {request.created_at ?? ""}
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      {(request.skills ?? []).join(", ")} {request.location ? `· ${request.location}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone(request.status)}`}>
                      {request.status}
                    </span>
                    <span className="rounded-full bg-[var(--chip-bg)] px-3 py-1 text-xs font-semibold text-[var(--text-primary)]">
                      {copy.totalCandidates}: {request.stats?.total_candidates ?? 0}
                    </span>
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                      {copy.delivered}: {request.stats?.delivered_count ?? 0}
                    </span>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button variant="outline" onClick={() => setActiveRequestId(String(request.request_id))}>
                    <Eye size={14} className="me-2" />
                    {copy.viewPipeline}
                  </Button>
                  {request.status === "delivered" && request.reportUrl && (
                    <Button variant="outline" onClick={() => window.open(request.reportUrl, "_blank") }>
                      <Download size={14} className="me-2" />
                      {language === "ar" ? "تنزيل التقرير" : "Download Report"}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {activeRequestId && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/55 p-6">
          <div className="mx-auto w-full max-w-6xl rounded-3xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-semibold text-[var(--text-primary)]">
                  {pipelineQuery.data?.request?.requested_role || "..."}
                </h3>
                <p className="text-xs text-[var(--text-muted)]">{copy.timeline}</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveRequestId(null)}
                className="rounded-full border border-[var(--panel-border)] p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X size={16} />
              </button>
            </div>

            {pipelineQuery.isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-20" />
                <Skeleton className="h-40" />
                <Skeleton className="h-40" />
              </div>
            ) : pipelineQuery.isError ? (
              <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">
                {language === "ar" ? "تعذر تحميل تفاصيل المسار" : "Failed to load pipeline details"}
              </div>
            ) : (
              <>
                <div className="grid gap-3 md:grid-cols-6">
                  <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--chip-bg)] p-3">
                    <p className="text-xs text-[var(--text-muted)]">{copy.totalCandidates}</p>
                    <p className="text-xl font-bold text-[var(--text-primary)]">{pipelineQuery.data?.stats?.total_candidates ?? 0}</p>
                  </div>
                  <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--chip-bg)] p-3">
                    <p className="text-xs text-[var(--text-muted)]">{copy.selected}</p>
                    <p className="text-xl font-bold text-[var(--text-primary)]">{pipelineQuery.data?.stats?.selected ?? 0}</p>
                  </div>
                  <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--chip-bg)] p-3">
                    <p className="text-xs text-[var(--text-muted)]">{copy.contacting}</p>
                    <p className="text-xl font-bold text-[var(--text-primary)]">{pipelineQuery.data?.stats?.contacting ?? 0}</p>
                  </div>
                  <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--chip-bg)] p-3">
                    <p className="text-xs text-[var(--text-muted)]">{copy.submitted}</p>
                    <p className="text-xl font-bold text-[var(--text-primary)]">{pipelineQuery.data?.stats?.submitted_to_company ?? 0}</p>
                  </div>
                  <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--chip-bg)] p-3">
                    <p className="text-xs text-[var(--text-muted)]">{copy.accepted}</p>
                    <p className="text-xl font-bold text-[var(--text-primary)]">{pipelineQuery.data?.stats?.accepted_by_company ?? 0}</p>
                  </div>
                  <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--chip-bg)] p-3">
                    <p className="text-xs text-[var(--text-muted)]">{copy.rejected}</p>
                    <p className="text-xl font-bold text-[var(--text-primary)]">{pipelineQuery.data?.stats?.rejected_by_company ?? 0}</p>
                  </div>
                </div>

                <div className="mt-5 grid gap-2 md:grid-cols-5">
                  {(pipelineQuery.data?.timeline || []).map((step) => (
                    <div
                      key={step.key}
                      className={`rounded-xl border px-3 py-2 text-center text-xs font-semibold ${
                        step.active
                          ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                          : "border-[var(--panel-border)] bg-[var(--chip-bg)] text-[var(--text-muted)]"
                      }`}
                    >
                      {step.active && <CheckCircle2 size={13} className="mx-auto mb-1" />}
                      {step.label}
                    </div>
                  ))}
                </div>

                <div className="mt-6">
                  <h4 className="mb-3 text-lg font-semibold text-[var(--text-primary)]">{copy.shortlist}</h4>
                  <div className="space-y-3">
                    {(pipelineQuery.data?.candidates || []).length === 0 ? (
                      <div className="rounded-xl border border-dashed border-[var(--panel-border)] p-5 text-sm text-[var(--text-muted)]">
                        {copy.noCandidates}
                      </div>
                    ) : (
                      (pipelineQuery.data?.candidates || []).map((candidate) => (
                        <div key={candidate.id} className="rounded-2xl border border-[var(--panel-border)] p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="text-base font-semibold text-[var(--text-primary)]">
                                <UserRound size={14} className="me-1 inline" />
                                {candidate.candidate.full_name}
                              </p>
                              <p className="text-xs text-[var(--text-muted)]">{candidate.candidate.email || "-"}</p>
                              <span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusTone(candidate.status)}`}>
                                {candidateStatusLabel[candidate.status] || candidate.status}
                              </span>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-[var(--text-muted)]">{copy.cvPower}</p>
                              <p className="text-lg font-bold text-[var(--text-primary)]">{candidate.cv?.ats_score ?? "-"}</p>
                              {candidate.cv?.file_url && (
                                <a
                                  href={candidate.cv.file_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="mt-1 inline-flex text-xs font-medium text-emerald-600 hover:text-emerald-500"
                                >
                                  {copy.openCv}
                                </a>
                              )}
                            </div>
                          </div>

                          <div className="mt-3 rounded-xl border border-indigo-200 bg-indigo-50 p-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
                              <Sparkles size={12} className="me-1 inline" />
                              {copy.whyCandidate}
                            </p>
                            <p className="mt-1 text-sm text-indigo-900">
                              {candidate.why_candidate || candidate.source_ai_snapshot?.summary?.toString() || "-"}
                            </p>
                          </div>

                          {candidate.notes && (
                            <p className="mt-2 text-xs text-[var(--text-muted)]">{candidate.notes}</p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="mt-6">
                  <h4 className="mb-3 text-lg font-semibold text-[var(--text-primary)]">{copy.updates}</h4>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-[var(--panel-border)] p-4">
                      <p className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
                        <Bell size={14} className="me-1 inline" />
                        {copy.pushUpdates}
                      </p>
                      <div className="space-y-2">
                        {(pipelineQuery.data?.updates?.push || []).slice(0, 6).map((push) => (
                          <div key={push.push_id} className="rounded-xl bg-[var(--chip-bg)] p-2">
                            <p className="text-xs font-semibold text-[var(--text-primary)]">{push.title || "-"}</p>
                            <p className="mt-1 text-xs text-[var(--text-muted)]">{push.message || "-"}</p>
                            <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                              {push.created_at ? new Date(push.created_at).toLocaleString() : "-"}
                            </p>
                          </div>
                        ))}
                        {(pipelineQuery.data?.updates?.push || []).length === 0 && (
                          <p className="text-xs text-[var(--text-muted)]">{copy.noUpdates}</p>
                        )}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[var(--panel-border)] p-4">
                      <p className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
                        <Mail size={14} className="me-1 inline" />
                        {copy.emailUpdates}
                      </p>
                      <div className="space-y-2">
                        {(pipelineQuery.data?.updates?.email || []).slice(0, 6).map((email) => (
                          <div key={email.email_id} className="rounded-xl bg-[var(--chip-bg)] p-2">
                            <p className="text-xs font-semibold text-[var(--text-primary)]">{email.subject || "-"}</p>
                            <p className="mt-1 line-clamp-2 text-xs text-[var(--text-muted)]">{email.body || "-"}</p>
                            <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                              {email.created_at ? new Date(email.created_at).toLocaleString() : "-"}
                            </p>
                          </div>
                        ))}
                        {(pipelineQuery.data?.updates?.email || []).length === 0 && (
                          <p className="text-xs text-[var(--text-muted)]">{copy.noUpdates}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            <div className="mt-6 flex justify-end">
              <Button variant="ghost" onClick={() => setActiveRequestId(null)}>
                {copy.close}
              </Button>
            </div>
          </div>
        </div>
      )}

      {openModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6">
          <div className="glass-card w-full max-w-xl rounded-3xl border border-[var(--panel-border)] p-0 shadow-[0_20px_80px_rgba(0,0,0,0.45)]">
            <div className="flex items-center justify-between border-b border-[var(--panel-border)] px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--chip-bg)]">
                  <FileSearch2 size={18} />
                </div>
                <div>
                  <h3 className="heading-serif text-xl text-[var(--text-primary)]">{copy.modalTitle}</h3>
                  <p className="text-xs text-[var(--text-muted)]">{copy.modalHint}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpenModal(false)}
                className="rounded-full border border-[var(--panel-border)] p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                aria-label={copy.cancel}
              >
                <X size={16} />
              </button>
            </div>
            <div className="px-6 py-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="cv-request-query" className="text-xs text-[var(--text-muted)]">
                    {copy.modalRoleLabel}
                  </label>
                  <textarea
                    id="cv-request-query"
                    value={role}
                    onChange={(event) => setRole(event.target.value)}
                    className="w-full rounded-xl border border-[var(--panel-border)] bg-transparent px-4 py-3 text-sm text-[var(--text-primary)] outline-none"
                    rows={4}
                    name="requested_role"
                    aria-label={copy.modalTitle}
                    placeholder={copy.modalHint}
                  />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="cv-request-skills" className="text-xs text-[var(--text-muted)]">
                      {copy.modalSkillsLabel}
                    </label>
                    <input
                      id="cv-request-skills"
                      value={skills}
                      onChange={(event) => setSkills(event.target.value)}
                      className="w-full rounded-xl border border-[var(--panel-border)] bg-transparent px-4 py-3 text-sm text-[var(--text-primary)] outline-none"
                      name="skills"
                      placeholder="Java, Spring, AWS"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="cv-request-location" className="text-xs text-[var(--text-muted)]">
                      {copy.modalLocationLabel}
                    </label>
                    <input
                      id="cv-request-location"
                      value={location}
                      onChange={(event) => setLocation(event.target.value)}
                      className="w-full rounded-xl border border-[var(--panel-border)] bg-transparent px-4 py-3 text-sm text-[var(--text-primary)] outline-none"
                      name="location"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="cv-request-experience" className="text-xs text-[var(--text-muted)]">
                      {copy.modalExperienceLabel}
                    </label>
                    <input
                      id="cv-request-experience"
                      type="number"
                      min={0}
                      value={experience}
                      onChange={(event) => setExperience(event.target.value ? Number(event.target.value) : "")}
                      className="w-full rounded-xl border border-[var(--panel-border)] bg-transparent px-4 py-3 text-sm text-[var(--text-primary)] outline-none"
                      name="experience_years"
                    />
                  </div>
                </div>
                <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--chip-bg)] px-4 py-3 text-sm">
                  <p className="text-xs text-[var(--text-muted)]">{copy.modalCountLabel}</p>
                  <p className="mt-1 font-semibold text-[var(--text-primary)]">1</p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">{copy.modalCountHint}</p>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-[var(--panel-border)] px-6 py-5">
              <Button variant="ghost" onClick={() => setOpenModal(false)}>
                {copy.cancel}
              </Button>
              <Button
                onClick={() =>
                  createRequest.mutate({
                    requested_role: role,
                    cv_count: 1,
                    experience_years: experience === "" ? undefined : experience,
                    skills: skills
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                    location: location || undefined,
                  })
                }
                disabled={!canSubmit || createRequest.isPending}
              >
                {copy.send}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CVRequests;
