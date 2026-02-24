"use client";

import { useState } from "react";
import { Save, X, Plus, Trash2, Check } from "lucide-react";
import clsx from "clsx";
import type { PlatformSettings } from "@/types";

const DEFAULT_STATUSES = [
  { key: "active",      label: "Actief",        color: "#22C55E" },
  { key: "in-progress", label: "In uitvoering",  color: "#F59E0B" },
  { key: "archived",    label: "Gearchiveerd",   color: "#6B7280" },
];

interface Props { initialSettings: PlatformSettings | null }

export default function InstellingenClient({ initialSettings }: Props) {
  const [companyName,  setCompanyName]  = useState(initialSettings?.company_name  ?? "NEXSOLVE");
  const [primaryColor, setPrimaryColor] = useState(initialSettings?.primary_color ?? "#0A6645");
  const [accentColor,  setAccentColor]  = useState(initialSettings?.accent_color  ?? "#69B296");
  const [logoUrl,      setLogoUrl]      = useState(initialSettings?.logo_url      ?? "");
  const [saving,       setSaving]       = useState(false);
  const [saved,        setSaved]        = useState(false);
  const [toast,        setToast]        = useState<{ msg: string; ok: boolean } | null>(null);
  const [statuses,     setStatuses]     = useState(DEFAULT_STATUSES);
  const [newStatus,    setNewStatus]    = useState({ label: "", color: "#3B82F6" });
  const [addingStatus, setAddingStatus] = useState(false);

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok }); setTimeout(() => setToast(null), 3000);
  }

  async function handleSave() {
    setSaving(true);
    const res = await fetch("/api/admin/settings", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company_name: companyName, primary_color: primaryColor, accent_color: accentColor, logo_url: logoUrl || null }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { showToast(data.error ?? "Fout bij opslaan", false); return; }
    setSaved(true); showToast("Instellingen opgeslagen");
    setTimeout(() => setSaved(false), 2500);
  }

  function addStatus() {
    if (!newStatus.label.trim()) return;
    const key = newStatus.label.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    setStatuses(prev => [...prev, { key, label: newStatus.label.trim(), color: newStatus.color }]);
    setNewStatus({ label: "", color: "#3B82F6" }); setAddingStatus(false);
  }

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-8">
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

      <div>
        <h1 className="text-2xl font-bold text-slate-800">Platforminstellingen</h1>
        <p className="text-sm text-slate-500 mt-0.5">Beheer bedrijfsnaam, huisstijl en projectstatussen</p>
      </div>

      {/* Bedrijfsidentiteit */}
      <section className="card p-6 space-y-5">
        <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          <span className="w-5 h-5 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center">
            <span className="w-2 h-2 rounded-full bg-brand-500" />
          </span>
          Bedrijfsidentiteit
        </h2>

        <div>
          <label className="label">Bedrijfsnaam</label>
          <input className="input" value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Jouw bedrijfsnaam" />
        </div>

        <div>
          <label className="label">Logo URL</label>
          <div className="flex gap-3">
            <input className="input flex-1" value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="https://jouwbedrijf.nl/logo.png" />
            {logoUrl && (
              <div className="w-12 h-12 rounded-xl border border-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center bg-slate-50">
                <img src={logoUrl} alt="logo preview" className="w-full h-full object-contain"
                  onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
              </div>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1.5">Voer een publiek toegankelijke afbeeldings-URL in</p>
        </div>
      </section>

      {/* Kleuren */}
      <section className="card p-6 space-y-5">
        <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          <span className="w-5 h-5 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center">
            <span className="w-2 h-2 rounded-full bg-brand-500" />
          </span>
          Huisstijlkleuren
        </h2>

        <div className="grid grid-cols-2 gap-4">
          {[
            { label: "Primaire kleur", value: primaryColor, set: setPrimaryColor },
            { label: "Accentkleur",    value: accentColor,  set: setAccentColor  },
          ].map(({ label, value, set }) => (
            <div key={label}>
              <label className="label">{label}</label>
              <div className="flex items-center gap-3 input">
                <input type="color" value={value} onChange={e => set(e.target.value)}
                  className="w-7 h-7 rounded-lg overflow-hidden cursor-pointer border border-slate-200 p-0 bg-transparent flex-shrink-0" />
                <input className="flex-1 bg-transparent text-sm font-mono text-slate-700 focus:outline-none"
                  value={value} onChange={e => set(e.target.value)} maxLength={7} />
                <div className="w-5 h-5 rounded-full border border-slate-200 flex-shrink-0" style={{ backgroundColor: value }} />
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
          <p className="text-xs text-slate-400 mb-3 font-medium">Voorbeeld</p>
          <div className="flex gap-3">
            <button className="px-4 py-2 rounded-xl text-sm font-semibold text-white" style={{ backgroundColor: primaryColor }}>Primaire knop</button>
            <button className="px-4 py-2 rounded-xl text-sm font-semibold text-white" style={{ backgroundColor: accentColor }}>Accent knop</button>
          </div>
        </div>
      </section>

      {/* Projectstatussen */}
      <section className="card p-6 space-y-4">
        <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          <span className="w-5 h-5 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center">
            <span className="w-2 h-2 rounded-full bg-brand-500" />
          </span>
          Projectstatussen
        </h2>

        <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden">
          {statuses.map((s, i) => (
            <div key={s.key} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50/60">
              <input type="color" value={s.color}
                onChange={e => setStatuses(prev => prev.map((x, j) => j === i ? { ...x, color: e.target.value } : x))}
                className="w-6 h-6 rounded-full overflow-hidden cursor-pointer border border-slate-200 p-0 bg-transparent flex-shrink-0" />
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border"
                style={{ backgroundColor: s.color + "18", color: s.color, borderColor: s.color + "40" }}>
                {s.label}
              </span>
              <span className="text-xs text-slate-400 font-mono">{s.key}</span>
              <button onClick={() => setStatuses(prev => prev.filter((_, j) => j !== i))}
                className="ml-auto p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          {addingStatus ? (
            <div className="flex items-center gap-3 px-4 py-3 bg-brand-50/40">
              <input type="color" value={newStatus.color} onChange={e => setNewStatus(p => ({ ...p, color: e.target.value }))}
                className="w-6 h-6 rounded-full overflow-hidden cursor-pointer border border-slate-200 p-0 bg-transparent flex-shrink-0" />
              <input autoFocus className="flex-1 text-sm text-slate-700 bg-transparent placeholder:text-slate-400 focus:outline-none"
                placeholder="Statusnaam (bijv. On hold)"
                value={newStatus.label} onChange={e => setNewStatus(p => ({ ...p, label: e.target.value }))}
                onKeyDown={e => { if (e.key === "Enter") addStatus(); if (e.key === "Escape") setAddingStatus(false); }} />
              <button onClick={addStatus} className="p-1.5 rounded-lg bg-brand-50 text-brand-600 hover:bg-brand-100"><Check size={13} /></button>
              <button onClick={() => setAddingStatus(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"><X size={13} /></button>
            </div>
          ) : (
            <button onClick={() => setAddingStatus(true)}
              className="w-full flex items-center gap-2 px-4 py-3 text-xs text-slate-400 hover:text-brand-600 hover:bg-brand-50/60 transition-colors">
              <Plus size={12} /> Status toevoegen
            </button>
          )}
        </div>
      </section>

      <div className="flex justify-end pt-2">
        <button onClick={handleSave} disabled={saving}
          className={clsx("btn-primary", saved && "!bg-brand-50 !text-brand-700 !shadow-none border border-brand-200", saving && "opacity-60")}>
          {saved ? <><Check size={16} /> Opgeslagen</> : saving ? "Opslaan..." : <><Save size={16} /> Instellingen opslaan</>}
        </button>
      </div>
    </div>
  );
}
