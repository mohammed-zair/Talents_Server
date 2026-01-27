import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { FileSearch2, Download, Plus, X } from "lucide-react";
import SectionHeader from "../components/shared/SectionHeader";
import Card from "../components/shared/Card";
import Button from "../components/shared/Button";
import Skeleton from "../components/shared/Skeleton";
import { companyApi } from "../services/api/api";
import type { CVRequest } from "../types";
import { useLanguage } from "../contexts/LanguageContext";

const CVRequests: React.FC = () => {
  const queryClient = useQueryClient();
  const { language } = useLanguage();
  const { data, isLoading } = useQuery({
    queryKey: ["cv-requests"],
    queryFn: companyApi.getCvRequests,
  });
  const [openModal, setOpenModal] = useState(false);
  const [query, setQuery] = useState("");
  const [count, setCount] = useState(5);

  const createRequest = useMutation({
    mutationFn: companyApi.createCvRequest,
    onSuccess: () => {
      toast.success(language === "ar" ? "تم إرسال الطلب" : "CV request sent");
      queryClient.invalidateQueries({ queryKey: ["cv-requests"] });
      setOpenModal(false);
      setQuery("");
      setCount(5);
    },
    onError: () =>
      toast.error(language === "ar" ? "تعذر إرسال الطلب" : "Failed to send CV request"),
  });

  const requests = data ?? [];
  const canSubmit = useMemo(() => query.trim().length >= 6 && count > 0, [query, count]);

  const copy = {
    en: {
      headerEyebrow: "CV Marketplace",
      headerTitle: "The Talent Hunter",
      headerSubtitle: "Send AI-driven requests and track fulfillment.",
      newRequest: "New Request",
      emptyTitle: "No requests yet",
      emptyBody: "Create your first request to start sourcing talent.",
      modalTitle: "Talent Request",
      modalHint: 'Example: "5 Java Developers with Cloud Exp"',
      modalQueryLabel: "What talent are you looking for?",
      modalCountLabel: "How many profiles do you need?",
      modalCountHint: "We recommend 3–10 for best quality.",
      send: "Send Request",
      cancel: "Cancel",
      statusUpdated: "Status updated",
    },
    ar: {
      headerEyebrow: "سوق السير الذاتية",
      headerTitle: "صيد المواهب",
      headerSubtitle: "أرسل طلبات الذكاء الاصطناعي وتابع التنفيذ.",
      newRequest: "طلب جديد",
      emptyTitle: "لا توجد طلبات بعد",
      emptyBody: "أنشئ أول طلب للبدء في مصادره المواهب.",
      modalTitle: "طلب مواهب",
      modalHint: 'مثال: "5 مطوري جافا بخبرة سحابية"',
      modalQueryLabel: "ما المواهب التي تبحث عنها؟",
      modalCountLabel: "كم عدد الملفات المطلوبة؟",
      modalCountHint: "نوصي بـ 3–10 لأفضل جودة.",
      send: "إرسال الطلب",
      cancel: "إلغاء",
      statusUpdated: "تم تحديث الحالة",
    },
  }[language];

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
            <h3 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">
              {copy.emptyTitle}
            </h3>
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
                key={request.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4"
              >
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{request.query}</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {request.count} profiles · {request.createdAt}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {request.status === "processing" && (
                    <span className="shimmer-badge">
                      {language === "ar" ? "مطابقة الذكاء" : "AI Matching"}
                    </span>
                  )}
                  <span className="rounded-full bg-[var(--chip-bg)] px-3 py-1 text-xs font-semibold text-[var(--text-primary)]">
                    {request.status}
                  </span>
                  {request.status === "fulfilled" && request.reportUrl && (
                    <Button variant="outline" onClick={() => window.open(request.reportUrl, "_blank")}>
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
                    {copy.modalQueryLabel}
                  </label>
                  <textarea
                    id="cv-request-query"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    className="w-full rounded-xl border border-[var(--panel-border)] bg-transparent px-4 py-3 text-sm text-[var(--text-primary)] outline-none"
                    rows={4}
                    name="cvRequestQuery"
                    aria-label={copy.modalTitle}
                    placeholder={copy.modalHint}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="cv-request-count" className="text-xs text-[var(--text-muted)]">
                    {copy.modalCountLabel}
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      className="h-10 w-10 rounded-xl border border-[var(--panel-border)] text-lg text-[var(--text-primary)]"
                      onClick={() => setCount((prev) => Math.max(1, prev - 1))}
                    >
                      -
                    </button>
                    <input
                      id="cv-request-count"
                      type="number"
                      value={count}
                      min={1}
                      onChange={(event) => setCount(Number(event.target.value))}
                      className="w-full rounded-xl border border-[var(--panel-border)] bg-transparent px-4 py-3 text-center text-sm text-[var(--text-primary)] outline-none"
                      name="cvRequestCount"
                      aria-label={language === "ar" ? "عدد الطلبات" : "Request count"}
                    />
                    <button
                      type="button"
                      className="h-10 w-10 rounded-xl border border-[var(--panel-border)] text-lg text-[var(--text-primary)]"
                      onClick={() => setCount((prev) => prev + 1)}
                    >
                      +
                    </button>
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">{copy.modalCountHint}</p>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-[var(--panel-border)] px-6 py-5">
              <Button variant="ghost" onClick={() => setOpenModal(false)}>
                {copy.cancel}
              </Button>
              <Button
                onClick={() => createRequest.mutate({ query, count })}
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
