import React from "react";

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ title, subtitle, children }) => {
  return (
    <div className="min-h-screen bg-[var(--app-bg)]">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
        <div className="relative hidden overflow-hidden bg-[#0b1020] lg:flex">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#1a1a40,transparent_60%)]" />
          <div className="absolute inset-0 auth-mesh" />
          <div className="relative z-10 flex h-full flex-col justify-between p-12 text-white">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-slate-300">Talents We Trust</p>
              <h1 className="heading-serif mt-4 text-4xl leading-tight">
                Trust & Innovation
                <br />
                for every hire.
              </h1>
              <p className="mt-4 text-sm text-slate-300">
                Secure, AI-powered recruiting intelligence for enterprise teams.
              </p>
            </div>
            <div className="rounded-2xl border border-white/20 bg-white/10 p-4 text-xs text-slate-200">
              Live signal: 92% of strategic matches improved ATS confidence this week.
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center p-6 lg:p-12">
          <div className="glass-card w-full max-w-md rounded-3xl border p-8 shadow-soft-ambient">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
              Company Portal
            </p>
            <h2 className="heading-serif mt-2 text-2xl text-[var(--text-primary)]">{title}</h2>
            <p className="mt-2 text-sm text-[var(--text-muted)]">{subtitle}</p>
            <div className="mt-6">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
