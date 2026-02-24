"use client";

import { useState, useTransition, useMemo, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Plus, Search, X, FolderKanban, Pencil, Trash2,
  Building2, ChevronRight, Layers,
} from "lucide-react";
import clsx from "clsx";
import { createClient } from "@/lib/supabaseClient";
import StatusBadge from "@/components/ui/StatusBadge";
import ThemeSelector from "@/components/ui/ThemeSelector";
import { relativeTime } from "@/lib/time";
import { PROJECT_STATUSES } from "@/lib/constants";
import type { Customer, Project, ProjectStatus, ThemeSelection, ThemeWithChildren } from "@/types";

const THEME_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  "algemeen":        { bg: "bg-slate-100",  text: "text-slate-700",  dot: "bg-slate-400"  },
  "crm":             { bg: "bg-blue-50",    text: "text-blue-700",   dot: "bg-blue-400"   },
  "hrm":             { bg: "bg-brand-50",   text: "text-brand-700",  dot: "bg-brand-500"  },
  "ordermanagement": { bg: "bg-amber-50",   text: "text-amber-700",  dot: "bg-amber-400"  },
  "payroll":         { bg: "bg-violet-50",  text: "text-violet-700", dot: "bg-violet-400" },
  "erp":             { bg: "bg-rose-50",    text: "text-rose-700",   dot: "bg-rose-400"   },
};
function tc(slug: string) { return THEME_COLORS[slug] ?? THEME_COLORS["algemeen"]; }

interface Props {
  initialProjects:  Project[];
  customers:        Customer[];
  hierarchy:        ThemeWithChildren[];
  initialThemeId:   string;
  initialProcessId: string;
}

const EMPTY_FORM = {
  name: "", description: "", status: "active" as ProjectStatus,
  customer_id: "" as string | null,
};
const EMPTY_SEL: ThemeSelection = { theme_id: null, process_id: null, process_type_id: null };

