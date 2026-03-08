"use client";
// app/(protected)/org/[orgId]/settings/OrgSettingsClient.tsx
//
// Org-admin paneel:
//   - Leden van zijn eigen org beheren (rol wijzigen, verwijderen)
//   - Nieuwe leden uitnodigen
//   - Openstaande uitnodigingen intrekken
//   - Org-naam bewerken (als admin)

import { useState, useEffect, useRef } from "react";
import {
  Users, Mail, Send, Trash2, Loader2, Clock,
  Check, Shield, User, X, ChevronDown, Eye,
  UserPlus, Building2, Pencil, AlertCircle,
  Upload, ImageOff, Palette,
} from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import clsx from "clsx";
import type { Organisation, OrgMember, OrgRole, TeamInvite } from "@/types";

// ── Config ────────────────────────────────────────────────────

const ORG_ROLE_CONFIG: Record<OrgRole, { label: string; color: string; bg: string; border: string }> = {
  admin:  { label: "Org Admin", color: "text-brand-700",  bg: "bg-brand-50",  border: "border-brand-200" },
  member: { label: "Lid",       color: "text-slate-600",  bg: "bg-slate-100", border: "border-slate-200" },
  viewer: { label: "Viewer",    color: "text-slate-500",  bg: "bg-slate-50",  border: "border-slate-200" },
};

// ── Props ─────────────────────────────────────────────────────

interface Props {
  org:            Organisation;
  initialMembers: OrgMember[];
  currentUserId:  string;
  currentOrgRole: OrgRole;
}

// ── Component ─────────────────────────────────────────────────

