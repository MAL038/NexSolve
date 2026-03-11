"use client";

import React, { useState, useCallback, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft, Calendar, Building2, Users, GitBranch,
  Layers, ChevronRight, Pencil, Check, Loader2,
  AlertCircle, FileText, Activity, Download, X,
  LayoutGrid, UserCircle, Hash, FolderKanban, ClipboardList,
  Tag, ChevronDown,
} from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import Avatar from "@/components/ui/Avatar";
import MembersPanel from "@/components/ui/MembersPanel";
import SubprocessesPanel from "@/components/ui/SubprocessesPanel";
import PdfExportButton from "@/components/ui/PdfExportButton";
import Toast from "@/components/ui/Toast";
import { CustomerSelectWithCreate } from "@/components/customers/CustomerSelectWithCreate";
import { DossierList } from "@/components/dossiers/DossierList";
import { ActivityFeed } from "@/components/activity/ActivityFeed";
import IntakeTab from "@/components/projects/IntakeTab";
import { formatDate, relativeTime } from "@/lib/time";
import { useToast } from "@/lib/hooks/useToast";
import clsx from "clsx";
import type {
  Project, Subprocess, ThemeWithChildren,
  Customer, ProjectStatus, ProjectMember, Team,
} from "@/types";

// ─── Types ────────────────────────────────────────────────────

interface Props {
  project:         Project;
  subprocesses:    Subprocess[];
  hierarchy:       ThemeWithChildren[];
  customers:       Customer[];
  isOwnerOrMember: boolean;
  currentUserId:   string;
  themeLabel:      string | null;
  processLabel:    string | null;
  ptLabel:         string | null;
}

interface EditState {
  name:        string;
  description: string;
  status:      ProjectStatus;
  start_date:  string;
  end_date:    string;
  customer_id: string | null;
}

type Tab = "algemeen" | "taken" | "team" | "intake" | "dossier" | "activiteit" | "exporteren";

const STATUS_OPTIONS: { value: ProjectStatus; label: string; dot: string }[] = [
  { value: "active",      label: "Actief",        dot: "bg-brand-500" },
  { value: "in-progress", label: "In uitvoering", dot: "bg-amber-500" },
  { value: "archived",    label: "Gearchiveerd",  dot: "bg-slate-400" },
];

interface TabDef {
  id:    Tab;
  label: string;
  icon:  React.ElementType;
}

const TABS: TabDef[] = [
  { id: "algemeen",    label: "Algemeen",    icon: LayoutGrid    },
  { id: "taken",       label: "Taken",       icon: GitBranch     },
  { id: "team",        label: "Team",        icon: Users         },
  { id: "intake",      label: "Intake",      icon: ClipboardList },
  { id: "dossier",     label: "Dossier",     icon: FileText      },
  { id: "activiteit",  label: "Activiteit",  icon: Activity      },
  { id: "exporteren",  label: "Exporteren",  icon: Download      },
];

// ─── Helper: labelled data row ────────────────────────────────

function DataRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">{label}</p>
      <div className="text-sm text-slate-700 leading-snug">{children}</div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────

