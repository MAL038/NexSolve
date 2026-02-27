"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Building2, FolderKanban, Search, X, Link2,
  Mail, Phone, Globe, MapPin, User, Briefcase,
  Hash, CheckCircle2, XCircle, Pencil, Loader2,
} from "lucide-react";
import { createClient } from "@/lib/supabaseClient";
import StatusBadge from "@/components/ui/StatusBadge";
import { formatDate, relativeTime } from "@/lib/time";
import { DossierList } from "@/components/dossiers/DossierList";
import { ActivityFeed } from "@/components/activity/ActivityFeed";
import type { Customer, Project, CustomerStatus } from "@/types";

interface Props {
  customer: Customer;
  linkedProjects: Project[];
  allProjects: Project[];
}

// ─── Info row helper ──────────────────────────────────────────

function InfoRow({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ElementType;
  label: string;
  value?: string | null;
  href?: string;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-slate-50 last:border-0">
      <div className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon size={13} className="text-slate-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-400 mb-0.5">{label}</p>
        {href ? (
          <a href={href} target="_blank" rel="noopener noreferrer"
            className="text-sm text-brand-600 hover:underline font-medium truncate block">
            {value}
          </a>
        ) : (
          <p className="text-sm text-slate-700 font-medium">{value}</p>
        )}
      </div>
    </div>
  );
}

// ─── Section card ─────────────────────────────────────────────

