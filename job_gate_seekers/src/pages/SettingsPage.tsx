import React from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";
import { useTheme } from "../contexts/ThemeContext";
import { clearSession } from "../utils/auth";

const SettingsPage: React.FC = () => {
  const { t, language, setLanguage } = useLanguage();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      <div className="glass-card p-5">
        <h1 className="text-2xl font-bold">{t("settings")}</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">{t("settingsSubtitle")}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="glass-card p-4">
          <h2 className="mb-3 text-lg font-semibold">{t("language")}</h2>
          <div className="flex flex-wrap gap-2">
            <button
              className={`rounded-xl border px-4 py-2 ${language === "en" ? "nav-active" : "border-[var(--border)]"}`}
              onClick={() => setLanguage("en")}
            >
              English
            </button>
            <button
              className={`rounded-xl border px-4 py-2 ${language === "ar" ? "nav-active" : "border-[var(--border)]"}`}
              onClick={() => setLanguage("ar")}
            >
              العربية
            </button>
          </div>
        </div>

        <div className="glass-card p-4">
          <h2 className="mb-3 text-lg font-semibold">{t("theme")}</h2>
          <div className="flex flex-wrap gap-2">
            <button
              className={`rounded-xl border px-4 py-2 ${theme === "dark" ? "nav-active" : "border-[var(--border)]"}`}
              onClick={() => setTheme("dark")}
            >
              {t("themeDark")}
            </button>
            <button
              className={`rounded-xl border px-4 py-2 ${theme === "light" ? "nav-active" : "border-[var(--border)]"}`}
              onClick={() => setTheme("light")}
            >
              {t("themeLight")}
            </button>
            <button
              className={`rounded-xl border px-4 py-2 ${theme === "premium" ? "nav-active" : "border-[var(--border)]"}`}
              onClick={() => setTheme("premium")}
            >
              {t("themePremium")}
            </button>
          </div>
        </div>
      </div>

      <div className="glass-card p-4">
        <h2 className="mb-3 text-lg font-semibold">{t("accountActions")}</h2>
        <div className="flex flex-wrap gap-2">
          <button
            className="rounded-xl border border-[var(--border)] px-4 py-2"
            onClick={() => navigate("/profile")}
          >
            {t("profile")}
          </button>
          <button
            className="rounded-xl border border-[var(--border)] px-4 py-2"
            onClick={() => navigate("/applications")}
          >
            {t("applications")}
          </button>
          <button
            className="rounded-xl border border-[var(--border)] px-4 py-2 text-red-400"
            onClick={() => {
              clearSession();
              navigate("/auth/login", { replace: true });
            }}
          >
            {t("logout")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
