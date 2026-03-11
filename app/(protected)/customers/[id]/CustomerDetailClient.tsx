"use client";

import React, { useState, useCallback, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft, Building2, FolderKanban, Mail, Phone,
  Globe, MapPin, User, Hash, CheckCircle2, XCircle,
  Loader2, AlertCircle, FileText, Activity, Link2,
  Search, X, Check, Pencil, Download, GitBranch,
} from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import { DossierList } from "@/components/dossiers/DossierList";
import { ActivityFeed } from "@/components/activity/ActivityFeed";
import PdfExportButton from "@/components/ui/PdfExportButton";
import { relativeTime } from "@/lib/time";
import { useToast } from "@/lib/hooks/useToast";
import Toast from "@/components/ui/Toast";
import clsx from "clsx";
import { formatDate, relativeTime } from "@/lib/time";

import {
  DetailPageShell,
  SidebarMetaRow,
  TabContent,
  type TabDef,
} from "@/components/layout/DetailPageShell";

import type { Customer, Project, CustomerStatus } from "@/types";

// ─── Types ────────────────────────────────────────────────────

type Tab = "algemeen" | "projecten" | "activiteit";

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

type Tab = "algemeen" | "projecten" | "taken" | "dossier" | "activiteit" | "exporteren";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "algemeen",   label: "Algemeen",   icon: Building2    },
  { id: "projecten",  label: "Projecten",  icon: FolderKanban },
  { id: "taken",      label: "Taken",      icon: GitBranch    },
  { id: "dossier",    label: "Dossier",    icon: FileText     },
  { id: "activiteit", label: "Activiteit", icon: Activity     },
  { id: "exporteren", label: "Exporteren", icon: Download     },
];

// ─── Helper: labelled data row ────────────────────────────────

// ─── Hulpcomponenten (ongewijzigd) ────────────────────────────

