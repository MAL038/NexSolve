"use client";

import Link from "next/link";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { createClient } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm]     = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw]   = useState(false);
  const [serverErr, setServerErr] = useState("");
  const searchParams = useSearchParams();
  const melding = searchParams.get("melding");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerErr("");
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
    setLoading(false);
    if (error) { setServerErr(error.message); return; }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <>
      <h1 className="text-2xl font-bold text-slate-800 mb-1">Welkom terug</h1>
      <p className="text-slate-500 text-sm mb-8">Log in op je NEXSOLVE account</p>

      {melding === "gesloten" && (
        <div className="mb-4 p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-sm">
          Registratie is gesloten. Neem contact op met jouw beheerder voor een uitnodiging.
        </div>
      )}

      {serverErr && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">{serverErr}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="label">E-mailadres</label>
          <input className="input" type="email" placeholder="jij@bedrijf.nl"
            value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
        </div>

        <div>
          <label className="label">Wachtwoord</label>
          <div className="relative">
            <input className="input pr-10" type={showPw ? "text" : "password"} placeholder="••••••••"
              value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
            <button type="button" onClick={() => setShowPw(p => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full">
          <LogIn size={16} />
          {loading ? "Inloggen..." : "Inloggen"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Nog geen account?{" "}
        <Link href="/auth/register" className="text-brand-500 font-semibold hover:text-brand-600">
          Account aanmaken
        </Link>
      </p>
    </>
  );
}
