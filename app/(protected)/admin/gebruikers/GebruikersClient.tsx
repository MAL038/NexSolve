"use client";

import { useState } from "react";
import {
  Users, Search, Ban, Trash2, RefreshCw, X, ChevronDown,
  UserPlus, Mail, Shield, Loader2, Check,
} from "lucide-react";
import clsx from "clsx";
import { formatDate } from "@/lib/time";
import type { Profile, UserRole } from "@/types";

const ROLE_CONFIG: Record<UserRole, { label: string; color: string; bg: string; border: string }> = {
  superuser:     { label: "Superuser",     color: "text-brand-700", bg: "bg-brand-50",  border: "border-brand-200" },
  admin:         { label: "Admin",         color: "text-blue-700",  bg: "bg-blue-50",   border: "border-blue-200"  },
  member:        { label: "Teamlid",       color: "text-slate-600", bg: "bg-slate-100", border: "border-slate-200" },
  viewer:        { label: "Viewer",        color: "text-slate-500", bg: "bg-slate-50",  border: "border-slate-200" },
};

interface Props { initialUsers: Profile[] }

export default function GebruikersClient({ initialUsers }: Props) {
  const [users,        setUsers]        = useState<Profile[]>(initialUsers);
  const [search,       setSearch]       = useState("");
  const [loading,      setLoading]      = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ type: "delete" | "block"; user: Profile } | null>(null);
  const [toast,        setToast]        = useState<{ msg: string; ok: boolean } | null>(null);

  // Uitnodigingsmodal
  const [inviteOpen,    setInviteOpen]    = useState(false);
  const [inviteEmail,   setInviteEmail]   = useState("");
  const [inviteName,    setInviteName]    = useState("");
  const [inviteRole,    setInviteRole]    = useState<UserRole>("member");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError,   setInviteError]   = useState("");
  const [inviteDone,    setInviteDone]    = useState(false);

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  const filtered = users.filter(u =>
    u.full_name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  async function patchUser(id: string, body: object) {
    setLoading(id);
    const res  = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
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
      method: "PATCH", headers: { "Content-Type": "application/json" },
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

  async function handleInvite() {
    if (!inviteEmail.trim()) return;
    setInviteLoading(true); setInviteError("");
    try {
      const res = await fetch("/api/admin/users/invite", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole, full_name: inviteName.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { setInviteError(data.error ?? "Uitnodiging mislukt"); return; }
      setInviteDone(true);
      showToast(`Uitnodiging verstuurd naar ${inviteEmail}`);
      setTimeout(() => {
        setInviteOpen(false); setInviteEmail(""); setInviteName("");
        setInviteRole("member"); setInviteDone(false);
      }, 1800);
    } catch {
      setInviteError("Er ging iets mis");
    } finally {
      setInviteLoading(false);
    }
  }

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

      {/* Bevestigingsmodal */}
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
                className={clsx("btn-primary", (confirmModal.type === "delete" || confirmModal.user.is_active) ? "!bg-red-500 !shadow-red-200 hover:!bg-red-600" : "")}>
                {confirmModal.type === "delete" ? "Verwijderen" : confirmModal.user.is_active ? "Blokkeren" : "Activeren"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Uitnodigingsmodal */}
      {inviteOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 flex items-center justify-center p-4"
          onClick={() => setInviteOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-brand-50 flex items-center justify-center">
                  <UserPlus size={16} className="text-brand-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Gebruiker uitnodigen</h3>
                  <p className="text-xs text-slate-400">Stuurt een uitnodigingsmail</p>
                </div>
              </div>
              <button onClick={() => setInviteOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"><X size={15} /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {inviteError && (
                <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                  <X size={13} className="flex-shrink-0" /> {inviteError}
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  <span className="flex items-center gap-1"><Mail size={11} /> E-mailadres *</span>
                </label>
                <input
                  type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                  placeholder="naam@bedrijf.nl" autoFocus
                  className="input w-full"
                  onKeyDown={e => e.key === "Enter" && handleInvite()}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Naam (optioneel)</label>
                <input
                  type="text" value={inviteName} onChange={e => setInviteName(e.target.value)}
                  placeholder="Jan de Vries"
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  <span className="flex items-center gap-1"><Shield size={11} /> Rol</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["member", "admin", "viewer"] as UserRole[]).map(r => {
                    const cfg = ROLE_CONFIG[r];
                    return (
                      <button key={r} onClick={() => setInviteRole(r)}
                        className={clsx(
                          "px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all",
                          inviteRole === r
                            ? `${cfg.bg} ${cfg.color} ${cfg.border} ring-2 ring-offset-1 ring-brand-300`
                            : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                        )}>
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  {inviteRole === "admin"  && "Kan projecten en klanten beheren van anderen."}
                  {inviteRole === "member" && "Standaard rol — kan deelnemen aan projecten."}
                  {inviteRole === "viewer" && "Alleen-lezen toegang."}
                </p>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100">
              <button
                onClick={handleInvite} disabled={inviteLoading || inviteDone || !inviteEmail.trim()}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-60 transition-colors">
                {inviteLoading ? <><Loader2 size={14} className="animate-spin" /> Versturen…</>
                : inviteDone   ? <><Check size={14} /> Verstuurd!</>
                :                <><Mail size={14} /> Uitnodiging versturen</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Gebruikers</h1>
          <p className="text-sm text-slate-500 mt-0.5">{users.length} account{users.length !== 1 ? "s" : ""}</p>
        </div>
        <button onClick={() => { setInviteOpen(true); setInviteError(""); setInviteDone(false); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors shadow-sm shadow-brand-200">
          <UserPlus size={15} /> Gebruiker uitnodigen
        </button>
      </div>

      {/* Zoekbalk */}
      <div className="relative max-w-xs">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input className="input pl-9" placeholder="Zoeken op naam of e-mail..."
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Tabel */}
      <div className="card overflow-hidden">
        <div className="grid grid-cols-[1fr_140px_110px_160px] text-xs font-semibold uppercase tracking-wider text-slate-400 px-5 py-3 border-b border-slate-100 bg-slate-50/60">
          <span>Gebruiker</span><span>Rol</span><span>Status</span><span className="text-right">Acties</span>
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <Users size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Geen gebruikers gevonden</p>
            <button onClick={() => setInviteOpen(true)}
              className="mt-4 inline-flex items-center gap-1.5 text-sm text-brand-600 hover:underline">
              <UserPlus size={13} /> Eerste gebruiker uitnodigen
            </button>
          </div>
        ) : filtered.map((user, i) => {
          const rc = ROLE_CONFIG[(user.role as UserRole)] ?? ROLE_CONFIG.member;
          const isLoading = loading === user.id;
          return (
            <div key={user.id} className={clsx(
              "grid grid-cols-[1fr_140px_110px_160px] items-center px-5 py-4 transition-colors hover:bg-slate-50/50",
              i !== 0 && "border-t border-slate-100",
              isLoading && "opacity-50 pointer-events-none",
              !user.is_active && "bg-red-50/40"
            )}>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{user.full_name}</p>
                <p className="text-xs text-slate-400 truncate">{user.email}</p>
                <p className="text-xs text-slate-300 mt-0.5">Lid sinds {formatDate(user.created_at)}</p>
              </div>

              <div className="relative">
                <div className={clsx(
                  "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer",
                  rc.bg, rc.color, rc.border
                )}>
                  <span>{rc.label}</span><ChevronDown size={11} className="opacity-50" />
                  <select value={user.role} onChange={e => changeRole(user, e.target.value as UserRole)}
                    disabled={isLoading} className="absolute inset-0 opacity-0 cursor-pointer w-full">
                    <option value="member">Teamlid</option>
                    <option value="admin">Admin</option>
                    <option value="superuser">Superuser</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>
              </div>

              <div>
                <span className={clsx(
                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border",
                  user.is_active ? "text-brand-700 bg-brand-50 border-brand-200" : "text-red-600 bg-red-50 border-red-200"
                )}>
                  <span className={clsx("w-1.5 h-1.5 rounded-full", user.is_active ? "bg-brand-500" : "bg-red-400")} />
                  {user.is_active ? "Actief" : "Geblokkeerd"}
                </span>
              </div>

              <div className="flex items-center gap-1 justify-end">
                <button onClick={() => resetPassword(user)} disabled={isLoading} title="Wachtwoord-reset e-mail sturen"
                  className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                  <RefreshCw size={14} />
                </button>
                <button onClick={() => setConfirmModal({ type: "block", user })} disabled={isLoading}
                  title={user.is_active ? "Account blokkeren" : "Account activeren"}
                  className="p-2 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors">
                  <Ban size={14} />
                </button>
                <button onClick={() => setConfirmModal({ type: "delete", user })} disabled={isLoading}
                  title="Account permanent verwijderen"
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
