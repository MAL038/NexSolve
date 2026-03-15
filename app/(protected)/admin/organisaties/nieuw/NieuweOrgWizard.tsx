"use client";
// app/(protected)/admin/organisaties/nieuw/NieuweOrgWizard.tsx
// 3-staps wizard voor superusers om een nieuwe organisatie aan te maken:
//   Stap 1 — Basisgegevens (naam, plan, owner)
//   Stap 2 — Sectorprofiel + module-selectie
//   Stap 3 — Bevestiging + aanmaken

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Building2, ChevronRight, ChevronLeft, Check, X,
  ToggleLeft, ToggleRight, Loader2, Sparkles,
  Briefcase, UtensilsCrossed, GitBranch, Sliders,
  FolderKanban, ListTodo, Users, CalendarDays,
  Clock, FileText, LayoutTemplate, BarChart3,
} from "lucide-react";
import clsx from "clsx";
import { MODULE_DEFINITIONS, defaultModuleSet, type ModuleKey } from "@/lib/moduleDefinitions";

// ── Sector presets ────────────────────────────────────────────

type Preset = {
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  modules: Record<ModuleKey, boolean>;
};

const ALL_OFF = Object.fromEntries(
  (Object.keys(MODULE_DEFINITIONS) as ModuleKey[]).map(k => [k, false])
) as Record<ModuleKey, boolean>;

const SECTOR_PRESETS: Record<string, Preset> = {
  consultancy: {
    label:       "Consultancy",
    description: "Projecten, klanten, taken, documenten en rapportages",
    icon:        Briefcase,
    color:       "bg-blue-50 text-blue-600 border-blue-200",
    modules:     { ...ALL_OFF, projects: true, tasks: true, customers: true, documents: true, reports: true },
  },
  horeca: {
    label:       "Horeca",
    description: "Teams, urenregistratie en kalender",
    icon:        UtensilsCrossed,
    color:       "bg-orange-50 text-orange-600 border-orange-200",
    modules:     { ...ALL_OFF, teams: true, time: true, calendar: true },
  },
  procesmanagement: {
    label:       "Procesmanagement",
    description: "Processen, taken, documenten en templates",
    icon:        GitBranch,
    color:       "bg-violet-50 text-violet-600 border-violet-200",
    modules:     { ...ALL_OFF, processes: true, tasks: true, documents: true, templates: true },
  },
  volledig: {
    label:       "Volledig",
    description: "Alle modules ingeschakeld",
    icon:        Sparkles,
    color:       "bg-brand-50 text-brand-600 border-brand-200",
    modules:     Object.fromEntries(
      (Object.keys(MODULE_DEFINITIONS) as ModuleKey[]).map(k => [k, true])
    ) as Record<ModuleKey, boolean>,
  },
  aangepast: {
    label:       "Aangepast",
    description: "Zelf modules kiezen",
    icon:        Sliders,
    color:       "bg-slate-100 text-slate-600 border-slate-200",
    modules:     defaultModuleSet(),
  },
};

// ── Module icons ──────────────────────────────────────────────

const MODULE_ICONS: Record<ModuleKey, React.ElementType> = {
  projects:  FolderKanban,
  tasks:     ListTodo,
  customers: Building2,
  teams:     Users,
  calendar:  CalendarDays,
  time:      Clock,
  processes: GitBranch,
  templates: LayoutTemplate,
  documents: FileText,
  reports:   BarChart3,
};

const MODULE_CATEGORIES: { label: string; keys: ModuleKey[] }[] = [
  { label: "Work Management",    keys: ["projects", "tasks", "customers", "teams"]  },
  { label: "Planning",           keys: ["calendar", "time"]                          },
  { label: "Process Management", keys: ["processes", "templates"]                    },
  { label: "Content",            keys: ["documents"]                                 },
  { label: "Insights",           keys: ["reports"]                                   },
];

// ── Types ─────────────────────────────────────────────────────

