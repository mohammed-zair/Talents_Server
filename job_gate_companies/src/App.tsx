import React, { Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, NavLink, Navigate, Route, Routes } from "react-router-dom";
import {
  Building2,
  BriefcaseBusiness,
  Globe2,
  MoonStar,
  SunMedium,
  Shield,
  ClipboardCheck,
  FileBadge,
} from "lucide-react";
const CompanyDashboard = React.lazy(() => import("./pages/CompanyDashboard"));
const ApplicationList = React.lazy(() => import("./pages/ApplicationList"));
const AuthLogin = React.lazy(() => import("./pages/AuthLogin"));
const AuthRegister = React.lazy(() => import("./pages/AuthRegister"));
const AuthPassword = React.lazy(() => import("./pages/AuthPassword"));
const RequestTracked = React.lazy(() => import("./pages/RequestTracked"));
const ProfileSecurity = React.lazy(() => import("./pages/ProfileSecurity"));
const JobsCommandGrid = React.lazy(() => import("./pages/JobsCommandGrid"));
const ApplicationDetail = React.lazy(() => import("./pages/ApplicationDetail"));
const CVRequests = React.lazy(() => import("./pages/CVRequests"));
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";
import { LanguageProvider, useLanguage } from "./contexts/LanguageContext";
import Button from "./components/shared/Button";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import AuthStatusOverlay from "./components/auth/AuthStatusOverlay";

