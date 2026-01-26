import React, { createContext, useContext, useMemo, useState, useEffect } from "react";
import type { LanguageCode } from "../types";

interface LanguageContextValue {
  language: LanguageCode;
  dir: "ltr" | "rtl";
  setLanguage: (lang: LanguageCode) => void;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);
const LANGUAGE_STORAGE_KEY = "twt-language";

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<LanguageCode>(() => {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY) as LanguageCode | null;
    return stored ?? "en";
  });

  const dir = (language === "ar" ? "rtl" : "ltr") as "rtl" | "ltr";

  useEffect(() => {
    document.documentElement.setAttribute("dir", dir);
    document.documentElement.setAttribute("lang", language);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  }, [dir, language]);

  const value = useMemo(() => ({ language, dir, setLanguage }), [language, dir]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
};
