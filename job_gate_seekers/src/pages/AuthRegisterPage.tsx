import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../components/layout/AuthLayout";
import { seekerApi } from "../services/api";
import { useLanguage } from "../contexts/LanguageContext";
import { getApiErrorMessage } from "../utils/apiError";
import { setSession } from "../utils/auth";

const AuthRegisterPage: React.FC = () => {
  const [full_name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { t } = useLanguage();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await seekerApi.register({ full_name, email, password, phone });
      setSession(res.token, res.user);
      navigate("/pulse", { replace: true });
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t("registrationFailed")));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title={t("createJobSeekerAccount")} subtitle={t("registrationWorkflow")}>
      <form onSubmit={submit} className="space-y-3">
        <input className="field" placeholder={t("fullName")} value={full_name} onChange={(e) => setName(e.target.value)} />
        <input className="field" placeholder={t("email")} value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="field" placeholder={t("phone")} value={phone} onChange={(e) => setPhone(e.target.value)} />
        <input className="field" placeholder={t("password")} type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button className="btn-primary w-full" disabled={loading}>{loading ? "..." : t("createAccount")}</button>
      </form>
      <div className="mt-4 text-sm text-[var(--text-muted)]">
        <Link to="/auth/login">{t("alreadyHaveAccount")}</Link>
      </div>
    </AuthLayout>
  );
};

export default AuthRegisterPage;
