import React from "react";
import { Languages, Moon, Sun } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";
import { useLanguage } from "../contexts/LanguageContext";

const Navbar: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();

  return (
    <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
      <div className="flex items-center gap-3">
        <img src="/logo.png" alt="Talents We Trust" className="h-10 w-10 rounded-2xl object-cover" />
        <div>
          <p className="text-xs tracking-[0.3em] text-white/60 dark:text-white/60">{t("brandTop")}</p>
          <p className="text-sm font-semibold">{t("brandBottom")}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={toggleTheme}
          title={t("toggleTheme")}
          aria-label={t("toggleTheme")}
          className="lang-btn rounded-xl p-2"
        >
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        <div className="lang-btn flex items-center gap-1 rounded-xl px-2 py-1" title={t("toggleLanguage")}>
          <Languages size={14} className="opacity-70" />
          <button
            type="button"
            onClick={() => setLanguage("en")}
            className={`lang-switch rounded-lg px-2 py-1 text-xs ${language === "en" ? "active" : ""}`}
          >
            EN
          </button>
          <button
            type="button"
            onClick={() => setLanguage("ar")}
            className={`lang-switch rounded-lg px-2 py-1 text-xs ${language === "ar" ? "active" : ""}`}
          >
            AR
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
