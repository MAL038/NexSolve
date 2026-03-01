"use client";
// app/auth/accept-invite/page.tsx
// Landingspagina na het klikken op een uitnodigingslink.
// Supabase zet de sessie automatisch via de URL hash.
// Wij koppelen daarna de gebruiker aan de juiste org.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { CheckCircle, Loader2, XCircle } from "lucide-react";

type Status = "loading" | "success" | "error";

export default function AcceptInvitePage() {
  const router = useRouter();
  const [status,  setStatus]  = useState<Status>("loading");
  const [message, setMessage] = useState("Uitnodiging verwerken...");

  useEffect(() => {
    async function processInvite() {
      const supabase = createClient();

      // Wacht even zodat Supabase de sessie uit de URL hash kan verwerken
      await new Promise(r => setTimeout(r, 800));

      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setStatus("error");
        setMessage("Sessie kon niet worden opgestart. Probeer de link opnieuw.");
        return;
      }

      const user = session.user;
      const meta = user.user_metadata ?? {};

      // Haal org-info op uit de user metadata (meegestuurd bij invite)
      const invitedOrgId   = meta.invited_org_id   as string | undefined;
      const invitedOrgRole = meta.invited_org_role  as string | undefined ?? "member";

      if (!invitedOrgId) {
        // Geen org in metadata — gewone registratie, stuur naar dashboard
        setStatus("success");
        setMessage("Account aangemaakt! Je wordt doorgestuurd...");
        setTimeout(() => router.push("/dashboard"), 1500);
        return;
      }

      // Koppel aan org via API
      const res = await fetch("/api/organisation/accept-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ org_id: invitedOrgId, org_role: invitedOrgRole }),
      });

      if (!res.ok) {
        const data = await res.json();
        setStatus("error");
        setMessage(data.error ?? "Fout bij verwerken uitnodiging");
        return;
      }

      const data = await res.json();
      setStatus("success");
      setMessage(`Welkom bij ${data.org_name ?? "de organisatie"}!`);
      setTimeout(() => router.push("/dashboard"), 2000);
    }

    processInvite();
  }, [router]);

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
            <button
              onClick={() => router.push("/auth/login")}
              className="btn-primary mt-2"
            >
              Naar inlogpagina
            </button>
          </>
        )}

      </div>
    </div>
  );
}
