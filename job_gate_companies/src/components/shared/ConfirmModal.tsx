import React from "react";
import { motion } from "framer-motion";
import Button from "./Button";

interface ConfirmModalProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: "danger" | "default";
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  variant = "default",
}) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`glass-card w-full max-w-md rounded-3xl border p-6 ${
          variant === "danger" ? "shadow-[0_0_40px_rgba(248,113,113,0.4)]" : ""
        }`}
      >
        <h3 className="heading-serif text-xl text-[var(--text-primary)]">{title}</h3>
        <p className="mt-2 text-sm text-[var(--text-muted)]">{description}</p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant === "danger" ? "primary" : "outline"}
            onClick={onConfirm}
            className={variant === "danger" ? "bg-red-500 text-white hover:bg-red-600" : ""}
          >
            {confirmLabel}
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default ConfirmModal;
