import React, { useState } from "react";
import { Link } from "react-router-dom";
import AuthLayout from "../components/layout/AuthLayout";
import { seekerApi } from "../services/api";

const AuthResetPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    try {
      await seekerApi.resetPassword({ email, token, newPassword });
      setMessage("Password reset completed.");
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed");
    }
  };

  return (
    <AuthLayout title="Reset Password">
      <form onSubmit={submit} className="space-y-3">
        <input className="field" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="field" placeholder="Reset Token" value={token} onChange={(e) => setToken(e.target.value)} />
        <input className="field" placeholder="New Password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
        {message && <p className="text-sm text-emerald-400">{message}</p>}
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button className="btn-primary w-full">Reset password</button>
      </form>
      <div className="mt-4 text-sm text-[var(--text-muted)]">
        <Link to="/auth/login">Back to login</Link>
      </div>
    </AuthLayout>
  );
};

export default AuthResetPage;