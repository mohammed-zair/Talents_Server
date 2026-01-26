import React from "react";
import { Link } from "react-router-dom";
import AuthLayout from "../components/auth/AuthLayout";
import LoginForm from "../components/auth/LoginForm";
import { useLanguage } from "../contexts/LanguageContext";
import { motion } from "framer-motion";

const AuthLogin: React.FC = () => {
  const { language } = useLanguage();
  const copy = {
    en: {
      title: "Secure Company Login",
      subtitle: "Enter your credentials to access the command center.",
      switch: "Need an approval-based account?",
      action: "Request access",
    },
    ar: {
      title: "تسجيل دخول الشركات",
      subtitle: "أدخل بياناتك للوصول إلى لوحة القيادة.",
      switch: "تحتاج حسابًا مؤسسيًا؟",
      action: "طلب الوصول",
    },
  }[language];

  return (
    <AuthLayout title={copy.title} subtitle={copy.subtitle}>
      <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}>
        <LoginForm />
      </motion.div>
      <div className="mt-6 text-center text-xs text-[var(--text-muted)]">
        {copy.switch}{" "}
        <Link to="/register" className="text-[var(--accent)]">
          {copy.action}
        </Link>
      </div>
    </AuthLayout>
  );
};

export default AuthLogin;
