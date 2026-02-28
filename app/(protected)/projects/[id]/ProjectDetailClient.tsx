"use client";

import React, { useState, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft, Calendar, Building2, Users, GitBranch,
  Layers, ChevronRight, Pencil, X, Check, Loader2,
  AlertCircle, FileText, Activity, ChevronDown, ChevronUp,
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

const STATUS_OPTIONS: { value: ProjectStatus; label: string; dot: string }[] = [
  { value: "active",      label: "Actief",        dot: "bg-brand-500" },
  { value: "in-progress", label: "In uitvoering", dot: "bg-amber-500" },
  { value: "archived",    label: "Gearchiveerd",  dot: "bg-slate-400" },
];

// ─── Collapsible section ──────────────────────────────────────

function Section({
  icon: Icon, title, count, defaultOpen = true, children, iconColor = "text-brand-500",
}: {
  icon: React.ElementType;
  title: string;
  count?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
  iconColor?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-t border-slate-100 first:border-0">
      <button
        onClick={() => setOpen((o: boolean) => !o)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50/50 transition-colors group"
      >
        <div className="flex items-center gap-2.5">
          <Icon size={15} className={iconColor} />
          <span className="text-sm font-semibold text-slate-700">{title}</span>
          {count !== undefined && (
            <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              {count}
            </span>
          )}
        </div>
        {open
          ? <ChevronUp size={14} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
          : <ChevronDown size={14} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
        }
      </button>
      {open && <div className="px-6 pb-5">{children}</div>}
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
  const [editing,   setEditing]   = useState(false);
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

  const themeObj   = hierarchy.find(t => t.id === project.theme_id);
  const processObj = themeObj?.processes?.find(p => p.id === project.process_id);
  const ptObj      = processObj?.process_types?.find(pt => pt.id === project.process_type_id);

  const doneSubs   = subprocesses.filter(s => s.status === "done").length;
  const totalSubs  = subprocesses.length;
  const pct        = totalSubs > 0 ? Math.round((doneSubs / totalSubs) * 100) : 0;
  const memberCount = (project.project_members?.length ?? 0) + 1;

  function startEdit() {
    setEdit({
      name:        project.name,
      description: project.description ?? "",
      status:      project.status,
      start_date:  project.start_date ?? "",
      end_date:    project.end_date ?? "",
      customer_id: project.customer_id,
    });
    setError(null);
    setEditing(true);
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
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
      setEditing(false);
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

  const currentCustomer = customers.find((c: Customer) => c.id === project.customer_id)
    ?? (project.customer as Customer | null);

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

      {/* ── Split-view ───────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-5 items-start">

        {/* ── LEFT: Info sidebar ───────────────────────────── */}
        <div className="w-full lg:w-72 xl:w-80 flex-shrink-0 lg:sticky lg:top-20 space-y-4">

          {/* Project identity card */}
          <div className="card overflow-hidden">

            {/* Header met naam + acties */}
            <div className="px-5 pt-5 pb-4">
              {editing ? (
                <input
                  autoFocus
                  value={edit.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEdit((p: EditState) => ({ ...p, name: e.target.value }))
                  }
                  className="w-full text-lg font-bold text-slate-800 bg-transparent border-b-2 border-brand-500 focus:outline-none pb-1 mb-3"
                />
              ) : (
                <h1 className="text-lg font-bold text-slate-800 leading-snug mb-3">{project.name}</h1>
              )}

              {/* Status */}
              {editing ? (
                <div className="flex flex-col gap-1.5">
                  {STATUS_OPTIONS.map(s => (
                    <button key={s.value} type="button"
                      onClick={() => setEdit((p: EditState) => ({ ...p, status: s.value }))}
                      className={clsx(
                        "flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition-all text-left",
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
              ) : (
                <StatusBadge status={project.status} />
              )}
            </div>

            {/* Voortgangsbalk */}
            {totalSubs > 0 && (
              <div className="px-5 pb-4">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                  <span>{doneSubs}/{totalSubs} taken</span>
                  <span className="font-semibold text-slate-700">{pct}%</span>
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

            {/* Thema breadcrumb */}
            {(themeObj || themeLabel) && (
              <div className="px-5 pb-4">
                <div className="flex items-center gap-1 flex-wrap px-3 py-2 bg-violet-50 rounded-xl border border-violet-100">
                  <Layers size={11} className="text-violet-500 flex-shrink-0" />
                  <span className="text-xs font-medium text-violet-700">{themeObj?.name ?? themeLabel}</span>
                  {(processObj || processLabel) && (
                    <>
                      <ChevronRight size={10} className="text-violet-300" />
                      <span className="text-xs font-medium text-violet-700">{processObj?.name ?? processLabel}</span>
                    </>
                  )}
                  {(ptObj || ptLabel) && (
                    <>
                      <ChevronRight size={10} className="text-violet-300" />
                      <span className="text-xs font-semibold text-violet-800">{ptObj?.name ?? ptLabel}</span>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="mx-5 mb-4 flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                <AlertCircle size={13} className="flex-shrink-0" /> {error}
              </div>
            )}

            {/* Meta info */}
            <div className="border-t border-slate-50 px-5 py-4 space-y-3">

              {/* Klant */}
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Klant</p>
                {editing ? (
                  <CustomerSelectWithCreate
                    value={edit.customer_id}
                    onChange={(id: string | null) => setEdit((p: EditState) => ({ ...p, customer_id: id }))}
                    customers={customers}
                    onCustomerCreated={handleCustomerCreated}
                  />
                ) : currentCustomer ? (
                  <Link href={`/customers/${(currentCustomer as any).id}`}
                    className="flex items-center gap-2 text-sm text-brand-600 hover:text-brand-700 font-medium transition-colors">
                    <Building2 size={13} className="text-brand-400 flex-shrink-0" />
                    {(currentCustomer as any).name}
                  </Link>
                ) : (
                  <p className="text-sm text-slate-400 italic">Geen klant gekoppeld</p>
                )}
              </div>

              {/* Datums */}
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Planning</p>
                {editing ? (
                  <div className="space-y-2">
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Startdatum</label>
                      <input type="date"
                        value={edit.start_date}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setEdit((p: EditState) => ({ ...p, start_date: e.target.value }))
                        }
                        className="input w-full text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Einddatum</label>
                      <input type="date"
                        value={edit.end_date}
                        min={edit.start_date || undefined}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setEdit((p: EditState) => ({ ...p, end_date: e.target.value }))
                        }
                        className="input w-full text-sm"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Calendar size={13} className="text-slate-400 flex-shrink-0" />
                      {project.start_date
                        ? <span>{formatDate(project.start_date)}</span>
                        : <span className="text-slate-400 italic text-xs">Geen startdatum</span>
                      }
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Calendar size={13} className={clsx(
                        "flex-shrink-0",
                        project.end_date && new Date(project.end_date) < new Date()
                          ? "text-red-400" : "text-slate-400"
                      )} />
                      {project.end_date
                        ? <span className={clsx(
                            new Date(project.end_date) < new Date() ? "text-red-600 font-medium" : ""
                          )}>{formatDate(project.end_date)}</span>
                        : <span className="text-slate-400 italic text-xs">Geen deadline</span>
                      }
                    </div>
                  </div>
                )}
              </div>

              {/* Eigenaar */}
              {project.owner && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Eigenaar</p>
                  <div className="flex items-center gap-2">
                    <Avatar name={(project.owner as any).full_name} url={(project.owner as any).avatar_url} size="xs" />
                    <span className="text-sm text-slate-700 font-medium">{(project.owner as any).full_name}</span>
                  </div>
                </div>
              )}

              {/* Aangemaakt / bijgewerkt */}
              <div className="text-xs text-slate-400 pt-1 border-t border-slate-50 space-y-1">
                <p>Aangemaakt {formatDate(project.created_at)}</p>
                <p>Bijgewerkt {relativeTime(project.updated_at)}</p>
              </div>
            </div>

            {/* Beschrijving */}
            <div className="border-t border-slate-50 px-5 py-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Beschrijving</p>
              {editing ? (
                <textarea
                  value={edit.description}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setEdit((p: EditState) => ({ ...p, description: e.target.value }))
                  }
                  placeholder="Beschrijving (optioneel)"
                  rows={4}
                  className="w-full text-slate-600 text-sm leading-relaxed border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 resize-none"
                />
              ) : project.description ? (
                <p className="text-sm text-slate-600 leading-relaxed">{project.description}</p>
              ) : (
                <p
                  className={clsx(
                    "text-sm text-slate-400 italic",
                    isOwnerOrMember && "cursor-pointer hover:text-brand-500 transition-colors"
                  )}
                  onClick={isOwnerOrMember ? startEdit : undefined}
                >
                  {isOwnerOrMember ? "+ Beschrijving toevoegen…" : "Geen beschrijving"}
                </p>
              )}
            </div>

            {/* Acties */}
            <div className="border-t border-slate-100 px-5 py-3 bg-slate-50/60 flex items-center gap-2">
              {isOwnerOrMember && !editing && (
                <button onClick={startEdit}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-slate-200 text-slate-600 hover:border-brand-300 hover:text-brand-600 text-sm font-medium transition-colors bg-white">
                  <Pencil size={13} /> Bewerken
                </button>
              )}
              {editing && (
                <>
                  <button onClick={() => { setEditing(false); setError(null); }} disabled={saving}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-white text-sm font-medium transition-colors disabled:opacity-50">
                    <X size={13} /> Annuleren
                  </button>
                  <button onClick={handleSave} disabled={saving}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-brand-600 text-white hover:bg-brand-700 text-sm font-medium transition-colors disabled:opacity-60 shadow-sm shadow-brand-200">
                    {saving
                      ? <><Loader2 size={13} className="animate-spin" /> Opslaan…</>
                      : <><Check size={13} /> Opslaan</>}
                  </button>
                </>
              )}
              <PdfExportButton scope={`project:${project.id}`} label="PDF" />
            </div>
          </div>
        </div>

        {/* ── RIGHT: Werkruimte ─────────────────────────────── */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* Taken — primair, geen kaart-wrapper, direct zichtbaar */}
          <div className="card overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <GitBranch size={15} className="text-brand-500" />
                <h2 className="font-semibold text-slate-700 text-sm">Deeltaken</h2>
                {totalSubs > 0 && (
                  <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                    {doneSubs}/{totalSubs}
                  </span>
                )}
              </div>
            </div>
            <div className="px-6 py-5">
              <SubprocessesPanel
                projectId={project.id}
                initialSubprocesses={subprocesses}
                isOwnerOrMember={isOwnerOrMember}
              />
            </div>
          </div>

          {/* Teamleden — collapsible */}
          <div className="card overflow-hidden">
            <Section icon={Users} title="Teamleden" count={memberCount} iconColor="text-brand-500">
              <MembersPanel
                projectId={project.id}
                ownerId={project.owner_id}
                currentUserId={currentUserId}
                owner={project.owner as any}
                initialMembers={(project.project_members ?? []) as ProjectMember[]}
              />
            </Section>
          </div>

          {/* Dossiers — collapsible, standaard dicht */}
          <div className="card overflow-hidden">
            <Section icon={FileText} title="Dossiers" defaultOpen={false} iconColor="text-violet-500">
              <DossierList projectId={project.id} />
            </Section>
          </div>

          {/* Activiteit — collapsible, standaard dicht */}
          <div className="card overflow-hidden">
            <Section icon={Activity} title="Activiteit" defaultOpen={false} iconColor="text-slate-400">
              <ActivityFeed projectId={project.id} title="" compact />
            </Section>
          </div>
        </div>
      </div>
    </div>
  );
}
