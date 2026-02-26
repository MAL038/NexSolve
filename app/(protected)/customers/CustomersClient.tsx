"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Building2, Pencil, Trash2, X,
  ChevronRight, Search, Link2, FolderKanban,
  Hash, CheckCircle2, XCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabaseClient";
import CustomerWizard from "@/components/CustomerWizard";
import type { Customer, Project, CustomerStatus } from "@/types";

interface Props {
  initialCustomers: Customer[];
  allProjects: Project[];
}

export default function CustomersClient({ initialCustomers, allProjects }: Props) {
  const router = useRouter();

  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [projects,  setProjects]  = useState<Project[]>(allProjects);
  const [search,    setSearch]    = useState("");

  // Wizard (aanmaken)
  const [wizardOpen, setWizardOpen] = useState(false);

  // Edit modal (bewerken bestaande klant — eenvoudig inline form)
  const [editModal,  setEditModal]  = useState<Customer | null>(null);
  const [editName,   setEditName]   = useState("");
  const [editStatus, setEditStatus] = useState<CustomerStatus>("active");
  const [editLoading, setEditLoading] = useState(false);
  const [editError,   setEditError]   = useState("");

  // Link projects modal
  const [linkModal,   setLinkModal]   = useState<Customer | null>(null);
  const [linkSearch,  setLinkSearch]  = useState("");
  const [linkLoading, setLinkLoading] = useState<string | null>(null);

  // ─── Filtered list ────────────────────────────────────────
  const filtered = useMemo(() =>
    customers.filter(c =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.code ?? "").toLowerCase().includes(search.toLowerCase())
    ), [customers, search]);

  const projectCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    projects.forEach(p => {
      if (p.customer_id) map[p.customer_id] = (map[p.customer_id] ?? 0) + 1;
    });
    return map;
  }, [projects]);

  // ─── Wizard callback ──────────────────────────────────────
  function handleCreated(customer: Customer) {
    setCustomers(prev =>
      [...prev, customer].sort((a, b) =>
        (a.code ?? a.name).localeCompare(b.code ?? b.name)
      )
    );
  }

  // ─── Edit ─────────────────────────────────────────────────
  function openEdit(c: Customer) {
    setEditModal(c);
    setEditName(c.name);
    setEditStatus(c.status);
    setEditError("");
  }

  async function handleEditSave() {
    if (!editModal || !editName.trim()) return;
    setEditLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("customers")
      .update({ name: editName.trim(), status: editStatus })
      .eq("id", editModal.id)
      .select()
      .single();

    if (error) { setEditError(error.message); setEditLoading(false); return; }
    setCustomers(prev => prev.map(c => c.id === editModal.id ? (data as Customer) : c));
    setEditModal(null);
    setEditLoading(false);
  }

  // ─── Delete ───────────────────────────────────────────────
  async function handleDelete(id: string) {
    if (!confirm("Klant verwijderen? Dit kan niet ongedaan worden gemaakt.")) return;
    const supabase = createClient();
    await supabase.from("customers").delete().eq("id", id);
    setCustomers(prev => prev.filter(c => c.id !== id));
  }

  // ─── Link projects ────────────────────────────────────────
  async function toggleLink(project: Project, linked: boolean) {
    setLinkLoading(project.id);
    const supabase = createClient();
    await supabase.from("projects")
      .update({ customer_id: linked ? null : linkModal!.id })
      .eq("id", project.id);
    setProjects(prev => prev.map(p =>
      p.id === project.id ? { ...p, customer_id: linked ? null : linkModal!.id } : p
    ));
    setLinkLoading(null);
  }

  // ─── Render ───────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Klanten</h2>
          <p className="text-sm text-slate-500 mt-0.5">{customers.length} klant{customers.length !== 1 ? "en" : ""}</p>
        </div>
        <button onClick={() => setWizardOpen(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Nieuwe klant
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Zoek op naam of code…"
          className="input pl-9 w-full max-w-sm"
        />
      </div>

      {/* List */}
      <div className="card divide-y divide-slate-50 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <Building2 size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Geen klanten gevonden.</p>
            <button
              onClick={() => setWizardOpen(true)}
              className="mt-3 text-sm text-brand-600 hover:underline"
            >
              Maak je eerste klant aan →
            </button>
          </div>
        ) : filtered.map(c => (
          <div key={c.id}
            className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors group">

            <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0">
              <Building2 size={18} className="text-brand-600" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-slate-800 truncate">{c.name}</p>
                {c.code && (
                  <span className="text-xs font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                    #{c.code}
                  </span>
                )}
                {c.status === "inactive" ? (
                  <span className="flex items-center gap-1 text-xs text-slate-400">
                    <XCircle size={11} /> Inactief
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-emerald-600">
                    <CheckCircle2 size={11} /> Actief
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-400">
                {c.email && <span className="truncate">{c.email}</span>}
                {c.phone && <span>{c.phone}</span>}
                {c.address_city && <span>{c.address_city}</span>}
                <span>{projectCountMap[c.id] ?? 0} project{(projectCountMap[c.id] ?? 0) !== 1 ? "en" : ""}</span>
              </div>
            </div>

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => setLinkModal(c)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                title="Projecten koppelen">
                <Link2 size={15} />
              </button>
              <button onClick={() => router.push(`/customers/${c.id}`)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors">
                <ChevronRight size={15} />
              </button>
              <button onClick={() => openEdit(c)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors">
                <Pencil size={15} />
              </button>
              <button onClick={() => handleDelete(c.id)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ── Wizard ──────────────────────────────────────────── */}
      <CustomerWizard
        open={wizardOpen}
        allProjects={allProjects}
        onClose={() => setWizardOpen(false)}
        onCreated={handleCreated}
      />

      {/* ── Edit Modal (snel bewerken) ───────────────────────── */}
      {editModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800">Klant bewerken</h3>
              <button onClick={() => setEditModal(null)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100">
                <X size={16} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {editError && (
                <div className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2.5">{editError}</div>
              )}
              <div>
                <label className="label">Naam</label>
                <input
                  className="input w-full"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  autoFocus
                />
              </div>
              <div>
                <label className="label">Status</label>
                <select
                  className="input w-full"
                  value={editStatus}
                  onChange={e => setEditStatus(e.target.value as CustomerStatus)}
                >
                  <option value="active">Actief</option>
                  <option value="inactive">Inactief</option>
                </select>
              </div>
              <p className="text-xs text-slate-400">
                Wil je meer velden bewerken? Ga naar de{" "}
                <button onClick={() => { setEditModal(null); router.push(`/customers/${editModal.id}`); }}
                  className="text-brand-600 hover:underline">detailpagina</button>.
              </p>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100">
              <button onClick={() => setEditModal(null)} className="btn-ghost">Annuleren</button>
              <button onClick={handleEditSave} disabled={editLoading} className="btn-primary">
                {editLoading ? "Opslaan…" : "Opslaan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Link Projects Modal ───────────────────────────────── */}
      {linkModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800">
                Projecten koppelen — {linkModal.name}
              </h3>
              <button onClick={() => setLinkModal(null)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100">
                <X size={16} />
              </button>
            </div>
            <div className="px-6 py-4 space-y-3">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  className="input pl-9 w-full"
                  placeholder="Zoek project…"
                  value={linkSearch}
                  onChange={e => setLinkSearch(e.target.value)}
                />
              </div>
              <div className="divide-y divide-slate-50 max-h-64 overflow-y-auto rounded-xl border border-slate-100">
                {projects
                  .filter(p => p.name.toLowerCase().includes(linkSearch.toLowerCase()))
                  .map(p => {
                    const linked = p.customer_id === linkModal.id;
                    return (
                      <div key={p.id} className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <FolderKanban size={15} className="text-slate-400" />
                          <span className="text-sm text-slate-700">{p.name}</span>
                        </div>
                        <button
                          disabled={!!linkLoading}
                          onClick={() => toggleLink(p, linked)}
                          className={`text-xs px-3 py-1 rounded-lg font-medium transition-colors ${
                            linked
                              ? "bg-brand-50 text-brand-700 hover:bg-red-50 hover:text-red-600"
                              : "bg-slate-100 text-slate-600 hover:bg-brand-50 hover:text-brand-700"
                          }`}
                        >
                          {linkLoading === p.id ? "…" : linked ? "Ontkoppelen" : "Koppelen"}
                        </button>
                      </div>
                    );
                  })
                }
              </div>
            </div>
            <div className="flex justify-end px-6 py-4 border-t border-slate-100">
              <button onClick={() => setLinkModal(null)} className="btn-primary">Klaar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
