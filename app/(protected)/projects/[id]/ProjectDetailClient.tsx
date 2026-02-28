"use client";

import React, { useState, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft, Calendar, Building2, Users, GitBranch,
  Layers, ChevronRight, Pencil, X, Check, Loader2,
  AlertCircle, FileText, Activity, Download,
} from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import Avatar from "@/components/ui/Avatar";
import MembersPanel from "@/components/ui/MembersPanel";
import SubprocessesPanel from "@/components/ui/SubprocessesPanel";
import PdfExportButton from "@/components/ui/PdfExportButton";
import { CustomerSelectWithCreate } from "@/components/customers/CustomerSelectWithCreate";
import { DossierList } from "@/components/dossiers/DossierList";
import { ActivityFeed } from "@/components/activity/ActivityFeed";
import { formatDate, relativeTime } from "@/lib/time";
import clsx from "clsx";
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

type Tab = "taken" | "activiteit" | "bewerken" | "exporteren";

const STATUS_OPTIONS: { value: ProjectStatus; label: string; dot: string }[] = [
  { value: "active",      label: "Actief",        dot: "bg-brand-500" },
  { value: "in-progress", label: "In uitvoering", dot: "bg-amber-500" },
  { value: "archived",    label: "Gearchiveerd",  dot: "bg-slate-400" },
];

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "taken",      label: "Taken",      icon: GitBranch },
  { id: "activiteit", label: "Activiteit", icon: Activity  },
  { id: "bewerken",   label: "Bewerken",   icon: Pencil    },
  { id: "exporteren", label: "Exporteren", icon: Download  },
];

