"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { CheckSquare, Search, FolderKanban, X } from "lucide-react";
import clsx from "clsx";
import type { SubprocessStatus } from "@/types";
import TaskStatusBadge, { TASK_STATUS_CONFIG } from "@/components/tasks/TaskStatusBadge";
import TaskBoard from "@/components/tasks/TaskBoard";
import ViewToggle, { type ViewMode } from "@/components/ui/ViewToggle";
import EmptyState from "@/components/ui/EmptyState";

// ─── Types ────────────────────────────────────────────────────

interface TaskWithProject {
  id:          string;
  title:       string;
  description: string | null;
  status:      SubprocessStatus;
  project_id:  string;
  updated_at:  string;
  project: {
    id:       string;
    name:     string;
    status:   string;
    customer: { id: string; name: string } | null;
  };
}

interface ProjectOption {
  id:     string;
  name:   string;
  status: string;
}

interface Props {
  tasks:    TaskWithProject[];
  projects: ProjectOption[];
}

const STATUS_OPTIONS: { value: SubprocessStatus | "all"; label: string }[] = [
  { value: "all",         label: "Alle statussen" },
  { value: "todo",        label: "Te doen"        },
  { value: "in-progress", label: "In uitvoering"  },
  { value: "blocked",     label: "Geblokkeerd"    },
  { value: "done",        label: "Afgerond"       },
];

// ─── Component ────────────────────────────────────────────────

export default function TakenClient({ tasks, projects }: Props) {
  const [search,        setSearch]        = useState("");
  const [statusFilter,  setStatusFilter]  = useState<SubprocessStatus | "all">("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [view,          setView]          = useState<ViewMode>("list");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasks.filter(t => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (projectFilter !== "all" && t.project_id !== projectFilter) return false;
      if (q && !t.title.toLowerCase().includes(q) && !t.project.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [tasks, search, statusFilter, projectFilter]);

  const stats = useMemo(() => ({
    todo:       tasks.filter(t => t.status === "todo").length,
    inProgress: tasks.filter(t => t.status === "in-progress").length,
    blocked:    tasks.filter(t => t.status === "blocked").length,
    done:       tasks.filter(t => t.status === "done").length,
  }), [tasks]);

  const hasFilters = search || statusFilter !== "all" || projectFilter !== "all";

  const statPills: { label: string; value: number; status: SubprocessStatus }[] = [
    { label: "Te doen",       value: stats.todo,       status: "todo"        },
    { label: "In uitvoering", value: stats.inProgress, status: "in-progress" },
    { label: "Geblokkeerd",   value: stats.blocked,    status: "blocked"     },
    { label: "Afgerond",      value: stats.done,       status: "done"        },
  ];

  return (
    <div className="space-y-6">

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Taken</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {stats.inProgress} actief
            {stats.blocked > 0 ? ` · ${stats.blocked} geblokkeerd` : ""}
            {` · ${stats.done} afgerond`}
          </p>
        </div>
        <Link
          href="/projects"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200
                     text-sm text-slate-600 hover:border-slate-300 hover:bg-slate-50 transition-colors font-medium flex-shrink-0"
        >
          <FolderKanban size={14} /> Projecten
        </Link>
      </div>

      {/* ── Status stat pills ───────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        {statPills.map(pill => {
          const cfg    = TASK_STATUS_CONFIG[pill.status];
          const active = statusFilter === pill.status;
          return (
            <button
              key={pill.status}
              onClick={() => setStatusFilter(active ? "all" : pill.status)}
              className={clsx(
                "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all",
                active
                  ? `${cfg.bg} ${cfg.text} ${cfg.border} shadow-sm`
                  : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
              )}
            >
              <span className={clsx("w-1.5 h-1.5 rounded-full", cfg.dot)} />
              <span className="font-bold">{pill.value}</span>
              {pill.label}
            </button>
          );
        })}
      </div>

      {/* ── Toolbar ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Zoek taken…"
            className="input pl-9 text-sm w-full"
          />
        </div>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as SubprocessStatus | "all")}
          className="input text-sm w-auto"
        >
          {STATUS_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <select
          value={projectFilter}
          onChange={e => setProjectFilter(e.target.value)}
          className="input text-sm w-auto max-w-[200px]"
        >
          <option value="all">Alle projecten</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        {hasFilters && (
          <button
            onClick={() => { setSearch(""); setStatusFilter("all"); setProjectFilter("all"); }}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors"
          >
            <X size={13} /> Wis filters
          </button>
        )}

        <div className="ml-auto">
          <ViewToggle view={view} onChange={setView} />
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title={hasFilters ? "Geen taken gevonden" : "Nog geen taken"}
          description={
            hasFilters
              ? "Pas je filters aan om resultaten te zien."
              : "Taken worden aangemaakt vanuit projecten."
          }
          action={
            !hasFilters ? (
              <Link href="/projects" className="btn-primary text-sm">
                Naar projecten
              </Link>
            ) : undefined
          }
        />
      ) : view === "board" ? (
        <TaskBoard tasks={filtered} />
      ) : (
        <div className="card overflow-hidden">
          <div className="divide-y divide-slate-50">
            {filtered.map(task => (
              <Link
                key={task.id}
                href={`/projects/${task.project_id}`}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50/60 transition-colors group"
              >
                <TaskStatusBadge status={task.status} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 group-hover:text-brand-700 transition-colors truncate">
                    {task.title}
                  </p>
                  {task.description && (
                    <p className="text-xs text-slate-400 truncate mt-0.5">{task.description}</p>
                  )}
                </div>
                <span className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 flex-shrink-0">
                  <FolderKanban size={11} className="flex-shrink-0" />
                  <span className="truncate max-w-[160px]">
                    {task.project.customer?.name
                      ? `${task.project.customer.name} · ${task.project.name}`
                      : task.project.name}
                  </span>
                </span>
              </Link>
            ))}
          </div>
          <div className="px-5 py-3 bg-slate-50/50 border-t border-slate-100">
            <p className="text-xs text-slate-400">
              {filtered.length} taak{filtered.length !== 1 ? "en" : ""} weergegeven
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
