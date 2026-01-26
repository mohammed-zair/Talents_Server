import React from "react";
import { useParams, Link } from "react-router-dom";
import AuthLayout from "../components/auth/AuthLayout";
import PasswordManagement from "../components/auth/PasswordManagement";
import { useLanguage } from "../contexts/LanguageContext";

const AuthPassword: React.FC = () => {
  const { mode } = useParams<{ mode: "set" | "reset" }>();
  const { language } = useLanguage();
  const isSet = mode === "set";

  const copy = {
    en: {
      title: isSet ? "Set Initial Password" : "Reset Password",
      subtitle: isSet
        ? "Use your approval token to secure the account."
        : "We will send a 6-digit OTP to your email.",
      back: "Back to login",
    },
    ar: {
      title: isSet ? "تعيين كلمة المرور" : "إعادة تعيين كلمة المرور",
      subtitle: isSet
        ? "استخدم رمز الموافقة لتأمين الحساب."
        : "سنرسل رمز تحقق مكوّن من 6 أرقام إلى بريدك.",
      back: "العودة لتسجيل الدخول",
    },
  }[language];

  return (
    <AuthLayout title={copy.title} subtitle={copy.subtitle}>
      <PasswordManagement mode={isSet ? "set" : "reset"} />
      <div className="mt-6 text-center text-xs text-[var(--text-muted)]">
        <Link to="/login" className="text-[var(--accent)]">
          {copy.back}
        </Link>
      </div>
    </AuthLayout>
  );
};

export default AuthPassword;
