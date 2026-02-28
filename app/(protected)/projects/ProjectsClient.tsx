"use client";

import React from "react";

import { useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Plus, Pencil, Trash2, FolderKanban, Search, Layers,
  Building2, Calendar, Users, CheckSquare, Square,
  ChevronDown, X, Loader2, CheckCircle2,
} from "lucide-react";
import clsx from "clsx";
import StatusBadge from "@/components/ui/StatusBadge";
import ProjectWizard from "@/components/projects/ProjectWizard";
import type { Project, ThemeWithChildren, ProjectStatus } from "@/types";

interface Props {
  initialProjects: Project[];
  hierarchy:       ThemeWithChildren[];
  currentUserId:   string;
}

const THEME_COLORS: Record<string, string> = {
  algemeen:        "bg-slate-100 text-slate-600",
  crm:             "bg-blue-50 text-blue-700",
  hrm:             "bg-brand-50 text-brand-700",
  ordermanagement: "bg-amber-50 text-amber-700",
  payroll:         "bg-violet-50 text-violet-700",
  erp:             "bg-rose-50 text-rose-700",
};

const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: "active",      label: "Actief" },
  { value: "in-progress", label: "In uitvoering" },
  { value: "archived",    label: "Gearchiveerd" },
];

export default function ProjectsClient({ initialProjects, hierarchy, currentUserId }: Props) {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const themeSlug    = searchParams.get("theme")   ?? "";
  const processSlug  = searchParams.get("process") ?? "";

  const [projects,       setProjects]       = useState<Project[]>(initialProjects);
  const [search,         setSearch]         = useState("");
  const [statusFilter,   setStatusFilter]   = useState<string>("all");
  const [themeFilter,    setThemeFilter]     = useState<string>(themeSlug);
  const [processFilter,  setProcessFilter]  = useState<string>(processSlug);
  const [showWizard,     setShowWizard]     = useState(searchParams.get("new") === "1");
  const [editProject,    setEditProject]    = useState<Project | null>(null);
  const [selected,       setSelected]       = useState<Set<string>>(new Set());
  const [bulkLoading,    setBulkLoading]    = useState(false);
  const [bulkError,      setBulkError]      = useState<string | null>(null);
  const [statusDropdown, setStatusDropdown] = useState(false);
  const [themeDropdown,  setThemeDropdown]  = useState(false);

  const filtered = useMemo(() => {
    return projects.filter((p: Project) => {
      const matchSearch = !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.customer?.name?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || p.status === statusFilter;

      // Theme/process filtering
      let matchTheme = true;
      if (themeFilter) {
        const theme = hierarchy.find(t => t.slug === themeFilter);
        matchTheme = !!theme && p.theme_id === theme.id;
        if (matchTheme && processFilter) {
          const process = theme?.processes?.find(pr => pr.slug === processFilter);
          matchTheme = !!process && p.process_id === process.id;
        }
      }

      return matchSearch && matchStatus && matchTheme;
    });
  }, [projects, search, statusFilter, themeFilter, processFilter, hierarchy]);

  const allFilteredSelected = filtered.length > 0 && filtered.every((p: Project) => selected.has(p.id));
  const activeSelected = filtered.filter((p: Project) => selected.has(p.id));
  const someSelected = activeSelected.length > 0;

  function toggleOne(id: string) {
    setSelected((prev: Set<string>) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleAll() {
    setSelected(allFilteredSelected ? new Set() : new Set(filtered.map((p: Project) => p.id)));
  }
  function clearSelection() { setSelected(new Set()); setBulkError(null); }

  async function bulkAction(action: "delete" | "status", status?: ProjectStatus) {
    const ids = activeSelected.map((p: Project) => p.id);
    if (action === "delete" && !confirm(`${ids.length} project${ids.length !== 1 ? "en" : ""} verwijderen?`)) return;
    setBulkLoading(true); setBulkError(null); setStatusDropdown(false);
    try {
      const res = await fetch("/api/projects/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, action, status }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Actie mislukt");
      if (action === "delete") setProjects((prev: Project[]) => prev.filter((p: Project) => !ids.includes(p.id)));
      else if (status) setProjects((prev: Project[]) => prev.map((p: Project) => ids.includes(p.id) ? { ...p, status } : p));
      clearSelection();
    } catch (e) {
      setBulkError(e instanceof Error ? e.message : "Er ging iets mis");
    } finally { setBulkLoading(false); }
  }

  function getThemeInfo(p: Project) {
    const theme = hierarchy.find(t => t.id === p.theme_id);
    return { theme, process: theme?.processes.find(pr => pr.id === p.process_id) };
  }

  async function handleDelete(id: string) {
    if (!confirm("Project verwijderen? Dit kan niet ongedaan worden gemaakt.")) return;
    const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
    if (res.ok) {
      setProjects((prev: Project[]) => prev.filter((p: Project) => p.id !== id));
      setSelected((prev: Set<string>) => { const n = new Set(prev); n.delete(id); return n; });
    }
  }

  function handleCreated(project: Project) { setProjects((prev: Project[]) => [project, ...prev]); setShowWizard(false); }
  function handleUpdated(project: Project) { setProjects((prev: Project[]) => prev.map((p: Project) => p.id === project.id ? { ...p, ...project } : p)); setEditProject(null); }

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Projecten</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            {filtered.length} project{filtered.length !== 1 ? "en" : ""}{themeFilter && ` · ${hierarchy.find(t => t.slug === themeFilter)?.name ?? themeFilter}`}
          </p>
        </div>
        <button onClick={() => setShowWizard(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors shadow-sm shadow-brand-200">
          <Plus size={15} /> Nieuw project
        </button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)} placeholder="Zoeken…"
            className="pl-8 pr-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 w-52" />
        </div>
        <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
          {["all","active","in-progress","archived"].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} className={clsx(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
              statusFilter === s ? "bg-white text-brand-700 shadow-sm font-semibold" : "text-slate-500 hover:text-slate-700"
            )}>
              {s === "all" ? "Alle" : s === "active" ? "Actief" : s === "in-progress" ? "In uitvoering" : "Gearchiveerd"}
            </button>
          ))}
        </div>

        {/* Thema filter */}
        <div className="relative">
          <button
            onClick={() => setThemeDropdown((v: boolean) => !v)}
            className={clsx(
              "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all",
              themeFilter
                ? "bg-brand-50 text-brand-700 border-brand-200"
                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
            )}>
            <Layers size={12} />
            {themeFilter ? hierarchy.find(t => t.slug === themeFilter)?.name ?? themeFilter : "Thema"}
            <ChevronDown size={11} className={clsx("transition-transform", themeDropdown && "rotate-180")} />
          </button>
          {themeDropdown && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setThemeDropdown(false)} />
              <div className="absolute left-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-20 overflow-hidden min-w-[180px]">
                <button onClick={() => { setThemeFilter(""); setProcessFilter(""); setThemeDropdown(false); }}
                  className={clsx("w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left transition-colors",
                    !themeFilter ? "bg-brand-50 text-brand-700 font-semibold" : "text-slate-600 hover:bg-slate-50")}>
                  Alle thema&apos;s
                </button>
                {hierarchy.map(t => (
                  <div key={t.id}>
                    <button
                      onClick={() => { setThemeFilter(t.slug ?? ""); setProcessFilter(""); setThemeDropdown(false); }}
                      className={clsx("w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left transition-colors",
                        themeFilter === t.slug ? "bg-brand-50 text-brand-700 font-semibold" : "text-slate-700 hover:bg-slate-50")}>
                      {t.name}
                    </button>
                    {themeFilter === t.slug && t.processes?.map(pr => (
                      <button key={pr.id}
                        onClick={() => { setProcessFilter(pr.slug ?? ""); setThemeDropdown(false); }}
                        className={clsx("w-full flex items-center gap-2 pl-8 pr-4 py-2 text-xs text-left transition-colors",
                          processFilter === pr.slug ? "bg-brand-50 text-brand-600 font-semibold" : "text-slate-500 hover:bg-slate-50")}>
                        <span className="w-1 h-1 rounded-full bg-slate-300 flex-shrink-0" />
                        {pr.name}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        {themeFilter && (
          <button onClick={() => { setThemeFilter(""); setProcessFilter(""); }}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors">
            <X size={11} /> Filter wissen
          </button>
        )}
      </div>

      {someSelected && (
        <div className="flex items-center gap-3 px-4 py-3 bg-brand-600 rounded-2xl text-white shadow-lg shadow-brand-200 flex-wrap">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-brand-200" />
            <span className="text-sm font-semibold">{activeSelected.length} geselecteerd</span>
          </div>
          <div className="flex items-center gap-2 ml-auto flex-wrap">
            <div className="relative">
              <button onClick={() => setStatusDropdown((v: boolean) => !v)} disabled={bulkLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-sm font-medium transition-colors">
                Status wijzigen <ChevronDown size={13} className={clsx("transition-transform", statusDropdown && "rotate-180")} />
              </button>
              {statusDropdown && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setStatusDropdown(false)} />
                  <div className="absolute right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-20 overflow-hidden min-w-[160px]">
                    {STATUS_OPTIONS.map(opt => (
                      <button key={opt.value} onClick={() => bulkAction("status", opt.value)}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left">
                        <span className={clsx("w-2 h-2 rounded-full",
                          opt.value === "active" ? "bg-brand-500" : opt.value === "in-progress" ? "bg-amber-400" : "bg-slate-400")} />
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <button onClick={() => bulkAction("delete")} disabled={bulkLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/80 hover:bg-red-500 text-sm font-medium transition-colors">
              {bulkLoading ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
              Verwijderen
            </button>
            <button onClick={clearSelection} className="p-1.5 rounded-xl bg-white/20 hover:bg-white/30 transition-colors" title="Selectie wissen">
              <X size={14} />
            </button>
          </div>
          {bulkError && <p className="w-full text-xs text-red-200 mt-1">{bulkError}</p>}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="card p-16 text-center">
          <FolderKanban size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 text-sm font-medium">Geen projecten gevonden</p>
          <button onClick={() => setShowWizard(true)} className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm hover:bg-slate-50 mx-auto">
            <Plus size={14} /> Nieuw project aanmaken
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 px-1">
            <button onClick={toggleAll} className="flex items-center gap-2 text-xs text-slate-500 hover:text-brand-600 transition-colors">
              {allFilteredSelected ? <CheckSquare size={15} className="text-brand-600" /> : <Square size={15} />}
              {allFilteredSelected ? "Alles deselecteren" : "Alles selecteren"}
            </button>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((p: Project) => {
              const { theme, process } = getThemeInfo(p);
              const themeClass = theme ? (THEME_COLORS[theme.slug] ?? THEME_COLORS.algemeen) : null;
              const isSelected = selected.has(p.id);
              return (
                <div key={p.id}
                  className={clsx("card-hover p-5 flex flex-col gap-3 group cursor-pointer relative transition-all",
                    isSelected && "ring-2 ring-brand-500 bg-brand-50/30")}
                  onClick={() => router.push(`/projects/${p.id}`)}>

                  <div className="absolute top-3 left-3 z-10" onClick={(e: React.MouseEvent) => { e.stopPropagation(); toggleOne(p.id); }}>
                    <div className={clsx("w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all",
                      isSelected ? "bg-brand-600 border-brand-600" : "border-slate-300 bg-white opacity-0 group-hover:opacity-100")}>
                      {isSelected && <svg viewBox="0 0 10 8" className="w-3 h-3"><path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                  </div>

                  <div className="flex items-start justify-between gap-2 pl-4">
                    <StatusBadge status={p.status} />
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e: React.MouseEvent) => { e.stopPropagation(); setEditProject(p); }} className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors" title="Bewerken"><Pencil size={13} /></button>
                      <button onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleDelete(p.id); }} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 size={13} /></button>
                    </div>
                  </div>

                  {theme && (
                    <div className="flex items-center gap-1.5">
                      <span className={clsx("text-xs font-medium px-2.5 py-1 rounded-lg", themeClass)}>{theme.name}</span>
                      {process && <span className="text-xs text-slate-400 truncate">{process.name}</span>}
                    </div>
                  )}

                  <div>
                    <h3 className="font-semibold text-slate-800 group-hover:text-brand-700 transition-colors leading-snug">{p.name}</h3>
                    {p.description && <p className="text-sm text-slate-400 mt-1 line-clamp-2">{p.description}</p>}
                  </div>

                  <div className="flex items-center gap-3 mt-auto pt-2 border-t border-slate-50 flex-wrap">
                    {p.customer && <span className="flex items-center gap-1 text-xs text-slate-400"><Building2 size={11} /> {p.customer.name}</span>}
                    {(p as any).team && <span className="flex items-center gap-1 text-xs text-slate-400"><Users size={11} /> {(p as any).team.name}</span>}
                    {(p as any).start_date && <span className="flex items-center gap-1 text-xs text-slate-400 ml-auto"><Calendar size={11} />{(p as any).start_date}{(p as any).end_date ? ` → ${(p as any).end_date}` : ""}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {showWizard && <ProjectWizard onClose={() => setShowWizard(false)} onCreated={handleCreated} hierarchy={hierarchy} />}
      {editProject && <ProjectWizard onClose={() => setEditProject(null)} onCreated={handleUpdated} hierarchy={hierarchy} editProject={editProject} />}
    </div>
  );
}
