"use client";

import React, { useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Building2, FolderKanban, Mail, Phone,
  Globe, MapPin, User, Hash, CheckCircle2, XCircle,
  Loader2, AlertCircle, Activity, FileText, Link2,
  Search, X, Save,
} from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import { DossierList } from "@/components/dossiers/DossierList";
import { ActivityFeed } from "@/components/activity/ActivityFeed";
import { relativeTime } from "@/lib/time";
import clsx from "clsx";
import type { Customer, Project, CustomerStatus } from "@/types";

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

type Tab = "algemeen" | "contactpersoon" | "projecten" | "dossier" | "activiteit";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "algemeen",       label: "Algemeen",       icon: Building2    },
  { id: "contactpersoon", label: "Contactpersoon", icon: User         },
  { id: "projecten",      label: "Projecten",      icon: FolderKanban },
  { id: "dossier",        label: "Dossier",        icon: FileText     },
  { id: "activiteit",     label: "Activiteit",     icon: Activity     },
];

// ─── Inline editable field ────────────────────────────────────

function InlineField({
  label, value, onChange, onSave, type = "text", placeholder, href,
}: {
  label:        string;
  value:        string;
  onChange:     (v: string) => void;
  onSave:       () => void;
  type?:        string;
  placeholder?: string;
  href?:        string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-600 mb-1">{label}</p>
      <div className={clsx(
        "flex items-center gap-2 rounded-xl px-3 py-2 border transition-all",
        focused
          ? "border-brand-500 ring-2 ring-brand-500/20 bg-white"
          : "border-slate-200 bg-white hover:border-slate-300"
      )}>
        <input
          type={type}
          value={value}
          placeholder={placeholder ?? `${label}…`}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => { setFocused(false); onSave(); }}
          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          className="flex-1 bg-transparent text-sm text-slate-800 placeholder:text-slate-400
                     focus:outline-none min-w-0"
        />
        {focused && <Save size={12} className="text-brand-500 flex-shrink-0" />}
        {!focused && value && href && (
          <a href={href} target="_blank" rel="noopener noreferrer" tabIndex={-1}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
            className="text-slate-400 hover:text-brand-600 transition-colors flex-shrink-0">
            <Globe size={12} />
          </a>
        )}
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500
                  pb-2 border-b border-slate-100 mb-4">
      {children}
    </p>
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

  const stats = {
    total:    linked.length,
    active:   linked.filter((p: Project) => p.status === "active").length,
    archived: linked.filter((p: Project) => p.status === "archived").length,
  };

  const linkable = allProjects.filter(p =>
    p.customer_id !== customer.id &&
    p.name.toLowerCase().includes(linkSearch.toLowerCase())
  );

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  function set(key: keyof EditState) {
    return (v: string) => setEdit((p: EditState) => ({ ...p, [key]: v }));
  }

  // Auto-save on blur
  const handleSave = useCallback(async (overrides?: Partial<EditState>) => {
    setSaving(true); setError(null);
    const payload = { ...edit, ...overrides };
    try {
      const res = await fetch(`/api/customers/${customer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Opslaan mislukt"); return; }
      setCustomer(data as Customer);
      showToast("Opgeslagen");
    } catch {
      setError("Er ging iets mis");
    } finally {
      setSaving(false);
    }
  }, [edit, customer.id]);

  async function setStatus(status: CustomerStatus) {
    setEdit((p: EditState) => ({ ...p, status }));
    await handleSave({ status });
  }

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

  return (
    <div className="-mx-4 sm:-mx-6 -my-4 sm:-my-6 flex min-h-[calc(100dvh-56px)]">

      {/* Toast */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl
                        border border-brand-200 bg-white text-brand-700 text-sm font-semibold shadow-lg">
          <span className="w-2 h-2 rounded-full bg-brand-500 flex-shrink-0" />
          {toast}
          {saving && <Loader2 size={12} className="animate-spin text-brand-400" />}
        </div>
      )}

      {/* ══ SIDEBAR ══════════════════════════════════════════ */}
      <aside className="hidden lg:flex flex-col w-[260px] flex-shrink-0 border-r border-slate-200 bg-white">

        <div className="px-5 pt-5 pb-4 border-b border-slate-200">
          <Link href="/customers"
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-brand-600
                       font-semibold transition-colors mb-3">
            <ArrowLeft size={13} /> Terug naar klanten
          </Link>

          {/* Naam + code */}
          <div className="flex items-start gap-2.5 mb-3">
            <div className="w-9 h-9 rounded-xl bg-brand-50 border border-brand-100 flex items-center
                            justify-center flex-shrink-0 mt-0.5">
              <Building2 size={16} className="text-brand-600" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-bold text-slate-800 leading-tight break-words">{customer.name}</h1>
              {customer.code && (
                <span className="text-[10px] font-mono text-slate-400 flex items-center gap-0.5 mt-0.5">
                  <Hash size={8} />{customer.code}
                </span>
              )}
            </div>
          </div>

          {/* Status — twee knoppen, vol gekleurd = actief */}
          <div className="flex gap-1.5">
            <button onClick={() => setStatus("active")}
              className={clsx(
                "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold border transition-all",
                customer.status === "active"
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                  : "bg-white text-slate-500 border-slate-200 hover:border-emerald-400 hover:text-emerald-700"
              )}>
              <CheckCircle2 size={11} /> Actief
            </button>
            <button onClick={() => setStatus("inactive")}
              className={clsx(
                "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold border transition-all",
                customer.status === "inactive"
                  ? "bg-slate-700 text-white border-slate-700 shadow-sm"
                  : "bg-white text-slate-500 border-slate-200 hover:border-slate-400 hover:text-slate-700"
              )}>
              <XCircle size={11} /> Inactief
            </button>
          </div>

          {/* Projecten stats */}
          <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-100">
            {[
              { label: "Totaal",  value: stats.total,    color: "text-slate-800" },
              { label: "Actief",  value: stats.active,   color: "text-emerald-700" },
              { label: "Archief", value: stats.archived, color: "text-slate-500" },
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className={clsx("text-lg font-bold", s.color)}>{s.value}</p>
                <p className="text-[10px] font-semibold text-slate-400">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs — actief = vol groen */}
        <nav className="flex flex-col gap-0.5 px-2 py-3 flex-1">
          {TABS.map(tab => {
            const Icon   = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all text-left",
                  active
                    ? "bg-brand-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-800"
                )}>
                <Icon size={15} className={active ? "opacity-80" : "text-slate-400"} />
                {tab.label}
                {tab.id === "projecten" && linked.length > 0 && (
                  <span className={clsx(
                    "ml-auto text-[11px] font-bold px-1.5 py-0.5 rounded-full",
                    active ? "bg-white/25 text-white" : "bg-slate-100 text-slate-600"
                  )}>
                    {linked.length}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Quick meta */}
        <div className="px-5 py-4 border-t border-slate-200 space-y-2 text-xs text-slate-500">
          {customer.email && (
            <a href={`mailto:${customer.email}`}
              className="flex items-center gap-2 hover:text-brand-600 transition-colors min-w-0">
              <Mail size={11} className="text-slate-400 flex-shrink-0" />
              <span className="truncate">{customer.email}</span>
            </a>
          )}
          {customer.phone && (
            <a href={`tel:${customer.phone}`}
              className="flex items-center gap-2 hover:text-brand-600 transition-colors">
              <Phone size={11} className="text-slate-400 flex-shrink-0" />{customer.phone}
            </a>
          )}
          {customer.address_city && (
            <span className="flex items-center gap-2">
              <MapPin size={11} className="text-slate-400 flex-shrink-0" />{customer.address_city}
            </span>
          )}
          <p className="text-slate-400 text-[11px] pt-1.5 border-t border-slate-100">
            Bijgewerkt {relativeTime(customer.updated_at)}
          </p>
        </div>
      </aside>

      {/* ══ TAB INHOUD ═══════════════════════════════════════ */}
      <div className="flex-1 min-w-0 overflow-y-auto bg-slate-50">

        {/* Mobiele header */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-200">
          <Link href="/customers" className="text-slate-500 hover:text-brand-600 transition-colors">
            <ArrowLeft size={16} />
          </Link>
          <h1 className="font-bold text-slate-800 flex-1 truncate">{customer.name}</h1>
        </div>
        <div className="lg:hidden flex gap-1 px-4 py-2 bg-white border-b border-slate-200 overflow-x-auto">
          {TABS.map(tab => {
            const Icon   = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  "flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                  active ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-100"
                )}>
                <Icon size={12} /> {tab.label}
              </button>
            );
          })}
        </div>

        {error && (
          <div className="mx-6 mt-4 flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200
                          rounded-xl text-sm text-red-700 font-medium">
            <AlertCircle size={14} className="flex-shrink-0" /> {error}
            <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">
              <X size={14} />
            </button>
          </div>
        )}

        {/* ── Algemeen ──────────────────────────────────── */}
        {activeTab === "algemeen" && (
          <div className="p-6 max-w-xl space-y-4">
            <p className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
              <Save size={11} /> Velden worden automatisch opgeslagen bij verlaten
            </p>

            <div className="card p-5 space-y-4">
              <SectionLabel>Identiteit</SectionLabel>
              <InlineField label="Naam" value={edit.name}
                onChange={set("name")} onSave={() => handleSave()}
                placeholder="Klantnaam" />
              <InlineField label="Code" value={edit.code}
                onChange={set("code")} onSave={() => handleSave()}
                placeholder="bijv. KL-001" />
            </div>

            <div className="card p-5 space-y-4">
              <SectionLabel>Contactgegevens</SectionLabel>
              <InlineField label="E-mail" value={edit.email} type="email"
                onChange={set("email")} onSave={() => handleSave()}
                placeholder="info@bedrijf.nl"
                href={edit.email ? `mailto:${edit.email}` : undefined} />
              <InlineField label="Telefoon" value={edit.phone} type="tel"
                onChange={set("phone")} onSave={() => handleSave()}
                placeholder="+31 6 12345678"
                href={edit.phone ? `tel:${edit.phone}` : undefined} />
              <InlineField label="Website" value={edit.website} type="url"
                onChange={set("website")} onSave={() => handleSave()}
                placeholder="https://bedrijf.nl"
                href={edit.website || undefined} />
            </div>

            <div className="card p-5 space-y-4">
              <SectionLabel>Adres</SectionLabel>
              <InlineField label="Straat" value={edit.address_street}
                onChange={set("address_street")} onSave={() => handleSave()}
                placeholder="Straatnaam 1" />
              <div className="grid grid-cols-2 gap-4">
                <InlineField label="Postcode" value={edit.address_zip}
                  onChange={set("address_zip")} onSave={() => handleSave()}
                  placeholder="1234 AB" />
                <InlineField label="Stad" value={edit.address_city}
                  onChange={set("address_city")} onSave={() => handleSave()}
                  placeholder="Amsterdam" />
              </div>
              <InlineField label="Land" value={edit.address_country}
                onChange={set("address_country")} onSave={() => handleSave()}
                placeholder="Nederland" />
            </div>
          </div>
        )}

        {/* ── Contactpersoon ────────────────────────────── */}
        {activeTab === "contactpersoon" && (
          <div className="p-6 max-w-xl space-y-4">
            <p className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
              <Save size={11} /> Velden worden automatisch opgeslagen bij verlaten
            </p>
            <div className="card p-5 space-y-4">
              <SectionLabel>Contactpersoon</SectionLabel>
              <InlineField label="Naam" value={edit.contact_name}
                onChange={set("contact_name")} onSave={() => handleSave()}
                placeholder="Jan Jansen" />
              <InlineField label="Functie" value={edit.contact_role}
                onChange={set("contact_role")} onSave={() => handleSave()}
                placeholder="Directeur" />
              <InlineField label="E-mail" value={edit.contact_email} type="email"
                onChange={set("contact_email")} onSave={() => handleSave()}
                placeholder="jan@bedrijf.nl"
                href={edit.contact_email ? `mailto:${edit.contact_email}` : undefined} />
              <InlineField label="Telefoon" value={edit.contact_phone} type="tel"
                onChange={set("contact_phone")} onSave={() => handleSave()}
                placeholder="+31 6 87654321"
                href={edit.contact_phone ? `tel:${edit.contact_phone}` : undefined} />
            </div>
          </div>
        )}

        {/* ── Projecten ─────────────────────────────────── */}
        {activeTab === "projecten" && (
          <div className="p-6 max-w-2xl space-y-4">
            <div className="card p-4 space-y-3">
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                <Link2 size={11} /> Project koppelen
              </p>
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input className="input pl-8 text-sm" placeholder="Zoek project…"
                  value={linkSearch}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLinkSearch(e.target.value)} />
              </div>
              {linkSearch && (
                <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100">
                  {linkable.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-4">Geen projecten gevonden.</p>
                  ) : linkable.map(p => (
                    <div key={p.id} className="flex items-center justify-between px-3 py-2.5">
                      <span className="text-sm text-slate-700 font-medium truncate">{p.name}</span>
                      <button onClick={() => linkProject(p.id)} disabled={linkLoading === p.id}
                        className="text-xs px-2.5 py-1 rounded-lg bg-brand-50 text-brand-700
                                   hover:bg-brand-100 font-bold border border-brand-100 flex-shrink-0 ml-2">
                        {linkLoading === p.id ? <Loader2 size={12} className="animate-spin" /> : "Koppelen"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {linked.length === 0 ? (
              <div className="card p-10 text-center">
                <FolderKanban size={32} className="mx-auto mb-3 text-slate-300" />
                <p className="text-sm text-slate-500 font-medium">Nog geen projecten gekoppeld.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {linked.map((p: Project) => (
                  <div key={p.id}
                    className="card p-4 flex items-center gap-3 hover:border-brand-200
                               hover:bg-brand-50/30 transition-all group cursor-pointer"
                    onClick={() => router.push(`/projects/${p.id}`)}>
                    <FolderKanban size={15} className="text-slate-400 flex-shrink-0" />
                    <span className="flex-1 text-sm font-semibold text-slate-700
                                     group-hover:text-brand-700 transition-colors truncate">
                      {p.name}
                    </span>
                    <StatusBadge status={p.status} />
                    <button
                      onClick={(e: React.MouseEvent) => { e.stopPropagation(); unlinkProject(p.id); }}
                      disabled={linkLoading === p.id}
                      className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50
                                 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                      title="Ontkoppelen">
                      {linkLoading === p.id ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Dossier ───────────────────────────────────── */}
        {activeTab === "dossier" && (
          <div className="p-6"><DossierList customerId={customer.id} /></div>
        )}

        {/* ── Activiteit ────────────────────────────────── */}
        {activeTab === "activiteit" && (
          <div className="p-6 max-w-2xl">
            <ActivityFeed customerId={customer.id} title="" />
          </div>
        )}
      </div>
    </div>
  );
}
