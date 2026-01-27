import React from "react";
import { MoonStar, SunMedium, Globe2, Sparkles, LogOut } from "lucide-react";
import SectionHeader from "../components/shared/SectionHeader";
import Card from "../components/shared/Card";
import Button from "../components/shared/Button";
import { useLanguage } from "../contexts/LanguageContext";
import { useTheme } from "../contexts/ThemeContext";
import { clearToken } from "../services/auth";

const Settings: React.FC = () => {
  const { language, setLanguage, dir } = useLanguage();
  const { theme, setTheme } = useTheme();

  const copy = {
    en: {
      eyebrow: "Settings",
      title: "Workspace Preferences",
      subtitle: "Customize language, appearance, and access.",
      language: "Language",
      theme: "Theme",
      trust: "Trust & Authority",
      ai: "AI Innovation",
      cloud: "Cloud Dancer",
      logout: "Logout",
    },
    ar: {
      eyebrow: "الإعدادات",
      title: "تفضيلات المساحة",
      subtitle: "خصّص اللغة والمظهر وإدارة الوصول.",
      language: "اللغة",
      theme: "النمط",
      trust: "الثقة والهيبة",
      ai: "ابتكار الذكاء",
      cloud: "السحاب الأنيق",
      logout: "تسجيل الخروج",
    },
  }[language];

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow={copy.eyebrow}
        title={copy.title}
        subtitle={copy.subtitle}
      />

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <div className="space-y-5">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
                {copy.language}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  variant={language === "en" ? "primary" : "outline"}
                  onClick={() => setLanguage("en")}
                >
                  <Globe2 size={16} className="me-2" />
                  English · LTR
                </Button>
                <Button
                  variant={language === "ar" ? "primary" : "outline"}
                  onClick={() => setLanguage("ar")}
                >
                  <Globe2 size={16} className="me-2" />
                  العربية · RTL
                </Button>
                <span className="text-xs text-[var(--text-muted)] self-center">
                  {dir.toUpperCase()}
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--panel-border)] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
                {copy.theme}
              </p>
              <div className="mt-3 grid gap-2 md:grid-cols-3">
                <Button
                  variant={theme === "trust" ? "primary" : "outline"}
                  onClick={() => setTheme("trust")}
                >
                  <SunMedium size={16} className="me-2" />
                  {copy.trust}
                </Button>
                <Button
                  variant={theme === "ai" ? "primary" : "outline"}
                  onClick={() => setTheme("ai")}
                >
                  <MoonStar size={16} className="me-2" />
                  {copy.ai}
                </Button>
                <Button
                  variant={theme === "cloud" ? "primary" : "outline"}
                  onClick={() => setTheme("cloud")}
                >
                  <Sparkles size={16} className="me-2" />
                  {copy.cloud}
                </Button>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="space-y-4">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
              {language === "ar" ? "الأمان" : "Security"}
            </p>
            <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)]/40 p-4">
              <p className="text-sm text-[var(--text-primary)]">
                {language === "ar"
                  ? "سيتم تسجيل خروجك من الجلسة الحالية."
                  : "You will be signed out from the current session."}
              </p>
            </div>
            <Button
              variant="outline"
              className="border-red-300 text-red-500"
              onClick={() => {
                clearToken();
                window.location.href = "/companies/login";
              }}
            >
              <LogOut size={16} className="me-2" />
              {copy.logout}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
