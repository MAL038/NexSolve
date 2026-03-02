"use client";
// app/(protected)/beheer/BeheerClient.tsx

import { useState } from "react";
import {
  Building2, Save, Check, X, Globe, Palette,
  ToggleLeft, ToggleRight, Crown, FolderKanban,
  Users, ClipboardList, CalendarDays, Clock,
  BarChart3, UserPlus, Mail, Trash2, Activity,
  ShieldCheck, TrendingUp,
} from "lucide-react";
import clsx from "clsx";
import { formatDate } from "@/lib/time";

type OrgPlan   = "trial" | "starter" | "pro" | "enterprise";
type OrgModule = "projects" | "customers" | "intake" | "planning" | "hrm" | "calendar";

interface Organisation {
  id: string; name: string; slug: string; logo_url: string | null;
  primary_color: string; accent_color: string; plan: OrgPlan;
  is_active: boolean; created_at: string;
}
interface ModuleRow  { module: OrgModule; is_enabled: boolean }
interface OrgMember  {
  role: string; joined_at: string;
  profile: { id: string; full_name: string; email: string; avatar_url: string | null; is_active: boolean }
}
interface ActivityRow {
  id: string; action: string; entity_type: string; entity_name: string;
  created_at: string;
  actor: { id: string; full_name: string; avatar_url: string | null }
}

interface Props {
  orgId:        string;
  org:          Organisation | null;
  modules:      ModuleRow[];
  members:      OrgMember[];
  activity:     ActivityRow[];
  projectCount: number;
}

const MODULE_META: Record<OrgModule, { label: string; icon: React.ElementType }> = {
  projects:  { label: "Projecten",  icon: FolderKanban  },
  customers: { label: "Klanten",    icon: Building2     },
  intake:    { label: "Intake",     icon: ClipboardList },
  calendar:  { label: "Kalender",   icon: CalendarDays  },
  planning:  { label: "Planning",   icon: BarChart3     },
  hrm:       { label: "HRM",        icon: Users         },
};

const PLAN_LABEL: Record<OrgPlan, string> = {
  trial: "Trial", starter: "Starter", pro: "Pro", enterprise: "Enterprise",
};

type Tab = "overzicht" | "leden" | "instellingen" | "activiteit";

