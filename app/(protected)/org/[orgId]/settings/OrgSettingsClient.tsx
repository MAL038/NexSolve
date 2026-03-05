"use client";
// app/(protected)/org/[orgId]/settings/OrgSettingsClient.tsx

import { useEffect, useMemo, useState } from "react";
import {
  Users,
  Mail,
  Send,
  Trash2,
  Loader2,
  Clock,
  Check,
  Shield,
  User,
  X,
  ChevronDown,
  Eye,
  UserPlus,
  Building2,
  Pencil,
  AlertCircle,
  Palette,
  Image,
  Info,
} from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import clsx from "clsx";
import type { Organisation, OrgMember, OrgRole, TeamInvite } from "@/types";

// ── Config ────────────────────────────────────────────────────

const ORG_ROLE_CONFIG: Record<
  OrgRole,
  { label: string; color: string; bg: string; border: string }
> = {
  admin: {
    label: "Org Admin",
    color: "text-brand-700",
    bg: "bg-brand-50",
    border: "border-brand-200",
  },
  member: {
    label: "Lid",
    color: "text-slate-600",
    bg: "bg-slate-100",
    border: "border-slate-200",
  },
  viewer: {
    label: "Viewer",
    color: "text-slate-500",
    bg: "bg-slate-50",
    border: "border-slate-200",
  },
};

type TabKey = "general" | "users" | "settings" | "modules";

// ✅ Stap 9B (goed): modules config buiten component
const MODULES: Array<{ key: string; label: string; desc: string }> = [
  { key: "dashboard", label: "Dashboard", desc: "Overzicht en kernstatistieken" },
  { key: "projects", label: "Projecten", desc: "Projectbeheer en themastructuur" },
  { key: "customers", label: "Klanten", desc: "CRM-lite klantenbeheer" },
  { key: "team", label: "Team", desc: "Team/leden overzicht" },
  { key: "time", label: "Urenregistratie", desc: "Uren registreren en rapporteren" },
  { key: "calendar", label: "Kalender", desc: "Planning/agenda integratie" },
  { key: "export", label: "Exporteren", desc: "Exports en downloads" },
];

function defaultEnabledModules() {
  return MODULES.reduce<Record<string, boolean>>((acc, m) => {
    acc[m.key] = true;
    return acc;
  }, {});
}

// ── Props ─────────────────────────────────────────────────────

interface Props {
  org: Organisation;
  initialMembers: OrgMember[];
  currentUserId: string;
  currentOrgRole: OrgRole;
  isSuperuser: boolean;
}

// ── Helpers ───────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ── Component ─────────────────────────────────────────────────

