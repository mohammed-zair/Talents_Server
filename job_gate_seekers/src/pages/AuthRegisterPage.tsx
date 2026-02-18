import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../components/layout/AuthLayout";
import { seekerApi } from "../services/api";
import { setSession } from "../utils/auth";

const AuthRegisterPage: React.FC = () => {
  const [full_name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await seekerApi.register({ full_name, email, password, phone });
      setSession(res.token, res.user);
      navigate("/pulse", { replace: true });
    } catch (err: any) {
      setError(err?.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Create Job Seeker Account" subtitle="From registration to applications in one workflow.">
      <form onSubmit={submit} className="space-y-3">
        <input className="field" placeholder="Full name" value={full_name} onChange={(e) => setName(e.target.value)} />
        <input className="field" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="field" placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <input className="field" placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button className="btn-primary w-full" disabled={loading}>{loading ? "..." : "Create account"}</button>
      </form>
      <div className="mt-4 text-sm text-[var(--text-muted)]">
        <Link to="/auth/login">Already have an account?</Link>
      </div>
    </AuthLayout>
  );
};

export default AuthRegisterPage;