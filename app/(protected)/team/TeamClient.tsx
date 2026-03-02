"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Users, Mail, Plus, Trash2, Loader2, Clock,
  Check, Shield, User, X, Send, Crown,
  ChevronDown, ChevronRight, Pencil, Search,
  UserPlus, Building2, AlertCircle,
} from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import clsx from "clsx";
import type { Team, TeamMember, Profile } from "@/types";

// ─── Types ────────────────────────────────────────────────────

interface PlatformMember {
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

interface Props {
  initialMembers:     PlatformMember[];
  currentUserId:      string;
  currentUserRole:    string;
  canManageTeams:     boolean;
}

// ─── Team aanmaken / bewerken modaal ─────────────────────────

function TeamModal({
  mode, team, allUsers, onClose, onSave,
}: {
  mode:     "create" | "edit";
  team?:    Team;
  allUsers: PlatformMember[];
  onClose:  () => void;
  onSave:   (data: { name: string; description: string; leader_id: string | null; member_ids: string[] }) => Promise<void>;
}) {
  const [name,        setName]        = useState(team?.name ?? "");
  const [description, setDescription] = useState(team?.description ?? "");
  const [leaderId,    setLeaderId]    = useState<string | null>(team?.leader_id ?? null);
  const [memberIds,   setMemberIds]   = useState<Set<string>>(
    new Set((team?.members ?? []).map(m => m.user_id))
  );
  const [search,   setSearch]   = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  const filtered = useMemo(() =>
    allUsers.filter(u => u.full_name.toLowerCase().includes(search.toLowerCase()) ||
                         u.email.toLowerCase().includes(search.toLowerCase())),
    [allUsers, search]
  );

  function toggleMember(id: string) {
    setMemberIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleSave() {
    if (!name.trim()) { setError("Teamnaam is verplicht"); return; }
    setLoading(true); setError("");
    const allMemberIds = new Set<string>(memberIds);
    if (leaderId) allMemberIds.add(leaderId);
    await onSave({ name: name.trim(), description, leader_id: leaderId, member_ids: Array.from(allMemberIds) });
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <Users size={16} className="text-brand-600" />
            {mode === "create" ? "Nieuw team aanmaken" : `Team bewerken`}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100"><X size={16} /></button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          {/* Naam */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Teamnaam *</label>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="bijv. Consultancy Team Noord"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
            />
          </div>

          {/* Beschrijving */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Beschrijving (optioneel)</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              placeholder="Waar is dit team verantwoordelijk voor?"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 resize-none"
            />
          </div>

          {/* Teamleider */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Teamleider</label>
            <select
              value={leaderId ?? ""}
              onChange={e => { setLeaderId(e.target.value || null); if (e.target.value) { setMemberIds(prev => new Set([...prev, e.target.value])); } }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 bg-white"
            >
              <option value="">— Geen teamleider —</option>
              {allUsers.map(u => (
                <option key={u.id} value={u.id}>{u.full_name}</option>
              ))}
            </select>
          </div>

          {/* Leden zoeken & toevoegen */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Leden toevoegen
              </label>
              {memberIds.size > 0 && (
                <span className="text-xs font-medium text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">
                  {memberIds.size} geselecteerd
                </span>
              )}
            </div>

            <div className="relative mb-2">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Zoek op naam of e-mail…"
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
              />
            </div>

            <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-100 divide-y divide-slate-50">
              {filtered.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">Geen gebruikers gevonden</p>
              ) : filtered.map(u => {
                const selected = memberIds.has(u.id);
                const isLeader = u.id === leaderId;
                return (
                  <button
                    key={u.id}
                    onClick={() => !isLeader && toggleMember(u.id)}
                    disabled={isLeader}
                    className={clsx(
                      "w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left",
                      selected ? "bg-brand-50" : "hover:bg-slate-50",
                      isLeader && "opacity-70 cursor-default"
                    )}
                  >
                    <Avatar name={u.full_name} url={u.avatar_url} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{u.full_name}</p>
                      <p className="text-xs text-slate-400 truncate">{u.email}</p>
                    </div>
                    {isLeader ? (
                      <span className="flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full flex-shrink-0">
                        <Crown size={10} /> Leider
                      </span>
                    ) : selected ? (
                      <Check size={15} className="text-brand-600 flex-shrink-0" />
                    ) : (
                      <Plus size={15} className="text-slate-300 flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-slate-500 hover:bg-slate-100">Annuleren</button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-60"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            {mode === "create" ? "Team aanmaken" : "Wijzigingen opslaan"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Hoofd component ──────────────────────────────────────────

export default function TeamClient({
  initialMembers,
  currentUserId,
  currentUserRole,
  canManageTeams,
}: Props) {
  const [members,      setMembers]      = useState<PlatformMember[]>(initialMembers);
  const [teams,        setTeams]        = useState<Team[]>([]);
  const [invites,      setInvites]      = useState<Invite[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(true);
  const [activeTab,    setActiveTab]    = useState<"members" | "teams">("members");

  // Invite form state
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [email,    setEmail]    = useState("");
  
  const [sending,  setSending]  = useState(false);
  const [inviteError,   setInviteError]   = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");

  // Team modaal
  const [teamModal, setTeamModal] = useState<{ mode: "create" | "edit"; team?: Team } | null>(null);
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);

  // Toast
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  }

  // ─── Data laden ────────────────────────────────────────────

  useEffect(() => {
    Promise.all([
      fetch("/api/team/invite").then(r => r.ok ? r.json() : []),
      fetch("/api/teams").then(r => r.ok ? r.json() : []),
    ]).then(([inv, tm]) => {
      setInvites(Array.isArray(inv) ? inv : []);
      setTeams(Array.isArray(tm) ? tm : []);
      setTeamsLoading(false);
    });
  }, []);

  // ─── Invite handlers ───────────────────────────────────────

  async function sendInvite() {
    if (!email.trim()) { setInviteError("Vul een e-mailadres in."); return; }
    setSending(true); setInviteError(""); setInviteSuccess("");
    const res = await fetch("/api/team/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), role: "member" }),
    });
    const data = await res.json();
    setSending(false);
    if (!res.ok) { setInviteError(data.error ?? "Uitnodiging mislukt."); return; }
    setInvites(prev => [data.invite, ...prev]);
    setEmail(""); setRole("member");
    setInviteSuccess(`Uitnodiging verstuurd naar ${email.trim()} 🎉`);
    setShowInviteForm(false);
    setTimeout(() => setInviteSuccess(""), 5000);
  }

  async function revokeInvite(id: string) {
    if (!confirm("Uitnodiging intrekken?")) return;
    await fetch(`/api/team/invite/${id}`, { method: "DELETE" });
    setInvites(prev => prev.filter(i => i.id !== id));
  }

  // ─── Team handlers ─────────────────────────────────────────

  async function handleSaveTeam(data: { name: string; description: string; leader_id: string | null; member_ids: string[] }) {
    if (teamModal?.mode === "create") {
      const res  = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (res.ok) {
        setTeams(prev => [json, ...prev]);
        setTeamModal(null);
        showToast(`Team '${json.name}' aangemaakt!`);
      } else {
        showToast(json.error ?? "Aanmaken mislukt", false);
      }
    } else if (teamModal?.mode === "edit" && teamModal.team) {
      const res  = await fetch(`/api/teams/${teamModal.team.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (res.ok) {
        setTeams(prev => prev.map(t => t.id === teamModal.team!.id ? json : t));
        setTeamModal(null);
        showToast("Team bijgewerkt");
      }
    }
  }

  async function handleDeleteTeam(id: string) {
    if (!confirm("Team verwijderen? Dit kan niet ongedaan worden gemaakt.")) return;
    const res = await fetch(`/api/teams/${id}`, { method: "DELETE" });
    if (res.ok) {
      setTeams(prev => prev.filter(t => t.id !== id));
      showToast("Team verwijderd");
    }
  }

  async function handleToggleMember(teamId: string, userId: string, action: "add" | "remove") {
    const res  = await fetch(`/api/teams/${teamId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, user_id: userId }),
    });
    const json = await res.json();
    if (res.ok) setTeams(prev => prev.map(t => t.id === teamId ? json : t));
  }

  // ─── Computed ──────────────────────────────────────────────

  const pendingInvites = invites.filter(i => !i.accepted_at && new Date(i.expires_at) > new Date());
  const expiredInvites = invites.filter(i => !i.accepted_at && new Date(i.expires_at) <= new Date());

  const ROLE_LABEL: Record<string, string> = {
    admin: "Admin", member: "Teamlid", viewer: "Viewer",
    superuser: "Superuser",
  };

  // ─── Render ────────────────────────────────────────────────

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Toast */}
      {toast && (
        <div className={clsx(
          "fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium shadow-lg",
          toast.ok ? "bg-white border-brand-200 text-brand-700" : "bg-white border-red-200 text-red-700"
        )}>
          <span className={clsx("w-2 h-2 rounded-full", toast.ok ? "bg-brand-500" : "bg-red-500")} />
          {toast.msg}
          <button onClick={() => setToast(null)}><X size={14} className="text-slate-400" /></button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Team & Organisatie</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {members.length} leden · {teams.length} team{teams.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canManageTeams && (
            <button
              onClick={() => { setTeamModal({ mode: "create" }); setActiveTab("teams"); }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors shadow-sm"
            >
              <Plus size={15} /> Nieuw team
            </button>
          )}
          <button
            onClick={() => { setShowInviteForm(v => !v); setInviteError(""); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors"
          >
            <UserPlus size={15} /> Teamlid uitnodigen
          </button>
        </div>
      </div>

      {/* Success banner */}
      {inviteSuccess && (
        <div className="flex items-center gap-2 px-4 py-3 bg-brand-50 border border-brand-200 rounded-xl text-brand-700 text-sm font-medium">
          <Check size={15} /> {inviteSuccess}
        </div>
      )}

      {/* Invite form */}
      {showInviteForm && (
        <div className="card p-6 border-2 border-brand-100 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Send size={16} className="text-brand-500" />
              <h3 className="font-semibold text-slate-800">Nieuw teamlid uitnodigen</h3>
            </div>
            <button onClick={() => setShowInviteForm(false)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
          </div>

          {inviteError && (
            <div className="px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{inviteError}</div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">E-mailadres *</label>
              <input
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                type="email" placeholder="naam@bedrijf.nl"
                value={email} onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendInvite()} autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Rol</label>
              <select
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 bg-white"
                value={role} onChange={e => setRole(e.target.value as any)}
              >
                <option value="member">Teamlid</option>
                <option value="admin">Beheerder</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <button onClick={() => setShowInviteForm(false)} className="px-4 py-2 rounded-xl text-sm text-slate-500 hover:bg-slate-100">Annuleren</button>
            <button onClick={sendInvite} disabled={sending}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-60">
              {sending ? <><Loader2 size={14} className="animate-spin" /> Versturen…</> : <><Send size={14} /> Versturen</>}
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
        {[
          { key: "members", label: `Leden (${members.length})`, icon: Users },
          { key: "teams",   label: `Teams (${teams.length})`,   icon: Building2 },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={clsx(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              activeTab === tab.key ? "bg-white text-brand-700 shadow-sm font-semibold" : "text-slate-500 hover:text-slate-700"
            )}
          >
            <tab.icon size={14} /> {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Leden ─────────────────────────────────────── */}
      {activeTab === "members" && (
        <div className="space-y-5">
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
                {/* Teams van dit lid */}
                <div className="hidden sm:flex gap-1 flex-wrap max-w-[200px]">
                  {teams.filter(t => t.members?.some(tm => tm.user_id === m.id)).map(t => (
                    <span key={t.id} className="text-[10px] font-medium text-brand-600 bg-brand-50 border border-brand-100 px-2 py-0.5 rounded-full truncate max-w-[100px]">
                      {t.name}
                    </span>
                  ))}
                </div>
                <span className={clsx(
                  "flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border",
                  m.role === "admin"        ? "bg-brand-50 text-brand-700 border-brand-100" :
                  
                  m.role === "superuser"    ? "bg-amber-50 text-amber-700 border-amber-100" :
                                              "bg-slate-100 text-slate-500 border-slate-200"
                )}>
                  {m.role === "admin" || m.role === "superuser" ? <Shield size={10} /> :
                   <User size={10} />}
                  {ROLE_LABEL[m.role] ?? m.role}
                </span>
              </div>
            ))}
          </div>

          {/* Uitnodigingen */}
          {pendingInvites.length > 0 && (
            <div>
              <h3 className="font-semibold text-slate-700 flex items-center gap-2 mb-3 text-sm">
                <Clock size={14} className="text-amber-500" /> Openstaande uitnodigingen
              </h3>
              <div className="card divide-y divide-slate-50 overflow-hidden">
                {pendingInvites.map(inv => {
                  const days = Math.ceil((new Date(inv.expires_at).getTime() - Date.now()) / 86400000);
                  return (
                    <div key={inv.id} className="flex items-center gap-3 px-5 py-3.5">
                      <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                        <Mail size={16} className="text-amber-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{inv.email}</p>
                        <p className="text-xs text-slate-400">Verloopt over {days} dag{days !== 1 ? "en" : ""}</p>
                      </div>
                      <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg">
                        {ROLE_LABEL[inv.role] ?? inv.role}
                      </span>
                      <button onClick={() => revokeInvite(inv.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Teams ─────────────────────────────────────── */}
      {activeTab === "teams" && (
        <div className="space-y-3">
          {teamsLoading ? (
            <div className="card p-10 flex items-center justify-center">
              <Loader2 size={20} className="animate-spin text-slate-400" />
            </div>
          ) : teams.length === 0 ? (
            <div className="card p-12 text-center">
              <Users size={32} className="mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500 font-medium text-sm">Nog geen teams aangemaakt</p>
              {canManageTeams && (
                <button onClick={() => setTeamModal({ mode: "create" })}
                  className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 mx-auto">
                  <Plus size={14} /> Eerste team aanmaken
                </button>
              )}
            </div>
          ) : teams.map(team => {
            const isExpanded = expandedTeam === team.id;
            const canEdit    = canManageTeams || team.leader_id === currentUserId;
            const memberCount = team.members?.length ?? 0;

            return (
              <div key={team.id} className="card overflow-hidden">
                {/* Team header */}
                <div className="flex items-center gap-3 px-5 py-4">
                  <button
                    onClick={() => setExpandedTeam(isExpanded ? null : team.id)}
                    className="flex items-center gap-3 flex-1 min-w-0 text-left"
                  >
                    <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0">
                      <Users size={18} className="text-brand-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-800">{team.name}</p>
                        <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full flex-shrink-0">
                          {memberCount} lid{memberCount !== 1 ? "en" : ""}
                        </span>
                      </div>
                      {team.leader && (
                        <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                          <Crown size={10} className="text-amber-500" /> {team.leader.full_name}
                        </p>
                      )}
                      {team.description && (
                        <p className="text-xs text-slate-400 truncate mt-0.5">{team.description}</p>
                      )}
                    </div>
                    {isExpanded
                      ? <ChevronDown size={16} className="text-slate-400 flex-shrink-0" />
                      : <ChevronRight size={16} className="text-slate-400 flex-shrink-0" />}
                  </button>

                  {canEdit && (
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => setTeamModal({ mode: "edit", team })}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors">
                        <Pencil size={14} />
                      </button>
                      {canManageTeams && (
                        <button onClick={() => handleDeleteTeam(team.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Uitgebreide ledenlijst */}
                {isExpanded && (
                  <div className="border-t border-slate-100 divide-y divide-slate-50">
                    {(team.members ?? []).length === 0 ? (
                      <p className="text-sm text-slate-400 text-center py-4">Geen leden in dit team</p>
                    ) : (team.members ?? []).map(m => {
                      const isLeader = m.user_id === team.leader_id;
                      return (
                        <div key={m.user_id} className="flex items-center gap-3 px-5 py-3">
                          <Avatar name={m.profile?.full_name} url={m.profile?.avatar_url} size="sm" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">{m.profile?.full_name}</p>
                            <p className="text-xs text-slate-400 truncate">{m.profile?.email}</p>
                          </div>
                          {isLeader ? (
                            <span className="flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full flex-shrink-0">
                              <Crown size={10} /> Teamleider
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                              Lid
                            </span>
                          )}
                          {canEdit && !isLeader && (
                            <button
                              onClick={() => handleToggleMember(team.id, m.user_id, "remove")}
                              className="p-1 rounded-lg text-slate-300 hover:text-red-400 hover:bg-red-50 transition-colors"
                              title="Lid verwijderen"
                            >
                              <X size={13} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Team modaal */}
      {teamModal && (
        <TeamModal
          mode={teamModal.mode}
          team={teamModal.team}
          allUsers={members}
          onClose={() => setTeamModal(null)}
          onSave={handleSaveTeam}
        />
      )}
    </div>
  );
}
