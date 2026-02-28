"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Building2, Trash2, Search, Hash, Pencil,
  CheckCircle2, XCircle, CheckSquare, Square,
  ChevronDown, Loader2, X,
} from "lucide-react";
import clsx from "clsx";
import CustomerWizard from "@/components/CustomerWizard";
import type { Customer, Project, CustomerStatus } from "@/types";

interface Props {
  initialCustomers: Customer[];
  allProjects:      Project[];
}

const STATUS_OPTIONS: { value: CustomerStatus; label: string }[] = [
  { value: "active",   label: "Actief"   },
  { value: "inactive", label: "Inactief" },
];

export default function CustomersClient({ initialCustomers, allProjects }: Props) {
  const router = useRouter();

  const [customers,      setCustomers]      = useState<Customer[]>(initialCustomers);
  const [search,         setSearch]         = useState("");
  const [statusFilter,   setStatusFilter]   = useState<string>("all");
  const [wizardOpen,     setWizardOpen]     = useState(false);
  const [editCustomer,   setEditCustomer]   = useState<Customer | null>(null);
  const [selected,       setSelected]       = useState<Set<string>>(new Set());
  const [bulkLoading,    setBulkLoading]    = useState(false);
  const [bulkError,      setBulkError]      = useState<string | null>(null);
  const [statusDropdown, setStatusDropdown] = useState(false);

  // ── Filtering ───────────────────────────────────────────
  const filtered = useMemo(() =>
    customers.filter((c: Customer) => {
      const matchSearch =
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.code ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (c.address_city ?? "").toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || c.status === statusFilter;
      return matchSearch && matchStatus;
    }),
    [customers, search, statusFilter]
  );

  const projectCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    allProjects.forEach(p => {
      if (p.customer_id) map[p.customer_id] = (map[p.customer_id] ?? 0) + 1;
    });
    return map;
  }, [allProjects]);

  // ── Selectie ────────────────────────────────────────────
  const allFilteredSelected = filtered.length > 0 && filtered.every((c: Customer) => selected.has(c.id));
  const activeSelected = filtered.filter((c: Customer) => selected.has(c.id));
  const someSelected = activeSelected.length > 0;

  function toggleOne(id: string) {
    setSelected((prev: Set<string>) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleAll() {
    setSelected(allFilteredSelected ? new Set() : new Set(filtered.map((c: Customer) => c.id)));
  }
  function clearSelection() { setSelected(new Set()); setBulkError(null); }

  // ── Bulk acties ─────────────────────────────────────────
  async function bulkAction(action: "delete" | "status", status?: CustomerStatus) {
    const ids = activeSelected.map((c: Customer) => c.id);
    if (action === "delete" && !confirm(
      `${ids.length} klant${ids.length !== 1 ? "en" : ""} verwijderen? Dit kan niet ongedaan worden gemaakt.`
    )) return;
    setBulkLoading(true); setBulkError(null); setStatusDropdown(false);
    try {
      const res = await fetch("/api/customers/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, action, status }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Actie mislukt");
      if (action === "delete") {
        setCustomers((prev: Customer[]) => prev.filter((c: Customer) => !ids.includes(c.id)));
      } else if (status) {
        setCustomers((prev: Customer[]) => prev.map((c: Customer) => ids.includes(c.id) ? { ...c, status } : c));
      }
      clearSelection();
    } catch (e) {
      setBulkError(e instanceof Error ? e.message : "Er ging iets mis");
    } finally { setBulkLoading(false); }
  }

  function handleCreated(customer: Customer) {
    setCustomers((prev: Customer[]) => [customer, ...prev]);
  }

  function handleEdited(customer: Customer) {
    setCustomers((prev: Customer[]) => prev.map((c: Customer) => c.id === customer.id ? customer : c));
    setEditCustomer(null);
  }

  async function handleDelete(e: React.MouseEvent<HTMLButtonElement>, id: string) {
    e.stopPropagation();
    if (!confirm("Klant verwijderen? Dit kan niet ongedaan worden gemaakt.")) return;
    const res = await fetch(`/api/customers/${id}`, { method: "DELETE" });
    if (res.ok) {
      setCustomers((prev: Customer[]) => prev.filter((c: Customer) => c.id !== id));
      setSelected((prev: Set<string>) => { const n = new Set(prev); n.delete(id); return n; });
    }
  }

  // ── Render ───────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Klanten</h1>
          <p className="text-sm text-slate-400 mt-0.5">{customers.length} klant{customers.length !== 1 ? "en" : ""}</p>
        </div>
        <button
          onClick={() => setWizardOpen(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={15} /> Nieuwe klant
        </button>
      </div>

      {/* Zoek + filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            placeholder="Zoeken op naam, code, stad…"
            className="pl-8 pr-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none
                       focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 w-60"
          />
        </div>
        <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
          {["all", "active", "inactive"].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} className={clsx(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
              statusFilter === s
                ? "bg-white text-brand-700 shadow-sm font-semibold"
                : "text-slate-500 hover:text-slate-700"
            )}>
              {s === "all" ? "Alle" : s === "active" ? "Actief" : "Inactief"}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk action bar */}
      {someSelected && (
        <div className="flex items-center gap-3 px-4 py-3 bg-brand-600 rounded-2xl text-white
                        shadow-lg shadow-brand-200 flex-wrap">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-brand-200" />
            <span className="text-sm font-semibold">{activeSelected.length} geselecteerd</span>
          </div>
          <div className="flex items-center gap-2 ml-auto flex-wrap">
            {/* Status wijzigen */}
            <div className="relative">
              <button
                onClick={() => setStatusDropdown((v: boolean) => !v)}
                disabled={bulkLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/20
                           hover:bg-white/30 text-sm font-medium transition-colors"
              >
                Status wijzigen
                <ChevronDown size={13} className={clsx("transition-transform", statusDropdown && "rotate-180")} />
              </button>
              {statusDropdown && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setStatusDropdown(false)} />
                  <div className="absolute right-0 top-full mt-1.5 bg-white border border-slate-200
                                  rounded-xl shadow-xl z-20 overflow-hidden min-w-[140px]">
                    {STATUS_OPTIONS.map(opt => (
                      <button key={opt.value} onClick={() => bulkAction("status", opt.value)}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700
                                   hover:bg-slate-50 transition-colors text-left">
                        <span className={clsx("w-2 h-2 rounded-full",
                          opt.value === "active" ? "bg-emerald-500" : "bg-slate-400")} />
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <button onClick={() => bulkAction("delete")} disabled={bulkLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/80
                         hover:bg-red-500 text-sm font-medium transition-colors">
              {bulkLoading ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
              Verwijderen
            </button>
            <button onClick={clearSelection}
              className="p-1.5 rounded-xl bg-white/20 hover:bg-white/30 transition-colors">
              <X size={14} />
            </button>
          </div>
          {bulkError && <p className="w-full text-xs text-red-200 mt-1">{bulkError}</p>}
        </div>
      )}

      {/* Leeg staat */}
      {filtered.length === 0 ? (
        <div className="card p-16 text-center">
          <Building2 size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 text-sm font-medium">Geen klanten gevonden</p>
          <button onClick={() => setWizardOpen(true)}
            className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200
                       text-slate-600 text-sm hover:bg-slate-50 mx-auto">
            <Plus size={14} /> Nieuwe klant aanmaken
          </button>
        </div>
      ) : (
        <>
          {/* Selecteer-alles */}
          <div className="flex items-center gap-2 px-1">
            <button onClick={toggleAll}
              className="flex items-center gap-2 text-xs text-slate-500 hover:text-brand-600 transition-colors">
              {allFilteredSelected
                ? <CheckSquare size={15} className="text-brand-600" />
                : <Square size={15} />
              }
              {allFilteredSelected ? "Alles deselecteren" : "Alles selecteren"}
            </button>
          </div>

          {/* Card grid — identiek aan projecten */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((c: Customer) => {
              const isSelected   = selected.has(c.id);
              const projectCount = projectCountMap[c.id] ?? 0;
              return (
                <div
                  key={c.id}
                  onClick={() => router.push(`/customers/${c.id}`)}
                  className={clsx(
                    "card-hover p-5 flex flex-col gap-3 group cursor-pointer relative transition-all",
                    isSelected && "ring-2 ring-brand-500 bg-brand-50/30"
                  )}
                >
                  {/* Checkbox */}
                  <div
                    className="absolute top-3 left-3 z-10"
                    onClick={(e: React.MouseEvent) => { e.stopPropagation(); toggleOne(c.id); }}
                  >
                    <div className={clsx(
                      "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all",
                      isSelected
                        ? "bg-brand-600 border-brand-600"
                        : "border-slate-300 bg-white opacity-0 group-hover:opacity-100"
                    )}>
                      {isSelected && (
                        <svg viewBox="0 0 10 8" className="w-3 h-3">
                          <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5"
                                fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                  </div>

                  {/* Status badge + delete */}
                  <div className="flex items-start justify-between gap-2 pl-4">
                    {c.status === "active" ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold
                                       text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
                        <CheckCircle2 size={11} /> Actief
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold
                                       text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                        <XCircle size={11} /> Inactief
                      </span>
                    )}
                    <button
                      onClick={(e: React.MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); setEditCustomer(c); }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50
                                 transition-colors opacity-0 group-hover:opacity-100"
                      title="Bewerken"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={(e: React.MouseEvent<HTMLButtonElement>) => handleDelete(e, c.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50
                                 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  {/* Naam + code */}
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-slate-800 group-hover:text-brand-700
                                     transition-colors leading-snug">
                        {c.name}
                      </h3>
                      {c.code && (
                        <span className="text-[11px] font-mono bg-slate-100 text-slate-400
                                         px-1.5 py-0.5 rounded flex items-center gap-0.5">
                          <Hash size={9} />{c.code}
                        </span>
                      )}
                    </div>
                    {c.address_city && (
                      <p className="text-xs text-slate-400 mt-0.5">{c.address_city}</p>
                    )}
                  </div>

                  {/* Footer meta */}
                  <div className="flex items-center gap-3 mt-auto pt-2 border-t border-slate-50 flex-wrap">
                    <span className="flex items-center gap-1 text-xs text-slate-400">
                      <Building2 size={11} />
                      {projectCount} project{projectCount !== 1 ? "en" : ""}
                    </span>
                    {c.email && (
                      <span className="text-xs text-slate-400 truncate">{c.email}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Wizard */}
      {/* Nieuw aanmaken */}
      <CustomerWizard
        open={wizardOpen}
        allProjects={allProjects}
        onClose={() => setWizardOpen(false)}
        onCreated={handleCreated}
      />

      {/* Bewerken */}
      {editCustomer && (
        <CustomerWizard
          open={!!editCustomer}
          allProjects={allProjects}
          onClose={() => setEditCustomer(null)}
          onCreated={handleEdited}
          editCustomer={editCustomer}
        />
      )}
    </div>
  );
}