type Plan = "trial" | "starter" | "pro" | "enterprise";

interface WizardForm {
  name:     string;
  plan:     Plan;
  owner_id: string;
}

interface Profile {
  id: string;
  full_name: string;
  email: string;
}

interface Props {
  users: Profile[];
}

// ── Component ─────────────────────────────────────────────────

export default function NieuweOrgWizard({ users }: Props) {
  const router = useRouter();

  const [step,       setStep]       = useState(1);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");
  const [createdId,  setCreatedId]  = useState<string | null>(null);

  // Stap 1
  const [form, setForm] = useState<WizardForm>({
    name:     "",
    plan:     "trial",
    owner_id: "",
  });

  // Stap 2
  const [selectedPreset, setSelectedPreset] = useState<string>("consultancy");
  const [modules, setModules] = useState<Record<ModuleKey, boolean>>(
    SECTOR_PRESETS.consultancy.modules
  );

  const set = useCallback(<K extends keyof WizardForm>(key: K, val: WizardForm[K]) => {
    setForm(f => ({ ...f, [key]: val }));
    setError("");
  }, []);

  // ── Validatie stap 1 ───────────────────────────────────────

  function validateStep1(): boolean {
    if (!form.name.trim()) { setError("Naam is verplicht"); return false; }
    if (form.name.trim().length < 2) { setError("Naam moet minimaal 2 tekens zijn"); return false; }
    return true;
  }

  // ── Preset kiezen ──────────────────────────────────────────

  function handlePresetSelect(key: string) {
    setSelectedPreset(key);
    setModules({ ...SECTOR_PRESETS[key].modules });
  }

  function handleToggleModule(key: ModuleKey) {
    setModules(prev => ({ ...prev, [key]: !prev[key] }));
    // Als handmatig gesleuteld: switch naar "aangepast"
    setSelectedPreset("aangepast");
  }

  // ── Aanmaken ──────────────────────────────────────────────

  async function handleCreate() {
    setLoading(true);
    setError("");

    const res = await fetch("/api/admin/organisations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name:     form.name.trim(),
        plan:     form.plan,
        owner_id: form.owner_id || null,
        modules,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Aanmaken mislukt");
      return;
    }

    setCreatedId(data.id);
    setStep(4); // success screen
  }

  const activeCount = Object.values(modules).filter(Boolean).length;

  // ── Stap-indicators ───────────────────────────────────────

  const STEPS = [
    { n: 1, label: "Basisgegevens" },
    { n: 2, label: "Modules"       },
    { n: 3, label: "Bevestigen"    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-5">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-2 mb-1">
            <Building2 size={16} className="text-brand-500" />
            <span className="text-xs font-semibold uppercase tracking-widest text-brand-500">Superuser</span>
          </div>
          <h1 className="text-xl font-bold text-slate-800">Nieuwe organisatie</h1>
        </div>
      </div>

      {/* Stap-indicator */}
      {step <= 3 && (
        <div className="bg-white border-b border-slate-100 px-6 py-4">
          <div className="max-w-2xl mx-auto flex items-center gap-0">
            {STEPS.map((s, i) => (
              <div key={s.n} className="flex items-center">
                <div className="flex items-center gap-2">
                  <div className={clsx(
                    "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors",
                    step > s.n
                      ? "bg-brand-500 text-white"
                      : step === s.n
                      ? "bg-brand-600 text-white"
                      : "bg-slate-200 text-slate-400"
                  )}>
                    {step > s.n ? <Check size={12} /> : s.n}
                  </div>
                  <span className={clsx(
                    "text-sm font-medium hidden sm:block",
                    step === s.n ? "text-slate-800" : "text-slate-400"
                  )}>
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={clsx(
                    "w-12 h-px mx-3 transition-colors",
                    step > s.n ? "bg-brand-400" : "bg-slate-200"
                  )} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 px-6 py-8">
        <div className="max-w-2xl mx-auto space-y-6">

          {/* ── STAP 1: Basisgegevens ──────────────────────── */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="card p-6 space-y-5">
                <h2 className="text-sm font-semibold text-slate-700">Organisatiegegevens</h2>

                <div>
                  <label className="label">Organisatienaam *</label>
                  <input
                    className="input"
                    placeholder="Bijv. Acme BV"
                    value={form.name}
                    onChange={e => set("name", e.target.value)}
                    onKeyDown={e => e.key === "Enter" && validateStep1() && setStep(2)}
                    autoFocus
                  />
                </div>

                <div>
                  <label className="label">Abonnement</label>
                  <select
                    className="input"
                    value={form.plan}
                    onChange={e => set("plan", e.target.value as Plan)}
                  >
                    <option value="trial">Trial</option>
                    <option value="starter">Starter</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                  <p className="text-xs text-slate-400 mt-1">
                    Bepaalt welke functies beschikbaar zijn in de toekomst.
                  </p>
                </div>

                <div>
                  <label className="label">Owner (optioneel)</label>
                  <select
                    className="input"
                    value={form.owner_id}
                    onChange={e => set("owner_id", e.target.value)}
                  >
                    <option value="">— Geen owner instellen —</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.full_name} ({u.email})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-400 mt-1">
                    De owner kan later ook via de detailpagina worden ingesteld.
                  </p>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-3 rounded-xl">
                  <X size={14} /> {error}
                </div>
              )}
            </div>
          )}

          {/* ── STAP 2: Modules ────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-5">

              {/* Sector presets */}
              <div className="card p-5 space-y-3">
                <div>
                  <h2 className="text-sm font-semibold text-slate-700">Sectorprofiel</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Kies een profiel als startpunt. Je kunt daarna individuele modules aanpassen.
                  </p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Object.entries(SECTOR_PRESETS).map(([key, preset]) => {
                    const Icon     = preset.icon;
                    const selected = selectedPreset === key;
                    return (
                      <button
                        key={key}
                        onClick={() => handlePresetSelect(key)}
                        className={clsx(
                          "flex flex-col items-start gap-2 p-3.5 rounded-xl border text-left transition-all",
                          selected
                            ? "border-brand-400 bg-brand-50 shadow-sm"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                        )}
                      >
                        <div className={clsx("w-7 h-7 rounded-lg flex items-center justify-center border", preset.color)}>
                          <Icon size={14} />
                        </div>
                        <div>
                          <p className={clsx("text-xs font-semibold", selected ? "text-brand-700" : "text-slate-700")}>
                            {preset.label}
                          </p>
                          <p className="text-[10px] text-slate-400 leading-snug mt-0.5">
                            {preset.description}
                          </p>
                        </div>
                        {selected && (
                          <div className="ml-auto">
                            <Check size={12} className="text-brand-500" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Module-toggles */}
              <div className="card p-5 space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-700">Modules aanpassen</h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {activeCount} van {Object.keys(MODULE_DEFINITIONS).length} modules actief
                    </p>
                  </div>
                </div>

                {MODULE_CATEGORIES.map(cat => (
                  <div key={cat.label}>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                      {cat.label}
                    </p>
                    <div className="space-y-0">
                      {cat.keys.map(key => {
                        const Icon    = MODULE_ICONS[key];
                        const enabled = modules[key] ?? false;
                        return (
                          <div
                            key={key}
                            className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0"
                          >
                            <div className="flex items-center gap-2.5">
                              <Icon size={15} className={enabled ? "text-brand-500" : "text-slate-300"} />
                              <span className={clsx(
                                "text-sm",
                                enabled ? "text-slate-700 font-medium" : "text-slate-400"
                              )}>
                                {MODULE_DEFINITIONS[key].label}
                              </span>
                            </div>
                            <button
                              onClick={() => handleToggleModule(key)}
                              aria-label={`${MODULE_DEFINITIONS[key].label} ${enabled ? "uitschakelen" : "inschakelen"}`}
                            >
                              {enabled
                                ? <ToggleRight size={26} className="text-brand-500" />
                                : <ToggleLeft  size={26} className="text-slate-300" />}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── STAP 3: Bevestiging ────────────────────────── */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="card p-6 space-y-4">
                <h2 className="text-sm font-semibold text-slate-700">Samenvatting</h2>

                {/* Org-info */}
                <div className="space-y-2">
                  {[
                    { label: "Naam",        value: form.name },
                    { label: "Plan",        value: { trial: "Trial", starter: "Starter", pro: "Pro", enterprise: "Enterprise" }[form.plan] },
                    { label: "Owner",       value: form.owner_id ? users.find(u => u.id === form.owner_id)?.full_name ?? "—" : "Geen" },
                    { label: "Sectorprofiel", value: SECTOR_PRESETS[selectedPreset]?.label ?? "Aangepast" },
                    { label: "Actieve modules", value: `${activeCount} van ${Object.keys(MODULE_DEFINITIONS).length}` },
                  ].map(row => (
                    <div key={row.label} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{row.label}</span>
                      <span className="text-sm text-slate-700 font-medium">{row.value}</span>
                    </div>
                  ))}
                </div>

                {/* Module-chips */}
                <div>
                  <p className="text-xs text-slate-400 mb-2">Ingeschakelde modules</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(Object.keys(modules) as ModuleKey[])
                      .filter(k => modules[k])
                      .map(k => {
                        const Icon = MODULE_ICONS[k];
                        return (
                          <span
                            key={k}
                            className="text-xs px-2 py-1 rounded-lg bg-brand-50 text-brand-700 border border-brand-200 font-medium flex items-center gap-1"
                          >
                            <Icon size={10} />
                            {MODULE_DEFINITIONS[k].label}
                          </span>
                        );
                      })}
                    {activeCount === 0 && (
                      <span className="text-xs text-slate-400">Geen modules geselecteerd</span>
                    )}
                  </div>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-3 rounded-xl">
                  <X size={14} /> {error}
                </div>
              )}
            </div>
          )}

          {/* ── STAP 4: Succes ─────────────────────────────── */}
          {step === 4 && (
            <div className="card p-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-brand-100 flex items-center justify-center mx-auto">
                <Check size={28} className="text-brand-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800">{form.name} aangemaakt!</h2>
                <p className="text-sm text-slate-500 mt-1">
                  De organisatie is aangemaakt met {activeCount} module{activeCount !== 1 ? "s" : ""}.
                </p>
              </div>
              <div className="flex flex-col gap-2 pt-2">
                <button
                  onClick={() => router.push(`/admin/organisaties/${createdId}`)}
                  className="btn-primary justify-center w-full"
                >
                  Naar organisatiepagina →
                </button>
                <button
                  onClick={() => router.push("/admin/organisaties")}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 w-full"
                >
                  Terug naar overzicht
                </button>
              </div>
            </div>
          )}

          {/* ── Navigatieknoppen ──────────────────────────── */}
          {step <= 3 && (
            <div className="flex items-center justify-between">
              {step > 1 ? (
                <button
                  onClick={() => { setError(""); setStep(s => s - 1); }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50"
                >
                  <ChevronLeft size={15} /> Terug
                </button>
              ) : (
                <button
                  onClick={() => router.push("/admin/organisaties")}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50"
                >
                  <X size={15} /> Annuleren
                </button>
              )}

              {step < 3 ? (
                <button
                  onClick={() => {
                    if (step === 1 && !validateStep1()) return;
                    setError("");
                    setStep(s => s + 1);
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700"
                >
                  Volgende <ChevronRight size={15} />
                </button>
              ) : (
                <button
                  onClick={handleCreate}
                  disabled={loading}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-60"
                >
                  {loading
                    ? <><Loader2 size={14} className="animate-spin" /> Aanmaken...</>
                    : <><Check size={14} /> Organisatie aanmaken</>}
                </button>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
