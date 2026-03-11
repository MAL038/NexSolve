"use client";

import React, { useState, useCallback, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Calendar, Building2, Users, GitBranch,
  Layers, ChevronRight, Pencil, Check, Loader2,
  AlertCircle, FileText, Activity, Download, X,
  LayoutGrid, UserCircle, Hash, FolderKanban, ClipboardList,
} from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import Avatar from "@/components/ui/Avatar";
import MembersPanel from "@/components/ui/MembersPanel";
import SubprocessesPanel from "@/components/ui/SubprocessesPanel";
import PdfExportButton from "@/components/ui/PdfExportButton";
import { CustomerSelectWithCreate } from "@/components/customers/CustomerSelectWithCreate";
import { DossierList } from "@/components/dossiers/DossierList";
import { ActivityFeed } from "@/components/activity/ActivityFeed";
import IntakeTab from "@/components/projects/IntakeTab";
import { formatDate, relativeTime } from "@/lib/time";
import clsx from "clsx";

// ── Nieuw: DetailPageShell imports ──────────────────────────────
import {
  DetailPageShell,
  SidebarMetaRow,
  TabContent,
  type TabDef,
} from "@/components/layout/DetailPageShell";

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

  // ── Derived (ongewijzigd) ─────────────────────────────────
  const themeObj       = hierarchy.find(t => t.id === project.theme_id);
  const processObj     = themeObj?.processes?.find(p => p.id === project.process_id);
  const ptObj          = processObj?.process_types?.find(pt => pt.id === project.process_type_id);
  const doneSubs       = subprocesses.filter(s => s.status === "done").length;
  const totalSubs      = subprocesses.length;
  const pct            = totalSubs > 0 ? Math.round((doneSubs / totalSubs) * 100) : 0;
  const isOverdue      = !!project.end_date && new Date(project.end_date) < new Date();
  const currentCustomer = customers.find((c: Customer) => c.id === project.customer_id)
    ?? (project.customer as Customer | null);

  // ── Handlers (ongewijzigd) ────────────────────────────────
  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

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
          <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
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

      {currentCustomer && (
        <Link
          href={`/customers/${(currentCustomer as any).id}`}
          className="mt-3 flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-slate-200
                     bg-white hover:border-brand-300 hover:bg-brand-50/40 transition-all group"
        >
          <div className="w-7 h-7 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0">
            <Building2 size={13} className="text-brand-500" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-700 group-hover:text-brand-700
                           transition-colors truncate">
              {(currentCustomer as any).name}
            </p>
            {(currentCustomer as any).code && (
              <p className="text-[10px] font-mono text-slate-400">
                #{(currentCustomer as any).code}
              </p>
            )}
          </div>
          <ChevronRight size={13} className="text-slate-300 group-hover:text-brand-400
                                              flex-shrink-0 transition-colors" />
        </Link>
      )}
    </>
  );

  // Footer meta in de sidebar
  const sidebarMeta = (
    <>
      {project.owner && (
        <SidebarMetaRow icon={UserCircle}>
          <Avatar
            name={(project.owner as any).full_name}
            url={(project.owner as any).avatar_url}
            size="xs"
          />
          <span className="truncate">{(project.owner as any).full_name}</span>
        </SidebarMetaRow>
      )}
      {project.end_date && (
        <SidebarMetaRow
          icon={Calendar}
          label={`${formatDate(project.end_date)}${isOverdue ? " · verlopen" : ""}`}
          variant={isOverdue ? "warning" : "default"}
        />
      )}
      <SidebarMetaRow
        icon={Layers}
        label={`Bijgewerkt ${relativeTime(project.updated_at)}`}
        variant="muted"
      />
    </>
  );

  // Acties rechts in de content-header
  const headerActions = (
    <>
      {isOwnerOrMember && (
        <button
          onClick={() => handleSave()}
          disabled={saving}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-600 text-white
                     text-xs font-semibold hover:bg-brand-700 transition-colors
                     disabled:opacity-60 shadow-sm shadow-brand-200"
        >
          {saving
            ? <><Loader2 size={13} className="animate-spin" /> Opslaan…</>
            : <><Check size={13} /> Opslaan</>
          }
        </button>
      )}
    </>
  );

  // ── Render ────────────────────────────────────────────────
  return (
    <DetailPageShell<Tab>
      breadcrumb={[
        { label: "Projecten", href: "/projects" },
        { label: project.name },
      ]}
      title={project.name}
      titleBadge={<StatusBadge status={project.status} />}
      subtitle={project.code ? `#${project.code}` : null}
      entityMeta={entityMeta}
      tabs={TABS}
      activeTab={activeTab}
      onTabChange={handleTabClick}
      sidebarMeta={sidebarMeta}
      headerActions={activeTab === "algemeen" ? headerActions : undefined}
      toast={toast}
      error={error}
      onErrorDismiss={() => setError(null)}
    >
      {/* ── Tab: Algemeen ─────────────────────────────────── */}
      {activeTab === "algemeen" && (
        <TabContent maxWidth="md" className="space-y-6">
          <div>
            <h2 className="text-base font-semibold text-slate-700 mb-4">Projectgegevens</h2>

            {!isOwnerOrMember && (
              <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200
                              rounded-xl text-sm text-amber-700 mb-4">
                <AlertCircle size={14} className="flex-shrink-0" />
                Je hebt geen rechten om dit project te bewerken.
              </div>
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
          )}

          <div>
            <label className="label">Naam *</label>
            <input
              value={edit.name}
              onChange={(e) => setEdit(p => ({ ...p, name: e.target.value }))}
              disabled={!isOwnerOrMember}
              className="input"
              placeholder="Projectnaam"
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

          <div>
            <label className="label">Beschrijving</label>
            <textarea
              value={edit.description}
              onChange={(e) => setEdit(p => ({ ...p, description: e.target.value }))}
              disabled={!isOwnerOrMember}
              rows={4}
              className="input resize-none"
              placeholder="Optionele omschrijving…"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Startdatum</label>
              <input type="date" value={edit.start_date}
                onChange={(e) => setEdit(p => ({ ...p, start_date: e.target.value }))}
                disabled={!isOwnerOrMember} className="input" />
            </div>
            <div>
              <label className="label">Einddatum</label>
              <input type="date" value={edit.end_date}
                onChange={(e) => setEdit(p => ({ ...p, end_date: e.target.value }))}
                disabled={!isOwnerOrMember} className="input" />
            </div>
          </div>

          <div>
            <label className="label">Klant</label>
            <CustomerSelectWithCreate
              customers={customers}
              value={edit.customer_id}
              onChange={(id) => setEdit(p => ({ ...p, customer_id: id }))}
              onCustomerCreated={handleCustomerCreated}
            />
          </div>

          {/* Thema / Process info readonly */}
          {(themeLabel || processLabel || ptLabel) && (
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Classificatie</p>
              {themeLabel   && <div><p className="text-[10px] text-slate-400 mb-0.5">Thema</p>   <p className="text-sm text-slate-700">{themeLabel}</p></div>}
              {processLabel && <div><p className="text-[10px] text-slate-400 mb-0.5">Proces</p>  <p className="text-sm text-slate-700">{processLabel}</p></div>}
              {ptLabel      && <div><p className="text-[10px] text-slate-400 mb-0.5">Type</p>    <p className="text-sm text-slate-700">{ptLabel}</p></div>}
            </div>
          )}
        </TabContent>
      )}

      {/* ── Tab: Taken ───────────────────────────────────── */}
      {activeTab === "taken" && (
        <TabContent maxWidth="full">
          <SubprocessesPanel
            projectId={project.id}
            initialSubprocesses={subprocesses}
            isOwnerOrMember={isOwnerOrMember}
          />
        </TabContent>
      )}

      {/* ── Tab: Team ────────────────────────────────────── */}
      {activeTab === "team" && (
        <TabContent maxWidth="md">
          <MembersPanel
            projectId={project.id}
            ownerId={project.owner_id}
            currentUserId={currentUserId}
            owner={project.owner as any}
            initialMembers={(project.project_members ?? []) as ProjectMember[]}
          />
        </TabContent>
      )}

      {/* ── Tab: Intake ──────────────────────────────────── */}
      {activeTab === "intake" && (
        <TabContent maxWidth="md">
          <IntakeTab
            projectId={project.id}
            projectName={project.name}
            themeId={project.theme_id}
          />
        </TabContent>
      )}

      {/* ── Tab: Dossier ─────────────────────────────────── */}
      {activeTab === "dossier" && (
        <TabContent maxWidth="full">
          <DossierList projectId={project.id} />
        </TabContent>
      )}

      {/* ── Tab: Activiteit ──────────────────────────────── */}
      {activeTab === "activiteit" && (
        <TabContent maxWidth="md">
          <ActivityFeed projectId={project.id} title="" />
        </TabContent>
      )}

      {/* ── Tab: Exporteren ──────────────────────────────── */}
      {activeTab === "exporteren" && (
        <TabContent maxWidth="sm" className="space-y-4">
          <div>
            <h3 className="font-semibold text-slate-700 mb-1">PDF exporteren</h3>
            <p className="text-sm text-slate-400 mb-4">
              Exporteer dit project inclusief deeltaken, teamleden en beschrijving.
            </p>
          </div>
          <PdfExportButton scope={`project:${project.id}`} label="Download PDF" />
        </TabContent>
      )}
    </DetailPageShell>
  );
}
