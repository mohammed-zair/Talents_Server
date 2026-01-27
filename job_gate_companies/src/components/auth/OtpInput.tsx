import React, { useRef } from "react";

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
}

const OtpInput: React.FC<OtpInputProps> = ({ length = 6, value, onChange }) => {
  const inputs = Array.from({ length });
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  const handleChange = (index: number, char: string) => {
    const next = value.split("");
    next[index] = char.replace(/\D/g, "").slice(0, 1);
    const updated = next.join("").slice(0, length);
    onChange(updated);
    if (char && refs.current[index + 1]) {
      refs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace" && !value[index] && refs.current[index - 1]) {
      refs.current[index - 1]?.focus();
    }
  };

  return (
    <div className="flex gap-2">
      {inputs.map((_, index) => (
        <input
          key={`otp-${index}`}
          ref={(el) => {
            refs.current[index] = el;
          }}
          id={`otp-${index}`}
          name={`otp-${index}`}
          aria-label={`OTP digit ${index + 1}`}
          inputMode="numeric"
          value={value[index] ?? ""}
          onChange={(event) => handleChange(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          className="h-12 w-11 rounded-xl border border-[var(--panel-border)] bg-transparent text-center text-lg text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
        />
      ))}
    </div>
  );
};

export default OtpInput;
