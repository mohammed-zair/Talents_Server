import React, { Suspense, lazy, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LanguageProvider } from "./contexts/LanguageContext";

const ProtectedRoute = lazy(() => import("./components/layout/ProtectedRoute"));
const PageShell = lazy(() => import("./components/layout/PageShell"));
const AuthLoginPage = lazy(() => import("./pages/AuthLoginPage"));
const AuthRegisterPage = lazy(() => import("./pages/AuthRegisterPage"));
const AuthForgotPage = lazy(() => import("./pages/AuthForgotPage"));
const AuthResetPage = lazy(() => import("./pages/AuthResetPage"));
const PulsePage = lazy(() => import("./pages/PulsePage"));
const OpportunitiesPage = lazy(() => import("./pages/OpportunitiesPage"));
const CVLabPage = lazy(() => import("./pages/CVLabPage"));
const AIConsultantPage = lazy(() => import("./pages/AIConsultantPage"));
const MarketPage = lazy(() => import("./pages/MarketPage"));
const CompanyDetailsPage = lazy(() => import("./pages/CompanyDetailsPage"));
const ConsultantMarketplacePage = lazy(
  () => import("./pages/ConsultantMarketplacePage")
);
const ApplicationsPage = lazy(() => import("./pages/ApplicationsPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const ContactPage = lazy(() => import("./pages/ContactPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30000, refetchOnWindowFocus: false },
  },
});

const routerBasename = import.meta.env.VITE_ROUTER_BASENAME || "/";

const App: React.FC = () => {
  useEffect(() => {
    document.body.classList.add("no-motion");
    return () => {
      document.body.classList.remove("no-motion");
    };
  }, []);

  return (
    <HelmetProvider>
      <ThemeProvider>
        <LanguageProvider>
          <QueryClientProvider client={queryClient}>
            <BrowserRouter basename={routerBasename}>
              <Suspense fallback={<RouteLoader />}>
                <Routes>
                  <Route path="/" element={<Navigate to="/pulse" replace />} />
                  <Route path="/auth/login" element={<AuthLoginPage />} />
                  <Route path="/auth/register" element={<AuthRegisterPage />} />
                  <Route path="/auth/forgot" element={<AuthForgotPage />} />
                  <Route path="/auth/reset" element={<AuthResetPage />} />

                  <Route
                    element={
                      <ProtectedRoute>
                        <PageShell />
                      </ProtectedRoute>
                    }
                  >
                    <Route path="/pulse" element={<PulsePage />} />
                    <Route path="/opportunities" element={<OpportunitiesPage />} />
                    <Route path="/cv-lab" element={<CVLabPage />} />
                    <Route path="/ai-consultant" element={<AIConsultantPage />} />
                    <Route path="/market" element={<MarketPage />} />
                    <Route path="/market/:companyId" element={<CompanyDetailsPage />} />
                    <Route
                      path="/consultants"
                      element={<ConsultantMarketplacePage />}
                    />
                    <Route path="/applications" element={<ApplicationsPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="/notifications" element={<NotificationsPage />} />
                    <Route path="/contact" element={<ContactPage />} />
                  </Route>
                  <Route path="*" element={<Navigate to="/pulse" replace />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </QueryClientProvider>
        </LanguageProvider>
      </ThemeProvider>
    </HelmetProvider>
  );
};

export default App;

const RouteLoader: React.FC = () => (
  <div className="mesh-bg flex min-h-screen items-center justify-center p-6">
    <div className="glass-card w-full max-w-md p-6">
      <div className="h-5 w-32 animate-pulse rounded-full bg-[var(--border)]" />
      <div className="mt-4 h-4 w-full animate-pulse rounded-full bg-[var(--border)]" />
      <div className="mt-2 h-4 w-5/6 animate-pulse rounded-full bg-[var(--border)]" />
    </div>
  </div>
);

