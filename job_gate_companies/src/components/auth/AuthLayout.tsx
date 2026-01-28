import React from "react";

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ title, subtitle, children }) => {
  return (
    <div className="min-h-screen bg-[#070A0F]">
      <div className="relative min-h-screen overflow-hidden bg-[#070A0F]">
        <div className="absolute inset-0 auth-mesh opacity-70" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#1a1a40,transparent_60%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(0,168,232,0.18),transparent_55%)]" />
        <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-12">
          <div className="glass-card w-full max-w-4xl rounded-3xl border border-white/20 bg-white/5 p-8 shadow-[0_0_35px_rgba(0,168,232,0.18)] backdrop-blur-xl lg:p-12">
            <div className="mb-6 flex flex-col items-center text-center">
              <div
                className="mb-4 flex h-14 w-14 items-center justify-center rounded-3xl border border-white/20 bg-white/10"
                style={{ boxShadow: "0 0 22px rgba(0,168,232,0.35)" }}
              >
                <img src="/favicon.ico" alt="Talents We Trust" className="h-7 w-7" />
              </div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/60">Company Portal</p>
              <h2 className="heading-serif mt-2 text-3xl text-white">{title}</h2>
              <p className="mt-2 text-sm text-white/70">{subtitle}</p>
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
