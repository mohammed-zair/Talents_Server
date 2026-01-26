import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { ChevronRight, Zap } from "lucide-react";
import SectionHeader from "../components/shared/SectionHeader";
import Card from "../components/shared/Card";
import Button from "../components/shared/Button";
import Skeleton from "../components/shared/Skeleton";
import SkillsCloud from "../components/dashboard/SkillsCloud";
import { companyApi } from "../services/api/api";
import type { ApplicationItem } from "../types";
import { useLanguage } from "../contexts/LanguageContext";

const stages: Array<ApplicationItem["stage"]> = [
  "screening",
  "interview",
  "offer",
  "hired",
];

const ApplicationDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [fading, setFading] = useState(false);
  const { language } = useLanguage();

  const copy = {
    en: {
      headerEyebrow: "Applications Workflow",
      headerTitle: "Decision Side-Panel",
      timeline: "Status Timeline",
      advance: "Advance",
      shortlist: "Shortlist",
      archive: "Archive",
      aiBreakdown: "AI Score Breakdown",
      skillsHeatmap: "Skills Heatmap",
      whyMatch: "Why this match?",
      matchReason:
        "Strong ATS alignment in leadership outcomes and advanced product delivery.",
      notFound: "No application found.",
    },
    ar: {
      headerEyebrow: "سير الطلبات",
      headerTitle: "لوحة القرار",
      timeline: "خط الحالة",
      advance: "ترقية",
      shortlist: "ترشيح",
      archive: "أرشفة",
      aiBreakdown: "تفاصيل درجة الذكاء",
      skillsHeatmap: "خريطة المهارات",
      whyMatch: "لماذا هذا التطابق؟",
      matchReason: "توافق قوي مع معايير ATS في النتائج والقيادة وتنفيذ المنتجات.",
      notFound: "لم يتم العثور على الطلب.",
    },
  }[language];

  const { data, isLoading } = useQuery({
    queryKey: ["application", id],
    queryFn: () => companyApi.getApplicationById(id ?? ""),
    enabled: Boolean(id),
  });

  const updateStatus = useMutation({
    mutationFn: ({ applicationId, status }: { applicationId: string; status: string }) =>
      companyApi.updateApplicationStatus(applicationId, status),
    onSuccess: () => {
      toast.success(language === "ar" ? "تم تحديث الحالة" : "Status updated");
      queryClient.invalidateQueries({ queryKey: ["application", id] });
      setFading(false);
    },
    onError: () => {
      toast.error(language === "ar" ? "تعذر تحديث الحالة" : "Failed to update status");
      setFading(false);
    },
  });

  const handleAction = (status: ApplicationItem["stage"]) => {
    if (!id) return;
    setFading(true);
    updateStatus.mutate({ applicationId: id, status });
  };

  if (isLoading) {
    return (
      <Card>
        <Skeleton className="h-36" />
        <Skeleton className="mt-4 h-24" />
      </Card>
    );
  }

  if (!data) {
    return <Card>{copy.notFound}</Card>;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-6">
        <SectionHeader
          eyebrow={copy.headerEyebrow}
          title={copy.headerTitle}
          subtitle={`${data.candidate.name} · ${data.jobTitle}`}
        />
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                {data.candidate.role}
              </p>
              <p className="text-xs text-[var(--text-muted)]">{data.candidate.location}</p>
            </div>
            <span className="rounded-full bg-[var(--chip-bg)] px-3 py-1 text-xs font-semibold text-[var(--text-primary)]">
              {data.stage}
            </span>
          </div>

          <div className="mt-6 space-y-4">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
              {copy.timeline}
            </p>
            <div className="relative space-y-4 ps-6">
              <div className="absolute inset-y-0 start-2 w-px bg-[var(--panel-border)]" />
              {stages.map((stage, index) => (
                <div key={stage} className="flex items-center gap-3">
                  <div
                    className={`h-3 w-3 rounded-full ${
                      stages.indexOf(data.stage) >= index
                        ? "bg-[var(--accent)]"
                        : "bg-slate-300"
                    }`}
                  />
                  <span className="text-sm text-[var(--text-primary)]">{stage}</span>
                </div>
              ))}
            </div>
          </div>

          <motion.div
            className="mt-6 flex flex-wrap gap-2"
            animate={{ opacity: fading ? 0.4 : 1 }}
          >
            <Button onClick={() => handleAction("interview")}>{copy.advance}</Button>
            <Button variant="outline" onClick={() => handleAction("offer")}>
              {copy.shortlist}
            </Button>
            <Button
              variant="outline"
              onClick={() => handleAction("rejected")}
              className="border-red-300 text-red-500"
            >
              {copy.archive}
            </Button>
          </motion.div>
        </Card>
      </div>

      <Card>
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
          <Zap size={16} className="text-[var(--accent)]" />
          {copy.aiBreakdown}
        </div>
        <div className="mt-4 space-y-3 text-xs text-[var(--text-muted)]">
          {[
            { label: language === "ar" ? "الخبرة" : "Experience", value: 84 },
            { label: language === "ar" ? "التعليم" : "Education", value: 78 },
            { label: language === "ar" ? "المهارات" : "Skills", value: 92 },
          ].map((metric) => (
            <div key={metric.label} className="space-y-1">
              <div className="flex items-center justify-between">
                <span>{metric.label}</span>
                <span>{metric.value}%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-200">
                <div
                  className="h-2 rounded-full bg-[var(--accent)]"
                  style={{ width: `${metric.value}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
            {copy.skillsHeatmap}
          </p>
          <div className="mt-3">
            <SkillsCloud skills={data.candidate.skills} />
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-dashed border-[var(--panel-border)] p-3 text-xs text-[var(--text-muted)]">
          <div className="flex items-center gap-2 text-[var(--text-primary)]">
            {copy.whyMatch}
            <ChevronRight size={12} />
          </div>
          {copy.matchReason}
        </div>
      </Card>
    </div>
  );
};

export default ApplicationDetail;
