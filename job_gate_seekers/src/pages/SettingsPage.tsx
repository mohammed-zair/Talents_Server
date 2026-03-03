import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";
import { useTheme } from "../contexts/ThemeContext";
import { clearSession } from "../utils/auth";
import { seekerApi } from "../services/api";

const SettingsPage: React.FC = () => {
  const { t, language, setLanguage } = useLanguage();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1);
  const [currentPassword, setCurrentPassword] = useState("");
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteOtp, setDeleteOtp] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const resetDeleteFlow = () => {
    setDeleteStep(1);
    setCurrentPassword("");
    setDeleteReason("");
    setDeleteOtp("");
    setDeleteError("");
    setDeleteLoading(false);
  };

  const handleOpenDelete = () => {
    resetDeleteFlow();
    setShowDeleteModal(true);
  };

  const handleRequestDeleteOtp = async () => {
    setDeleteError("");
    if (!currentPassword.trim()) {
      setDeleteError(t("deletePasswordRequired"));
      return;
    }
    setDeleteLoading(true);
    try {
      await seekerApi.requestDeleteAccount({
        current_password: currentPassword,
        reason: deleteReason.trim() || undefined,
        language,
      });
      setDeleteStep(2);
    } catch (error: any) {
      setDeleteError(error?.response?.data?.message || t("deleteRequestFailed"));
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    setDeleteError("");
    if (!deleteOtp.trim()) {
      setDeleteError(t("deleteOtpRequired"));
      return;
    }
    setDeleteLoading(true);
    try {
      await seekerApi.confirmDeleteAccount({ otp: deleteOtp.trim() });
      clearSession();
      navigate("/auth/login", { replace: true });
    } catch (error: any) {
      setDeleteError(error?.response?.data?.message || t("deleteConfirmFailed"));
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="glass-card p-5">
        <h1 className="text-2xl font-bold">{t("settings")}</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">{t("settingsSubtitle")}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="glass-card p-4">
          <h2 className="mb-3 text-lg font-semibold">{t("language")}</h2>
          <div className="flex flex-wrap gap-2">
            <button
              className={`rounded-xl border px-4 py-2 ${language === "en" ? "nav-active" : "border-[var(--border)]"}`}
              onClick={() => setLanguage("en")}
            >
              English
            </button>
            <button
              className={`rounded-xl border px-4 py-2 ${language === "ar" ? "nav-active" : "border-[var(--border)]"}`}
              onClick={() => setLanguage("ar")}
            >
              ???????
            </button>
          </div>
        </div>

        <div className="glass-card p-4">
          <h2 className="mb-3 text-lg font-semibold">{t("theme")}</h2>
          <div className="flex flex-wrap gap-2">
            <button
              className={`rounded-xl border px-4 py-2 ${theme === "dark" ? "nav-active" : "border-[var(--border)]"}`}
              onClick={() => setTheme("dark")}
            >
              {t("themeDark")}
            </button>
            <button
              className={`rounded-xl border px-4 py-2 ${theme === "light" ? "nav-active" : "border-[var(--border)]"}`}
              onClick={() => setTheme("light")}
            >
              {t("themeLight")}
            </button>
            <button
              className={`rounded-xl border px-4 py-2 ${theme === "premium" ? "nav-active" : "border-[var(--border)]"}`}
              onClick={() => setTheme("premium")}
            >
              {t("themePremium")}
            </button>
          </div>
        </div>
      </div>

      <div className="glass-card p-4">
        <h2 className="mb-3 text-lg font-semibold">{t("accountActions")}</h2>
        <div className="flex flex-wrap gap-2">
          <button
            className="rounded-xl border border-[var(--border)] px-4 py-2"
            onClick={() => navigate("/profile")}
          >
            {t("profile")}
          </button>
          <button
            className="rounded-xl border border-[var(--border)] px-4 py-2"
            onClick={() => navigate("/applications")}
          >
            {t("applications")}
          </button>
          <button
            className="rounded-xl border border-[var(--border)] px-4 py-2 text-red-400"
            onClick={() => {
              clearSession();
              navigate("/auth/login", { replace: true });
            }}
          >
            {t("logout")}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4">
        <h2 className="text-lg font-semibold text-red-300">{t("dangerZoneTitle")}</h2>
        <p className="mt-1 text-sm text-red-200/90">{t("dangerZoneDesc")}</p>
        <button
          className="mt-4 rounded-xl border border-red-400 px-4 py-2 text-red-200 hover:bg-red-500/20"
          onClick={handleOpenDelete}
        >
          {t("deleteAccount")}
        </button>
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-red-500/40 bg-[var(--panel)] p-5">
            <h3 className="text-xl font-semibold text-red-300">{t("deleteAccount")}</h3>
            <p className="mt-2 text-sm text-[var(--text-muted)]">{t("dangerZoneDesc")}</p>

            {deleteStep === 1 ? (
              <div className="mt-4 space-y-3">
                <div>
                  <label className="mb-1 block text-sm">{t("currentPassword")}</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm">{t("deleteReason")}</label>
                  <textarea
                    value={deleteReason}
                    onChange={(e) => setDeleteReason(e.target.value)}
                    className="w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2"
                    rows={3}
                  />
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <label className="mb-1 block text-sm">{t("deleteOtp")}</label>
                <input
                  type="text"
                  value={deleteOtp}
                  onChange={(e) => setDeleteOtp(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2"
                />
              </div>
            )}

            {deleteError && <p className="mt-3 text-sm text-red-300">{deleteError}</p>}

            <div className="mt-5 flex justify-end gap-2">
              <button
                className="rounded-xl border border-[var(--border)] px-4 py-2"
                onClick={() => {
                  setShowDeleteModal(false);
                  resetDeleteFlow();
                }}
              >
                {t("cancel")}
              </button>
              {deleteStep === 1 ? (
                <button
                  className="rounded-xl border border-red-400 px-4 py-2 text-red-200"
                  onClick={handleRequestDeleteOtp}
                  disabled={deleteLoading}
                >
                  {deleteLoading ? t("sending") : t("sendDeleteOtp")}
                </button>
              ) : (
                <button
                  className="rounded-xl border border-red-400 px-4 py-2 text-red-200"
                  onClick={handleConfirmDelete}
                  disabled={deleteLoading}
                >
                  {deleteLoading ? t("sending") : t("confirmDelete")}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
