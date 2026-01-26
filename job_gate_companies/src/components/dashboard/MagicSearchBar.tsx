import React from "react";
import { Search } from "lucide-react";

interface MagicSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const MagicSearchBar: React.FC<MagicSearchBarProps> = ({ value, onChange, placeholder }) => {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] px-4 py-3 shadow-soft-ambient">
      <Search size={18} className="text-[var(--accent)]" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder ?? "Describe your ideal candidate..."}
        className="w-full bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
      />
    </div>
  );
};

export default MagicSearchBar;
