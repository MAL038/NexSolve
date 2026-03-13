"use client";

import React, { useState } from "react";
import { LayoutTemplate, Plus, Workflow, CheckSquare, X, Database, Loader2 } from "lucide-react";
import clsx from "clsx";
import TemplateCard from "@/components/templates/TemplateCard";
import EmptyState from "@/components/ui/EmptyState";

// ─── Types ────────────────────────────────────────────────────

interface ProcessOption {
  id:     string;
  name:   string;
  theme?: { id: string; name: string } | null;
}

interface Template {
  id:            string;
  name:          string;
  description?:  string | null;
  default_tasks: string[];
  created_at:    string;
  process?:      { id: string; name: string; theme?: { id: string; name: string } | null } | null;
}

interface Props {
  templates:  Template[];
  processes:  ProcessOption[];
  needsSetup: boolean;
}

// ─── Formulier initiaalstate ──────────────────────────────────
const EMPTY_FORM = {
  name:          "",
  description:   "",
  process_id:    "",
  default_tasks: [""],
};

// ─── Component ────────────────────────────────────────────────

export default function TemplatesClient({ templates: initial, processes, needsSetup }: Props) {
  const [templates, setTemplates] = useState<Template[]>(initial);
  const [showForm,  setShowForm]  = useState(false);
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  // ── Task-regel helpers ───────────────────────────────────────
  function setTask(index: number, value: string) {
    setForm(f => {
      const tasks = [...f.default_tasks];
      tasks[index] = value;
      return { ...f, default_tasks: tasks };
    });
  }
  function addTask()              { setForm(f => ({ ...f, default_tasks: [...f.default_tasks, ""] })); }
  function removeTask(index: number) {
    setForm(f => ({ ...f, default_tasks: f.default_tasks.filter((_, i) => i !== index) }));
  }

  // ── Opslaan ─────────────────────────────────────────────────
  async function handleSave() {
    if (!form.name.trim()) { setError("Naam is verplicht."); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/templates", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          name:          form.name.trim(),
          description:   form.description.trim() || null,
          process_id:    form.process_id || null,
          default_tasks: form.default_tasks.filter(t => t.trim()),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Onbekende fout."); return; }
      setTemplates(prev => [...prev, data]);
      setForm(EMPTY_FORM);
      setShowForm(false);
    } catch {
      setError("Er is iets misgegaan. Probeer het opnieuw.");
    } finally {
      setSaving(false);
    }
  }

  // ── DB setup notice ──────────────────────────────────────────
  if (needsSetup && templates.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Templates</h1>
          <p className="text-sm text-slate-500 mt-0.5">Herbruikbare projectblauwdrukken voor je consultancywerk</p>
        </div>
        <div className="card p-10 text-center max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <Database size={20} className="text-slate-400" />
          </div>
          <p className="font-semibold text-slate-700">Templates module nog niet geconfigureerd</p>
          <p className="text-slate-400 text-sm mt-2 max-w-sm mx-auto">
            De <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded font-mono">project_templates</code> tabel
            moet nog aangemaakt worden in Supabase. Voer het volgende SQL-commando uit in de Supabase dashboard:
          </p>
          <pre className="text-left text-xs bg-slate-900 text-emerald-400 rounded-xl p-4 mt-4 overflow-auto font-mono leading-relaxed">
{`create table project_templates (
  id            uuid primary key
                  default gen_random_uuid(),
  org_id        uuid references organisations(id)
                  on delete cascade,
  name          text not null,
  description   text,
  process_id    uuid references processes(id),
  default_tasks jsonb not null default '[]',
  created_by    uuid references profiles(id),
  is_active     boolean not null default true,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);
alter table project_templates
  enable row level security;`}
          </pre>
          <p className="text-xs text-slate-400 mt-3">
            Vernieuw de pagina nadat de tabel is aangemaakt.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Templates</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {templates.length} template{templates.length !== 1 ? "s" : ""} · herbruikbare projectblauwdrukken
          </p>
        </div>
        <button
          onClick={() => { setShowForm(true); setError(null); }}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[var(--brand-primary)] text-white text-sm font-medium hover:bg-[var(--brand-primary-hover)] transition-colors flex-shrink-0"
        >
          <Plus size={14} /> Nieuw template
        </button>
      </div>

      {/* ── Wat zijn templates? (info card bij lege staat) ───── */}
      {templates.length === 0 && !showForm && (
        <div className="card p-8 text-center">
          <div className="w-12 h-12 rounded-2xl bg-brand-50 flex items-center justify-center mx-auto mb-4">
            <LayoutTemplate size={22} className="text-brand-400" />
          </div>
          <p className="font-semibold text-slate-700">Nog geen templates aangemaakt</p>
          <p className="text-slate-400 text-sm mt-1 max-w-sm mx-auto">
            Projecttemplates zijn herbruikbare blauwdrukken. Koppel een proces, voeg standaardtaken
            toe en gebruik dit patroon bij elk nieuw project.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--brand-primary)] text-white text-sm font-semibold hover:bg-[var(--brand-primary-hover)] transition-colors mt-4"
          >
            <Plus size={13} /> Maak eerste template
          </button>
        </div>
      )}

      {/* ── Nieuw template formulier ─────────────────────────── */}
      {showForm && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <p className="font-semibold text-slate-700">Nieuw template</p>
            <button onClick={() => { setShowForm(false); setError(null); setForm(EMPTY_FORM); }}
              className="text-slate-400 hover:text-slate-600 transition-colors">
              <X size={16} />
            </button>
          </div>

          <div className="space-y-4">

            {/* Naam */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Naam *</label>
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="bijv. Standaard adviestraject"
                className="input w-full text-sm"
              />
            </div>

            {/* Beschrijving */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Beschrijving</label>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Optionele beschrijving van dit template..."
                rows={2}
                className="input w-full text-sm resize-none"
              />
            </div>

            {/* Proces koppeling */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                <span className="flex items-center gap-1.5"><Workflow size={12} /> Gekoppeld proces</span>
              </label>
              <select
                value={form.process_id}
                onChange={e => setForm(f => ({ ...f, process_id: e.target.value }))}
                className="input w-full text-sm"
              >
                <option value="">Geen koppeling</option>
                {processes.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.theme?.name ? `${p.theme.name} › ${p.name}` : p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Standaard taken */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                <span className="flex items-center gap-1.5"><CheckSquare size={12} /> Standaard taken</span>
              </label>
              <div className="space-y-2">
                {form.default_tasks.map((task, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs text-slate-300 font-mono w-5 text-right shrink-0">{i + 1}.</span>
                    <input
                      value={task}
                      onChange={e => setTask(i, e.target.value)}
                      placeholder={`Taak ${i + 1}`}
                      className="input flex-1 text-sm"
                    />
                    {form.default_tasks.length > 1 && (
                      <button onClick={() => removeTask(i)} className="text-slate-300 hover:text-red-400 transition-colors">
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={addTask}
                  className="flex items-center gap-1.5 text-xs text-brand-500 hover:text-brand-600 font-medium transition-colors mt-1"
                >
                  <Plus size={12} /> Taak toevoegen
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => { setShowForm(false); setError(null); setForm(EMPTY_FORM); }}
                className="px-3.5 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors border border-slate-200"
              >
                Annuleren
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--brand-primary)] text-white text-sm font-medium hover:bg-[var(--brand-primary-hover)] transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                {saving ? "Opslaan..." : "Template opslaan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Template grid ────────────────────────────────────── */}
      {templates.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map(t => (
            <TemplateCard
              key={t.id}
              id={t.id}
              name={t.name}
              description={t.description}
              taskCount={Array.isArray(t.default_tasks) ? t.default_tasks.filter(Boolean).length : 0}
              processName={t.process?.name}
              themeName={(t.process as any)?.theme?.name}
            />
          ))}
        </div>
      )}

      {/* ── Toelichting proces-koppeling ─────────────────────── */}
      {templates.length > 0 && processes.length > 0 && (
        <div className="card p-4 bg-slate-50/50 border-dashed">
          <p className="text-xs text-slate-500">
            <span className="font-semibold text-slate-600">Templates koppelen aan processen</span> · Bij projectaanmaak
            wordt het gekozen template automatisch gekoppeld aan het bijbehorende proces uit de procesbibliotheek.
            Standaardtaken worden als deeltaken aangemaakt.
          </p>
        </div>
      )}
    </div>
  );
}
