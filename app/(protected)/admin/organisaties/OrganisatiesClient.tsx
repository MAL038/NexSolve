"use client";
// app/(protected)/admin/organisaties/OrganisatiesClient.tsx

import { useState } from "react";
import {
  Building2, Plus, Users, ChevronDown, Check,
  Loader2, Trash2, X, Crown, ToggleLeft, ToggleRight,
} from "lucide-react";
import clsx from "clsx";
import { formatDate } from "@/lib/time";

interface Profile { id: string; full_name: string; email: string }
interface OrgMember { role: string; user_id: string; profile: Profile }
interface Org {
  id: string; name: string; slug: string; plan: string;
  is_active: boolean; created_at: string;
  organisation_members: OrgMember[];
}

const PLAN_COLORS: Record<string, string> = {
  trial:      "bg-slate-100 text-slate-600 border-slate-200",
  starter:    "bg-blue-50 text-blue-700 border-blue-200",
  pro:        "bg-brand-50 text-brand-700 border-brand-200",
  enterprise: "bg-amber-50 text-amber-700 border-amber-200",
};

interface Props { initialOrgs: Org[]; profiles: Profile[] }

function normalizeOrg(org: Partial<Org> | null | undefined): Org | null {
  if (!org?.id || !org?.name || !org?.slug || !org?.created_at) return null;
  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    plan: org.plan ?? "trial",
    is_active: org.is_active ?? true,
    created_at: org.created_at,
    organisation_members: Array.isArray(org.organisation_members) ? org.organisation_members.filter(Boolean) as OrgMember[] : [],
  };
}

function normalizeOrgs(orgs: unknown): Org[] {
  if (!Array.isArray(orgs)) return [];
  return orgs.map(org => normalizeOrg(org as Partial<Org>)).filter((org): org is Org => Boolean(org));
}

