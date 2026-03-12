"use client";

import React, { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Building2, FolderKanban, Mail, Phone,
  Globe, MapPin, User, Hash, CheckCircle2, XCircle,
  Loader2, AlertCircle, FileText, Activity, Link2,
  Search, X, Check, Pencil, Settings, Trash2,
} from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import { DossierList } from "@/components/dossiers/DossierList";
import { ActivityFeed } from "@/components/activity/ActivityFeed";
import PdfExportButton from "@/components/ui/PdfExportButton";
import { relativeTime } from "@/lib/time";
import { useToast } from "@/lib/hooks/useToast";
import { useConfirm } from "@/lib/hooks/useConfirm";
import Toast from "@/components/ui/Toast";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import PermissionGate from "@/components/ui/PermissionGate";
import clsx from "clsx";
import type { Customer, Project, CustomerStatus } from "@/types";

interface Props {
  customer:       Customer;
  linkedProjects: Project[];
  allProjects:    Project[];
  canEdit?:       boolean;
  canDelete?:     boolean;
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

type Tab = "overzicht" | "projecten" | "contacten" | "documenten" | "activiteiten" | "instellingen";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "overzicht",    label: "Overzicht",    icon: Building2    },
  { id: "projecten",    label: "Projecten",    icon: FolderKanban },
  { id: "contacten",    label: "Contacten",    icon: User         },
  { id: "documenten",   label: "Documenten",   icon: FileText     },
  { id: "activiteiten", label: "Activiteiten", icon: Activity     },
  { id: "instellingen", label: "Instellingen", icon: Settings     },
];

// ─── Helper: labelled data row ────────────────────────────────

function DataRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">{label}</p>
      <div className="text-sm text-slate-700 leading-snug">{children}</div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────

