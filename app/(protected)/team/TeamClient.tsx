"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Users, Plus, Trash2, Loader2,
  Check, Shield, User, X, Crown,
  ChevronRight, Pencil, Search,
  Building2, AlertCircle,
} from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import Toast from "@/components/ui/Toast";
import { useToast } from "@/lib/hooks/useToast";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useConfirm } from "@/lib/hooks/useConfirm";
import clsx from "clsx";
import type { Team, TeamMember, Profile } from "@/types";

// ─── Constanten buiten component (geen re-create per render) ──

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin", member: "Teamlid", viewer: "Viewer",
  superuser: "Superuser", projectleider: "Projectleider",
};

// ─── Types ────────────────────────────────────────────────────

interface PlatformMember {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  role: string;
  created_at: string;
}

interface Props {
  initialMembers:  PlatformMember[];
  currentUserId:   string;
  currentUserRole: string;
  canManageTeams:  boolean;
}

type Tab = "members" | "teams";

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
    new Set((team?.members ?? []).map((m: TeamMember) => m.user_id))
  );
  const [search,  setSearch]  = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const filtered = useMemo(() =>
    allUsers.filter(u =>
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
    ),
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
            {mode === "create" ? "Nieuw team aanmaken" : "Team bewerken"}
          </h3>
          <button onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <div>
            <label className="label">Teamnaam *</label>
            <input autoFocus value={name} onChange={e => setName(e.target.value)}
              placeholder="bijv. Consultancy Team Noord" className="input" />
          </div>

          <div>
            <label className="label">Beschrijving (optioneel)</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              rows={2} placeholder="Waar is dit team verantwoordelijk voor?"
              className="input resize-none" />
          </div>

          <div>
            <label className="label">Teamleider</label>
            <select
              value={leaderId ?? ""}
              onChange={e => {
                setLeaderId(e.target.value || null);
                if (e.target.value) setMemberIds(prev => new Set([...prev, e.target.value]));
              }}
              className="input bg-white"
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
              <label className="label mb-0">Leden toevoegen</label>
              {memberIds.size > 0 && (
                <span className="text-xs font-medium text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">
                  {memberIds.size} geselecteerd
                </span>
              )}
            </div>

            <div className="relative mb-2">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Zoek op naam of e-mail…"
                className="input pl-8" />
            </div>

            <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-100 divide-y divide-slate-50">
              {filtered.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">Geen gebruikers gevonden</p>
              ) : filtered.map(u => {
                const selected = memberIds.has(u.id);
                const isLeader = u.id === leaderId;
                return (
                  <button key={u.id}
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
          <button onClick={onClose} className="btn-outline">Annuleren</button>
          <button onClick={handleSave} disabled={loading} className="btn-primary">
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
  const router = useRouter();
  const { requestConfirm, confirmProps } = useConfirm();
  const [members,      setMembers]      = useState<PlatformMember[]>(initialMembers);
  const [teams,        setTeams]        = useState<Team[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(true);
  const [activeTab,    setActiveTab]    = useState<Tab>("members");

  // Team modaal
  const [teamModal, setTeamModal] = useState<{ mode: "create" | "edit"; team?: Team } | null>(null);

  const { toast, showToast, clearToast } = useToast();

  // ─── Data laden ────────────────────────────────────────────

  useEffect(() => {
    fetch("/api/teams").then(r => r.ok ? r.json() : []).then(tm => {
      setTeams(Array.isArray(tm) ? tm : []);
      setTeamsLoading(false);
    });
  }, []);

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
      } else {
        showToast(json.error ?? "Bijwerken mislukt", false);
      }
    }
  }

  async function handleDeleteTeam(id: string) {
    if (!(await requestConfirm({
      title:        "Team verwijderen?",
      description:  "Dit kan niet ongedaan worden gemaakt.",
      confirmLabel: "Verwijderen",
      variant:      "danger",
    }))) return;
    const res = await fetch(`/api/teams/${id}`, { method: "DELETE" });
    if (res.ok) {
      setTeams(prev => prev.filter(t => t.id !== id));
      showToast("Team verwijderd");
    } else {
      const data = await res.json().catch(() => ({}));
      showToast(data.error ?? "Verwijderen mislukt", false);
    }
  }

  // ─── Computed (memoized) ───────────────────────────────────

  const TABS = useMemo<{ id: Tab; label: string; icon: React.ElementType; badge?: number }[]>(() => [
    { id: "members", label: "Leden",  icon: Users,     badge: members.length },
    { id: "teams",   label: "Teams",  icon: Building2, badge: teams.length   },
  ], [members.length, teams.length]);

  // ─── Render ────────────────────────────────────────────────

  return (
    <div className="-mx-4 sm:-mx-6 -my-4 sm:-my-6 flex min-h-[calc(100dvh-56px)]">

      <Toast toast={toast} onClose={clearToast} />

      {/* ══ SIDEBAR ══════════════════════════════════════════ */}
      <aside className="hidden lg:flex flex-col w-[260px] flex-shrink-0 border-r border-slate-200 bg-white">

        <div className="px-5 pt-5 pb-4 border-b border-slate-200">
          {/* Icoon + titel */}
          <div className="flex items-start gap-2.5 mb-4">
            <div className="w-9 h-9 rounded-xl bg-brand-50 border border-brand-100 flex items-center
                            justify-center flex-shrink-0 mt-0.5">
              <Users size={16} className="text-brand-600" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-bold text-slate-800 leading-tight">Team & Organisatie</h1>
              <p className="text-[11px] text-slate-400 mt-0.5">Beheer leden en teams</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100">
            {[
              { label: "Leden",  value: members.length, color: "text-slate-800" },
              { label: "Teams",  value: teams.length,   color: "text-brand-700" },
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className={clsx("text-lg font-bold", s.color)}>{s.value}</p>
                <p className="text-[10px] font-semibold text-slate-400">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tab navigatie */}
        <nav className="flex flex-col gap-0.5 px-2 py-3 flex-1">
          {TABS.map(tab => {
            const Icon   = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all text-left",
                  active
                    ? "bg-brand-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-800"
                )}>
                <Icon size={15} className={active ? "opacity-80" : "text-slate-400"} />
                {tab.label}
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className={clsx(
                    "ml-auto text-[11px] font-bold px-1.5 py-0.5 rounded-full",
                    active ? "bg-white/25 text-white" : "bg-slate-100 text-slate-600"
                  )}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Acties onderaan */}
        {canManageTeams && (
          <div className="px-4 py-4 border-t border-slate-200">
            <button
              onClick={() => { setTeamModal({ mode: "create" }); setActiveTab("teams"); }}
              className="btn-primary w-full justify-center"
            >
              <Plus size={14} /> Nieuw team
            </button>
          </div>
        )}
      </aside>

      {/* ══ INHOUD ═══════════════════════════════════════════ */}
      <div className="flex-1 min-w-0 overflow-y-auto bg-slate-50">

        {/* Mobiele header */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-200">
          <div className="w-8 h-8 rounded-xl bg-brand-50 flex items-center justify-center">
            <Users size={15} className="text-brand-600" />
          </div>
          <h1 className="font-bold text-slate-800 flex-1">Team & Organisatie</h1>
          {canManageTeams && (
            <button onClick={() => setTeamModal({ mode: "create" })}
              className="btn-primary text-xs px-3 py-1.5">
              <Plus size={13} /> Nieuw team
            </button>
          )}
        </div>
        <div className="lg:hidden flex gap-1 px-4 py-2 bg-white border-b border-slate-200 overflow-x-auto">
          {TABS.map(tab => {
            const Icon   = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  "flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                  active ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-100"
                )}>
                <Icon size={12} /> {tab.label}
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className={clsx(
                    "ml-0.5 text-[10px] font-bold px-1 py-0.5 rounded-full",
                    active ? "bg-white/25 text-white" : "bg-slate-200 text-slate-600"
                  )}>{tab.badge}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Tab: Leden ─────────────────────────────────────── */}
        {activeTab === "members" && (
          <div className="p-5 sm:p-6 max-w-3xl space-y-4">
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
                    {teams.filter(t => t.members?.some((tm: TeamMember) => tm.user_id === m.id)).map(t => (
                      <span key={t.id} className="text-[10px] font-medium text-brand-600 bg-brand-50 border border-brand-100 px-2 py-0.5 rounded-full truncate max-w-[100px]">
                        {t.name}
                      </span>
                    ))}
                  </div>
                  <span className={clsx(
                    "flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border",
                    m.role === "admin"     ? "bg-brand-50 text-brand-700 border-brand-100" :
                    m.role === "superuser" ? "bg-amber-50 text-amber-700 border-amber-100" :
                                            "bg-slate-100 text-slate-500 border-slate-200"
                  )}>
                    {m.role === "admin" || m.role === "superuser" ? <Shield size={10} /> : <User size={10} />}
                    {ROLE_LABEL[m.role] ?? m.role}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Tab: Teams ─────────────────────────────────────── */}
        {activeTab === "teams" && (
          <div className="p-5 sm:p-6">
            {teamsLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 size={20} className="animate-spin text-slate-400" />
              </div>
            ) : teams.length === 0 ? (
              <div className="card p-12 text-center">
                <Users size={32} className="mx-auto text-slate-300 mb-3" />
                <p className="text-slate-500 font-medium text-sm">Nog geen teams aangemaakt</p>
                {canManageTeams && (
                  <button onClick={() => setTeamModal({ mode: "create" })}
                    className="btn-primary mt-4 mx-auto">
                    <Plus size={14} /> Eerste team aanmaken
                  </button>
                )}
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {teams.map(team => {
                  const canEdit     = canManageTeams || team.leader_id === currentUserId;
                  const memberCount = team.members?.length ?? 0;
                  return (
                    <div
                      key={team.id}
                      onClick={() => router.push(`/team/${team.id}`)}
                      className="card p-5 cursor-pointer hover:border-brand-200 hover:shadow-sm transition-all group"
                    >
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0">
                          <Users size={18} className="text-brand-600" />
                        </div>
                        {canEdit && (
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                            <button
                              onClick={e => { e.stopPropagation(); setTeamModal({ mode: "edit", team }); }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                            >
                              <Pencil size={13} />
                            </button>
                            {canManageTeams && (
                              <button
                                onClick={e => { e.stopPropagation(); handleDeleteTeam(team.id); }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      <p className="font-semibold text-slate-800 group-hover:text-brand-700 transition-colors mb-1 leading-tight">
                        {team.name}
                      </p>
                      {team.description && (
                        <p className="text-xs text-slate-400 line-clamp-2 mb-3">{team.description}</p>
                      )}

                      <div className="flex items-center justify-between mt-auto pt-2 border-t border-slate-100">
                        <span className="text-xs text-slate-400">
                          {memberCount} lid{memberCount !== 1 ? "en" : ""}
                        </span>
                        {team.leader && (
                          <span className="flex items-center gap-1 text-xs text-amber-600">
                            <Crown size={10} />
                            <span className="truncate max-w-[100px]">
                              {(team.leader as { full_name: string }).full_name}
                            </span>
                          </span>
                        )}
                        <ChevronRight size={14} className="text-slate-300 group-hover:text-brand-400 transition-colors flex-shrink-0" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

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

      <ConfirmDialog {...confirmProps} />
    </div>
  );
}
