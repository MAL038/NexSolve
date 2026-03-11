"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Users, Crown, Shield, User,
  FolderKanban, Pencil, Trash2, Loader2, Check, X,
  AlertCircle, ChevronRight,
} from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import StatusBadge from "@/components/ui/StatusBadge";
import Toast from "@/components/ui/Toast";
import { useToast } from "@/lib/hooks/useToast";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useConfirm } from "@/lib/hooks/useConfirm";
import { relativeTime } from "@/lib/time";
import clsx from "clsx";
import type { Team, TeamMember, Project } from "@/types";

interface Props {
  team:            Team;
  initialProjects: Project[];
  currentUserId:   string;
  canManage:       boolean;
}

type Tab = "leden" | "projecten";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "leden",    label: "Leden",    icon: Users         },
  { id: "projecten", label: "Projecten", icon: FolderKanban },
];

export default function TeamDetailClient({
  team: initialTeam,
  initialProjects,
  currentUserId,
  canManage,
}: Props) {
  const router = useRouter();
  const { requestConfirm, confirmProps } = useConfirm();
  const { toast, showToast, clearToast }  = useToast();

  const [team,      setTeam]      = useState<Team>(initialTeam);
  const [projects]                = useState<Project[]>(initialProjects);
  const [activeTab, setActiveTab] = useState<Tab>("leden");
  const [editOpen,  setEditOpen]  = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  const [editName,        setEditName]        = useState(team.name);
  const [editDescription, setEditDescription] = useState(team.description ?? "");

  const members = (team.members ?? []) as TeamMember[];
  const canEdit = canManage || team.leader_id === currentUserId;

  async function handleSave() {
    if (!editName.trim()) { setError("Teamnaam is verplicht"); return; }
    setSaving(true); setError(null);
    const res  = await fetch(`/api/teams/${team.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName.trim(), description: editDescription }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) { setError(json.error ?? "Opslaan mislukt"); return; }
    setTeam(json);
    setEditOpen(false);
    showToast("Team bijgewerkt");
  }

  async function handleDelete() {
    if (!(await requestConfirm({
      title:        "Team verwijderen?",
      description:  "Dit kan niet ongedaan worden gemaakt.",
      confirmLabel: "Verwijderen",
      variant:      "danger",
    }))) return;
    const res = await fetch(`/api/teams/${team.id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/team");
    } else {
      const data = await res.json().catch(() => ({}));
      showToast(data.error ?? "Verwijderen mislukt", false);
    }
  }

  return (
    <div className="-mx-4 sm:-mx-6 -my-4 sm:-my-6 flex min-h-[calc(100dvh-56px)]">

      <Toast toast={toast} onClose={clearToast} />
      <ConfirmDialog {...confirmProps} />

      {/* ══ SIDEBAR ══════════════════════════════════════════ */}
      <aside className="hidden lg:flex flex-col w-[260px] flex-shrink-0 border-r border-slate-200 bg-white">

        <div className="px-5 pt-5 pb-4 border-b border-slate-200">
          <Link href="/team"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-brand-600
                       font-medium transition-colors mb-3">
            <ArrowLeft size={13} /> Terug naar team
          </Link>

          <div className="flex items-start gap-2.5 mb-4">
            <div className="w-9 h-9 rounded-xl bg-brand-50 border border-brand-100 flex items-center
                            justify-center flex-shrink-0 mt-0.5">
              <Users size={16} className="text-brand-600" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-bold text-slate-800 leading-tight break-words">{team.name}</h1>
              {team.description && (
                <p className="text-[11px] text-slate-400 mt-0.5 leading-tight">{team.description}</p>
              )}
            </div>
          </div>

          {/* Teamleider */}
          {team.leader && (
            <div className="flex items-center gap-2 mb-3 text-xs text-slate-500">
              <Crown size={11} className="text-amber-500 flex-shrink-0" />
              <span className="truncate">{(team.leader as { full_name: string }).full_name}</span>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100">
            {[
              { label: "Leden",     value: members.length,  color: "text-slate-800"  },
              { label: "Projecten", value: projects.length, color: "text-brand-700"  },
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className={clsx("text-lg font-bold", s.color)}>{s.value}</p>
                <p className="text-[10px] font-semibold text-slate-400">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tab nav */}
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
              </button>
            );
          })}
        </nav>

        {/* Acties */}
        {canEdit && (
          <div className="px-4 py-4 border-t border-slate-200 space-y-2">
            <button onClick={() => { setEditName(team.name); setEditDescription(team.description ?? ""); setError(null); setEditOpen(v => !v); }}
              className="btn-outline w-full justify-center">
              <Pencil size={14} /> {editOpen ? "Sluiten" : "Bewerken"}
            </button>
            {canManage && (
              <button onClick={handleDelete}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs
                           font-medium text-red-600 hover:bg-red-50 transition-colors border border-red-100">
                <Trash2 size={13} /> Team verwijderen
              </button>
            )}
          </div>
        )}

        <div className="px-5 py-3 border-t border-slate-100">
          <p className="text-[11px] text-slate-300">Bijgewerkt {relativeTime(team.updated_at ?? team.created_at)}</p>
        </div>
      </aside>

      {/* ══ INHOUD ═══════════════════════════════════════════ */}
      <div className="flex-1 min-w-0 overflow-y-auto bg-slate-50">

        {/* Mobiele header */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-200">
          <Link href="/team" className="text-slate-400 hover:text-brand-600 transition-colors">
            <ArrowLeft size={16} />
          </Link>
          <h1 className="font-bold text-slate-800 flex-1 truncate">{team.name}</h1>
          {canEdit && (
            <button onClick={() => setEditOpen(v => !v)} className="btn-outline text-xs px-3 py-1.5">
              <Pencil size={13} />
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
              </button>
            );
          })}
        </div>

        {/* Edit form */}
        {editOpen && (
          <div className="p-5 sm:p-6 max-w-2xl">
            <div className="card overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <h2 className="text-sm font-semibold text-slate-700">Team bewerken</h2>
                <button onClick={() => setEditOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                  <X size={14} />
                </button>
              </div>
              <div className="px-5 py-5 space-y-4">
                {error && (
                  <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                    <AlertCircle size={14} className="flex-shrink-0" /> {error}
                  </div>
                )}
                <div>
                  <label className="label">Teamnaam *</label>
                  <input value={editName} onChange={e => setEditName(e.target.value)}
                    className="input" placeholder="Teamnaam" disabled={saving} />
                </div>
                <div>
                  <label className="label">Beschrijving</label>
                  <textarea value={editDescription} onChange={e => setEditDescription(e.target.value)}
                    rows={3} className="input resize-none" placeholder="Beschrijving (optioneel)" disabled={saving} />
                </div>
                <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
                  <button onClick={handleSave} disabled={saving} className="btn-primary">
                    {saving ? <><Loader2 size={14} className="animate-spin" /> Opslaan…</> : <><Check size={14} /> Opslaan</>}
                  </button>
                  <button onClick={() => { setEditOpen(false); setError(null); }} className="btn-outline">
                    <X size={14} /> Annuleren
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Tab: Leden ─────────────────────────────────────── */}
        {activeTab === "leden" && (
          <div className="p-5 sm:p-6 max-w-2xl">
            <div className="card divide-y divide-slate-50 overflow-hidden">
              {members.length === 0 ? (
                <div className="p-10 text-center text-sm text-slate-400">Geen leden in dit team.</div>
              ) : members.map((m: TeamMember) => {
                const isLeader = m.user_id === team.leader_id;
                return (
                  <div key={m.user_id} className="flex items-center gap-3 px-5 py-3.5">
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
                      <span className={clsx(
                        "flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg border flex-shrink-0",
                        m.profile?.role === "admin"
                          ? "bg-brand-50 text-brand-700 border-brand-100"
                          : "bg-slate-100 text-slate-500 border-slate-200"
                      )}>
                        {m.profile?.role === "admin" ? <Shield size={10} /> : <User size={10} />}
                        {m.profile?.role === "admin" ? "Admin" : "Lid"}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Tab: Projecten ─────────────────────────────────── */}
        {activeTab === "projecten" && (
          <div className="p-5 sm:p-6 max-w-2xl">
            {projects.length === 0 ? (
              <div className="card p-12 text-center">
                <FolderKanban size={32} className="mx-auto mb-3 text-slate-300" />
                <p className="text-sm text-slate-500 font-medium">Geen projecten gekoppeld aan dit team.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {projects.map((p: Project) => (
                  <Link key={p.id} href={`/projects/${p.id}`}
                    className="card p-4 flex items-center gap-3 hover:border-brand-200 hover:bg-brand-50/30 transition-all group">
                    <FolderKanban size={15} className="text-slate-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-700 group-hover:text-brand-700 transition-colors truncate">
                        {p.name}
                      </p>
                      {p.customer && (
                        <p className="text-xs text-slate-400 truncate">
                          {(p.customer as { name: string }).name}
                        </p>
                      )}
                    </div>
                    <StatusBadge status={p.status} />
                    <ChevronRight size={14} className="text-slate-300 group-hover:text-brand-400 flex-shrink-0 transition-colors" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
