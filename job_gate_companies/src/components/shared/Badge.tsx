import React from "react";

interface BadgeProps {
  label: string;
  className?: string;
}

const Badge: React.FC<BadgeProps> = ({ label, className = "" }) => {
  return (
    <span
      className={`inline-flex items-center rounded-full bg-[var(--chip-bg)] px-3 py-1 text-xs font-semibold text-[var(--text-primary)] ${className}`}
    >
      {label}
    </span>
  );
};

export default Badge;
