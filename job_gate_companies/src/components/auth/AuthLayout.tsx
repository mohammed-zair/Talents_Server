import React from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import { useTheme } from "../../contexts/ThemeContext";

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ title, subtitle, children }) => {
  const { language, setLanguage } = useLanguage();
  const { theme, setTheme } = useTheme();
  const nextTheme = theme === "trust" ? "ai" : theme === "ai" ? "cloud" : "trust";
  const copy = {
    en: {
      language: "AR",
      theme: `Theme: ${theme.toUpperCase()}`,
      portal: "Company Portal",
    },
    ar: {
      language: "EN",
      theme: `النمط: ${theme.toUpperCase()}`,
      portal: "بوابة الشركات",
    },
  }[language];

  return (
    <div className="auth-shell min-h-screen">
      <div className="auth-shell relative min-h-screen overflow-hidden">
        <div className="absolute inset-0 auth-mesh opacity-70" />
        <div className="absolute inset-0 auth-overlay-primary" />
        <div className="absolute inset-0 auth-overlay-secondary" />
        <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-12">
          <div className="absolute top-6 right-6 z-20 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTheme(nextTheme)}
              className="auth-pill rounded-full border px-3 py-1 text-xs backdrop-blur"
            >
              {copy.theme}
            </button>
            <button
              type="button"
              onClick={() => setLanguage(language === "ar" ? "en" : "ar")}
              className="auth-pill rounded-full border px-3 py-1 text-xs backdrop-blur"
            >
              {copy.language}
            </button>
          </div>
          <div className="glass-card auth-card w-full max-w-4xl rounded-3xl border p-8 backdrop-blur-xl lg:p-12">
            <div className="mb-6 flex flex-col items-center text-center">
              <div
                className="auth-badge mb-4 flex h-14 w-14 items-center justify-center rounded-3xl border"
              >
                <img src="/favicon.ico" alt="Talents We Trust" className="h-7 w-7" />
              </div>
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">{copy.portal}</p>
              <h2 className="heading-serif mt-2 text-3xl text-[var(--text-primary)]">{title}</h2>
              <p className="mt-2 text-sm text-[var(--text-muted)]">{subtitle}</p>
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
