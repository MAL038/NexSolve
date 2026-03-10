"use client";

/**
 * ProjectDetailClient — refactored naar DetailPageShell
 * ──────────────────────────────────────────────────────
 * WAT ER VERANDERD IS (minimale diff):
 *   1. Import DetailPageShell, SidebarMetaRow, TabContent
 *   2. De grote JSX-structuur (aside + content-div) vervangen door <DetailPageShell>
 *   3. entityMeta, sidebarMeta, headerActions als aparte variabelen gedefinieerd
 *   4. Alle tab-inhoud gewikkeld in <TabContent maxWidth="...">
 *   5. Toast + error state werkt nu via shell props — eigen toast-div weg
 *   6. De rest van de state/logica is ONGEWIJZIGD
 */

import React, { useState, useCallback } from "react";
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
  Customer, ProjectStatus, ProjectMember,
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
  const [toast,     setToast]     = useState<string | null>(null);

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

  // ── Tab definities ────────────────────────────────────────
  const TABS: TabDef<Tab>[] = [
    { id: "algemeen",   label: "Algemeen",   icon: LayoutGrid,    },
    { id: "taken",      label: "Taken",      icon: GitBranch,     badge: totalSubs > 0 ? `${doneSubs}/${totalSubs}` : null },
    { id: "team",       label: "Team",       icon: Users,         },
    { id: "intake",     label: "Intake",     icon: ClipboardList, },
    { id: "dossier",    label: "Dossier",    icon: FileText,      },
    { id: "activiteit", label: "Activiteit", icon: Activity,      },
    { id: "exporteren", label: "Exporteren", icon: Download,      },
  ];

  // ── Shell slots ───────────────────────────────────────────

  // Progress + klantblok in de sidebar onder de titel
  const entityMeta = (
    <>
      {totalSubs > 0 && (
        <div className="mt-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">
              Voortgang
            </span>
            <span className="text-[10px] font-bold text-slate-600">{pct}%</span>
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

          {project.code && (
            <div>
              <label className="label">Projectcode</label>
              <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200
                              bg-slate-50 text-sm text-slate-600 font-mono">
                <Hash size={13} className="text-slate-400" />
                {project.code}
                <span className="ml-auto text-[10px] text-slate-400 font-sans">Niet wijzigbaar</span>
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

          <div>
            <label className="label">Status</label>
            <div className="flex gap-2 flex-wrap mt-1">
              {STATUS_OPTIONS.map(s => (
                <button key={s.value} type="button"
                  disabled={!isOwnerOrMember}
                  onClick={() => setEdit(p => ({ ...p, status: s.value }))}
                  className={clsx(
                    "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all",
                    edit.status === s.value
                      ? "ring-2 ring-brand-400 ring-offset-1 border-transparent bg-brand-50"
                      : "border-slate-200 bg-white hover:border-slate-300",
                  )}
                >
                  <span className={clsx("w-2 h-2 rounded-full", s.dot)} />
                  {s.label}
                </button>
              ))}
            </div>
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
