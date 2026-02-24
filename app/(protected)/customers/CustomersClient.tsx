"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Building2, Pencil, Trash2, X,
  ChevronRight, Search, Link2, FolderKanban,
} from "lucide-react";
import { createClient } from "@/lib/supabaseClient";
import { formatDate } from "@/lib/time";
import StatusBadge from "@/components/ui/StatusBadge";
import type { Customer, Project } from "@/types";

interface Props {
  initialCustomers: Customer[];
  allProjects: Project[];
}

export default function CustomersClient({ initialCustomers, allProjects }: Props) {
  const router = useRouter();

  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [projects,  setProjects]  = useState<Project[]>(allProjects);
  const [search,    setSearch]    = useState("");

  // create/edit modal
  const [modal,   setModal]   = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [name,    setName]    = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  // link projects modal
  const [linkModal,   setLinkModal]   = useState<Customer | null>(null);
  const [linkSearch,  setLinkSearch]  = useState("");
  const [linkLoading, setLinkLoading] = useState<string | null>(null);

  // ─── filtered customers ───────────────────────────────────
  const filtered = useMemo(() =>
    customers.filter(c =>
      c.name.toLowerCase().includes(search.toLowerCase())
    ), [customers, search]);

  // project count per customer
  const projectCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    projects.forEach(p => {
      if (p.customer_id) map[p.customer_id] = (map[p.customer_id] ?? 0) + 1;
    });
    return map;
  }, [projects]);

  // ─── customer CRUD ────────────────────────────────────────
  function openCreate() { setName(""); setEditing(null); setError(""); setModal("create"); }
  function openEdit(c: Customer) { setName(c.name); setEditing(c); setError(""); setModal("edit"); }
  function closeModal() { setModal(null); setEditing(null); }

  async function handleSave() {
    if (!name.trim()) { setError("Name is required"); return; }
    setLoading(true); setError("");
    const supabase = createClient();

    if (modal === "edit" && editing) {
      const { data, error: err } = await supabase
        .from("customers").update({ name }).eq("id", editing.id).select().single();
      if (err) { setError(err.message); setLoading(false); return; }
      setCustomers(prev =>
        prev.map(c => c.id === editing.id ? (data as Customer) : c)
            .sort((a, b) => a.name.localeCompare(b.name))
      );
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error: err } = await supabase
        .from("customers").insert({ name, owner_id: user!.id }).select().single();
      if (err) { setError(err.message); setLoading(false); return; }
      setCustomers(prev =>
        [...prev, data as Customer].sort((a, b) => a.name.localeCompare(b.name))
      );
    }
    setLoading(false); closeModal();
  }

  async function handleDelete(id: string) {
    if (!confirm("Klant verwijderen? De gekoppelde projecten blijven bestaan, maar verliezen de koppeling.")) return;
    const supabase = createClient();
    await supabase.from("customers").delete().eq("id", id);
    setCustomers(prev => prev.filter(c => c.id !== id));
    setProjects(prev => prev.map(p =>
      p.customer_id === id ? { ...p, customer_id: null, customer: null } : p
    ));
  }

  // ─── link / unlink projects ───────────────────────────────
  function openLinkModal(c: Customer) { setLinkSearch(""); setLinkModal(c); }

  async function linkProject(projectId: string, customerId: string) {
    setLinkLoading(projectId);
    const supabase = createClient();
    await supabase.from("projects").update({ customer_id: customerId }).eq("id", projectId);
    setProjects(prev => prev.map(p =>
      p.id === projectId
        ? { ...p, customer_id: customerId, customer: { id: customerId, name: linkModal!.name } }
        : p
    ));
    setLinkLoading(null);
  }

  async function unlinkProject(projectId: string) {
    setLinkLoading(projectId);
    const supabase = createClient();
    await supabase.from("projects").update({ customer_id: null }).eq("id", projectId);
    setProjects(prev => prev.map(p =>
      p.id === projectId ? { ...p, customer_id: null, customer: null } : p
    ));
    setLinkLoading(null);
  }

  const linkedProjects = linkModal
    ? projects.filter(p => p.customer_id === linkModal.id)
    : [];

  const linkableProjects = linkModal
    ? projects.filter(p =>
        p.customer_id !== linkModal.id &&
        p.name.toLowerCase().includes(linkSearch.toLowerCase())
      )
    : [];

  // ─── render ──────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Klanten</h2>
          <p className="text-sm text-slate-500">{customers.length} klant{customers.length !== 1 ? "en" : ""}</p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <Plus size={16} /> New customer
        </button>
      </div>

      {/* Search bar */}
      <div className="relative max-w-xs">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          className="input pl-9"
          placeholder="Klanten zoeken…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="card p-14 text-center">
          <Building2 size={36} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 text-sm mb-4">
            {search ? `Geen klanten gevonden voor "${search}"` : "Nog geen klanten"}
          </p>
          {!search && (
            <button onClick={openCreate} className="btn-secondary mx-auto">
              <Plus size={14} /> Klant toevoegen
            </button>
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(c => {
            const count = projectCountMap[c.id] ?? 0;
            return (
              <div
                key={c.id}
                className="card-hover p-5 flex flex-col gap-4 group"
                onClick={() => router.push(`/customers/${c.id}`)}
              >
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0">
                    <Building2 size={18} className="text-brand-500" />
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      title="Projecten koppelen"
                      onClick={e => { e.stopPropagation(); openLinkModal(c); }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                    >
                      <Link2 size={13} />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); openEdit(c); }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); handleDelete(c.id); }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <div className="flex-1">
                  <h3 className="font-semibold text-slate-800 text-sm leading-tight">{c.name}</h3>
                  <p className="text-xs text-slate-400 mt-1">Klant sinds {formatDate(c.created_at)}</p>
                </div>

                <div className="flex items-center justify-between border-t border-slate-50 pt-3">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <FolderKanban size={13} className="text-brand-400" />
                    {count} project{count !== 1 ? "en" : ""}
                  </div>
                  <ChevronRight size={14} className="text-slate-300" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Create / Edit modal ──────────────────────────── */}
      {modal && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={e => e.target === e.currentTarget && closeModal()}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-slate-800 text-lg">
                {modal === "edit" ? "Klant bewerken" : "Nieuwe klant"}
              </h3>
              <button onClick={closeModal} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>
            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-600 text-sm border border-red-200">{error}</div>
            )}
            <div>
              <label className="label">Klantnaam *</label>
              <input
                className="input" placeholder="bijv. Acme Corp" value={name}
                onChange={e => setName(e.target.value)} autoFocus
                onKeyDown={e => e.key === "Enter" && handleSave()}
              />
            </div>
            <div className="flex gap-3 justify-end mt-5">
              <button onClick={closeModal} className="btn-outline">Annuleren</button>
              <button onClick={handleSave} disabled={loading} className="btn-primary">
                {loading ? "Opslaan…" : modal === "edit" ? "Opslaan" : "Aanmaken"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Link projects modal ──────────────────────────── */}
      {linkModal && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={e => e.target === e.currentTarget && setLinkModal(null)}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-slate-800 text-lg">Projecten koppelen</h3>
              <button onClick={() => setLinkModal(null)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-slate-400 mb-5">
              Projecten beheren voor <span className="font-medium text-slate-600">{linkModal.name}</span>
            </p>

            {/* Already linked */}
            {linkedProjects.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Gekoppeld</p>
                <div className="flex flex-col gap-1.5">
                  {linkedProjects.map(p => (
                    <div key={p.id} className="flex items-center gap-3 px-3 py-2.5 bg-brand-50 rounded-xl border border-brand-100">
                      <FolderKanban size={14} className="text-brand-500 flex-shrink-0" />
                      <span className="flex-1 text-sm font-medium text-slate-700 truncate">{p.name}</span>
                      <StatusBadge status={p.status} />
                      <button
                        onClick={() => unlinkProject(p.id)}
                        disabled={linkLoading === p.id}
                        className="text-xs text-red-400 hover:text-red-600 font-medium px-2 py-1 rounded-lg hover:bg-red-50 transition-colors flex-shrink-0"
                      >
                        {linkLoading === p.id ? "…" : "Ontkoppelen"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add more */}
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Project toevoegen</p>
            <div className="relative mb-3">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="input pl-9 text-sm"
                placeholder="Projecten zoeken om te koppelen…"
                value={linkSearch}
                onChange={e => setLinkSearch(e.target.value)}
                autoFocus
              />
            </div>

            <div className="flex flex-col gap-1.5 overflow-y-auto flex-1 min-h-0">
              {linkableProjects.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">
                  {linkSearch
                    ? `Geen projecten gevonden voor "${linkSearch}"`
                    : "Geen projecten meer te koppelen"}
                </p>
              ) : (
                linkableProjects.map(p => (
                  <div key={p.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-slate-100 hover:border-brand-200 hover:bg-brand-50/40 transition-colors">
                    <FolderKanban size={14} className="text-slate-400 flex-shrink-0" />
                    <span className="flex-1 text-sm text-slate-700 truncate">{p.name}</span>
                    {/* Show current customer if already linked to another */}
                    {p.customer_id && p.customer && (
                      <span className="text-xs text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full flex-shrink-0">
                        {(p.customer as any).name}
                      </span>
                    )}
                    <StatusBadge status={p.status} />
                    <button
                      onClick={() => linkProject(p.id, linkModal.id)}
                      disabled={linkLoading === p.id}
                      className="btn-secondary text-xs px-2.5 py-1.5 flex-shrink-0"
                    >
                      {linkLoading === p.id ? "…" : "Koppelen"}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
