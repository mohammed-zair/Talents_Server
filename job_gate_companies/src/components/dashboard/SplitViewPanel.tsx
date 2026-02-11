import React from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import SkillsCloud from "./SkillsCloud";
import Badge from "../shared/Badge";
import type { CandidateProfile } from "../../types";
import { useLanguage } from "../../contexts/LanguageContext";

interface SplitViewPanelProps {
  candidate: CandidateProfile | null;
  onClose: () => void;
}

const SplitViewPanel: React.FC<SplitViewPanelProps> = ({ candidate, onClose }) => {
  const { language } = useLanguage();
  return (
    <>
      {candidate && (
        <div
          className="fixed inset-0 z-30 bg-black/30"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <motion.aside
        initial={{ x: "100%" }}
        animate={{ x: candidate ? 0 : "100%" }}
        transition={{ type: "spring", stiffness: 260, damping: 30 }}
        className="fixed inset-y-0 z-40 w-full max-w-md border border-[var(--panel-border)] bg-[var(--panel-bg)] p-6 shadow-soft-ambient backdrop-blur-md"
        style={{ insetInlineEnd: 0 }}
        onPointerDown={(event) => event.stopPropagation()}
      >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
            {language === "ar" ? "ملخص الذكاء" : "AI Summary"}
          </p>
          <h3 className="heading-serif text-xl text-[var(--text-primary)]">
            {candidate?.name ?? (language === "ar" ? "اختر مرشحًا" : "Select a candidate")}
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="smooth-hover rounded-full border border-[var(--panel-border)] p-2 text-[var(--text-primary)] hover:bg-[var(--chip-bg)]"
        >
          <X size={16} />
        </button>
      </div>

      {candidate && (
        <div className="mt-6 space-y-6 text-sm text-[var(--text-primary)]">
          <div className="flex flex-wrap gap-2">
            {(candidate.insightTags ?? []).map((tag) => (
              <Badge key={tag} label={tag} />
            ))}
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)]">
              {language === "ar" ? "خريطة المهارات" : "Heat-mapped Skills Cloud"}
            </p>
            <div className="mt-2">
              <SkillsCloud skills={candidate.skills ?? []} />
            </div>
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)]">
              {language === "ar" ? "نقاط الملخص" : "AI Summary Bullets"}
            </p>
            <ul className="mt-2 list-disc space-y-2 ps-5">
              {(candidate.summaryBullets ?? []).map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-dashed border-[var(--panel-border)] p-3 text-xs text-[var(--text-muted)]">
            {language === "ar"
              ? "توافق قوي مع ATS في نطاق القيادة والنتائج القابلة للقياس."
              : "Why this match? Strong ATS alignment on leadership scope and measurable outcomes. Skills gap highlights cross-domain AI planning for the next interview round."}
          </div>
        </div>
      )}
      </motion.aside>
    </>
  );
};

export default SplitViewPanel;
