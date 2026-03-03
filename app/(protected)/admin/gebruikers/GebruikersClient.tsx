"use client";
// app/(protected)/admin/gebruikers/GebruikersClient.tsx
//
// Superuser-only paneel:
//   - Ziet ALLE gebruikers platform-breed
//   - Kan gebruikers uitnodigen voor een specifieke org
//   - Kan platform-rol wijzigen (superuser ↔ member)
//   - Kan gebruikers blokkeren / verwijderen

import { useState } from "react";
import {
  Users, Search, Ban, Trash2, RefreshCw,
  X, ChevronDown, Send, UserPlus, Building2, Loader2, Check,
} from "lucide-react";
import clsx from "clsx";
import { formatDate } from "@/lib/time";
import type { Profile, Organisation, UserRole } from "@/types";

// ── Config ────────────────────────────────────────────────────

const ROLE_CONFIG: Record<UserRole, { label: string; color: string; bg: string; border: string }> = {
  superuser: { label: "Superuser", color: "text-brand-700", bg: "bg-brand-50",  border: "border-brand-200" },
  member:    { label: "Gebruiker", color: "text-slate-600", bg: "bg-slate-100", border: "border-slate-200" },
};

const ORG_ROLE_LABELS = { admin: "Org Admin", member: "Lid", viewer: "Viewer" };

// ── Props ─────────────────────────────────────────────────────

interface Props {
  initialUsers: Profile[];
  organisations: Organisation[];
}

// ── Component ─────────────────────────────────────────────────

