import React from "react";
import { Info } from "lucide-react";
import Badge from "../shared/Badge";
import RadialGauge from "../shared/RadialGauge";
import type { CandidateProfile } from "../../types";
import { useLanguage } from "../../contexts/LanguageContext";

interface StrategicMatchCardProps {
  candidate: CandidateProfile;
  onSelect?: () => void;
}

const StrategicMatchCard: React.FC<StrategicMatchCardProps> = ({ candidate, onSelect }) => {
  const { language } = useLanguage();
  return (
    <button
      type="button"
      onClick={onSelect}
      className="smooth-hover w-full rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4 text-start hover:-translate-y-0.5 hover:shadow-soft-ambient"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">{candidate.name}</h3>
          <p className="text-xs text-[var(--text-muted)]">
            {candidate.role ?? "—"} · {candidate.location ?? "—"}
          </p>
        </div>
        <RadialGauge
          value={candidate.atsScore?.score ?? 0}
          max={candidate.atsScore?.max ?? 100}
          size={54}
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {(candidate.insightTags ?? []).map((tag) => (
          <Badge key={tag} label={tag} />
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-[var(--text-muted)]">
        <span>{candidate.education ?? "—"}</span>
        <span className="inline-flex items-center gap-1">
          <Info size={12} />
          {language === "ar" ? "Ù„Ù…Ø§Ø°Ø§ Ù‡Ø°Ø§ Ø§Ù„ØªØ·Ø§Ø¨Ù‚ØŸ" : "Why this match?"}
        </span>
      </div>
    </button>
  );
};

export default StrategicMatchCard;