export default function OrgSettingsClient({
  org,
  initialMembers,
  currentUserId,
  currentOrgRole,
  isSuperuser,
}: Props) {
  const [tab, setTab] = useState<TabKey>("general");

  const [members, setMembers] = useState<OrgMember[]>(initialMembers);
  const [invites, setInvites] = useState<TeamInvite[]>([]);
  const [invLoading, setInvLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  // ✅ Stap 9B: enabled_modules state (lazy init)
  const [enabledModules, setEnabledModules] = useState<Record<string, boolean>>(() => {
    // organisation type kan enabled_modules missen -> any fallback
    const fromDb = (org as any).enabled_modules as Record<string, boolean> | undefined | null;
    return fromDb ?? defaultEnabledModules();
  });
  const [modulesSaving, setModulesSaving] = useState(false);

  // Org naam bewerken
  const [editName, setEditName] = useState(false);
  const [orgName, setOrgName] = useState(org.name);
  const [nameSaving, setNameSaving] = useState(false);

  // Org instellingen (logo, kleuren, plan, active)
  const [logoUrl, setLogoUrl] = useState(org.logo_url ?? "");
  const [primaryColor, setPrimaryColor] = useState(org.primary_color ?? "#16a34a");
  const [accentColor, setAccentColor] = useState(org.accent_color ?? "#15803d");
  const [plan, setPlan] = useState(org.plan ?? "");
  const [isActive, setIsActive] = useState(org.is_active ?? true);
  const [settingsSaving, setSettingsSaving] = useState(false);

  // Invite form
  const [showInvite, setShowInvite] = useState(false);
  const [invEmail, setInvEmail] = useState("");
  const [invRole, setInvRole] = useState<OrgRole>("member");
  const [invSending, setInvSending] = useState(false);
  const [invError, setInvError] = useState("");

  // isAdmin: org-admin OF superuser
  const isAdmin = currentOrgRole === "admin" || isSuperuser;

  // Alleen superuser mag org-admins toewijzen
  const canAssignAdmin = isSuperuser;

  // ── Load invites ──────────────────────────────────────────
  useEffect(() => {
    fetch(`/api/org/${org.id}/invite`)
      .then((r) => r.json())
      .then((data) => {
        setInvites(Array.isArray(data) ? data : []);
        setInvLoading(false);
      })
      .catch(() => setInvLoading(false));
  }, [org.id]);

  // ── Helpers ───────────────────────────────────────────────
  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  const pendingInvites = useMemo(
    () => invites.filter((i) => !i.accepted_at && new Date(i.expires_at) > new Date()),
    [invites]
  );

  // ── API actions ────────────────────────────────────────────

  async function saveOrgName() {
    if (!orgName.trim() || orgName === org.name) {
      setEditName(false);
      return;
    }
    setNameSaving(true);

    const res = await fetch(`/api/org/${org.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: orgName.trim() }),
    });
    const data = await res.json();

    setNameSaving(false);
    if (!res.ok) {
      showToast(data.error ?? "Fout opgetreden", false);
      return;
    }

    setEditName(false);
    showToast("Organisatienaam bijgewerkt");
  }

  async function saveOrgSettings() {
    setSettingsSaving(true);

    const res = await fetch(`/api/org/${org.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        logo_url: logoUrl.trim() || null,
        primary_color: primaryColor,
        accent_color: accentColor,
        plan: plan.trim() || null,
        is_active: isActive,
      }),
    });

    const data = await res.json();
    setSettingsSaving(false);

    if (!res.ok) {
      showToast(data.error ? JSON.stringify(data.error) : "Fout opgetreden", false);
      return;
    }
    showToast("Instellingen opgeslagen");
  }

  // ✅ Stap 9C: modules opslaan
  async function saveModules() {
    setModulesSaving(true);

    const res = await fetch(`/api/org/${org.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled_modules: enabledModules }),
    });

    const data = await res.json();
    setModulesSaving(false);

    if (!res.ok) {
      showToast(data.error ? JSON.stringify(data.error) : "Fout opgetreden", false);
      return;
    }
    showToast("Modules opgeslagen");
  }

  async function changeRole(member: OrgMember, newRole: OrgRole) {
    if (newRole === "admin" && !canAssignAdmin) {
      showToast("Alleen een superuser kan org-admins aanwijzen", false);
      return;
    }

    setLoading(member.user_id);

    const res = await fetch(`/api/org/${org.id}/members/${member.user_id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ org_role: newRole }),
    });
    const data = await res.json();

    setLoading(null);

    if (!res.ok) {
      showToast(data.error ?? "Fout", false);
      return;
    }

    setMembers((prev) =>
      prev.map((m) => (m.user_id === member.user_id ? { ...m, org_role: newRole } : m))
    );

    showToast(`Rol gewijzigd naar ${ORG_ROLE_CONFIG[newRole].label}`);
  }

  async function removeMember(member: OrgMember) {
    if (!confirm(`${member.profile?.full_name} uit de organisatie verwijderen?`)) return;

    setLoading(member.user_id);

    const res = await fetch(`/api/org/${org.id}/members/${member.user_id}`, { method: "DELETE" });

    setLoading(null);

    if (!res.ok) {
      const d = await res.json();
      showToast(d.error ?? "Fout", false);
      return;
    }

    setMembers((prev) => prev.filter((m) => m.user_id !== member.user_id));
    showToast(`${member.profile?.full_name} verwijderd uit de organisatie`);
  }

  async function sendInvite() {
    setInvError("");

    if (!invEmail.trim()) {
      setInvError("E-mailadres is verplicht");
      return;
    }
    if (invRole === "admin" && !canAssignAdmin) {
      setInvError("Alleen een superuser kan org-admins uitnodigen");
      return;
    }

    setInvSending(true);

    const res = await fetch(`/api/org/${org.id}/invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: invEmail.trim(), org_role: invRole }),
    });

    const data = await res.json();
    setInvSending(false);

    if (!res.ok) {
      setInvError(data.error ?? "Fout opgetreden");
      return;
    }

    showToast(`Uitnodiging verstuurd naar ${invEmail}`);

    setShowInvite(false);
    setInvEmail("");
    setInvRole("member");

    const inv = await fetch(`/api/org/${org.id}/invite`).then((r) => r.json());
    if (Array.isArray(inv)) setInvites(inv);
  }

  async function revokeInvite(inviteId: string) {
    const res = await fetch(`/api/org/${org.id}/invite`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: inviteId }),
    });

    if (!res.ok) {
      const d = await res.json();
      showToast(d.error ?? "Fout", false);
      return;
    }

    setInvites((prev) => prev.filter((i) => i.id !== inviteId));
    showToast("Uitnodiging ingetrokken");
  }

  // ── UI parts ───────────────────────────────────────────────

  const TabButton = ({ id, label, icon: Icon }: { id: TabKey; label: string; icon: any }) => (
    <button
      onClick={() => setTab(id)}
      className={clsx(
        "inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold border transition-colors",
        tab === id
          ? "bg-brand-600 text-white border-brand-600"
          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
      )}
      type="button"
    >
      <Icon size={15} />
      {label}
    </button>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-8">
      {/* Toast */}
      {toast && (
        <div
          className={clsx(
            "fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium shadow-lg",
            toast.ok
              ? "bg-white border-brand-200 text-brand-700"
              : "bg-white border-red-200 text-red-700"
          )}
        >
          <span
            className={clsx(
              "w-2 h-2 rounded-full flex-shrink-0",
              toast.ok ? "bg-brand-500" : "bg-red-500"
            )}
          />
          {toast.msg}
          <button onClick={() => setToast(null)} className="text-slate-400 hover:text-slate-600">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
            <Building2 size={18} className="text-brand-600" />
          </div>

          <div>
            {editName ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveOrgName();
                    if (e.key === "Escape") {
                      setEditName(false);
                      setOrgName(org.name);
                    }
                  }}
                  className="text-xl font-bold border-b-2 border-brand-500 bg-transparent outline-none text-slate-800 w-64"
                />
                <button
                  onClick={saveOrgName}
                  disabled={nameSaving}
                  className="p-1 rounded-lg text-brand-600 hover:bg-brand-50"
                >
                  {nameSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                </button>
                <button
                  onClick={() => {
                    setEditName(false);
                    setOrgName(org.name);
                  }}
                  className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-800">{orgName}</h1>
                {isAdmin && (
                  <button
                    onClick={() => setEditName(true)}
                    className="p-1 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50"
                    title="Naam wijzigen"
                  >
                    <Pencil size={13} />
                  </button>
                )}
              </div>
            )}
            <p className="text-sm text-slate-500">{members.length} leden</p>
          </div>
        </div>

        {isAdmin && tab === "users" && (
          <button
            onClick={() => {
              setShowInvite((v) => !v);
              setInvError("");
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors shadow-sm"
          >
            <UserPlus size={15} /> Lid uitnodigen
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        <TabButton id="general" label="Algemeen" icon={Info} />
        <TabButton id="users" label="Gebruikers" icon={Users} />
        <TabButton id="settings" label="Instellingen" icon={Palette} />
        {/* ✅ Stap 9D */}
        <TabButton id="modules" label="Modules" icon={Shield} />
      </div>

      {/* Tab: Algemeen */}
      {tab === "general" && (
        <div className="card p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Organisatie ID
              </div>
              <div className="text-sm font-mono text-slate-700 break-all">{org.id}</div>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Slug
              </div>
              <div className="text-sm font-mono text-slate-700">{org.slug}</div>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Aangemaakt
              </div>
              <div className="text-sm text-slate-700">{formatDate(org.created_at)}</div>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Status
              </div>
              <div
                className={clsx(
                  "inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold border",
                  org.is_active
                    ? "bg-brand-50 text-brand-700 border-brand-200"
                    : "bg-red-50 text-red-700 border-red-200"
                )}
              >
                <span className={clsx("w-2 h-2 rounded-full", org.is_active ? "bg-brand-500" : "bg-red-500")} />
                {org.is_active ? "Actief" : "Inactief"}
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <div className="text-xs text-slate-500">
              Superuser kan hierna naar <b>Gebruikers</b>, <b>Instellingen</b> en <b>Modules</b> om alles voor deze
              organisatie te beheren.
            </div>
          </div>
        </div>
      )}

      {/* Tab: Gebruikers */}
      {tab === "users" && (
        <div className="space-y-5">
          {/* Invite form */}
          {showInvite && isAdmin && (
            <div className="card p-6 border-2 border-brand-100 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Send size={16} className="text-brand-500" />
                  <h3 className="font-semibold text-slate-800">Nieuw lid uitnodigen</h3>
                </div>
                <button onClick={() => setShowInvite(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={16} />
                </button>
              </div>

              {invError && (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                  <AlertCircle size={14} /> {invError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    E-mailadres *
                  </label>
                  <input
                    autoFocus
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                    type="email"
                    placeholder="naam@bedrijf.nl"
                    value={invEmail}
                    onChange={(e) => setInvEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendInvite()}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Rol
                  </label>
                  <select
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 bg-white"
                    value={invRole}
                    onChange={(e) => setInvRole(e.target.value as OrgRole)}
                  >
                    <option value="member">Lid</option>
                    <option value="viewer">Viewer</option>
                    {canAssignAdmin && <option value="admin">Org Admin</option>}
                  </select>
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowInvite(false)}
                  className="px-4 py-2 rounded-xl text-sm text-slate-500 hover:bg-slate-100"
                >
                  Annuleren
                </button>
                <button
                  onClick={sendInvite}
                  disabled={invSending}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-60"
                >
                  {invSending ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> Versturen…
                    </>
                  ) : (
                    <>
                      <Send size={14} /> Versturen
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Members */}
          <div>
            <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-3">
              <Users size={14} className="text-brand-500" /> Leden
            </h2>

            <div className="card divide-y divide-slate-50 overflow-hidden">
              {members.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm">
                  <Users size={28} className="mx-auto mb-2 opacity-30" />
                  Nog geen leden
                </div>
              ) : (
                members.map((member) => {
                  const rc = ORG_ROLE_CONFIG[member.org_role] ?? ORG_ROLE_CONFIG.member;
                  const isLoading = loading === member.user_id;
                  const isSelf = member.user_id === currentUserId;

                  return (
                    <div
                      key={member.user_id}
                      className={clsx(
                        "flex items-center gap-3 px-5 py-4 transition-colors hover:bg-slate-50/50",
                        isLoading && "opacity-50 pointer-events-none",
                        !member.profile?.is_active && "bg-red-50/30"
                      )}
                    >
                      <Avatar name={member.profile?.full_name} url={member.profile?.avatar_url} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">
                          {member.profile?.full_name}
                          {isSelf && <span className="ml-2 text-xs text-slate-400">(jij)</span>}
                        </p>
                        <p className="text-xs text-slate-400 truncate">{member.profile?.email}</p>
                      </div>

                      {/* Rol */}
                      {isAdmin && !isSelf ? (
                        <div className="relative">
                          <div
                            className={clsx(
                              "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer",
                              rc.bg,
                              rc.color,
                              rc.border
                            )}
                          >
                            <span>{rc.label}</span>
                            <ChevronDown size={11} className="opacity-50" />
                            <select
                              value={member.org_role}
                              onChange={(e) => changeRole(member, e.target.value as OrgRole)}
                              disabled={isLoading}
                              className="absolute inset-0 opacity-0 cursor-pointer w-full"
                            >
                              <option value="member">Lid</option>
                              <option value="viewer">Viewer</option>
                              {canAssignAdmin && <option value="admin">Org Admin</option>}
                            </select>
                          </div>
                        </div>
                      ) : (
                        <span
                          className={clsx(
                            "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border",
                            rc.bg,
                            rc.color,
                            rc.border
                          )}
                        >
                          {member.org_role === "admin" ? (
                            <Shield size={10} />
                          ) : member.org_role === "viewer" ? (
                            <Eye size={10} />
                          ) : (
                            <User size={10} />
                          )}
                          {rc.label}
                        </span>
                      )}

                      {/* Verwijder */}
                      {isAdmin && !isSelf && (
                        <button
                          onClick={() => removeMember(member)}
                          disabled={isLoading}
                          title="Verwijder uit organisatie"
                          className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Pending invites */}
          {isAdmin && (
            <div>
              <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-3">
                <Clock size={14} className="text-amber-500" /> Openstaande uitnodigingen
              </h2>

              {invLoading ? (
                <div className="card p-6 flex items-center justify-center">
                  <Loader2 size={18} className="animate-spin text-slate-400" />
                </div>
              ) : pendingInvites.length === 0 ? (
                <div className="card p-6 text-center text-sm text-slate-400">Geen openstaande uitnodigingen</div>
              ) : (
                <div className="card divide-y divide-slate-50 overflow-hidden">
                  {pendingInvites.map((inv) => {
                    const days = Math.ceil((new Date(inv.expires_at).getTime() - Date.now()) / 86400000);
                    const rc = ORG_ROLE_CONFIG[inv.org_role] ?? ORG_ROLE_CONFIG.member;

                    return (
                      <div key={inv.id} className="flex items-center gap-3 px-5 py-3.5">
                        <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                          <Mail size={16} className="text-amber-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{inv.email}</p>
                          <p className="text-xs text-slate-400">
                            Verloopt over {days} dag{days !== 1 ? "en" : ""}
                          </p>
                        </div>
                        <span className={clsx("text-xs font-semibold px-2.5 py-1 rounded-lg border", rc.bg, rc.color, rc.border)}>
                          {rc.label}
                        </span>
                        <button
                          onClick={() => revokeInvite(inv.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab: Instellingen */}
      {tab === "settings" && (
        <div className="space-y-5">
          {/* Huisstijl */}
          <div>
            <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-3">
              <Palette size={14} className="text-brand-500" /> Huisstijl & instellingen
            </h2>

            <div className="card p-6 space-y-5">
              {/* Logo URL */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <Image size={12} /> Logo URL
                  </span>
                </label>
                <div className="flex items-center gap-3">
                  {logoUrl && (
                    <img
                      src={logoUrl}
                      alt="Logo preview"
                      className="w-10 h-10 rounded-lg object-contain border border-slate-200 bg-white p-1"
                    />
                  )}
                  <input
                    type="url"
                    placeholder="https://..."
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                    disabled={!isAdmin}
                  />
                </div>
              </div>

              {/* Kleuren */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Primaire kleur
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer p-0.5 bg-white"
                      disabled={!isAdmin}
                    />
                    <input
                      type="text"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                      placeholder="#16a34a"
                      disabled={!isAdmin}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Accentkleur
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer p-0.5 bg-white"
                      disabled={!isAdmin}
                    />
                    <input
                      type="text"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                      placeholder="#15803d"
                      disabled={!isAdmin}
                    />
                  </div>
                </div>
              </div>

              {/* Plan + Active */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Plan
                  </label>
                  <input
                    value={plan}
                    onChange={(e) => setPlan(e.target.value)}
                    placeholder="bijv. free / pro / enterprise"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                    disabled={!isAdmin}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Organisatie actief
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="h-4 w-4"
                      disabled={!isAdmin}
                    />
                    <span className="text-sm text-slate-600">{isActive ? "Actief" : "Inactief"}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  onClick={saveOrgSettings}
                  disabled={settingsSaving || !isAdmin}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-60 transition-colors"
                >
                  {settingsSaving ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> Opslaan…
                    </>
                  ) : (
                    <>
                      <Check size={14} /> Instellingen opslaan
                    </>
                  )}
                </button>
              </div>

              {!isAdmin && (
                <div className="text-xs text-slate-400">Je hebt geen rechten om instellingen te wijzigen.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ✅ Stap 9E: Modules tab */}
      {tab === "modules" && (
        <div className="space-y-5">
          <div>
            <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-3">
              <Shield size={14} className="text-brand-500" /> Modules per organisatie
            </h2>

            <div className="card p-6 space-y-4">
              <p className="text-sm text-slate-500">
                Zet modules aan/uit per organisatie. Handig voor SaaS-licenties en gefaseerde uitrol.
              </p>

              <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white">
                {MODULES.map((m) => {
                  const checked = !!enabledModules[m.key];
                  return (
                    <div key={m.key} className="flex items-center justify-between gap-4 px-5 py-4">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-800">{m.label}</div>
                        <div className="text-xs text-slate-500">{m.desc}</div>
                      </div>

                      <label className="inline-flex items-center gap-3">
                        <span className="text-xs text-slate-500">{checked ? "Aan" : "Uit"}</span>
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={!isAdmin}
                          onChange={(e) => {
                            const v = e.target.checked;
                            setEnabledModules((prev) => ({ ...prev, [m.key]: v }));
                          }}
                          className="h-4 w-4"
                        />
                      </label>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={saveModules}
                  disabled={!isAdmin || modulesSaving}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-60 transition-colors"
                >
                  {modulesSaving ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> Opslaan…
                    </>
                  ) : (
                    <>
                      <Check size={14} /> Modules opslaan
                    </>
                  )}
                </button>
              </div>

              {!isAdmin && (
                <div className="text-xs text-slate-400">Je hebt geen rechten om modules te wijzigen.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}