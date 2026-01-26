import type { LanguageCode } from "../types";

export const mapAuthError = (status?: number, lang: LanguageCode = "en") => {
  const messages = {
    en: {
      401: "Invalid credentials. Please check your email and password.",
      403: "Your account is not approved yet. Please wait for admin approval.",
      422: "Some fields are missing or invalid. Please review and try again.",
      default: "Something went wrong. Please try again.",
    },
    ar: {
      401: "بيانات الدخول غير صحيحة. يرجى التحقق من البريد وكلمة المرور.",
      403: "الحساب قيد المراجعة. يرجى انتظار موافقة المسؤول.",
      422: "بعض الحقول ناقصة أو غير صحيحة. يرجى المراجعة والمحاولة مجددًا.",
      default: "حدث خطأ. يرجى المحاولة مرة أخرى.",
    },
  };

  const localized = messages[lang] ?? messages.en;
  return (status && localized[status as 401 | 403 | 422]) || localized.default;
};
