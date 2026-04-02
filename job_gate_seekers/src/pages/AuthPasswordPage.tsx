import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import AuthLayout from "../components/layout/AuthLayout";
import { seekerApi } from "../services/api";
import { useLanguage } from "../contexts/LanguageContext";
import { getApiErrorMessage } from "../utils/apiError";

type Step = "request" | "reset";

const AuthPasswordPage: React.FC = () => {
  const { language, t } = useLanguage();
  const location = useLocation();
  const [step, setStep] = useState<Step>("request");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setStep(location.pathname.endsWith("/reset") ? "reset" : "request");
    setMessage("");
    setError("");
  }, [location.pathname]);

  const copy = useMemo(
    () =>
      language === "ar"
        ? {
            requestSubtitle: "أدخل بريدك الإلكتروني وسنرسل رمز إعادة التعيين إذا كان الحساب موجوداً.",
            resetSubtitle: "أدخل رمز التحقق من البريد ثم اختر كلمة مرور جديدة.",
            requestStep: "طلب الرمز",
            resetStep: "إعادة التعيين",
            confirmPassword: "تأكيد كلمة المرور",
            requestAgain: "طلب رمز جديد",
            passwordMismatch: "كلمتا المرور غير متطابقتين.",
          }
        : {
            requestSubtitle: "Enter your email and we will send a reset code if the account exists.",
            resetSubtitle: "Enter the code from your email, then set a new password.",
            requestStep: "Request code",
            resetStep: "Reset password",
            confirmPassword: "Confirm Password",
            requestAgain: "Request a new code",
            passwordMismatch: "Passwords do not match.",
          },
    [language]
  );

  const requestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);
    try {
      const response = await seekerApi.forgotPassword({ email });
      setMessage(
        typeof response?.message === "string" && response.message.trim()
          ? response.message
          : t("resetLinkSent")
      );
      setStep("reset");
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t("authFailed")));
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setError("");

    if (newPassword !== confirmPassword) {
      setError(copy.passwordMismatch);
      return;
    }

    setLoading(true);
    try {
      await seekerApi.resetPassword({ email, token, newPassword });
      setMessage(t("passwordResetDone"));
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t("authFailed")));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title={step === "request" ? t("forgotPassword") : t("resetPassword")}
      subtitle={step === "request" ? copy.requestSubtitle : copy.resetSubtitle}
    >
      <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl border border-[var(--border)] p-1 text-xs">
        <button
          type="button"
          className={`rounded-lg px-3 py-2 ${step === "request" ? "bg-[var(--accent)] text-black" : "text-[var(--text-muted)]"}`}
          onClick={() => {
            setStep("request");
            setMessage("");
            setError("");
          }}
        >
          {copy.requestStep}
        </button>
        <button
          type="button"
          className={`rounded-lg px-3 py-2 ${step === "reset" ? "bg-[var(--accent)] text-black" : "text-[var(--text-muted)]"}`}
          onClick={() => {
            setStep("reset");
            setMessage("");
            setError("");
          }}
        >
          {copy.resetStep}
        </button>
      </div>

      {step === "request" ? (
        <form onSubmit={requestReset} className="space-y-3">
          <input
            className="field"
            type="email"
            placeholder={t("email")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          {message && <p className="text-sm text-emerald-400">{message}</p>}
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button className="btn-primary w-full" disabled={loading}>
            {loading ? "..." : t("sendResetLink")}
          </button>
        </form>
      ) : (
        <form onSubmit={resetPassword} className="space-y-3">
          <input
            className="field"
            type="email"
            placeholder={t("email")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className="field"
            placeholder={t("resetToken")}
            value={token}
            onChange={(e) => setToken(e.target.value)}
            required
          />
          <input
            className="field"
            placeholder={t("newPassword")}
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
          <input
            className="field"
            placeholder={copy.confirmPassword}
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          {message && <p className="text-sm text-emerald-400">{message}</p>}
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button className="btn-primary w-full" disabled={loading}>
            {loading ? "..." : t("resetPasswordBtn")}
          </button>
        </form>
      )}

      <div className="mt-4 flex justify-between text-sm text-[var(--text-muted)]">
        <button
          type="button"
          className="text-[var(--accent)]"
          onClick={() => {
            setStep(step === "request" ? "reset" : "request");
            setMessage("");
            setError("");
          }}
        >
          {step === "request" ? t("haveTokenResetHere") : copy.requestAgain}
        </button>
        <Link to="/auth/login">{t("backToLogin")}</Link>
      </div>
    </AuthLayout>
  );
};

export default AuthPasswordPage;