function InlineField({
  label, value, onChange, type = "text", placeholder, href, readonly,
}: {
  label:        string;
  value:        string;
  onChange?:    (v: string) => void;
  type?:        string;
  placeholder?: string;
  href?:        string;
  readonly?:    boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">{label}</p>
      <div className={clsx(
        "flex items-center gap-2 px-3.5 py-2.5 rounded-xl border transition-all text-sm",
        readonly ? "border-slate-200 bg-slate-50"
          : focused ? "border-brand-500 ring-2 ring-brand-500/20 bg-white"
          : "border-slate-200 bg-white hover:border-slate-300",
      )}>
        <input
          type={type} value={value}
          placeholder={readonly ? "—" : (placeholder ?? `${label}…`)}
          readOnly={readonly}
          onChange={(e) => onChange?.(e.target.value)}
          onFocus={() => !readonly && setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
          className={clsx(
            "flex-1 bg-transparent placeholder:text-slate-400 focus:outline-none min-w-0",
            readonly ? "text-slate-500 cursor-default" : "text-slate-800",
          )}
        />
        {!readonly && !focused && value && href && (
          <a href={href} target="_blank" rel="noopener noreferrer" tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
            className="text-slate-400 hover:text-brand-600 transition-colors flex-shrink-0">
            <Globe size={12} />
          </a>
        )}
        {readonly && (
          <span className="text-[10px] text-slate-400 flex-shrink-0">Niet wijzigbaar</span>
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

export default function CustomerDetailClient({ customer: initial, linkedProjects: initialLinked, allProjects }: Props) {
  const [customer,    setCustomer]    = useState<Customer>(initial);
  const [linked,      setLinked]      = useState<Project[]>(initialLinked);
  const [activeTab,   setActiveTab]   = useState<Tab>("algemeen");
  const [saving,      setSaving]      = useState(false);
  const [dirty,       setDirty]       = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [toast,       setToast]       = useState<string | null>(null);
  const [linkSearch,  setLinkSearch]  = useState("");
  const [linkLoading, setLinkLoading] = useState<string | null>(null);

  // Taken tab
  const [projectTasks,  setProjectTasks]  = useState<Record<string, { id: string; title: string; status: string }[]>>({});
  const [tasksLoading,  setTasksLoading]  = useState(false);
  const [tasksLoaded,   setTasksLoaded]   = useState(false);

  const { toast, showToast, clearToast } = useToast();

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

  function set(field: keyof EditState) {
    return (v: string) => {
      setEdit(p => ({ ...p, [field]: v }));
      setDirty(true);
    };
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  function resetEdit() {
    setEdit({
      name: customer.name, code: customer.code ?? "",
      status: customer.status, email: customer.email ?? "",
      phone: customer.phone ?? "", website: customer.website ?? "",
      address_street: customer.address_street ?? "", address_zip: customer.address_zip ?? "",
      address_city: customer.address_city ?? "", address_country: customer.address_country ?? "",
      contact_name: customer.contact_name ?? "", contact_role: customer.contact_role ?? "",
      contact_email: customer.contact_email ?? "", contact_phone: customer.contact_phone ?? "",
    });
    setDirty(false);
    setError(null);
  }

  async function handleSave(overrides?: Partial<EditState>) {
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
      setCustomer(data);
      setDirty(false);
      showToast("Klant opgeslagen");
    } catch {
      setError("Er ging iets mis");
    } finally {
      setSaving(false);
    }
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
      if (project) setLinked(prev => [{ ...project, customer_id: customer.id }, ...prev]);
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
    if (res.ok) setLinked(prev => prev.filter(p => p.id !== projectId));
    setLinkLoading(null);
  }

  // Taken laden per project
  useEffect(() => {
    if (activeTab === "taken" && !tasksLoaded && linked.length > 0) {
      setTasksLoading(true);
      Promise.all(
        linked.map(p =>
          fetch(`/api/projects/${p.id}/subprocesses`)
            .then(r => r.ok ? r.json() : [])
            .then(data => ({ projectId: p.id, tasks: Array.isArray(data) ? data : [] }))
            .catch(() => ({ projectId: p.id, tasks: [] }))
        )
      ).then(results => {
        const map: Record<string, { id: string; title: string; status: string }[]> = {};
        results.forEach(r => { map[r.projectId] = r.tasks; });
        setProjectTasks(map);
        setTasksLoaded(true);
        setTasksLoading(false);
      });
    }
  }, [activeTab, tasksLoaded, linked]);

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

  return (
    <div className="-mx-4 sm:-mx-6 -my-4 sm:-my-6 flex min-h-[calc(100dvh-56px)]">

      <Toast toast={toast} onClose={clearToast} />

      {/* ══ SIDEBAR ══════════════════════════════════════════ */}
      <aside className="hidden lg:flex flex-col w-[260px] flex-shrink-0 border-r border-slate-200 bg-white">

  // ── Tab definities ────────────────────────────────────────
  const TABS: TabDef<Tab>[] = [
    { id: "algemeen",   label: "Algemeen",   icon: User,          },
    { id: "projecten",  label: "Projecten",  icon: FolderKanban,  badge: linked.length > 0 ? linked.length : null },
    { id: "activiteit", label: "Activiteit", icon: Activity,      },
  ];

  // ── Shell slots ───────────────────────────────────────────

  const sidebarMeta = (
    <>
      {customer.email && (
        <SidebarMetaRow icon={Mail} label={customer.email} href={`mailto:${customer.email}`} />
      )}
      {customer.phone && (
        <SidebarMetaRow icon={Phone} label={customer.phone} href={`tel:${customer.phone}`} />
      )}
      {customer.address_city && (
        <SidebarMetaRow icon={MapPin} label={customer.address_city} />
      )}
      <SidebarMetaRow
        icon={Activity}
        label={`Bijgewerkt ${relativeTime(customer.updated_at)}`}
        variant="muted"
      />
    </>
  );

  const headerActions = dirty ? (
    <div className="flex items-center gap-2">
      <button
        onClick={() => resetEdit()}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200
                   text-slate-600 text-xs font-semibold hover:bg-slate-50 transition-colors"
      >
        <X size={13} /> Reset
      </button>
      <button
        onClick={() => handleSave()}
        disabled={saving}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-600 text-white
                   text-xs font-semibold hover:bg-brand-700 transition-colors
                   disabled:opacity-60 shadow-sm shadow-brand-200"
      >
        {saving
          ? <><Loader2 size={13} className="animate-spin" /> Opslaan…</>
          : <><CheckCircle2 size={13} /> Opslaan</>
        }
      </button>
    </div>
  ) : undefined;

  // Status badge voor in de header
  const titleBadge = (
    <span className={clsx(
      "inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium",
      customer.status === "active"
        ? "text-emerald-600 bg-emerald-50"
        : "text-slate-400 bg-slate-100",
    )}>
      {customer.status === "active"
        ? <><CheckCircle2 size={11} /> Actief</>
        : <><XCircle size={11} /> Inactief</>
      }
    </span>
  );

  // ── Render ────────────────────────────────────────────────
  return (
    <DetailPageShell<Tab>
      breadcrumb={[
        { label: "Klanten", href: "/customers" },
        { label: customer.name },
      ]}
      title={customer.name}
      titleBadge={titleBadge}
      subtitle={customer.code ? `#${customer.code}` : null}
      tabs={TABS}
      activeTab={activeTab}
      onTabChange={(tab) => { setActiveTab(tab); setDirty(false); }}
      sidebarMeta={sidebarMeta}
      headerActions={activeTab === "algemeen" ? headerActions : undefined}
      toast={toast}
      error={error}
      onErrorDismiss={() => setError(null)}
    >
      {/* ── Tab: Algemeen ─────────────────────────────────── */}
      {activeTab === "algemeen" && (
        <TabContent maxWidth="md" className="space-y-4">
          <div className="card p-5 space-y-4">
            <SectionLabel>Identiteit</SectionLabel>
            <InlineField label="Code" value={edit.code} readonly />
            <InlineField label="Naam" value={edit.name} onChange={set("name")} placeholder="Klantnaam" />
          </div>

          <div className="card p-5 space-y-4">
            <SectionLabel>Contactgegevens</SectionLabel>
            <InlineField label="E-mail" value={edit.email} type="email" onChange={set("email")}
              placeholder="info@bedrijf.nl" href={edit.email ? `mailto:${edit.email}` : undefined} />
            <InlineField label="Telefoon" value={edit.phone} type="tel" onChange={set("phone")}
              placeholder="+31 6 12345678" href={edit.phone ? `tel:${edit.phone}` : undefined} />
            <InlineField label="Website" value={edit.website} type="url" onChange={set("website")}
              placeholder="www.bedrijf.nl" href={edit.website || undefined} />
          </div>
        </div>

        {/* Tab navigatie */}
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
          {customer.contact_name && (
            <div className="pt-2 mt-2 border-t border-slate-100">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Contactpersoon</p>
              <div className="flex items-center gap-2">
                <User size={11} className="text-slate-400 flex-shrink-0" />
                <span className="font-medium text-slate-600 truncate">{customer.contact_name}</span>
              </div>
              {customer.contact_role && (
                <p className="text-slate-400 ml-4 truncate">{customer.contact_role}</p>
              )}
              {customer.contact_email && (
                <a href={`mailto:${customer.contact_email}`}
                  className="flex items-center gap-2 mt-1 hover:text-brand-600 transition-colors min-w-0 ml-0">
                  <Mail size={11} className="text-slate-400 flex-shrink-0" />
                  <span className="truncate">{customer.contact_email}</span>
                </a>
              )}
              {customer.contact_phone && (
                <a href={`tel:${customer.contact_phone}`}
                  className="flex items-center gap-2 mt-1 hover:text-brand-600 transition-colors">
                  <Phone size={11} className="text-slate-400 flex-shrink-0" />{customer.contact_phone}
                </a>
              )}
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

        {/* ── Algemeen ──────────────────────────────────── */}
        {activeTab === "algemeen" && (
          <div className="p-5 sm:p-6 max-w-2xl space-y-5">

            {/* Klantoverzicht (altijd zichtbaar) */}
            <div className="card overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <h2 className="text-sm font-semibold text-slate-700">Klantoverzicht</h2>
                <button
                  onClick={editOpen ? () => setEditOpen(false) : openEdit}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-brand-600
                             px-2.5 py-1.5 rounded-lg hover:bg-brand-50 transition-colors font-medium"
                >
                  <Pencil size={12} />
                  {editOpen ? "Sluiten" : "Bewerken"}
                </button>
              </div>

          <div className="card p-5 space-y-4">
            <SectionLabel>Adres</SectionLabel>
            <InlineField label="Straat" value={edit.address_street} onChange={set("address_street")} />
            <div className="grid grid-cols-2 gap-4">
              <InlineField label="Postcode" value={edit.address_zip} onChange={set("address_zip")} />
              <InlineField label="Stad" value={edit.address_city} onChange={set("address_city")} />
            </div>
            <InlineField label="Land" value={edit.address_country} onChange={set("address_country")} />
          </div>

          <div className="card p-5 space-y-4">
            <SectionLabel>Contactpersoon</SectionLabel>
            <InlineField label="Naam" value={edit.contact_name} onChange={set("contact_name")} />
            <InlineField label="Rol" value={edit.contact_role} onChange={set("contact_role")} />
            <InlineField label="E-mail" value={edit.contact_email} type="email" onChange={set("contact_email")}
              href={edit.contact_email ? `mailto:${edit.contact_email}` : undefined} />
            <InlineField label="Telefoon" value={edit.contact_phone} type="tel" onChange={set("contact_phone")}
              href={edit.contact_phone ? `tel:${edit.contact_phone}` : undefined} />
          </div>
        </TabContent>
      )}

      {/* ── Tab: Projecten ────────────────────────────────── */}
      {activeTab === "projecten" && (
        <TabContent maxWidth="md" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-700 text-sm">Gekoppelde projecten ({linked.length})</h3>
            <button
              onClick={() => setShowLink(v => !v)}
              className="flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-700
                         font-semibold transition-colors"
            >
              <Link2 size={13} />
              {showLink ? "Verbergen" : "Project koppelen"}
            </button>
          </div>

          {showLink && (
            <div className="card p-4 space-y-2">
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input className="input pl-8 w-full text-sm" placeholder="Zoek project…"
                  value={linkSearch} onChange={e => setLinkSearch(e.target.value)} autoFocus />
              </div>
              <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-100 divide-y divide-slate-50">
                {linkable.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">Geen projecten gevonden</p>
                ) : linkable.map(p => {
                  const isLinked = !!linked.find(l => l.id === p.id);
                  return (
                    <div key={p.id} className="flex items-center justify-between px-4 py-2.5">
                      <span className="text-sm text-slate-700 truncate flex-1">{p.name}</span>
                      <button
                        onClick={() => isLinked ? unlinkProject(p.id) : linkProject(p.id)}
                        disabled={linkLoading === p.id}
                        className={clsx(
                          "ml-3 text-xs px-2.5 py-1 rounded-lg font-medium transition-colors flex-shrink-0",
                          isLinked
                            ? "bg-brand-100 text-brand-700 hover:bg-red-50 hover:text-red-600"
                            : "bg-slate-100 text-slate-600 hover:bg-brand-50 hover:text-brand-700",
                        )}
                      >
                        {linkLoading === p.id
                          ? <Loader2 size={12} className="animate-spin" />
                          : isLinked ? "✓ Gekoppeld" : "Koppelen"
                        }
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="space-y-2">
            {linked.length === 0 ? (
              <div className="card p-10 text-center text-slate-400 text-sm">
                Nog geen projecten gekoppeld aan deze klant
              </div>
            ) : linked.map(p => (
              <Link key={p.id} href={`/projects/${p.id}`}
                className="card flex items-center gap-3 px-4 py-3 hover:border-brand-200
                           hover:bg-brand-50/30 transition-all group">
                <FolderKanban size={15} className="text-brand-400 flex-shrink-0" />
                <span className="flex-1 text-sm font-medium text-slate-700 group-hover:text-brand-700
                                 transition-colors truncate">{p.name}</span>
              </Link>
            ))}
          </div>
        )}

        {/* ── Taken ─────────────────────────────────────── */}
        {activeTab === "taken" && (
          <div className="p-5 sm:p-6 max-w-2xl space-y-4">
            {linked.length === 0 ? (
              <div className="card p-12 text-center">
                <GitBranch size={32} className="mx-auto mb-3 text-slate-300" />
                <p className="text-sm text-slate-500 font-medium">Geen projecten gekoppeld.</p>
              </div>
            ) : tasksLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 size={20} className="animate-spin text-slate-400" />
              </div>
            ) : linked.map((p: Project) => {
              const tasks = projectTasks[p.id] ?? [] as { id: string; title: string; status: string }[];
              const done  = tasks.filter(t => t.status === "done").length;
              return (
                <div key={p.id} className="card overflow-hidden">
                  <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-100">
                    <FolderKanban size={14} className="text-slate-400 flex-shrink-0" />
                    <Link href={`/projects/${p.id}`}
                      className="flex-1 text-sm font-semibold text-slate-700 hover:text-brand-700 transition-colors truncate">
                      {p.name}
                    </Link>
                    <StatusBadge status={p.status} />
                    {tasks.length > 0 && (
                      <span className="text-xs text-slate-400 flex-shrink-0">{done}/{tasks.length}</span>
                    )}
                  </div>
                  {tasks.length === 0 ? (
                    <p className="text-xs text-slate-400 px-5 py-3">Geen taken.</p>
                  ) : (
                    <div className="divide-y divide-slate-50">
                      {tasks.map(t => (
                        <div key={t.id} className="flex items-center gap-3 px-5 py-2.5">
                          <span className={clsx(
                            "w-2 h-2 rounded-full flex-shrink-0",
                            t.status === "done"        ? "bg-emerald-400" :
                            t.status === "in-progress" ? "bg-amber-400"   :
                            t.status === "blocked"     ? "bg-red-400"     :
                            "bg-slate-300"
                          )} />
                          <span className={clsx(
                            "flex-1 text-sm truncate",
                            t.status === "done" ? "line-through text-slate-400" : "text-slate-700"
                          )}>
                            {t.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Dossier ───────────────────────────────────── */}
        {activeTab === "dossier" && (
          <div className="p-5 sm:p-6"><DossierList customerId={customer.id} /></div>
        )}

        {/* ── Activiteit ────────────────────────────────── */}
        {activeTab === "activiteit" && (
          <div className="p-5 sm:p-6 max-w-2xl">
            <ActivityFeed customerId={customer.id} title="" />
          </div>
        )}

        {/* ── Exporteren ────────────────────────────────── */}
        {activeTab === "exporteren" && (
          <div className="p-5 sm:p-6 max-w-sm space-y-4">
            <div>
              <h3 className="font-semibold text-slate-700 mb-1">PDF exporteren</h3>
              <p className="text-sm text-slate-400 mb-4">
                Exporteer deze klant inclusief gekoppelde projecten en contactgegevens.
              </p>
            </div>
            <PdfExportButton scope={`customer:${customer.id}`} label="Download PDF" />
          </div>
        )}
      </div>
    </div>
  );
}