function Section({
  title,
  icon: Icon,
  iconColor = "text-brand-500",
  bgColor = "bg-brand-50",
  children,
}: {
  title: string;
  icon: React.ElementType;
  iconColor?: string;
  bgColor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-7 h-7 rounded-xl ${bgColor} flex items-center justify-center`}>
          <Icon size={14} className={iconColor} />
        </div>
        <h3 className="font-semibold text-slate-700 text-sm">{title}</h3>
      </div>
      {children}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────

export default function CustomerDetailClient({
  customer: initial,
  linkedProjects: initialLinked,
  allProjects,
}: Props) {
  const router = useRouter();

  const [customer,    setCustomer]    = useState<Customer>(initial);
  const [linked,      setLinked]      = useState<Project[]>(initialLinked);
  const [showLink,    setShowLink]    = useState(false);
  const [linkSearch,  setLinkSearch]  = useState("");
  const [linkLoading, setLinkLoading] = useState<string | null>(null);

  // Inline edit state
  const [editField, setEditField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving,    setSaving]    = useState(false);

  const stats = {
    total:      linked.length,
    active:     linked.filter(p => p.status === "active").length,
    inProgress: linked.filter(p => p.status === "in-progress").length,
    archived:   linked.filter(p => p.status === "archived").length,
  };

  const linkable = allProjects.filter(p =>
    p.customer_id !== customer.id &&
    p.name.toLowerCase().includes(linkSearch.toLowerCase())
  );

  // ─── Inline edit ────────────────────────────────────────

  async function saveEdit() {
    if (!editField) return;
    setSaving(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("customers")
      .update({ [editField]: editValue || null })
      .eq("id", customer.id)
      .select()
      .single();

    if (!error && data) setCustomer(data as Customer);
    setSaving(false);
    setEditField(null);
  }

  function startEdit(field: string, currentValue?: string | null) {
    setEditField(field);
    setEditValue(currentValue ?? "");
  }

  // ─── Link / Unlink projects ──────────────────────────────

  async function linkProject(projectId: string) {
    setLinkLoading(projectId);
    const supabase = createClient();
    await supabase.from("projects").update({ customer_id: customer.id }).eq("id", projectId);
    const project = allProjects.find(p => p.id === projectId);
    if (project) setLinked(prev => [{ ...project, customer_id: customer.id }, ...prev]);
    setLinkLoading(null);
  }

  async function unlinkProject(projectId: string) {
    setLinkLoading(projectId);
    const supabase = createClient();
    await supabase.from("projects").update({ customer_id: null }).eq("id", projectId);
    setLinked(prev => prev.filter(p => p.id !== projectId));
    setLinkLoading(null);
  }

  // ─── Address helper ──────────────────────────────────────

  const fullAddress = [
    customer.address_street,
    customer.address_zip && customer.address_city
      ? `${customer.address_zip} ${customer.address_city}`
      : customer.address_city ?? customer.address_zip,
    customer.address_country,
  ].filter(Boolean).join(", ");

  const mapsUrl = fullAddress
    ? `https://maps.google.com/?q=${encodeURIComponent(fullAddress)}`
    : undefined;

  // ─── Render ─────────────────────────────────────────────

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Back */}
      <Link href="/customers"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-brand-600 font-medium transition-colors">
        <ArrowLeft size={16} /> Terug naar klanten
      </Link>

      {/* Header card */}
      <div className="card p-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center flex-shrink-0">
            <Building2 size={26} className="text-brand-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-800">{customer.name}</h1>
              {customer.code && (
                <span className="inline-flex items-center gap-1 text-sm font-mono bg-slate-100 text-slate-500 px-2 py-0.5 rounded-lg">
                  <Hash size={12} /> {customer.code}
                </span>
              )}
              {customer.status === "active" ? (
                <span className="inline-flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-medium">
                  <CheckCircle2 size={11} /> Actief
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full font-medium">
                  <XCircle size={11} /> Inactief
                </span>
              )}
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Aangemaakt op {formatDate(customer.created_at)} · Bijgewerkt {relativeTime(customer.updated_at)}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mt-6 pt-5 border-t border-slate-100">
          {[
            { label: "Totaal projecten", value: stats.total,      color: "text-slate-700" },
            { label: "Actief",           value: stats.active,     color: "text-emerald-600" },
            { label: "Gearchiveerd",     value: stats.archived,   color: "text-slate-400"   },
          ].map(s => (
            <div key={s.label} className="text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 2-kolom grid: info links, projecten rechts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Linker kolom: info secties ── */}
        <div className="space-y-4">

          {/* Contactgegevens */}
          <Section title="Contactgegevens" icon={Mail} iconColor="text-blue-500" bgColor="bg-blue-50">
            <InfoRow icon={Mail}  label="E-mail"   value={customer.email}   href={customer.email ? `mailto:${customer.email}` : undefined} />
            <InfoRow icon={Phone} label="Telefoon" value={customer.phone}   href={customer.phone ? `tel:${customer.phone}` : undefined} />
            <InfoRow icon={Globe} label="Website"  value={customer.website} href={customer.website ?? undefined} />

            {!customer.email && !customer.phone && !customer.website && (
              <p className="text-sm text-slate-400 text-center py-3">Geen contactgegevens.</p>
            )}
          </Section>

          {/* Adres */}
          {(customer.address_street || customer.address_city) && (
            <Section title="Adres" icon={MapPin} iconColor="text-orange-500" bgColor="bg-orange-50">
              <InfoRow
                icon={MapPin}
                label="Adres"
                value={fullAddress || null}
                href={mapsUrl}
              />
            </Section>
          )}

          {/* Contactpersoon */}
          {customer.contact_name && (
            <Section title="Contactpersoon" icon={User} iconColor="text-violet-500" bgColor="bg-violet-50">
              <InfoRow icon={User}      label="Naam"     value={customer.contact_name} />
              <InfoRow icon={Briefcase} label="Rol"      value={customer.contact_role} />
              <InfoRow icon={Mail}      label="E-mail"   value={customer.contact_email}
                href={customer.contact_email ? `mailto:${customer.contact_email}` : undefined} />
              <InfoRow icon={Phone}     label="Telefoon" value={customer.contact_phone}
                href={customer.contact_phone ? `tel:${customer.contact_phone}` : undefined} />
            </Section>
          )}
        </div>

        {/* ── Rechter kolom: gekoppelde projecten ── */}
        <div>
          <Section title={`Gekoppelde projecten (${linked.length})`} icon={FolderKanban}>
            {/* Koppelen knop */}
            <button
              onClick={() => setShowLink(v => !v)}
              className="w-full flex items-center justify-center gap-2 text-sm text-brand-600
                hover:bg-brand-50 rounded-xl py-2 mb-3 transition-colors font-medium"
            >
              <Link2 size={14} />
              {showLink ? "Verbergen" : "Project koppelen"}
            </button>

            {/* Link zoekveld */}
            {showLink && (
              <div className="mb-3">
                <div className="relative mb-2">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    className="input pl-8 w-full text-sm"
                    placeholder="Zoek project…"
                    value={linkSearch}
                    onChange={e => setLinkSearch(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-100 divide-y divide-slate-50">
                  {linkable.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-3">Geen projecten om te koppelen.</p>
                  ) : linkable.map(p => (
                    <div key={p.id} className="flex items-center justify-between px-3 py-2.5">
                      <span className="text-sm text-slate-700 truncate">{p.name}</span>
                      <button
                        onClick={() => linkProject(p.id)}
                        disabled={linkLoading === p.id}
                        className="text-xs px-2.5 py-1 rounded-lg bg-brand-50 text-brand-700 hover:bg-brand-100 font-medium transition-colors flex-shrink-0"
                      >
                        {linkLoading === p.id ? <Loader2 size={12} className="animate-spin" /> : "Koppelen"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Linked projects list */}
            {linked.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">Nog geen projecten gekoppeld.</p>
            ) : (
              <div className="space-y-2">
                {linked.map(p => (
                  <div key={p.id}
                    className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-brand-100 hover:bg-brand-50/30 transition-colors group">
                    <FolderKanban size={15} className="text-slate-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <button
                        onClick={() => router.push(`/projects/${p.id}`)}
                        className="text-sm font-medium text-slate-700 hover:text-brand-600 transition-colors text-left truncate block w-full"
                      >
                        {p.name}
                      </button>
                    </div>
                    <StatusBadge status={p.status} />
                    <button
                      onClick={() => unlinkProject(p.id)}
                      disabled={linkLoading === p.id}
                      className="p-1 rounded-lg text-slate-300 hover:text-red-400 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                      title="Ontkoppelen"
                    >
                      {linkLoading === p.id ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>
      </div>

      {/* Dossiers */}
      <div className="card p-6">
        <DossierList customerId={customer.id} />
      </div>

      {/* Activiteitenlog */}
      <ActivityFeed customerId={customer.id} title="Klantactiviteit" />

    </div>
  );
}
