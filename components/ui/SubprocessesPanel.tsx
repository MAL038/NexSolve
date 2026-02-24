"use client";

import { useState } from "react";
import {
  Plus, Trash2, Pencil, Check, X, ChevronDown,
  Circle, Loader, CheckCircle2, Ban, GripVertical,
} from "lucide-react";
import clsx from "clsx";
import type { Subprocess, SubprocessStatus } from "@/types";

// ─── Status config ──────────────────────────────────────────
const STATUS_CONFIG: Record<SubprocessStatus, {
  label: string;
  icon: React.ElementType;
  classes: string;
  dot: string;
}> = {
  "todo":        { label: "Te doen",      icon: Circle,       classes: "bg-slate-100 text-slate-500",  dot: "bg-slate-400"  },
  "in-progress": { label: "In uitvoering",icon: Loader,       classes: "bg-amber-50 text-amber-600",   dot: "bg-amber-400"  },
  "done":        { label: "Gereed",       icon: CheckCircle2, classes: "bg-brand-50 text-brand-600",   dot: "bg-brand-500"  },
  "blocked":     { label: "Geblokkeerd",    icon: Ban,          classes: "bg-red-50 text-red-500",       dot: "bg-red-400"    },
};

const STATUS_ORDER: SubprocessStatus[] = ["todo", "in-progress", "done", "blocked"];

// ─── Sub-components ─────────────────────────────────────────

