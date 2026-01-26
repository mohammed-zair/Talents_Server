import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "outline";
}

const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  className = "",
  children,
  ...props
}) => {
  const base =
    "smooth-hover inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold";
  const styles = {
    primary: "bg-[var(--accent)] text-slate-900 hover:brightness-110",
    ghost: "bg-transparent text-[var(--text-primary)] hover:bg-[var(--chip-bg)]",
    outline: "border border-[var(--panel-border)] text-[var(--text-primary)] hover:bg-[var(--chip-bg)]",
  };

  return (
    <button className={`${base} ${styles[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

export default Button;
