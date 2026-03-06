import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../components/layout/AuthLayout";
import { seekerApi } from "../services/api";
import { useLanguage } from "../contexts/LanguageContext";
import { getApiErrorMessage } from "../utils/apiError";
import { setSession } from "../utils/auth";

const OTP_LENGTH = 6;

const formatCountdown = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const AuthRegisterPage: React.FC = () => {
  const [full_name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [preferredLanguage, setPreferredLanguage] = useState<"en" | "ar">("en");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [step, setStep] = useState(1);
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [otpLoading, setOtpLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const navigate = useNavigate();
  const { t, language } = useLanguage();

  const canContinueStep1 = full_name.trim().length > 1 && email.trim().length > 3;
  const canContinueStep2 = otpVerified;
  const canSubmit = password.trim().length >= 6 && confirmPassword.trim().length >= 6;

  const stepTitles = useMemo(
    () => [t("registerStep1Title"), t("registerStep2Title"), t("registerStep3Title")],
    [t]
  );

  useEffect(() => {
    if (!full_name.trim() && !email.trim()) {
      setPreferredLanguage(language === "ar" ? "ar" : "en");
    }
  }, [language, full_name, email]);

  useEffect(() => {
    setOtp("");
    setOtpSent(false);
    setOtpVerified(false);
    setOtpCooldown(0);
  }, [email]);

  useEffect(() => {
    if (otpCooldown <= 0) return;
    const timer = setInterval(() => {
      setOtpCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [otpCooldown]);

  const sendOtp = async () => {
    setError("");
    setSuccessMessage("");
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
      setOtp("");
      setOtpSent(true);
      setOtpVerified(false);
      setOtpCooldown(60);
      setSuccessMessage(t("otpSentSuccessfully"));
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t("sendOtpFailed")));
    } finally {
      setOtpLoading(false);
    }
  };

  const verifyOtp = async () => {
    setError("");
    setSuccessMessage("");
    if (!email.trim() || !otp.trim()) {
      setError(t("emailOtpRequired"));
      return;
    }
    try {
      setVerifyLoading(true);
      await seekerApi.verifyRegistrationOtp({ email, otp });
      setOtpVerified(true);
      setSuccessMessage(t("verified"));
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
    setSuccessMessage("");
    if (!otpVerified) {
      setError(t("verifyEmailOtpFirst"));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("passwordsDoNotMatch"));
      return;
    }
    setLoading(true);
    try {
      const res = await seekerApi.register({
        full_name,
        email,
        password,
        preferred_language: preferredLanguage,
      });
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
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-3">
          {stepTitles.map((title, index) => {
            const currentStep = index + 1;
            const isActive = step === currentStep;
            const isDone = step > currentStep;
            return (
              <div
                key={title}
                className={`rounded-xl border px-3 py-2 text-center text-xs ${
                  isActive
                    ? "border-[var(--accent)] bg-[var(--surface-2)] text-[var(--text-primary)]"
                    : isDone
                      ? "border-emerald-400/50 bg-emerald-500/10 text-emerald-300"
                      : "border-[var(--panel-border)] text-[var(--text-muted)]"
                }`}
              >
                {t("step")} {currentStep}: {title}
              </div>
            );
          })}
        </div>

        {step === 1 && (
          <div className="space-y-3">
            <input
              className="field"
              placeholder={t("fullName")}
              value={full_name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              className="field"
              placeholder={t("email")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-2)] p-3">
              <label className="mb-2 block text-xs font-semibold text-[var(--text-muted)]">
                {t("preferredLanguage")}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                    preferredLanguage === "en"
                      ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                      : "border-[var(--panel-border)] bg-transparent text-[var(--text-primary)]"
                  }`}
                  onClick={() => setPreferredLanguage("en")}
                >
                  {t("englishLanguage")}
                </button>
                <button
                  type="button"
                  className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                    preferredLanguage === "ar"
                      ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                      : "border-[var(--panel-border)] bg-transparent text-[var(--text-primary)]"
                  }`}
                  onClick={() => setPreferredLanguage("ar")}
                >
                  {t("arabicLanguage")}
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-2)] p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-[var(--text-muted)]">{t("otpCode")}</p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">{t("otpHint")}</p>
              </div>
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

            <input
              className="field w-full text-center text-xl tracking-[0.5em] md:text-2xl"
              placeholder="------"
              value={otp}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={OTP_LENGTH}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && otpSent && otp.trim().length === OTP_LENGTH && !verifyLoading) {
                  e.preventDefault();
                  void verifyOtp();
                }
              }}
            />

            <div className="mt-2 flex items-center justify-between text-xs text-[var(--text-muted)]">
              <span>
                {otpSent && otpCooldown > 0
                  ? `${t("resendIn")} ${formatCountdown(otpCooldown)}`
                  : t("sendRegistrationOtp")}
              </span>
              <button
                type="button"
                className="underline decoration-dotted underline-offset-4 hover:text-[var(--text-primary)]"
                onClick={() => setStep(1)}
              >
                {t("changeEmail")}
              </button>
            </div>

            <div className="mt-3 grid gap-2 md:grid-cols-2">
              <button
                type="button"
                className="btn-primary"
                onClick={sendOtp}
                disabled={otpLoading || (otpSent && otpCooldown > 0)}
              >
                {otpLoading
                  ? "..."
                  : otpSent
                    ? t("resendRegistrationOtp")
                    : t("sendRegistrationOtp")}
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={verifyOtp}
                disabled={!otpSent || verifyLoading || otp.trim().length !== OTP_LENGTH}
              >
                {verifyLoading ? "..." : otpVerified ? t("verified") : t("verifyOtp")}
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <input
              className="field"
              placeholder={t("password")}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <input
              className="field"
              placeholder={t("confirmPassword")}
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
        )}

        {successMessage && <p className="text-sm text-emerald-300">{successMessage}</p>}
        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex items-center gap-2">
          {step > 1 && (
            <button
              type="button"
              className="btn-secondary w-full"
              onClick={() => setStep((prev) => Math.max(1, prev - 1))}
            >
              {t("back")}
            </button>
          )}

          {step < 3 ? (
            <button
              type="button"
              className="btn-primary w-full"
              onClick={() => setStep((prev) => Math.min(3, prev + 1))}
              disabled={(step === 1 && !canContinueStep1) || (step === 2 && !canContinueStep2)}
            >
              {t("next")}
            </button>
          ) : (
            <button className="btn-primary w-full" disabled={loading || !canSubmit}>
              {loading ? "..." : t("createAccount")}
            </button>
          )}
        </div>
      </form>
      <div className="mt-4 text-sm text-[var(--text-muted)]">
        <Link to="/auth/login">{t("alreadyHaveAccount")}</Link>
      </div>
    </AuthLayout>
  );
};

export default AuthRegisterPage;
