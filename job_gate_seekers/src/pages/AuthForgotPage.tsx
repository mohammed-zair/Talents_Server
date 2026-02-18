import React, { useState } from "react";
import { Link } from "react-router-dom";
import AuthLayout from "../components/layout/AuthLayout";
import { seekerApi } from "../services/api";
import { useLanguage } from "../contexts/LanguageContext";
import { getApiErrorMessage } from "../utils/apiError";

const AuthForgotPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const { t } = useLanguage();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    try {
      await seekerApi.forgotPassword({ email });
      setMessage(t("resetLinkSent"));
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t("authFailed")));
    }
  };

  return (
    <AuthLayout title={t("forgotPassword")}>
      <form onSubmit={submit} className="space-y-3">
        <input className="field" placeholder={t("email")} value={email} onChange={(e) => setEmail(e.target.value)} />
        {message && <p className="text-sm text-emerald-400">{message}</p>}
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button className="btn-primary w-full">{t("sendResetLink")}</button>
      </form>
      <div className="mt-4 text-sm text-[var(--text-muted)]">
        <Link to="/auth/reset">{t("haveTokenResetHere")}</Link>
      </div>
    </AuthLayout>
  );
};

export default AuthForgotPage;
