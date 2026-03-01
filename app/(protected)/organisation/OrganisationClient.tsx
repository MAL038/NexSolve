"use client";
// app/(protected)/organisation/OrganisationClient.tsx

import { useState } from "react";
import {
  Building2, Save, X, Check, Globe, Palette,
  ToggleLeft, ToggleRight, ShieldCheck, Crown,
  FolderKanban, Users, ClipboardList, CalendarDays,
  Clock, BarChart3,
} from "lucide-react";
import clsx from "clsx";
import type { Organisation, OrgModule } from "@/types";

interface ModuleRow {
  module: OrgModule;
  is_enabled: boolean;
}

interface Props {
  org:     Organisation | null;
  modules: ModuleRow[];
  orgRole: string;
}

const MODULE_META: Record<OrgModule, { label: string; description: string; icon: React.ElementType }> = {
  projects:  { label: "Projecten",       description: "Projectbeheer en voortgangsregistratie", icon: FolderKanban  },
  customers: { label: "Klanten",         description: "Klantbeheer en contacten",               icon: Building2     },
  intake:    { label: "Intake",          description: "Intakeformulieren voor nieuwe projecten", icon: ClipboardList },
  calendar:  { label: "Kalender",        description: "Verlof en beschikbaarheid bijhouden",     icon: CalendarDays  },
  planning:  { label: "Planning",        description: "Urenbegroting per project",               icon: BarChart3     },
  hrm:       { label: "HRM",             description: "Personeelsbeheer en contracten",          icon: Users         },
};

