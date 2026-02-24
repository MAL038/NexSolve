"use client";

import { useState } from "react";
import { Layers, Plus, Pencil, Trash2, Check, X, ChevronRight, ChevronDown } from "lucide-react";
import clsx from "clsx";
import type { ThemeWithChildren } from "@/types";

interface Props { initialHierarchy: ThemeWithChildren[] }
type EditState = { id: string; name: string; type: "theme" | "process" } | null;
type AddState  = { themeId?: string; type: "theme" | "process" } | null;

export default function ThemasClient({ initialHierarchy }: Props) {
  const [hierarchy, setHierarchy] = useState<ThemeWithChildren[]>(initialHierarchy);
  const [expanded,  setExpanded]  = useState<Set<string>>(new Set());
  const [editing,   setEditing]   = useState<EditState>(null);
  const [adding,    setAdding]    = useState<AddState>(null);
  const [addName,   setAddName]   = useState("");
  const [editName,  setEditName]  = useState("");
  const [saving,    setSaving]    = useState(false);
  const [toast,     setToast]     = useState<{ msg: string; ok: boolean } | null>(null);

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  function startEdit(id: string, name: string, type: "theme" | "process") {
    setEditing({ id, name, type }); setEditName(name); setAdding(null);
  }

  function startAdd(type: "theme" | "process", themeId?: string) {
    setAdding({ type, themeId }); setAddName(""); setEditing(null);
    if (themeId) setExpanded(prev => new Set([...prev, themeId]));
  }

  async function saveEdit() {
    if (!editing || !editName.trim()) return;
    setSaving(true);
    const url = editing.type === "theme" ? `/api/admin/themes/${editing.id}` : `/api/admin/processes/${editing.id}`;
    const res = await fetch(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: editName.trim() }) });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { showToast(data.error ?? "Fout", false); return; }
    if (editing.type === "theme") {
      setHierarchy(prev => prev.map(t => t.id === editing.id ? { ...t, name: data.name } : t));
    } else {
      setHierarchy(prev => prev.map(t => ({ ...t, processes: t.processes.map(p => p.id === editing.id ? { ...p, name: data.name } : p) })));
    }
    showToast("Naam bijgewerkt"); setEditing(null);
  }

  async function saveAdd() {
    if (!adding || !addName.trim()) return;
    setSaving(true);
    const url  = adding.type === "theme" ? "/api/admin/themes" : "/api/admin/processes";
    const body = adding.type === "theme" ? { name: addName.trim() } : { name: addName.trim(), theme_id: adding.themeId };
    const res  = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { showToast(data.error ?? "Fout", false); return; }
    if (adding.type === "theme") {
      setHierarchy(prev => [...prev, { ...data, processes: [] }]);
    } else {
      setHierarchy(prev => prev.map(t => t.id === adding.themeId ? { ...t, processes: [...t.processes, data] } : t));
    }
    showToast(`${adding.type === "theme" ? "Thema" : "Submodule"} aangemaakt`);
    setAdding(null); setAddName("");
  }

  async function deleteItem(id: string, type: "theme" | "process") {
    const url = type === "theme" ? `/api/admin/themes/${id}` : `/api/admin/processes/${id}`;
    const res = await fetch(url, { method: "DELETE" });
    if (!res.ok) { const d = await res.json(); showToast(d.error ?? "Fout", false); return; }
    if (type === "theme") {
      setHierarchy(prev => prev.filter(t => t.id !== id));
    } else {
      setHierarchy(prev => prev.map(t => ({ ...t, processes: t.processes.filter(p => p.id !== id) })));
    }
    showToast(`${type === "theme" ? "Thema" : "Submodule"} verwijderd`);
  }

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">

      {toast && (
        <div className={clsx(
          "fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium shadow-lg",
          toast.ok ? "bg-white border-brand-200 text-brand-700" : "bg-white border-red-200 text-red-700"
        )}>
          <span className={clsx("w-2 h-2 rounded-full flex-shrink-0", toast.ok ? "bg-brand-500" : "bg-red-500")} />
          {toast.msg}
          <button onClick={() => setToast(null)} className="text-slate-400 hover:text-slate-600"><X size={14} /></button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Themas & submodules</h1>
          <p className="text-sm text-slate-500 mt-0.5">{hierarchy.length} themas</p>
        </div>
        <button onClick={() => startAdd("theme")} className="btn-primary">
          <Plus size={15} /> Thema toevoegen
        </button>
      </div>

      {adding?.type === "theme" && (
        <div className="flex items-center gap-3 p-4 rounded-xl border-2 border-brand-200 bg-brand-50">
          <Layers size={16} className="text-brand-500 flex-shrink-0" />
          <input
            autoFocus
            className="flex-1 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
            placeholder="Naam van het nieuwe thema..."
            value={addName}
            onChange={e => setAddName(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") saveAdd(); if (e.key === "Escape") setAdding(null); }}
          />
          <button onClick={saveAdd} disabled={saving || !addName.trim()} className="btn-primary !py-1.5 !px-3 !text-xs disabled:opacity-40">
            <Check size={13} /> Toevoegen
          </button>
          <button onClick={() => setAdding(null)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white transition-colors">
            <X size={14} />
          </button>
        </div>
      )}

      <div className="space-y-2">
        {hierarchy.map(theme => {
          const isExpanded = expanded.has(theme.id);
          const isEditing  = editing?.id === theme.id && editing.type === "theme";
          return (
            <div key={theme.id} className="card overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3.5 group">
                <button onClick={() => setExpanded(prev => { const s = new Set(prev); s.has(theme.id) ? s.delete(theme.id) : s.add(theme.id); return s; })}
                  className="text-slate-400 hover:text-slate-700 transition-colors flex-shrink-0">
                  {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
                <div className="w-7 h-7 rounded-lg bg-violet-50 border border-violet-100 flex items-center justify-center flex-shrink-0">
                  <Layers size={14} className="text-violet-500" />
                </div>

                {isEditing ? (
                  <input autoFocus className="flex-1 text-sm font-semibold text-slate-800 bg-transparent focus:outline-none border-b-2 border-brand-400"
                    value={editName} onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditing(null); }} />
                ) : (
                  <span className="flex-1 text-sm font-semibold text-slate-800">{theme.name}</span>
                )}

                <span className="text-xs text-slate-400">{theme.processes?.length ?? 0} submodules</span>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {isEditing ? (
                    <>
                      <button onClick={saveEdit} disabled={saving} className="btn-primary !py-1 !px-2.5 !text-xs"><Check size={12} /> Opslaan</button>
                      <button onClick={() => setEditing(null)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"><X size={12} /></button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => startAdd("process", theme.id)} title="Submodule toevoegen"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"><Plus size={13} /></button>
                      <button onClick={() => startEdit(theme.id, theme.name, "theme")}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"><Pencil size={13} /></button>
                      <button onClick={() => deleteItem(theme.id, "theme")}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 size={13} /></button>
                    </>
                  )}
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-slate-100 ml-10">
                  {theme.processes?.map(proc => {
                    const isProcEditing = editing?.id === proc.id && editing.type === "process";
                    return (
                      <div key={proc.id} className="flex items-center gap-3 px-4 py-3 border-b border-slate-50 last:border-0 group hover:bg-slate-50/60">
                        <span className="w-1.5 h-1.5 rounded-full bg-violet-300 flex-shrink-0" />
                        {isProcEditing ? (
                          <input autoFocus className="flex-1 text-sm text-slate-800 bg-transparent focus:outline-none border-b-2 border-brand-400"
                            value={editName} onChange={e => setEditName(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditing(null); }} />
                        ) : (
                          <span className="flex-1 text-sm text-slate-600">{proc.name}</span>
                        )}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {isProcEditing ? (
                            <>
                              <button onClick={saveEdit} disabled={saving} className="btn-primary !py-1 !px-2.5 !text-xs"><Check size={12} /></button>
                              <button onClick={() => setEditing(null)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"><X size={12} /></button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => startEdit(proc.id, proc.name, "process")} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"><Pencil size={12} /></button>
                              <button onClick={() => deleteItem(proc.id, "process")} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={12} /></button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {adding?.type === "process" && adding.themeId === theme.id ? (
                    <div className="flex items-center gap-3 px-4 py-3 bg-brand-50/40">
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-400 flex-shrink-0" />
                      <input autoFocus
                        className="flex-1 text-sm text-slate-800 bg-transparent placeholder:text-slate-400 focus:outline-none"
                        placeholder="Naam van de submodule..."
                        value={addName} onChange={e => setAddName(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") saveAdd(); if (e.key === "Escape") setAdding(null); }} />
                      <button onClick={saveAdd} disabled={saving || !addName.trim()} className="btn-primary !py-1 !px-2.5 !text-xs disabled:opacity-40"><Check size={12} /></button>
                      <button onClick={() => setAdding(null)} className="p-1 rounded-lg text-slate-400 hover:bg-white"><X size={12} /></button>
                    </div>
                  ) : (
                    <button onClick={() => startAdd("process", theme.id)}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-slate-400 hover:text-brand-600 hover:bg-brand-50/60 transition-colors">
                      <Plus size={12} /> Submodule toevoegen
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {hierarchy.length === 0 && (
          <div className="card p-16 text-center">
            <Layers size={32} className="mx-auto mb-3 text-slate-300" />
            <p className="text-sm text-slate-400">Nog geen themas aangemaakt</p>
          </div>
        )}
      </div>
    </div>
  );
}