export default function OrganisatiesClient({ initialOrgs, profiles }: Props) {
  const [orgs,       setOrgs]       = useState<Org[]>(() => normalizeOrgs(initialOrgs));
  const [showNew,    setShowNew]     = useState(false);
  const [toast,      setToast]       = useState<{ msg: string; ok: boolean } | null>(null);
  const [saving,     setSaving]      = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Nieuwe org form
  const [newName,    setNewName]    = useState("");
  const [newPlan,    setNewPlan]    = useState("trial");
  const [ownerId,    setOwnerId]    = useState("");

  function showMsg(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    setSaving(true);
    const res = await fetch("/api/admin/organisations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), plan: newPlan, owner_id: ownerId || null }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { showMsg(data.error ?? "Aanmaken mislukt", false); return; }
    const createdOrg = normalizeOrg(data as Partial<Org>);
    if (!createdOrg) {
      showMsg("Organisatie aangemaakt, maar opnieuw laden is nodig om details te tonen", false);
      return;
    }
    setOrgs(prev => [createdOrg, ...prev]);
    setShowNew(false);
    setNewName(""); setNewPlan("trial"); setOwnerId("");
    showMsg(`Organisatie "${data.name}" aangemaakt`);
  }

  async function handleToggleActive(org: Org) {
    const res = await fetch(`/api/admin/organisations/${org.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !org.is_active }),
    });
    if (!res.ok) { showMsg("Bijwerken mislukt", false); return; }
    setOrgs(prev => prev.map(o => o.id === org.id ? { ...o, is_active: !org.is_active } : o));
    showMsg(`Organisatie ${!org.is_active ? "geactiveerd" : "gedeactiveerd"}`);
  }

  async function handleDelete(org: Org) {
    if (!confirm(`"${org.name}" definitief verwijderen? Dit kan niet ongedaan worden gemaakt.`)) return;
    const res = await fetch(`/api/admin/organisations/${org.id}`, { method: "DELETE" });
    if (!res.ok) { showMsg("Verwijderen mislukt", false); return; }
    setOrgs(prev => prev.filter(o => o.id !== org.id));
    showMsg(`"${org.name}" verwijderd`);
  }

  async function handleSetOwner(orgId: string, userId: string) {
    const res = await fetch(`/api/admin/organisations/${orgId}/owner`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId }),
    });
    const data = await res.json();
    if (!res.ok) { showMsg(data.error ?? "Mislukt", false); return; }
    // Refresh org members
    const fresh = await fetch("/api/admin/organisations").then(r => r.json());
    setOrgs(normalizeOrgs(fresh));
    showMsg("Owner bijgewerkt");
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Building2 size={20} className="text-brand-600" /> Organisaties
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">{orgs.length} organisatie{orgs.length !== 1 ? "s" : ""}</p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary gap-1.5">
          <Plus size={15} /> Nieuwe organisatie
        </button>
      </div>

      {/* Nieuwe org form */}
      {showNew && (
        <div className="card p-5 space-y-4 border-brand-200 bg-brand-50/30">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Plus size={14} /> Nieuwe organisatie aanmaken
            </p>
            <button onClick={() => setShowNew(false)} className="text-slate-400 hover:text-slate-600">
              <X size={15} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="label">Organisatienaam *</label>
              <input
                className="input"
                placeholder="Bedrijf BV"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleCreate()}
                autoFocus
              />
            </div>
            <div>
              <label className="label">Plan</label>
              <select className="input" value={newPlan} onChange={e => setNewPlan(e.target.value)}>
                <option value="trial">Trial</option>
                <option value="starter">Starter</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
            <div>
              <label className="label">Owner (optioneel)</label>
              <select className="input" value={ownerId} onChange={e => setOwnerId(e.target.value)}>
                <option value="">— Selecteer gebruiker —</option>
                {profiles.map(p => (
                  <option key={p.id} value={p.id}>{p.full_name} ({p.email})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowNew(false)} className="btn-secondary text-sm">Annuleren</button>
            <button onClick={handleCreate} disabled={saving || !newName.trim()} className="btn-primary text-sm">
              {saving ? <><Loader2 size={13} className="animate-spin" /> Aanmaken...</> : <><Check size={13} /> Aanmaken</>}
            </button>
          </div>
        </div>
      )}

      {/* Org lijst */}
      <div className="space-y-3">
        {orgs.length === 0 && (
          <div className="card p-10 text-center text-slate-400 text-sm">
            Nog geen organisaties aangemaakt
          </div>
        )}
        {orgs.map(org => {
          const owner = org.organisation_members?.find(m => m.role === "owner");
          const memberCount = org.organisation_members?.length ?? 0;
          const expanded = expandedId === org.id;

          return (
            <div key={org.id} className="card overflow-hidden">
              {/* Org header row */}
              <div
                className="flex items-center gap-3 p-4 cursor-pointer hover:bg-slate-50/60"
                onClick={() => setExpandedId(expanded ? null : org.id)}
              >
                <div className="w-9 h-9 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center flex-shrink-0">
                  <Building2 size={16} className="text-brand-600" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-800">{org.name}</p>
                    {!org.is_active && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-red-50 text-red-600 border border-red-200">
                        Inactief
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 truncate">
                    {org.slug} · {memberCount} lid{memberCount !== 1 ? "en" : ""} · aangemaakt {formatDate(org.created_at)}
                  </p>
                </div>

                <span className={clsx("text-xs font-semibold px-2 py-0.5 rounded-lg border uppercase tracking-wide flex-shrink-0", PLAN_COLORS[org.plan] ?? PLAN_COLORS.trial)}>
                  {org.plan}
                </span>

                <ChevronDown size={14} className={clsx("text-slate-400 flex-shrink-0 transition-transform", expanded && "rotate-180")} />
              </div>

              {/* Expanded details */}
              {expanded && (
                <div className="border-t border-slate-100 p-4 space-y-4 bg-slate-50/40">

                  {/* Owner */}
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                      <Crown size={11} /> Owner
                    </p>
                    {owner ? (
                      <div className="flex items-center gap-2 text-sm text-slate-700">
                        <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center text-xs font-semibold text-amber-700">
                          {owner.profile.full_name?.charAt(0) ?? "?"}
                        </div>
                        {owner.profile.full_name} <span className="text-slate-400">({owner.profile.email})</span>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">Geen owner ingesteld</p>
                    )}

                    {/* Owner wijzigen */}
                    <div className="mt-2 flex gap-2">
                      <select
                        className="input text-xs flex-1"
                        defaultValue=""
                        onChange={e => e.target.value && handleSetOwner(org.id, e.target.value)}
                      >
                        <option value="">Owner wijzigen...</option>
                        {profiles.map(p => (
                          <option key={p.id} value={p.id}>{p.full_name} ({p.email})</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Leden */}
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                      <Users size={11} /> Leden ({memberCount})
                    </p>
                    <div className="space-y-1">
                      {org.organisation_members?.map(m => (
                        <div key={m.user_id} className="flex items-center gap-2 text-xs text-slate-600">
                          <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-medium">
                            {m.profile.full_name?.charAt(0) ?? "?"}
                          </div>
                          <span className="flex-1">{m.profile.full_name}</span>
                          <span className="text-slate-400">{m.profile.email}</span>
                          <span className={clsx(
                            "px-1.5 py-0.5 rounded border font-medium",
                            m.role === "owner" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-slate-100 text-slate-500 border-slate-200"
                          )}>
                            {m.role === "owner" ? "Owner" : "Lid"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Acties */}
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                    <button
                      onClick={() => handleToggleActive(org)}
                      className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100"
                    >
                      {org.is_active
                        ? <><ToggleRight size={13} className="text-brand-500" /> Deactiveren</>
                        : <><ToggleLeft size={13} /> Activeren</>
                      }
                    </button>
                    <button
                      onClick={() => handleDelete(org)}
                      className="flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700 px-3 py-1.5 rounded-lg border border-red-200 hover:bg-red-50 ml-auto"
                    >
                      <Trash2 size={13} /> Verwijderen
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
