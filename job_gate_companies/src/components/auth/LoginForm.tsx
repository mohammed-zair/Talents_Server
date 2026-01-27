import React, { useState } from "react";
import { z } from "zod";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { authApi } from "../../services/api/api";
import { setToken } from "../../services/auth";
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
      const token =
        response?.token ||
        response?.data?.token ||
        response?.accessToken ||
        response?.data?.accessToken;
      if (token) {
        setToken(token);
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
        <label className="text-xs text-[var(--text-muted)]">{labels.email}</label>
        <input
          value={form.email}
          onChange={(event) => setForm({ ...form, email: event.target.value })}
          type="email"
          required
          className="w-full rounded-xl border border-[var(--panel-border)] bg-transparent px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs text-[var(--text-muted)]">{labels.password}</label>
        <input
          value={form.password}
          onChange={(event) => setForm({ ...form, password: event.target.value })}
          type="password"
          required
          className="w-full rounded-xl border border-[var(--panel-border)] bg-transparent px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
        />
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
