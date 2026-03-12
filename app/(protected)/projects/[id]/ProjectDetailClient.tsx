"use client";

import React, { useState, useCallback, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Calendar, Building2, Users, GitBranch,
  Pencil, Check, Loader2, AlertCircle, FileText, Activity, X,
  LayoutGrid, Hash, FolderKanban, Tag, Settings, Flag,
  Trash2, Archive, ChevronRight, Clock,
} from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import Avatar from "@/components/ui/Avatar";
import MembersPanel from "@/components/ui/MembersPanel";
import SubprocessesPanel from "@/components/ui/SubprocessesPanel";
import PdfExportButton from "@/components/ui/PdfExportButton";
import Toast from "@/components/ui/Toast";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import PermissionGate from "@/components/ui/PermissionGate";
import { CustomerSelectWithCreate } from "@/components/customers/CustomerSelectWithCreate";
import { DossierList } from "@/components/dossiers/DossierList";
import { ActivityFeed } from "@/components/activity/ActivityFeed";
import { formatDate, relativeTime } from "@/lib/time";
import { useToast } from "@/lib/hooks/useToast";
import { useConfirm } from "@/lib/hooks/useConfirm";
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

type Tab = "overzicht" | "planning" | "taken" | "documenten" | "activiteiten" | "team" | "instellingen";

const STATUS_OPTIONS: { value: ProjectStatus; label: string; dot: string }[] = [
  { value: "active",      label: "Actief",        dot: "bg-brand-500" },
  { value: "in-progress", label: "In uitvoering", dot: "bg-amber-500" },
  { value: "archived",    label: "Gearchiveerd",  dot: "bg-slate-400" },
];

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "overzicht",    label: "Overzicht",    icon: LayoutGrid  },
  { id: "planning",     label: "Planning",     icon: Calendar    },
  { id: "taken",        label: "Taken",        icon: GitBranch   },
  { id: "documenten",   label: "Documenten",   icon: FileText    },
  { id: "activiteiten", label: "Activiteiten", icon: Activity    },
  { id: "team",         label: "Team",         icon: Users       },
  { id: "instellingen", label: "Instellingen", icon: Settings    },
];