export default function BeheerClient({ org, orgId, modules, members, activity, projectCount }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("overzicht");

  // Instellingen state
  const [name,         setName]         = useState(org?.name          ?? "");
  const [logoUrl,      setLogoUrl]      = useState(org?.logo_url      ?? "");
  const [primaryColor, setPrimaryColor] = useState(org?.primary_color ?? "#0A6645");
  const [accentColor,  setAccentColor]  = useState(org?.accent_color  ?? "#69B296");
  const initialModules = Object.fromEntries(modules.map(m => [m.module, m.is_enabled])) as Record<OrgModule, boolean>;
  const [moduleState, setModuleState] = useState<Record<OrgModule, boolean>>(initialModules);
  const [saving, setSaving] = useState(false);

  // Leden state
  const [memberList,   setMemberList]   = useState<OrgMember[]>(members);
  const [inviteEmail,  setInviteEmail]  = useState("");
  const [inviteName,   setInviteName]   = useState("");
  const [inviting,     setInviting]     = useState(false);
  const [inviteDone,   setInviteDone]   = useState(false);
  const [removingId,   setRemovingId]   = useState<string | null>(null);

  // Activity state
  const [activityList, setActivityList] = useState<ActivityRow[]>(activity);
  const [loadingMore,  setLoadingMore]  = useState(false);
  const [cursor,       setCursor]       = useState<string | null>(
    activity.length === 50 ? activity[activity.length - 1].created_at : null
  );

  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  // ── Instellingen ────────────────────────────────────────────
  async function handleSaveOrg() {
    setSaving(true);
    const res = await fetch("/api/organisation", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, logo_url: logoUrl || null, primary_color: primaryColor, accent_color: accentColor }),
    });
    setSaving(false);
    if (!res.ok) { showToast("Opslaan mislukt", false); return; }
    showToast("Instellingen opgeslagen");
  }

  async function handleToggleModule(module: OrgModule) {
    const newValue = !moduleState[module];
    setModuleState(prev => ({ ...prev, [module]: newValue }));
    await fetch("/api/organisation/modules", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ module, is_enabled: newValue }),
    });
  }

  // ── Leden ───────────────────────────────────────────────────
  async function handleInvite() {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    const res = await fetch("/api/organisation/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail.trim(), full_name: inviteName.trim() || undefined, org_role: "member" }),
    });
    const data = await res.json();
    setInviting(false);
    if (!res.ok) { showToast(data.error ?? "Uitnodiging mislukt", false); return; }
    setInviteDone(true);
    showToast(data.message ?? "Uitnodiging verstuurd");
    setInviteEmail(""); setInviteName("");
    setTimeout(() => setInviteDone(false), 2500);
    // Herlaad leden
    const fresh = await fetch("/api/organisation/invite").then(r => r.json());
    setMemberList(fresh);
  }

  async function handleRemoveMember(userId: string, name: string) {
    if (!confirm(`${name} verwijderen uit de organisatie?`)) return;
    setRemovingId(userId);
    const res = await fetch("/api/organisation/invite", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId }),
    });
    setRemovingId(null);
    if (!res.ok) { showToast("Verwijderen mislukt", false); return; }
    showToast(`${name} verwijderd`);
    setMemberList(prev => prev.filter(m => m.profile.id !== userId));
  }

  // ── Activiteit ──────────────────────────────────────────────
  async function loadMoreActivity() {
    if (!cursor) return;
    setLoadingMore(true);
    const res = await fetch(`/api/activity?limit=50&org_id=${orgId}&cursor=${cursor}`);
    const data = await res.json();
    setLoadingMore(false);
    setActivityList(prev => [...prev, ...(data.data ?? [])]);
    setCursor(data.nextCursor ?? null);
  }

  const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "overzicht",    label: "Overzicht",    icon: TrendingUp  },
    { id: "leden",        label: "Leden",        icon: Users       },
    { id: "instellingen", label: "Instellingen", icon: ShieldCheck },
    { id: "activiteit",   label: "Activiteit",   icon: Activity    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Toast */}
      {toast && (
        <div className={clsx(
          "fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium flex items-center gap-2",
          toast.ok ? "bg-white border-brand-200 text-brand-700" : "bg-red-50 border-red-200 text-red-700"
        )}>
          {toast.ok ? <Check size={14} /> : <X size={14} />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-5">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center">
              <Building2 size={18} className="text-brand-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800">{org?.name ?? "Organisatie"}</h1>
              <p className="text-xs text-slate-400">{org?.slug} · {PLAN_LABEL[org?.plan ?? "trial"]}</p>
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

      <div className="max-w-4xl mx-auto px-6 py-6 space-y-5">

        {/* ── OVERZICHT ────────────────────────────────────── */}
        {activeTab === "overzicht" && (
          <div className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Leden",     value: memberList.length,  icon: Users       },
                { label: "Projecten", value: projectCount,        icon: FolderKanban},
                { label: "Acties",    value: activityList.length, icon: Activity    },
              ].map(stat => (
                <div key={stat.label} className="card p-5 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center flex-shrink-0">
                    <stat.icon size={16} className="text-brand-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
                    <p className="text-xs text-slate-400">{stat.label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Recente activiteit preview */}
            <div className="card p-5">
              <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <Activity size={14} className="text-brand-500" /> Recente activiteit
              </h2>
              <div className="space-y-2">
                {activityList.slice(0, 8).map(a => (
                  <div key={a.id} className="flex items-center gap-3 py-1.5">
                    <div className="w-6 h-6 rounded-full bg-brand-100 flex items-center justify-center text-xs font-semibold text-brand-700 flex-shrink-0">
                      {a.actor?.full_name?.charAt(0) ?? "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-700">
                        <span className="font-medium">{a.actor?.full_name}</span>
                        {" "}{a.action}{" "}
                        <span className="text-slate-500">{a.entity_name}</span>
                      </p>
                    </div>
                    <p className="text-xs text-slate-400 flex-shrink-0">{formatDate(a.created_at)}</p>
                  </div>
                ))}
                {activityList.length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-4">Nog geen activiteit</p>
                )}
              </div>
              {activityList.length > 8 && (
                <button onClick={() => setActiveTab("activiteit")} className="text-xs text-brand-600 hover:underline mt-2">
                  Alle activiteit bekijken →
                </button>
              )}
            </div>

            {/* Modules overzicht */}
            <div className="card p-5">
              <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <ShieldCheck size={14} className="text-brand-500" /> Actieve modules
              </h2>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(MODULE_META) as OrgModule[]).map(mod => (
                  <span key={mod} className={clsx(
                    "text-xs px-2.5 py-1 rounded-lg border font-medium flex items-center gap-1",
                    moduleState[mod]
                      ? "bg-brand-50 text-brand-700 border-brand-200"
                      : "bg-slate-100 text-slate-400 border-slate-200"
                  )}>
                    {moduleState[mod] ? <Check size={10} /> : <X size={10} />}
                    {MODULE_META[mod].label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── LEDEN ────────────────────────────────────────── */}
        {activeTab === "leden" && (
          <div className="space-y-4">
            {/* Uitnodigen */}
            <div className="card p-5 space-y-3">
              <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <UserPlus size={14} className="text-brand-500" /> Nieuwe gebruiker uitnodigen
              </p>
              <div className="grid grid-cols-2 gap-2">
                <input className="input text-sm col-span-2" placeholder="E-mailadres *" type="email"
                  value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleInvite()} />
                <input className="input text-sm col-span-2" placeholder="Naam (optioneel)"
                  value={inviteName} onChange={e => setInviteName(e.target.value)} />
              </div>
              <button onClick={handleInvite} disabled={inviting || inviteDone || !inviteEmail.trim()}
                className={clsx("btn-primary w-full justify-center text-sm", (!inviteEmail.trim() || inviting) && "opacity-60")}>
                {inviteDone
                  ? <><Check size={14} /> Uitnodiging verstuurd</>
                  : inviting ? "Versturen..."
                  : <><Mail size={14} /> Uitnodiging versturen</>}
              </button>
            </div>

            {/* Ledenlijst */}
            <div className="card overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100">
                <p className="text-sm font-semibold text-slate-700">{memberList.length} leden</p>
              </div>
              <div className="divide-y divide-slate-100">
                {memberList.map(m => (
                  <div key={m.profile.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50/60">
                    <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-xs font-semibold text-brand-700 flex-shrink-0">
                      {m.profile.full_name?.charAt(0)?.toUpperCase() ?? "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{m.profile.full_name || "—"}</p>
                      <p className="text-xs text-slate-400 truncate">{m.profile.email}</p>
                    </div>
                    <span className={clsx(
                      "text-xs font-semibold px-2 py-0.5 rounded-lg border flex-shrink-0",
                      m.role === "owner" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-slate-100 text-slate-500 border-slate-200"
                    )}>
                      {m.role === "owner" ? <><Crown size={9} className="inline mr-1" />Eigenaar</> : "Gebruiker"}
                    </span>
                    <p className="text-xs text-slate-400 flex-shrink-0 hidden sm:block">{formatDate(m.joined_at)}</p>
                    {m.role !== "owner" && (
                      <button onClick={() => handleRemoveMember(m.profile.id, m.profile.full_name)}
                        disabled={removingId === m.profile.id}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors flex-shrink-0">
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── INSTELLINGEN ─────────────────────────────────── */}
        {activeTab === "instellingen" && (
          <div className="space-y-5">
            {/* Identiteit */}
            <div className="card p-5 space-y-4">
              <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Globe size={14} className="text-brand-500" /> Identiteit
              </h2>
              <div className="space-y-3">
                <div>
                  <label className="label">Organisatienaam</label>
                  <input className="input" value={name} onChange={e => setName(e.target.value)} />
                </div>
                <div>
                  <label className="label">Logo URL</label>
                  <input className="input" value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="https://..." />
                  {logoUrl && <img src={logoUrl} alt="Logo preview" className="mt-2 h-10 rounded" />}
                </div>
                <div>
                  <label className="label text-slate-400">Slug (alleen-lezen)</label>
                  <input className="input bg-slate-50 text-slate-400 cursor-not-allowed" value={org?.slug ?? ""} readOnly />
                </div>
              </div>
            </div>

            {/* Huisstijl */}
            <div className="card p-5 space-y-4">
              <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Palette size={14} className="text-brand-500" /> Huisstijl
              </h2>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Primaire kleur", value: primaryColor, set: setPrimaryColor },
                  { label: "Accentkleur",    value: accentColor,  set: setAccentColor  },
                ].map(c => (
                  <div key={c.label}>
                    <label className="label">{c.label}</label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={c.value} onChange={e => c.set(e.target.value)}
                        className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer p-0.5" />
                      <input className="input font-mono text-sm" value={c.value} onChange={e => c.set(e.target.value)} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modules */}
            <div className="card p-5 space-y-3">
              <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <ShieldCheck size={14} className="text-brand-500" /> Modules
              </h2>
              {(Object.entries(MODULE_META) as [OrgModule, { label: string; icon: React.ElementType }][]).map(([mod, meta]) => (
                <div key={mod} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <div className="flex items-center gap-2">
                    <meta.icon size={15} className="text-slate-500" />
                    <span className="text-sm text-slate-700">{meta.label}</span>
                  </div>
                  <button onClick={() => handleToggleModule(mod)} className="text-slate-400 hover:text-brand-600">
                    {moduleState[mod]
                      ? <ToggleRight size={24} className="text-brand-500" />
                      : <ToggleLeft size={24} />}
                  </button>
                </div>
              ))}
            </div>

            <button onClick={handleSaveOrg} disabled={saving} className="btn-primary w-full justify-center">
              {saving ? "Opslaan..." : <><Save size={14} /> Wijzigingen opslaan</>}
            </button>
          </div>
        )}

        {/* ── ACTIVITEIT ───────────────────────────────────── */}
        {activeTab === "activiteit" && (
          <div className="card overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100">
              <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Activity size={14} className="text-brand-500" /> Activiteitenlog
              </p>
              <p className="text-xs text-slate-400 mt-0.5">Alle acties binnen jouw organisatie</p>
            </div>
            <div className="divide-y divide-slate-100">
              {activityList.map(a => (
                <div key={a.id} className="flex items-start gap-3 px-5 py-3 hover:bg-slate-50/60">
                  <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center text-xs font-semibold text-brand-700 flex-shrink-0 mt-0.5">
                    {a.actor?.full_name?.charAt(0) ?? "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700">
                      <span className="font-medium">{a.actor?.full_name}</span>
                      {" "}<span className="text-slate-500">{a.action}</span>
                      {a.entity_name && <> <span className="font-medium text-slate-700">{a.entity_name}</span></>}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">{a.entity_type} · {formatDate(a.created_at)}</p>
                  </div>
                  <p className="text-xs text-slate-400 flex-shrink-0">{new Date(a.created_at).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}</p>
                </div>
              ))}
              {activityList.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-10">Nog geen activiteit geregistreerd</p>
              )}
            </div>
            {cursor && (
              <div className="px-5 py-3 border-t border-slate-100">
                <button onClick={loadMoreActivity} disabled={loadingMore}
                  className="text-sm text-brand-600 hover:underline font-medium">
                  {loadingMore ? "Laden..." : "Meer laden"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
