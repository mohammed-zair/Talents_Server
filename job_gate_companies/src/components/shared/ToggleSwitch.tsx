import React from "react";

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  ariaLabel?: string;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ checked, onChange, ariaLabel }) => {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      aria-label={ariaLabel ?? "Toggle"}
      aria-pressed={checked}
      className={`smooth-hover relative inline-flex h-7 w-12 items-center rounded-full border transition-colors duration-200 ${
        checked
          ? "border-[var(--accent)] bg-[var(--accent)]"
          : "border-[var(--panel-border)] bg-[var(--chip-bg)]"
      }`}
    >
      <span
        className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform duration-200 ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
};

export default ToggleSwitch;
