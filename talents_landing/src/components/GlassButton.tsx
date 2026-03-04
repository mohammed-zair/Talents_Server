import React from "react";

type GlassButtonProps = {
  href?: string;
  label: string;
  primary?: boolean;
  onClick?: () => void;
};

const GlassButton: React.FC<GlassButtonProps> = ({ href, label, primary = false, onClick }) => {
  const className = `inline-flex items-center rounded-full px-5 py-3 text-sm font-semibold transition-all duration-200 ${
    primary
      ? "btn-glow bg-brand-cyan text-black hover:brightness-110"
      : "secondary-btn glass border border-white/10 hover:border-white/30"
  }`;

  if (!href) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {label}
      </button>
    );
  }

  return (
    <a
      href={href}
      target="_self"
      rel="noreferrer"
      className={className}
    >
      {label}
    </a>
  );
};

export default GlassButton;
