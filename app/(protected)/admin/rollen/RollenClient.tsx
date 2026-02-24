"use client";

import { useState } from "react";
import { ShieldCheck, Plus, Pencil, Trash2, X, Check, ToggleLeft, ToggleRight } from "lucide-react";
import clsx from "clsx";
import type { CustomRole } from "@/types";

const PRESET_COLORS = ["#0A6645","#3B82F6","#8B5CF6","#F59E0B","#EF4444","#10B981","#F97316","#6B7280","#EC4899","#14B8A6"];

interface Props { initialRoles: CustomRole[] }

export default function RollenClient({ initialRoles }: Props) {
  const [roles,   setRoles]   = useState<CustomRole[]>(initialRoles);
  const [saving,  setSaving]  = useState<string | null>(null);
  const [toast,   setToast]   = useState<{ msg: string; ok: boolean } | null>(null);
  const [editing, setEditing] = useState<{ id: string; name: string; color: string } | null>(null);
  const [adding,  setAdding]  = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor,setNewColor]= useState(PRESET_COLORS[0]);

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  async function saveNew() {
    if (!newName.trim()) return;
    setSaving("new");
    const res  = await fetch("/api/admin/roles", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newName.trim(), color: newColor }) });
    const data = await res.json();
    setSaving(null);
    if (!res.ok) { showToast(data.error ?? "Fout", false); return; }
    setRoles(prev => [...prev, data]);
    setAdding(false); setNewName(""); setNewColor(PRESET_COLORS[0]);
    showToast("Rol aangemaakt");
  }

  async function saveEdit() {
    if (!editing) return;
    setSaving(editing.id);
    const res  = await fetch(`/api/admin/roles/${editing.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: editing.name, color: editing.color }) });
    const data = await res.json();
    setSaving(null);
    if (!res.ok) { showToast(data.error ?? "Fout", false); return; }
    setRoles(prev => prev.map(r => r.id === editing.id ? data : r));
    setEditing(null); showToast("Rol bijgewerkt");
  }

  async function toggleActive(role: CustomRole) {
    setSaving(role.id);
    const res  = await fetch(`/api/admin/roles/${role.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_active: !role.is_active }) });
    const data = await res.json();
    setSaving(null);
    if (!res.ok) { showToast(data.error ?? "Fout", false); return; }
    setRoles(prev => prev.map(r => r.id === role.id ? data : r));
    showToast(role.is_active ? "Rol uitgeschakeld" : "Rol ingeschakeld");
  }

  async function deleteRole(id: string) {
    setSaving(id);
    const res = await fetch(`/api/admin/roles/${id}`, { method: "DELETE" });
    setSaving(null);
    if (!res.ok) { const d = await res.json(); showToast(d.error ?? "Fout", false); return; }
    setRoles(prev => prev.filter(r => r.id !== id)); showToast("Rol verwijderd");
  }

  function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
    return (
      <div className="flex items-center gap-2 flex-wrap mt-1">
        {PRESET_COLORS.map(c => (
          <button key={c} type="button" onClick={() => onChange(c)}
            className={clsx("w-6 h-6 rounded-full transition-all border-2", value === c ? "border-slate-600 scale-110" : "border-transparent hover:scale-105")}
            style={{ backgroundColor: c }} />
        ))}
        <input type="color" value={value} onChange={e => onChange(e.target.value)}
          className="w-6 h-6 rounded-full overflow-hidden cursor-pointer border-0 bg-transparent p-0" title="Eigen kleur" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">
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
          <h1 className="text-2xl font-bold text-slate-800">Projectrollen</h1>
          <p className="text-sm text-slate-500 mt-0.5">Definieer de rollen voor projectteamleden</p>
        </div>
        <button onClick={() => { setAdding(true); setEditing(null); }} className="btn-primary">
          <Plus size={15} /> Rol toevoegen
        </button>
      </div>

      {adding && (
        <div className="card p-5 border-2 border-brand-200 space-y-4">
          <h3 className="text-sm font-semibold text-slate-700">Nieuwe rol</h3>
          <div>
            <label className="label">Naam</label>
            <input autoFocus className="input"
              placeholder="bijv. Projectleider"
              value={newName} onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") saveNew(); if (e.key === "Escape") setAdding(false); }} />
          </div>
          <div>
            <label className="label">Kleur</label>
            <ColorPicker value={newColor} onChange={setNewColor} />
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setAdding(false)} className="btn-outline">Annuleren</button>
            <button onClick={saveNew} disabled={saving === "new" || !newName.trim()} className="btn-primary disabled:opacity-40">
              {saving === "new" ? "Opslaan..." : "Aanmaken"}
            </button>
          </div>
        </div>
      )}

      <div className="card overflow-hidden divide-y divide-slate-100">
        {roles.length === 0 && (
          <div className="py-16 text-center">
            <ShieldCheck size={32} className="mx-auto mb-3 text-slate-300" />
            <p className="text-sm text-slate-400">Nog geen rollen aangemaakt</p>
          </div>
        )}
        {roles.map(role => {
          const isEditing = editing?.id === role.id;
          const isLoading = saving === role.id;
          return (
            <div key={role.id} className={clsx("px-5 py-4 space-y-3 transition-colors", !role.is_active && "opacity-50 bg-slate-50/40", isLoading && "pointer-events-none")}>
              {isEditing ? (
                <div className="space-y-3">
                  <input autoFocus className="input"
                    value={editing.name}
                    onChange={e => setEditing(prev => prev ? { ...prev, name: e.target.value } : null)}
                    onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditing(null); }} />
                  <div>
                    <label className="label">Kleur</label>
                    <ColorPicker value={editing.color} onChange={c => setEditing(prev => prev ? { ...prev, color: c } : null)} />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setEditing(null)} className="btn-outline !py-1.5 !text-xs">Annuleren</button>
                    <button onClick={saveEdit} className="btn-primary !py-1.5 !text-xs">Opslaan</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: role.color }} />
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border"
                    style={{ backgroundColor: role.color + "18", color: role.color, borderColor: role.color + "40" }}>
                    {role.name}
                  </span>
                  <span className={clsx("text-xs px-2 py-0.5 rounded-full font-medium",
                    role.is_active ? "text-brand-600 bg-brand-50" : "text-slate-400 bg-slate-100"
                  )}>
                    {role.is_active ? "Actief" : "Uit"}
                  </span>
                  <div className="flex items-center gap-1 ml-auto">
                    <button onClick={() => toggleActive(role)} title={role.is_active ? "Uitschakelen" : "Inschakelen"}
                      className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors">
                      {role.is_active ? <ToggleRight size={16} className="text-brand-500" /> : <ToggleLeft size={16} />}
                    </button>
                    <button onClick={() => { setEditing({ id: role.id, name: role.name, color: role.color }); setAdding(false); }}
                      className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => deleteRole(role.id)}
                      className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
