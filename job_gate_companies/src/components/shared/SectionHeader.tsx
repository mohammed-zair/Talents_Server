import React from "react";

interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ eyebrow, title, subtitle, action }) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        {eyebrow && (
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
            {eyebrow}
          </p>
        )}
        <h2 className="heading-serif text-2xl font-semibold text-[var(--text-primary)]">
          {title}
        </h2>
        {subtitle && <p className="text-sm text-[var(--text-muted)]">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
};

export default SectionHeader;
