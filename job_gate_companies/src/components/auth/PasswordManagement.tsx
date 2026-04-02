import React, { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { authApi } from "../../services/api/api";
import { useLanguage } from "../../contexts/LanguageContext";
import { mapAuthError } from "../../utils/authMessages";
import OtpInput from "./OtpInput";
import Button from "../shared/Button";

const strengthLabel = (score: number, language: "en" | "ar") => {
  if (language === "ar") {
    if (score >= 3) return "قوية";
    if (score === 2) return "جيدة";
    return "ضعيفة";
  }

  if (score >= 3) return "Strong";
  if (score === 2) return "Good";
  return "Weak";
};

const PasswordManagement: React.FC<{ mode: "set" | "reset" }> = ({ mode }) => {
  const { language } = useLanguage();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [inviteToken, setInviteToken] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"request" | "reset">("request");

  const score = useMemo(() => {
    let value = 0;
    if (password.length >= 6) value += 1;
    if (/[A-Z]/.test(password)) value += 1;
    if (/[0-9]/.test(password)) value += 1;
    return value;
  }, [password]);

  const labels = {
    en: {
      email: "Corporate Email",
      token: "Approval Token",
      request: "Send OTP",
      code: "6-digit OTP",
      password: "New Password",
      confirmPassword: "Confirm Password",
      submit: mode === "set" ? "Set Password" : "Reset Password",
      hint: "Minimum 6 characters",
      otpSent: "If this email is registered, an OTP code has been sent.",
      emailRequired: "Email is required",
      otpRequired: "OTP is required",
      allRequired: "Please fill all required fields",
      minPassword: "Password must be at least 6 characters",
      mismatch: "Passwords do not match",
      updated: "Password updated",
      showPassword: "Show password",
      hidePassword: "Hide password",
    },
    ar: {
      email: "البريد الإلكتروني للشركة",
      token: "رمز الموافقة",
      request: "إرسال رمز التحقق",
      code: "رمز تحقق من 6 أرقام",
      password: "كلمة المرور الجديدة",
      confirmPassword: "تأكيد كلمة المرور",
      submit: mode === "set" ? "تعيين كلمة المرور" : "إعادة تعيين كلمة المرور",
      hint: "الحد الأدنى 6 أحرف",
      otpSent: "إذا كان هذا البريد مسجلاً، فقد تم إرسال رمز التحقق.",
      emailRequired: "يرجى إدخال البريد الإلكتروني",
      otpRequired: "يرجى إدخال رمز التحقق",
      allRequired: "يرجى إدخال كلمة المرور وتأكيدها",
      minPassword: "يجب أن تكون كلمة المرور 6 أحرف على الأقل",
      mismatch: "كلمتا المرور غير متطابقتين",
      updated: "تم تحديث كلمة المرور",
      showPassword: "إظهار كلمة المرور",
      hidePassword: "إخفاء كلمة المرور",
    },
  }[language];

  const handleRequest = async () => {
    if (!email.trim()) {
      toast.error(labels.emailRequired);
      return;
    }

    try {
      setLoading(true);
      const response = await authApi.forgotPassword({ email, language });
      toast.success(
        typeof response?.message === "string" && response.message.trim()
          ? response.message
          : labels.otpSent
      );
      setStep("reset");
    } catch (error: any) {
      toast.error(mapAuthError(error?.response?.status, language));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!email.trim()) {
      toast.error(labels.emailRequired);
      return;
    }
    if (mode === "reset" && !code.trim()) {
      toast.error(labels.otpRequired);
      return;
    }
    if (!password.trim() || !confirmPassword.trim()) {
      toast.error(labels.allRequired);
      return;
    }

    if (password.trim().length < 6) {
      toast.error(labels.minPassword);
      return;
    }

    if (password !== confirmPassword) {
      toast.error(labels.mismatch);
      return;
    }

    try {
      setLoading(true);
      if (mode === "set") {
        await authApi.setInitialPassword({ email, password, token: inviteToken });
      } else {
        await authApi.resetPassword({ email, code, password });
      }
      toast.success(labels.updated);
    } catch (error: any) {
      toast.error(mapAuthError(error?.response?.status, language));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="pm-email" className="text-xs text-[var(--text-muted)]">
          {labels.email}
        </label>
        <input
          id="pm-email"
          name="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          type="email"
          className="w-full rounded-xl border border-[var(--panel-border)] bg-transparent px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
        />
      </div>

      {mode === "set" && (
        <div className="space-y-2">
          <label htmlFor="pm-token" className="text-xs text-[var(--text-muted)]">
            {labels.token}
          </label>
          <input
            id="pm-token"
            name="token"
            value={inviteToken}
            onChange={(event) => setInviteToken(event.target.value)}
            className="w-full rounded-xl border border-[var(--panel-border)] bg-transparent px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
          />
        </div>
      )}

      {mode === "reset" && step === "request" && (
        <Button className="w-full justify-center" onClick={handleRequest} disabled={loading}>
          {loading ? "..." : labels.request}
        </Button>
      )}

      {mode === "reset" && step === "reset" && (
        <div className="space-y-3">
          <label htmlFor="pm-otp" className="text-xs text-[var(--text-muted)]">
            {labels.code}
          </label>
          <OtpInput value={code} onChange={setCode} />
        </div>
      )}

      {(mode === "set" || step === "reset") && (
        <div className="space-y-2">
          <label htmlFor="pm-password" className="text-xs text-[var(--text-muted)]">
            {labels.password}
          </label>
          <div className="relative">
            <input
              id="pm-password"
              name="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type={showPassword ? "text" : "password"}
              className="w-full rounded-xl border border-[var(--panel-border)] bg-transparent px-4 py-3 pr-12 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              aria-label={showPassword ? labels.hidePassword : labels.showPassword}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>
          </div>
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span>{labels.hint}</span>
            <span className="text-[var(--accent)]">{strengthLabel(score, language)}</span>
          </div>
        </div>
      )}

      {(mode === "set" || step === "reset") && (
        <div className="space-y-2">
          <label htmlFor="pm-confirm-password" className="text-xs text-[var(--text-muted)]">
            {labels.confirmPassword}
          </label>
          <div className="relative">
            <input
              id="pm-confirm-password"
              name="confirmPassword"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              type={showConfirmPassword ? "text" : "password"}
              className="w-full rounded-xl border border-[var(--panel-border)] bg-transparent px-4 py-3 pr-12 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              aria-label={showConfirmPassword ? labels.hidePassword : labels.showPassword}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {(mode === "set" || step === "reset") && (
        <Button className="w-full justify-center" onClick={handleSubmit} disabled={loading}>
          {loading ? "..." : labels.submit}
        </Button>
      )}
    </div>
  );
};

export default PasswordManagement;