export default function OrgSettingsClient({
  org,
  initialMembers,
  currentUserId,
  currentOrgRole,
}: Props) {
  const [members,  setMembers]  = useState<OrgMember[]>(initialMembers);
  const [invites,  setInvites]  = useState<TeamInvite[]>([]);
  const [invLoading, setInvLoading] = useState(true);
  const [toast,    setToast]    = useState<{ msg: string; ok: boolean } | null>(null);
  const [loading,  setLoading]  = useState<string | null>(null);

  // Org naam bewerken
  const [editName,    setEditName]    = useState(false);
  const [orgName,     setOrgName]     = useState(org.name);
  const [nameSaving,  setNameSaving]  = useState(false);

  // Logo upload
  const logoFileRef                   = useRef<HTMLInputElement>(null);
  const [logoUrl,     setLogoUrl]     = useState<string | null>(org.logo_url ?? null);
  const [logoLoading, setLogoLoading] = useState(false);

  // Huisstijl
  const [primaryColor,    setPrimaryColor]    = useState(org.primary_color ?? "#16a34a");
  const [accentColor,     setAccentColor]     = useState(org.accent_color ?? "#15803d");
  const [settingsSaving,  setSettingsSaving]  = useState(false);

  // Invite form
  const [showInvite, setShowInvite] = useState(false);
  const [invEmail,   setInvEmail]   = useState("");
  const [invRole,    setInvRole]    = useState<OrgRole>("member");
  const [invSending, setInvSending] = useState(false);
  const [invError,   setInvError]   = useState("");

  const isAdmin = currentOrgRole === "admin";

  // ── Load invites ──────────────────────────────────────────

  useEffect(() => {
    fetch(`/api/org/${org.id}/invite`)
      .then(r => r.json())
      .then(data => { setInvites(Array.isArray(data) ? data : []); setInvLoading(false); })
      .catch(() => setInvLoading(false));
  }, [org.id]);

  // ── Helpers ───────────────────────────────────────────────

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  const pendingInvites = invites.filter(i =>
    !i.accepted_at && new Date(i.expires_at) > new Date()
  );

  // ── Org naam opslaan ──────────────────────────────────────

  async function saveOrgName() {
    if (!orgName.trim() || orgName === org.name) { setEditName(false); return; }
    setNameSaving(true);
    const res  = await fetch(`/api/org/${org.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: orgName.trim() }),
    });
    const data = await res.json();
    setNameSaving(false);
    if (!res.ok) { showToast(data.error ?? "Fout opgetreden", false); return; }
    setEditName(false);
    showToast("Organisatienaam bijgewerkt");
  }

  // ── Rol wijzigen ─────────────────────────────────────────

  async function changeRole(member: OrgMember, newRole: OrgRole) {
    setLoading(member.user_id);
    const res  = await fetch(`/api/org/${org.id}/members/${member.user_id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ org_role: newRole }),
    });
    const data = await res.json();
    setLoading(null);
    if (!res.ok) { showToast(data.error ?? "Fout", false); return; }
    setMembers(prev => prev.map(m =>
      m.user_id === member.user_id ? { ...m, org_role: newRole } : m
    ));
    showToast(`Rol van ${member.profile?.full_name} gewijzigd naar ${ORG_ROLE_CONFIG[newRole].label}`);
  }

  // ── Lid verwijderen ───────────────────────────────────────

  async function removeMember(member: OrgMember) {
    if (!confirm(`${member.profile?.full_name} uit de organisatie verwijderen?`)) return;
    setLoading(member.user_id);
    const res = await fetch(`/api/org/${org.id}/members/${member.user_id}`, { method: "DELETE" });
    setLoading(null);
    if (!res.ok) { const d = await res.json(); showToast(d.error ?? "Fout", false); return; }
    setMembers(prev => prev.filter(m => m.user_id !== member.user_id));
    showToast(`${member.profile?.full_name} verwijderd uit de organisatie`);
  }

  // ── Uitnodiging versturen ─────────────────────────────────

  async function sendInvite() {
    setInvError("");
    if (!invEmail.trim()) { setInvError("E-mailadres is verplicht"); return; }
    setInvSending(true);
    const res  = await fetch(`/api/org/${org.id}/invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: invEmail.trim(), org_role: invRole }),
    });
    const data = await res.json();
    setInvSending(false);
    if (!res.ok) { setInvError(data.error ?? "Fout opgetreden"); return; }
    showToast(`Uitnodiging verstuurd naar ${invEmail}`);
    setShowInvite(false);
    setInvEmail(""); setInvRole("member");
    // Refresh invites
    const inv = await fetch(`/api/org/${org.id}/invite`).then(r => r.json());
    if (Array.isArray(inv)) setInvites(inv);
  }

  // ── Uitnodiging intrekken ─────────────────────────────────

  async function revokeInvite(inviteId: string) {
    const res = await fetch(`/api/org/${org.id}/invite`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: inviteId }),
    });
    if (!res.ok) { const d = await res.json(); showToast(d.error ?? "Fout", false); return; }
    setInvites(prev => prev.filter(i => i.id !== inviteId));
    showToast("Uitnodiging ingetrokken");
  }

  // ── Logo upload ───────────────────────────────────────────

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoLoading(true);
    const form = new FormData();
    form.append("file", file);
    const res  = await fetch(`/api/org/${org.id}/logo`, { method: "POST", body: form });
    const data = await res.json();
    setLogoLoading(false);
    if (!res.ok) { showToast(data.error ?? "Upload mislukt", false); return; }
    setLogoUrl(data.logo_url);
    showToast("Logo bijgewerkt");
    // Reset input zodat dezelfde file opnieuw gekozen kan worden
    if (logoFileRef.current) logoFileRef.current.value = "";
  }

  async function handleLogoDelete() {
    if (!confirm("Logo verwijderen?")) return;
    setLogoLoading(true);
    const res = await fetch(`/api/org/${org.id}/logo`, { method: "DELETE" });
    setLogoLoading(false);
    if (!res.ok) { const d = await res.json(); showToast(d.error ?? "Verwijderen mislukt", false); return; }
    setLogoUrl(null);
    showToast("Logo verwijderd");
  }

  // ── Huisstijl opslaan ─────────────────────────────────────

  async function saveOrgSettings() {
    setSettingsSaving(true);
    const res = await fetch(`/api/org/${org.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        primary_color: primaryColor,
        accent_color:  accentColor,
      }),
    });
    const data = await res.json();
    setSettingsSaving(false);
    if (!res.ok) { showToast(data.error ?? "Fout opgetreden", false); return; }
    showToast("Huisstijl opgeslagen");
  }

  // ── Render ────────────────────────────────────────────────

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-8">

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

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">

          {/* Logo upload */}
          <div className="relative group flex-shrink-0">
            <div className="w-14 h-14 rounded-xl border-2 border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center">
              {logoLoading ? (
                <Loader2 size={20} className="text-slate-400 animate-spin" />
              ) : logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Organisatie logo"
                  className="w-full h-full object-contain"
                  onError={() => setLogoUrl(null)}
                />
              ) : (
                <Building2 size={22} className="text-slate-300" />
              )}
            </div>

            {/* Hover overlay — alleen voor admins */}
            {isAdmin && (
              <div className="absolute inset-0 rounded-xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                <button
                  onClick={() => logoFileRef.current?.click()}
                  disabled={logoLoading}
                  title="Logo uploaden"
                  className="p-1.5 rounded-lg bg-white/90 text-slate-700 hover:bg-white transition-colors"
                >
                  <Upload size={12} />
                </button>
                {logoUrl && (
                  <button
                    onClick={handleLogoDelete}
                    disabled={logoLoading}
                    title="Logo verwijderen"
                    className="p-1.5 rounded-lg bg-white/90 text-red-600 hover:bg-white transition-colors"
                  >
                    <ImageOff size={12} />
                  </button>
                )}
              </div>
            )}

            {/* Hidden file input */}
            <input
              ref={logoFileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/svg+xml"
              className="hidden"
              onChange={handleLogoChange}
            />
          </div>

          <div>
            {editName ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={orgName}
                  onChange={e => setOrgName(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") saveOrgName(); if (e.key === "Escape") { setEditName(false); setOrgName(org.name); } }}
                  className="text-xl font-bold border-b-2 border-brand-500 bg-transparent outline-none text-slate-800 w-48"
                />
                <button onClick={saveOrgName} disabled={nameSaving} className="p-1 rounded-lg text-brand-600 hover:bg-brand-50">
                  {nameSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                </button>
                <button onClick={() => { setEditName(false); setOrgName(org.name); }} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-800">{orgName}</h1>
                {isAdmin && (
                  <button onClick={() => setEditName(true)} className="p-1 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50">
                    <Pencil size={13} />
                  </button>
                )}
              </div>
            )}
            <p className="text-sm text-slate-500">{members.length} leden</p>
            {isAdmin && (
              <p className="text-xs text-slate-400 mt-0.5">Hover over het logo om het te wijzigen</p>
            )}
          </div>
        </div>

        {isAdmin && (
          <button
            onClick={() => { setShowInvite(v => !v); setInvError(""); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors shadow-sm"
          >
            <UserPlus size={15} /> Lid uitnodigen
          </button>
        )}
      </div>

      {/* Invite form */}
      {showInvite && isAdmin && (
        <div className="card p-6 border-2 border-brand-100 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Send size={16} className="text-brand-500" />
              <h3 className="font-semibold text-slate-800">Nieuw lid uitnodigen</h3>
            </div>
            <button onClick={() => setShowInvite(false)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
          </div>

          {invError && (
            <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
              <AlertCircle size={14} /> {invError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">E-mailadres *</label>
              <input
                autoFocus
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                type="email" placeholder="naam@bedrijf.nl"
                value={invEmail} onChange={e => setInvEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendInvite()}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Rol</label>
              <select
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 bg-white"
                value={invRole} onChange={e => setInvRole(e.target.value as OrgRole)}
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

      {/* Ledenlijst */}
      <div>
        <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-3">
          <Users size={14} className="text-brand-500" /> Leden
        </h2>
        <div className="card divide-y divide-slate-50 overflow-hidden">
          {members.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              <Users size={28} className="mx-auto mb-2 opacity-30" />
              Nog geen leden
            </div>
          ) : members.map(member => {
            const rc        = ORG_ROLE_CONFIG[member.org_role] ?? ORG_ROLE_CONFIG.member;
            const isLoading = loading === member.user_id;
            const isSelf    = member.user_id === currentUserId;

            return (
              <div key={member.user_id} className={clsx(
                "flex items-center gap-3 px-5 py-4 transition-colors hover:bg-slate-50/50",
                isLoading && "opacity-50 pointer-events-none",
                !member.profile?.is_active && "bg-red-50/30"
              )}>
                <Avatar name={member.profile?.full_name} url={member.profile?.avatar_url} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">
                    {member.profile?.full_name}
                    {isSelf && <span className="ml-2 text-xs text-slate-400">(jij)</span>}
                  </p>
                  <p className="text-xs text-slate-400 truncate">{member.profile?.email}</p>
                </div>

                {/* Rol */}
                {isAdmin && !isSelf ? (
                  <div className="relative">
                    <div className={clsx(
                      "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer",
                      rc.bg, rc.color, rc.border
                    )}>
                      <span>{rc.label}</span>
                      <ChevronDown size={11} className="opacity-50" />
                      <select
                        value={member.org_role}
                        onChange={e => changeRole(member, e.target.value as OrgRole)}
                        disabled={isLoading}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full"
                      >
                        <option value="member">Lid</option>
                        <option value="admin">Org Admin</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    </div>
                  </div>
                ) : (
                  <span className={clsx(
                    "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border",
                    rc.bg, rc.color, rc.border
                  )}>
                    {member.org_role === "admin" ? <Shield size={10} /> : member.org_role === "viewer" ? <Eye size={10} /> : <User size={10} />}
                    {rc.label}
                  </span>
                )}

                {/* Verwijder */}
                {isAdmin && !isSelf && (
                  <button
                    onClick={() => removeMember(member)}
                    disabled={isLoading}
                    title="Verwijder uit organisatie"
                    className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Openstaande uitnodigingen */}
      {isAdmin && (
        <div>
          <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-3">
            <Clock size={14} className="text-amber-500" /> Openstaande uitnodigingen
          </h2>

          {invLoading ? (
            <div className="card p-6 flex items-center justify-center">
              <Loader2 size={18} className="animate-spin text-slate-400" />
            </div>
          ) : pendingInvites.length === 0 ? (
            <div className="card p-6 text-center text-sm text-slate-400">
              Geen openstaande uitnodigingen
            </div>
          ) : (
            <div className="card divide-y divide-slate-50 overflow-hidden">
              {pendingInvites.map(inv => {
                const days = Math.ceil((new Date(inv.expires_at).getTime() - Date.now()) / 86400000);
                const rc   = ORG_ROLE_CONFIG[inv.org_role] ?? ORG_ROLE_CONFIG.member;
                return (
                  <div key={inv.id} className="flex items-center gap-3 px-5 py-3.5">
                    <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                      <Mail size={16} className="text-amber-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{inv.email}</p>
                      <p className="text-xs text-slate-400">
                        Verloopt over {days} dag{days !== 1 ? "en" : ""}
                      </p>
                    </div>
                    <span className={clsx(
                      "text-xs font-semibold px-2.5 py-1 rounded-lg border",
                      rc.bg, rc.color, rc.border
                    )}>
                      {rc.label}
                    </span>
                    <button onClick={() => revokeInvite(inv.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Huisstijl (kleuren) ── */}
      {isAdmin && (
        <div>
          <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-3">
            <Palette size={14} className="text-brand-500" /> Huisstijl
          </h2>
          <div className="card p-6 space-y-5">

            {/* Kleuren */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Primaire kleur
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={e => setPrimaryColor(e.target.value)}
                    className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer p-0.5 bg-white"
                  />
                  <input
                    type="text"
                    value={primaryColor}
                    onChange={e => setPrimaryColor(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                    placeholder="#16a34a"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Accentkleur
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={accentColor}
                    onChange={e => setAccentColor(e.target.value)}
                    className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer p-0.5 bg-white"
                  />
                  <input
                    type="text"
                    value={accentColor}
                    onChange={e => setAccentColor(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                    placeholder="#15803d"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                onClick={saveOrgSettings}
                disabled={settingsSaving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-60 transition-colors"
              >
                {settingsSaving
                  ? <><Loader2 size={14} className="animate-spin" /> Opslaan…</>
                  : <><Check size={14} /> Huisstijl opslaan</>
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
