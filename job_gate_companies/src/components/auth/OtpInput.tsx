import React, { useRef } from "react";

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const OtpInput: React.FC<OtpInputProps> = ({ length = 6, value, onChange, disabled = false }) => {
  const inputs = Array.from({ length });
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  const handleChange = (index: number, char: string) => {
    const digits = char.replace(/\D/g, "");
    if (!digits) {
      const next = value.split("");
      next[index] = "";
      onChange(next.join("").slice(0, length));
      return;
    }

    if (digits.length > 1) {
      const next = value.split("");
      for (let i = 0; i < digits.length && index + i < length; i += 1) {
        next[index + i] = digits[i];
      }
      onChange(next.join("").slice(0, length));
      const nextFocus = Math.min(index + digits.length, length - 1);
      refs.current[nextFocus]?.focus();
      return;
    }

    const next = value.split("");
    next[index] = digits.slice(0, 1);
    const updated = next.join("").slice(0, length);
    onChange(updated);
    if (digits && refs.current[index + 1]) {
      refs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Backspace") return;
    if (value[index]) {
      const next = value.split("");
      next[index] = "";
      onChange(next.join("").slice(0, length));
      return;
    }
    if (refs.current[index - 1]) {
      refs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (index: number, event: React.ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "");
    if (!pasted) return;
    const next = value.split("");
    for (let i = 0; i < pasted.length && index + i < length; i += 1) {
      next[index + i] = pasted[i];
    }
    onChange(next.join("").slice(0, length));
    const nextFocus = Math.min(index + pasted.length, length - 1);
    refs.current[nextFocus]?.focus();
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
          disabled={disabled}
          onChange={(event) => handleChange(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={(event) => handlePaste(index, event)}
          className="h-12 w-11 rounded-xl border border-[var(--panel-border)] bg-transparent text-center text-lg text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
        />
      ))}
    </div>
  );
};

export default OtpInput;
