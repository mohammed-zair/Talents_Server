import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  RefreshCw,
  LogOut,
  LifeBuoy,
  Sparkles,
} from "lucide-react";
import Button from "../components/shared/Button";
import { useLanguage } from "../contexts/LanguageContext";
import { authApi } from "../services/api/api";
import { useLocation, useNavigate } from "react-router-dom";

const RequestTracked: React.FC = () => {
  const { language } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const email = (location.state as { email?: string } | null)?.email ?? "";
  const initialRequestId =
    (location.state as { requestId?: string | number } | null)?.requestId ?? "";

  const [requestId, setRequestId] = useState(String(initialRequestId));
  const [status, setStatus] = useState<"pending" | "approved" | "rejected">("pending");
  const [loading, setLoading] = useState(false);
  const [spin, setSpin] = useState(false);

  const copy = {
    en: {
      title: "Verification in Progress",
      subtitle: "Your company request is being reviewed with priority handling.",
      refresh: "Refresh Status",
      requestId: "Request ID",
      steps: [
        { label: "Secure Channel Established", state: "done" },
        { label: "Verifying Company Credentials", state: "active" },
        { label: "AI Matching Engine Preparation", state: "pending" },
        { label: "Final Human-in-the-loop Audit", state: "pending" },
      ],
      waitTitle: "What to expect once approved?",
      waitItems: [
        "Access to Top 5% Talent",
        "Bias‑Shield Hiring",
        "Predictive Velocity Charts",
      ],
      logout: "Logout",
      support: "Contact Support",
      approved: "Approved. Redirecting...",
      rejected: "Request rejected. Please contact support.",
    },
    ar: {
      title: "التحقق جارٍ",
      subtitle: "طلب شركتك قيد المراجعة بأولوية عالية.",
      refresh: "تحديث الحالة",
      requestId: "رقم الطلب",
      steps: [
        { label: "تم إنشاء القناة الآمنة", state: "done" },
        { label: "التحقق من بيانات الشركة", state: "active" },
        { label: "تهيئة محرك المطابقة", state: "pending" },
        { label: "مراجعة بشرية نهائية", state: "pending" },
      ],
      waitTitle: "ماذا تتوقع بعد الموافقة؟",
      waitItems: ["الوصول لأفضل 5% من المواهب", "توظيف بدون تحيز", "مؤشرات سرعة تنبؤية"],
      logout: "تسجيل الخروج",
      support: "تواصل مع الدعم",
      approved: "تمت الموافقة. جارٍ التحويل...",
      rejected: "تم رفض الطلب. تواصل مع الدعم.",
    },
  }[language];

  const handleTrack = async () => {
    if (!requestId && !email) return;
    try {
      setLoading(true);
      const response = await authApi.trackCompanyRequest({
        request_id: requestId,
        email,
      });
      const nextStatus =
        response?.status ?? response?.data?.status ?? response?.data?.state ?? "pending";
      if (nextStatus === "approved") {
        setStatus("approved");
      } else if (nextStatus === "rejected") {
        setStatus("rejected");
      } else {
        setStatus("pending");
      }
    } catch (error: any) {
      setStatus("pending");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!requestId) return;
    const id = setInterval(() => handleTrack(), 60_000);
    return () => clearInterval(id);
  }, [requestId]);

  useEffect(() => {
    if (status !== "approved") return;
    let cancelled = false;
    (async () => {
      try {
        const confetti = (await import("canvas-confetti")).default;
        confetti({
          particleCount: 120,
          spread: 70,
          origin: { y: 0.7 },
          colors: ["#00A8E8", "#12B5A6", "#ffffff"],
        });
      } catch (_) {
        // Ignore if confetti can't load.
      }
      if (!cancelled) {
        setTimeout(() => navigate("/dashboard"), 1800);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status, navigate]);

  const stepList = useMemo(() => copy.steps, [copy.steps]);

  return (
    <div className="min-h-screen bg-[var(--app-bg)]">
      <div className="relative min-h-screen overflow-hidden bg-[#070A0F]">
        <div className="absolute inset-0 auth-mesh opacity-70" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#1a1a40,transparent_60%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(0,168,232,0.18),transparent_55%)]" />

        <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 py-12">
          <div className="flex flex-col items-center text-center">
            <motion.div
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="mb-6 flex h-16 w-16 items-center justify-center rounded-3xl border border-white/20 bg-white/10 backdrop-blur-xl"
              style={{ boxShadow: "0 0 22px rgba(0,168,232,0.35)" }}
            >
              <img src="/favicon.ico" alt="Talents We Trust" className="h-8 w-8" />
            </motion.div>
            <h1 className="heading-serif text-3xl text-white">{copy.title}</h1>
            <p className="mt-2 text-sm text-white/60">{copy.subtitle}</p>
          </div>

          <div className="mt-10 grid w-full max-w-4xl gap-6 lg:grid-cols-[1fr_1fr]">
            <div className="relative flex items-center justify-center rounded-3xl border border-white/20 bg-white/5 p-8 backdrop-blur-xl">
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
                  className="h-40 w-40 rounded-full border border-cyan-400/30"
                />
                <motion.div
                  animate={{ rotate: -360 }}
                  transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
                  className="h-52 w-52 rounded-full border border-teal-400/25"
                />
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 26, repeat: Infinity, ease: "linear" }}
                  className="h-64 w-64 rounded-full border border-white/10"
                />
              </div>
              <motion.div
                animate={{ scale: [0.96, 1.02, 0.96] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="relative z-10 flex h-24 w-24 items-center justify-center rounded-3xl border border-white/20 bg-white/10 backdrop-blur-xl"
              >
                <ShieldCheck size={36} className="text-cyan-300" />
              </motion.div>
              <div className="absolute inset-0">
                {[...Array(8)].map((_, i) => (
                  <motion.span
                    key={`dot-${i}`}
                    className="absolute h-2 w-2 rounded-full bg-teal-300/60"
                    style={{
                      top: `${10 + i * 10}%`,
                      left: `${15 + i * 8}%`,
                    }}
                    animate={{ x: [0, 120], opacity: [0, 1, 0] }}
                    transition={{ duration: 3 + i * 0.4, repeat: Infinity, delay: i * 0.2 }}
                  />
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-white/20 bg-white/5 p-8 backdrop-blur-xl">
              <p className="text-xs uppercase tracking-[0.2em] text-white/50">Verification</p>
              <div className="mt-4 space-y-4">
                {stepList.map((step, index) => (
                  <div
                    key={`${step.label}-${index}`}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80"
                  >
                    <span>{step.label}</span>
                    <span className="text-xs text-white/60">
                      {step.state === "done" ? "✅" : step.state === "active" ? "⏳" : "⚪"}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-6 space-y-3">
                <label htmlFor="track-request-id" className="text-xs text-white/60">
                  {copy.requestId}
                </label>
                <input
                  id="track-request-id"
                  name="request_id"
                  value={requestId}
                  onChange={(event) => setRequestId(event.target.value)}
                  className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300"
                />
                <Button
                  className="w-full justify-center"
                  onClick={() => {
                    setSpin(true);
                    handleTrack();
                    setTimeout(() => setSpin(false), 500);
                  }}
                  disabled={loading}
                >
                  <motion.span animate={{ rotate: spin ? 180 : 0 }} className="me-2 inline-flex">
                    <RefreshCw size={16} />
                  </motion.span>
                  {loading ? "..." : copy.refresh}
                </Button>
                {status === "approved" && (
                  <p className="text-xs text-cyan-300">{copy.approved}</p>
                )}
                {status === "rejected" && (
                  <p className="text-xs text-rose-300">{copy.rejected}</p>
                )}
              </div>
            </div>
          </div>

          <div className="mt-8 w-full max-w-4xl rounded-3xl border border-white/20 bg-white/5 p-6 backdrop-blur-xl">
            <p className="text-xs uppercase tracking-[0.2em] text-white/50">{copy.waitTitle}</p>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {copy.waitItems.map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80"
                >
                  <Sparkles size={16} className="text-cyan-300" />
                  {item}
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-white/60">
              <button
                className="flex items-center gap-2 hover:text-white"
                onClick={async () => {
                  try {
                    await authApi.companyLogout();
                  } catch (_) {
                    // Ignore logout errors
                  }
                  window.location.href = "/companies/login";
                }}
              >
                <LogOut size={14} />
                {copy.logout}
              </button>
              <a className="flex items-center gap-2 hover:text-white" href="mailto:support@talents-we-trust.tech">
                <LifeBuoy size={14} />
                {copy.support}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RequestTracked;
