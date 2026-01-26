import React, { useState } from "react";
import { z } from "zod";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { authApi } from "../../services/api/api";
import { useLanguage } from "../../contexts/LanguageContext";
import { mapAuthError } from "../../utils/authMessages";
import Button from "../shared/Button";

const freeEmailDomains = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "aol.com"];

const corporateEmail = z
  .string()
  .email()
  .refine((email) => !freeEmailDomains.includes(email.split("@")[1] || ""), {
    message: "Use a corporate email address.",
  });

const registerSchema = z.object({
  companyName: z.string().min(2),
  industry: z.string().min(2),
  adminName: z.string().min(2),
  email: corporateEmail,
  phone: z.string().optional(),
});

const RegisterForm: React.FC = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    companyName: "",
    industry: "",
    adminName: "",
    email: "",
    phone: "",
  });
  const [loading, setLoading] = useState(false);

  const labels = {
    en: {
      companyName: "Company Name",
      industry: "Industry",
      adminName: "Admin Contact",
      email: "Corporate Email",
      phone: "Phone (optional)",
      submit: "Request Access",
    },
    ar: {
      companyName: "اسم الشركة",
      industry: "المجال",
      adminName: "جهة الاتصال الإدارية",
      email: "البريد المؤسسي",
      phone: "الهاتف (اختياري)",
      submit: "طلب الوصول",
    },
  }[language];

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const parse = registerSchema.safeParse(form);
    if (!parse.success) {
      toast.error(mapAuthError(422, language));
      return;
    }
    try {
      setLoading(true);
      await authApi.companyRegister(form);
      toast.success(
        language === "ar"
          ? "تم إرسال الطلب. بانتظار الموافقة."
          : "Request submitted. Pending approval."
      );
      navigate("/request-tracked", { state: { email: form.email } });
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
        <label className="text-xs text-[var(--text-muted)]">{labels.companyName}</label>
        <input
          value={form.companyName}
          onChange={(event) => setForm({ ...form, companyName: event.target.value })}
          className="w-full rounded-xl border border-[var(--panel-border)] bg-transparent px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
          required
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs text-[var(--text-muted)]">{labels.industry}</label>
        <input
          value={form.industry}
          onChange={(event) => setForm({ ...form, industry: event.target.value })}
          className="w-full rounded-xl border border-[var(--panel-border)] bg-transparent px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
          required
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs text-[var(--text-muted)]">{labels.adminName}</label>
        <input
          value={form.adminName}
          onChange={(event) => setForm({ ...form, adminName: event.target.value })}
          className="w-full rounded-xl border border-[var(--panel-border)] bg-transparent px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
          required
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs text-[var(--text-muted)]">{labels.email}</label>
        <input
          type="email"
          value={form.email}
          onChange={(event) => setForm({ ...form, email: event.target.value })}
          className="w-full rounded-xl border border-[var(--panel-border)] bg-transparent px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
          required
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs text-[var(--text-muted)]">{labels.phone}</label>
        <input
          value={form.phone}
          onChange={(event) => setForm({ ...form, phone: event.target.value })}
          className="w-full rounded-xl border border-[var(--panel-border)] bg-transparent px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
        />
      </div>
      <Button type="submit" className="w-full justify-center" disabled={loading}>
        {loading ? "..." : labels.submit}
      </Button>
    </form>
  );
};

export default RegisterForm;
