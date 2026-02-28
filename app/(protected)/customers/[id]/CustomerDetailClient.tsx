"use client";

import React, { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Building2, FolderKanban, Mail, Phone,
  Globe, MapPin, User, Briefcase, Hash, CheckCircle2,
  XCircle, Check, X, Loader2, AlertCircle, Activity,
  FileText, Link2, Search, LayoutGrid, Pencil,
} from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import { DossierList } from "@/components/dossiers/DossierList";
import { ActivityFeed } from "@/components/activity/ActivityFeed";
import { formatDate, relativeTime } from "@/lib/time";
import clsx from "clsx";
import type { Customer, Project, CustomerStatus } from "@/types";

// ─── Types ────────────────────────────────────────────────────

interface Props {
  customer:       Customer;
  linkedProjects: Project[];
  allProjects:    Project[];
}

interface EditState {
  name:            string;
  code:            string;
  status:          CustomerStatus;
  email:           string;
  phone:           string;
  website:         string;
  address_street:  string;
  address_zip:     string;
  address_city:    string;
  address_country: string;
  contact_name:    string;
  contact_role:    string;
  contact_email:   string;
  contact_phone:   string;
}

type Tab = "algemeen" | "projecten" | "dossier" | "activiteit" | "bewerken";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "algemeen",   label: "Algemeen",   icon: LayoutGrid  },
  { id: "projecten",  label: "Projecten",  icon: FolderKanban},
  { id: "dossier",    label: "Dossier",    icon: FileText    },
  { id: "activiteit", label: "Activiteit", icon: Activity    },
  { id: "bewerken",   label: "Bewerken",   icon: Pencil      },
];

