import React from "react";

interface RadialGaugeProps {
  value: number;
  max: number;
  size?: number;
}

const RadialGauge: React.FC<RadialGaugeProps> = ({ value, max, size = 64 }) => {
  const radius = (size - 10) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(value / max, 1);
  const offset = circumference - progress * circumference;

  return (
    <div className="relative flex items-center justify-center">
      <svg width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(148, 163, 184, 0.3)"
          strokeWidth="6"
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="var(--accent)"
          strokeWidth="6"
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.4s ease" }}
        />
      </svg>
      <span className="absolute text-xs font-semibold text-[var(--text-primary)]">
        {Math.round(progress * 100)}%
      </span>
    </div>
  );
};

export default RadialGauge;
