import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import AuthLayout from "../components/auth/AuthLayout";
import Button from "../components/shared/Button";
import { useLanguage } from "../contexts/LanguageContext";
import { authApi } from "../services/api/api";
import { mapAuthError } from "../utils/authMessages";

const RequestTracked: React.FC = () => {
  const { language } = useLanguage();
  const location = useLocation();
  const [requestId, setRequestId] = useState("");
  const [loading, setLoading] = useState(false);
  const email = (location.state as { email?: string } | null)?.email ?? "";

  const copy = {
    en: {
      title: "Request Tracked",
      subtitle: "Your company profile is pending admin approval.",
      requestId: "Request ID",
      check: "Check Status",
    },
    ar: {
      title: "متابعة الطلب",
      subtitle: "طلب الشركة قيد المراجعة من الإدارة.",
      requestId: "رقم الطلب",
      check: "تحقق من الحالة",
    },
  }[language];

  const handleTrack = async () => {
    try {
      setLoading(true);
      await authApi.trackCompanyRequest({ request_id: requestId, email });
      toast.success(language === "ar" ? "تم تحديث الحالة" : "Status updated");
    } catch (error: any) {
      toast.error(mapAuthError(error?.response?.status, language));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title={copy.title} subtitle={copy.subtitle}>
      <div className="space-y-4 text-sm text-[var(--text-muted)]">
        <p>
          {language === "ar"
            ? "سنتواصل معك عبر البريد الإلكتروني عند الموافقة."
            : "We will notify you by email once approval is complete."}
        </p>
        <div className="space-y-2">
          <label htmlFor="track-request-id" className="text-xs text-[var(--text-muted)]">
            {copy.requestId}
          </label>
          <input
            id="track-request-id"
            name="request_id"
            value={requestId}
            onChange={(event) => setRequestId(event.target.value)}
            className="w-full rounded-xl border border-[var(--panel-border)] bg-transparent px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
          />
        </div>
        <Button className="w-full justify-center" onClick={handleTrack} disabled={loading}>
          {loading ? "..." : copy.check}
        </Button>
      </div>
    </AuthLayout>
  );
};

export default RequestTracked;
