"use client";
// app/(protected)/admin/organisaties/[orgId]/OrgDetailClient.tsx
// Superuser-only detailpagina per organisatie met 4 tabs:
//   Overzicht | Modules | Leden | Instellingen

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Building2, ArrowLeft, Check, X, ToggleLeft, ToggleRight,
  Users, FolderKanban, ShieldCheck, Settings, TrendingUp,
  Crown, Trash2, AlertTriangle, Save, Loader2,
  FolderKanban as ProjectIcon,
  ListTodo, GitBranch, FileText, LayoutTemplate,
  CalendarDays, Clock, BarChart3,
} from "lucide-react";
import clsx from "clsx";
import { MODULE_DEFINITIONS, type ModuleKey } from "@/lib/moduleDefinitions";

// ── Types ─────────────────────────────────────────────────────

type OrgPlan = "trial" | "starter" | "pro" | "enterprise";

interface Org {
  id: string;
  name: string;
  slug: string;
  plan: OrgPlan;
  is_active: boolean;
  created_at: string;
  logo_url: string | null;
  primary_color: string | null;
  accent_color: string | null;
}

interface Member {
  user_id: string;
  org_role: string;
  joined_at: string;
  profiles: {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
    role: string;
  } | null;
}

interface Props {
  org: Org;
  modulesMap: Record<string, boolean>;
  members: Member[];
  projectCount: number;
}

// ── Constanten ────────────────────────────────────────────────

const PLAN_LABELS: Record<OrgPlan, string> = {
  trial: "Trial", starter: "Starter", pro: "Pro", enterprise: "Enterprise",
};

const PLAN_COLORS: Record<OrgPlan, string> = {
  trial:      "bg-slate-100 text-slate-600 border-slate-200",
  starter:    "bg-blue-50 text-blue-700 border-blue-200",
  pro:        "bg-brand-50 text-brand-700 border-brand-200",
  enterprise: "bg-amber-50 text-amber-700 border-amber-200",
};