function DataRow({ label, children, fullWidth }: { label: string; children: React.ReactNode; fullWidth?: boolean }) {
  return (
    <div className={fullWidth ? "sm:col-span-2" : undefined}>
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
  const router   = useRouter();
  const [project,   setProject]   = useState(initialProject);
  const [customers, setCustomers] = useState(initialCustomers);
  const [activeTab, setActiveTab] = useState<Tab>("overzicht");
  const [saving,    setSaving]    = useState(false);
  const [deleting,  setDeleting]  = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  const [allTeams,    setAllTeams]    = useState<Team[]>([]);
  const [teamsLoaded, setTeamsLoaded] = useState(false);
  const [teamLinking, setTeamLinking] = useState(false);

  const { toast, showToast, clearToast } = useToast();
  const { requestConfirm, confirmProps } = useConfirm();

  const [edit, setEdit] = useState<EditState>({
    name:        initialProject.name,
    description: initialProject.description ?? "",
    status:      initialProject.status,
    start_date:  initialProject.start_date ?? "",
    end_date:    initialProject.end_date ?? "",
    customer_id: initialProject.customer_id,
  });

  // ── Derived ─────────────────────────────────────────────────
  const { displayTheme, displayProcess, displayPt } = useMemo(() => {
    const themeObj   = hierarchy.find(t => t.id === project.theme_id);
    const processObj = themeObj?.processes?.find(p => p.id === project.process_id);
    const ptObj      = processObj?.process_types?.find(pt => pt.id === project.process_type_id);
    return {
      displayTheme:   themeObj?.name   ?? themeLabel,
      displayProcess: processObj?.name ?? processLabel,
      displayPt:      ptObj?.name      ?? ptLabel,
    };
  }, [hierarchy, project.theme_id, project.process_id, project.process_type_id, themeLabel, processLabel, ptLabel]);

  const { doneSubs, totalSubs, pct } = useMemo(() => {
    const done  = subprocesses.filter(s => s.status === "done").length;
    const total = subprocesses.length;
    return { doneSubs: done, totalSubs: total, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
  }, [subprocesses]);

  const openTasks = useMemo(
    () => subprocesses.filter(s => s.status !== "done").slice(0, 5),
    [subprocesses]
  );

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

  const planningProgress = useMemo(() => {
    if (!project.start_date || !project.end_date) return null;
    const start  = new Date(project.start_date).getTime();
    const end    = new Date(project.end_date).getTime();
    const now    = Date.now();
    const total  = end - start;
    if (total <= 0) return null;
    const elapsed  = Math.max(0, now - start);
    const pctTime  = Math.min(100, Math.round((elapsed / total) * 100));
    const daysLeft = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    return { pctTime, daysLeft, overdue: daysLeft < 0 };
  }, [project.start_date, project.end_date]);

  // ── Handlers ────────────────────────────────────────────────
  function resetEdit() {
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

  function handleTabClick(tab: Tab) {
    if (tab === "instellingen") resetEdit();
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
      setProject((prev: Project) => ({ ...prev, ...data, customer: data.customer ?? prev.customer }));
      showToast("Project opgeslagen");
    } catch {
      setError("Er ging iets mis");
    } finally {
      setSaving(false);
    }
  }, [edit, project.id, showToast]);

  const handleCustomerCreated = useCallback((c: Customer) => {
    setCustomers((prev: Customer[]) => [...prev, c]);
    setEdit((prev: EditState) => ({ ...prev, customer_id: c.id }));
  }, []);

  async function handleDelete() {
    if (!(await requestConfirm({
      title:        "Project verwijderen?",
      description:  "Dit verwijdert het project en alle gekoppelde gegevens permanent.",
      confirmLabel: "Definitief verwijderen",
      variant:      "danger",
    }))) return;
    setDeleting(true);
    const res = await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/projects");
    } else {
      const data = await res.json().catch(() => ({}));
      showToast(data.error ?? "Verwijderen mislukt", false);
      setDeleting(false);
    }
  }

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

  // ── Render ──────────────────────────────────────────────────
  return (
    <div className="-mx-4 sm:-mx-6 -my-4 sm:-my-6 flex min-h-[calc(100dvh-56px)]">
      <Toast toast={toast} onClose={clearToast} />
      <ConfirmDialog {...confirmProps} />

      {/* ═══════ SIDEBAR ═══════ */}
      <aside className="hidden lg:flex flex-col w-[260px] flex-shrink-0 border-r border-slate-200 bg-white">
        <div className="px-5 pt-5 pb-4 border-b border-slate-100">
          <Link href="/projects"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-brand-600 font-medium transition-colors mb-3">
            <ArrowLeft size={13} /> Terug naar projecten
          </Link>
          <div className="flex items-start gap-2.5 mb-3">
            <div className="w-9 h-9 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center flex-shrink-0 mt-0.5">
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
          <div className="mb-3"><StatusBadge status={project.status} /></div>
          {totalSubs > 0 && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>{doneSubs}/{totalSubs} taken</span>
                <span className="font-bold text-slate-600">{pct}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className={clsx("h-full rounded-full transition-all duration-500",
                  pct === 100 ? "bg-emerald-500" : pct >= 50 ? "bg-brand-500" : "bg-amber-400"
                )} style={{ width: `${pct}%` }} />
              </div>
            </div>
          )}
        </div>

        <nav className="flex flex-col gap-0.5 px-2 py-3 flex-1">
          {TABS.map(tab => {
            const Icon   = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => handleTabClick(tab.id)}
                className={clsx(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left",
                  active ? "bg-brand-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100 hover:text-slate-800"
                )}>
                <Icon size={15} className={active ? "opacity-75" : "text-slate-400"} />
                {tab.label}
                {tab.id === "taken" && totalSubs > 0 && (
                  <span className={clsx("ml-auto text-[11px] font-semibold px-1.5 py-0.5 rounded-full",
                    active ? "bg-white/25 text-white" : "bg-slate-100 text-slate-500"
                  )}>{doneSubs}/{totalSubs}</span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="px-5 py-4 border-t border-slate-100 space-y-2.5 text-xs">
          {project.owner && (
            <div className="flex items-center gap-2 text-slate-500">
              <Avatar name={project.owner.full_name} url={project.owner.avatar_url} size="xs" />
              <span className="truncate">{project.owner.full_name}</span>
            </div>
          )}
          {project.end_date && (
            <div className={clsx("flex items-center gap-2", isOverdue ? "text-red-500" : "text-slate-500")}>
              <Calendar size={12} className="flex-shrink-0" />
              <span className={isOverdue ? "font-semibold" : ""}>{formatDate(project.end_date)}{isOverdue && " · verlopen"}</span>
            </div>
          )}
          <p className="text-slate-300">Bijgewerkt {relativeTime(project.updated_at)}</p>
        </div>
      </aside>

      {/* ═══════ CONTENT ═══════ */}
      <div className="flex-1 min-w-0 overflow-y-auto bg-slate-50">

        {/* Mobile header */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-100">
          <Link href="/projects" className="text-slate-400 hover:text-brand-600 transition-colors">
            <ArrowLeft size={16} />
          </Link>
          <h1 className="font-bold text-slate-800 flex-1 truncate">{project.name}</h1>
          <StatusBadge status={project.status} />
        </div>
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

        {/* ─── OVERZICHT ─── */}
        {activeTab === "overzicht" && (
          <div className="p-5 sm:p-6 max-w-2xl space-y-4">
            <div className="card overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <h2 className="text-sm font-semibold text-slate-700">Projectoverzicht</h2>
                {isOwnerOrMember && (
                  <button onClick={() => handleTabClick("instellingen")}
                    className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-brand-600 px-2.5 py-1.5 rounded-lg hover:bg-brand-50 transition-colors font-medium">
                    <Pencil size={12} /> Bewerken
                  </button>
                )}
              </div>
              <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                <DataRow label="Status"><StatusBadge status={project.status} /></DataRow>

                {currentCustomer && (
                  <DataRow label="Klant">
                    <Link href={`/customers/${currentCustomer.id}`}
                      className="inline-flex items-center gap-1.5 text-brand-600 hover:text-brand-700 font-medium transition-colors">
                      <Building2 size={13} /> {currentCustomer.name}
                    </Link>
                  </DataRow>
                )}

                {project.owner && (
                  <DataRow label="Eigenaar">
                    <div className="flex items-center gap-2">
                      <Avatar name={project.owner.full_name} url={project.owner.avatar_url} size="xs" />
                      <span>{project.owner.full_name}</span>
                    </div>
                  </DataRow>
                )}

                {members.length > 0 && (
                  <DataRow label={`Team (${members.length})`}>
                    <div className="flex items-center gap-1 flex-wrap">
                      {members.slice(0, 6).map(m => (
                        <div key={m.user_id} title={m.profile?.full_name ?? ""}>
                          <Avatar name={m.profile?.full_name} url={m.profile?.avatar_url} size="xs" />
                        </div>
                      ))}
                      {members.length > 6 && <span className="text-xs text-slate-400 ml-1">+{members.length - 6}</span>}
                    </div>
                  </DataRow>
                )}

                {project.start_date && (
                  <DataRow label="Startdatum">
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <Calendar size={13} className="text-slate-400" /> {formatDate(project.start_date)}
                    </div>
                  </DataRow>
                )}

                {project.end_date && (
                  <DataRow label="Einddatum">
                    <div className={clsx("flex items-center gap-1.5", isOverdue ? "text-red-600 font-semibold" : "text-slate-600")}>
                      <Calendar size={13} className={isOverdue ? "text-red-400" : "text-slate-400"} />
                      {formatDate(project.end_date)}
                      {isOverdue && <span className="text-xs bg-red-50 text-red-600 px-1.5 py-0.5 rounded-md">verlopen</span>}
                    </div>
                  </DataRow>
                )}

                {displayTheme && (
                  <DataRow label="Thema / Proces">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Tag size={13} className="text-slate-400" />
                      <span>{displayTheme}</span>
                      {displayProcess && <><ChevronRight size={11} className="text-slate-300" /><span className="text-slate-600">{displayProcess}</span></>}
                      {displayPt      && <><ChevronRight size={11} className="text-slate-300" /><span className="text-slate-500">{displayPt}</span></>}
                    </div>
                  </DataRow>
                )}

                {project.description && (
                  <DataRow label="Beschrijving" fullWidth>
                    <p className="text-slate-600 whitespace-pre-wrap leading-relaxed">{project.description}</p>
                  </DataRow>
                )}
              </div>
            </div>

            {/* Progress */}
            {totalSubs > 0 && (
              <div className="card p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-700">Voortgang taken</h3>
                  <span className="text-sm font-bold text-slate-800">{pct}%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className={clsx("h-full rounded-full transition-all duration-500",
                    pct === 100 ? "bg-emerald-500" : pct >= 50 ? "bg-brand-500" : "bg-amber-400"
                  )} style={{ width: `${pct}%` }} />
                </div>
                <p className="text-xs text-slate-400">{doneSubs} van {totalSubs} taken afgerond</p>
              </div>
            )}

            {/* Open taken preview */}
            {openTasks.length > 0 && (
              <div className="card overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
                  <h3 className="text-sm font-semibold text-slate-700">Openstaande taken</h3>
                  <button onClick={() => handleTabClick("taken")}
                    className="text-xs text-brand-600 hover:underline font-medium">Alle taken →</button>
                </div>
                <div className="divide-y divide-slate-50">
                  {openTasks.map(task => (
                    <div key={task.id} className="flex items-center gap-3 px-5 py-3">
                      <div className={clsx("w-2 h-2 rounded-full flex-shrink-0",
                        task.status === "in-progress" ? "bg-amber-400" :
                        task.status === "blocked"     ? "bg-red-400"   : "bg-slate-300"
                      )} />
                      <span className="text-sm text-slate-700 truncate flex-1">{task.title}</span>
                      <span className={clsx("text-[11px] px-2 py-0.5 rounded-lg border font-medium flex-shrink-0",
                        task.status === "in-progress" ? "bg-amber-50 text-amber-700 border-amber-200" :
                        task.status === "blocked"     ? "bg-red-50 text-red-600 border-red-200"       :
                        "bg-slate-100 text-slate-500 border-slate-200"
                      )}>
                        {task.status === "in-progress" ? "Bezig" : task.status === "blocked" ? "Geblokkeerd" : "Open"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── PLANNING ─── */}
        {activeTab === "planning" && (
          <div className="p-5 sm:p-6 max-w-2xl space-y-4">
            {project.start_date || project.end_date ? (
              <div className="card p-5 space-y-4">
                <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Calendar size={14} className="text-brand-500" /> Tijdlijn
                </h2>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-medium">{project.start_date ? formatDate(project.start_date) : "—"}</span>
                  <span className="font-medium">{project.end_date ? formatDate(project.end_date) : "—"}</span>
                </div>
                {planningProgress ? (
                  <>
                    <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div className={clsx("h-full rounded-full transition-all duration-500",
                        planningProgress.overdue ? "bg-red-400" : planningProgress.pctTime >= 80 ? "bg-amber-400" : "bg-brand-500"
                      )} style={{ width: `${planningProgress.pctTime}%` }} />
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">{planningProgress.pctTime}% verstreken</span>
                      {planningProgress.overdue ? (
                        <span className="text-red-600 font-semibold flex items-center gap-1">
                          <AlertCircle size={12} /> {Math.abs(planningProgress.daysLeft)} dagen verlopen
                        </span>
                      ) : (
                        <span className="text-slate-500 flex items-center gap-1">
                          <Clock size={12} /> {planningProgress.daysLeft} dagen resterend
                        </span>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-slate-400">Stel zowel start- als einddatum in voor een tijdlijn.</p>
                )}
              </div>
            ) : (
              <div className="card p-12 text-center">
                <Calendar size={36} className="mx-auto mb-3 text-slate-200" />
                <p className="text-sm font-medium text-slate-500 mb-1">Geen planning ingesteld</p>
                <p className="text-xs text-slate-400 mb-4">Voeg een start- en einddatum toe om de tijdlijn te zien.</p>
                {isOwnerOrMember && (
                  <button onClick={() => handleTabClick("instellingen")} className="btn-outline text-xs">
                    <Pencil size={12} /> Planning instellen
                  </button>
                )}
              </div>
            )}

            <div className="card overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Flag size={14} className="text-slate-400" /> Mijlpalen
                </h2>
              </div>
              <div className="p-10 text-center">
                <Flag size={28} className="mx-auto mb-2 text-slate-200" />
                <p className="text-sm text-slate-400 font-medium">Nog geen mijlpalen</p>
                <p className="text-xs text-slate-300 mt-1">Mijlpalen worden binnenkort ondersteund.</p>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAKEN ─── */}
        {activeTab === "taken" && (
          <div className="p-6">
            <SubprocessesPanel projectId={project.id} initialSubprocesses={subprocesses} isOwnerOrMember={isOwnerOrMember} />
          </div>
        )}

        {/* ─── DOCUMENTEN ─── */}
        {activeTab === "documenten" && (
          <div className="p-6">
            <DossierList projectId={project.id} />
          </div>
        )}

        {/* ─── ACTIVITEITEN ─── */}
        {activeTab === "activiteiten" && (
          <div className="p-6 max-w-2xl">
            <ActivityFeed projectId={project.id} title="" />
          </div>
        )}

        {/* ─── TEAM ─── */}
        {activeTab === "team" && (
          <div className="p-6 max-w-2xl space-y-5">
            <div className="card overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
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
                      <button onClick={() => linkTeam(null)} disabled={teamLinking}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Team ontkoppelen">
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
                      <select className="input bg-white" value={project.team_id ?? ""}
                        onChange={e => linkTeam(e.target.value || null)} disabled={teamLinking}>
                        <option value="">— Geen team —</option>
                        {allTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    )}
                  </div>
                )}
              </div>
            </div>
            <MembersPanel
              projectId={project.id} ownerId={project.owner_id}
              currentUserId={currentUserId} owner={project.owner} initialMembers={members}
            />
          </div>
        )}

        {/* ─── INSTELLINGEN ─── */}
        {activeTab === "instellingen" && (
          <div className="p-5 sm:p-6 max-w-2xl space-y-5">

            <div className="card overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h2 className="text-sm font-semibold text-slate-700">Projectgegevens</h2>
              </div>
              <div className="px-5 py-5 space-y-5">
                {error && (
                  <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                    <AlertCircle size={14} className="flex-shrink-0" /> {error}
                  </div>
                )}
                <div>
                  <label className="label">Naam *</label>
                  <input disabled={saving} value={edit.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEdit(p => ({ ...p, name: e.target.value }))}
                    className="input disabled:opacity-60" placeholder="Projectnaam" />
                </div>
                <div>
                  <label className="label">Status</label>
                  <div className="flex gap-2 flex-wrap mt-1">
                    {STATUS_OPTIONS.map(s => (
                      <button key={s.value} type="button" disabled={saving}
                        onClick={() => setEdit(p => ({ ...p, status: s.value }))}
                        className={clsx(
                          "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all disabled:opacity-60",
                          edit.status === s.value
                            ? "ring-2 ring-brand-400 ring-offset-1 border-transparent " + (
                                s.value === "active" ? "bg-brand-50 text-brand-700" :
                                s.value === "in-progress" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"
                              )
                            : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                        )}>
                        <span className={clsx("w-2 h-2 rounded-full flex-shrink-0", s.dot)} />{s.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="label">Beschrijving</label>
                  <textarea disabled={saving} value={edit.description}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEdit(p => ({ ...p, description: e.target.value }))}
                    placeholder="Beschrijving (optioneel)" rows={4} className="input resize-none disabled:opacity-60" />
                </div>
                <div>
                  <label className="label">Klant</label>
                  <CustomerSelectWithCreate
                    value={edit.customer_id}
                    onChange={(id: string | null) => setEdit(p => ({ ...p, customer_id: id }))}
                    customers={customers} onCustomerCreated={handleCustomerCreated}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Startdatum</label>
                    <input type="date" disabled={saving} value={edit.start_date}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEdit(p => ({ ...p, start_date: e.target.value }))}
                      className="input disabled:opacity-60" />
                  </div>
                  <div>
                    <label className="label">Einddatum</label>
                    <input type="date" disabled={saving} value={edit.end_date} min={edit.start_date || undefined}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEdit(p => ({ ...p, end_date: e.target.value }))}
                      className="input disabled:opacity-60" />
                  </div>
                </div>
                <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
                  <button onClick={handleSave} disabled={saving} className="btn-primary">
                    {saving ? <><Loader2 size={14} className="animate-spin" /> Opslaan…</> : <><Check size={14} /> Opslaan</>}
                  </button>
                  <button disabled={saving} onClick={resetEdit} className="btn-outline">
                    <X size={14} /> Herstellen
                  </button>
                </div>
              </div>
            </div>

            <div className="card p-5 space-y-3">
              <h2 className="text-sm font-semibold text-slate-700">Export</h2>
              <p className="text-xs text-slate-400">Exporteer dit project als PDF, inclusief taken, team en beschrijving.</p>
              <PdfExportButton scope={`project:${project.id}`} label="Download PDF" />
            </div>

            <PermissionGate allowed={isOwnerOrMember}>
              <div className="card overflow-hidden">
                <div className="px-5 py-4 border-b border-red-100 bg-red-50/40">
                  <h2 className="text-sm font-semibold text-red-700">Gevarenzone</h2>
                </div>
                <div className="px-5 py-4 space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-slate-700">Project archiveren</p>
                      <p className="text-xs text-slate-400">Zet de status op Gearchiveerd.</p>
                    </div>
                    <button
                      onClick={() => { setEdit(p => ({ ...p, status: "archived" })); handleSave(); }}
                      disabled={saving || project.status === "archived"}
                      className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-colors disabled:opacity-50">
                      <Archive size={13} /> Archiveren
                    </button>
                  </div>
                  <div className="pt-3 border-t border-red-100 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-red-700">Project verwijderen</p>
                      <p className="text-xs text-slate-400">Permanent. Niet ongedaan te maken.</p>
                    </div>
                    <button onClick={handleDelete} disabled={deleting}
                      className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 transition-colors disabled:opacity-50">
                      {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />} Verwijderen
                    </button>
                  </div>
                </div>
              </div>
            </PermissionGate>
          </div>
        )}

      </div>
    </div>
  );
}
