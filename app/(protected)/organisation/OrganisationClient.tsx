"use client";
// app/(protected)/organisation/OrganisationClient.tsx

import { useState } from "react";
import {
  Building2, Save, X, Check, Globe, Palette,
  ToggleLeft, ToggleRight, ShieldCheck, Crown,
  FolderKanban, Users, ClipboardList, CalendarDays,
  Clock, BarChart3, UserPlus, Mail, Trash2,
} from "lucide-react";
import clsx from "clsx";
// Inline types (totdat types/index.ts gedeployed is)
type OrgPlan   = "trial" | "starter" | "pro" | "enterprise";
type OrgModule = "projects" | "customers" | "intake" | "planning" | "hrm" | "calendar";

interface Organisation {
  id:            string;
  name:          string;
  slug:          string;
  logo_url:      string | null;
  primary_color: string;
  accent_color:  string;
  plan:          OrgPlan;
  is_active:     boolean;
  created_at:    string;
  updated_at:    string;
}

interface ModuleRow {
  module: OrgModule;
  is_enabled: boolean;
}

interface OrgMember {
  role: string
  joined_at: string
  profile: {
    id: string
    full_name: string
    email: string
    avatar_url: string | null
    role: string
    is_active: boolean
  }
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

  const [members,      setMembers]      = useState<OrgMember[]>([]);
  const [membersLoaded,setMembersLoaded] = useState(false);
  const [inviteEmail,  setInviteEmail]  = useState("");
  const [inviteName,   setInviteName]   = useState("");
  const [inviting,     setInviting]     = useState(false);
  const [inviteDone,   setInviteDone]   = useState(false);
  const [removingId,   setRemovingId]   = useState<string | null>(null);

  const [saving,      setSaving]      = useState(false);
  const [savingMod,   setSavingMod]   = useState<OrgModule | null>(null);
  const [toast,       setToast]       = useState<{ msg: string; ok: boolean } | null>(null);

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  async function loadMembers() {
    const res = await fetch("/api/organisation/invite")
    if (res.ok) { setMembers(await res.json()); setMembersLoaded(true); }
  }

  async function handleInvite() {
    if (!inviteEmail.trim()) return
    setInviting(true)
    const res = await fetch("/api/organisation/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail.trim(), full_name: inviteName.trim() || undefined, org_role: "member" }),
    })
    const data = await res.json()
    setInviting(false)
    if (!res.ok) { showToast(data.error ?? "Uitnodiging mislukt", false); return }
    setInviteDone(true)
    showToast(data.message ?? "Uitnodiging verstuurd")
    setInviteEmail(""); setInviteName("")
    setTimeout(() => setInviteDone(false), 2500)
    loadMembers()
  }

  async function handleRemoveMember(userId: string, name: string) {
    if (!confirm(`\${name} verwijderen uit de organisatie?`)) return
    setRemovingId(userId)
    const res = await fetch("/api/organisation/invite", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId }),
    })
    setRemovingId(null)
    if (!res.ok) { showToast("Verwijderen mislukt", false); return }
    showToast(`\${name} verwijderd`)
    setMembers(prev => prev.filter(m => m.profile.id !== userId))
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


      {/* Teamleden */}
      <section className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center">
                <Users size={13} className="text-brand-600" />
              </div>
              Leden
            </h2>
            <p className="text-xs text-slate-400 mt-1 ml-8">Beheer wie toegang heeft tot jouw organisatie</p>
          </div>
          {!membersLoaded && (
            <button onClick={loadMembers} className="text-xs text-brand-600 hover:underline font-medium">
              Laden
            </button>
          )}
        </div>

        {/* Uitnodigen */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
          <p className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
            <UserPlus size={12} /> Nieuwe gebruiker uitnodigen
          </p>
          <div className="grid grid-cols-2 gap-2">
            <input
              className="input text-sm col-span-2"
              placeholder="E-mailadres *"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleInvite()}
              type="email"
            />
            <input
              className="input text-sm"
              placeholder="Naam (optioneel)"
              value={inviteName}
              onChange={e => setInviteName(e.target.value)}
            />

          </div>
          <button
            onClick={handleInvite}
            disabled={inviting || inviteDone || !inviteEmail.trim()}
            className={clsx("btn-primary w-full justify-center text-sm", (inviting || !inviteEmail.trim()) && "opacity-60")}
          >
            {inviteDone
              ? <><Check size={14} /> Uitnodiging verstuurd</>
              : inviting
              ? "Versturen..."
              : <><Mail size={14} /> Uitnodiging versturen</>
            }
          </button>
        </div>

        {/* Ledenlijst */}
        {membersLoaded && (
          <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden">
            {members.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">Geen leden gevonden</p>
            ) : members.map(m => (
              <div key={m.profile.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50/60">
                <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0 text-xs font-semibold text-brand-700">
                  {m.profile.full_name?.charAt(0)?.toUpperCase() ?? "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{m.profile.full_name || "—"}</p>
                  <p className="text-xs text-slate-400 truncate">{m.profile.email}</p>
                </div>
                <span className={clsx(
                  "text-xs font-semibold px-2 py-0.5 rounded-lg border flex-shrink-0",
                  m.role === "owner" && "bg-amber-50 text-amber-700 border-amber-200",
                  m.role === "member" && "bg-slate-100 text-slate-600 border-slate-200",
                )}>
                  {m.role === "owner" ? "Eigenaar" : "Gebruiker"}
                </span>
                {m.role !== "owner" && (
                  <button
                    onClick={() => handleRemoveMember(m.profile.id, m.profile.full_name)}
                    disabled={removingId === m.profile.id}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors flex-shrink-0"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
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