export default function GebruikersClient({ initialUsers, organisations }: Props) {
  const [users,        setUsers]        = useState<Profile[]>(initialUsers);
  const [search,       setSearch]       = useState("");
  const [loading,      setLoading]      = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ type: "delete" | "block"; user: Profile } | null>(null);
  const [toast,        setToast]        = useState<{ msg: string; ok: boolean } | null>(null);

  // Invite form state
  const [showInvite,   setShowInvite]   = useState(false);
  const [invEmail,     setInvEmail]     = useState("");
  const [invOrgId,     setInvOrgId]     = useState(organisations[0]?.id ?? "");
  const [invOrgRole,   setInvOrgRole]   = useState<"admin" | "member" | "viewer">("member");
  const [invSending,   setInvSending]   = useState(false);
  const [invError,     setInvError]     = useState("");

  // ── Helpers ───────────────────────────────────────────────

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  const filtered = users.filter(u =>
    u.full_name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  // ── API calls ─────────────────────────────────────────────

  async function patchUser(id: string, body: object) {
    setLoading(id);
    const res  = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setLoading(null);
    if (!res.ok) { showToast(data.error ?? "Fout opgetreden", false); return false; }
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...data } : u));
    return true;
  }

  async function changeRole(user: Profile, role: UserRole) {
    const ok = await patchUser(user.id, { role });
    if (ok) showToast(`Rol van ${user.full_name} gewijzigd naar ${ROLE_CONFIG[role].label}`);
  }

  async function toggleActive(user: Profile) {
    setConfirmModal(null);
    const ok = await patchUser(user.id, { is_active: !user.is_active });
    if (ok) showToast(user.is_active ? `${user.full_name} geblokkeerd` : `${user.full_name} geactiveerd`);
  }

  async function resetPassword(user: Profile) {
    setLoading(user.id);
    const res  = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reset_password" }),
    });
    const data = await res.json();
    setLoading(null);
    if (!res.ok) { showToast(data.error ?? "Fout opgetreden", false); return; }
    showToast(`Wachtwoord-reset verstuurd naar ${user.email}`);
  }

  async function deleteUser(user: Profile) {
    setConfirmModal(null);
    setLoading(user.id);
    const res  = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
    const data = await res.json();
    setLoading(null);
    if (!res.ok) { showToast(data.error ?? "Fout opgetreden", false); return; }
    setUsers(prev => prev.filter(u => u.id !== user.id));
    showToast(`${user.full_name} verwijderd`);
  }

  async function sendInvite() {
    setInvError("");
    if (!invEmail.trim()) { setInvError("E-mailadres is verplicht"); return; }
    if (!invOrgId)         { setInvError("Selecteer een organisatie"); return; }
    setInvSending(true);

    const res  = await fetch("/api/admin/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: invEmail.trim(), org_id: invOrgId, org_role: invOrgRole }),
    });
    const data = await res.json();
    setInvSending(false);

    if (!res.ok) { setInvError(data.error ?? "Fout opgetreden"); return; }

    showToast(`Uitnodiging verstuurd naar ${invEmail}`);
    setShowInvite(false);
    setInvEmail(""); setInvOrgRole("member");
  }

  // ── Render ────────────────────────────────────────────────

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">

      {/* Toast */}
      {toast && (
        <div className={clsx(
          "fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium shadow-lg",
          toast.ok ? "bg-white border-brand-200 text-brand-700" : "bg-white border-red-200 text-red-700"
        )}>
          <span className={clsx("w-2 h-2 rounded-full flex-shrink-0", toast.ok ? "bg-brand-500" : "bg-red-500")} />
          {toast.msg}
          <button onClick={() => setToast(null)} className="text-slate-400 hover:text-slate-600"><X size={14} /></button>
        </div>
      )}

      {/* Confirm modal */}
      {confirmModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 flex items-center justify-center p-4"
          onClick={() => setConfirmModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-slate-800 text-lg">
              {confirmModal.type === "delete" ? "Account verwijderen?" : confirmModal.user.is_active ? "Account blokkeren?" : "Account activeren?"}
            </h3>
            <p className="text-slate-500 text-sm">
              {confirmModal.type === "delete"
                ? `Permanent verwijderen van ${confirmModal.user.full_name}. Kan niet ongedaan worden gemaakt.`
                : confirmModal.user.is_active
                  ? `${confirmModal.user.full_name} kan niet meer inloggen.`
                  : `${confirmModal.user.full_name} krijgt weer toegang.`}
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmModal(null)} className="btn-outline">Annuleren</button>
              <button
                onClick={() => confirmModal.type === "delete" ? deleteUser(confirmModal.user) : toggleActive(confirmModal.user)}
                className={clsx("btn-primary", (confirmModal.type === "delete" || confirmModal.user.is_active) && "!bg-red-500 !shadow-red-200 hover:!bg-red-600")}
              >
                {confirmModal.type === "delete" ? "Verwijderen" : confirmModal.user.is_active ? "Blokkeren" : "Activeren"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Gebruikers</h1>
          <p className="text-sm text-slate-500 mt-0.5">{users.length} account{users.length !== 1 ? "s" : ""} platform-breed</p>
        </div>
        <button
          onClick={() => { setShowInvite(v => !v); setInvError(""); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors shadow-sm"
        >
          <UserPlus size={15} /> Gebruiker uitnodigen
        </button>
      </div>

      {/* Invite form */}
      {showInvite && (
        <div className="card p-6 border-2 border-brand-100 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Send size={16} className="text-brand-500" />
              <h3 className="font-semibold text-slate-800">Nieuwe gebruiker uitnodigen</h3>
            </div>
            <button onClick={() => setShowInvite(false)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
          </div>

          {invError && (
            <div className="px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{invError}</div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Email */}
            <div className="sm:col-span-1">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">E-mailadres *</label>
              <input
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                type="email" placeholder="naam@bedrijf.nl"
                value={invEmail} onChange={e => setInvEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendInvite()}
                autoFocus
              />
            </div>

            {/* Organisatie */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                <Building2 size={11} className="inline mr-1" />Organisatie *
              </label>
              <select
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 bg-white"
                value={invOrgId} onChange={e => setInvOrgId(e.target.value)}
              >
                {organisations.length === 0 && (
                  <option value="">Geen organisaties beschikbaar</option>
                )}
                {organisations.map(org => (
                  <option key={org.id} value={org.id}>{org.name}</option>
                ))}
              </select>
            </div>

            {/* Rol binnen org */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Rol in organisatie</label>
              <select
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 bg-white"
                value={invOrgRole} onChange={e => setInvOrgRole(e.target.value as any)}
              >
                <option value="member">Lid</option>
                <option value="admin">Org Admin</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <button onClick={() => setShowInvite(false)} className="px-4 py-2 rounded-xl text-sm text-slate-500 hover:bg-slate-100">Annuleren</button>
            <button onClick={sendInvite} disabled={invSending}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-60">
              {invSending ? <><Loader2 size={14} className="animate-spin" /> Versturen…</> : <><Send size={14} /> Versturen</>}
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-xs">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          className="input pl-9"
          placeholder="Zoeken op naam of e-mail..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Tabel */}
      <div className="card overflow-hidden">
        <div className="grid grid-cols-[1fr_130px_130px_110px_160px] text-xs font-semibold uppercase tracking-wider text-slate-400 px-5 py-3 border-b border-slate-100 bg-slate-50/60">
          <span>Gebruiker</span>
          <span>Platform-rol</span>
          <span>Organisatie</span>
          <span>Status</span>
          <span className="text-right">Acties</span>
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <Users size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Geen gebruikers gevonden</p>
          </div>
        ) : filtered.map((user, i) => {
          const rc        = ROLE_CONFIG[user.role] ?? ROLE_CONFIG.member;
          const isLoading = loading === user.id;
          const org       = organisations.find(o => o.id === user.org_id);

          return (
            <div key={user.id} className={clsx(
              "grid grid-cols-[1fr_130px_130px_110px_160px] items-center px-5 py-4 transition-colors hover:bg-slate-50/50",
              i !== 0 && "border-t border-slate-100",
              isLoading && "opacity-50 pointer-events-none",
              !user.is_active && "bg-red-50/40"
            )}>
              {/* Gebruiker */}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{user.full_name}</p>
                <p className="text-xs text-slate-400 truncate">{user.email}</p>
                <p className="text-xs text-slate-300 mt-0.5">Lid sinds {formatDate(user.created_at)}</p>
              </div>

              {/* Platform-rol selector */}
              <div className="relative">
                <div className={clsx(
                  "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer",
                  rc.bg, rc.color, rc.border
                )}>
                  <span>{rc.label}</span>
                  <ChevronDown size={11} className="opacity-50" />
                  <select
                    value={user.role}
                    onChange={e => changeRole(user, e.target.value as UserRole)}
                    disabled={isLoading}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full"
                  >
                    <option value="member">Gebruiker</option>
                    <option value="superuser">Superuser</option>
                  </select>
                </div>
              </div>

              {/* Organisatie */}
              <div>
                {org ? (
                  <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 truncate max-w-[110px]">
                    <Building2 size={10} className="flex-shrink-0" />
                    <span className="truncate">{org.name}</span>
                  </span>
                ) : (
                  <span className="text-xs text-slate-300 italic">Geen org</span>
                )}
              </div>

              {/* Status */}
              <div>
                <span className={clsx(
                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border",
                  user.is_active
                    ? "text-brand-700 bg-brand-50 border-brand-200"
                    : "text-red-600 bg-red-50 border-red-200"
                )}>
                  <span className={clsx("w-1.5 h-1.5 rounded-full", user.is_active ? "bg-brand-500" : "bg-red-400")} />
                  {user.is_active ? "Actief" : "Geblokkeerd"}
                </span>
              </div>

              {/* Acties */}
              <div className="flex items-center gap-1 justify-end">
                <button onClick={() => resetPassword(user)} disabled={isLoading} title="Wachtwoord-reset"
                  className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                  <RefreshCw size={14} />
                </button>
                <button onClick={() => setConfirmModal({ type: "block", user })} disabled={isLoading}
                  title={user.is_active ? "Blokkeren" : "Activeren"}
                  className="p-2 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors">
                  <Ban size={14} />
                </button>
                <button onClick={() => setConfirmModal({ type: "delete", user })} disabled={isLoading}
                  title="Verwijderen"
                  className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
