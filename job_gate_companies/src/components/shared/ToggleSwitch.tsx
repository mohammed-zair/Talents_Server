import React from "react";

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (next: boolean) => void;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ checked, onChange }) => {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`smooth-hover relative h-7 w-12 rounded-full border border-[var(--panel-border)] ${
        checked ? "bg-[var(--accent)]" : "bg-slate-200"
      }`}
    >
      <span
        className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
        style={{ transition: "transform 0.2s ease" }}
      />
    </button>
  );
};

export default ToggleSwitch;
