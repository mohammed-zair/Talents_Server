import React, { useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  BadgeCheck,
  Bell,
  BriefcaseBusiness,
  Building2,
  FileText,
  LayoutDashboard,
  Mail,
  MessageSquareText,
  MoonStar,
  Search,
  Settings,
  Sparkles,
  Sun,
  User,
} from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import { useTheme } from "../../contexts/ThemeContext";
import { clearSession, getStoredUser } from "../../utils/auth";
import { seekerApi } from "../../services/api";

const navItems = [
  { to: "/pulse", key: "pulse", icon: LayoutDashboard },
  { to: "/opportunities", key: "opportunities", icon: BriefcaseBusiness },
  { to: "/cv-lab", key: "cvLab", icon: FileText },
  { to: "/ai-consultant", key: "aiConsultant", icon: MessageSquareText },
  { to: "/market", key: "market", icon: Building2 },
  { to: "/consultants", key: "consultants", icon: BadgeCheck },
  { to: "/applications", key: "applications", icon: Sparkles },
  { to: "/profile", key: "profile", icon: User },
  { to: "/settings", key: "settings", icon: Settings },
  { to: "/contact", key: "contact", icon: Mail },
];

const PageShell: React.FC = () => {
  const { t, language, setLanguage } = useLanguage();
  const { theme, cycleTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const navigate = useNavigate();
  const user = useMemo(() => getStoredUser(), []);

  const notificationsQ = useQuery({
    queryKey: ["notifications"],
    queryFn: seekerApi.listNotifications,
  });

  const notificationItems = useMemo(
    () => (Array.isArray(notificationsQ.data) ? notificationsQ.data : []),
    [notificationsQ.data]
  );
  const unreadCount = notificationItems.filter((n: any) => !n.is_read).length;

  return (
    <div className="min-h-screen mesh-bg text-[var(--text-primary)]">
      <Helmet>
        <title>{t("appTitle")}</title>
      </Helmet>
      <motion.div className="orb orb-a" animate={{ x: [0, 20, 0], y: [0, -18, 0] }} transition={{ duration: 14, repeat: Infinity }} />
      <motion.div className="orb orb-b" animate={{ x: [0, -18, 0], y: [0, 16, 0] }} transition={{ duration: 16, repeat: Infinity }} />

      <div className="relative z-10 flex min-h-screen">
        <aside className={`glass-panel border-r border-[var(--border)] p-4 transition-all duration-300 ${collapsed ? "w-20" : "w-72"}`}>
          <div className="mb-6 flex items-center justify-between">
            <Link to="/pulse" className="flex items-center gap-3">
              <img src="/logo.png" alt="Talents" className="h-10 w-10 rounded-2xl object-cover" />
              {!collapsed && (
                <div>
                  <p className="text-xs tracking-[0.35em] text-[var(--text-muted)]">TALENTS</p>
                  <p className="text-sm font-semibold">We Trust</p>
                </div>
              )}
            </Link>
            <button className="rounded-xl border border-[var(--border)] px-2 py-1 text-xs" onClick={() => setCollapsed((v) => !v)}>
              {collapsed ? ">" : "<"}
            </button>
          </div>

          <nav className="flex flex-col gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `group flex items-center gap-3 rounded-xl px-3 py-3 transition-all ${isActive ? "nav-active" : "hover:border hover:border-[var(--border)]"}`
                  }
                >
                  <Icon size={18} />
                  {!collapsed && <span>{t(item.key)}</span>}
                </NavLink>
              );
            })}
          </nav>
        </aside>

        <div className="flex flex-1 flex-col">
          <header className="glass-panel relative z-30 m-4 flex items-center gap-3 rounded-2xl p-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input className="w-full rounded-xl border border-[var(--border)] bg-transparent py-2 pl-9 pr-3 outline-none" placeholder={t("searchPlaceholder")} />
            </div>

            <button className="rounded-xl border border-[var(--border)] px-3 py-2" onClick={() => setLanguage(language === "en" ? "ar" : "en")}>{language.toUpperCase()}</button>
            <button className="rounded-xl border border-[var(--border)] p-2" onClick={cycleTheme} title={theme}>
              {theme === "light" ? <MoonStar size={16} /> : <Sun size={16} />}
            </button>

            <div className="relative">
              <button
                className="relative rounded-xl border border-[var(--border)] p-2"
                onClick={() => setNotificationsOpen((v) => !v)}
                title={t("notifications")}
              >
                <Bell size={16} />
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 rounded-full bg-[var(--accent)] px-1.5 text-[10px] font-bold text-black">
                    {Math.min(unreadCount, 99)}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 z-50 mt-2 w-80 rounded-xl border border-[var(--border)] bg-[var(--bg)]/95 p-2 shadow-xl backdrop-blur">
                  <p className="px-2 py-1 text-xs text-[var(--text-muted)]">{t("notifications")}</p>
                  <div className="max-h-72 space-y-1 overflow-auto">
                    {notificationItems.slice(0, 6).map((n: any) => (
                      <button
                        key={n.push_id}
                        className="w-full rounded-lg border border-transparent px-2 py-2 text-left hover:border-[var(--border)]"
                        onClick={() => {
                          setNotificationsOpen(false);
                          navigate("/notifications");
                        }}
                      >
                        <p className="text-sm font-medium">{n.title}</p>
                        <p className="line-clamp-2 text-xs text-[var(--text-muted)]">{n.message}</p>
                      </button>
                    ))}

                    {notificationItems.length === 0 && (
                      <p className="px-2 py-2 text-xs text-[var(--text-muted)]">{t("noNotificationsYet")}</p>
                    )}
                  </div>

                  <button
                    className="mt-2 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
                    onClick={() => {
                      setNotificationsOpen(false);
                      navigate("/notifications");
                    }}
                  >
                    {t("showAllNotifications")}
                  </button>
                </div>
              )}
            </div>

            <button
              className="rounded-xl border border-[var(--border)] px-3 py-2"
              onClick={() => {
                clearSession();
                navigate("/auth/login", { replace: true });
              }}
            >
              {t("logout")}
            </button>
          </header>

          <main className="relative z-10 px-4 pb-4">
            <div className="mb-3 text-sm text-[var(--text-muted)]">{user ? `${user.full_name} • ${user.email}` : ""}</div>
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
              <Outlet />
            </motion.div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default PageShell;