export default function ProjectsClient({
  initialProjects, customers, hierarchy,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [projects,     setProjects]     = useState<Project[]>(initialProjects);
  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "all">("all");
  const [custFilter,   setCustFilter]   = useState<string>("all");

  const themeFilter = searchParams.get("theme")   ?? "";
  const procFilter  = searchParams.get("process") ?? "";
  const openNew     = searchParams.get("new")     === "1";

  const [modal,    setModal]    = useState<"create" | "edit" | null>(null);
  const [editing,  setEditing]  = useState<Project | null>(null);
  const [form,     setForm]     = useState(EMPTY_FORM);
  const [modalSel, setModalSel] = useState<ThemeSelection>(EMPTY_SEL);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  // Open modal automatisch als ?new=1 in URL staat (vanuit sidebar + knop)
  useEffect(() => {
    if (openNew && modal === null) {
      const prefill: ThemeSelection = {
        theme_id:        themeFilter || null,
        process_id:      procFilter  || null,
        process_type_id: null,
      };
      setForm(EMPTY_FORM);
      setModalSel(prefill);
      setEditing(null);
      setError("");
      setModal("create");
      const params = new URLSearchParams(searchParams.toString());
      params.delete("new");
      const newUrl = params.toString() ? `/projects?${params.toString()}` : "/projects";
      router.replace(newUrl);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openNew]);

  const filtered = useMemo(() => projects.filter(p => {
    const matchStatus   = statusFilter === "all" || p.status === statusFilter;
    const matchCustomer = custFilter   === "all" || p.customer_id === custFilter;
    const matchTheme    = !themeFilter || p.theme_id === themeFilter;
    const matchProcess  = !procFilter  || p.process_id === procFilter;
    const matchSearch   =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.description ?? "").toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchCustomer && matchTheme && matchProcess && matchSearch;
  }), [projects, statusFilter, custFilter, themeFilter, procFilter, search]);

  const activeLabel = useMemo(() => {
    const t = hierarchy.find(h => h.id === themeFilter);
    if (!t) return null;
    const p = t.processes?.find(pr => pr.id === procFilter);
    return { theme: t, process: p, color: tc(t.slug) };
  }, [themeFilter, procFilter, hierarchy]);

  function openCreate() {
    const prefill: ThemeSelection = {
      theme_id:        themeFilter || null,
      process_id:      procFilter  || null,
      process_type_id: null,
    };
    setForm(EMPTY_FORM); setModalSel(prefill);
    setEditing(null); setError(""); setModal("create");
  }

  function openEdit(p: Project) {
    setForm({ name: p.name, description: p.description ?? "", status: p.status, customer_id: p.customer_id ?? "" });
    setModalSel({
      theme_id:        p.theme_id        ?? null,
      process_id:      p.process_id      ?? null,
      process_type_id: p.process_type_id ?? null,
    });
    setEditing(p); setError(""); setModal("edit");
  }

  function closeModal() { setModal(null); setEditing(null); }
  const handleSelChange = useCallback((s: ThemeSelection) => setModalSel(s), []);

  async function handleSave() {
    if (!form.name.trim()) { setError("Projectnaam is verplicht."); return; }
    setLoading(true); setError("");
    const supabase = createClient();
    const payload = { ...form, customer_id: form.customer_id || null, ...modalSel };

    if (modal === "edit" && editing) {
      const { data, error: err } = await supabase
        .from("projects")
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq("id", editing.id)
        .select("*, customer:customers(id, name)")
        .single();
      if (err) { setError(err.message); setLoading(false); return; }
      setProjects(prev => prev.map(p => p.id === editing.id ? data as Project : p));
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error: err } = await supabase
        .from("projects")
        .insert({ ...payload, owner_id: user!.id })
        .select("*, customer:customers(id, name)")
        .single();
      if (err) { setError(err.message); setLoading(false); return; }
      setProjects(prev => [data as Project, ...prev]);
    }
    setLoading(false); closeModal();
    startTransition(() => router.refresh());
  }

  async function handleDelete(id: string) {
    if (!confirm("Weet je zeker dat je dit project wil verwijderen?")) return;
    const supabase = createClient();
    await supabase.from("projects").delete().eq("id", id);
    setProjects(prev => prev.filter(p => p.id !== id));
    startTransition(() => router.refresh());
  }

  function getThemeInfo(p: Project) {
    const t    = hierarchy.find(h => h.id === p.theme_id);
    const proc = t?.processes?.find(pr => pr.id === p.process_id);
    return { theme: t, process: proc };
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5">

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div>
          {activeLabel ? (
            <div className="flex items-center gap-1.5 mb-0.5">
              <h2 className="text-xl font-bold text-slate-800">{activeLabel.theme.name}</h2>
              {activeLabel.process && (
                <>
                  <ChevronRight size={16} className="text-slate-400" />
                  <h2 className="text-xl font-bold text-slate-800">{activeLabel.process.name}</h2>
                </>
              )}
            </div>
          ) : (
            <h2 className="text-xl font-bold text-slate-800">Alle projecten</h2>
          )}
          <p className="text-sm text-slate-500">
            {filtered.length} project{filtered.length !== 1 ? "en" : ""}
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary flex-shrink-0">
          <Plus size={16} /> Nieuw project
        </button>
      </div>

      {activeLabel && (
        <div className="flex items-center gap-2">
          <div className={clsx(
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium",
            activeLabel.color.bg, activeLabel.color.text
          )}>
            <span className={clsx("w-1.5 h-1.5 rounded-full", activeLabel.color.dot)} />
            {activeLabel.theme.name}
            {activeLabel.process && (
              <><ChevronRight size={10} className="opacity-50" />{activeLabel.process.name}</>
            )}
          </div>
          <button onClick={() => router.push("/projects")}
            className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 transition-colors">
            <X size={12} /> Wis filter
          </button>
        </div>
      )}

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="Zoeken..." value={search}
            onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="select max-w-[180px]" value={custFilter} onChange={e => setCustFilter(e.target.value)}>
          <option value="all">Alle klanten</option>
          <option value="">Geen klant</option>
          {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <div className="flex gap-2 flex-wrap">
          {(["all", ...PROJECT_STATUSES.map(s => s.value)] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s as typeof statusFilter)}
              className={clsx(
                "px-3 py-2 rounded-xl text-xs font-medium border transition-all",
                statusFilter === s
                  ? "bg-brand-500 text-white border-brand-500"
                  : "bg-white text-slate-500 border-slate-200 hover:border-brand-300 hover:text-brand-600"
              )}>
              {s === "all" ? "Alle" : PROJECT_STATUSES.find(x => x.value === s)?.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card p-16 text-center">
          <FolderKanban size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 text-sm font-medium">Geen projecten gevonden</p>
          <button onClick={openCreate} className="btn-secondary mt-4 mx-auto">
            <Plus size={15} /> Project aanmaken
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(p => {
            const { theme, process } = getThemeInfo(p);
            const c = theme ? tc(theme.slug) : null;
            return (
              <div key={p.id} className="card-hover p-5 flex flex-col gap-3 group"
                onClick={() => router.push(`/projects/${p.id}`)}>
                <div className="flex items-start justify-between gap-2">
                  <StatusBadge status={p.status} />
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={e => { e.stopPropagation(); openEdit(p); }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors">
                      <Pencil size={13} />
                    </button>
                    <button onClick={e => { e.stopPropagation(); handleDelete(p.id); }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                {c && theme && (
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      router.push(process
                        ? `/projects?theme=${theme.id}&process=${process.id}`
                        : `/projects?theme=${theme.id}`);
                    }}
                    className={clsx(
                      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold self-start transition-opacity hover:opacity-75",
                      c.bg, c.text
                    )}>
                    <span className={clsx("w-1.5 h-1.5 rounded-full flex-shrink-0", c.dot)} />
                    {theme.name}
                    {process && <><ChevronRight size={10} className="opacity-50" />{process.name}</>}
                  </button>
                )}
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-800 text-sm leading-tight">{p.name}</h3>
                  {p.description && (
                    <p className="text-xs text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">{p.description}</p>
                  )}
                </div>
                {p.customer && (
                  <div className="flex items-center gap-1.5 text-xs text-brand-600 font-medium">
                    <Building2 size={12} />
                    {(p.customer as any).name}
                  </div>
                )}
                <p className="text-xs text-slate-400 border-t border-slate-50 pt-2.5">
                  {relativeTime(p.created_at)}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between p-6 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-800 text-lg">
                  {modal === "edit" ? "Project bewerken" : "Nieuw project aanmaken"}
                </h3>
                {modal === "create" && modalSel.theme_id && (() => {
                  const t = hierarchy.find(h => h.id === modalSel.theme_id);
                  if (!t) return null;
                  const proc = t.processes?.find(pr => pr.id === modalSel.process_id);
                  const c = tc(t.slug);
                  return (
                    <span className={clsx(
                      "inline-flex items-center gap-1.5 mt-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold",
                      c.bg, c.text
                    )}>
                      <span className={clsx("w-1.5 h-1.5 rounded-full", c.dot)} />
                      {t.name}{proc ? ` › ${proc.name}` : ""}
                    </span>
                  );
                })()}
              </div>
              <button onClick={closeModal} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 mt-0.5">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {error && (
                <div className="p-3 rounded-xl bg-red-50 text-red-600 text-sm border border-red-200">{error}</div>
              )}
              <div>
                <label className="label">Projectnaam *</label>
                <input className="input" placeholder="bijv. HR Implementatie Q2" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoFocus />
              </div>
              <div>
                <label className="label">Omschrijving</label>
                <textarea className="input resize-none" rows={2}
                  placeholder="Waar gaat dit project over?"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Status</label>
                  <select className="select" value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value as ProjectStatus }))}>
                    {PROJECT_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Klant <span className="text-slate-300 font-normal">(optioneel)</span></label>
                  <select className="select" value={form.customer_id ?? ""}
                    onChange={e => setForm(f => ({ ...f, customer_id: e.target.value || null }))}>
                    <option value="">— Geen klant —</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="border-t border-slate-100 pt-5">
                <div className="flex items-center gap-2 mb-4">
                  <Layers size={15} className="text-slate-400" />
                  <span className="text-sm font-semibold text-slate-700">Thema & submodule</span>
                  <span className="text-xs text-slate-400">(optioneel)</span>
                </div>
                <ThemeSelector
                  value={modalSel}
                  onChange={handleSelChange}
                  initialHierarchy={hierarchy}
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end p-6 border-t border-slate-100">
              <button onClick={closeModal} className="btn-outline">Annuleren</button>
              <button onClick={handleSave} disabled={loading} className="btn-primary">
                {loading ? "Opslaan..." : modal === "edit" ? "Wijzigingen opslaan" : "Project aanmaken"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
