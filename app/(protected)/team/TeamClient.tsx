"use client";

import { useState, useEffect } from "react";
import {
  Users, Mail, Plus, Trash2, Loader2, Clock,
  Check, Shield, User, X, Send,
} from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import clsx from "clsx";

interface TeamMember {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  role: string;
  created_at: string;
}

interface Invite {
  id: string;
  email: string;
  role: string;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
}

export default function TeamClient({ initialMembers }: { initialMembers: TeamMember[] }) {
  const [members,  setMembers]  = useState<TeamMember[]>(initialMembers);
  const [invites,  setInvites]  = useState<Invite[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [email,    setEmail]    = useState("");
  const [role,     setRole]     = useState<"member" | "admin">("member");
  const [sending,  setSending]  = useState(false);
  const [error,    setError]    = useState("");
  const [success,  setSuccess]  = useState("");

  useEffect(() => {
    fetch("/api/team/invite")
      .then(r => { if (!r.ok) return []; return r.json(); })
      .then(data => setInvites(Array.isArray(data) ? data : []))
      .catch(() => setInvites([]));
  }, []);

  async function sendInvite() {
    if (!email.trim()) { setError("Vul een e-mailadres in."); return; }
    setSending(true); setError(""); setSuccess("");

    const res = await fetch("/api/team/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), role }),
    });
    const data = await res.json();
    setSending(false);

    if (!res.ok) {
      setError(data.error ?? "Uitnodiging mislukt.");
      return;
    }
    setInvites(prev => [data.invite, ...prev]);
    setEmail(""); setRole("member");
    setSuccess(`Uitnodiging verstuurd naar ${email.trim()} 🎉`);
    setShowForm(false);
    setTimeout(() => setSuccess(""), 5000);
  }

  async function revokeInvite(id: string) {
    if (!confirm("Uitnodiging intrekken?")) return;
    await fetch(`/api/team/invite/${id}`, { method: "DELETE" });
    setInvites(prev => prev.filter(i => i.id !== id));
  }

  const pendingInvites = invites.filter(i => !i.accepted_at && new Date(i.expires_at) > new Date());
  const expiredInvites = invites.filter(i => !i.accepted_at && new Date(i.expires_at) <= new Date());

  return (
    <div className="max-w-3xl mx-auto space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Jouw team</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {members.length} lid{members.length !== 1 ? "en" : ""} · {pendingInvites.length} openstaande uitnodiging{pendingInvites.length !== 1 ? "en" : ""}
          </p>
        </div>
        <button
          onClick={() => { setShowForm(v => !v); setError(""); setSuccess(""); }}
          className="btn-primary"
        >
          <Plus size={16} /> Teamlid uitnodigen
        </button>
      </div>

      {/* Success banner */}
      {success && (
        <div className="flex items-center gap-2 px-4 py-3 bg-brand-50 border border-brand-200 rounded-xl text-brand-700 text-sm font-medium">
          <Check size={15} /> {success}
        </div>
      )}

      {/* Invite form */}
      {showForm && (
        <div className="card p-6 border-2 border-brand-200 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Send size={16} className="text-brand-500" />
              <h3 className="font-semibold text-slate-800">Nieuw teamlid uitnodigen</h3>
            </div>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
              <X size={16} />
            </button>
          </div>

          <p className="text-sm text-slate-500">
            Vul het e-mailadres in. De persoon ontvangt een activatielink en kan daarna meteen aan projecten worden gekoppeld.
          </p>

          {error && (
            <div className="px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">E-mailadres *</label>
              <input
                className="input"
                type="email"
                placeholder="naam@bedrijf.nl"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendInvite()}
                autoFocus
              />
            </div>
            <div>
              <label className="label">Rol</label>
              <select
                className="select"
                value={role}
                onChange={e => setRole(e.target.value as "member" | "admin")}
              >
                <option value="member">Teamlid</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <button onClick={() => setShowForm(false)} className="btn-outline">Annuleren</button>
            <button onClick={sendInvite} disabled={sending} className="btn-primary">
              {sending
                ? <><Loader2 size={15} className="animate-spin" /> Versturen…</>
                : <><Send size={15} /> Uitnodiging versturen</>
              }
            </button>
          </div>
        </div>
      )}

      {/* Active members */}
      <div>
        <h3 className="font-semibold text-slate-700 flex items-center gap-2 mb-3">
          <Users size={15} className="text-brand-500" />
          Actieve teamleden
        </h3>
        <div className="card divide-y divide-slate-50 overflow-hidden">
          {members.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">Nog geen teamleden.</div>
          ) : members.map(m => (
            <div key={m.id} className="flex items-center gap-3 px-5 py-3.5">
              <Avatar name={m.full_name} url={m.avatar_url} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{m.full_name}</p>
                <p className="text-xs text-slate-400 truncate">{m.email}</p>
              </div>
              <span className={clsx(
                "badge gap-1",
                m.role === "admin" ? "bg-brand-50 text-brand-700" : "bg-slate-100 text-slate-500"
              )}>
                {m.role === "admin" ? <><Shield size={10} /> Admin</> : <><User size={10} /> Teamlid</>}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Pending invites */}
      {pendingInvites.length > 0 && (
        <div>
          <h3 className="font-semibold text-slate-700 flex items-center gap-2 mb-3">
            <Clock size={15} className="text-amber-500" />
            Openstaande uitnodigingen
          </h3>
          <div className="card divide-y divide-slate-50 overflow-hidden">
            {pendingInvites.map(inv => {
              const expiresIn = Math.ceil(
                (new Date(inv.expires_at).getTime() - Date.now()) / 86400000
              );
              return (
                <div key={inv.id} className="flex items-center gap-3 px-5 py-3.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                    <Mail size={16} className="text-amber-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{inv.email}</p>
                    <p className="text-xs text-slate-400">
                      Verloopt over {expiresIn} dag{expiresIn !== 1 ? "en" : ""}
                    </p>
                  </div>
                  <span className={clsx(
                    "badge gap-1",
                    inv.role === "admin" ? "bg-brand-50 text-brand-700" : "bg-slate-100 text-slate-500"
                  )}>
                    {inv.role === "admin" ? "Admin" : "Teamlid"}
                  </span>
                  <button
                    onClick={() => revokeInvite(inv.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    title="Uitnodiging intrekken"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Expired invites */}
      {expiredInvites.length > 0 && (
        <div>
          <h3 className="font-semibold text-slate-400 flex items-center gap-2 mb-3 text-sm">
            Verlopen uitnodigingen
          </h3>
          <div className="card divide-y divide-slate-50 overflow-hidden opacity-60">
            {expiredInvites.map(inv => (
              <div key={inv.id} className="flex items-center gap-3 px-5 py-3">
                <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <Mail size={14} className="text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-500 truncate">{inv.email}</p>
                  <p className="text-xs text-slate-400">Verlopen</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