export default function OrganisationClient({ org, modules, orgRole }: Props) {
  const [name,         setName]         = useState(org?.name          ?? "");
  const [slug,         setSlug]         = useState(org?.slug          ?? "");
  const [logoUrl,      setLogoUrl]      = useState(org?.logo_url      ?? "");
  const [primaryColor, setPrimaryColor] = useState(org?.primary_color ?? "#0A6645");
  const [accentColor,  setAccentColor]  = useState(org?.accent_color  ?? "#69B296");

  const initialModules = Object.fromEntries(modules.map(m => [m.module, m.is_enabled])) as Record<OrgModule, boolean>;
  const [moduleState, setModuleState] = useState<Record<OrgModule, boolean>>(initialModules);

  const [saving,      setSaving]      = useState(false);
  const [savingMod,   setSavingMod]   = useState<OrgModule | null>(null);
  const [toast,       setToast]       = useState<{ msg: string; ok: boolean } | null>(null);

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleSaveOrg() {
    setSaving(true);
    const res = await fetch("/api/organisation", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, logo_url: logoUrl || null, primary_color: primaryColor, accent_color: accentColor }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { showToast(data.error ?? "Fout bij opslaan", false); return; }
    showToast("Organisatie opgeslagen");
  }

  async function handleToggleModule(module: OrgModule) {
    const newValue = !moduleState[module];
    setSavingMod(module);
    const res = await fetch("/api/organisation/modules", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ module, is_enabled: newValue }),
    });
    setSavingMod(null);
    if (!res.ok) { showToast("Fout bij opslaan module", false); return; }
    setModuleState(prev => ({ ...prev, [module]: newValue }));
    showToast(`${MODULE_META[module].label} ${newValue ? "ingeschakeld" : "uitgeschakeld"}`);
  }

  const isOwner = orgRole === "owner";

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-8">

      {/* Toast */}
      {toast && (
        <div className={clsx(
          "fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium shadow-lg transition-all",
          toast.ok ? "bg-white border-brand-200 text-brand-700" : "bg-white border-red-200 text-red-700"
        )}>
          <span className={clsx("w-2 h-2 rounded-full flex-shrink-0", toast.ok ? "bg-brand-500" : "bg-red-500")} />
          {toast.msg}
          <button onClick={() => setToast(null)} className="text-slate-400 hover:text-slate-600 ml-1">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Organisatie-instellingen</h1>
          <p className="text-sm text-slate-500 mt-0.5">Beheer naam, huisstijl en modules van jouw organisatie</p>
        </div>
        <span className={clsx(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border",
          isOwner
            ? "bg-amber-50 text-amber-700 border-amber-200"
            : "bg-brand-50 text-brand-700 border-brand-200"
        )}>
          {isOwner ? <Crown size={12} /> : <ShieldCheck size={12} />}
          {isOwner ? "Eigenaar" : "Admin"}
        </span>
      </div>

      {/* Identiteit */}
      <section className="card p-6 space-y-5">
        <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center">
            <Building2 size={13} className="text-brand-600" />
          </div>
          Organisatie-identiteit
        </h2>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="label">Organisatienaam</label>
            <input
              className="input"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Jouw organisatienaam"
            />
          </div>

          <div className="col-span-2">
            <label className="label">Slug</label>
            <div className="flex items-center input gap-2">
              <Globe size={14} className="text-slate-400 flex-shrink-0" />
              <input
                className="flex-1 bg-transparent text-sm text-slate-700 focus:outline-none font-mono"
                value={slug}
                readOnly
                placeholder="automatisch-gegenereerd"
              />
              <span className="text-xs text-slate-400 flex-shrink-0 font-mono">read-only</span>
            </div>
            <p className="text-xs text-slate-400 mt-1.5">Unieke identifier van je organisatie — niet aanpasbaar</p>
          </div>
        </div>

        <div>
          <label className="label">Logo URL</label>
          <div className="flex gap-3">
            <input
              className="input flex-1"
              value={logoUrl}
              onChange={e => setLogoUrl(e.target.value)}
              placeholder="https://jouwbedrijf.nl/logo.png"
            />
            <div className="w-12 h-12 rounded-xl border border-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center bg-slate-50">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="logo preview"
                  className="w-full h-full object-contain p-1"
                  onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                />
              ) : (
                <Building2 size={18} className="text-slate-300" />
              )}
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-1.5">Voer een publiek toegankelijke afbeeldings-URL in</p>
        </div>
      </section>

      {/* Huisstijl */}
      <section className="card p-6 space-y-5">
        <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center">
            <Palette size={13} className="text-brand-600" />
          </div>
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
                <input
                  type="color"
                  value={value}
                  onChange={e => set(e.target.value)}
                  className="w-7 h-7 rounded-lg overflow-hidden cursor-pointer border border-slate-200 p-0 bg-transparent flex-shrink-0"
                />
                <input
                  className="flex-1 bg-transparent text-sm font-mono text-slate-700 focus:outline-none"
                  value={value}
                  onChange={e => set(e.target.value)}
                  maxLength={7}
                />
                <div className="w-5 h-5 rounded-full border border-slate-200 flex-shrink-0" style={{ backgroundColor: value }} />
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
          <p className="text-xs text-slate-400 mb-3 font-medium">Voorbeeld</p>
          <div className="flex gap-3">
            <button className="px-4 py-2 rounded-xl text-sm font-semibold text-white" style={{ backgroundColor: primaryColor }}>
              Primaire knop
            </button>
            <button className="px-4 py-2 rounded-xl text-sm font-semibold text-white" style={{ backgroundColor: accentColor }}>
              Accent knop
            </button>
          </div>
        </div>
      </section>

      {/* Opslaan knop */}
      <div className="flex justify-end">
        <button
          onClick={handleSaveOrg}
          disabled={saving}
          className={clsx("btn-primary", saving && "opacity-60")}
        >
          {saving ? "Opslaan..." : <><Save size={16} /> Instellingen opslaan</>}
        </button>
      </div>

      {/* Modules */}
      <section className="card p-6 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center">
              <ToggleRight size={13} className="text-brand-600" />
            </div>
            Modules
          </h2>
          <p className="text-xs text-slate-400 mt-1 ml-8">Schakel modules in of uit voor jouw organisatie</p>
        </div>

        <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden">
          {(Object.keys(MODULE_META) as OrgModule[]).map(module => {
            const meta    = MODULE_META[module];
            const enabled = moduleState[module] ?? false;
            const loading = savingMod === module;
            const Icon    = meta.icon;

            return (
              <div key={module} className="flex items-center gap-4 px-4 py-3.5 hover:bg-slate-50/60 transition-colors">
                <div className={clsx(
                  "w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors",
                  enabled ? "bg-brand-50 border border-brand-100" : "bg-slate-100 border border-slate-200"
                )}>
                  <Icon size={15} className={enabled ? "text-brand-600" : "text-slate-400"} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={clsx("text-sm font-medium", enabled ? "text-slate-800" : "text-slate-400")}>
                    {meta.label}
                  </p>
                  <p className="text-xs text-slate-400 truncate">{meta.description}</p>
                </div>
                <button
                  onClick={() => handleToggleModule(module)}
                  disabled={loading}
                  className={clsx(
                    "flex-shrink-0 transition-all",
                    loading && "opacity-50 cursor-wait"
                  )}
                  title={enabled ? "Uitschakelen" : "Inschakelen"}
                >
                  {enabled
                    ? <ToggleRight size={28} className="text-brand-500" />
                    : <ToggleLeft  size={28} className="text-slate-300" />
                  }
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Plan info */}
      <section className="card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-700">Abonnement</h2>
            <p className="text-xs text-slate-400 mt-0.5">Huidig plan van jouw organisatie</p>
          </div>
          <span className={clsx(
            "px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider border",
            org?.plan === "pro"        && "bg-brand-50 text-brand-700 border-brand-200",
            org?.plan === "starter"    && "bg-blue-50 text-blue-700 border-blue-200",
            org?.plan === "enterprise" && "bg-amber-50 text-amber-700 border-amber-200",
            org?.plan === "trial"      && "bg-slate-100 text-slate-600 border-slate-200",
          )}>
            {org?.plan ?? "trial"}
          </span>
        </div>
      </section>

    </div>
  );
}