// ─── Sidebar info row ─────────────────────────────────────────

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <div className="text-sm text-slate-700">{children}</div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────

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
  const [activeTab, setActiveTab] = useState<Tab>("taken");
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

  // Derived
  const themeObj   = hierarchy.find(t => t.id === project.theme_id);
  const processObj = themeObj?.processes?.find(p => p.id === project.process_id);
  const ptObj      = processObj?.process_types?.find(pt => pt.id === project.process_type_id);
  const doneSubs   = subprocesses.filter(s => s.status === "done").length;
  const totalSubs  = subprocesses.length;
  const pct        = totalSubs > 0 ? Math.round((doneSubs / totalSubs) * 100) : 0;
  const currentCustomer = customers.find((c: Customer) => c.id === project.customer_id)
    ?? (project.customer as Customer | null);
  const isDeadlinePast = project.end_date && new Date(project.end_date) < new Date();

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  // Sync edit state when switching to bewerken tab
  function handleTabClick(tab: Tab) {
    if (tab === "bewerken") {
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
      setProject((prev: Project) => ({ ...prev, ...data, customer: data.customer ?? prev.customer }));
      setActiveTab("taken");
      showToast("Project bijgewerkt");
    } catch {
      setError("Er ging iets mis bij het opslaan");
    } finally {
      setSaving(false);
    }
  }, [edit, project.id]);

  const handleCustomerCreated = useCallback((c: Customer) => {
    setCustomers((prev: Customer[]) => [...prev, c]);
    setEdit((prev: EditState) => ({ ...prev, customer_id: c.id }));
  }, []);

  return (
    <div className="max-w-7xl mx-auto">

      {/* Toast */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border border-brand-200 bg-white text-brand-700 text-sm font-medium shadow-lg">
          <span className="w-2 h-2 rounded-full bg-brand-500 flex-shrink-0" />
          {toast}
        </div>
      )}

      {/* Breadcrumb */}
      <Link href="/projects"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-brand-600 font-medium transition-colors mb-5">
        <ArrowLeft size={15} /> Terug naar projecten
      </Link>

      {/* ── Layout: sidebar + tabpaneel ──────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-5 items-start">

        {/* ══════════════════════════════════════════════════════
            SIDEBAR — sticky, 360px, altijd zichtbaar
        ══════════════════════════════════════════════════════ */}
        <aside className="w-full lg:w-[360px] flex-shrink-0 lg:sticky lg:top-[57px] space-y-4">

          {/* Project naam + status */}
          <div className="card p-5 space-y-3">
            <div>
              <h1 className="text-xl font-bold text-slate-800 leading-snug">{project.name}</h1>
              <div className="mt-2">
                <StatusBadge status={project.status} />
              </div>
            </div>

            {/* Voortgangsbalk */}
            {totalSubs > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{doneSubs} van {totalSubs} taken gereed</span>
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
            )}
          </div>

          {/* Project details */}
          <div className="card p-5 space-y-5">

            {/* Klant */}
            <InfoRow label="Klant">
              {currentCustomer ? (
                <Link href={`/customers/${(currentCustomer as any).id}`}
                  className="flex items-center gap-2 text-brand-600 hover:text-brand-700 font-medium transition-colors">
                  <Building2 size={13} className="text-brand-400 flex-shrink-0" />
                  {(currentCustomer as any).name}
                </Link>
              ) : (
                <span className="text-slate-400 italic text-xs">Geen klant</span>
              )}
            </InfoRow>

            {/* Thema */}
            {(themeObj || themeLabel) && (
              <InfoRow label="Thema">
                <div className="flex items-center gap-1 flex-wrap">
                  <Layers size={11} className="text-violet-500 flex-shrink-0" />
                  <span className="text-violet-700 font-medium">{themeObj?.name ?? themeLabel}</span>
                  {(processObj || processLabel) && (
                    <>
                      <ChevronRight size={10} className="text-slate-300" />
                      <span className="text-slate-600">{processObj?.name ?? processLabel}</span>
                    </>
                  )}
                  {(ptObj || ptLabel) && (
                    <>
                      <ChevronRight size={10} className="text-slate-300" />
                      <span className="text-slate-500">{ptObj?.name ?? ptLabel}</span>
                    </>
                  )}
                </div>
              </InfoRow>
            )}

            {/* Eigenaar */}
            {project.owner && (
              <InfoRow label="Eigenaar">
                <div className="flex items-center gap-2">
                  <Avatar
                    name={(project.owner as any).full_name}
                    url={(project.owner as any).avatar_url}
                    size="xs"
                  />
                  <span className="font-medium">{(project.owner as any).full_name}</span>
                </div>
              </InfoRow>
            )}

            {/* Planning */}
            <InfoRow label="Planning">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-slate-600">
                  <Calendar size={12} className="text-slate-400 flex-shrink-0" />
                  {project.start_date
                    ? formatDate(project.start_date)
                    : <span className="text-slate-400 italic text-xs">Geen startdatum</span>
                  }
                </div>
                <div className="flex items-center gap-2">
                  <Calendar size={12} className={clsx(
                    "flex-shrink-0",
                    isDeadlinePast ? "text-red-400" : "text-slate-400"
                  )} />
                  {project.end_date
                    ? <span className={clsx("font-medium", isDeadlinePast && "text-red-600")}>
                        {formatDate(project.end_date)}
                        {isDeadlinePast && <span className="ml-1.5 text-xs font-normal text-red-500">verlopen</span>}
                      </span>
                    : <span className="text-slate-400 italic text-xs">Geen deadline</span>
                  }
                </div>
              </div>
            </InfoRow>

            {/* Beschrijving */}
            <InfoRow label="Beschrijving">
              {project.description ? (
                <p className="leading-relaxed text-slate-600">{project.description}</p>
              ) : (
                <span className="text-slate-400 italic text-xs">Geen beschrijving</span>
              )}
            </InfoRow>

            {/* Tijdstempels */}
            <div className="pt-3 border-t border-slate-50 text-xs text-slate-400 space-y-0.5">
              <p>Aangemaakt {formatDate(project.created_at)}</p>
              <p>Bijgewerkt {relativeTime(project.updated_at)}</p>
            </div>
          </div>

          {/* Team */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Users size={14} className="text-brand-500" />
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Team ({(project.project_members?.length ?? 0) + 1})
              </p>
            </div>
            <MembersPanel
              projectId={project.id}
              ownerId={project.owner_id}
              currentUserId={currentUserId}
              owner={project.owner as any}
              initialMembers={(project.project_members ?? []) as ProjectMember[]}
            />
          </div>

          {/* Dossiers */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <FileText size={14} className="text-violet-500" />
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Dossiers</p>
            </div>
            <DossierList projectId={project.id} />
          </div>

        </aside>

        {/* ══════════════════════════════════════════════════════
            MAIN — tabs + tabpanelen
        ══════════════════════════════════════════════════════ */}
        <div className="flex-1 min-w-0">

          {/* Tab-balk */}
          <div className="card overflow-hidden mb-4">
            <div className="flex border-b border-slate-100">
              {TABS.map(tab => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabClick(tab.id)}
                    className={clsx(
                      "flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-all border-b-2 -mb-[1px]",
                      active
                        ? "border-brand-500 text-brand-700 bg-brand-50/40"
                        : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                    )}
                  >
                    <Icon size={14} />
                    {tab.label}
                    {tab.id === "taken" && totalSubs > 0 && (
                      <span className={clsx(
                        "text-xs px-1.5 py-0.5 rounded-full font-semibold",
                        active ? "bg-brand-100 text-brand-700" : "bg-slate-100 text-slate-500"
                      )}>
                        {doneSubs}/{totalSubs}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* ── Tab: Taken ─────────────────────────────────── */}
            {activeTab === "taken" && (
              <div className="p-6">
                <SubprocessesPanel
                  projectId={project.id}
                  initialSubprocesses={subprocesses}
                  isOwnerOrMember={isOwnerOrMember}
                />
              </div>
            )}

            {/* ── Tab: Activiteit ────────────────────────────── */}
            {activeTab === "activiteit" && (
              <div className="p-6">
                <ActivityFeed projectId={project.id} title="" />
              </div>
            )}

            {/* ── Tab: Bewerken ──────────────────────────────── */}
            {activeTab === "bewerken" && (
              <div className="p-6 space-y-5">
                {!isOwnerOrMember && (
                  <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
                    <AlertCircle size={14} className="flex-shrink-0" />
                    Je hebt geen rechten om dit project te bewerken.
                  </div>
                )}

                {error && (
                  <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                    <AlertCircle size={14} className="flex-shrink-0" /> {error}
                  </div>
                )}

                {/* Naam */}
                <div>
                  <label className="label">Naam *</label>
                  <input
                    value={edit.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEdit((p: EditState) => ({ ...p, name: e.target.value }))
                    }
                    disabled={!isOwnerOrMember}
                    className="input w-full"
                    placeholder="Projectnaam"
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="label">Status</label>
                  <div className="flex gap-2 flex-wrap">
                    {STATUS_OPTIONS.map(s => (
                      <button key={s.value} type="button"
                        disabled={!isOwnerOrMember}
                        onClick={() => setEdit((p: EditState) => ({ ...p, status: s.value }))}
                        className={clsx(
                          "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all",
                          edit.status === s.value
                            ? "ring-2 ring-brand-400 ring-offset-1 border-transparent " + (
                                s.value === "active"      ? "bg-brand-50 text-brand-700" :
                                s.value === "in-progress" ? "bg-amber-50 text-amber-700" :
                                "bg-slate-100 text-slate-600"
                              )
                            : "bg-white border-slate-200 text-slate-500 hover:border-slate-300 disabled:opacity-40"
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
                    value={edit.description}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setEdit((p: EditState) => ({ ...p, description: e.target.value }))
                    }
                    disabled={!isOwnerOrMember}
                    placeholder="Beschrijving (optioneel)"
                    rows={4}
                    className="input w-full resize-none"
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
                      value={edit.start_date}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setEdit((p: EditState) => ({ ...p, start_date: e.target.value }))
                      }
                      disabled={!isOwnerOrMember}
                      className="input w-full"
                    />
                  </div>
                  <div>
                    <label className="label">Einddatum</label>
                    <input type="date"
                      value={edit.end_date}
                      min={edit.start_date || undefined}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setEdit((p: EditState) => ({ ...p, end_date: e.target.value }))
                      }
                      disabled={!isOwnerOrMember}
                      className="input w-full"
                    />
                  </div>
                </div>

                {/* Acties */}
                {isOwnerOrMember && (
                  <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => { setActiveTab("taken"); setError(null); }}
                      className="btn-outline"
                    >
                      <X size={14} /> Annuleren
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="btn-primary"
                    >
                      {saving
                        ? <><Loader2 size={14} className="animate-spin" /> Opslaan…</>
                        : <><Check size={14} /> Opslaan</>
                      }
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── Tab: Exporteren ────────────────────────────── */}
            {activeTab === "exporteren" && (
              <div className="p-6">
                <div className="max-w-sm space-y-4">
                  <div>
                    <h3 className="font-semibold text-slate-700 mb-1">PDF exporteren</h3>
                    <p className="text-sm text-slate-400">
                      Exporteer dit project inclusief deeltaken, teamleden en beschrijving naar PDF.
                    </p>
                  </div>
                  <PdfExportButton scope={`project:${project.id}`} label="Download PDF" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
