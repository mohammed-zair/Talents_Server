import React from "react";
import { Wand2 } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";

const steps = [
  { title: "Role Basics", description: "Define title, team, and location." },
  { title: "Impact Scope", description: "Clarify outcomes and key metrics." },
  { title: "ATS Reach", description: "Finalize skills and requirements." },
];

const JobCreationStepper: React.FC = () => {
  const { language } = useLanguage();
  const copy = {
    en: {
      title: "Job Creation Wizard",
      badge: "AI Co-pilot",
      steps,
      tip:
        "AI suggests: add “strategic stakeholder management” and “KPIs” to improve ATS reach.",
    },
    ar: {
      title: "معالج إنشاء الوظيفة",
      badge: "مساعد الذكاء",
      steps: [
        { title: "أساسيات الدور", description: "تحديد العنوان والفريق والموقع." },
        { title: "نطاق التأثير", description: "توضيح النتائج والمؤشرات." },
        { title: "تحسين ATS", description: "إنهاء المهارات والمتطلبات." },
      ],
      tip: "اقتراح: أضف إدارة أصحاب المصلحة وKPIs لتحسين الوصول.",
    },
  }[language];

  return (
    <div className="glass-card rounded-2xl border p-5">
      <div className="flex items-center justify-between">
        <h3 className="heading-serif text-lg text-[var(--text-primary)]">{copy.title}</h3>
        <span className="rounded-full bg-[var(--chip-bg)] px-3 py-1 text-xs font-semibold text-[var(--text-primary)]">
          {copy.badge}
        </span>
      </div>
      <div className="mt-4 space-y-4">
        {copy.steps.map((step, index) => (
          <div
            key={step.title}
            className="flex items-start gap-3 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-3"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--chip-bg)] text-sm font-semibold text-[var(--text-primary)]">
              {index + 1}
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">{step.title}</p>
              <p className="text-xs text-[var(--text-muted)]">{step.description}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-xl border border-dashed border-[var(--panel-border)] p-3 text-xs text-[var(--text-muted)]">
        <div className="flex items-center gap-2 text-[var(--text-primary)]">
          <Wand2 size={14} className="text-[var(--accent)]" />
          {copy.tip}
        </div>
      </div>
    </div>
  );
};

export default JobCreationStepper;
