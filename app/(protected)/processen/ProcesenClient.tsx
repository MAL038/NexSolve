"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Workflow, ChevronDown, ChevronRight, Search,
  GitBranch, Layers, Tag, FolderOpen,
} from "lucide-react";
import clsx from "clsx";

// ─── Types ────────────────────────────────────────────────────
type ProcessType = {
  id: string; name: string; slug: string; position: number; process_id: string; created_at: string;
};
type Process = {
  id: string; name: string; slug: string; position: number; theme_id: string; created_at: string;
  process_types?: ProcessType[] | null;
};
type Theme = {
  id: string; name: string; slug: string; position: number; created_at: string;
  processes?: Process[] | null;
};

interface Props { themes: Theme[]; }

// ─── Component ────────────────────────────────────────────────
export default function ProcesenClient({ themes }: Props) {
  const [search,        setSearch]        = useState("");
  const [expandedThemes, setExpandedThemes] = useState<Set<string>>(() => new Set(themes.slice(0, 3).map(t => t.id)));
  const [expandedProcs,  setExpandedProcs]  = useState<Set<string>>(new Set());

  function toggleTheme(id: string) {
    setExpandedThemes(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleProc(id: string) {
    setExpandedProcs(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  // Search filter: expand matching themes/processes automatically
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return themes;
    return themes
      .map(t => {
        const procs = (t.processes ?? []).filter(p =>
          p.name.toLowerCase().includes(q) ||
          (p.process_types ?? []).some(pt => pt.name.toLowerCase().includes(q))
        );
        return { ...t, processes: procs };
      })
      .filter(t => t.name.toLowerCase().includes(q) || t.processes.length > 0);
  }, [themes, search]);

  // Auto-expand all when searching
  const searchActive = search.trim().length > 0;

  const totalProcesses  = themes.reduce((s, t) => s + (t.processes?.length ?? 0), 0);
  const totalTypes      = themes.reduce((s, t) =>
    s + (t.processes ?? []).reduce((ps, p) => ps + (p.process_types?.length ?? 0), 0), 0);

  return (
    <div className="space-y-6">

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Processen</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {themes.length} thema's · {totalProcesses} processen · {totalTypes} procestypen
          </p>
        </div>
      </div>

      {/* ── Search ──────────────────────────────────────────── */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Zoek thema, proces of procestype…"
          className="input pl-9 text-sm w-full"
        />
      </div>

      {/* ── Tree ────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="card p-16 text-center">
          <Workflow size={40} className="mx-auto mb-3 text-slate-200" />
          <p className="text-sm font-medium text-slate-500">
            {search ? `Geen resultaten voor "${search}"` : "Nog geen processen aangemaakt."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(theme => {
            const expanded = searchActive || expandedThemes.has(theme.id);
            const procs    = theme.processes ?? [];
            return (
              <div key={theme.id} className="card overflow-hidden">

                {/* ── Thema header ────────────────────────── */}
                <button
                  onClick={() => toggleTheme(theme.id)}
                  className="w-full flex items-center gap-3 px-5 py-4 hover:bg-slate-50/60 transition-colors group"
                >
                  <div className="w-8 h-8 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center flex-shrink-0">
                    <Layers size={14} className="text-brand-600" />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-semibold text-slate-800 group-hover:text-brand-700 transition-colors truncate">
                      {theme.name}
                    </p>
                    <p className="text-xs text-slate-400">
                      {procs.length} {procs.length === 1 ? "proces" : "processen"}
                    </p>
                  </div>
                  <ChevronDown
                    size={16}
                    className={clsx(
                      "text-slate-400 transition-transform duration-200 flex-shrink-0",
                      expanded && "rotate-180"
                    )}
                  />
                </button>

                {/* ── Processen ───────────────────────────── */}
                {expanded && procs.length > 0 && (
                  <div className="border-t border-slate-100">
                    {procs.map((proc, pi) => {
                      const procExpanded = searchActive || expandedProcs.has(proc.id);
                      const types        = proc.process_types ?? [];
                      return (
                        <div key={proc.id} className={clsx(pi > 0 && "border-t border-slate-50")}>

                          {/* Proces row */}
                          <button
                            onClick={() => toggleProc(proc.id)}
                            className="w-full flex items-center gap-3 pl-12 pr-5 py-3 hover:bg-slate-50/60 transition-colors group"
                          >
                            <GitBranch size={13} className="text-slate-400 flex-shrink-0" />
                            <span className="flex-1 text-left text-sm text-slate-700 font-medium group-hover:text-brand-600 transition-colors truncate">
                              {proc.name}
                            </span>
                            {types.length > 0 && (
                              <span className="text-xs text-slate-400 flex-shrink-0 mr-2">
                                {types.length} {types.length === 1 ? "type" : "typen"}
                              </span>
                            )}
                            {types.length > 0 && (
                              <ChevronRight
                                size={13}
                                className={clsx(
                                  "text-slate-300 flex-shrink-0 transition-transform duration-150",
                                  procExpanded && "rotate-90"
                                )}
                              />
                            )}
                          </button>

                          {/* ProcesTypen */}
                          {procExpanded && types.length > 0 && (
                            <div className="bg-slate-50/50 border-t border-slate-100 divide-y divide-slate-100">
                              {types.map(pt => (
                                <div key={pt.id} className="flex items-center gap-3 pl-20 pr-5 py-2.5">
                                  <Tag size={11} className="text-slate-300 flex-shrink-0" />
                                  <span className="text-xs text-slate-600 font-medium">{pt.name}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          {procExpanded && types.length === 0 && (
                            <div className="pl-20 pr-5 py-2 border-t border-slate-100 bg-slate-50/30">
                              <span className="text-xs text-slate-400">Geen procestypen</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {expanded && procs.length === 0 && (
                  <div className="border-t border-slate-100 px-5 py-4">
                    <p className="text-xs text-slate-400 flex items-center gap-2">
                      <FolderOpen size={13} /> Nog geen processen in dit thema.
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
