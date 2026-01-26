import React from "react";
import { Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "../../contexts/LanguageContext";
import type { CandidateProfile } from "../../types";

interface PulseHeaderProps {
  message?: string;
  highMatchesCount?: number;
  hiringVelocityDays?: number;
  candidates?: CandidateProfile[];
}

const getPulseMessage = ({
  highMatchesCount,
  hiringVelocityDays,
  candidates,
  language,
}: {
  highMatchesCount?: number;
  hiringVelocityDays?: number;
  candidates?: CandidateProfile[];
  language: "en" | "ar";
}) => {
  const highAts =
    highMatchesCount ??
    candidates?.filter((candidate) => candidate.atsScore.score >= 80).length ??
    0;

  if (highAts >= 3) {
    return language === "ar"
      ? "مرشحون عاليـو الإمكانيات بانتظار المراجعة."
      : "High-potential candidates are waiting for your review.";
  }

  if (hiringVelocityDays && hiringVelocityDays > 18) {
    return language === "ar"
      ? "فكر في تحسين وصف الوظيفة لزيادة تدفق المرشحين."
      : "Consider optimizing your job description to increase candidate flow.";
  }

  return language === "ar"
    ? "مؤشرات الذكاء تتحدث الآن. راجع التطابقات الاستراتيجية."
    : "AI signals are live. Review strategic matches now.";
};

const PulseHeader: React.FC<PulseHeaderProps> = ({
  message,
  highMatchesCount,
  hiringVelocityDays,
  candidates,
}) => {
  const { language } = useLanguage();
  const resolved =
    message ??
    getPulseMessage({
      highMatchesCount,
      hiringVelocityDays,
      candidates,
      language,
    });

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-2 rounded-full border border-[var(--panel-border)] bg-[var(--panel-bg)] px-4 py-2 text-xs text-[var(--text-primary)] shadow-soft-ambient"
      style={{ boxShadow: `0 0 20px var(--glow)` }}
    >
      <motion.span
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        className="flex items-center"
      >
        <Sparkles size={14} className="text-[var(--accent)]" />
      </motion.span>
      <span>{resolved}</span>
    </motion.div>
  );
};

export default PulseHeader;
export { getPulseMessage };
