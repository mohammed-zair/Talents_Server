import React from "react";

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ title, subtitle, children }) => {
  return (
    <div className="min-h-screen bg-[var(--app-bg)]">
      <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,#1a1a40,transparent_60%)]">
        <div className="absolute inset-0 auth-mesh opacity-70" />
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(0,168,232,0.18),transparent_50%)]" />
        <div className="relative z-10 flex min-h-screen items-center justify-center p-6 lg:p-12">
          <div className="glass-card w-full max-w-4xl rounded-3xl border p-8 shadow-soft-ambient lg:p-12">
            <div className="mb-6">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
                Company Portal
              </p>
              <h2 className="heading-serif mt-2 text-3xl text-[var(--text-primary)]">{title}</h2>
              <p className="mt-2 text-sm text-[var(--text-muted)]">{subtitle}</p>
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
