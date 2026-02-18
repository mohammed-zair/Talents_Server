import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../components/layout/AuthLayout";
import { seekerApi } from "../services/api";
import { setSession } from "../utils/auth";

const AuthLoginPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await seekerApi.login({ email, password });
      setSession(res.token, res.user);
      navigate("/pulse", { replace: true });
    } catch (err: any) {
      setError(err?.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Welcome Back" subtitle="Access your seeker workspace.">
      <form onSubmit={submit} className="space-y-3">
        <input className="field" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="field" placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button className="btn-primary w-full" disabled={loading}>{loading ? "..." : "Login"}</button>
      </form>
      <div className="mt-4 flex justify-between text-sm text-[var(--text-muted)]">
        <Link to="/auth/register">Create account</Link>
        <Link to="/auth/forgot">Forgot password?</Link>
      </div>
    </AuthLayout>
  );
};

export default AuthLoginPage;