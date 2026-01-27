import React, { useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { ShieldCheck, UploadCloud } from "lucide-react";
import SectionHeader from "../components/shared/SectionHeader";
import Card from "../components/shared/Card";
import Button from "../components/shared/Button";
import Skeleton from "../components/shared/Skeleton";
import { companyApi } from "../services/api/api";
import type { CompanyProfile } from "../types";
import { useLanguage } from "../contexts/LanguageContext";

const ProfileSecurity: React.FC = () => {
  const queryClient = useQueryClient();
  const { language } = useLanguage();
  const { data: profile, isLoading } = useQuery({
    queryKey: ["company-profile"],
    queryFn: companyApi.getCompanyProfile,
  });

  const [profileForm, setProfileForm] = useState<Partial<CompanyProfile>>({});
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "" });
  const [showCredentials, setShowCredentials] = useState(false);

  const updateProfile = useMutation({
    mutationFn: companyApi.updateCompanyProfile,
    onSuccess: () => {
      toast.success(language === "ar" ? "تم تحديث الملف" : "Profile updated");
      queryClient.invalidateQueries({ queryKey: ["company-profile"] });
    },
    onError: () =>
      toast.error(language === "ar" ? "تعذر تحديث الملف" : "Failed to update profile"),
  });

  const changePassword = useMutation({
    mutationFn: companyApi.changeCompanyPassword,
    onSuccess: () => {
      toast.success(language === "ar" ? "تم تحديث كلمة المرور" : "Password updated");
      setPasswords({ currentPassword: "", newPassword: "" });
    },
    onError: () =>
      toast.error(language === "ar" ? "تعذر تحديث كلمة المرور" : "Failed to update password"),
  });

  const strengthScore = useMemo(() => {
    let value = 0;
    if (passwords.newPassword.length >= 8) value += 1;
    if (/[A-Z]/.test(passwords.newPassword)) value += 1;
    if (/[0-9]/.test(passwords.newPassword)) value += 1;
    return value;
  }, [passwords.newPassword]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "image/*": [] },
    maxFiles: 1,
    onDrop: (acceptedFiles) => {
      setLogoFile(acceptedFiles[0]);
    },
  });

  const handleProfileSave = () => {
    const payload = new FormData();
    if (profileForm.name) payload.append("name", profileForm.name);
    if (profileForm.industry) payload.append("industry", profileForm.industry);
    if (profileForm.phone) payload.append("phone", profileForm.phone);
    if (profileForm.email) payload.append("email", profileForm.email);
    if (logoFile) payload.append("logo", logoFile);
    updateProfile.mutate(payload);
  };

  const handlePasswordSave = () => {
    changePassword.mutate(passwords);
  };

  const copy = {
    en: {
      headerEyebrow: "Profile & Security",
      headerTitle: "Brand Command Center",
      headerSubtitle: "Control your identity, access, and verification status.",
      verification: "Verification Status",
      verified: "Verified",
      pending: "Pending Approval",
      dragDrop: "Drag & drop your logo here, or click to upload.",
      dragDropHint: "PNG, JPG up to 2MB.",
      name: "Company Name",
      industry: "Industry",
      phone: "Phone",
      updateProfile: "Update Profile",
      security: "Security Center",
      passwordControl: "Password Control",
      lastChanged: "Last changed",
      currentPassword: "Current Password",
      newPassword: "New Password",
      updateCredentials: "Update Email & Password",
      strengthHint: "Min 8 chars, 1 uppercase, 1 number",
      changePassword: "Change Password",
      saving: "Saving...",
    },
    ar: {
      headerEyebrow: "الملف والأمان",
      headerTitle: "مركز الهوية",
      headerSubtitle: "تحكم في الهوية والوصول وحالة التحقق.",
      verification: "حالة التحقق",
      verified: "موثّق",
      pending: "قيد الموافقة",
      dragDrop: "اسحب الشعار هنا أو انقر للتحميل.",
      dragDropHint: "PNG أو JPG حتى 2MB.",
      name: "اسم الشركة",
      industry: "المجال",
      phone: "الهاتف",
      updateProfile: "تحديث الملف",
      security: "مركز الأمان",
      passwordControl: "إدارة كلمة المرور",
      lastChanged: "آخر تغيير",
      currentPassword: "كلمة المرور الحالية",
      newPassword: "كلمة مرور جديدة",
      updateCredentials: "تحديث البريد وكلمة المرور",
      strengthHint: "8 أحرف على الأقل، حرف كبير ورقم",
      changePassword: "تغيير كلمة المرور",
      saving: "جارٍ الحفظ...",
    },
  }[language];

  const data = profile ?? {
    name: "",
    industry: "",
    email: "",
    phone: "",
    verified: false,
    lastPasswordChange: "",
  };

  const strengthLabel =
    language === "ar"
      ? ["ضعيفة", "جيدة", "قوية"][strengthScore] ?? "ضعيفة"
      : ["Weak", "Good", "Strong"][strengthScore] ?? "Weak";

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow={copy.headerEyebrow}
        title={copy.headerTitle}
        subtitle={copy.headerSubtitle}
      />

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Card>
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-28" />
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-[var(--chip-bg)]">
                    {logoFile ? (
                      <img
                        src={URL.createObjectURL(logoFile)}
                        alt="Logo preview"
                        className="h-full w-full object-cover"
                      />
                    ) : data.logoUrl ? (
                      <img
                        src={data.logoUrl}
                        alt="Company logo"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[var(--text-muted)]">
                        <ShieldCheck size={18} />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
                      {copy.verification}
                    </p>
                    <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-[var(--chip-bg)] px-3 py-1 text-xs font-semibold text-[var(--text-primary)]">
                      <ShieldCheck size={14} />
                      {data.verified ? copy.verified : copy.pending}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-[var(--text-muted)]">{data.email}</div>
              </div>

              <div
                {...getRootProps()}
                className={`smooth-hover flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[var(--panel-border)] p-6 text-center ${
                  isDragActive ? "bg-[var(--chip-bg)]" : ""
                }`}
              >
                <input {...getInputProps()} />
                <UploadCloud size={28} className="text-[var(--accent)]" />
                <p className="mt-3 text-xs text-[var(--text-muted)]">
                  {copy.dragDrop}
                </p>
                <p className="mt-1 text-[11px] text-[var(--text-muted)]">{copy.dragDropHint}</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="profile-name" className="text-xs text-[var(--text-muted)]">
                    {copy.name}
                  </label>
                  <input
                    id="profile-name"
                    name="name"
                    defaultValue={data.name}
                    onChange={(event) =>
                      setProfileForm((prev) => ({ ...prev, name: event.target.value }))
                    }
                    className="w-full rounded-xl border border-[var(--panel-border)] bg-transparent px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="profile-industry" className="text-xs text-[var(--text-muted)]">
                    {copy.industry}
                  </label>
                  <input
                    id="profile-industry"
                    name="industry"
                    defaultValue={data.industry}
                    onChange={(event) =>
                      setProfileForm((prev) => ({ ...prev, industry: event.target.value }))
                    }
                    className="w-full rounded-xl border border-[var(--panel-border)] bg-transparent px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="profile-phone" className="text-xs text-[var(--text-muted)]">
                    {copy.phone}
                  </label>
                  <input
                    id="profile-phone"
                    name="phone"
                    defaultValue={data.phone}
                    onChange={(event) =>
                      setProfileForm((prev) => ({ ...prev, phone: event.target.value }))
                    }
                    className="w-full rounded-xl border border-[var(--panel-border)] bg-transparent px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                  />
                </div>
              </div>

              <Button
                className="w-full justify-center"
                onClick={handleProfileSave}
                disabled={updateProfile.isPending}
              >
                {updateProfile.isPending ? copy.saving : copy.updateProfile}
              </Button>
            </div>
          )}
        </Card>

        <Card>
          <div className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
                {copy.security}
              </p>
              <h3 className="heading-serif text-xl text-[var(--text-primary)]">
                {copy.passwordControl}
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                {copy.lastChanged}: {data.lastPasswordChange || "—"}
              </p>
            </div>
            <Button
              className="w-full justify-center"
              onClick={() => setShowCredentials(true)}
            >
              {copy.updateCredentials}
            </Button>
          </div>
        </Card>
      </div>

      {showCredentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6">
          <div className="glass-card w-full max-w-lg rounded-3xl border p-6">
            <h3 className="heading-serif text-xl text-[var(--text-primary)]">
              {copy.updateCredentials}
            </h3>
            <div className="mt-4 space-y-3">
              <div className="space-y-2">
                <label htmlFor="profile-email" className="text-xs text-[var(--text-muted)]">
                  {language === "ar" ? "البريد الإلكتروني" : "Email"}
                </label>
                <input
                  id="profile-email"
                  name="email"
                  defaultValue={data.email}
                  onChange={(event) =>
                    setProfileForm((prev) => ({ ...prev, email: event.target.value }))
                  }
                  className="w-full rounded-xl border border-[var(--panel-border)] bg-transparent px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="profile-current-password" className="text-xs text-[var(--text-muted)]">
                  {copy.currentPassword}
                </label>
                <input
                  id="profile-current-password"
                  name="currentPassword"
                  type="password"
                  value={passwords.currentPassword}
                  onChange={(event) =>
                    setPasswords((prev) => ({ ...prev, currentPassword: event.target.value }))
                  }
                  className="w-full rounded-xl border border-[var(--panel-border)] bg-transparent px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="profile-new-password" className="text-xs text-[var(--text-muted)]">
                  {copy.newPassword}
                </label>
                <input
                  id="profile-new-password"
                  name="newPassword"
                  type="password"
                  value={passwords.newPassword}
                  onChange={(event) =>
                    setPasswords((prev) => ({ ...prev, newPassword: event.target.value }))
                  }
                  className="w-full rounded-xl border border-[var(--panel-border)] bg-transparent px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                />
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[var(--panel-border)]">
                  <div
                    className="h-full rounded-full bg-[var(--accent)] transition-all"
                    style={{ width: `${(strengthScore / 3) * 100}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                  <span>{copy.strengthHint}</span>
                  <span className="text-[var(--accent)]">{strengthLabel}</span>
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setShowCredentials(false)}>
                {language === "ar" ? "إلغاء" : "Cancel"}
              </Button>
              <Button
                onClick={() => {
                  handleProfileSave();
                  if (passwords.currentPassword && passwords.newPassword) {
                    handlePasswordSave();
                  }
                  setShowCredentials(false);
                }}
                disabled={updateProfile.isPending || changePassword.isPending}
              >
                {copy.changePassword}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileSecurity;