function InfoRow({ label, value, href }: { label: string; value?: string | null; href?: string }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer"
          className="text-sm text-brand-600 hover:underline font-medium break-all">
          {value}
        </a>
      ) : (
        <p className="text-sm text-slate-700">{value}</p>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────

export default function CustomerDetailClient({
  customer: initial,
  linkedProjects: initialLinked,
  allProjects,
}: Props) {
  const router = useRouter();

  const [customer,    setCustomer]    = useState<Customer>(initial);
  const [linked,      setLinked]      = useState<Project[]>(initialLinked);
  const [activeTab,   setActiveTab]   = useState<Tab>("algemeen");
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [toast,       setToast]       = useState<string | null>(null);
  const [linkSearch,  setLinkSearch]  = useState("");
  const [linkLoading, setLinkLoading] = useState<string | null>(null);

  const [edit, setEdit] = useState<EditState>({
    name:            initial.name,
    code:            initial.code ?? "",
    status:          initial.status,
    email:           initial.email ?? "",
    phone:           initial.phone ?? "",
    website:         initial.website ?? "",
    address_street:  initial.address_street ?? "",
    address_zip:     initial.address_zip ?? "",
    address_city:    initial.address_city ?? "",
    address_country: initial.address_country ?? "",
    contact_name:    initial.contact_name ?? "",
    contact_role:    initial.contact_role ?? "",
    contact_email:   initial.contact_email ?? "",
    contact_phone:   initial.contact_phone ?? "",
  });

  // ── Derived ───────────────────────────────────────────────
  const stats = {
    total:      linked.length,
    active:     linked.filter((p: Project) => p.status === "active").length,
    inProgress: linked.filter((p: Project) => p.status === "in-progress").length,
    archived:   linked.filter((p: Project) => p.status === "archived").length,
  };

  const fullAddress = [
    customer.address_street,
    customer.address_zip && customer.address_city
      ? `${customer.address_zip} ${customer.address_city}`
      : customer.address_city ?? customer.address_zip,
    customer.address_country,
  ].filter(Boolean).join(", ");

  const linkable = allProjects.filter(p =>
    p.customer_id !== customer.id &&
    p.name.toLowerCase().includes(linkSearch.toLowerCase())
  );

  // ── Helpers ───────────────────────────────────────────────
  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  function handleTabClick(tab: Tab) {
    if (tab === "bewerken") {
      setEdit({
        name:            customer.name,
        code:            customer.code ?? "",
        status:          customer.status,
        email:           customer.email ?? "",
        phone:           customer.phone ?? "",
        website:         customer.website ?? "",
        address_street:  customer.address_street ?? "",
        address_zip:     customer.address_zip ?? "",
        address_city:    customer.address_city ?? "",
        address_country: customer.address_country ?? "",
        contact_name:    customer.contact_name ?? "",
        contact_role:    customer.contact_role ?? "",
        contact_email:   customer.contact_email ?? "",
        contact_phone:   customer.contact_phone ?? "",
      });
      setError(null);
    }
    setActiveTab(tab);
  }

  // ── Save ──────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!edit.name.trim()) { setError("Naam is verplicht"); return; }
    setSaving(true); setError(null);
    try {
      const res = await fetch(`/api/customers/${customer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(edit),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Opslaan mislukt"); return; }
      setCustomer(data as Customer);
      setActiveTab("algemeen");
      showToast("Klant opgeslagen");
    } catch {
      setError("Er ging iets mis");
    } finally {
      setSaving(false);
    }
  }, [edit, customer.id]);

  // ── Link / Unlink ─────────────────────────────────────────
  async function linkProject(projectId: string) {
    setLinkLoading(projectId);
    const res = await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customer_id: customer.id }),
    });
    if (res.ok) {
      const project = allProjects.find(p => p.id === projectId);
      if (project) setLinked((prev: Project[]) => [{ ...project, customer_id: customer.id }, ...prev]);
    }
    setLinkLoading(null);
  }

  async function unlinkProject(projectId: string) {
    setLinkLoading(projectId);
    const res = await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customer_id: null }),
    });
    if (res.ok) setLinked((prev: Project[]) => prev.filter((p: Project) => p.id !== projectId));
    setLinkLoading(null);
  }

  // ── Field helper ─────────────────────────────────────────
  function field(
    key: keyof EditState,
    label: string,
    opts?: { type?: string; placeholder?: string }
  ) {
    return (
      <div>
        <label className="label">{label}</label>
        <input
          type={opts?.type ?? "text"}
          value={edit[key] as string}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setEdit((p: EditState) => ({ ...p, [key]: e.target.value }))
          }
          placeholder={opts?.placeholder}
          className="input"
        />
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="-mx-4 sm:-mx-6 -my-4 sm:-my-6 flex min-h-[calc(100dvh-56px)]">

      {/* Toast */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl
                        border border-brand-200 bg-white text-brand-700 text-sm font-medium shadow-lg">
          <span className="w-2 h-2 rounded-full bg-brand-500 flex-shrink-0" />
          {toast}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          SIDEBAR
      ══════════════════════════════════════════════════════ */}
      <aside className="hidden lg:flex flex-col w-[260px] flex-shrink-0 border-r border-slate-100 bg-white">

        {/* Naam + status */}
        <div className="px-5 pt-5 pb-4 border-b border-slate-100">
          <Link href="/customers"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-brand-600
                       font-medium transition-colors mb-3">
            <ArrowLeft size={13} /> Terug naar klanten
          </Link>

          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0">
              <Building2 size={15} className="text-brand-500" />
            </div>
            <h1 className="text-base font-bold text-slate-800 leading-snug truncate">{customer.name}</h1>
          </div>

          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {customer.status === "active" ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700
                               bg-emerald-50 px-2.5 py-1 rounded-lg">
                <CheckCircle2 size={11} /> Actief
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500
                               bg-slate-100 px-2.5 py-1 rounded-lg">
                <XCircle size={11} /> Inactief
              </span>
            )}
            {customer.code && (
              <span className="text-[11px] font-mono bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded
                               flex items-center gap-0.5">
                <Hash size={9} />{customer.code}
              </span>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-50">
            {[
              { label: "Totaal",  value: stats.total,      color: "text-slate-700" },
              { label: "Actief",  value: stats.active,     color: "text-emerald-600" },
              { label: "Archief", value: stats.archived,   color: "text-slate-400" },
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className={clsx("text-lg font-bold", s.color)}>{s.value}</p>
                <p className="text-[10px] text-slate-400">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Verticale tabs */}
        <nav className="flex flex-col gap-0.5 px-2 py-3">
          {TABS.map(tab => {
            const Icon   = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => handleTabClick(tab.id)}
                className={clsx(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left",
                  active
                    ? "bg-brand-50 text-brand-700"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                )}>
                <Icon size={15} className={active ? "text-brand-500" : "text-slate-400"} />
                {tab.label}
                {tab.id === "projecten" && linked.length > 0 && (
                  <span className={clsx(
                    "ml-auto text-[11px] font-semibold px-1.5 py-0.5 rounded-full",
                    active ? "bg-brand-100 text-brand-700" : "bg-slate-100 text-slate-400"
                  )}>
                    {linked.length}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Snelle metadata */}
        <div className="mt-auto px-5 py-5 border-t border-slate-100 space-y-3 text-xs text-slate-400">
          {customer.email && (
            <a href={`mailto:${customer.email}`} className="flex items-center gap-2 hover:text-brand-600 transition-colors truncate">
              <Mail size={11} className="flex-shrink-0" /> {customer.email}
            </a>
          )}
          {customer.phone && (
            <a href={`tel:${customer.phone}`} className="flex items-center gap-2 hover:text-brand-600 transition-colors">
              <Phone size={11} className="flex-shrink-0" /> {customer.phone}
            </a>
          )}
          {customer.address_city && (
            <span className="flex items-center gap-2">
              <MapPin size={11} className="flex-shrink-0" /> {customer.address_city}
            </span>
          )}
          <p className="pt-1 border-t border-slate-50">
            Bijgewerkt {relativeTime(customer.updated_at)}
          </p>
        </div>
      </aside>

      {/* ══════════════════════════════════════════════════════
          TAB INHOUD
      ══════════════════════════════════════════════════════ */}
      <div className="flex-1 min-w-0 overflow-y-auto bg-slate-50">

        {/* Mobiele header */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-100">
          <Link href="/customers" className="text-slate-400 hover:text-brand-600 transition-colors">
            <ArrowLeft size={16} />
          </Link>
          <h1 className="font-bold text-slate-800 flex-1 truncate">{customer.name}</h1>
          {customer.status === "active"
            ? <span className="text-xs text-emerald-600 font-medium">Actief</span>
            : <span className="text-xs text-slate-400 font-medium">Inactief</span>
          }
        </div>

        {/* Mobiele tabs */}
        <div className="lg:hidden flex gap-1 px-4 py-2 bg-white border-b border-slate-100 overflow-x-auto">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => handleTabClick(tab.id)}
                className={clsx(
                  "flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                  active ? "bg-brand-50 text-brand-700" : "text-slate-500 hover:bg-slate-50"
                )}>
                <Icon size={12} /> {tab.label}
              </button>
            );
          })}
        </div>

        {/* ── Tab: Algemeen ─────────────────────────────── */}
        {activeTab === "algemeen" && (
          <div className="p-6 max-w-2xl space-y-6">

            {/* Contactgegevens */}
            {(customer.email || customer.phone || customer.website) && (
              <div className="card p-5 space-y-4">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Contactgegevens</p>
                <InfoRow label="E-mail"   value={customer.email}
                  href={customer.email ? `mailto:${customer.email}` : undefined} />
                <InfoRow label="Telefoon" value={customer.phone}
                  href={customer.phone ? `tel:${customer.phone}` : undefined} />
                <InfoRow label="Website"  value={customer.website}
                  href={customer.website ?? undefined} />
              </div>
            )}

            {/* Adres */}
            {fullAddress && (
              <div className="card p-5 space-y-3">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Adres</p>
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(fullAddress)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-start gap-2 text-sm text-brand-600 hover:underline"
                >
                  <MapPin size={14} className="mt-0.5 flex-shrink-0" />
                  <span>{fullAddress}</span>
                </a>
              </div>
            )}

            {/* Contactpersoon */}
            {customer.contact_name && (
              <div className="card p-5 space-y-4">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Contactpersoon</p>
                <InfoRow label="Naam"     value={customer.contact_name} />
                <InfoRow label="Functie"  value={customer.contact_role} />
                <InfoRow label="E-mail"   value={customer.contact_email}
                  href={customer.contact_email ? `mailto:${customer.contact_email}` : undefined} />
                <InfoRow label="Telefoon" value={customer.contact_phone}
                  href={customer.contact_phone ? `tel:${customer.contact_phone}` : undefined} />
              </div>
            )}

            {/* Leeg staat */}
            {!customer.email && !customer.phone && !customer.website &&
             !fullAddress && !customer.contact_name && (
              <div className="card p-10 text-center text-slate-400">
                <Building2 size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">Nog geen gegevens ingevuld.</p>
                <button onClick={() => handleTabClick("bewerken")}
                  className="mt-3 text-sm text-brand-600 hover:underline">
                  Gegevens invullen →
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Projecten ────────────────────────────── */}
        {activeTab === "projecten" && (
          <div className="p-6 max-w-2xl space-y-4">

            {/* Koppelen */}
            <div className="card p-4 space-y-3">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <Link2 size={11} /> Project koppelen
              </p>
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  className="input pl-8 text-sm"
                  placeholder="Zoek project om te koppelen…"
                  value={linkSearch}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLinkSearch(e.target.value)}
                />
              </div>
              {linkSearch && (
                <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-100 divide-y divide-slate-50">
                  {linkable.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-4">Geen projecten gevonden.</p>
                  ) : linkable.map(p => (
                    <div key={p.id} className="flex items-center justify-between px-3 py-2.5">
                      <span className="text-sm text-slate-700 truncate">{p.name}</span>
                      <button
                        onClick={() => linkProject(p.id)}
                        disabled={linkLoading === p.id}
                        className="text-xs px-2.5 py-1 rounded-lg bg-brand-50 text-brand-700
                                   hover:bg-brand-100 font-medium transition-colors flex-shrink-0 ml-2"
                      >
                        {linkLoading === p.id
                          ? <Loader2 size={12} className="animate-spin" />
                          : "Koppelen"
                        }
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Gekoppelde projecten */}
            {linked.length === 0 ? (
              <div className="card p-10 text-center text-slate-400">
                <FolderKanban size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">Nog geen projecten gekoppeld.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {linked.map((p: Project) => (
                  <div key={p.id}
                    className="card p-4 flex items-center gap-3 hover:border-brand-100
                               hover:bg-brand-50/20 transition-colors group cursor-pointer"
                    onClick={() => router.push(`/projects/${p.id}`)}
                  >
                    <FolderKanban size={15} className="text-slate-400 flex-shrink-0" />
                    <span className="flex-1 text-sm font-medium text-slate-700
                                     group-hover:text-brand-700 transition-colors truncate">
                      {p.name}
                    </span>
                    <StatusBadge status={p.status} />
                    <button
                      onClick={(e: React.MouseEvent) => { e.stopPropagation(); unlinkProject(p.id); }}
                      disabled={linkLoading === p.id}
                      className="p-1.5 rounded-lg text-slate-300 hover:text-red-400 hover:bg-red-50
                                 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                      title="Ontkoppelen"
                    >
                      {linkLoading === p.id
                        ? <Loader2 size={12} className="animate-spin" />
                        : <X size={12} />
                      }
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Dossier ─────────────────────────────── */}
        {activeTab === "dossier" && (
          <div className="p-6">
            <DossierList customerId={customer.id} />
          </div>
        )}

        {/* ── Tab: Activiteit ──────────────────────────── */}
        {activeTab === "activiteit" && (
          <div className="p-6 max-w-2xl">
            <ActivityFeed customerId={customer.id} title="" />
          </div>
        )}

        {/* ── Tab: Bewerken ─────────────────────────────── */}
        {activeTab === "bewerken" && (
          <div className="p-6 max-w-2xl space-y-8">

            {error && (
              <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200
                              rounded-xl text-sm text-red-700">
                <AlertCircle size={14} className="flex-shrink-0" /> {error}
              </div>
            )}

            {/* Identiteit */}
            <div className="space-y-4">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Identiteit</p>
              {field("name", "Naam *", { placeholder: "Klantnaam" })}
              <div className="grid grid-cols-2 gap-4">
                {field("code", "Code", { placeholder: "bijv. KL-001" })}
                <div>
                  <label className="label">Status</label>
                  <div className="flex gap-2">
                    {(["active", "inactive"] as CustomerStatus[]).map(s => (
                      <button key={s} type="button"
                        onClick={() => setEdit((p: EditState) => ({ ...p, status: s }))}
                        className={clsx(
                          "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium border transition-all",
                          edit.status === s
                            ? s === "active"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 ring-2 ring-emerald-300 ring-offset-1"
                              : "bg-slate-100 text-slate-600 border-slate-200 ring-2 ring-slate-300 ring-offset-1"
                            : "bg-white border-slate-200 text-slate-400 hover:border-slate-300"
                        )}>
                        {s === "active"
                          ? <><CheckCircle2 size={13} /> Actief</>
                          : <><XCircle size={13} /> Inactief</>
                        }
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Contactgegevens */}
            <div className="space-y-4">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Contactgegevens</p>
              {field("email",   "E-mail",   { type: "email",   placeholder: "info@bedrijf.nl" })}
              {field("phone",   "Telefoon", { type: "tel",     placeholder: "+31 6 12345678" })}
              {field("website", "Website",  { type: "url",     placeholder: "https://bedrijf.nl" })}
            </div>

            {/* Adres */}
            <div className="space-y-4">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Adres</p>
              {field("address_street",  "Straat",  { placeholder: "Straatnaam 1" })}
              <div className="grid grid-cols-2 gap-4">
                {field("address_zip",  "Postcode", { placeholder: "1234 AB" })}
                {field("address_city", "Stad",     { placeholder: "Amsterdam" })}
              </div>
              {field("address_country", "Land", { placeholder: "Nederland" })}
            </div>

            {/* Contactpersoon */}
            <div className="space-y-4">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Contactpersoon</p>
              {field("contact_name",  "Naam",     { placeholder: "Jan Jansen" })}
              {field("contact_role",  "Functie",  { placeholder: "Directeur" })}
              {field("contact_email", "E-mail",   { type: "email", placeholder: "jan@bedrijf.nl" })}
              {field("contact_phone", "Telefoon", { type: "tel",   placeholder: "+31 6 87654321" })}
            </div>

            {/* Acties */}
            <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
              <button onClick={handleSave} disabled={saving} className="btn-primary">
                {saving
                  ? <><Loader2 size={14} className="animate-spin" /> Opslaan…</>
                  : <><Check size={14} /> Opslaan</>
                }
              </button>
              <button
                onClick={() => setActiveTab("algemeen")}
                className="btn-outline"
              >
                <X size={14} /> Annuleren
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
