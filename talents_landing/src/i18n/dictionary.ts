export type Language = "en" | "ar";

export const dictionary = {
  en: {
    brandTop: "TALENTS",
    brandBottom: "We Trust",
    pill: "A Palace Full of Opportunities Powered by AI ✨",
    headline: "The Future of Recruitment, Powered by Precision AI.",
    subhead:
      "Connecting top talent with industry leaders through advanced matching algorithms.",
    btnDownload: "Download App",
    btnCompanies: "Companies Dashboard",
    btnJobSeekers: "Job Seekers Dashboard",
    aiEdgeTitle: "AI EDGE",
    aiEdgeBody:
      "Our matching engine is built on high-accuracy principles and adapted for talent intelligence.",
    footer: "© 2026 Talents We Trust",
    adminLink: "Admin",
    toggleTheme: "Toggle Theme",
    toggleLanguage: "Switch Language",
    pageTitle: "Talents We Trust | AI Recruitment"
  },
  ar: {
    brandTop: "المواهب",
    brandBottom: "نثق بها",
    pill: "قصر مليء بالفرص مدعوم بالذكاء الاصطناعي ✨",
    headline: "مستقبل التوظيف… بدقة مدعومة بالذكاء الاصطناعي.",
    subhead: "نربط أفضل المواهب بقادة الصناعة عبر خوارزميات مطابقة متقدمة.",
    btnDownload: "تحميل التطبيق",
    btnCompanies: "لوحة الشركات",
    btnJobSeekers: "لوحة الباحثين عن عمل",
    aiEdgeTitle: "ميزة الذكاء الاصطناعي",
    aiEdgeBody: "محرك المطابقة لدينا مبني على مبادئ عالية الدقة ومُكيّف لذكاء المواهب.",
    footer: "© 2026 Talents We Trust",
    adminLink: "المدير",
    toggleTheme: "تبديل النمط",
    toggleLanguage: "تبديل اللغة",
    pageTitle: "Talents We Trust | توظيف ذكي"
  }
} as const;

export type DictionaryKey = keyof typeof dictionary.en;
