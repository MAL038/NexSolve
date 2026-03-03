"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { CheckCircle, Loader2, XCircle } from "lucide-react";

type Status = "loading" | "need_password" | "success" | "error";

export default function AcceptInvitePage() {
  const router = useRouter();
  const sp = useSearchParams();
  const token = sp.get("token"); // jouw eigen invite token (team_invites)

  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("Uitnodiging verwerken...");

  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    async function boot() {
      // Sessie moet al gezet zijn via /auth/callback (exchangeCodeForSession)
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setStatus("error");
        setMessage("Geen sessie gevonden. Open de uitnodigingslink opnieuw.");
        return;
      }

      // We laten altijd wachtwoord instellen bij invite-accept
      setStatus("need_password");
      setMessage("Stel een wachtwoord in om je account te activeren.");
    }

    boot();
  }, [supabase]);

  async function onActivate(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null as any);

    if (!token) {
      setStatus("error");
      setMessage("Ontbrekende token.");
      return;
    }
    if (pw1.length < 8) {
      setMessage("Wachtwoord moet minimaal 8 tekens zijn.");
      return;
    }
    if (pw1 !== pw2) {
      setMessage("Wachtwoorden komen niet overeen.");
      return;
    }

    setBusy(true);

    // 1) Zet wachtwoord
    const { error: pwErr } = await supabase.auth.updateUser({ password: pw1 });
    if (pwErr) {
      setBusy(false);
      setStatus("error");
      setMessage(pwErr.message);
      return;
    }

    // 2) Lees metadata (keys moeten matchen met invite route)
    const { data: { user } } = await supabase.auth.getUser();
    const meta = user?.user_metadata ?? {};

    const invitedOrgId = (meta.org_id as string | undefined);
    const invitedOrgRole = (meta.org_role as string | undefined) ?? "member";

    if (!invitedOrgId) {
      // Geen org in metadata: dan is het geen org-invite flow
      setBusy(false);
      setStatus("success");
      setMessage("Account geactiveerd! Je wordt doorgestuurd...");
      setTimeout(() => router.push("/dashboard"), 1200);
      return;
    }

    // 3) Koppel membership + markeer invite accepted (server-side)
    const res = await fetch("/api/organisation/accept-invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,            // jouw team_invites token (belangrijk!)
        org_id: invitedOrgId,
        org_role: invitedOrgRole,
      }),
    });

    const json = await res.json().catch(() => ({}));

    setBusy(false);

    if (!res.ok) {
      setStatus("error");
      setMessage(json.error ?? "Fout bij verwerken uitnodiging");
      return;
    }

    setStatus("success");
    setMessage(`Welkom bij ${json.org_name ?? "de organisatie"}!`);
    setTimeout(() => router.push("/dashboard"), 1500);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 max-w-md w-full text-center space-y-4">

        {status === "loading" && (
          <>
            <div className="w-14 h-14 rounded-full bg-brand-50 border border-brand-100 flex items-center justify-center mx-auto">
              <Loader2 size={24} className="text-brand-500 animate-spin" />
            </div>
            <h1 className="text-lg font-semibold text-slate-800">Uitnodiging verwerken</h1>
            <p className="text-sm text-slate-500">{message}</p>
          </>
        )}

        {status === "need_password" && (
          <>
            <h1 className="text-lg font-semibold text-slate-800">Account activeren</h1>
            <p className="text-sm text-slate-500">{message}</p>

            <form onSubmit={onActivate} className="space-y-3 text-left pt-2">
              <input
                type="password"
                placeholder="Nieuw wachtwoord (min. 8 tekens)"
                className="w-full rounded border p-3"
                value={pw1}
                onChange={(e) => setPw1(e.target.value)}
              />
              <input
                type="password"
                placeholder="Herhaal wachtwoord"
                className="w-full rounded border p-3"
                value={pw2}
                onChange={(e) => setPw2(e.target.value)}
              />

              <button
                type="submit"
                disabled={busy}
                className="w-full rounded bg-black p-3 text-white disabled:opacity-60"
              >
                {busy ? "Bezig..." : "Activeren"}
              </button>
            </form>

            {message && <p className="text-sm text-red-600">{message}</p>}
          </>
        )}

        {status === "success" && (
          <>
            <div className="w-14 h-14 rounded-full bg-brand-50 border border-brand-100 flex items-center justify-center mx-auto">
              <CheckCircle size={24} className="text-brand-500" />
            </div>
            <h1 className="text-lg font-semibold text-slate-800">{message}</h1>
            <p className="text-sm text-slate-500">Je wordt doorgestuurd naar het dashboard...</p>
          </>
        )}

        {status === "error" && (
          <>
            <div className="w-14 h-14 rounded-full bg-red-50 border border-red-100 flex items-center justify-center mx-auto">
              <XCircle size={24} className="text-red-500" />
            </div>
            <h1 className="text-lg font-semibold text-slate-800">Uitnodiging mislukt</h1>
            <p className="text-sm text-slate-500">{message}</p>
            <button onClick={() => router.push("/auth/login")} className="btn-primary mt-2">
              Naar inlogpagina
            </button>
          </>
        )}

      </div>
    </div>
  );
}