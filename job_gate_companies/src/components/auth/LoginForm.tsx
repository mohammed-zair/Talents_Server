import React, { useState } from "react";
import { z } from "zod";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { authApi } from "../../services/api/api";
import { useLanguage } from "../../contexts/LanguageContext";
import { mapAuthError } from "../../utils/authMessages";
import Button from "../shared/Button";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const LoginForm: React.FC = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const labels = {
    en: {
      email: "Corporate Email",
      password: "Password",
      remember: "Remember me",
      forgot: "Forgot password?",
      login: "Sign in",
    },
    ar: {
      email: "البريد المؤسسي",
      password: "كلمة المرور",
      remember: "تذكرني",
      forgot: "نسيت كلمة المرور؟",
      login: "تسجيل الدخول",
    },
  }[language];

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const parse = loginSchema.safeParse(form);
    if (!parse.success) {
      toast.error(mapAuthError(422, language));
      return;
    }
    try {
      setLoading(true);
      const response = await authApi.companyLogin(form);
      const company = response?.company ?? response?.data?.company;
      const status = company?.status ?? (company?.is_approved ? "approved" : "pending");
      if (status && status !== "approved") {
        toast.success(
          language === "ar"
            ? "تم تسجيل الدخول. طلبك قيد المراجعة."
            : "Login successful. Your request is pending approval."
        );
        navigate("/request-tracked", {
          state: { email: form.email, requestId: company?.company_id },
          replace: true,
        });
        return;
      }
      toast.success(language === "ar" ? "تم تسجيل الدخول بنجاح" : "Login successful");
      navigate("/dashboard", { replace: true });
    } catch (error: any) {
      const status = error?.response?.status;
      toast.error(mapAuthError(status, language));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <label htmlFor="login-email" className="text-xs text-[var(--text-muted)]">
          {labels.email}
        </label>
        <input
          id="login-email"
          name="email"
          value={form.email}
          onChange={(event) => setForm({ ...form, email: event.target.value })}
          type="email"
          required
          className="w-full rounded-xl border border-[var(--panel-border)] bg-transparent px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="login-password" className="text-xs text-[var(--text-muted)]">
          {labels.password}
        </label>
        <div className="relative">
          <input
            id="login-password"
            name="password"
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
            type={showPassword ? "text" : "password"}
            required
            className="w-full rounded-xl border border-[var(--panel-border)] bg-transparent px-4 py-3 pr-12 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
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
      <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
        <label className="flex items-center gap-2">
          <input type="checkbox" className="h-4 w-4 accent-[var(--accent)]" />
          {labels.remember}
        </label>
        <button
          type="button"
          onClick={() => navigate("/password/reset")}
          className="text-[var(--accent)]"
        >
          {labels.forgot}
        </button>
      </div>
      <Button
        type="submit"
        className="w-full justify-center"
        disabled={loading}
      >
        {loading ? "..." : labels.login}
      </Button>
    </form>
  );
};

export default LoginForm;