const MODULE_ICONS: Record<ModuleKey, React.ElementType> = {
  projects:  ProjectIcon,
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

type Tab = "overzicht" | "modules" | "leden" | "instellingen";

// ── Component ─────────────────────────────────────────────────

export default function OrgDetailClient({ org, modulesMap, members, projectCount }: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("overzicht");
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  // Module state
  const [modules, setModules] = useState<Record<string, boolean>>(modulesMap);
  const [savingMod, setSavingMod] = useState<string | null>(null);

  // Instellingen state
  const [plan, setPlan] = useState<OrgPlan>(org.plan);
  const [isActive, setIsActive] = useState(org.is_active);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [showDeactivate, setShowDeactivate] = useState(false);

  // Leden state
  const [memberList, setMemberList] = useState<Member[]>(members);
  const [removingId, setRemovingId] = useState<string | null>(null);

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  // ── Module toggle ─────────────────────────────────────────

  async function handleToggleModule(key: ModuleKey) {
    const newValue = !modules[key];
    const newModules = { ...modules, [key]: newValue };
    setModules(newModules);
    setSavingMod(key);

    const res = await fetch(`/api/admin/organisations/${org.id}/modules`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modules: newModules }),
    });

    setSavingMod(null);

    if (!res.ok) {
      setModules(prev => ({ ...prev, [key]: !newValue })); // rollback
      showToast("Opslaan mislukt", false);
    } else {
      showToast(`${MODULE_DEFINITIONS[key].label} ${newValue ? "ingeschakeld" : "uitgeschakeld"}`);
    }
  }

  // ── Snelknoppen: alle aan / alle uit ─────────────────────

  async function setAllModules(enabled: boolean) {
    const newModules = Object.fromEntries(
      (Object.keys(MODULE_DEFINITIONS) as ModuleKey[]).map(k => [k, enabled])
    );
    setModules(newModules);

    const res = await fetch(`/api/admin/organisations/${org.id}/modules`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modules: newModules }),
    });

    if (!res.ok) {
      setModules(modulesMap); // rollback
      showToast("Opslaan mislukt", false);
    } else {
      showToast(enabled ? "Alle modules ingeschakeld" : "Alle modules uitgeschakeld");
    }
  }

  // ── Instellingen opslaan ──────────────────────────────────

  async function handleSaveSettings() {
    setSettingsSaving(true);

    const res = await fetch(`/api/admin/organisations/${org.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan, is_active: isActive }),
    });

    setSettingsSaving(false);

    if (!res.ok) {
      showToast("Opslaan mislukt", false);
    } else {
      showToast("Instellingen opgeslagen");
      if (!isActive) {
        // Kleine vertraging dan terug naar lijst
        setTimeout(() => router.push("/admin/organisaties"), 1500);
      }
    }
  }

  // ── Lid verwijderen ───────────────────────────────────────

  async function handleRemoveMember(userId: string, name: string) {
    if (!confirm(`${name} verwijderen uit deze organisatie?`)) return;
    setRemovingId(userId);

    const res = await fetch(`/api/org/${org.id}/invite`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId }),
    });

    setRemovingId(null);

    if (!res.ok) {
      showToast("Verwijderen mislukt", false);
    } else {
      showToast(`${name} verwijderd`);
      setMemberList(prev => prev.filter(m => m.user_id !== userId));
    }
  }

  const activeCount = Object.values(modules).filter(Boolean).length;
  const totalCount  = Object.keys(MODULE_DEFINITIONS).length;

  const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "overzicht",     label: "Overzicht",    icon: TrendingUp  },
    { id: "modules",       label: "Modules",      icon: ShieldCheck },
    { id: "leden",         label: "Leden",        icon: Users       },
    { id: "instellingen",  label: "Instellingen", icon: Settings    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Toast */}
      {toast && (
        <div className={clsx(
          "fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium flex items-center gap-2 animate-in slide-in-from-top-2",
          toast.ok ? "bg-white border-brand-200 text-brand-700" : "bg-red-50 border-red-200 text-red-700"
        )}>
          {toast.ok ? <Check size={14} /> : <X size={14} />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-5">
        <div className="max-w-5xl mx-auto">

          {/* Breadcrumb */}
          <Link
            href="/admin/organisaties"
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-brand-600 mb-4 w-fit"
          >
            <ArrowLeft size={12} /> Terug naar organisaties
          </Link>

          {/* Org header */}
          <div className="flex items-center gap-4 mb-5">
            <div className="w-12 h-12 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center flex-shrink-0">
              <Building2 size={20} className="text-brand-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-slate-800">{org.name}</h1>
                <span className={clsx(
                  "text-xs font-semibold px-2 py-0.5 rounded-lg border",
                  PLAN_COLORS[org.plan]
                )}>
                  {PLAN_LABELS[org.plan]}
                </span>
                {!org.is_active && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-lg border bg-red-50 text-red-600 border-red-200">
                    Inactief
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5 font-mono">{org.slug}</p>
            </div>
            {/* Snelstat */}
            <div className="hidden sm:flex items-center gap-6 text-right flex-shrink-0">
              <div>
                <p className="text-lg font-bold text-slate-800">{memberList.length}</p>
                <p className="text-xs text-slate-400">leden</p>
              </div>
              <div>
                <p className="text-lg font-bold text-slate-800">{projectCount}</p>
                <p className="text-xs text-slate-400">projecten</p>
              </div>
              <div>
                <p className="text-lg font-bold text-slate-800">{activeCount}/{totalCount}</p>
                <p className="text-xs text-slate-400">modules</p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                  activeTab === tab.id
                    ? "bg-brand-600 text-white"
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                )}
              >
                <tab.icon size={14} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-6 space-y-5">

        {/* ── OVERZICHT ──────────────────────────────────────── */}
        {activeTab === "overzicht" && (
          <div className="space-y-5">
            {/* Stat-kaarten */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Leden",           value: memberList.length, icon: Users        },
                { label: "Projecten",        value: projectCount,      icon: ProjectIcon  },
                { label: "Actieve modules",  value: `${activeCount}/${totalCount}`, icon: ShieldCheck },
              ].map(s => (
                <div key={s.label} className="card p-5 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center flex-shrink-0">
                    <s.icon size={16} className="text-brand-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-800">{s.value}</p>
                    <p className="text-xs text-slate-400">{s.label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Org-info */}
            <div className="card p-5 space-y-3">
              <h2 className="text-sm font-semibold text-slate-700">Organisatiegegevens</h2>
              {[
                { label: "Naam",       value: org.name },
                { label: "Slug",       value: org.slug },
                { label: "Plan",       value: PLAN_LABELS[org.plan] },
                { label: "Status",     value: org.is_active ? "Actief" : "Inactief" },
                { label: "Aangemaakt", value: new Date(org.created_at).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" }) },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{row.label}</span>
                  <span className="text-sm text-slate-700 font-medium">{row.value}</span>
                </div>
              ))}
            </div>

            {/* Module-overzicht chips */}
            <div className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-slate-700">Actieve modules</h2>
                <button
                  onClick={() => setActiveTab("modules")}
                  className="text-xs text-brand-600 hover:underline"
                >
                  Beheren →
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(MODULE_DEFINITIONS) as ModuleKey[]).map(key => {
                  const Icon = MODULE_ICONS[key];
                  return (
                    <span key={key} className={clsx(
                      "text-xs px-2.5 py-1 rounded-lg border font-medium flex items-center gap-1.5",
                      modules[key]
                        ? "bg-brand-50 text-brand-700 border-brand-200"
                        : "bg-slate-100 text-slate-400 border-slate-200"
                    )}>
                      <Icon size={11} />
                      {MODULE_DEFINITIONS[key].label}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── MODULES ────────────────────────────────────────── */}
        {activeTab === "modules" && (
          <div className="space-y-5">

            {/* Snelknoppen */}
            <div className="card p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-700">
                  {activeCount} van {totalCount} modules actief
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Wijzigingen worden direct opgeslagen en zijn direct zichtbaar voor gebruikers.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setAllModules(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Alles uit
                </button>
                <button
                  onClick={() => setAllModules(true)}
                  className="px-3 py-1.5 rounded-lg bg-brand-600 text-white text-xs font-medium hover:bg-brand-700 transition-colors"
                >
                  Alles aan
                </button>
              </div>
            </div>

            {/* Per categorie */}
            {MODULE_CATEGORIES.map(cat => (
              <div key={cat.label} className="card p-5">
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3">
                  {cat.label}
                </p>
                <div className="space-y-0">
                  {cat.keys.map(key => {
                    const Icon    = MODULE_ICONS[key];
                    const enabled = modules[key] ?? false;
                    const saving  = savingMod === key;
                    return (
                      <div
                        key={key}
                        className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0"
                      >
                        <div className="flex items-center gap-3">
                          <div className={clsx(
                            "w-8 h-8 rounded-lg flex items-center justify-center",
                            enabled ? "bg-brand-50" : "bg-slate-100"
                          )}>
                            <Icon size={15} className={enabled ? "text-brand-600" : "text-slate-400"} />
                          </div>
                          <div>
                            <p className={clsx("text-sm font-medium", enabled ? "text-slate-800" : "text-slate-400")}>
                              {MODULE_DEFINITIONS[key].label}
                            </p>
                            <p className="text-xs text-slate-400">
                              {enabled ? "Ingeschakeld" : "Uitgeschakeld"}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleToggleModule(key)}
                          disabled={saving}
                          className={clsx(
                            "transition-all",
                            saving && "opacity-50 pointer-events-none"
                          )}
                          aria-label={`${MODULE_DEFINITIONS[key].label} ${enabled ? "uitschakelen" : "inschakelen"}`}
                        >
                          {saving
                            ? <Loader2 size={24} className="text-slate-300 animate-spin" />
                            : enabled
                            ? <ToggleRight size={28} className="text-brand-500" />
                            : <ToggleLeft  size={28} className="text-slate-300" />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── LEDEN ──────────────────────────────────────────── */}
        {activeTab === "leden" && (
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-700">{memberList.length} leden</p>
                <p className="text-xs text-slate-400 mt-0.5">Leden van deze organisatie</p>
              </div>
            </div>
            <div className="divide-y divide-slate-100">
              {memberList.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-10">Geen leden gevonden</p>
              )}
              {memberList.map(m => {
                const profile = m.profiles;
                const name    = profile?.full_name || profile?.email || "Onbekend";
                const isOwner = m.org_role === "owner";
                return (
                  <div key={m.user_id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50/60">
                    <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center text-sm font-bold text-brand-700 flex-shrink-0">
                      {name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{name}</p>
                      <p className="text-xs text-slate-400 truncate">{profile?.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={clsx(
                        "text-xs font-semibold px-2 py-0.5 rounded-lg border flex-shrink-0",
                        isOwner
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-slate-100 text-slate-500 border-slate-200"
                      )}>
                        {isOwner && <Crown size={10} className="inline mr-1" />}
                        {m.org_role}
                      </span>
                      {!isOwner && (
                        <button
                          onClick={() => handleRemoveMember(m.user_id, name)}
                          disabled={removingId === m.user_id}
                          className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                        >
                          {removingId === m.user_id
                            ? <Loader2 size={13} className="animate-spin" />
                            : <Trash2 size={13} />}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── INSTELLINGEN ───────────────────────────────────── */}
        {activeTab === "instellingen" && (
          <div className="space-y-5">

            {/* Plan */}
            <div className="card p-5 space-y-4">
              <h2 className="text-sm font-semibold text-slate-700">Abonnement</h2>
              <div>
                <label className="label">Plan</label>
                <select
                  value={plan}
                  onChange={e => setPlan(e.target.value as OrgPlan)}
                  className="input"
                >
                  {(["trial", "starter", "pro", "enterprise"] as OrgPlan[]).map(p => (
                    <option key={p} value={p}>{PLAN_LABELS[p]}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Opslaan */}
            <button
              onClick={handleSaveSettings}
              disabled={settingsSaving}
              className="btn-primary w-full justify-center"
            >
              {settingsSaving
                ? <><Loader2 size={14} className="animate-spin" /> Opslaan...</>
                : <><Save size={14} /> Wijzigingen opslaan</>}
            </button>

            {/* Gevaarlijke zone */}
            <div className="card border-red-200 p-5 space-y-3">
              <h2 className="text-sm font-semibold text-red-600 flex items-center gap-2">
                <AlertTriangle size={14} /> Gevaarlijke acties
              </h2>
              <p className="text-xs text-slate-500">
                Deactiveren verbergt de organisatie voor haar gebruikers. Activeren maakt de organisatie
                weer toegankelijk. De data blijft bewaard.
              </p>
              {!showDeactivate ? (
                <button
                  onClick={() => setShowDeactivate(true)}
                  className={clsx(
                    "px-4 py-2.5 rounded-xl text-sm font-semibold border transition-colors",
                    org.is_active
                      ? "border-red-200 text-red-600 hover:bg-red-50"
                      : "border-brand-200 text-brand-600 hover:bg-brand-50"
                  )}
                >
                  {isActive ? "Organisatie deactiveren" : "Organisatie activeren"}
                </button>
              ) : (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 space-y-3">
                  <p className="text-sm text-red-700 font-medium">
                    Weet je zeker dat je deze organisatie wilt {isActive ? "deactiveren" : "activeren"}?
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setIsActive(!isActive); setShowDeactivate(false); handleSaveSettings(); }}
                      className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700"
                    >
                      Bevestigen
                    </button>
                    <button
                      onClick={() => setShowDeactivate(false)}
                      className="px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50"
                    >
                      Annuleren
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