const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, dir } = useLanguage();
  const navLabels = {
    en: {
      dashboard: "Dashboard",
      applications: "Applications",
      profile: "Profile & Security",
      jobs: "Jobs & Forms",
      cv: "CV Marketplace",
    },
    ar: {
      dashboard: "لوحة القيادة",
      applications: "الطلبات",
      profile: "الملف والأمان",
      jobs: "الوظائف والنماذج",
      cv: "سوق السير الذاتية",
    },
  }[language];

  return (
    <div className="min-h-screen">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 mesh-bg opacity-70" />
        <div className="relative z-10 flex min-h-screen flex-col lg:flex-row">
          <header className="flex items-center justify-between bg-[var(--panel-bg)] px-5 py-4 backdrop-blur-md lg:hidden">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[var(--accent)] text-slate-900">
                <Building2 size={18} />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">
                  Talents
                </p>
                <p className="text-sm font-semibold text-[var(--text-primary)]">We Trust</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                onClick={() => setTheme(theme === "trust" ? "ai" : "trust")}
                className="px-3"
              >
                {theme === "ai" ? <SunMedium size={16} /> : <MoonStar size={16} />}
              </Button>
              <Button
                variant="outline"
                onClick={() => setLanguage(language === "en" ? "ar" : "en")}
                className="px-3"
              >
                {language === "en" ? "AR" : "EN"}
              </Button>
            </div>
          </header>
          <aside
            className="hidden w-64 flex-col gap-6 bg-[var(--panel-bg)] p-6 backdrop-blur-md lg:flex"
            style={{ borderInlineEnd: "1px solid var(--panel-border)" }}
          >
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--accent)] text-slate-900">
                <Building2 size={20} />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">
                  Talents
                </p>
                <p className="text-sm font-semibold text-[var(--text-primary)]">We Trust</p>
              </div>
            </div>

            <nav className="flex flex-col gap-2 text-sm">
              <NavLink
                to="/dashboard"
                className={({ isActive }) =>
                  `smooth-hover flex items-center gap-3 rounded-xl px-4 py-3 text-[var(--text-primary)] ${
                    isActive ? "bg-[var(--chip-bg)]" : "hover:bg-[var(--chip-bg)]"
                  }`
                }
              >
                <BriefcaseBusiness size={18} />
                {navLabels.dashboard}
              </NavLink>
              <NavLink
                to="/applications"
                className={({ isActive }) =>
                  `smooth-hover flex items-center gap-3 rounded-xl px-4 py-3 text-[var(--text-primary)] ${
                    isActive ? "bg-[var(--chip-bg)]" : "hover:bg-[var(--chip-bg)]"
                  }`
                }
              >
                <Globe2 size={18} />
                {navLabels.applications}
              </NavLink>
              <NavLink
                to="/profile"
                className={({ isActive }) =>
                  `smooth-hover flex items-center gap-3 rounded-xl px-4 py-3 text-[var(--text-primary)] ${
                    isActive ? "bg-[var(--chip-bg)]" : "hover:bg-[var(--chip-bg)]"
                  }`
                }
              >
                <Shield size={18} />
                {navLabels.profile}
              </NavLink>
              <NavLink
                to="/jobs"
                className={({ isActive }) =>
                  `smooth-hover flex items-center gap-3 rounded-xl px-4 py-3 text-[var(--text-primary)] ${
                    isActive ? "bg-[var(--chip-bg)]" : "hover:bg-[var(--chip-bg)]"
                  }`
                }
              >
                <ClipboardCheck size={18} />
                {navLabels.jobs}
              </NavLink>
              <NavLink
                to="/cv-requests"
                className={({ isActive }) =>
                  `smooth-hover flex items-center gap-3 rounded-xl px-4 py-3 text-[var(--text-primary)] ${
                    isActive ? "bg-[var(--chip-bg)]" : "hover:bg-[var(--chip-bg)]"
                  }`
                }
              >
                <FileBadge size={18} />
                {navLabels.cv}
              </NavLink>
            </nav>

            <div className="mt-auto space-y-3">
              <div className="rounded-2xl border border-[var(--panel-border)] p-4 text-xs text-[var(--text-muted)]">
                <p className="text-[var(--text-primary)]">Bias-Shield Mode</p>
                <p>Encrypted anonymization starts Q2 2026.</p>
              </div>
              <div className="flex items-center justify-between gap-2">
                <Button
                  variant="ghost"
                  onClick={() => setTheme(theme === "trust" ? "ai" : "trust")}
                >
                  {theme === "ai" ? <SunMedium size={16} /> : <MoonStar size={16} />}
                  <span className="ms-2">{theme === "ai" ? "Light" : "Dark"}</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setTheme(theme === "cloud" ? "trust" : "cloud")}
                >
                  Premium
                </Button>
              </div>
              <Button variant="outline" onClick={() => setLanguage(language === "en" ? "ar" : "en")}>
                {language === "en" ? "AR" : "EN"} · {dir.toUpperCase()}
              </Button>
            </div>
          </aside>

          <main className="flex-1 p-6 lg:p-10">{children}</main>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
      },
    },
  });

  return (
    <ThemeProvider>
      <LanguageProvider>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <AuthStatusOverlay />
            <Suspense fallback={<AppShellFallback />}>
              <Routes>
                <Route path="/" element={<Navigate to="/login" replace />} />
                <Route path="/login" element={<AuthLogin />} />
                <Route path="/register" element={<AuthRegister />} />
                <Route path="/password/:mode" element={<AuthPassword />} />
                <Route path="/request-tracked" element={<RequestTracked />} />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <AppShell>
                        <CompanyDashboard />
                      </AppShell>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/applications"
                  element={
                    <ProtectedRoute>
                      <AppShell>
                        <ApplicationList />
                      </AppShell>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/applications/:id"
                  element={
                    <ProtectedRoute>
                      <AppShell>
                        <ApplicationDetail />
                      </AppShell>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <AppShell>
                        <ProfileSecurity />
                      </AppShell>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/jobs"
                  element={
                    <ProtectedRoute>
                      <AppShell>
                        <JobsCommandGrid />
                      </AppShell>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/cv-requests"
                  element={
                    <ProtectedRoute>
                      <AppShell>
                        <CVRequests />
                      </AppShell>
                    </ProtectedRoute>
                  }
                />
                <Route path="*" element={<Navigate to="/login" replace />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </QueryClientProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
};

export default App;

const AppShellFallback: React.FC = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--app-bg)]">
      <div className="glass-card w-full max-w-lg rounded-3xl border p-6 shadow-soft-ambient">
        <div className="mb-4 h-3 w-24 rounded-full bg-[var(--chip-bg)]" />
        <div className="space-y-3">
          <div className="h-6 w-3/4 rounded-full bg-[var(--panel-border)]" />
          <div className="h-4 w-full rounded-full bg-[var(--panel-border)]/60" />
          <div className="h-4 w-5/6 rounded-full bg-[var(--panel-border)]/60" />
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          <div className="h-20 rounded-2xl bg-[var(--panel-border)]/40" />
          <div className="h-20 rounded-2xl bg-[var(--panel-border)]/40" />
        </div>
      </div>
    </div>
  );
};
