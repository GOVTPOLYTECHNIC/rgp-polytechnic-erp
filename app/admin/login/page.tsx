"use client";

import { FormEvent, useState } from "react";

const API = "http://127.0.0.1:8000";

export default function AdminLoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage(""); setLoading(true);
    try {
      const response = await fetch(`${API}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: username.trim(), password }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Login नहीं हो पाया।");
      localStorage.setItem("rgp_admin_token", data.access_token); localStorage.setItem("rgp_admin_username", data.username); window.location.replace("/admin");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Login में समस्या हुई।"); }
    finally { setLoading(false); }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-10">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-blue-800/50 via-slate-950 to-slate-950" />
      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-white shadow-2xl md:grid-cols-2">
        <section className="flex flex-col justify-between bg-gradient-to-br from-[#071a3d] via-[#0b2450] to-[#1761a8] p-8 text-white sm:p-12">
          <div><div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/30 bg-white/10 text-2xl font-black shadow-lg">RG</div><p className="mt-8 text-xs font-bold uppercase tracking-[0.25em] text-blue-200">College Management System</p><h1 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">Rajiv Gandhi<br/>Polytechnic</h1><p className="mt-4 max-w-sm text-sm leading-6 text-blue-100">Student records, fee collection, reports and institute management — all in one place.</p></div>
          <p className="mt-12 text-xs text-blue-200">Secure administration · Authorized access only</p>
        </section>
        <section className="p-7 sm:p-12">
          <p className="text-sm font-bold text-blue-800">Welcome back</p><h2 className="mt-2 text-3xl font-black text-slate-900">Admin Login</h2><p className="mt-2 text-sm text-slate-500">अपने Admin account से लॉगिन करें।</p>
          <form onSubmit={handleLogin} className="mt-8 space-y-5">
            <label className="block text-sm font-bold text-slate-700">Username<input required autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 font-normal outline-none transition focus:border-blue-700 focus:bg-white focus:ring-4 focus:ring-blue-100" placeholder="Admin username" /></label>
            <label className="block text-sm font-bold text-slate-700">Password<div className="mt-2 flex rounded-xl border border-slate-200 bg-slate-50 focus-within:border-blue-700 focus-within:ring-4 focus-within:ring-blue-100"><input required autoComplete="current-password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className="min-w-0 flex-1 rounded-xl bg-transparent px-4 py-3.5 font-normal outline-none" placeholder="Admin password" /><button type="button" onClick={() => setShowPassword(v => !v)} className="px-4 text-xs font-bold text-blue-800">{showPassword ? "Hide" : "Show"}</button></div></label>
            {message && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{message}</p>}
            <button disabled={loading} type="submit" className="w-full rounded-xl bg-gradient-to-r from-blue-900 to-blue-700 px-5 py-4 font-bold text-white shadow-lg shadow-blue-900/20 transition hover:from-blue-950 hover:to-blue-800 disabled:opacity-60">{loading ? "Signing in..." : "Login Securely  →"}</button>
          </form><p className="mt-6 text-center text-xs text-slate-400">🔒 आपका Admin Login सुरक्षित है।</p>
        </section>
      </div>
    </main>
  );
}
