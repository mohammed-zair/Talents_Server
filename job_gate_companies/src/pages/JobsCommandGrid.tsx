import React, { useCallback, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Briefcase, FilePlus2, Pencil, Trash2 } from "lucide-react";
import Cropper from "react-easy-crop";
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

const createImage = (url: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.setAttribute("crossOrigin", "anonymous");
    image.src = url;
  });

const getCroppedFile = async (
  imageSrc: string,
  crop: { width: number; height: number; x: number; y: number },
  fileName: string
) => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context unavailable");

  canvas.width = crop.width;
  canvas.height = crop.height;

  ctx.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    crop.width,
    crop.height
  );

  const blob: Blob = await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b as Blob), "image/jpeg", 0.92)
  );
  return new File([blob], fileName, { type: "image/jpeg" });
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
  const [requireCv, setRequireCv] = useState(true);
  const [jobDraft, setJobDraft] = useState({
    title: "",
    description: "",
    requirements: "",
    industry: "",
    location: "",
    salaryMin: "",
    salaryMax: "",
  });
  const [jobImageFile, setJobImageFile] = useState<File | null>(null);
  const [jobImagePreview, setJobImagePreview] = useState<string | null>(null);
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropTarget, setCropTarget] = useState<"create" | "edit" | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [cropAreaPixels, setCropAreaPixels] = useState<{
    width: number;
    height: number;
    x: number;
    y: number;
  } | null>(null);
  const draftStorageKey = "twt-job-form-draft";

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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(draftStorageKey);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as {
        jobDraft?: typeof jobDraft;
        jobForm?: JobFormPayload;
        requireCv?: boolean;
      };
      if (parsed.jobDraft) setJobDraft(parsed.jobDraft);
      if (parsed.jobForm) setJobForm(parsed.jobForm);
      if (typeof parsed.requireCv === "boolean") setRequireCv(parsed.requireCv);
    } catch {
      window.localStorage.removeItem(draftStorageKey);
    }
  }, []);

  useEffect(() => {
    if (!jobImageFile) {
      setJobImagePreview(null);
      return;
    }
    const url = URL.createObjectURL(jobImageFile);
    setJobImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [jobImageFile]);

  useEffect(() => {
    if (!editImageFile) return;
    const url = URL.createObjectURL(editImageFile);
    setEditImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [editImageFile]);

  const onCropComplete = useCallback((_: any, croppedPixels: any) => {
    setCropAreaPixels(croppedPixels);
  }, []);

  const openCropper = useCallback((file: File, target: "create" | "edit") => {
    const url = URL.createObjectURL(file);
    setCropSrc(url);
    setCropTarget(target);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCropAreaPixels(null);
  }, []);

  useEffect(() => {
    if (!cropSrc) return;
    return () => URL.revokeObjectURL(cropSrc);
  }, [cropSrc]);

  const toggleJob = useMutation({
    mutationFn: companyApi.toggleJobPosting,
    onSuccess: () => {
      toast.success(language === "ar" ? "?? ????? ???? ???????" : "Job toggled successfully");
      queryClient.invalidateQueries({ queryKey: ["company-jobs"] });
    },
    onError: () =>
      toast.error(language === "ar" ? "???? ????? ??????" : "Failed to toggle job"),
  });

  const deleteJob = useMutation({
    mutationFn: companyApi.deleteJobPosting,
    onSuccess: () => {
      toast.success(language === "ar" ? "?? ??? ???????" : "Job deleted");
      queryClient.invalidateQueries({ queryKey: ["company-jobs"] });
      setDeleteTarget(null);
      setDeleteConfirm("");
    },
    onError: () =>
      toast.error(language === "ar" ? "???? ??? ???????" : "Failed to delete job"),
  });

  const updateJob = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: FormData }) =>
      companyApi.updateJobPosting(id, payload),
    onSuccess: () => {
      toast.success(language === "ar" ? "?? ????? ???????" : "Job updated");
      queryClient.invalidateQueries({ queryKey: ["company-jobs"] });
      setEditJob(null);
      setEditImageFile(null);
      setEditImagePreview(null);
    },
    onError: () =>
      toast.error(language === "ar" ? "???? ????? ???????" : "Failed to update job"),
  });

  const recalculateInsights = useMutation({
    mutationFn: (id: string) => companyApi.recalculateJobInsights(id),
    onSuccess: () => {
      toast.success(
        language === "ar"
          ? "?? ??? ????? ???????"
          : "AI insights refresh started"
      );
    },
    onError: () =>
      toast.error(
        language === "ar"
          ? "???? ????? ???????"
          : "Failed to refresh AI insights"
      ),
  });

  const createJob = useMutation({
    mutationFn: (payload: FormData) => companyApi.createJobPosting(payload),
    onSuccess: () => {
      toast.success(
        language === "ar" ? "?? ??? ??????? ????????" : "Job + form published"
      );
      setJobForm(emptyJobForm);
      setRequireCv(true);
      setJobDraft({
        title: "",
        description: "",
        requirements: "",
        industry: "",
        location: "",
        salaryMin: "",
        salaryMax: "",
      });
      setJobImageFile(null);
      setJobImagePreview(null);
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(draftStorageKey);
      }
      queryClient.invalidateQueries({ queryKey: ["company-jobs"] });
    },
    onError: () =>
      toast.error(language === "ar" ? "???? ??? ???????" : "Failed to publish job"),
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

  const handleImagePick = (file: File | null, target: "create" | "edit") => {
    if (!file) return;
    openCropper(file, target);
  };

  const handleCropConfirm = async () => {
    if (!cropSrc || !cropAreaPixels || !cropTarget) return;
    try {
      const croppedFile = await getCroppedFile(cropSrc, cropAreaPixels, "job-image.jpg");
      if (cropTarget === "create") {
        setJobImageFile(croppedFile);
      } else {
        setEditImageFile(croppedFile);
      }
    } catch (error) {
      console.error("Failed to crop image", error);
    } finally {
      setCropSrc(null);
      setCropTarget(null);
      setCropAreaPixels(null);
    }
  };

  const handleCropCancel = () => {
    setCropSrc(null);
    setCropTarget(null);
    setCropAreaPixels(null);
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
      jobTitleLabel: "Job title",
      jobDescriptionLabel: "Job description",
      jobRequirementsLabel: "Key requirements",
      jobLocationLabel: "Location",
      jobSalaryMinLabel: "Min salary (optional)",
      jobSalaryMaxLabel: "Max salary (optional)",
      jobImageLabel: "Job image (optional)",
      jobImageHint: "Square image looks best.",
      jobImageDrop: "Drag & drop or click to upload",
      requireCv: "Require CV upload",
      addText: "Add Text Question",
      addMulti: "Add Multiple Choice",
      addFile: "Add File Upload",
      saveDraft: "Save Draft",
      draftSaved: "Draft saved",
      publish: "Publish Job + Form",
      deleting: "Deleting...",
      creating: "Publishing...",
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
      jobTitleLabel: "مسمى الوظيفة",
      jobDescriptionLabel: "وصف الوظيفة",
      jobRequirementsLabel: "المتطلبات",
      jobLocationLabel: "الموقع",
      jobSalaryMinLabel: "أدنى راتب (اختياري)",
      jobSalaryMaxLabel: "أعلى راتب (اختياري)",
      jobImageLabel: "صورة الوظيفة (اختياري)",
      jobImageHint: "الصورة المربعة تظهر بشكل أفضل.",
      jobImageDrop: "اسحب وأسقط أو اضغط للرفع",
      requireCv: "يتطلب رفع السيرة",
      addText: "إضافة سؤال نصي",
      addMulti: "إضافة اختيار متعدد",
      addFile: "إضافة رفع ملف",
      saveDraft: "حفظ المسودة",
      draftSaved: "تم حفظ المسودة",
      publish: "نشر الوظيفة والنموذج",
      deleting: "جارٍ الحذف...",
      creating: "جارٍ النشر...",
    },
  }[language];

  const canPublish = Boolean(jobDraft.title.trim() && jobDraft.description.trim());

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
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)]">
                        {job.jobImageUrl ? (
                          <img
                            src={job.jobImageUrl}
                            alt={job.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Briefcase size={20} className="text-[var(--text-muted)]" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[var(--text-primary)]">
                          {job.title}
                        </p>
                        <p className="text-xs text-[var(--text-muted)]">
                          {job.department} · {job.location}
                        </p>
                      </div>
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
                  <span>{language === "ar" ? "?? ???????" : "Created"} {job.createdAt}</span>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setEditJob(job);
                      setEditForm({
                        title: job.title,
                        department: job.department,
                        industry: job.industry,
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
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs text-[var(--text-muted)]" htmlFor="job-title">
                  {copy.jobTitleLabel}
                </label>
                <input
                  id="job-title"
                  value={jobDraft.title}
                  onChange={(event) =>
                    setJobDraft((prev) => ({ ...prev, title: event.target.value }))
                  }
                  name="jobTitle"
                  aria-label={copy.jobTitleLabel}
                  className="w-full rounded-xl border border-[var(--panel-border)] bg-transparent px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-[var(--text-muted)]" htmlFor="job-location">
                  {copy.jobLocationLabel}
                </label>
                <input
                  id="job-location"
                  value={jobDraft.location}
                  onChange={(event) =>
                    setJobDraft((prev) => ({ ...prev, location: event.target.value }))
                  }
                  name="jobLocation"
                  aria-label={copy.jobLocationLabel}
                  className="w-full rounded-xl border border-[var(--panel-border)] bg-transparent px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-[var(--text-muted)]" htmlFor="job-industry">
                  {language === "ar" ? "???????" : "Industry"}
                </label>
                <input
                  id="job-industry"
                  value={jobDraft.industry}
                  onChange={(event) =>
                    setJobDraft((prev) => ({ ...prev, industry: event.target.value }))
                  }
                  name="jobIndustry"
                  aria-label={language === "ar" ? "???????" : "Industry"}
                  className="w-full rounded-xl border border-[var(--panel-border)] bg-transparent px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs text-[var(--text-muted)]" htmlFor="job-description">
                  {copy.jobDescriptionLabel}
                </label>
                <textarea
                  id="job-description"
                  value={jobDraft.description}
                  onChange={(event) =>
                    setJobDraft((prev) => ({ ...prev, description: event.target.value }))
                  }
                  name="jobDescription"
                  aria-label={copy.jobDescriptionLabel}
                  rows={4}
                  className="w-full resize-none rounded-xl border border-[var(--panel-border)] bg-transparent px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs text-[var(--text-muted)]" htmlFor="job-requirements">
                  {copy.jobRequirementsLabel}
                </label>
                <textarea
                  id="job-requirements"
                  value={jobDraft.requirements}
                  onChange={(event) =>
                    setJobDraft((prev) => ({ ...prev, requirements: event.target.value }))
                  }
                  name="jobRequirements"
                  aria-label={copy.jobRequirementsLabel}
                  rows={3}
                  className="w-full resize-none rounded-xl border border-[var(--panel-border)] bg-transparent px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-[var(--text-muted)]" htmlFor="job-salary-min">
                  {copy.jobSalaryMinLabel}
                </label>
                <input
                  id="job-salary-min"
                  value={jobDraft.salaryMin}
                  onChange={(event) =>
                    setJobDraft((prev) => ({ ...prev, salaryMin: event.target.value }))
                  }
                  name="jobSalaryMin"
                  aria-label={copy.jobSalaryMinLabel}
                  className="w-full rounded-xl border border-[var(--panel-border)] bg-transparent px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-[var(--text-muted)]" htmlFor="job-salary-max">
                  {copy.jobSalaryMaxLabel}
                </label>
                <input
                  id="job-salary-max"
                  value={jobDraft.salaryMax}
                  onChange={(event) =>
                    setJobDraft((prev) => ({ ...prev, salaryMax: event.target.value }))
                  }
                  name="jobSalaryMax"
                  aria-label={copy.jobSalaryMaxLabel}
                  className="w-full rounded-xl border border-[var(--panel-border)] bg-transparent px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs text-[var(--text-muted)]" htmlFor="job-image">
                  {copy.jobImageLabel}
                </label>
                <div
                  className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--panel-border)] bg-[var(--panel-bg)] px-4 py-6 text-center"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    handleImagePick(event.dataTransfer.files?.[0] || null, "create");
                  }}
                >
                  <input
                    id="job-image"
                    type="file"
                    accept="image/*"
                    onChange={(event) => handleImagePick(event.target.files?.[0] || null, "create")}
                    className="hidden"
                  />
                  <label htmlFor="job-image" className="cursor-pointer text-xs text-[var(--text-muted)]">
                    {copy.jobImageDrop}
                  </label>
                  <span className="text-[10px] text-[var(--text-muted)]">{copy.jobImageHint}</span>
                </div>
                {jobImagePreview && (
                  <div className="mt-2 h-28 w-28 overflow-hidden rounded-2xl border border-[var(--panel-border)]">
                    <img src={jobImagePreview} alt="Job" className="h-full w-full object-cover" />
                  </div>
                )}
              </div>
              <div className="space-y-2 md:col-span-2">
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
                      {language === "ar" ? "???" : "Remove"}
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-[var(--text-muted)]">
                    {language === "ar" ? "?????" : "Type"}: {question.type}
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
                              language === "ar" ? "????" : `Option ${oIndex + 1}`
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
                        {language === "ar" ? "????? ????" : "Add Option"}
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
              variant="outline"
              onClick={() => {
                if (typeof window === "undefined") return;
                window.localStorage.setItem(
                  draftStorageKey,
                  JSON.stringify({ jobDraft, jobForm, requireCv })
                );
                toast.success(copy.draftSaved);
              }}
            >
              {copy.saveDraft}
            </Button>
            <Button
              className="w-full justify-center"
              onClick={() => {
                const payload = new FormData();
                payload.append("title", jobDraft.title.trim());
                payload.append("description", jobDraft.description.trim());
                if (jobDraft.requirements.trim()) {
                  payload.append("requirements", jobDraft.requirements.trim());
                }
                if (jobDraft.industry.trim()) {
                  payload.append("industry", jobDraft.industry.trim());
                }
                if (jobDraft.location.trim()) {
                  payload.append("location", jobDraft.location.trim());
                }
                if (jobDraft.salaryMin.trim()) {
                  payload.append("salary_min", jobDraft.salaryMin.trim());
                }
                if (jobDraft.salaryMax.trim()) {
                  payload.append("salary_max", jobDraft.salaryMax.trim());
                }
                if (jobImageFile) {
                  payload.append("job_image", jobImageFile);
                }
                payload.append("form_type", "internal_form");
                payload.append("require_cv", String(requireCv));
                payload.append(
                  "form_fields",
                  JSON.stringify(
                    jobForm.questions.map((q) => ({
                      label: q.label,
                      type: q.type,
                      options: q.options ?? [],
                    }))
                  )
                );
                createJob.mutate(payload);
              }}
              disabled={!canPublish || createJob.isPending}
            >
              {createJob.isPending ? copy.creating : copy.publish}
            </Button>
          </div>
        </div>
      </Card>

      {cropSrc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
          <div className="glass-card w-full max-w-xl rounded-3xl border p-6">
            <h3 className="heading-serif text-xl text-[var(--text-primary)]">
              {language === "ar" ? "قص الصورة" : "Crop image"}
            </h3>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              {language === "ar"
                ? "اضبط المربع ليغطي أهم جزء."
                : "Adjust the square to focus on the key area."}
            </p>
            <div className="relative mt-4 h-72 w-full overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-black/40">
              <Cropper
                image={cropSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
            <div className="mt-4 flex items-center gap-3">
              <span className="text-xs text-[var(--text-muted)]">
                {language === "ar" ? "تكبير" : "Zoom"}
              </span>
              <input
                type="range"
                min={1}
                max={3}
                step={0.05}
                value={zoom}
                onChange={(event) => setZoom(Number(event.target.value))}
                className="w-full"
              />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="ghost" onClick={handleCropCancel}>
                {language === "ar" ? "إلغاء" : "Cancel"}
              </Button>
              <Button onClick={handleCropConfirm}>
                {language === "ar" ? "اعتماد الصورة" : "Use image"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-6">
          <div className="glass-card w-full max-w-md rounded-3xl border border-red-300 p-6 shadow-[0_0_40px_rgba(248,113,113,0.4)]">
            <h3 className="heading-serif text-xl text-[var(--text-primary)]">
              {language === "ar" ? "??? ????????" : "Delete Job Posting?"}
            </h3>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              {language === "ar"
                ? "??????? ???? DELETE ?? ???? ???."
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
                {language === "ar" ? "?????" : "Cancel"}
              </Button>
              <Button
                onClick={() => deleteTarget && deleteJob.mutate(deleteTarget)}
                disabled={deleteConfirm !== "DELETE"}
                className="bg-red-500 text-white hover:bg-red-600"
              >
                {language === "ar" ? "??? ???????" : "Delete Job"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {editJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-6">
          <div className="glass-card w-full max-w-lg rounded-3xl border p-6">
            <h3 className="heading-serif text-xl text-[var(--text-primary)]">
              {language === "ar" ? "????? ?????? ???????" : "Update Job Details"}
            </h3>
            <div className="mt-4 space-y-3">
              <input
                value={editForm.title ?? ""}
                onChange={(event) => setEditForm((prev) => ({ ...prev, title: event.target.value }))}
                placeholder={language === "ar" ? "????? ???????" : "Job title"}
                name="editJobTitle"
                aria-label={language === "ar" ? "????? ???????" : "Job title"}
                className="w-full rounded-xl border border-[var(--panel-border)] bg-transparent px-4 py-3 text-sm text-[var(--text-primary)] outline-none"
              />
              <input
                value={editForm.department ?? ""}
                onChange={(event) =>
                  setEditForm((prev) => ({ ...prev, department: event.target.value }))
                }
                placeholder={language === "ar" ? "?????" : "Department"}
                name="editDepartment"
                aria-label={language === "ar" ? "?????" : "Department"}
                className="w-full rounded-xl border border-[var(--panel-border)] bg-transparent px-4 py-3 text-sm text-[var(--text-primary)] outline-none"
              />
              <input
                value={editForm.industry ?? ""}
                onChange={(event) =>
                  setEditForm((prev) => ({ ...prev, industry: event.target.value }))
                }
                placeholder={language === "ar" ? "???????" : "Industry"}
                name="editIndustry"
                aria-label={language === "ar" ? "???????" : "Industry"}
                className="w-full rounded-xl border border-[var(--panel-border)] bg-transparent px-4 py-3 text-sm text-[var(--text-primary)] outline-none"
              />
              <input
                value={editForm.location ?? ""}
                onChange={(event) => setEditForm((prev) => ({ ...prev, location: event.target.value }))}
                placeholder={language === "ar" ? "??????" : "Location"}
                name="editLocation"
                aria-label={language === "ar" ? "??????" : "Location"}
                className="w-full rounded-xl border border-[var(--panel-border)] bg-transparent px-4 py-3 text-sm text-[var(--text-primary)] outline-none"
              />
              <div className="space-y-2">
                <label className="text-xs text-[var(--text-muted)]" htmlFor="edit-job-image">
                  {copy.jobImageLabel}
                </label>
                <div
                  className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--panel-border)] bg-[var(--panel-bg)] px-4 py-6 text-center"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    handleImagePick(event.dataTransfer.files?.[0] || null, "edit");
                  }}
                >
                  <input
                    id="edit-job-image"
                    type="file"
                    accept="image/*"
                    onChange={(event) => handleImagePick(event.target.files?.[0] || null, "edit")}
                    className="hidden"
                  />
                  <label htmlFor="edit-job-image" className="cursor-pointer text-xs text-[var(--text-muted)]">
                    {copy.jobImageDrop}
                  </label>
                  <span className="text-[10px] text-[var(--text-muted)]">{copy.jobImageHint}</span>
                </div>
                {(editImagePreview || editJob?.jobImageUrl) && (
                  <div className="h-28 w-28 overflow-hidden rounded-2xl border border-[var(--panel-border)]">
                    <img
                      src={editImagePreview || editJob?.jobImageUrl || ""}
                      alt={editJob?.title || "Job"}
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => {
                  setEditJob(null);
                  setEditImageFile(null);
                  setEditImagePreview(null);
                }}
              >
                {language === "ar" ? "?????" : "Cancel"}
              </Button>
              <Button
                variant="outline"
                onClick={() => recalculateInsights.mutate(editJob.id)}
                disabled={recalculateInsights.isPending}
              >
                {recalculateInsights.isPending
                  ? language === "ar"
                    ? "???? ???????..."
                    : "Refreshing..."
                  : language === "ar"
                    ? "????? ???? ???????"
                    : "Recalculate AI Insights"}
              </Button>
              <Button
                onClick={() => {
                  const payload = new FormData();
                  if (editForm.title?.trim()) payload.append("title", String(editForm.title).trim());
                  if (editForm.department?.trim()) payload.append("department", String(editForm.department).trim());
                  if (editForm.industry?.trim()) payload.append("industry", String(editForm.industry).trim());
                  if (editForm.location?.trim()) payload.append("location", String(editForm.location).trim());
                  if (editImageFile) payload.append("job_image", editImageFile);
                  updateJob.mutate({ id: editJob.id, payload });
                }}
              >
                {language === "ar" ? "??? ?????????" : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobsCommandGrid;


