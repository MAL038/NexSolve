"use client";

/**
 * ProjectsClient.tsx — v3
 * Gebruikt ProjectWizard voor aanmaken.
 * Bewerken blijft via inline modal.
 */

import { useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Plus, Pencil, Trash2, FolderKanban, Search,
  Building2, Calendar, Users,
} from "lucide-react";
import clsx from "clsx";
import StatusBadge from "@/components/ui/StatusBadge";
import ProjectWizard from "@/components/projects/ProjectWizard";
import type { Project, ThemeWithChildren } from "@/types";

interface Props {
  initialProjects: Project[];
  hierarchy:       ThemeWithChildren[];
  currentUserId:   string;
}

const THEME_COLORS: Record<string, string> = {
  algemeen: "bg-slate-100 text-slate-600",
  crm:      "bg-blue-50 text-blue-700",
  hrm:      "bg-brand-50 text-brand-700",
  ordermanagement: "bg-amber-50 text-amber-700",
  payroll:  "bg-violet-50 text-violet-700",
  erp:      "bg-rose-50 text-rose-700",
};

export default function ProjectsClient({ initialProjects, hierarchy, currentUserId }: Props) {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const themeSlug    = searchParams.get("theme")   ?? "";
  const processSlug  = searchParams.get("process") ?? "";

  const [projects,     setProjects]     = useState<Project[]>(initialProjects);
  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showWizard,   setShowWizard]   = useState(
    searchParams.get("new") === "1" // open direct als ?new=1 in URL
  );

  // Gefilterde projecten
  const filtered = useMemo(() => {
    return projects.filter(p => {
      const matchSearch = !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.customer?.name?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || p.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [projects, search, statusFilter]);

  // Thema info ophalen
  function getThemeInfo(p: Project) {
    const theme   = hierarchy.find(t => t.id === p.theme_id);
    const process = theme?.processes.find(pr => pr.id === p.process_id);
    return { theme, process };
  }

  async function handleDelete(id: string) {
    if (!confirm("Project verwijderen? Dit kan niet ongedaan worden gemaakt.")) return;
    const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
    if (res.ok) setProjects(prev => prev.filter(p => p.id !== id));
  }

  function handleCreated(project: Project) {
    setProjects(prev => [project, ...prev]);
    setShowWizard(false);
  }

  const canCreate = true; // Iedereen mag projecten aanmaken; wizard valideert owner

  return (
    <div className="max-w-7xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Projecten</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            {filtered.length} project{filtered.length !== 1 ? "en" : ""}
            {themeSlug && ` · ${themeSlug}`}
          </p>
        </div>
        <button
          onClick={() => setShowWizard(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors shadow-sm shadow-brand-200"
        >
          <Plus size={15} /> Nieuw project
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Zoeken…"
            className="pl-8 pr-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 w-52"
          />
        </div>

        <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
          {["all", "active", "in-progress", "archived"].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={clsx(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                statusFilter === s
                  ? "bg-white text-brand-700 shadow-sm font-semibold"
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              {s === "all" ? "Alle" : s === "active" ? "Actief" : s === "in-progress" ? "In uitvoering" : "Gearchiveerd"}
            </button>
          ))}
        </div>
      </div>

      {/* Projectenraster */}
      {filtered.length === 0 ? (
        <div className="card p-16 text-center">
          <FolderKanban size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 text-sm font-medium">Geen projecten gevonden</p>
          <button
            onClick={() => setShowWizard(true)}
            className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm hover:bg-slate-50 mx-auto"
          >
            <Plus size={14} /> Nieuw project aanmaken
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(p => {
            const { theme, process } = getThemeInfo(p);
            const themeClass = theme ? (THEME_COLORS[theme.slug] ?? THEME_COLORS.algemeen) : null;

            return (
              <div
                key={p.id}
                className="card-hover p-5 flex flex-col gap-3 group cursor-pointer"
                onClick={() => router.push(`/projects/${p.id}`)}
              >
                {/* Status + acties */}
                <div className="flex items-start justify-between gap-2">
                  <StatusBadge status={p.status} />
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={e => { e.stopPropagation(); router.push(`/projects/${p.id}`); }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); handleDelete(p.id); }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Thema badge */}
                {theme && (
                  <div className="flex items-center gap-1.5">
                    <span className={clsx("text-xs font-medium px-2.5 py-1 rounded-lg", themeClass)}>
                      {theme.name}
                    </span>
                    {process && (
                      <span className="text-xs text-slate-400 truncate">{process.name}</span>
                    )}
                  </div>
                )}

                {/* Naam */}
                <div>
                  <h3 className="font-semibold text-slate-800 group-hover:text-brand-700 transition-colors leading-snug">
                    {p.name}
                  </h3>
                  {p.description && (
                    <p className="text-sm text-slate-400 mt-1 line-clamp-2">{p.description}</p>
                  )}
                </div>

                {/* Footer meta */}
                <div className="flex items-center gap-3 mt-auto pt-2 border-t border-slate-50 flex-wrap">
                  {p.customer && (
                    <span className="flex items-center gap-1 text-xs text-slate-400">
                      <Building2 size={11} /> {p.customer.name}
                    </span>
                  )}
                  {(p as any).team && (
                    <span className="flex items-center gap-1 text-xs text-slate-400">
                      <Users size={11} /> {(p as any).team.name}
                    </span>
                  )}
                  {(p as any).start_date && (
                    <span className="flex items-center gap-1 text-xs text-slate-400 ml-auto">
                      <Calendar size={11} />
                      {(p as any).start_date}
                      {(p as any).end_date ? ` → ${(p as any).end_date}` : ""}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Wizard */}
      {showWizard && (
        <ProjectWizard
          onClose={() => setShowWizard(false)}
          onCreated={handleCreated}
          hierarchy={hierarchy}
        />
      )}
    </div>
  );
}
