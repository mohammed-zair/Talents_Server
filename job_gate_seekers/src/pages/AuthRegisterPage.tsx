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
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { t, language } = useLanguage();

  const sendOtp = async () => {
    setError("");
    if (!email.trim()) {
      setError(t("email"));
      return;
    }
    try {
      setOtpLoading(true);
      await seekerApi.sendRegistrationOtp({
        email,
        full_name,
        language: language === "ar" ? "ar" : "en",
      });
      setOtpSent(true);
      setOtpVerified(false);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t("sendOtpFailed")));
    } finally {
      setOtpLoading(false);
    }
  };

  const verifyOtp = async () => {
    setError("");
    if (!email.trim() || !otp.trim()) {
      setError(t("emailOtpRequired"));
      return;
    }
    try {
      setVerifyLoading(true);
      await seekerApi.verifyRegistrationOtp({ email, otp });
      setOtpVerified(true);
    } catch (err: unknown) {
      setOtpVerified(false);
      setError(getApiErrorMessage(err, t("invalidOtp")));
    } finally {
      setVerifyLoading(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!otpVerified) {
      setError(t("verifyEmailOtpFirst"));
      return;
    }
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
        <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-2)] p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--text-muted)]">{t("otpCode")}</span>
            <span
              className={`rounded-full px-2 py-1 text-[11px] ${
                otpVerified
                  ? "bg-emerald-500/20 text-emerald-300"
                  : "bg-amber-500/20 text-amber-300"
              }`}
            >
              {otpVerified ? t("verified") : t("verifyOtp")}
            </span>
          </div>
          <div className="flex flex-col gap-2 md:flex-row">
            <button type="button" className="btn-secondary md:w-40" onClick={sendOtp} disabled={otpLoading}>
              {otpLoading ? "..." : otpSent ? t("resendRegistrationOtp") : t("sendRegistrationOtp")}
            </button>
            <input
              className="field flex-1"
              placeholder={t("otpCode")}
              value={otp}
              inputMode="numeric"
              maxLength={6}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            />
            <button
              type="button"
              className="btn-secondary md:w-36"
              onClick={verifyOtp}
              disabled={verifyLoading || !otp.trim()}
            >
              {verifyLoading ? "..." : otpVerified ? t("verified") : t("verifyOtp")}
            </button>
          </div>
        </div>
        <input className="field" placeholder={t("phone")} value={phone} onChange={(e) => setPhone(e.target.value)} />
        <input className="field" placeholder={t("password")} type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button className="btn-primary w-full" disabled={loading || !otpVerified}>
          {loading ? "..." : t("createAccount")}
        </button>
      </form>
      <div className="mt-4 text-sm text-[var(--text-muted)]">
        <Link to="/auth/login">{t("alreadyHaveAccount")}</Link>
      </div>
    </AuthLayout>
  );
};

export default AuthRegisterPage;
