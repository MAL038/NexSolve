"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabaseClient";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm]       = useState({ full_name: "", email: "", password: "", confirm: "" });
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw]   = useState(false);
  const [serverErr, setServerErr] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerErr("");
    if (form.password !== form.confirm) { setServerErr("Wachtwoorden komen niet overeen."); return; }
    if (form.password.length < 6) { setServerErr("Wachtwoord moet minimaal 6 tekens bevatten."); return; }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email: form.email, password: form.password,
      options: { data: { full_name: form.full_name } },
    });
    setLoading(false);
    if (error) { setServerErr(error.message); return; }
    setSuccess(true);
  }

  if (success) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-brand-50 flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl text-brand-500">✓</span>
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Controleer je e-mail</h2>
        <p className="text-slate-500 text-sm mb-6">
          We hebben een bevestigingslink gestuurd naar <strong>{form.email}</strong>.
        </p>
        <Link href="/auth/login" className="btn-primary inline-flex">Terug naar inloggen</Link>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-2xl font-bold text-slate-800 mb-1">Account aanmaken</h1>
      <p className="text-slate-500 text-sm mb-8">Begin met projecten beheren via NEXSOLVE</p>

      {serverErr && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">{serverErr}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Volledige naam</label>
          <input className="input" placeholder="Jan de Vries"
            value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
        </div>
        <div>
          <label className="label">E-mailadres</label>
          <input className="input" type="email" placeholder="jij@bedrijf.nl"
            value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
        </div>
        <div>
          <label className="label">Wachtwoord</label>
          <div className="relative">
            <input className="input pr-10" type={showPw ? "text" : "password"} placeholder="Min. 6 tekens"
              value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
            <button type="button" onClick={() => setShowPw(p => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        <div>
          <label className="label">Wachtwoord bevestigen</label>
          <input className="input" type={showPw ? "text" : "password"} placeholder="Herhaal wachtwoord"
            value={form.confirm} onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))} />
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
          <UserPlus size={16} />
          {loading ? "Account aanmaken..." : "Account aanmaken"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Heb je al een account?{" "}
        <Link href="/auth/login" className="text-brand-500 font-semibold hover:text-brand-600">Inloggen</Link>
      </p>
    </>
  );
}
