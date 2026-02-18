import React, { useState } from "react";
import { Link } from "react-router-dom";
import AuthLayout from "../components/layout/AuthLayout";
import { seekerApi } from "../services/api";

const AuthForgotPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    try {
      await seekerApi.forgotPassword({ email });
      setMessage("If the email exists, a reset link has been sent.");
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed");
    }
  };

  return (
    <AuthLayout title="Forgot Password">
      <form onSubmit={submit} className="space-y-3">
        <input className="field" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        {message && <p className="text-sm text-emerald-400">{message}</p>}
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button className="btn-primary w-full">Send reset link</button>
      </form>
      <div className="mt-4 text-sm text-[var(--text-muted)]">
        <Link to="/auth/reset">Have token already? Reset here</Link>
      </div>
    </AuthLayout>
  );
};

export default AuthForgotPage;