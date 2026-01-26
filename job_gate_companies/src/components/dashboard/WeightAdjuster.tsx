import React from "react";
import type { Weighting } from "../../hooks/useAI/useAI";
import { useLanguage } from "../../contexts/LanguageContext";

interface WeightAdjusterProps {
  weights: Weighting;
  onChange: (weights: Weighting) => void;
}

const WeightAdjuster: React.FC<WeightAdjusterProps> = ({ weights, onChange }) => {
  const { language } = useLanguage();
  const labels = {
    en: { title: "Adjust Weights", education: "Education", experience: "Experience", skills: "Skills" },
    ar: { title: "تعديل الأوزان", education: "التعليم", experience: "الخبرة", skills: "المهارات" },
  }[language];
  const handleChange = (key: keyof Weighting) => (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...weights, [key]: Number(event.target.value) });
  };

  return (
    <div className="glass-card rounded-2xl border p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
        {labels.title}
      </p>
      <div className="mt-4 space-y-4 text-sm text-[var(--text-primary)]">
        {([
          [labels.education, "education"],
          [labels.experience, "experience"],
          [labels.skills, "skills"],
        ] as const).map(([label, key]) => (
          <div key={key} className="space-y-2">
            <div className="flex items-center justify-between">
              <span>{label}</span>
              <span className="text-xs text-[var(--text-muted)]">
                {(weights[key] * 100).toFixed(0)}%
              </span>
            </div>
            <input
              type="range"
              min={0.1}
              max={0.7}
              step={0.05}
              value={weights[key]}
              onChange={handleChange(key)}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-[var(--accent)]"
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default WeightAdjuster;
