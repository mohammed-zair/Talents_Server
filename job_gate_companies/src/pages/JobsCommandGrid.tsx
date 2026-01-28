import React, { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { FilePlus2, Pencil, Trash2 } from "lucide-react";
import SectionHeader from "../components/shared/SectionHeader";
import Card from "../components/shared/Card";
import ToggleSwitch from "../components/shared/ToggleSwitch";
import Button from "../components/shared/Button";
import Skeleton from "../components/shared/Skeleton";
import { companyApi } from "../services/api/api";
import type { JobFormPayload, JobPosting } from "../types";
import { useLanguage } from "../contexts/LanguageContext";

const emptyJobForm: JobFormPayload = {
  title: "",
  questions: [],
};

const createQuestionId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

type JobFormUpdatePayload = {
  require_cv: boolean;
  fields: { label: string; type: "text" | "multi" | "file"; options?: string[] }[];
};

const JobsCommandGrid: React.FC = () => {
  const queryClient = useQueryClient();
  const { language } = useLanguage();
  const { data: jobs, isLoading } = useQuery({
    queryKey: ["company-jobs"],
    queryFn: companyApi.getJobPostings,
  });

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [editJob, setEditJob] = useState<JobPosting | null>(null);
  const [editForm, setEditForm] = useState<Partial<JobPosting>>({});
  const [jobForm, setJobForm] = useState<JobFormPayload>(emptyJobForm);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [requireCv, setRequireCv] = useState(true);

  useEffect(() => {
    setJobForm((prev) => {
      const needsIds = prev.questions.some((q) => !q.id);
      if (!needsIds) return prev;
      return {
        ...prev,
        questions: prev.questions.map((q) => (q.id ? q : { ...q, id: createQuestionId() })),
      };
    });
  }, [jobForm.questions.length]);

  const toggleJob = useMutation({
    mutationFn: companyApi.toggleJobPosting,
    onSuccess: () => {
      toast.success(language === "ar" ? "تم تحديث حالة الوظيفة" : "Job toggled successfully");
      queryClient.invalidateQueries({ queryKey: ["company-jobs"] });
    },
    onError: () =>
      toast.error(language === "ar" ? "تعذر تحديث الحالة" : "Failed to toggle job"),
  });

  const deleteJob = useMutation({
    mutationFn: companyApi.deleteJobPosting,
    onSuccess: () => {
      toast.success(language === "ar" ? "تم حذف الوظيفة" : "Job deleted");
      queryClient.invalidateQueries({ queryKey: ["company-jobs"] });
      setDeleteTarget(null);
      setDeleteConfirm("");
    },
    onError: () =>
      toast.error(language === "ar" ? "تعذر حذف الوظيفة" : "Failed to delete job"),
  });

  const updateJob = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<JobPosting> }) =>
      companyApi.updateJobPosting(id, payload),
    onSuccess: () => {
      toast.success(language === "ar" ? "تم تحديث الوظيفة" : "Job updated");
      queryClient.invalidateQueries({ queryKey: ["company-jobs"] });
      setEditJob(null);
    },
    onError: () =>
      toast.error(language === "ar" ? "تعذر تحديث الوظيفة" : "Failed to update job"),
  });

  const createForm = useMutation({
    mutationFn: companyApi.createJobForm,
    onSuccess: () => {
      toast.success(language === "ar" ? "تم إنشاء النموذج" : "Form created");
      setJobForm(emptyJobForm);
      setSelectedJobId("");
      setRequireCv(true);
    },
    onError: () =>
      toast.error(language === "ar" ? "تعذر إنشاء النموذج" : "Failed to create form"),
  });

  const updateForm = useMutation({
    mutationFn: ({ jobId, payload }: { jobId: string; payload: JobFormUpdatePayload }) =>
      companyApi.updateJobForm(jobId, payload),
    onSuccess: () => {
      toast.success(language === "ar" ? "تم تحديث النموذج" : "Form updated");
      setJobForm(emptyJobForm);
      setSelectedJobId("");
      setRequireCv(true);
    },
    onError: () =>
      toast.error(language === "ar" ? "تعذر تحديث النموذج" : "Failed to update form"),
  });

  const deleteForm = useMutation({
    mutationFn: (jobId: string) => companyApi.deleteJobForm(jobId),
    onSuccess: () => {
      toast.success(language === "ar" ? "تم حذف النموذج" : "Form deleted");
      setJobForm(emptyJobForm);
      setSelectedJobId("");
      setRequireCv(true);
    },
    onError: () =>
      toast.error(language === "ar" ? "تعذر حذف النموذج" : "Failed to delete form"),
  });

  const bulkToggle = () => {
    selectedIds.forEach((id) => toggleJob.mutate(id));
  };

  const bulkDelete = () => {
    selectedIds.forEach((id) => deleteJob.mutate(id));
    setSelectedIds([]);
  };

  const jobList = Array.isArray(jobs) ? jobs : [];

  const handleQuestionAdd = (type: "text" | "multi" | "file") => {
    setJobForm((prev) => ({
      ...prev,
      questions: [
        ...prev.questions,
        {
          id: createQuestionId(),
          type,
          label: `${type.toUpperCase()} question`,
          options: type === "multi" ? [] : undefined,
        },
      ],
    }));
  };

  const handleQuestionChange = (index: number, field: string, value: string) => {
    setJobForm((prev) => ({
      ...prev,
      questions: prev.questions.map((q, i) =>
        i === index ? { ...q, [field]: value } : q
      ),
    }));
  };

  const handleQuestionRemove = (index: number) => {
    setJobForm((prev) => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index),
    }));
  };

  const handleOptionChange = (qIndex: number, oIndex: number, value: string) => {
    setJobForm((prev) => ({
      ...prev,
      questions: prev.questions.map((q, i) => {
        if (i !== qIndex) return q;
        const options = q.options ? [...q.options] : [];
        options[oIndex] = value;
        return { ...q, options };
      }),
    }));
  };

  const handleOptionAdd = (qIndex: number) => {
    setJobForm((prev) => ({
      ...prev,
      questions: prev.questions.map((q, i) => {
        if (i !== qIndex) return q;
        const options = q.options ? [...q.options, ""] : [""];
        return { ...q, options };
      }),
    }));
  };

  const handleOptionRemove = (qIndex: number, oIndex: number) => {
    setJobForm((prev) => ({
      ...prev,
      questions: prev.questions.map((q, i) => {
        if (i !== qIndex) return q;
        const options = (q.options ?? []).filter((_, idx) => idx !== oIndex);
        return { ...q, options };
      }),
    }));
  };

  const isSelected = (id: string) => selectedIds.includes(id);

  const copy = {
    en: {
      headerEyebrow: "Job Lifecycle",
      headerTitle: "Job Command Grid",
      headerSubtitle: "Manage live roles, custom forms, and real-time availability.",
      toggleAll: "Toggle All",
      deleteSelected: "Delete Selected",
      applicants: "applicants",
      edit: "Edit",
      delete: "Delete",
      formEyebrow: "Form Builder",
      formTitle: "Dynamic Application Forms",
      formSubtitle: "Create custom questions with a Bento layout.",
      formTitlePlaceholder: "Form title",
      formJobLabel: "Attach to job",
      formJobPlaceholder: "Select a job",
      requireCv: "Require CV upload",
      addText: "Add Text Question",
      addMulti: "Add Multiple Choice",
      addFile: "Add File Upload",
      publish: "Publish Form",
      deleting: "Deleting...",
      creating: "Creating...",
    },
    ar: {
      headerEyebrow: "دورة الوظيفة",
      headerTitle: "شبكة إدارة الوظائف",
      headerSubtitle: "إدارة الوظائف والنماذج والحالة لحظيًا.",
      toggleAll: "تبديل الكل",
      deleteSelected: "حذف المحدد",
      applicants: "متقدم",
      edit: "تعديل",
      delete: "حذف",
      formEyebrow: "منشئ النماذج",
      formTitle: "نماذج التقديم الديناميكية",
      formSubtitle: "أنشئ أسئلة مخصصة بتنسيق Bento.",
      formTitlePlaceholder: "عنوان النموذج",
      formJobLabel: "ربط الوظيفة",
      formJobPlaceholder: "اختر وظيفة",
      requireCv: "يتطلب رفع السيرة",
      addText: "إضافة سؤال نصي",
      addMulti: "إضافة اختيار متعدد",
      addFile: "إضافة رفع ملف",
      publish: "نشر النموذج",
      deleting: "جارٍ الحذف...",
      creating: "جارٍ الإنشاء...",
    },
  }[language];

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow={copy.headerEyebrow}
        title={copy.headerTitle}
        subtitle={copy.headerSubtitle}
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={bulkToggle} disabled={!selectedIds.length}>
              {copy.toggleAll}
            </Button>
            <Button
              variant="outline"
              onClick={bulkDelete}
              disabled={!selectedIds.length}
              className="border-red-300 text-red-500"
            >
              {copy.deleteSelected}
            </Button>
          </div>
        }
      />

      <Card>
        {isLoading ? (
          <div className="grid gap-3 md:grid-cols-2">
            <Skeleton className="h-36" />
            <Skeleton className="h-36" />
            <Skeleton className="h-36" />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {jobList.map((job) => (
              <div
                key={job.id}
                className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4 shadow-soft-ambient"
              >
                <div className="flex items-start justify-between gap-3">
                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected(job.id)}
                      onChange={() =>
                        setSelectedIds((prev) =>
                          prev.includes(job.id)
                            ? prev.filter((item) => item !== job.id)
                            : [...prev, job.id]
                        )
                      }
                    />
                    <div>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">
                        {job.title}
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {job.department} · {job.location}
                      </p>
                    </div>
                  </label>
                  <ToggleSwitch
                    checked={job.status === "open"}
                    onChange={() => toggleJob.mutate(job.id)}
                  />
                </div>
                <div className="mt-4 flex items-center justify-between text-xs text-[var(--text-muted)]">
                  <span>
                    {job.applicants} {copy.applicants}
                  </span>
                  <span>{language === "ar" ? "تم الإنشاء" : "Created"} {job.createdAt}</span>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setEditJob(job);
                      setEditForm({
                        title: job.title,
                        department: job.department,
                        location: job.location,
                      });
                    }}
                  >
                    <Pencil size={14} className="me-2" />
                    {copy.edit}
                  </Button>
                  <Button variant="outline" onClick={() => setDeleteTarget(job.id)}>
                    <Trash2 size={14} className="me-2 text-red-500" />
                    {copy.delete}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <SectionHeader
          eyebrow={copy.formEyebrow}
          title={copy.formTitle}
          subtitle={copy.formSubtitle}
        />
        <div className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="space-y-4">
            <input
              value={jobForm.title}
              onChange={(event) => setJobForm((prev) => ({ ...prev, title: event.target.value }))}
              placeholder={copy.formTitlePlaceholder}
              name="formTitle"
              aria-label={copy.formTitlePlaceholder}
              className="w-full rounded-xl border border-[var(--panel-border)] bg-transparent px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
            />
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs text-[var(--text-muted)]" htmlFor="form-job-select">
                  {copy.formJobLabel}
                </label>
                <select
                  id="form-job-select"
                  value={selectedJobId}
                  onChange={(event) => setSelectedJobId(event.target.value)}
                  className="w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                >
                  <option value="">{copy.formJobPlaceholder}</option>
                  {jobList.map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-[var(--text-muted)]" htmlFor="form-require-cv">
                  {copy.requireCv}
                </label>
                <div className="flex items-center gap-3 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] px-4 py-3">
                  <input
                    id="form-require-cv"
                    type="checkbox"
                    checked={requireCv}
                    onChange={(event) => setRequireCv(event.target.checked)}
                  />
                  <span className="text-sm text-[var(--text-primary)]">
                    {requireCv ? "On" : "Off"}
                  </span>
                </div>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {jobForm.questions.map((question, index) => (
                <div
                  key={question.id ?? index}
                  className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <input
                      value={question.label}
                      onChange={(event) => handleQuestionChange(index, "label", event.target.value)}
                      className="w-full border-b border-[var(--panel-border)] bg-transparent pb-2 text-sm text-[var(--text-primary)] outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleQuestionRemove(index)}
                      className="rounded-lg border border-[var(--panel-border)] px-2 py-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    >
                      {language === "ar" ? "حذف" : "Remove"}
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-[var(--text-muted)]">
                    {language === "ar" ? "النوع" : "Type"}: {question.type}
                  </p>
                  {question.type === "multi" && (
                    <div className="mt-3 space-y-2">
                      {(question.options ?? []).map((option, oIndex) => (
                        <div key={`${question.id}-opt-${oIndex}`} className="flex items-center gap-2">
                          <input
                            value={option}
                            onChange={(event) =>
                              handleOptionChange(index, oIndex, event.target.value)
                            }
                            className="w-full rounded-lg border border-[var(--panel-border)] bg-transparent px-3 py-2 text-xs text-[var(--text-primary)] outline-none"
                            placeholder={
                              language === "ar" ? "خيار" : `Option ${oIndex + 1}`
                            }
                          />
                          <button
                            type="button"
                            onClick={() => handleOptionRemove(index, oIndex)}
                            className="rounded-lg border border-[var(--panel-border)] px-2 py-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                          >
                            {language === "ar" ? "×" : "×"}
                          </button>
                        </div>
                      ))}
                      <Button variant="outline" onClick={() => handleOptionAdd(index)}>
                        {language === "ar" ? "إضافة خيار" : "Add Option"}
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <Button variant="outline" onClick={() => handleQuestionAdd("text")}>
              <FilePlus2 size={14} className="me-2" />
              {copy.addText}
            </Button>
            <Button variant="outline" onClick={() => handleQuestionAdd("multi")}>
              <FilePlus2 size={14} className="me-2" />
              {copy.addMulti}
            </Button>
            <Button variant="outline" onClick={() => handleQuestionAdd("file")}>
              <FilePlus2 size={14} className="me-2" />
              {copy.addFile}
            </Button>
            <Button
              className="w-full justify-center"
              onClick={() =>
                createForm.mutate({
                  job_id: selectedJobId,
                  require_cv: requireCv,
                  fields: jobForm.questions.map((q) => ({
                    label: q.label,
                    type: q.type,
                    options: q.options ?? [],
                  })),
                })
              }
              disabled={createForm.isPending}
            >
              {createForm.isPending ? copy.creating : copy.publish}
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                selectedJobId &&
                updateForm.mutate({
                  jobId: selectedJobId,
                  payload: {
                    require_cv: requireCv,
                    fields: jobForm.questions.map((q) => ({
                      label: q.label,
                      type: q.type,
                      options: q.options ?? [],
                    })),
                  } as any,
                })
              }
              disabled={!selectedJobId || updateForm.isPending}
            >
              {language === "ar" ? "تحديث النموذج" : "Update Form"}
            </Button>
            <Button
              variant="outline"
              onClick={() => selectedJobId && deleteForm.mutate(selectedJobId)}
              disabled={!selectedJobId || deleteForm.isPending}
              className="border-red-300 text-red-500"
            >
              {language === "ar" ? "حذف النموذج" : "Delete Form"}
            </Button>
          </div>
        </div>
      </Card>

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-6">
          <div className="glass-card w-full max-w-md rounded-3xl border border-red-300 p-6 shadow-[0_0_40px_rgba(248,113,113,0.4)]">
            <h3 className="heading-serif text-xl text-[var(--text-primary)]">
              {language === "ar" ? "حذف الوظيفة؟" : "Delete Job Posting?"}
            </h3>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              {language === "ar"
                ? "للتأكيد اكتب DELETE ثم اضغط حذف."
                : "Type DELETE to confirm, then delete the job."}
            </p>
            <input
              value={deleteConfirm}
              onChange={(event) => setDeleteConfirm(event.target.value)}
              className="mt-4 w-full rounded-xl border border-[var(--panel-border)] bg-transparent px-4 py-3 text-sm text-[var(--text-primary)] outline-none"
            />
            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => {
                  setDeleteTarget(null);
                  setDeleteConfirm("");
                }}
              >
                {language === "ar" ? "إلغاء" : "Cancel"}
              </Button>
              <Button
                onClick={() => deleteTarget && deleteJob.mutate(deleteTarget)}
                disabled={deleteConfirm !== "DELETE"}
                className="bg-red-500 text-white hover:bg-red-600"
              >
                {language === "ar" ? "حذف الوظيفة" : "Delete Job"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {editJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-6">
          <div className="glass-card w-full max-w-lg rounded-3xl border p-6">
            <h3 className="heading-serif text-xl text-[var(--text-primary)]">
              {language === "ar" ? "تحديث تفاصيل الوظيفة" : "Update Job Details"}
            </h3>
            <div className="mt-4 space-y-3">
              <input
                value={editForm.title ?? ""}
                onChange={(event) => setEditForm((prev) => ({ ...prev, title: event.target.value }))}
                placeholder={language === "ar" ? "عنوان الوظيفة" : "Job title"}
                name="editJobTitle"
                aria-label={language === "ar" ? "عنوان الوظيفة" : "Job title"}
                className="w-full rounded-xl border border-[var(--panel-border)] bg-transparent px-4 py-3 text-sm text-[var(--text-primary)] outline-none"
              />
              <input
                value={editForm.department ?? ""}
                onChange={(event) =>
                  setEditForm((prev) => ({ ...prev, department: event.target.value }))
                }
                placeholder={language === "ar" ? "القسم" : "Department"}
                name="editDepartment"
                aria-label={language === "ar" ? "القسم" : "Department"}
                className="w-full rounded-xl border border-[var(--panel-border)] bg-transparent px-4 py-3 text-sm text-[var(--text-primary)] outline-none"
              />
              <input
                value={editForm.location ?? ""}
                onChange={(event) => setEditForm((prev) => ({ ...prev, location: event.target.value }))}
                placeholder={language === "ar" ? "الموقع" : "Location"}
                name="editLocation"
                aria-label={language === "ar" ? "الموقع" : "Location"}
                className="w-full rounded-xl border border-[var(--panel-border)] bg-transparent px-4 py-3 text-sm text-[var(--text-primary)] outline-none"
              />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setEditJob(null)}>
                {language === "ar" ? "إلغاء" : "Cancel"}
              </Button>
              <Button
                onClick={() =>
                  updateJob.mutate({ id: editJob.id, payload: editForm })
                }
              >
                {language === "ar" ? "حفظ التغييرات" : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobsCommandGrid;
