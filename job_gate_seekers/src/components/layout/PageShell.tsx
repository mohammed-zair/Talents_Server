import React, { useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  FileText,
  Gem,
  LayoutDashboard,
  MessageSquareText,
  MoonStar,
  Search,
  Sparkles,
  Sun,
  User,
} from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import { useTheme } from "../../contexts/ThemeContext";
import { clearSession, getStoredUser } from "../../utils/auth";

const navItems = [
  { to: "/pulse", key: "pulse", icon: LayoutDashboard },
  { to: "/opportunities", key: "opportunities", icon: BriefcaseBusiness },
  { to: "/cv-lab", key: "cvLab", icon: FileText },
  { to: "/ai-consultant", key: "aiConsultant", icon: MessageSquareText },
  { to: "/market", key: "market", icon: Building2 },
  { to: "/consultants", key: "consultants", icon: BadgeCheck },
  { to: "/applications", key: "applications", icon: Sparkles },
  { to: "/profile", key: "profile", icon: User },
];

const PageShell: React.FC = () => {
  const { t, language, setLanguage } = useLanguage();
  const { theme, cycleTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const user = useMemo(() => getStoredUser(), []);

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
          <header className="glass-panel m-4 flex items-center gap-3 rounded-2xl p-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input className="w-full rounded-xl border border-[var(--border)] bg-transparent py-2 pl-9 pr-3 outline-none" placeholder={t("searchPlaceholder")} />
            </div>

            <button className="rounded-xl border border-[var(--border)] px-3 py-2" onClick={() => setLanguage(language === "en" ? "ar" : "en")}>{language.toUpperCase()}</button>
            <button className="rounded-xl border border-[var(--border)] p-2" onClick={cycleTheme} title={theme}>
              {theme === "light" ? <MoonStar size={16} /> : <Sun size={16} />}
            </button>
            <button className="premium-cta rounded-xl px-4 py-2 text-sm font-semibold">
              <Gem size={16} className="inline-block" /> {t("premiumUpgrade")}
            </button>
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

          <main className="px-4 pb-4">
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