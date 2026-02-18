import React, { useState } from "react";
import { Link } from "react-router-dom";
import AuthLayout from "../components/layout/AuthLayout";
import { seekerApi } from "../services/api";
import { useLanguage } from "../contexts/LanguageContext";
import { getApiErrorMessage } from "../utils/apiError";

const AuthResetPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const { t } = useLanguage();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    try {
      await seekerApi.resetPassword({ email, token, newPassword });
      setMessage(t("passwordResetDone"));
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t("authFailed")));
    }
  };

  return (
    <AuthLayout title={t("resetPassword")}>
      <form onSubmit={submit} className="space-y-3">
        <input className="field" placeholder={t("email")} value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="field" placeholder={t("resetToken")} value={token} onChange={(e) => setToken(e.target.value)} />
        <input className="field" placeholder={t("newPassword")} type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
        {message && <p className="text-sm text-emerald-400">{message}</p>}
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button className="btn-primary w-full">{t("resetPasswordBtn")}</button>
      </form>
      <div className="mt-4 text-sm text-[var(--text-muted)]">
        <Link to="/auth/login">{t("backToLogin")}</Link>
      </div>
    </AuthLayout>
  );
};

export default AuthResetPage;
