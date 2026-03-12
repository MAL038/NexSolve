"use client";
// app/(protected)/beheer/BeheerClient.tsx
// Settings-layout: left subnavigation + right content area.

import React, { useState } from "react";
import {
  Building2, Save, Check, X, Globe, Palette,
  ToggleLeft, ToggleRight, Crown, FolderKanban,
  Users, ClipboardList, CalendarDays,
  BarChart3, UserPlus, Mail, Trash2, Activity,
  ShieldCheck, TrendingUp, ChevronRight, UsersRound, Shield,
  LayoutDashboard, Clock, Download, UserCog,
} from "lucide-react";
import clsx from "clsx";
import { formatDate } from "@/lib/time";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useConfirm } from "@/lib/hooks/useConfirm";
import { useToast } from "@/lib/hooks/useToast";
import Toast from "@/components/ui/Toast";

type OrgPlan   = "trial" | "starter" | "pro" | "enterprise";
type OrgModule = "dashboard" | "projects" | "customers" | "team" | "time" | "calendar" | "export" | "intake" | "planning" | "hrm";

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

const MODULE_META: Record<OrgModule, { label: string; desc: string; icon: React.ElementType }> = {
  dashboard: { label: "Dashboard",  desc: "Startpagina met KPI's, taken en activiteiten.", icon: LayoutDashboard },
  projects:  { label: "Projecten",  desc: "Beheer projecten, taken en voortgang.",          icon: FolderKanban    },
  customers: { label: "Klanten",    desc: "Klantendossiers en contactinformatie.",           icon: Building2       },
  team:      { label: "Team",       desc: "Teamleden, rollen en toewijzingen.",              icon: Users           },
  time:      { label: "Tijdregistratie", desc: "Uren per project en medewerker bijhouden.", icon: Clock           },
  calendar:  { label: "Kalender",   desc: "Afspraken en deadlines per project.",            icon: CalendarDays    },
  export:    { label: "Exporteren", desc: "Data exporteren als CSV of PDF.",                icon: Download        },
  intake:    { label: "Intake",     desc: "Intakeformulieren en klantaanvragen.",           icon: ClipboardList   },
  planning:  { label: "Planning",   desc: "Capaciteitsplanning en roosters.",               icon: BarChart3       },
  hrm:       { label: "HRM",        desc: "Personeelsbeheer en HR-documenten.",             icon: Users           },
};

const PLAN_LABEL: Record<OrgPlan, { label: string; color: string }> = {
  trial:      { label: "Trial",      color: "bg-slate-100 text-slate-600 border-slate-200" },
  starter:    { label: "Starter",    color: "bg-blue-50 text-blue-600 border-blue-200"    },
  pro:        { label: "Pro",        color: "bg-brand-50 text-brand-700 border-brand-200"  },
  enterprise: { label: "Enterprise", color: "bg-amber-50 text-amber-700 border-amber-200" },
};

type Tab = "overzicht" | "gebruikers" | "teams" | "rollen" | "modules" | "instellingen" | "activiteit";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "overzicht",    label: "Overzicht",    icon: TrendingUp  },
  { id: "gebruikers",   label: "Gebruikers",   icon: Users       },
  { id: "teams",        label: "Teams",        icon: UsersRound  },
  { id: "rollen",       label: "Rollen",       icon: Shield      },
  { id: "modules",      label: "Modules",      icon: ShieldCheck },
  { id: "instellingen", label: "Instellingen", icon: Globe       },
  { id: "activiteit",   label: "Activiteit",   icon: Activity    },
];

