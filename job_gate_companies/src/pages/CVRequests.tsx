import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { FileSearch2, Download } from "lucide-react";
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

  const copy = {
    en: {
      headerEyebrow: "CV Marketplace",
      headerTitle: "The Talent Hunter",
      headerSubtitle: "Send AI-driven requests and track fulfillment.",
      newRequest: "New Request",
      modalTitle: "Talent Request",
      modalHint: 'Example: "5 Java Developers with Cloud Exp"',
      send: "Send Request",
      cancel: "Cancel",
      statusUpdated: "Status updated",
    },
    ar: {
      headerEyebrow: "سوق السير الذاتية",
      headerTitle: "صيد المواهب",
      headerSubtitle: "أرسل طلبات الذكاء الاصطناعي وتابع التنفيذ.",
      newRequest: "طلب جديد",
      modalTitle: "طلب مواهب",
      modalHint: 'مثال: "5 مطوري جافا بخبرة سحابية"',
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
            <FileSearch2 size={14} className="me-2" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-6">
          <div className="glass-card w-full max-w-lg rounded-3xl border p-6">
            <h3 className="heading-serif text-xl text-[var(--text-primary)]">{copy.modalTitle}</h3>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              {copy.modalHint}
            </p>
            <div className="mt-4 space-y-3">
              <textarea
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="w-full rounded-xl border border-[var(--panel-border)] bg-transparent px-4 py-3 text-sm text-[var(--text-primary)] outline-none"
                rows={3}
                name="cvRequestQuery"
                aria-label={copy.modalTitle}
              />
              <input
                type="number"
                value={count}
                onChange={(event) => setCount(Number(event.target.value))}
                className="w-full rounded-xl border border-[var(--panel-border)] bg-transparent px-4 py-3 text-sm text-[var(--text-primary)] outline-none"
                name="cvRequestCount"
                aria-label={language === "ar" ? "عدد الطلبات" : "Request count"}
              />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setOpenModal(false)}>
                {copy.cancel}
              </Button>
              <Button onClick={() => createRequest.mutate({ query, count })}>
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
