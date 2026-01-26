import React from "react";
import { Toaster } from "react-hot-toast";

const AuthStatusOverlay: React.FC = () => {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        style: {
          background: "var(--panel-bg)",
          color: "var(--text-primary)",
          border: "1px solid var(--panel-border)",
          borderRadius: "16px",
          padding: "12px 16px",
        },
      }}
    />
  );
};

export default AuthStatusOverlay;
