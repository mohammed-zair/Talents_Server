import React from "react";

type GlassButtonProps = {
  href: string;
  label: string;
  primary?: boolean;
};

const GlassButton: React.FC<GlassButtonProps> = ({ href, label, primary = false }) => {
  return (
    <a
      href={href}
      target="_self"
      rel="noreferrer"
      className={`inline-flex items-center rounded-full px-5 py-3 text-sm font-semibold transition-all duration-200 ${
        primary
          ? "btn-glow bg-brand-cyan text-black hover:brightness-110"
          : "glass border border-white/10 hover:border-white/30"
      }`}
    >
      {label}
    </a>
  );
};

export default GlassButton;