export default function BeheerClient({ org, orgId, modules, members, activity, projectCount }: Props) {
  const { requestConfirm, confirmProps } = useConfirm();
  const { toast, showToast, clearToast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>("overzicht");

  // Instellingen state
  const [name,         setName]         = useState(org?.name          ?? "");
  const [logoUrl,      setLogoUrl]      = useState(org?.logo_url      ?? "");
  const [primaryColor, setPrimaryColor] = useState(org?.primary_color ?? "#0A6645");
  const [accentColor,  setAccentColor]  = useState(org?.accent_color  ?? "#69B296");
  const initialModules = Object.fromEntries(modules.map(m => [m.module, m.is_enabled])) as Record<OrgModule, boolean>;
  const [moduleState,  setModuleState]  = useState<Record<OrgModule, boolean>>(initialModules);
  const [saving,       setSaving]       = useState(false);

  // Leden state
  const [memberList,   setMemberList]   = useState<OrgMember[]>(members);
  const [inviteEmail,  setInviteEmail]  = useState("");
  const [inviteName,   setInviteName]   = useState("");
  const [inviting,     setInviting]     = useState(false);
  const [inviteDone,   setInviteDone]   = useState(false);
  const [removingId,   setRemovingId]   = useState<string | null>(null);
  const [changingRole, setChangingRole] = useState<string | null>(null);

  // Activity state
  const [activityList, setActivityList] = useState<ActivityRow[]>(activity);
  const [loadingMore,  setLoadingMore]  = useState(false);
  const [cursor,       setCursor]       = useState<string | null>(
    activity.length === 50 ? activity[activity.length - 1].created_at : null
  );

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
    const fresh = await fetch("/api/organisation/invite").then(r => r.json());
    setMemberList(fresh);
  }

  async function handleChangeRole(userId: string, newRole: string) {
    setChangingRole(userId);
    const res = await fetch("/api/organisation/invite", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, role: newRole }),
    });
    setChangingRole(null);
    if (!res.ok) { showToast("Rol wijzigen mislukt", false); return; }
    setMemberList(prev => prev.map(m =>
      m.profile.id === userId ? { ...m, role: newRole } : m
    ));
    showToast("Rol bijgewerkt");
  }

  async function handleRemoveMember(userId: string, name: string) {
    if (!(await requestConfirm({
      title:        `${name} verwijderen uit de organisatie?`,
      confirmLabel: "Verwijderen",
      variant:      "danger",
    }))) return;
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

  async function loadMoreActivity() {
    if (!cursor) return;
    setLoadingMore(true);
    const res  = await fetch(`/api/activity?limit=50&org_id=${orgId}&cursor=${cursor}`);
    const data = await res.json();
    setLoadingMore(false);
    setActivityList(prev => [...prev, ...(data.data ?? [])]);
    setCursor(data.nextCursor ?? null);
  }

  const plan = PLAN_LABEL[org?.plan ?? "trial"];

  return (
    // Full-bleed settings layout: matches the -mx/-my negative margin pattern
    <div className="-mx-4 sm:-mx-6 -my-4 sm:-my-6 flex min-h-[calc(100dvh-56px)]">
      <Toast toast={toast} onClose={clearToast} />
      <ConfirmDialog {...confirmProps} />

      {/* ── Left nav ──────────────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-[220px] flex-shrink-0 border-r border-slate-200 bg-white">

        {/* Org identity */}
        <div className="px-5 pt-6 pb-5 border-b border-slate-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center flex-shrink-0">
              <Building2 size={16} className="text-brand-600" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-800 truncate">{org?.name ?? "Organisatie"}</p>
              <p className="text-xs text-slate-400 truncate">{org?.slug}</p>
            </div>
          </div>
          <span className={clsx("inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-lg border", plan.color)}>
            {plan.label}
          </span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 divide-x divide-slate-100 border-b border-slate-100">
          {[
            { label: "Leden",     value: memberList.length  },
            { label: "Projecten", value: projectCount       },
          ].map(s => (
            <div key={s.label} className="py-3 text-center">
              <p className="text-lg font-bold text-slate-800">{s.value}</p>
              <p className="text-[10px] text-slate-400 font-medium">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Nav */}
        <nav className="flex-1 flex flex-col gap-0.5 px-2 py-3">
          {TABS.map(tab => {
            const Icon   = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left",
                  active
                    ? "bg-brand-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-800"
                )}
              >
                <Icon size={15} className={active ? "opacity-80" : "text-slate-400"} />
                {tab.label}
                {active && <ChevronRight size={13} className="ml-auto opacity-60" />}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* ── Mobile tab bar ────────────────────────────────────── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200 flex overflow-x-auto">
        {TABS.map(tab => {
          const Icon   = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={clsx(
                "flex-shrink-0 flex flex-col items-center gap-1 px-4 py-2.5 text-[10px] font-semibold transition-colors",
                active ? "text-brand-600" : "text-slate-400"
              )}>
              <Icon size={18} className={active ? "text-brand-600" : "text-slate-400"} />
              {tab.label.split(" ")[0]}
            </button>
          );
        })}
      </div>

      {/* ── Right content ─────────────────────────────────────── */}
      <div className="flex-1 min-w-0 overflow-y-auto bg-slate-50 pb-20 lg:pb-0">
        <div className="max-w-2xl mx-auto px-5 sm:px-8 py-6 space-y-5">

          {/* ── OVERZICHT ─────────────────────────────────── */}
          {activeTab === "overzicht" && (
            <div className="space-y-4">
              <h2 className="text-base font-bold text-slate-800">Overzicht</h2>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Leden",     value: memberList.length,  icon: Users        },
                  { label: "Projecten", value: projectCount,        icon: FolderKanban },
                  { label: "Acties",    value: activityList.length, icon: Activity     },
                ].map(stat => (
                  <div key={stat.label} className="card p-4 flex flex-col items-center text-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center">
                      <stat.icon size={15} className="text-brand-600" />
                    </div>
                    <p className="text-xl font-bold text-slate-800">{stat.value}</p>
                    <p className="text-xs text-slate-400">{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* Actieve modules */}
              <div className="card p-5 space-y-3">
                <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <ShieldCheck size={14} className="text-brand-500" /> Actieve modules
                </h3>
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
                <button onClick={() => setActiveTab("modules")}
                  className="text-xs text-brand-600 hover:underline font-medium">
                  Modules beheren →
                </button>
              </div>

              {/* Recente activiteit */}
              <div className="card p-5 space-y-3">
                <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Activity size={14} className="text-brand-500" /> Recente activiteit
                </h3>
                <div className="space-y-2">
                  {activityList.slice(0, 8).map(a => (
                    <div key={a.id} className="flex items-center gap-3 py-1">
                      <div className="w-6 h-6 rounded-full bg-brand-100 flex items-center justify-center text-xs font-semibold text-brand-700 flex-shrink-0">
                        {a.actor?.full_name?.charAt(0) ?? "?"}
                      </div>
                      <p className="flex-1 text-xs text-slate-700 truncate">
                        <span className="font-medium">{a.actor?.full_name}</span>{" "}
                        {a.action}{" "}
                        <span className="text-slate-500">{a.entity_name}</span>
                      </p>
                      <p className="text-xs text-slate-400 flex-shrink-0">{formatDate(a.created_at)}</p>
                    </div>
                  ))}
                  {activityList.length === 0 && (
                    <p className="text-sm text-slate-400 text-center py-4">Nog geen activiteit</p>
                  )}
                </div>
                {activityList.length > 8 && (
                  <button onClick={() => setActiveTab("activiteit")}
                    className="text-xs text-brand-600 hover:underline font-medium">
                    Alle activiteit →
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── GEBRUIKERS ────────────────────────────────── */}
          {activeTab === "gebruikers" && (
            <div className="space-y-4">
              <h2 className="text-base font-bold text-slate-800">Gebruikers</h2>

              {/* Uitnodigen */}
              <div className="card p-5 space-y-3">
                <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <UserPlus size={14} className="text-brand-500" /> Nieuwe gebruiker uitnodigen
                </p>
                <div className="space-y-2">
                  <input className="input text-sm w-full" placeholder="E-mailadres *" type="email"
                    value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleInvite()} />
                  <input className="input text-sm w-full" placeholder="Naam (optioneel)"
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
                <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-700">{memberList.length} leden</p>
                </div>
                <div className="divide-y divide-slate-100">
                  {memberList.map(m => (
                    <div key={m.profile.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50/60 transition-colors">
                      <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-xs font-semibold text-brand-700 flex-shrink-0">
                        {m.profile.full_name?.charAt(0)?.toUpperCase() ?? "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{m.profile.full_name || "—"}</p>
                        <p className="text-xs text-slate-400 truncate">{m.profile.email}</p>
                      </div>
                      {m.role === "owner" ? (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-lg border bg-amber-50 text-amber-700 border-amber-200 flex-shrink-0 flex items-center gap-1">
                          <Crown size={9} />Eigenaar
                        </span>
                      ) : (
                        <select
                          value={m.role}
                          disabled={changingRole === m.profile.id}
                          onChange={e => handleChangeRole(m.profile.id, e.target.value)}
                          className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-600 flex-shrink-0 cursor-pointer hover:border-brand-300 transition-colors"
                        >
                          <option value="admin">Beheerder</option>
                          <option value="member">Lid</option>
                          <option value="viewer">Lezer</option>
                        </select>
                      )}
                      <p className="text-xs text-slate-400 flex-shrink-0 hidden sm:block">{formatDate(m.joined_at)}</p>
                      {m.role !== "owner" && (
                        <button
                          onClick={() => handleRemoveMember(m.profile.id, m.profile.full_name)}
                          disabled={removingId === m.profile.id}
                          className="p-1.5 rounded-lg text-slate-300 hover:text-red-600 hover:bg-red-50 transition-colors flex-shrink-0"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── TEAMS ─────────────────────────────────────── */}
          {activeTab === "teams" && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-bold text-slate-800">Teams</h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  Organiseer gebruikers in teams voor een beter overzicht.
                </p>
              </div>
              <div className="card p-10 text-center">
                <UsersRound size={36} className="mx-auto mb-3 text-slate-200" />
                <p className="text-sm font-medium text-slate-500">Teams komen binnenkort beschikbaar.</p>
                <p className="text-xs text-slate-400 mt-1">
                  Je kunt gebruikers groeperen in teams en teamspecifieke rechten instellen.
                </p>
              </div>
            </div>
          )}

          {/* ── ROLLEN ────────────────────────────────────── */}
          {activeTab === "rollen" && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-bold text-slate-800">Rollen</h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  Definieer rollen met specifieke rechten voor jouw organisatie.
                </p>
              </div>
              <div className="card overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Standaardrollen</p>
                </div>
                <div className="divide-y divide-slate-50">
                  {[
                    { role: "owner",  label: "Eigenaar",   desc: "Volledige toegang tot alle instellingen en gegevens."        },
                    { role: "admin",  label: "Beheerder",  desc: "Kan gebruikers en instellingen beheren, geen facturatie."    },
                    { role: "member", label: "Lid",        desc: "Toegang tot projecten en klanten op basis van toewijzing."   },
                    { role: "viewer", label: "Lezer",      desc: "Alleen-lezen toegang. Kan geen wijzigingen aanbrengen."      },
                  ].map(r => (
                    <div key={r.role} className="flex items-start gap-4 px-5 py-4">
                      <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Shield size={14} className="text-slate-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800">{r.label}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{r.desc}</p>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 flex-shrink-0 mt-1 bg-slate-100 px-2 py-0.5 rounded-lg">
                        {r.role}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="card p-5 bg-brand-50/40 border-brand-100">
                <p className="text-sm font-medium text-brand-700 mb-1">Aangepaste rollen</p>
                <p className="text-xs text-brand-500">
                  Aangepaste rollen met specifieke rechten zijn beschikbaar in het Pro-abonnement.
                </p>
              </div>
            </div>
          )}

          {/* ── MODULES ───────────────────────────────────── */}
          {activeTab === "modules" && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-bold text-slate-800">Modules</h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  Schakel modules in of uit voor jouw organisatie.
                </p>
              </div>
              <div className="card overflow-hidden divide-y divide-slate-100">
                {(Object.entries(MODULE_META) as [OrgModule, { label: string; desc: string; icon: React.ElementType }][]).map(([mod, meta]) => (
                  <div key={mod} className="flex items-center justify-between px-5 py-4 hover:bg-slate-50/40 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={clsx(
                        "w-8 h-8 rounded-xl flex items-center justify-center border",
                        moduleState[mod]
                          ? "bg-brand-50 border-brand-100"
                          : "bg-slate-100 border-slate-200"
                      )}>
                        <meta.icon size={14} className={moduleState[mod] ? "text-brand-600" : "text-slate-400"} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-700">{meta.label}</p>
                        <p className="text-xs text-slate-400">{meta.desc}</p>
                      </div>
                    </div>
                    <button onClick={() => handleToggleModule(mod)} className="text-slate-400 hover:text-brand-600 transition-colors">
                      {moduleState[mod]
                        ? <ToggleRight size={28} className="text-brand-500" />
                        : <ToggleLeft size={28} />}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── INSTELLINGEN ──────────────────────────────── */}
          {activeTab === "instellingen" && (
            <div className="space-y-5">
              <h2 className="text-base font-bold text-slate-800">Instellingen</h2>

              {/* Identiteit */}
              <div className="card p-5 space-y-4">
                <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Globe size={14} className="text-brand-500" /> Identiteit
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="label">Organisatienaam</label>
                    <input className="input" value={name} onChange={e => setName(e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Logo URL</label>
                    <input className="input" value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="https://…" />
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
                <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Palette size={14} className="text-brand-500" /> Huisstijl
                </h3>
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
                        <input className="input font-mono text-sm" value={c.value}
                          onChange={e => c.set(e.target.value)} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button onClick={handleSaveOrg} disabled={saving} className="btn-primary w-full justify-center">
                {saving ? "Opslaan..." : <><Save size={14} /> Wijzigingen opslaan</>}
              </button>
            </div>
          )}

          {/* ── ACTIVITEIT ────────────────────────────────── */}
          {activeTab === "activiteit" && (
            <div className="space-y-4">
              <h2 className="text-base font-bold text-slate-800">Activiteitslog</h2>
              <div className="card overflow-hidden">
                <div className="divide-y divide-slate-100">
                  {activityList.map(a => (
                    <div key={a.id} className="flex items-start gap-3 px-5 py-3.5 hover:bg-slate-50/60 transition-colors">
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
                      <p className="text-xs text-slate-400 flex-shrink-0">
                        {new Date(a.created_at).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  ))}
                  {activityList.length === 0 && (
                    <p className="text-sm text-slate-400 text-center py-12">Nog geen activiteit geregistreerd</p>
                  )}
                </div>
                {cursor && (
                  <div className="px-5 py-3 border-t border-slate-100">
                    <button onClick={loadMoreActivity} disabled={loadingMore}
                      className="text-sm text-brand-600 hover:underline font-medium">
                      {loadingMore ? "Laden…" : "Meer laden"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
