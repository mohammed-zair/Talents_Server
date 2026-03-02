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
      setError(getApiErrorMessage(err, "Failed to send OTP."));
    } finally {
      setOtpLoading(false);
    }
  };

  const verifyOtp = async () => {
    setError("");
    if (!email.trim() || !otp.trim()) {
      setError("Email and OTP are required.");
      return;
    }
    try {
      setVerifyLoading(true);
      await seekerApi.verifyRegistrationOtp({ email, otp });
      setOtpVerified(true);
    } catch (err: unknown) {
      setOtpVerified(false);
      setError(getApiErrorMessage(err, "Invalid OTP."));
    } finally {
      setVerifyLoading(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!otpVerified) {
      setError("Please verify your email OTP first.");
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
        <div className="flex gap-2">
          <button type="button" className="btn-secondary" onClick={sendOtp} disabled={otpLoading}>
            {otpLoading ? "..." : otpSent ? "Resend OTP" : "Send OTP"}
          </button>
          <input
            className="field flex-1"
            placeholder="OTP code"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
          />
          <button type="button" className="btn-secondary" onClick={verifyOtp} disabled={verifyLoading || !otp.trim()}>
            {verifyLoading ? "..." : otpVerified ? "Verified" : "Verify OTP"}
          </button>
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
