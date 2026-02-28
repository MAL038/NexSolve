"use client";

/**
 * ProjectEditModal.tsx
 * Inline bewerkmodal voor bestaande projecten.
 * Toont een compacte modal met alle bewerkbare velden.
 */

import { useState, useEffect } from "react";
import {
  X, Save, Loader2, AlertCircle,
  FolderKanban, Layers, Building2, Users, Calendar,
  Check, ChevronRight, Search,
} from "lucide-react";
import clsx from "clsx";
import type { Project, ThemeWithChildren, Customer, Team } from "@/types";

type ProjectStatus = "active" | "in-progress" | "archived";

const STATUS_OPTIONS: { value: ProjectStatus; label: string; color: string; bg: string }[] = [
  { value: "active",      label: "Actief",        color: "text-brand-700", bg: "bg-brand-50  border-brand-200" },
  { value: "in-progress", label: "In uitvoering",  color: "text-amber-700", bg: "bg-amber-50  border-amber-200" },
  { value: "archived",    label: "Gearchiveerd",   color: "text-slate-500", bg: "bg-slate-100 border-slate-200" },
];

interface Props {
  project:   Project;
  hierarchy: ThemeWithChildren[];
  onClose:   () => void;
  onSaved:   (updated: Project) => void;
}

export default function ProjectEditModal({ project, hierarchy, onClose, onSaved }: Props) {
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");

  const [name,           setName]          = useState(project.name);
  const [description,    setDescription]   = useState(project.description ?? "");
  const [status,         setStatus]        = useState<ProjectStatus>(project.status);
  const [themeId,        setThemeId]       = useState<string | null>(project.theme_id);
  const [processId,      setProcessId]     = useState<string | null>(project.process_id);
  const [processTypeId,  setProcessTypeId] = useState<string | null>(project.process_type_id);
  const [customerId,     setCustomerId]    = useState<string | null>(project.customer_id);
  const [teamId,         setTeamId]        = useState<string | null>((project as any).team_id ?? null);
  const [startDate,      setStartDate]     = useState<string>((project as any).start_date ?? "");
  const [endDate,        setEndDate]       = useState<string>((project as any).end_date   ?? "");
  const [customerSearch, setCustomerSearch] = useState("");

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [teams,     setTeams]     = useState<Team[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/customers").then(r => r.ok ? r.json() : []),
      fetch("/api/teams").then(r => r.ok ? r.json() : []),
    ]).then(([c, t]) => {
      setCustomers(Array.isArray(c) ? c : []);
      setTeams(Array.isArray(t) ? t : []);
    });
  }, []);

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase())
  );

  const selectedTheme   = hierarchy.find(t => t.id === themeId);
  const selectedProcess = selectedTheme?.processes.find(p => p.id === processId);

  async function handleSave() {
    if (!name.trim()) { setError("Projectnaam is verplicht"); return; }
    if (endDate && startDate && endDate < startDate) {
      setError("Einddatum mag niet vóór startdatum liggen"); return;
    }
    setSaving(true); setError("");

    const res = await fetch(`/api/projects/${project.id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name:            name.trim(),
        description:     description.trim() || null,
        status,
        theme_id:        themeId        || null,
        process_id:      processId      || null,
        process_type_id: processTypeId  || null,
        customer_id:     customerId     || null,
        team_id:         teamId         || null,
        start_date:      startDate      || null,
        end_date:        endDate        || null,
      }),
    });
    const json = await res.json();
    setSaving(false);

    if (!res.ok) { setError(json.error ?? "Opslaan mislukt"); return; }
    onSaved(json as Project);
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-50 flex items-center justify-center">
              <FolderKanban size={16} className="text-brand-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Project bewerken</h3>
              <p className="text-xs text-slate-400 truncate max-w-[260px]">{project.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          {/* Naam */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Projectnaam *
            </label>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
            />
          </div>

          {/* Beschrijving */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Beschrijving
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Wat is het doel van dit project?"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 resize-none"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Status
            </label>
            <div className="flex gap-2">
              {STATUS_OPTIONS.map(s => (
                <button
                  key={s.value}
                  onClick={() => setStatus(s.value)}
                  className={clsx(
                    "flex-1 py-2 rounded-xl border text-sm font-medium transition-all",
                    status === s.value
                      ? `${s.bg} ${s.color} ring-2 ring-offset-1 ring-current`
                      : "border-slate-200 text-slate-500 hover:border-slate-300"
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Thema & Submodule */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              <Layers size={11} className="inline mr-1 mb-0.5" />Thema
            </label>
            <div className="grid grid-cols-2 gap-2">
              {hierarchy.map(t => (
                <button
                  key={t.id}
                  onClick={() => {
                    const next = themeId === t.id ? null : t.id;
                    setThemeId(next);
                    setProcessId(null);
                    setProcessTypeId(null);
                  }}
                  className={clsx(
                    "flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all text-left",
                    themeId === t.id
                      ? "bg-brand-50 border-brand-300 text-brand-700"
                      : "border-slate-200 text-slate-600 hover:border-brand-300 hover:bg-brand-50/40"
                  )}
                >
                  <span className={clsx(
                    "w-2 h-2 rounded-full flex-shrink-0",
                    themeId === t.id ? "bg-brand-500" : "bg-slate-300"
                  )} />
                  <span className="truncate">{t.name}</span>
                  {themeId === t.id && <Check size={12} className="ml-auto text-brand-600 flex-shrink-0" />}
                </button>
              ))}
            </div>

            {selectedTheme && selectedTheme.processes.length > 0 && (
              <div className="mt-2 space-y-1">
                {selectedTheme.processes.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setProcessId(processId === p.id ? null : p.id)}
                    className={clsx(
                      "w-full flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-all text-left",
                      processId === p.id
                        ? "bg-brand-50 border-brand-300 text-brand-700 font-medium"
                        : "border-slate-200 text-slate-600 hover:border-slate-300"
                    )}
                  >
                    <ChevronRight size={12} className="text-slate-400 flex-shrink-0" />
                    <span className="truncate">{p.name}</span>
                    {processId === p.id && <Check size={12} className="ml-auto text-brand-600 flex-shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Klant */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              <Building2 size={11} className="inline mr-1 mb-0.5" />Klant
            </label>
            <div className="relative mb-2">
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={customerSearch}
                onChange={e => setCustomerSearch(e.target.value)}
                placeholder="Klant zoeken…"
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
              />
            </div>
            <div className="max-h-44 overflow-y-auto space-y-1">
              <button
                onClick={() => setCustomerId(null)}
                className={clsx(
                  "w-full flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-all",
                  !customerId
                    ? "bg-slate-100 border-slate-300 text-slate-700 font-medium"
                    : "border-slate-200 text-slate-400 hover:border-slate-300"
                )}
              >
                <X size={12} className="text-slate-400" />
                <span className="flex-1 text-left">Geen klant</span>
                {!customerId && <Check size={12} className="text-slate-600" />}
              </button>
              {filteredCustomers.map(c => (
                <button
                  key={c.id}
                  onClick={() => setCustomerId(customerId === c.id ? null : c.id)}
                  className={clsx(
                    "w-full flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-all text-left",
                    customerId === c.id
                      ? "bg-brand-50 border-brand-300 text-brand-700"
                      : "border-slate-200 text-slate-600 hover:border-slate-300"
                  )}
                >
                  <Building2 size={12} className={customerId === c.id ? "text-brand-500" : "text-slate-400"} />
                  <span className="flex-1 truncate font-medium">{c.name}</span>
                  {customerId === c.id && <Check size={12} className="text-brand-600 flex-shrink-0" />}
                </button>
              ))}
            </div>
          </div>

          {/* Team */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              <Users size={11} className="inline mr-1 mb-0.5" />Team
            </label>
            <div className="space-y-1">
              <button
                onClick={() => setTeamId(null)}
                className={clsx(
                  "w-full flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-all",
                  !teamId
                    ? "bg-slate-100 border-slate-300 text-slate-700 font-medium"
                    : "border-slate-200 text-slate-400 hover:border-slate-300"
                )}
              >
                <X size={12} className="text-slate-400" />
                <span className="flex-1 text-left">Geen team</span>
                {!teamId && <Check size={12} className="text-slate-600" />}
              </button>
              {teams.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTeamId(teamId === t.id ? null : t.id)}
                  className={clsx(
                    "w-full flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-all text-left",
                    teamId === t.id
                      ? "bg-brand-50 border-brand-300 text-brand-700"
                      : "border-slate-200 text-slate-600 hover:border-slate-300"
                  )}
                >
                  <Users size={12} className={teamId === t.id ? "text-brand-500" : "text-slate-400"} />
                  <span className="flex-1 truncate font-medium">{t.name}</span>
                  {teamId === t.id && <Check size={12} className="text-brand-600 flex-shrink-0" />}
                </button>
              ))}
              {teams.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-2">Nog geen teams</p>
              )}
            </div>
          </div>

          {/* Periode */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              <Calendar size={11} className="inline mr-1 mb-0.5" />Projectperiode
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Startdatum</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => {
                    setStartDate(e.target.value);
                    if (endDate && e.target.value > endDate) setEndDate(e.target.value);
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Einddatum</label>
                <input
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm text-slate-500 hover:bg-slate-100 transition-colors"
          >
            Annuleren
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors shadow-sm disabled:opacity-60"
          >
            {saving ? (
              <><Loader2 size={14} className="animate-spin" /> Opslaan…</>
            ) : (
              <><Save size={14} /> Wijzigingen opslaan</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
