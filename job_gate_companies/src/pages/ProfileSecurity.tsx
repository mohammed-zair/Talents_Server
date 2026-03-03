import React, { useEffect, useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { ShieldCheck, UploadCloud } from "lucide-react";
import { useNavigate } from "react-router-dom";
import SectionHeader from "../components/shared/SectionHeader";
import Card from "../components/shared/Card";
import Button from "../components/shared/Button";
import Skeleton from "../components/shared/Skeleton";
import { companyApi } from "../services/api/api";
import type { CompanyProfile } from "../types";
import { useLanguage } from "../contexts/LanguageContext";
import { clearToken } from "../services/auth";

const ProfileSecurity: React.FC = () => {
  const queryClient = useQueryClient();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { data: profile, isLoading } = useQuery({
    queryKey: ["company-profile"],
    queryFn: companyApi.getCompanyProfile,
  });

  const [profileForm, setProfileForm] = useState<Partial<CompanyProfile>>({});
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "" });
  const [showCredentials, setShowCredentials] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteOtp, setDeleteOtp] = useState("");
  const [deleteError, setDeleteError] = useState("");

  const updateProfile = useMutation({
    mutationFn: companyApi.updateCompanyProfile,
    onSuccess: () => {
      toast.success(language === "ar" ? "?? ????? ?????" : "Profile updated");
      queryClient.invalidateQueries({ queryKey: ["company-profile"] });
    },
    onError: () =>
      toast.error(language === "ar" ? "???? ????? ?????" : "Failed to update profile"),
  });

  const changePassword = useMutation({
    mutationFn: companyApi.changeCompanyPassword,
    onSuccess: () => {
      toast.success(language === "ar" ? "?? ????? ???? ??????" : "Password updated");
      setPasswords({ currentPassword: "", newPassword: "" });
    },
    onError: () =>
      toast.error(language === "ar" ? "???? ????? ???? ??????" : "Failed to update password"),
  });

  const requestDelete = useMutation({
    mutationFn: companyApi.requestDeleteAccount,
    onSuccess: () => {
      setDeleteStep(2);
      setDeleteError("");
    },
    onError: (error: any) => {
      setDeleteError(error?.response?.data?.message || copy.deleteRequestFailed);
    },
  });

  const confirmDelete = useMutation({
    mutationFn: companyApi.confirmDeleteAccount,
    onSuccess: async () => {
      clearToken();
      try {
        await companyApi.getSession();
      } catch (_) {
        // Session is expected to be invalid after deletion.
      }
      navigate("/login", { replace: true });
    },
    onError: (error: any) => {
      setDeleteError(error?.response?.data?.message || copy.deleteConfirmFailed);
    },
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

  useEffect(() => {
    if (!profile) return;
    setProfileForm({
      name: profile.name ?? "",
      industry: profile.industry ?? "",
      email: profile.email ?? "",
      phone: profile.phone ?? "",
    });
  }, [profile]);
  const handleProfileSave = () => {
    const payload = new FormData();
    if (profileForm.name !== undefined) payload.append("name", profileForm.name || "");
    if (profileForm.industry !== undefined) payload.append("description", profileForm.industry || "");
    if (profileForm.phone !== undefined) payload.append("phone", profileForm.phone || "");
    if (profileForm.email !== undefined) payload.append("email", profileForm.email || "");
    if (logoFile) payload.append("logo", logoFile);
    updateProfile.mutate(payload);
  };

  const handlePasswordSave = () => {
    changePassword.mutate(passwords);
  };

  const resetDeleteFlow = () => {
    setDeleteStep(1);
    setDeletePassword("");
    setDeleteReason("");
    setDeleteOtp("");
    setDeleteError("");
  };

  const openDeleteModal = () => {
    resetDeleteFlow();
    setShowDeleteModal(true);
  };

  const handleRequestDeleteOtp = () => {
    if (!deletePassword.trim()) {
      setDeleteError(copy.deletePasswordRequired);
      return;
    }
    requestDelete.mutate({
      current_password: deletePassword,
      reason: deleteReason.trim() || undefined,
      language,
    });
  };

  const handleConfirmDelete = () => {
    if (!deleteOtp.trim()) {
      setDeleteError(copy.deleteOtpRequired);
      return;
    }
    confirmDelete.mutate({ otp: deleteOtp.trim() });
  };

  const copy = {
    en: {
      headerEyebrow: "Profile & Security",
      headerTitle: "Brand Command Center",
      headerSubtitle: "Control your identity, access, and verification status.",
      verification: "Verification Status",
      currentData: "Current Data",
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
      dangerTitle: "Danger Zone",
      dangerDesc:
        "Deleting this account is irreversible. Access is blocked immediately and permanent purge happens after 30 days.",
      deleteAccount: "Delete Account",
      deleteReason: "Reason (optional)",
      deleteOtp: "Deletion OTP",
      sendDeleteOtp: "Send OTP",
      confirmDelete: "Confirm Deletion",
      deletePasswordRequired: "Current password is required.",
      deleteOtpRequired: "OTP code is required.",
      deleteRequestFailed: "Failed to send deletion OTP.",
      deleteConfirmFailed: "Failed to delete account.",
      cancel: "Cancel",
    },
    ar: {
      headerEyebrow: "????? ???????",
      headerTitle: "???? ??????",
      headerSubtitle: "???? ?? ?????? ??????? ????? ??????.",
      verification: "???? ??????",
      currentData: "البيانات الحالية",
      verified: "?????",
      pending: "??? ????????",
      dragDrop: "???? ?????? ??? ?? ???? ???????.",
      dragDropHint: "PNG ?? JPG ??? 2MB.",
      name: "??? ??????",
      industry: "??????",
      phone: "??????",
      updateProfile: "????? ?????",
      security: "???? ??????",
      passwordControl: "????? ???? ??????",
      lastChanged: "??? ?????",
      currentPassword: "???? ?????? ???????",
      newPassword: "???? ???? ?????",
      updateCredentials: "????? ?????? ????? ??????",
      strengthHint: "8 ???? ??? ?????? ??? ???? ????",
      changePassword: "????? ???? ??????",
      saving: "???? ?????...",
      dangerTitle: "????? ?????",
      dangerDesc:
        "??? ?????? ????? ?????. ???? ????? ?????? ????? ?????? ??????? ??? 30 ?????.",
      deleteAccount: "??? ??????",
      deleteReason: "??? ????? (???????)",
      deleteOtp: "??? ??? ??????",
      sendDeleteOtp: "????? ?????",
      confirmDelete: "????? ?????",
      deletePasswordRequired: "???? ?????? ??????? ??????.",
      deleteOtpRequired: "??? ?????? ?????.",
      deleteRequestFailed: "???? ????? ??? ?????.",
      deleteConfirmFailed: "???? ??? ??????.",
      cancel: "?????",
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
      ? ["?????", "????", "????"][strengthScore] ?? "?????"
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
                  <div className="h-14 w-14 overflow-hidden rounded-full border border-[var(--panel-border)] bg-[var(--chip-bg)]">
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

              <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--chip-bg)]/40 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
                  {copy.currentData}
                </p>
                <div className="mt-3 grid gap-2 text-sm text-[var(--text-primary)]">
                  <p>
                    <span className="text-[var(--text-muted)]">{copy.name}: </span>
                    {data.name || "—"}
                  </p>
                  <p>
                    <span className="text-[var(--text-muted)]">{copy.industry}: </span>
                    {data.industry || "—"}
                  </p>
                  <p>
                    <span className="text-[var(--text-muted)]">Email: </span>
                    {data.email || "—"}
                  </p>
                  <p>
                    <span className="text-[var(--text-muted)]">{copy.phone}: </span>
                    {data.phone || "—"}
                  </p>
                </div>
              </div>

              <div
                {...getRootProps()}
                className={`smooth-hover flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[var(--panel-border)] p-6 text-center ${
                  isDragActive ? "bg-[var(--chip-bg)]" : ""
                }`}
              >
                <input {...getInputProps()} />
                <UploadCloud size={28} className="text-[var(--accent)]" />
                <p className="mt-3 text-xs text-[var(--text-muted)]">{copy.dragDrop}</p>
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
                    value={profileForm.name ?? ""}
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
                    value={profileForm.industry ?? ""}
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
                    value={profileForm.phone ?? ""}
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
              <h3 className="heading-serif text-xl text-[var(--text-primary)]">{copy.passwordControl}</h3>
              <p className="text-xs text-[var(--text-muted)]">
                {copy.lastChanged}: {data.lastPasswordChange || "—"}
              </p>
            </div>
            <Button className="w-full justify-center" onClick={() => setShowCredentials(true)}>
              {copy.updateCredentials}
            </Button>
          </div>
        </Card>
      </div>

      <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-5">
        <h3 className="heading-serif text-xl text-red-300">{copy.dangerTitle}</h3>
        <p className="mt-2 text-sm text-red-200/90">{copy.dangerDesc}</p>
        <Button className="mt-4 border border-red-400 text-red-200" variant="ghost" onClick={openDeleteModal}>
          {copy.deleteAccount}
        </Button>
      </div>

      {showCredentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6">
          <div className="glass-card w-full max-w-lg rounded-3xl border p-6">
            <h3 className="heading-serif text-xl text-[var(--text-primary)]">{copy.updateCredentials}</h3>
            <div className="mt-4 space-y-3">
              <div className="space-y-2">
                <label htmlFor="profile-email" className="text-xs text-[var(--text-muted)]">
                  {language === "ar" ? "?????? ??????????" : "Email"}
                </label>
                <input
                  id="profile-email"
                  name="email"
                  value={profileForm.email ?? ""}
                  onChange={(event) => setProfileForm((prev) => ({ ...prev, email: event.target.value }))}
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
                  onChange={(event) => setPasswords((prev) => ({ ...prev, currentPassword: event.target.value }))}
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
                  onChange={(event) => setPasswords((prev) => ({ ...prev, newPassword: event.target.value }))}
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
                {copy.cancel}
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

      {showDeleteModal && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/60 p-6">
          <div className="glass-card w-full max-w-lg rounded-3xl border border-red-500/40 p-6">
            <h3 className="heading-serif text-xl text-red-300">{copy.deleteAccount}</h3>
            <p className="mt-2 text-sm text-[var(--text-muted)]">{copy.dangerDesc}</p>

            {deleteStep === 1 ? (
              <div className="mt-4 space-y-3">
                <div className="space-y-2">
                  <label className="text-xs text-[var(--text-muted)]">{copy.currentPassword}</label>
                  <input
                    type="password"
                    value={deletePassword}
                    onChange={(event) => setDeletePassword(event.target.value)}
                    className="w-full rounded-xl border border-[var(--panel-border)] bg-transparent px-4 py-3 text-sm text-[var(--text-primary)] outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-[var(--text-muted)]">{copy.deleteReason}</label>
                  <textarea
                    value={deleteReason}
                    onChange={(event) => setDeleteReason(event.target.value)}
                    rows={3}
                    className="w-full rounded-xl border border-[var(--panel-border)] bg-transparent px-4 py-3 text-sm text-[var(--text-primary)] outline-none"
                  />
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-2">
                <label className="text-xs text-[var(--text-muted)]">{copy.deleteOtp}</label>
                <input
                  type="text"
                  value={deleteOtp}
                  onChange={(event) => setDeleteOtp(event.target.value)}
                  className="w-full rounded-xl border border-[var(--panel-border)] bg-transparent px-4 py-3 text-sm text-[var(--text-primary)] outline-none"
                />
              </div>
            )}

            {deleteError && <p className="mt-3 text-sm text-red-300">{deleteError}</p>}

            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowDeleteModal(false);
                  resetDeleteFlow();
                }}
              >
                {copy.cancel}
              </Button>
              {deleteStep === 1 ? (
                <Button
                  variant="ghost"
                  className="border border-red-400 text-red-200"
                  onClick={handleRequestDeleteOtp}
                  disabled={requestDelete.isPending}
                >
                  {requestDelete.isPending ? copy.saving : copy.sendDeleteOtp}
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  className="border border-red-400 text-red-200"
                  onClick={handleConfirmDelete}
                  disabled={confirmDelete.isPending}
                >
                  {confirmDelete.isPending ? copy.saving : copy.confirmDelete}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileSecurity;








