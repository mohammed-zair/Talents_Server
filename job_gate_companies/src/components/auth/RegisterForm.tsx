import React, { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { authApi } from "../../services/api/api";
import { useLanguage } from "../../contexts/LanguageContext";
import { mapAuthError } from "../../utils/authMessages";
import Button from "../shared/Button";
import OtpInput from "./OtpInput";

const registerSchema = z
  .object({
    name: z.string().min(2),
    email: z.string().email(),
    preferred_language: z.enum(["en", "ar"]),
    licenseFile: z.instanceof(File),
    logoFile: z.instanceof(File).optional(),
    password: z.string().min(6),
    confirm_password: z.string().min(6),
    phone: z.string().optional(),
    description: z.string().optional(),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwords do not match.",
    path: ["confirm_password"],
  });

type RegisterFormState = {
  name: string;
  email: string;
  phone: string;
  preferred_language: "en" | "ar";
  description: string;
  password: string;
  confirm_password: string;
};

const RegisterForm: React.FC = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [form, setForm] = useState<RegisterFormState>({
    name: "",
    email: "",
    phone: "",
    preferred_language: language === "ar" ? "ar" : "en",
    description: "",
    password: "",
    confirm_password: "",
  });
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const maxFileSizeMb = 10;
  const maxFileSizeBytes = maxFileSizeMb * 1024 * 1024;

  const labels = {
    en: {
      name: "Company Name",
      email: "Corporate Email",
      phone: "Phone (optional)",
      preferredLanguage: "Notification Language",
      license: "License Document (PDF, DOCX, or Image)",
      description: "Description (optional)",
      logo: "Logo (optional)",
      password: "Password",
      confirmPassword: "Confirm Password",
      submit: "Request Access",
      back: "Back",
      next: "Next",
      step1: "Company Details",
      step2: "Legal & Identity",
      step3: "Account Setup",
      fileTooLarge: `File too large (max ${maxFileSizeMb}MB).`,
      selectedFile: "Selected",
      sendOtp: "Send OTP",
      resendOtp: "Resend OTP",
      verifyOtp: "Verify OTP",
      otpCode: "Verification Code",
      otpSent: "Verification code sent to your email.",
      otpVerified: "Email verified.",
      otpRequired: "Verify your email with OTP before submitting.",
    },
    ar: {
      name: "اسم الشركة",
      email: "البريد المؤسسي",
      phone: "الهاتف (اختياري)",
      preferredLanguage: "لغة الإشعارات",
      license: "وثيقة الترخيص (PDF أو DOCX أو صورة)",
      description: "وصف (اختياري)",
      logo: "الشعار (اختياري)",
      password: "كلمة المرور",
      confirmPassword: "تأكيد كلمة المرور",
      submit: "طلب الوصول",
      back: "السابق",
      next: "التالي",
      step1: "بيانات الشركة",
      step2: "الهوية القانونية",
      step3: "إعداد الحساب",
      fileTooLarge: `حجم الملف كبير (الحد ${maxFileSizeMb}MB).`,
      selectedFile: "الملف المختار",
      sendOtp: "إرسال رمز التحقق",
      resendOtp: "إعادة إرسال الرمز",
      verifyOtp: "تأكيد الرمز",
      otpCode: "رمز التحقق",
      otpSent: "تم إرسال رمز التحقق إلى بريدك.",
      otpVerified: "تم التحقق من البريد.",
      otpRequired: "يلزم التحقق من البريد قبل إرسال الطلب.",
    },
  }[language];

  const steps = useMemo(
    () => [
      { key: 1, title: labels.step1 },
      { key: 2, title: labels.step2 },
      { key: 3, title: labels.step3 },
    ],
    [labels]
  );

  const canContinueStep1 = form.name.trim().length > 1 && form.email.trim().length > 3;
  const canContinueStep2 = Boolean(licenseFile);
  const canContinueStep3 =
    form.password.trim().length >= 6 &&
    form.confirm_password.trim().length >= 6 &&
    otpVerified;

  useEffect(() => {
    setOtpCode("");
    setOtpSent(false);
    setOtpVerified(false);
  }, [form.email]);

  const handleSendOtp = async () => {
    if (!form.email.trim()) {
      toast.error(mapAuthError(422, language));
      return;
    }

    try {
      setOtpSending(true);
      await authApi.sendCompanyRegistrationOtp({
        email: form.email.trim(),
        company_name: form.name.trim() || undefined,
        language: form.preferred_language,
      });
      setOtpSent(true);
      setOtpVerified(false);
      toast.success(labels.otpSent);
    } catch (error: any) {
      const status = error?.response?.status;
      toast.error(mapAuthError(status, language));
    } finally {
      setOtpSending(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpSent || otpCode.trim().length !== 6) {
      toast.error(mapAuthError(422, language));
      return;
    }

    try {
      setOtpVerifying(true);
      await authApi.verifyCompanyRegistrationOtp({
        email: form.email.trim(),
        otp: otpCode.trim(),
      });
      setOtpVerified(true);
      toast.success(labels.otpVerified);
    } catch (error: any) {
      setOtpVerified(false);
      const status = error?.response?.status;
      toast.error(mapAuthError(status, language));
    } finally {
      setOtpVerifying(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!otpVerified) {
      toast.error(labels.otpRequired);
      return;
    }

    const parse = registerSchema.safeParse({
      ...form,
      licenseFile,
      logoFile: logoFile ?? undefined,
    });
    if (!parse.success) {
      toast.error(mapAuthError(422, language));
      return;
    }
    try {
      setLoading(true);
      const payload = new FormData();
      payload.append("name", form.name);
      payload.append("email", form.email);
      if (form.phone) payload.append("phone", form.phone);
      payload.append("preferred_language", form.preferred_language);
      if (form.description) payload.append("description", form.description);
      payload.append("password", form.password);
      payload.append("confirm_password", form.confirm_password);
      if (logoFile) payload.append("logo", logoFile);
      if (licenseFile) payload.append("license_doc", licenseFile);
      const response = await authApi.companyRegister(payload);
      const requestId =
        response?.company_id ?? response?.data?.company_id ?? response?.data?.request_id;
      toast.success(
        language === "ar"
          ? "تم إرسال الطلب. بانتظار الموافقة."
          : "Request submitted. Pending approval."
      );
      navigate("/request-tracked", { state: { email: form.email, requestId } });
    } catch (error: any) {
      const status = error?.response?.status;
      toast.error(mapAuthError(status, language));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--text-muted)]">
        {steps.map((item) => (
          <div
            key={item.key}
            className={`rounded-full border px-4 py-2 ${
              step === item.key
                ? "border-[var(--accent)] text-[var(--text-primary)]"
                : "border-[var(--panel-border)]"
            }`}
          >
            {item.key}. {item.title}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="reg-company-name" className="text-xs text-[var(--text-muted)]">
              {labels.name}
            </label>
            <input
              id="reg-company-name"
              name="name"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              className="w-full rounded-xl border border-[var(--panel-border)] bg-transparent px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
              required
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="reg-email" className="text-xs text-[var(--text-muted)]">
              {labels.email}
            </label>
            <input
              id="reg-email"
              name="email"
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              className="w-full rounded-xl border border-[var(--panel-border)] bg-transparent px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
              required
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="reg-phone" className="text-xs text-[var(--text-muted)]">
              {labels.phone}
            </label>
            <input
              id="reg-phone"
              name="phone"
              value={form.phone}
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
              className="w-full rounded-xl border border-[var(--panel-border)] bg-transparent px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="reg-preferred-language" className="text-xs text-[var(--text-muted)]">
              {labels.preferredLanguage}
            </label>
            <select
              id="reg-preferred-language"
              name="preferred_language"
              value={form.preferred_language}
              onChange={(event) =>
                setForm({ ...form, preferred_language: event.target.value as "en" | "ar" })
              }
              className="w-full rounded-xl border border-[var(--panel-border)] bg-transparent px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
            >
              <option value="en">English</option>
              <option value="ar">العربية</option>
            </select>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="reg-license" className="text-xs text-[var(--text-muted)]">
              {labels.license}
            </label>
            <input
              id="reg-license"
              name="license_doc"
              type="file"
              accept=".pdf,.docx,image/*"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                if (file && file.size > maxFileSizeBytes) {
                  toast.error(labels.fileTooLarge);
                  event.target.value = "";
                  setLicenseFile(null);
                  return;
                }
                setLicenseFile(file);
              }}
              className="w-full rounded-xl border border-[var(--panel-border)] bg-transparent px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
              required
            />
            {licenseFile && (
              <p className="text-xs text-[var(--text-muted)]">
                {labels.selectedFile}: {licenseFile.name}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <label htmlFor="reg-description" className="text-xs text-[var(--text-muted)]">
              {labels.description}
            </label>
            <textarea
              id="reg-description"
              name="description"
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              className="w-full rounded-xl border border-[var(--panel-border)] bg-transparent px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="reg-logo" className="text-xs text-[var(--text-muted)]">
              {labels.logo}
            </label>
            <input
              id="reg-logo"
              name="logo"
              type="file"
              accept="image/*"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                if (file && file.size > maxFileSizeBytes) {
                  toast.error(labels.fileTooLarge);
                  event.target.value = "";
                  setLogoFile(null);
                  return;
                }
                setLogoFile(file);
              }}
              className="w-full rounded-xl border border-[var(--panel-border)] bg-transparent px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
            />
            {logoFile && (
              <p className="text-xs text-[var(--text-muted)]">
                {labels.selectedFile}: {logoFile.name}
              </p>
            )}
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="reg-password" className="text-xs text-[var(--text-muted)]">
              {labels.password}
            </label>
            <div className="relative">
              <input
                id="reg-password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
                className="w-full rounded-xl border border-[var(--panel-border)] bg-transparent px-4 py-3 pr-12 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                aria-label={showPassword ? "Hide password" : "Show password"}
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
          <div className="space-y-2">
            <label htmlFor="reg-confirm-password" className="text-xs text-[var(--text-muted)]">
              {labels.confirmPassword}
            </label>
            <div className="relative">
              <input
                id="reg-confirm-password"
                name="confirm_password"
                type={showConfirmPassword ? "text" : "password"}
                value={form.confirm_password}
                onChange={(event) => setForm({ ...form, confirm_password: event.target.value })}
                className="w-full rounded-xl border border-[var(--panel-border)] bg-transparent px-4 py-3 pr-12 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
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
          <div className="space-y-2 md:col-span-2">
            <label className="text-xs text-[var(--text-muted)]">{labels.otpCode}</label>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleSendOtp}
                disabled={otpSending || !form.email.trim()}
              >
                {otpSending ? "..." : otpSent ? labels.resendOtp : labels.sendOtp}
              </Button>
              {otpSent && (
                <span className="text-xs text-[var(--text-muted)]">{labels.otpSent}</span>
              )}
              {otpVerified && <span className="text-xs text-green-500">{labels.otpVerified}</span>}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <OtpInput value={otpCode} onChange={setOtpCode} />
              <Button
                type="button"
                variant="outline"
                onClick={handleVerifyOtp}
                disabled={otpVerifying || !otpSent || otpCode.trim().length !== 6}
              >
                {otpVerifying ? "..." : labels.verifyOtp}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => setStep((prev) => Math.max(1, prev - 1))}
          disabled={step === 1}
        >
          {labels.back}
        </Button>
        {step < 3 ? (
          <Button
            type="button"
            onClick={() => {
              if ((step === 1 && canContinueStep1) || (step === 2 && canContinueStep2)) {
                setStep((prev) => Math.min(3, prev + 1));
              }
            }}
            disabled={(step === 1 && !canContinueStep1) || (step === 2 && !canContinueStep2)}
          >
            {labels.next}
          </Button>
        ) : (
          <Button type="submit" disabled={loading || !canContinueStep3}>
            {loading ? "..." : labels.submit}
          </Button>
        )}
      </div>
    </form>
  );
};

export default RegisterForm;