export default function ProjectDetailClient({
  project: initialProject,
  subprocesses,
  hierarchy,
  customers: initialCustomers,
  isOwnerOrMember,
  currentUserId,
  themeLabel,
  processLabel,
  ptLabel,
}: Props) {
  const [project,   setProject]   = useState(initialProject);
  const [customers, setCustomers] = useState(initialCustomers);
  const [activeTab, setActiveTab] = useState<Tab>("algemeen");
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [editOpen,  setEditOpen]  = useState(false);

  // Teams
  const [allTeams,      setAllTeams]      = useState<Team[]>([]);
  const [teamsLoaded,   setTeamsLoaded]   = useState(false);
  const [teamLinking,   setTeamLinking]   = useState(false);

  const { toast, showToast, clearToast } = useToast();

  const [edit, setEdit] = useState<EditState>({
    name:        initialProject.name,
    description: initialProject.description ?? "",
    status:      initialProject.status,
    start_date:  initialProject.start_date ?? "",
    end_date:    initialProject.end_date ?? "",
    customer_id: initialProject.customer_id,
  });

  // ── Derived (memoized) ────────────────────────────────────
  const { themeObj, processObj, ptObj, displayTheme, displayProcess, displayPt } = useMemo(() => {
    const themeObj   = hierarchy.find(t => t.id === project.theme_id);
    const processObj = themeObj?.processes?.find(p => p.id === project.process_id);
    const ptObj      = processObj?.process_types?.find(pt => pt.id === project.process_type_id);
    return {
      themeObj,
      processObj,
      ptObj,
      displayTheme:   themeObj?.name   ?? themeLabel,
      displayProcess: processObj?.name ?? processLabel,
      displayPt:      ptObj?.name      ?? ptLabel,
    };
  }, [hierarchy, project.theme_id, project.process_id, project.process_type_id, themeLabel, processLabel, ptLabel]);

  const { doneSubs, totalSubs, pct } = useMemo(() => {
    const doneSubs  = subprocesses.filter(s => s.status === "done").length;
    const totalSubs = subprocesses.length;
    return { doneSubs, totalSubs, pct: totalSubs > 0 ? Math.round((doneSubs / totalSubs) * 100) : 0 };
  }, [subprocesses]);

  const isOverdue = useMemo(
    () => !!project.end_date && new Date(project.end_date) < new Date(),
    [project.end_date]
  );

  const currentCustomer = useMemo(
    () => customers.find(c => c.id === project.customer_id) ?? project.customer ?? null,
    [customers, project.customer_id, project.customer]
  );

  const members = useMemo(
    () => (project.project_members ?? []) as ProjectMember[],
    [project.project_members]
  );

  // ── Handlers ──────────────────────────────────────────────
  function handleTabClick(tab: Tab) {
    if (tab === "algemeen") {
      setEdit({
        name:        project.name,
        description: project.description ?? "",
        status:      project.status,
        start_date:  project.start_date ?? "",
        end_date:    project.end_date ?? "",
        customer_id: project.customer_id,
      });
      setError(null);
    }
    setActiveTab(tab);
  }

  const handleSave = useCallback(async () => {
    if (!edit.name.trim()) { setError("Naam is verplicht"); return; }
    setSaving(true); setError(null);
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:        edit.name.trim(),
          description: edit.description.trim() || null,
          status:      edit.status,
          start_date:  edit.start_date || null,
          end_date:    edit.end_date   || null,
          customer_id: edit.customer_id,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Opslaan mislukt"); return; }
      setProject((prev: Project) => ({
        ...prev, ...data, customer: data.customer ?? prev.customer,
      }));
      setEditOpen(false);
      showToast("Project opgeslagen");
    } catch {
      setError("Er ging iets mis");
    } finally {
      setSaving(false);
    }
  }, [edit, project.id]);

  const handleCustomerCreated = useCallback((c: Customer) => {
    setCustomers((prev: Customer[]) => [...prev, c]);
    setEdit((prev: EditState) => ({ ...prev, customer_id: c.id }));
  }, []);

  // Load teams when Team tab is first opened
  useEffect(() => {
    if (activeTab === "team" && !teamsLoaded) {
      fetch("/api/teams").then(r => r.ok ? r.json() : []).then(data => {
        setAllTeams(Array.isArray(data) ? data : []);
        setTeamsLoaded(true);
      });
    }
  }, [activeTab, teamsLoaded]);

  async function linkTeam(teamId: string | null) {
    setTeamLinking(true);
    const res = await fetch(`/api/projects/${project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ team_id: teamId }),
    });
    if (res.ok) {
      const data = await res.json();
      setProject((prev: Project) => ({ ...prev, team_id: data.team_id, team: data.team ?? null }));
      showToast(teamId ? "Team gekoppeld" : "Team ontkoppeld");
    } else {
      showToast("Koppelen mislukt", false);
    }
    setTeamLinking(false);
  }

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="-mx-4 sm:-mx-6 -my-4 sm:-my-6 flex min-h-[calc(100dvh-56px)]">

      <Toast toast={toast} onClose={clearToast} />

      {/* ════════ SIDEBAR ════════ */}
      <aside className="hidden lg:flex flex-col w-[260px] flex-shrink-0 border-r border-slate-200 bg-white">

        <div className="px-5 pt-5 pb-4 border-b border-slate-100">
          <Link href="/projects"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-brand-600 font-medium transition-colors mb-3">
            <ArrowLeft size={13} /> Terug naar projecten
          </Link>

          <div className="flex items-start gap-2.5 mb-3">
            <div className="w-9 h-9 rounded-xl bg-brand-50 border border-brand-100 flex items-center
                            justify-center flex-shrink-0 mt-0.5">
              <FolderKanban size={16} className="text-brand-600" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-bold text-slate-800 leading-tight break-words">{project.name}</h1>
              {project.code && (
                <span className="text-[10px] font-mono text-slate-400 flex items-center gap-0.5 mt-0.5">
                  <Hash size={8} />{project.code}
                </span>
              )}
            </div>
          </div>

          <div className="mb-3">
            <StatusBadge status={project.status} />
          </div>

          {/* Voortgangsbalk */}
          {totalSubs > 0 && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>{doneSubs}/{totalSubs} taken</span>
                <span className="font-bold text-slate-600">{pct}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={clsx(
                    "h-full rounded-full transition-all duration-500",
                    pct === 100 ? "bg-emerald-500" : pct >= 50 ? "bg-brand-500" : "bg-amber-400"
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )}

          {/* Gekoppelde klant */}
          {currentCustomer && (
            <div className="mt-4 pt-3 border-t border-slate-100">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Klant</p>
              <Link
                href={`/customers/${currentCustomer.id}`}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-slate-200
                           bg-white hover:border-brand-300 hover:bg-brand-50/40 transition-all group"
              >
                <div className="w-7 h-7 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0">
                  <Building2 size={13} className="text-brand-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-700 group-hover:text-brand-700
                                 transition-colors truncate">
                    {currentCustomer.name}
                  </p>
                  {currentCustomer.code && (
                    <p className="text-[10px] font-mono text-slate-400">
                      #{currentCustomer.code}
                    </p>
                  )}
                </div>
                <ChevronRight size={13} className="text-slate-300 group-hover:text-brand-400 flex-shrink-0 transition-colors" />
              </Link>
            </div>
          )}
        </div>

        {/* Verticale tab-navigatie */}
        <nav className="flex flex-col gap-0.5 px-2 py-3">
          {TABS.map(tab => {
            const Icon   = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={clsx(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left",
                  active
                    ? "bg-brand-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-800"
                )}
              >
                <Icon size={15} className={active ? "opacity-75" : "text-slate-400"} />
                {tab.label}
                {tab.id === "taken" && totalSubs > 0 && (
                  <span className={clsx(
                    "ml-auto text-[11px] font-semibold px-1.5 py-0.5 rounded-full",
                    active ? "bg-white/25 text-white" : "bg-slate-100 text-slate-500"
                  )}>
                    {doneSubs}/{totalSubs}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Metadata onderaan */}
        <div className="mt-auto px-5 py-5 border-t border-slate-100 space-y-3 text-xs">
          {project.owner && (
            <div className="flex items-center gap-2 text-slate-500">
              <Avatar name={project.owner.full_name} url={project.owner.avatar_url} size="xs" />
              <span className="truncate">{project.owner.full_name}</span>
            </div>
          )}
          {project.end_date && (
            <div className={clsx("flex items-center gap-2", isOverdue ? "text-red-500" : "text-slate-500")}>
              <Calendar size={12} className="flex-shrink-0" />
              <span className={isOverdue ? "font-semibold" : ""}>
                {formatDate(project.end_date)}
                {isOverdue && " · verlopen"}
              </span>
            </div>
          )}
          <p className="text-slate-300">Bijgewerkt {relativeTime(project.updated_at)}</p>
        </div>
      </aside>

      {/* ════════ HOOFDINHOUD ════════ */}
      <div className="flex-1 min-w-0 overflow-y-auto bg-slate-50">

        {/* Mobiele header */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-100">
          <Link href="/projects" className="text-slate-400 hover:text-brand-600 transition-colors">
            <ArrowLeft size={16} />
          </Link>
          <h1 className="font-bold text-slate-800 flex-1 truncate">{project.name}</h1>
          <StatusBadge status={project.status} />
        </div>

        {/* Mobiele tabs */}
        <div className="lg:hidden flex gap-1 px-4 py-2 bg-white border-b border-slate-100 overflow-x-auto">
          {TABS.map(tab => {
            const Icon   = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => handleTabClick(tab.id)}
                className={clsx(
                  "flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                  active ? "bg-brand-50 text-brand-700" : "text-slate-500 hover:bg-slate-50"
                )}>
                <Icon size={12} /> {tab.label}
              </button>
            );
          })}
        </div>

        {/* ── Tab: Algemeen ──────────────────────────────── */}
        {activeTab === "algemeen" && (
          <div className="p-5 sm:p-6 max-w-2xl space-y-5">

            {/* ── PROJECTOVERZICHT (altijd zichtbaar) ── */}
            <div className="card overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <h2 className="text-sm font-semibold text-slate-700">Projectoverzicht</h2>
                {isOwnerOrMember && (
                  <button
                    onClick={() => setEditOpen(v => !v)}
                    className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-brand-600
                               px-2.5 py-1.5 rounded-lg hover:bg-brand-50 transition-colors font-medium"
                  >
                    <Pencil size={12} />
                    {editOpen ? "Sluiten" : "Bewerken"}
                  </button>
                )}
              </div>

              <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                <DataRow label="Naam">
                  <span className="font-medium">{project.name}</span>
                </DataRow>

                <DataRow label="Status">
                  <StatusBadge status={project.status} />
                </DataRow>

                {project.owner && (
                  <DataRow label="Eigenaar">
                    <div className="flex items-center gap-2">
                      <Avatar name={project.owner.full_name} url={project.owner.avatar_url} size="xs" />
                      <span>{project.owner.full_name}</span>
                    </div>
                  </DataRow>
                )}

                {project.start_date && (
                  <DataRow label="Startdatum">
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <Calendar size={13} className="text-slate-400" />
                      {formatDate(project.start_date)}
                    </div>
                  </DataRow>
                )}

                {project.end_date && (
                  <DataRow label="Einddatum">
                    <div className={clsx(
                      "flex items-center gap-1.5",
                      isOverdue ? "text-red-600 font-semibold" : "text-slate-600"
                    )}>
                      <Calendar size={13} className={isOverdue ? "text-red-400" : "text-slate-400"} />
                      {formatDate(project.end_date)}
                      {isOverdue && (
                        <span className="text-xs bg-red-50 text-red-600 px-1.5 py-0.5 rounded-md">
                          verlopen
                        </span>
                      )}
                    </div>
                  </DataRow>
                )}

                {displayTheme && (
                  <DataRow label="Thema">
                    <div className="flex items-center gap-1.5">
                      <Tag size={13} className="text-slate-400" />
                      {displayTheme}
                      {displayProcess && <><span className="text-slate-400">›</span><span className="text-slate-600">{displayProcess}</span></>}
                      {displayPt      && <><span className="text-slate-400">›</span><span className="text-slate-500">{displayPt}</span></>}
                    </div>
                  </DataRow>
                )}

                {members.length > 0 && (
                  <DataRow label={`Team (${members.length})`}>
                    <div className="flex items-center gap-1 flex-wrap">
                      {members.slice(0, 5).map(m => (
                        <div key={m.user_id} title={m.profile?.full_name ?? "Onbekend"}>
                          <Avatar name={m.profile?.full_name} url={m.profile?.avatar_url} size="xs" />
                        </div>
                      ))}
                      {members.length > 5 && (
                        <span className="text-xs text-slate-400 ml-1">+{members.length - 5}</span>
                      )}
                    </div>
                  </DataRow>
                )}

                {totalSubs > 0 && (
                  <DataRow label="Voortgang taken">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>{doneSubs} van {totalSubs} afgerond</span>
                        <span className="font-bold text-slate-700">{pct}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={clsx(
                            "h-full rounded-full transition-all duration-500",
                            pct === 100 ? "bg-emerald-500" : pct >= 50 ? "bg-brand-500" : "bg-amber-400"
                          )}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </DataRow>
                )}

                {project.description && (
                  <div className="sm:col-span-2">
                    <DataRow label="Beschrijving">
                      <p className="text-slate-600 whitespace-pre-wrap leading-relaxed">
                        {project.description}
                      </p>
                    </DataRow>
                  </div>
                )}
              </div>
            </div>

            {/* ── BEWERKFORMULIER (inklapbaar) ── */}
            {isOwnerOrMember && (
              <div className={clsx("card overflow-hidden transition-all", !editOpen && "hidden")}>
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                  <h2 className="text-sm font-semibold text-slate-700">Gegevens bewerken</h2>
                  <button
                    onClick={() => setEditOpen(false)}
                    className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="px-5 py-5 space-y-5">
                  {error && (
                    <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200
                                    rounded-xl text-sm text-red-700">
                      <AlertCircle size={14} className="flex-shrink-0" /> {error}
                    </div>
                  )}

                  {/* Naam */}
                  <div>
                    <label className="label">Naam *</label>
                    <input
                      disabled={saving}
                      value={edit.name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setEdit((p: EditState) => ({ ...p, name: e.target.value }))
                      }
                      className="input disabled:opacity-60 disabled:cursor-not-allowed"
                      placeholder="Projectnaam"
                    />
                  </div>

                  {/* Status */}
                  <div>
                    <label className="label">Status</label>
                    <div className="flex gap-2 flex-wrap mt-1">
                      {STATUS_OPTIONS.map(s => (
                        <button key={s.value} type="button"
                          disabled={saving}
                          onClick={() => setEdit((p: EditState) => ({ ...p, status: s.value }))}
                          className={clsx(
                            "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all disabled:opacity-60",
                            edit.status === s.value
                              ? "ring-2 ring-brand-400 ring-offset-1 border-transparent " + (
                                  s.value === "active"      ? "bg-brand-50 text-brand-700" :
                                  s.value === "in-progress" ? "bg-amber-50 text-amber-700" :
                                  "bg-slate-100 text-slate-600"
                                )
                              : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                          )}>
                          <span className={clsx("w-2 h-2 rounded-full flex-shrink-0", s.dot)} />
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Beschrijving */}
                  <div>
                    <label className="label">Beschrijving</label>
                    <textarea
                      disabled={saving}
                      value={edit.description}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                        setEdit((p: EditState) => ({ ...p, description: e.target.value }))
                      }
                      placeholder="Beschrijving (optioneel)"
                      rows={4}
                      className="input resize-none disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                  </div>

                  {/* Klant */}
                  <div>
                    <label className="label">Klant</label>
                    <CustomerSelectWithCreate
                      value={edit.customer_id}
                      onChange={(id: string | null) => setEdit((p: EditState) => ({ ...p, customer_id: id }))}
                      customers={customers}
                      onCustomerCreated={handleCustomerCreated}
                    />
                  </div>

                  {/* Datums */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Startdatum</label>
                      <input type="date"
                        disabled={saving}
                        value={edit.start_date}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setEdit((p: EditState) => ({ ...p, start_date: e.target.value }))
                        }
                        className="input disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="label">Einddatum</label>
                      <input type="date"
                        disabled={saving}
                        value={edit.end_date}
                        min={edit.start_date || undefined}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setEdit((p: EditState) => ({ ...p, end_date: e.target.value }))
                        }
                        className="input disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>

                  {/* Opslaan */}
                  <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
                    <button onClick={handleSave} disabled={saving} className="btn-primary">
                      {saving
                        ? <><Loader2 size={14} className="animate-spin" /> Opslaan…</>
                        : <><Check size={14} /> Opslaan</>
                      }
                    </button>
                    <button
                      disabled={saving}
                      onClick={() => {
                        setEdit({
                          name: project.name, description: project.description ?? "",
                          status: project.status, start_date: project.start_date ?? "",
                          end_date: project.end_date ?? "", customer_id: project.customer_id,
                        });
                        setError(null);
                        setEditOpen(false);
                      }}
                      className="btn-outline"
                    >
                      <X size={14} /> Annuleren
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Taken ───────────────────────────────── */}
        {activeTab === "taken" && (
          <div className="p-6">
            <SubprocessesPanel
              projectId={project.id}
              initialSubprocesses={subprocesses}
              isOwnerOrMember={isOwnerOrMember}
            />
          </div>
        )}

        {/* ── Tab: Team ────────────────────────────────── */}
        {activeTab === "team" && (
          <div className="p-6 max-w-2xl space-y-5">
            {/* Gekoppeld team */}
            <div className="card overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <h2 className="text-sm font-semibold text-slate-700">Gekoppeld team</h2>
              </div>
              <div className="px-5 py-4">
                {project.team ? (
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0">
                      <Users size={16} className="text-brand-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link href={`/team/${project.team.id}`}
                        className="text-sm font-semibold text-slate-800 hover:text-brand-700 transition-colors">
                        {project.team.name}
                      </Link>
                    </div>
                    {isOwnerOrMember && (
                      <button
                        onClick={() => linkTeam(null)}
                        disabled={teamLinking}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Team ontkoppelen"
                      >
                        {teamLinking ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">Geen team gekoppeld.</p>
                )}

                {isOwnerOrMember && (
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <label className="label">Team koppelen</label>
                    {!teamsLoaded ? (
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Loader2 size={12} className="animate-spin" /> Laden…
                      </div>
                    ) : (
                      <select
                        className="input bg-white"
                        value={project.team_id ?? ""}
                        onChange={e => linkTeam(e.target.value || null)}
                        disabled={teamLinking}
                      >
                        <option value="">— Geen team —</option>
                        {allTeams.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Teamleden */}
            <MembersPanel
              projectId={project.id}
              ownerId={project.owner_id}
              currentUserId={currentUserId}
              owner={project.owner}
              initialMembers={members}
            />
          </div>
        )}

        {/* ── Tab: Intake ──────────────────────────────── */}
        {activeTab === "intake" && (
          <div className="p-6 max-w-2xl">
            <IntakeTab
              projectId={project.id}
              projectName={project.name}
              themeId={project.theme_id}
            />
          </div>
        )}

        {/* ── Tab: Dossier ─────────────────────────────── */}
        {activeTab === "dossier" && (
          <div className="p-6">
            <DossierList projectId={project.id} />
          </div>
        )}

        {/* ── Tab: Activiteit ──────────────────────────── */}
        {activeTab === "activiteit" && (
          <div className="p-6 max-w-2xl">
            <ActivityFeed projectId={project.id} title="" />
          </div>
        )}

        {/* ── Tab: Exporteren ──────────────────────────── */}
        {activeTab === "exporteren" && (
          <div className="p-6 max-w-sm space-y-4">
            <div>
              <h3 className="font-semibold text-slate-700 mb-1">PDF exporteren</h3>
              <p className="text-sm text-slate-400 mb-4">
                Exporteer dit project inclusief deeltaken, teamleden en beschrijving.
              </p>
            </div>
            <PdfExportButton scope={`project:${project.id}`} label="Download PDF" />
          </div>
        )}
      </div>
    </div>
  );
}