function StatusPill({
  status, onChange, disabled,
}: {
  status: SubprocessStatus;
  onChange: (s: SubprocessStatus) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
        className={clsx(
          "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all",
          cfg.classes,
          !disabled && "hover:opacity-80 cursor-pointer"
        )}
      >
        <Icon size={11} className={status === "in-progress" ? "animate-spin" : ""} />
        {cfg.label}
        {!disabled && <ChevronDown size={10} />}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-20 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden min-w-[140px]">
            {STATUS_ORDER.map(s => {
              const c = STATUS_CONFIG[s];
              const I = c.icon;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => { onChange(s); setOpen(false); }}
                  className={clsx(
                    "flex items-center gap-2 w-full px-3 py-2 text-xs font-medium text-left transition-colors hover:bg-slate-50",
                    status === s ? "bg-slate-50" : ""
                  )}
                >
                  <I size={11} />
                  {c.label}
                  {status === s && <Check size={10} className="ml-auto text-brand-500" />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main Panel ─────────────────────────────────────────────
interface Props {
  projectId: string;
  initialSubprocesses: Subprocess[];
  isOwnerOrMember: boolean;
}

const EMPTY_FORM = { title: "", description: "", status: "todo" as SubprocessStatus };

export default function SubprocessesPanel({
  projectId,
  initialSubprocesses,
  isOwnerOrMember,
}: Props) {
  const [items,      setItems]      = useState<Subprocess[]>(initialSubprocesses);
  const [showForm,   setShowForm]   = useState(false);
  const [form,       setForm]       = useState(EMPTY_FORM);
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState("");
  const [editingId,  setEditingId]  = useState<string | null>(null);
  const [editForm,   setEditForm]   = useState(EMPTY_FORM);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Progress stats
  const done       = items.filter(i => i.status === "done").length;
  const total      = items.length;
  const pct        = total === 0 ? 0 : Math.round((done / total) * 100);

  // ── Create ────────────────────────────────────────────────
  async function handleCreate() {
    if (!form.title.trim()) { setError("Titel is verplicht"); return; }
    setSaving(true); setError("");
    const res = await fetch(`/api/projects/${projectId}/subprocesses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, position: items.length }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error ?? "Aanmaken mislukt"); return; }
    setItems(prev => [...prev, data as Subprocess]);
    setForm(EMPTY_FORM);
    setShowForm(false);
  }

  // ── Quick status toggle (click checkbox) ──────────────────
  async function toggleDone(item: Subprocess) {
    const newStatus: SubprocessStatus = item.status === "done" ? "todo" : "done";
    await patchItem(item.id, { status: newStatus });
  }

  // ── Status change via pill ────────────────────────────────
  async function changeStatus(id: string, status: SubprocessStatus) {
    await patchItem(id, { status });
  }

  // ── Open inline edit ──────────────────────────────────────
  function startEdit(item: Subprocess) {
    setEditingId(item.id);
    setEditForm({ title: item.title, description: item.description ?? "", status: item.status });
  }

  async function saveEdit(id: string) {
    if (!editForm.title.trim()) return;
    await patchItem(id, editForm);
    setEditingId(null);
  }

  async function patchItem(id: string, payload: Partial<Subprocess>) {
    // Optimistic update
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...payload } : i));
    const res = await fetch(`/api/projects/${projectId}/subprocesses/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      // Revert if failed — re-fetch would be cleaner but this is fine for now
      const data = await res.json();
      console.error("Patch failed:", data.error);
    }
  }

  // ── Delete ────────────────────────────────────────────────
  async function deleteItem(id: string) {
    setDeletingId(id);
    await fetch(`/api/projects/${projectId}/subprocesses/${id}`, { method: "DELETE" });
    setItems(prev => prev.filter(i => i.id !== id));
    setDeletingId(null);
  }

  // ─── Render ───────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* Progress bar */}
      {total > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>{done} of {total} completed</span>
            <span className="font-semibold text-slate-700">{pct}%</span>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-500 rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {/* Subprocess list */}
      {items.length === 0 && !showForm && (
        <div className="py-8 text-center text-slate-400 text-sm">
          Nog geen deeltaken.
        </div>
      )}

      <div className="flex flex-col gap-2">
        {items.map(item => {
          const isEditing = editingId === item.id;

          if (isEditing) {
            return (
              <div key={item.id} className="rounded-xl border-2 border-brand-300 bg-brand-50/30 p-4 space-y-3">
                <input
                  className="input text-sm font-medium"
                  value={editForm.title}
                  onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                  onKeyDown={e => { if (e.key === "Enter") saveEdit(item.id); if (e.key === "Escape") setEditingId(null); }}
                  autoFocus
                />
                <textarea
                  className="input text-sm resize-none"
                  rows={2}
                  placeholder="Omschrijving (optioneel)"
                  value={editForm.description}
                  onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                />
                <div className="flex items-center gap-2 justify-between">
                  <StatusPill status={editForm.status} onChange={s => setEditForm(f => ({ ...f, status: s }))} />
                  <div className="flex gap-2">
                    <button onClick={() => setEditingId(null)} className="btn-outline text-xs px-3 py-1.5">Cancel</button>
                    <button onClick={() => saveEdit(item.id)} className="btn-primary text-xs px-3 py-1.5">Save</button>
                  </div>
                </div>
              </div>
            );
          }

          const cfg = STATUS_CONFIG[item.status];

          return (
            <div
              key={item.id}
              className={clsx(
                "group flex items-start gap-3 px-4 py-3.5 rounded-xl border transition-all",
                item.status === "done"
                  ? "bg-slate-50 border-slate-100"
                  : "bg-white border-slate-100 hover:border-slate-200"
              )}
            >
              {/* Drag handle (visual only) */}
              <GripVertical size={14} className="mt-0.5 text-slate-300 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab" />

              {/* Checkbox quick-done */}
              <button
                type="button"
                onClick={() => toggleDone(item)}
                disabled={!isOwnerOrMember}
                className={clsx(
                  "flex-shrink-0 mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center transition-all",
                  item.status === "done"
                    ? "bg-brand-500 border-brand-500"
                    : "border-slate-300 hover:border-brand-400"
                )}
              >
                {item.status === "done" && <Check size={10} className="text-white" strokeWidth={3} />}
              </button>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className={clsx(
                  "text-sm font-medium leading-snug",
                  item.status === "done" ? "line-through text-slate-400" : "text-slate-800"
                )}>
                  {item.title}
                </p>
                {item.description && (
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">{item.description}</p>
                )}
              </div>

              {/* Status pill + actions */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <StatusPill
                  status={item.status}
                  onChange={s => changeStatus(item.id, s)}
                  disabled={!isOwnerOrMember}
                />

                {isOwnerOrMember && (
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => startEdit(item)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={() => deleteItem(item.id)}
                      disabled={deletingId === item.id}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      {deletingId === item.id
                        ? <Loader size={12} className="animate-spin" />
                        : <Trash2 size={12} />
                      }
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Deeltaak toevoegen form */}
      {showForm ? (
        <div className="rounded-xl border-2 border-brand-300 bg-brand-50/30 p-4 space-y-3">
          {error && (
            <p className="text-xs text-red-500 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">{error}</p>
          )}
          <input
            className="input text-sm"
            placeholder="Titel deeltaak *"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            onKeyDown={e => { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") { setShowForm(false); setError(""); } }}
            autoFocus
          />
          <textarea
            className="input text-sm resize-none"
            rows={2}
            placeholder="Omschrijving (optioneel)"
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          />
          <div className="flex items-center justify-between gap-2">
            <StatusPill status={form.status} onChange={s => setForm(f => ({ ...f, status: s }))} />
            <div className="flex gap-2">
              <button onClick={() => { setShowForm(false); setError(""); setForm(EMPTY_FORM); }} className="btn-outline text-xs px-3 py-1.5">
                Cancel
              </button>
              <button onClick={handleCreate} disabled={saving} className="btn-primary text-xs px-3 py-1.5">
                {saving ? "Toevoegen…" : "Deeltaak toevoegen"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        isOwnerOrMember && (
          <button
            onClick={() => setShowForm(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-slate-200 text-sm text-slate-400 hover:border-brand-300 hover:text-brand-500 hover:bg-brand-50/40 transition-all"
          >
            <Plus size={15} /> Deeltaak toevoegen
          </button>
        )
      )}
    </div>
  );
}
