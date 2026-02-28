"use client";

import React, { useState, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft, Calendar, Building2, Users, GitBranch,
  Layers, ChevronRight, Pencil, X, Check, Loader2,
  AlertCircle,
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
  Customer, ProjectStatus,
} from "@/types";

// ─── Types ────────────────────────────────────────────────────

interface Props {
  project:       Project;
  subprocesses:  Subprocess[];
  hierarchy:     ThemeWithChildren[];
  customers:     Customer[];
  isOwnerOrMember: boolean;
  currentUserId: string;
  themeLabel:    string | null;
  processLabel:  string | null;
  ptLabel:       string | null;
}

interface EditState {
  name:        string;
  description: string;
  status:      ProjectStatus;
  start_date:  string;
  end_date:    string;
  customer_id: string | null;
  theme_id:    string | null;
  process_id:  string | null;
}

const STATUS_OPTIONS: { value: ProjectStatus; label: string; dot: string }[] = [
  { value: "active",      label: "Actief",        dot: "bg-brand-500" },
  { value: "in-progress", label: "In uitvoering", dot: "bg-amber-500" },
  { value: "archived",    label: "Gearchiveerd",  dot: "bg-slate-400" },
];

// ─── Component ────────────────────────────────────────────────

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
    theme_id:    initialProject.theme_id,
    process_id:  initialProject.process_id,
  });

  // Resolve live theme labels from hierarchy
  const themeObj   = hierarchy.find(t => t.id === project.theme_id);
  const processObj = themeObj?.processes?.find(p => p.id === project.process_id);
  const ptObj      = processObj?.process_types?.find(pt => pt.id === project.process_type_id);

  const doneSubs = subprocesses.filter(s => s.status === "done").length;

  function startEdit() {
    setEdit({
      name:        project.name,
      description: project.description ?? "",
      status:      project.status,
      start_date:  project.start_date ?? "",
      end_date:    project.end_date ?? "",
      customer_id: project.customer_id,
      theme_id:    project.theme_id,
      process_id:  project.process_id,
    });
    setError(null);
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setError(null);
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  const handleSave = useCallback(async () => {
    if (!edit.name.trim()) { setError("Naam is verplicht"); return; }
    setSaving(true);
    setError(null);

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
        ...prev,
        ...data,
        customer: data.customer ?? prev.customer,
      }));
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

  const customer = customers.find((c: Customer) => c.id === project.customer_id)
    ?? (project.customer as any);

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* Toast */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border border-brand-200 bg-white text-brand-700 text-sm font-medium shadow-lg">
          <span className="w-2 h-2 rounded-full bg-brand-500 flex-shrink-0" />
          {toast}
        </div>
      )}

      {/* Terug-link */}
      <Link href="/projects"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-brand-600 font-medium transition-colors">
        <ArrowLeft size={16} /> Terug naar projecten
      </Link>

      {/* ── Main info card ───────────────────────────────────── */}
      <div className="card p-8 space-y-6">

        {/* Header: naam + acties */}
        <div className="flex items-start gap-4">
          <div className="flex-1 min-w-0">
            {editing ? (
              <input
                autoFocus
                value={edit.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEdit((p: EditState) => ({ ...p, name: e.target.value }))}
                placeholder="Projectnaam"
                className="w-full text-2xl font-bold text-slate-800 bg-transparent border-b-2 border-brand-500 focus:outline-none pb-1"
              />
            ) : (
              <h1 className="text-2xl font-bold text-slate-800">{project.name}</h1>
            )}

            {/* Status + klant badges */}
            <div className="flex items-center gap-2 flex-wrap mt-2">
              {editing ? (
                <div className="flex items-center gap-1">
                  {STATUS_OPTIONS.map(s => (
                    <button key={s.value} type="button"
                      onClick={() => setEdit((p: EditState) => ({ ...p, status: s.value }))}
                      className={clsx(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all",
                        edit.status === s.value
                          ? "ring-2 ring-brand-400 ring-offset-1 border-transparent " + (
                              s.value === "active"      ? "bg-brand-50 text-brand-700" :
                              s.value === "in-progress" ? "bg-amber-50 text-amber-700" :
                              "bg-slate-100 text-slate-600"
                            )
                          : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                      )}>
                      <span className={clsx("w-1.5 h-1.5 rounded-full", s.dot)} />
                      {s.label}
                    </button>
                  ))}
                </div>
              ) : (
                <StatusBadge status={project.status} />
              )}

              {!editing && customer && (
                <Link href={`/customers/${(customer as any).id}`}
                  className="badge bg-brand-50 text-brand-600 hover:bg-brand-100 transition-colors gap-1">
                  <Building2 size={11} /> {(customer as any).name}
                </Link>
              )}
              {subprocesses.length > 0 && !editing && (
                <span className="badge bg-slate-100 text-slate-500 gap-1">
                  <GitBranch size={11} /> {doneSubs}/{subprocesses.length} deeltaken
                </span>
              )}
            </div>
          </div>

          {/* Edit / Save / Cancel knoppen */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {isOwnerOrMember && !editing && (
              <>
                <PdfExportButton scope={`project:${project.id}`} label="Exporteer" />
                <button onClick={startEdit}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-slate-600 hover:border-brand-300 hover:text-brand-600 text-sm font-medium transition-colors">
                  <Pencil size={14} /> Bewerken
                </button>
              </>
            )}
            {editing && (
              <>
                <button onClick={cancelEdit} disabled={saving}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-medium transition-colors disabled:opacity-50">
                  <X size={14} /> Annuleren
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand-600 text-white hover:bg-brand-700 text-sm font-medium transition-colors disabled:opacity-60 shadow-sm shadow-brand-200">
                  {saving
                    ? <><Loader2 size={14} className="animate-spin" /> Opslaan…</>
                    : <><Check size={14} /> Opslaan</>}
                </button>
              </>
            )}
            {!isOwnerOrMember && (
              <PdfExportButton scope={`project:${project.id}`} label="Exporteer" />
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            <AlertCircle size={14} className="flex-shrink-0" /> {error}
          </div>
        )}

        {/* Thema breadcrumb (alleen view mode) */}
        {!editing && (themeObj || themeLabel) && (
          <div className="flex items-center gap-1.5 flex-wrap px-3 py-2.5 bg-violet-50 rounded-xl border border-violet-100">
            <Layers size={13} className="text-violet-500 flex-shrink-0" />
            <span className="text-xs font-medium text-violet-700">
              {themeObj?.name ?? themeLabel}
            </span>
            {(processObj || processLabel) && (
              <>
                <ChevronRight size={11} className="text-violet-300" />
                <span className="text-xs font-medium text-violet-700">
                  {processObj?.name ?? processLabel}
                </span>
              </>
            )}
            {(ptObj || ptLabel) && (
              <>
                <ChevronRight size={11} className="text-violet-300" />
                <span className="text-xs font-semibold text-violet-800">
                  {ptObj?.name ?? ptLabel}
                </span>
              </>
            )}
          </div>
        )}

        {/* Beschrijving */}
        {editing ? (
          <textarea
            value={edit.description}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEdit((p: EditState) => ({ ...p, description: e.target.value }))}
            placeholder="Beschrijving (optioneel)"
            rows={4}
            className="w-full text-slate-600 leading-relaxed border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 resize-none"
          />
        ) : project.description ? (
          <p className="text-slate-600 leading-relaxed border-t border-slate-50 pt-5">
            {project.description}
          </p>
        ) : isOwnerOrMember ? (
          <p className="text-slate-400 text-sm italic border-t border-slate-50 pt-5 cursor-pointer hover:text-brand-500 transition-colors"
            onClick={startEdit}>
            + Beschrijving toevoegen…
          </p>
        ) : null}

        {/* Meta: datums + klant + eigenaar */}
        <div className={clsx(
          "grid gap-4 text-sm border-t border-slate-50 pt-5",
          editing ? "grid-cols-1" : "grid-cols-2"
        )}>
          {editing ? (
            <>
              {/* Klant selectie */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 flex items-center gap-1">
                  <Building2 size={11} /> Klant
                </label>
                <CustomerSelectWithCreate
                  value={edit.customer_id}
                  onChange={(id: string | null) => setEdit((p: EditState) => ({ ...p, customer_id: id }))}
                  customers={customers}
                  onCustomerCreated={handleCustomerCreated}
                />
              </div>

              {/* Datums */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 flex items-center gap-1">
                    <Calendar size={11} /> Startdatum
                  </label>
                  <input type="date"
                    value={edit.start_date}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEdit((p: EditState) => ({ ...p, start_date: e.target.value }))}
                    className="input w-full text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 flex items-center gap-1">
                    <Calendar size={11} /> Einddatum
                  </label>
                  <input type="date"
                    value={edit.end_date}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEdit((p: EditState) => ({ ...p, end_date: e.target.value }))}
                    min={edit.start_date || undefined}
                    className="input w-full text-sm"
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 text-slate-500">
                <Calendar size={15} className="text-brand-400" />
                {project.start_date
                  ? <>Start: <span className="font-medium text-slate-700">{formatDate(project.start_date)}</span></>
                  : <>Aangemaakt {formatDate(project.created_at)}</>
                }
              </div>
              <div className="flex items-center gap-2 text-slate-500">
                <Calendar size={15} className="text-brand-400" />
                {project.end_date
                  ? <>Deadline: <span className="font-medium text-slate-700">{formatDate(project.end_date)}</span></>
                  : <>Bijgewerkt {relativeTime(project.updated_at)}</>
                }
              </div>
              {project.owner && (
                <div className="flex items-center gap-2 col-span-2">
                  <Avatar
                    name={(project.owner as any).full_name}
                    url={(project.owner as any).avatar_url}
                    size="sm"
                  />
                  <span className="text-slate-600 font-medium">{(project.owner as any).full_name}</span>
                  <span className="text-slate-400">· Eigenaar</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Deeltaken ────────────────────────────────────────── */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-5">
          <GitBranch size={16} className="text-brand-500" />
          <h2 className="font-semibold text-slate-700">
            Deeltaken
            {subprocesses.length > 0 && (
              <span className="ml-2 text-xs font-normal text-slate-400">
                ({doneSubs}/{subprocesses.length} gereed)
              </span>
            )}
          </h2>
        </div>
        <SubprocessesPanel
          projectId={project.id}
          initialSubprocesses={subprocesses}
          isOwnerOrMember={isOwnerOrMember}
        />
      </div>

      {/* ── Teamleden ────────────────────────────────────────── */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users size={16} className="text-brand-500" />
          <h2 className="font-semibold text-slate-700">
            Teamleden ({(project.project_members?.length ?? 0) + 1})
          </h2>
        </div>
        <MembersPanel
          projectId={project.id}
          ownerId={project.owner_id}
          currentUserId={currentUserId}
          owner={project.owner as any}
          initialMembers={project.project_members ?? []}
        />
      </div>

      {/* ── Dossiers ─────────────────────────────────────────── */}
      <div className="card p-6">
        <DossierList projectId={project.id} />
      </div>

      {/* ── Activiteitenlog ──────────────────────────────────── */}
      <ActivityFeed projectId={project.id} title="Projectactiviteit" />
    </div>
  );
}
