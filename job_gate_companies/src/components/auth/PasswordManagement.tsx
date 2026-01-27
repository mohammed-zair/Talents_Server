import React, { useMemo, useState } from "react";
import { z } from "zod";
import toast from "react-hot-toast";
import { authApi } from "../../services/api/api";
import { useLanguage } from "../../contexts/LanguageContext";
import { mapAuthError } from "../../utils/authMessages";
import OtpInput from "./OtpInput";
import Button from "../shared/Button";

const passwordSchema = z
  .string()
  .min(8)
  .regex(/[A-Z]/, "uppercase")
  .regex(/[0-9]/, "number");

const strengthLabel = (score: number) => {
  if (score >= 3) return "Strong";
  if (score === 2) return "Good";
  return "Weak";
};

const PasswordManagement: React.FC<{ mode: "set" | "reset" }> = ({ mode }) => {
  const { language } = useLanguage();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [inviteToken, setInviteToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"request" | "reset">("request");

  const score = useMemo(() => {
    let value = 0;
    if (password.length >= 8) value += 1;
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
      submit: mode === "set" ? "Set Password" : "Reset Password",
      hint: "Min 8 chars, 1 uppercase, 1 number",
    },
    ar: {
      email: "البريد المؤسسي",
      token: "رمز الموافقة",
      request: "إرسال رمز التحقق",
      code: "رمز التحقق (6 أرقام)",
      password: "كلمة مرور جديدة",
      submit: mode === "set" ? "تعيين كلمة المرور" : "إعادة تعيين كلمة المرور",
      hint: "8 أحرف على الأقل، حرف كبير ورقم",
    },
  }[language];

  const handleRequest = async () => {
    try {
      setLoading(true);
      await authApi.forgotPassword({ email });
      toast.success(language === "ar" ? "تم إرسال الرمز" : "OTP sent");
      setStep("reset");
    } catch (error: any) {
      toast.error(mapAuthError(error?.response?.status, language));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    const passwordValid = passwordSchema.safeParse(password);
    if (!passwordValid.success) {
      toast.error(mapAuthError(422, language));
      return;
    }

    try {
      setLoading(true);
      if (mode === "set") {
        await authApi.setInitialPassword({ email, password, token: inviteToken });
      } else {
        await authApi.resetPassword({ email, code, password });
      }
      toast.success(language === "ar" ? "تم تحديث كلمة المرور" : "Password updated");
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
          <input
            id="pm-password"
            name="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            className="w-full rounded-xl border border-[var(--panel-border)] bg-transparent px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
          />
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span>{labels.hint}</span>
            <span className="text-[var(--accent)]">{strengthLabel(score)}</span>
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
