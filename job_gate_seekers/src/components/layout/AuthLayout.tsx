import React from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../../contexts/LanguageContext";

const AuthLayout: React.FC<React.PropsWithChildren<{ title: string; subtitle?: string }>> = ({
  title,
  subtitle,
  children,
}) => {
  const { t, language, setLanguage } = useLanguage();

  return (
    <div className="min-h-screen mesh-bg p-4">
      <div className="mx-auto flex min-h-[90vh] max-w-5xl items-center justify-center">
        <div className="glass-panel grid w-full overflow-hidden rounded-3xl border border-[var(--border)] md:grid-cols-2">
          <div className="p-8">
            <div className="mb-4 flex justify-end">
              <button
                className="rounded-xl border border-[var(--border)] px-3 py-2 text-xs"
                onClick={() => setLanguage(language === "en" ? "ar" : "en")}
              >
                {language.toUpperCase()}
              </button>
            </div>
            <Link to="/auth/login" className="mb-4 inline-flex items-center gap-2">
              <img src="/logo.png" alt="Talents" className="h-10 w-10 rounded-2xl object-cover" />
              <div>
                <p className="text-xs tracking-[0.35em] text-[var(--text-muted)]">TALENTS</p>
                <p className="text-sm font-semibold">We Trust</p>
              </div>
            </Link>
            <h1 className="text-2xl font-bold">{title}</h1>
            {subtitle && <p className="mt-2 text-sm text-[var(--text-muted)]">{subtitle}</p>}
            <div className="mt-6">{children}</div>
          </div>
          <div className="hidden items-center justify-center bg-[var(--glass)] p-8 md:flex">
            <div className="space-y-4">
              <p className="rounded-full border border-[var(--border)] px-3 py-1 text-xs">{t("authTagline")}</p>
              <p className="text-3xl font-bold leading-snug">{t("authHeadline")}</p>
              <p className="text-sm text-[var(--text-muted)]">{t("authDescription")}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
