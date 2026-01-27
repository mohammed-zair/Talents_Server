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

const registerSchema = z
  .object({
    name: z.string().min(2),
    email: corporateEmail,
    license_doc_url: z.string().min(6),
    password: z.string().min(6),
    confirm_password: z.string().min(6),
    phone: z.string().optional(),
    description: z.string().optional(),
    logo_url: z.string().optional(),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwords do not match.",
    path: ["confirm_password"],
  });

const RegisterForm: React.FC = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    license_doc_url: "",
    description: "",
    logo_url: "",
    password: "",
    confirm_password: "",
  });
  const [loading, setLoading] = useState(false);

  const labels = {
    en: {
      name: "Company Name",
      email: "Corporate Email",
      phone: "Phone (optional)",
      license: "License Document URL",
      description: "Description (optional)",
      logo: "Logo URL (optional)",
      password: "Password",
      confirmPassword: "Confirm Password",
      submit: "Request Access",
    },
    ar: {
      name: "Ø§Ø³Ù… Ø§Ù„Ø´Ø±ÙƒØ©",
      email: "Ø§Ù„Ø¨Ø±ÙŠØ¯ Ø§Ù„Ù…Ø¤Ø³Ø³ÙŠ",
      phone: "Ø§Ù„Ù‡Ø§ØªÙ (Ø§Ø®ØªÙŠØ§Ø±ÙŠ)",
      license: "Ø±Ø§Ø¨Ø· ÙˆØ«ÙŠÙ‚Ø© Ø§Ù„ØªØ±Ø®ÙŠØµ",
      description: "ÙˆØµÙ (Ø§Ø®ØªÙŠØ§Ø±ÙŠ)",
      logo: "Ø±Ø§Ø¨Ø· Ø§Ù„Ø´Ø¹Ø§Ø± (Ø§Ø®ØªÙŠØ§Ø±ÙŠ)",
      password: "ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ±",
      confirmPassword: "ØªØ£ÙƒÙŠØ¯ ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ±",
      submit: "Ø·Ù„Ø¨ Ø§Ù„ÙˆØµÙˆÙ„",
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
          ? "ØªÙ… Ø¥Ø±Ø³Ø§Ù„ Ø§Ù„Ø·Ù„Ø¨. Ø¨Ø§Ù†ØªØ¸Ø§Ø± Ø§Ù„Ù…ÙˆØ§ÙÙ‚Ø©."
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
        <label htmlFor="reg-license" className="text-xs text-[var(--text-muted)]">
          {labels.license}
        </label>
        <input
          id="reg-license"
          name="license_doc_url"
          value={form.license_doc_url}
          onChange={(event) => setForm({ ...form, license_doc_url: event.target.value })}
          className="w-full rounded-xl border border-[var(--panel-border)] bg-transparent px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
          required
        />
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
          name="logo_url"
          value={form.logo_url}
          onChange={(event) => setForm({ ...form, logo_url: event.target.value })}
          className="w-full rounded-xl border border-[var(--panel-border)] bg-transparent px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="reg-password" className="text-xs text-[var(--text-muted)]">
          {labels.password}
        </label>
        <input
          id="reg-password"
          name="password"
          type="password"
          value={form.password}
          onChange={(event) => setForm({ ...form, password: event.target.value })}
          className="w-full rounded-xl border border-[var(--panel-border)] bg-transparent px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
          required
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="reg-confirm-password" className="text-xs text-[var(--text-muted)]">
          {labels.confirmPassword}
        </label>
        <input
          id="reg-confirm-password"
          name="confirm_password"
          type="password"
          value={form.confirm_password}
          onChange={(event) => setForm({ ...form, confirm_password: event.target.value })}
          className="w-full rounded-xl border border-[var(--panel-border)] bg-transparent px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
          required
        />
      </div>
      <Button type="submit" className="w-full justify-center" disabled={loading}>
        {loading ? "..." : labels.submit}
      </Button>
    </form>
  );
};

export default RegisterForm;
