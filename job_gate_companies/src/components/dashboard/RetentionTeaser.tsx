import React from "react";
import { Lock } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";

const RetentionTeaser: React.FC = () => {
  const { language } = useLanguage();
  const copy = {
    en: {
      badge: "Pro Forecast",
      title: "Predictive Retention Signals",
      body:
        "AI identifies candidates likely to stay beyond 24 months. Launching with Bias-Shield Mode and privacy-first signals.",
    },
    ar: {
      badge: "تنبؤ احترافي",
      title: "إشارات الاحتفاظ التنبؤية",
      body:
        "يحدد الذكاء الاصطناعي المرشحين الأكثر بقاءً لأكثر من 24 شهرًا مع وضع إخفاء التحيز.",
    },
  }[language];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-dashed border-[var(--panel-border)] bg-[var(--panel-bg)] p-6">
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/10 to-transparent blur-xl" />
      <div className="relative z-10 flex flex-col gap-3">
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-[var(--chip-bg)] px-3 py-1 text-xs font-semibold text-[var(--text-primary)]">
          <Lock size={14} /> {copy.badge}
        </span>
        <h3 className="heading-serif text-xl text-[var(--text-primary)]">
          {copy.title}
        </h3>
        <p className="text-sm text-[var(--text-muted)]">
          {copy.body}
        </p>
      </div>
      <div className="absolute inset-0 backdrop-blur-md" />
    </div>
  );
};

export default RetentionTeaser;
