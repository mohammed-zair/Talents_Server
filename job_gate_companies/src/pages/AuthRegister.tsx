import React from "react";
import { Link } from "react-router-dom";
import AuthLayout from "../components/auth/AuthLayout";
import RegisterForm from "../components/auth/RegisterForm";
import { useLanguage } from "../contexts/LanguageContext";

const AuthRegister: React.FC = () => {
  const { language } = useLanguage();
  const copy = {
    en: {
      title: "Company Approval Request",
      subtitle: "Submit your company profile for admin review.",
      switch: "Already approved?",
      action: "Sign in",
    },
    ar: {
      title: "طلب اعتماد الشركة",
      subtitle: "أرسل بيانات الشركة لمراجعة الإدارة.",
      switch: "تمت الموافقة بالفعل؟",
      action: "تسجيل الدخول",
    },
  }[language];

  return (
    <AuthLayout title={copy.title} subtitle={copy.subtitle}>
      <div>
        <RegisterForm />
      </div>
      <div className="mt-6 text-center text-xs text-[var(--text-muted)]">
        {copy.switch}{" "}
        <Link to="/login" className="text-[var(--accent)]">
          {copy.action}
        </Link>
      </div>
    </AuthLayout>
  );
};

export default AuthRegister;