export default function CustomerDetailClient({
  customer: initial,
  linkedProjects: initialLinked,
  allProjects,
  canEdit = true,
  canDelete = false,
}: Props) {
  const router = useRouter();

  const [customer,    setCustomer]    = useState<Customer>(initial);
  const [linked,      setLinked]      = useState<Project[]>(initialLinked);
  const [activeTab,   setActiveTab]   = useState<Tab>("overzicht");
  const [saving,      setSaving]      = useState(false);
  const [editOpen,    setEditOpen]    = useState(false);
  const [contactEditOpen, setContactEditOpen] = useState(false);
  const [adresEditOpen,   setAdresEditOpen]   = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [linkSearch,  setLinkSearch]  = useState("");
  const [linkLoading, setLinkLoading] = useState<string | null>(null);
  const [deleting,    setDeleting]    = useState(false);

  const { toast, showToast, clearToast } = useToast();
  const { requestConfirm, confirmProps } = useConfirm();

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

  const stats = useMemo(() => ({
    total:    linked.length,
    active:   linked.filter((p: Project) => p.status === "active").length,
    archived: linked.filter((p: Project) => p.status === "archived").length,
  }), [linked]);

  const linkable = useMemo(() =>
    allProjects.filter(p =>
      p.customer_id !== customer.id &&
      p.name.toLowerCase().includes(linkSearch.toLowerCase())
    ),
    [allProjects, customer.id, linkSearch]
  );

  // Samengesteld adres
  const addressParts = useMemo(() => [
    customer.address_street,
    customer.address_zip && customer.address_city
      ? `${customer.address_zip} ${customer.address_city}`
      : (customer.address_zip ?? customer.address_city ?? null),
    customer.address_country,
  ].filter(Boolean), [
    customer.address_street, customer.address_zip,
    customer.address_city,   customer.address_country,
  ]);

  function openEdit() {
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
    setEditOpen(true);
  }

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
      if (!overrides) {
        setEditOpen(false);
        setContactEditOpen(false);
        setAdresEditOpen(false);
      }
      showToast("Opgeslagen");
    } catch {
      setError("Er ging iets mis");
    } finally {
      setSaving(false);
    }
  }, [edit, customer.id, showToast]);

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

  async function handleDelete() {
    const ok = await requestConfirm({
      title:        "Klant verwijderen?",
      description:  `"${customer.name}" wordt permanent verwijderd. Gekoppelde projecten worden losgekoppeld.`,
      confirmLabel: "Verwijderen",
      variant:      "danger",
    });
    if (!ok) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/customers/${customer.id}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/customers");
      } else {
        const data = await res.json();
        showToast(data.error ?? "Verwijderen mislukt");
      }
    } catch {
      showToast("Er ging iets mis");
    } finally {
      setDeleting(false);
    }
  }

  function handleTabClick(tab: Tab) {
    setActiveTab(tab);
    setEditOpen(false);
    setContactEditOpen(false);
    setAdresEditOpen(false);
    setError(null);
  }

  return (
    <div className="-mx-4 sm:-mx-6 -my-4 sm:-my-6 flex min-h-[calc(100dvh-56px)]">

      <Toast toast={toast} onClose={clearToast} />
      <ConfirmDialog {...confirmProps} />

      {/* ══ SIDEBAR ══════════════════════════════════════════ */}
      <aside className="hidden lg:flex flex-col w-[260px] flex-shrink-0 border-r border-slate-200 bg-white">

        <div className="px-5 pt-5 pb-4 border-b border-slate-200">
          <Link href="/customers"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-brand-600
                       font-medium transition-colors mb-3">
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

          {/* Status knoppen */}
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
              { label: "Totaal",  value: stats.total,    color: "text-slate-800"   },
              { label: "Actief",  value: stats.active,   color: "text-emerald-700" },
              { label: "Archief", value: stats.archived, color: "text-slate-500"   },
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className={clsx("text-lg font-bold", s.color)}>{s.value}</p>
                <p className="text-[10px] font-semibold text-slate-400">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tab navigatie */}
        <nav className="flex flex-col gap-0.5 px-2 py-3 flex-1">
          {TABS.map(tab => {
            const Icon   = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => handleTabClick(tab.id)}
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

        {/* Quick meta onderaan */}
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
          {addressParts.length > 0 && (
            <div className="flex items-start gap-2">
              <MapPin size={11} className="text-slate-400 flex-shrink-0 mt-0.5" />
              <span className="leading-relaxed">{addressParts.join(", ")}</span>
            </div>
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
              <button key={tab.id} onClick={() => handleTabClick(tab.id)}
                className={clsx(
                  "flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                  active ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-100"
                )}>
                <Icon size={12} /> {tab.label}
              </button>
            );
          })}
        </div>

        {/* ── Overzicht ─────────────────────────────────── */}
        {activeTab === "overzicht" && (
          <div className="p-5 sm:p-6 max-w-2xl space-y-5">

            {/* Klantgegevens */}
            <div className="card overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-700">Klantgegevens</h2>
                {canEdit && (
                  <button
                    onClick={() => { setEditOpen(v => !v); setError(null); }}
                    className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-brand-600 px-2.5 py-1.5 rounded-lg hover:bg-brand-50 transition-colors font-medium">
                    <Pencil size={12} /> {editOpen ? "Sluiten" : "Bewerken"}
                  </button>
                )}
              </div>
              {!editOpen ? (
              <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                <DataRow label="Naam">
                  <span className="font-medium">{customer.name}</span>
                </DataRow>
                <DataRow label="Status">
                  <StatusBadge status={customer.status} />
                </DataRow>

                {customer.email && (
                  <DataRow label="E-mail">
                    <a href={`mailto:${customer.email}`}
                      className="inline-flex items-center gap-1.5 text-brand-600 hover:text-brand-700 font-medium transition-colors">
                      <Mail size={13} />{customer.email}
                    </a>
                  </DataRow>
                )}
                {customer.phone && (
                  <DataRow label="Telefoon">
                    <a href={`tel:${customer.phone}`}
                      className="inline-flex items-center gap-1.5 text-slate-700 hover:text-brand-600 transition-colors">
                      <Phone size={13} />{customer.phone}
                    </a>
                  </DataRow>
                )}
                {customer.website && (
                  <DataRow label="Website">
                    <a href={customer.website.startsWith("http") ? customer.website : `https://${customer.website}`}
                      target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-brand-600 hover:text-brand-700 font-medium transition-colors">
                      <Globe size={13} />{customer.website}
                    </a>
                  </DataRow>
                )}
                {addressParts.length > 0 && (
                  <DataRow label="Adres">
                    <div className="flex items-start gap-1.5 text-slate-600">
                      <MapPin size={13} className="text-slate-400 flex-shrink-0 mt-0.5" />
                      <span>{addressParts.join(", ")}</span>
                    </div>
                  </DataRow>
                )}
              </div>
              ) : (
              <div className="px-5 py-5 space-y-4">
                {error && (
                  <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                    <AlertCircle size={14} className="flex-shrink-0" /> {error}
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="label">Naam *</label>
                    <input disabled={saving} value={edit.name}
                      onChange={e => setEdit(p => ({ ...p, name: e.target.value }))}
                      className="input disabled:opacity-60" placeholder="Klantnaam" />
                  </div>
                  <div>
                    <label className="label">E-mail</label>
                    <input disabled={saving} type="email" value={edit.email}
                      onChange={e => setEdit(p => ({ ...p, email: e.target.value }))}
                      className="input disabled:opacity-60" placeholder="info@bedrijf.nl" />
                  </div>
                  <div>
                    <label className="label">Telefoon</label>
                    <input disabled={saving} type="tel" value={edit.phone}
                      onChange={e => setEdit(p => ({ ...p, phone: e.target.value }))}
                      className="input disabled:opacity-60" placeholder="+31 6 12345678" />
                  </div>
                  <div>
                    <label className="label">Website</label>
                    <input disabled={saving} type="url" value={edit.website}
                      onChange={e => setEdit(p => ({ ...p, website: e.target.value }))}
                      className="input disabled:opacity-60" placeholder="www.bedrijf.nl" />
                  </div>
                </div>
                <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
                  <button onClick={() => handleSave()} disabled={saving} className="btn-primary">
                    {saving ? <><Loader2 size={14} className="animate-spin" /> Opslaan…</> : <><Check size={14} /> Opslaan</>}
                  </button>
                  <button onClick={() => { setEditOpen(false); setError(null); }} className="btn-outline">
                    <X size={14} /> Annuleren
                  </button>
                </div>
              </div>
              )}
            </div>

            {/* Projecten samenvatting */}
            <div className="card overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-700">Projecten</h2>
                <button onClick={() => handleTabClick("projecten")}
                  className="text-xs text-brand-600 hover:text-brand-700 font-medium transition-colors">
                  Alle bekijken →
                </button>
              </div>
              {linked.length === 0 ? (
                <div className="px-5 py-6 text-center">
                  <FolderKanban size={28} className="mx-auto mb-2 text-slate-200" />
                  <p className="text-sm text-slate-400">Nog geen projecten gekoppeld.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {linked.slice(0, 3).map((p: Project) => (
                    <div key={p.id}
                      onClick={() => router.push(`/projects/${p.id}`)}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50/60 transition-colors cursor-pointer group">
                      <FolderKanban size={13} className="text-slate-400 flex-shrink-0" />
                      <span className="flex-1 text-sm font-medium text-slate-700 group-hover:text-brand-700 truncate transition-colors">
                        {p.name}
                      </span>
                      <StatusBadge status={p.status} />
                    </div>
                  ))}
                  {linked.length > 3 && (
                    <div className="px-5 py-2.5">
                      <button onClick={() => handleTabClick("projecten")}
                        className="text-xs text-slate-400 hover:text-brand-600 font-medium transition-colors">
                        +{linked.length - 3} meer projecten
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Projecten ─────────────────────────────────── */}
        {activeTab === "projecten" && (
          <div className="p-5 sm:p-6 max-w-2xl space-y-4">
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

        {/* ── Contacten ─────────────────────────────────── */}
        {activeTab === "contacten" && (
          <div className="p-5 sm:p-6 max-w-2xl space-y-5">

            {/* Contactpersoon */}
            <div className="card overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <h2 className="text-sm font-semibold text-slate-700">Contactpersoon</h2>
                <button
                  onClick={() => { setContactEditOpen(v => !v); setAdresEditOpen(false); setError(null); }}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-brand-600 px-2.5 py-1.5 rounded-lg hover:bg-brand-50 transition-colors font-medium">
                  <Pencil size={12} /> {contactEditOpen ? "Sluiten" : "Bewerken"}
                </button>
              </div>
              {!contactEditOpen ? (
                <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                  {customer.contact_name ? (
                    <DataRow label="Naam"><span className="font-medium">{customer.contact_name}</span></DataRow>
                  ) : null}
                  {customer.contact_role ? (
                    <DataRow label="Functie"><span>{customer.contact_role}</span></DataRow>
                  ) : null}
                  {customer.contact_email ? (
                    <DataRow label="E-mail">
                      <a href={`mailto:${customer.contact_email}`}
                        className="inline-flex items-center gap-1.5 text-brand-600 hover:text-brand-700 font-medium transition-colors">
                        <Mail size={13} />{customer.contact_email}
                      </a>
                    </DataRow>
                  ) : null}
                  {customer.contact_phone ? (
                    <DataRow label="Telefoon">
                      <a href={`tel:${customer.contact_phone}`}
                        className="inline-flex items-center gap-1.5 text-slate-700 hover:text-brand-600 transition-colors">
                        <Phone size={13} />{customer.contact_phone}
                      </a>
                    </DataRow>
                  ) : null}
                  {!customer.contact_name && !customer.contact_email && !customer.contact_phone && (
                    <p className="text-sm text-slate-400 col-span-2">Geen contactpersoon ingevuld.</p>
                  )}
                </div>
              ) : (
                <div className="px-5 py-5 space-y-3">
                  {error && (
                    <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                      <AlertCircle size={14} className="flex-shrink-0" /> {error}
                    </div>
                  )}
                  <div>
                    <label className="label">Naam</label>
                    <input disabled={saving} value={edit.contact_name}
                      onChange={e => setEdit(p => ({ ...p, contact_name: e.target.value }))}
                      className="input disabled:opacity-60" placeholder="Jan Jansen" />
                  </div>
                  <div>
                    <label className="label">Functie</label>
                    <input disabled={saving} value={edit.contact_role}
                      onChange={e => setEdit(p => ({ ...p, contact_role: e.target.value }))}
                      className="input disabled:opacity-60" placeholder="Directeur" />
                  </div>
                  <div>
                    <label className="label">E-mail</label>
                    <input disabled={saving} type="email" value={edit.contact_email}
                      onChange={e => setEdit(p => ({ ...p, contact_email: e.target.value }))}
                      className="input disabled:opacity-60" placeholder="jan@bedrijf.nl" />
                  </div>
                  <div>
                    <label className="label">Telefoon</label>
                    <input disabled={saving} type="tel" value={edit.contact_phone}
                      onChange={e => setEdit(p => ({ ...p, contact_phone: e.target.value }))}
                      className="input disabled:opacity-60" placeholder="+31 6 87654321" />
                  </div>
                  <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
                    <button onClick={() => handleSave()} disabled={saving} className="btn-primary">
                      {saving ? <><Loader2 size={14} className="animate-spin" /> Opslaan…</> : <><Check size={14} /> Opslaan</>}
                    </button>
                    <button onClick={() => { setContactEditOpen(false); setError(null); }} className="btn-outline">
                      <X size={14} /> Annuleren
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Adres */}
            <div className="card overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <h2 className="text-sm font-semibold text-slate-700">Adres</h2>
                <button
                  onClick={() => { setAdresEditOpen(v => !v); setContactEditOpen(false); setError(null); }}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-brand-600 px-2.5 py-1.5 rounded-lg hover:bg-brand-50 transition-colors font-medium">
                  <Pencil size={12} /> {adresEditOpen ? "Sluiten" : "Bewerken"}
                </button>
              </div>
              {!adresEditOpen ? (
                <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                  {customer.address_street ? (
                    <DataRow label="Straat"><span>{customer.address_street}</span></DataRow>
                  ) : null}
                  {(customer.address_zip || customer.address_city) ? (
                    <DataRow label="Postcode / Stad">
                      <span>{[customer.address_zip, customer.address_city].filter(Boolean).join(" ")}</span>
                    </DataRow>
                  ) : null}
                  {customer.address_country ? (
                    <DataRow label="Land"><span>{customer.address_country}</span></DataRow>
                  ) : null}
                  {!customer.address_street && !customer.address_zip && !customer.address_city && !customer.address_country && (
                    <p className="text-sm text-slate-400 col-span-2">Geen adres ingevuld.</p>
                  )}
                </div>
              ) : (
                <div className="px-5 py-5 space-y-3">
                  {error && (
                    <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                      <AlertCircle size={14} className="flex-shrink-0" /> {error}
                    </div>
                  )}
                  <div>
                    <label className="label">Straat</label>
                    <input disabled={saving} value={edit.address_street}
                      onChange={e => setEdit(p => ({ ...p, address_street: e.target.value }))}
                      className="input disabled:opacity-60" placeholder="Straatnaam 1" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">Postcode</label>
                      <input disabled={saving} value={edit.address_zip}
                        onChange={e => setEdit(p => ({ ...p, address_zip: e.target.value }))}
                        className="input disabled:opacity-60" placeholder="1234 AB" />
                    </div>
                    <div>
                      <label className="label">Stad</label>
                      <input disabled={saving} value={edit.address_city}
                        onChange={e => setEdit(p => ({ ...p, address_city: e.target.value }))}
                        className="input disabled:opacity-60" placeholder="Amsterdam" />
                    </div>
                  </div>
                  <div>
                    <label className="label">Land</label>
                    <input disabled={saving} value={edit.address_country}
                      onChange={e => setEdit(p => ({ ...p, address_country: e.target.value }))}
                      className="input disabled:opacity-60" placeholder="Nederland" />
                  </div>
                  <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
                    <button onClick={() => handleSave()} disabled={saving} className="btn-primary">
                      {saving ? <><Loader2 size={14} className="animate-spin" /> Opslaan…</> : <><Check size={14} /> Opslaan</>}
                    </button>
                    <button onClick={() => { setAdresEditOpen(false); setError(null); }} className="btn-outline">
                      <X size={14} /> Annuleren
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Documenten ────────────────────────────────── */}
        {activeTab === "documenten" && (
          <div className="p-5 sm:p-6"><DossierList customerId={customer.id} /></div>
        )}

        {/* ── Activiteiten ──────────────────────────────── */}
        {activeTab === "activiteiten" && (
          <div className="p-5 sm:p-6 max-w-2xl">
            <ActivityFeed customerId={customer.id} title="" />
          </div>
        )}

        {/* ── Instellingen ──────────────────────────────── */}
        {activeTab === "instellingen" && (
          <div className="p-5 sm:p-6 max-w-2xl space-y-5">

            {/* Gegevens bewerken */}
            <div className="card overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <h2 className="text-sm font-semibold text-slate-700">Gegevens bewerken</h2>
                <PermissionGate allowed={canEdit} fallback="disabled">
                  <button
                    onClick={editOpen ? () => { setEditOpen(false); setError(null); } : openEdit}
                    className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-brand-600
                               px-2.5 py-1.5 rounded-lg hover:bg-brand-50 transition-colors font-medium">
                    <Pencil size={12} />
                    {editOpen ? "Sluiten" : "Bewerken"}
                  </button>
                </PermissionGate>
              </div>

              {!editOpen ? (
                <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                  <DataRow label="Naam"><span className="font-medium">{customer.name}</span></DataRow>
                  <DataRow label="Status"><StatusBadge status={customer.status} /></DataRow>
                  {customer.email && <DataRow label="E-mail"><span>{customer.email}</span></DataRow>}
                  {customer.phone && <DataRow label="Telefoon"><span>{customer.phone}</span></DataRow>}
                  {customer.website && <DataRow label="Website"><span>{customer.website}</span></DataRow>}
                </div>
              ) : (
                <div className="px-5 py-5 space-y-5">
                  {error && (
                    <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200
                                    rounded-xl text-sm text-red-700">
                      <AlertCircle size={14} className="flex-shrink-0" /> {error}
                    </div>
                  )}

                  <div>
                    <label className="label">Naam *</label>
                    <input
                      disabled={saving}
                      value={edit.name}
                      onChange={e => setEdit(p => ({ ...p, name: e.target.value }))}
                      className="input disabled:opacity-60 disabled:cursor-not-allowed"
                      placeholder="Klantnaam"
                    />
                  </div>

                  <div className="pt-3 border-t border-slate-100">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
                      Contactgegevens
                    </p>
                    <div className="space-y-3">
                      <div>
                        <label className="label">E-mail</label>
                        <input disabled={saving} type="email" value={edit.email}
                          onChange={e => setEdit(p => ({ ...p, email: e.target.value }))}
                          className="input disabled:opacity-60 disabled:cursor-not-allowed" placeholder="info@bedrijf.nl" />
                      </div>
                      <div>
                        <label className="label">Telefoon</label>
                        <input disabled={saving} type="tel" value={edit.phone}
                          onChange={e => setEdit(p => ({ ...p, phone: e.target.value }))}
                          className="input disabled:opacity-60 disabled:cursor-not-allowed" placeholder="+31 6 12345678" />
                      </div>
                      <div>
                        <label className="label">Website</label>
                        <input disabled={saving} type="url" value={edit.website}
                          onChange={e => setEdit(p => ({ ...p, website: e.target.value }))}
                          className="input disabled:opacity-60 disabled:cursor-not-allowed" placeholder="www.bedrijf.nl" />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
                    <button onClick={() => handleSave()} disabled={saving} className="btn-primary">
                      {saving
                        ? <><Loader2 size={14} className="animate-spin" /> Opslaan…</>
                        : <><Check size={14} /> Opslaan</>
                      }
                    </button>
                    <button onClick={() => { setEditOpen(false); setError(null); }} className="btn-outline">
                      <X size={14} /> Annuleren
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* PDF Exporteren */}
            <div className="card overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h2 className="text-sm font-semibold text-slate-700">Exporteren</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Exporteer deze klant inclusief gekoppelde projecten en contactgegevens.
                </p>
              </div>
              <div className="px-5 py-4">
                <PdfExportButton scope={`customer:${customer.id}`} label="Download PDF" />
              </div>
            </div>

            {/* Danger zone */}
            <PermissionGate allowed={canDelete}>
              <div className="card overflow-hidden border-red-100">
                <div className="px-5 py-4 border-b border-red-100 bg-red-50/40">
                  <h2 className="text-sm font-semibold text-red-700">Gevarenzone</h2>
                  <p className="text-xs text-red-400 mt-0.5">
                    Acties hieronder zijn onomkeerbaar.
                  </p>
                </div>
                <div className="px-5 py-4">
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold
                               text-red-600 border border-red-200 bg-white hover:bg-red-50
                               hover:border-red-400 transition-all disabled:opacity-50">
                    {deleting
                      ? <><Loader2 size={14} className="animate-spin" /> Verwijderen…</>
                      : <><Trash2 size={14} /> Klant verwijderen</>
                    }
                  </button>
                </div>
              </div>
            </PermissionGate>
          </div>
        )}
      </div>
    </div>
  );
}
