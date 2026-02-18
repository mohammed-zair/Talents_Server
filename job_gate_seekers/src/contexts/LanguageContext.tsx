import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Language } from "../types/api";

type Dict = Record<string, string>;

type LanguageContextValue = {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
};

const dictionary: Record<Language, Dict> = {
  en: {
    appTitle: "Talents We Trust | Job Seeker",
    pulse: "The Pulse",
    opportunities: "Opportunity Map",
    cvLab: "CV Lab",
    aiConsultant: "AI Consultant",
    market: "Market",
    consultants: "Consultants",
    applications: "Applications",
    profile: "Profile",
    searchPlaceholder: "Search jobs, companies, skills...",
    premiumUpgrade: "Premium Upgrade",
    login: "Login",
    register: "Create account",
    forgotPassword: "Forgot password",
    resetPassword: "Reset password",
    email: "Email",
    password: "Password",
    fullName: "Full name",
    phone: "Phone",
    submit: "Submit",
    logout: "Logout",
    atsHealth: "ATS Health",
    applicationFunnel: "Application Funnel",
    skillRadar: "Skill Radar",
    quickApply: "Quick Apply + Smart Pitch",
    aiStudio: "AI Studio",
    mockInterview: "Mock Interview Mode",
  },
  ar: {
    appTitle: "Talents We Trust | الباحث عن عمل",
    pulse: "النبض",
    opportunities: "خريطة الفرص",
    cvLab: "مختبر السيرة",
    aiConsultant: "المستشار الذكي",
    market: "السوق",
    consultants: "سوق المستشارين",
    applications: "الطلبات",
    profile: "الملف الشخصي",
    searchPlaceholder: "ابحث عن وظيفة أو شركة أو مهارة...",
    premiumUpgrade: "ترقية بريميوم",
    login: "تسجيل الدخول",
    register: "إنشاء حساب",
    forgotPassword: "نسيت كلمة المرور",
    resetPassword: "إعادة تعيين كلمة المرور",
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    fullName: "الاسم الكامل",
    phone: "الهاتف",
    submit: "إرسال",
    logout: "تسجيل الخروج",
    atsHealth: "صحة ATS",
    applicationFunnel: "مسار الطلبات",
    skillRadar: "رادار المهارات",
    quickApply: "تقديم سريع + عرض ذكي",
    aiStudio: "استوديو الذكاء الاصطناعي",
    mockInterview: "وضع المقابلة التجريبية",
  },
};

const LanguageContext = createContext<LanguageContextValue | null>(null);
const KEY = "twt_seeker_language";

export const LanguageProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    const stored = localStorage.getItem(KEY);
    return stored === "ar" ? "ar" : "en";
  });

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
    localStorage.setItem(KEY, language);
  }, [language]);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t: (key: string) => dictionary[language][key] || key,
    }),
    [language]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used inside LanguageProvider");
  return ctx;
};