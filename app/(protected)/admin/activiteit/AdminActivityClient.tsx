"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Activity, Search, RefreshCw, ChevronDown, Filter, X,
} from "lucide-react";
import clsx from "clsx";
import { relativeTime } from "@/lib/time";
import { ACTION_LABELS, ACTION_COLORS, type ActivityAction } from "@/lib/activityLogger";
import type { ActivityLogEntry } from "@/types";
import Avatar from "@/components/ui/Avatar";

const ACTION_OPTIONS = [
  { value: "",                      label: "Alle acties" },
  { value: "project.created",       label: "Project aangemaakt" },
  { value: "project.status_changed",label: "Status gewijzigd" },
  { value: "project.deleted",       label: "Project verwijderd" },
  { value: "member.added",          label: "Lid toegevoegd" },
  { value: "dossier.created",       label: "Dossier aangemaakt" },
  { value: "subprocess.status_changed", label: "Taak bijgewerkt" },
];

export default function AdminActivityClient() {
  const [entries,     setEntries]     = useState<ActivityLogEntry[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor,  setNextCursor]  = useState<string | null>(null);
  const [search,      setSearch]      = useState("");
  const [actionFilter,setActionFilter]= useState("");
  const [error,       setError]       = useState<string | null>(null);

  const fetchEntries = useCallback(async (cursor?: string) => {
    if (!cursor) setLoading(true);
    else setLoadingMore(true);

    try {
      const params = new URLSearchParams({ limit: "40" });
      if (actionFilter) params.set("action", actionFilter);
      if (cursor)       params.set("cursor", cursor);

      const res = await fetch(`/api/admin/activity?${params}`);
      if (!res.ok) throw new Error((await res.json()).error ?? "Fout bij ophalen");
      const data = await res.json();

      if (cursor) setEntries(prev => [...prev, ...(data.data ?? [])]);
      else        setEntries(data.data ?? []);
      setNextCursor(data.nextCursor ?? null);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Onbekende fout");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [actionFilter]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const filtered = entries.filter(e => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (e.entity_name ?? "").toLowerCase().includes(q) ||
      ((e as any).actor?.full_name ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Activity size={14} className="text-brand-500" />
            <span className="text-xs font-bold uppercase tracking-widest text-brand-500">Superuser</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Activiteitenlog</h1>
          <p className="text-sm text-slate-400 mt-0.5">Alle platformactiviteit van alle gebruikers</p>
        </div>
        <button onClick={() => fetchEntries()}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-slate-500 hover:border-brand-300 hover:text-brand-600 text-sm transition-colors">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Vernieuwen
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Zoek op naam of gebruiker…"
            className="pl-8 pr-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 w-56" />
        </div>

        <div className="relative flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-sm">
          <Filter size={13} className="text-slate-400" />
          <select value={actionFilter} onChange={e => { setActionFilter(e.target.value); }}
            className="appearance-none bg-transparent text-slate-600 pr-5 focus:outline-none text-sm cursor-pointer">
            {ACTION_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <ChevronDown size={12} className="absolute right-3 text-slate-400 pointer-events-none" />
        </div>

        {(search || actionFilter) && (
          <button onClick={() => { setSearch(""); setActionFilter(""); }}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 transition-colors">
            <X size={12} /> Filters wissen
          </button>
        )}

        <span className="text-xs text-slate-400 ml-auto">{filtered.length} activiteiten</span>
      </div>

      {/* Log */}
      {error ? (
        <div className="card p-6 border-red-200 bg-red-50 text-red-700 text-sm">{error}</div>
      ) : loading ? (
        <div className="card divide-y divide-slate-50">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-start gap-4 px-5 py-4 animate-pulse">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-slate-100 rounded w-48" />
                <div className="h-2.5 bg-slate-50 rounded w-32" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-16 text-center text-slate-400">
          <Activity size="sm" className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Geen activiteit gevonden</p>
        </div>
      ) : (
        <div className="card overflow-hidden divide-y divide-slate-50">
          {filtered.map(entry => {
            const actor     = (entry as any).actor;
            const action    = entry.action as ActivityAction;
            const label     = ACTION_LABELS[action] ?? action;
            const colorClass= ACTION_COLORS[action] ?? "text-slate-500 bg-slate-50";

            return (
              <div key={entry.id} className="flex items-start gap-4 px-5 py-4 hover:bg-slate-50/50 transition-colors">
                <Avatar
                  name={actor?.full_name ?? "?"}
                  url={actor?.avatar_url}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-slate-800">
                      {actor?.full_name ?? "Onbekend"}
                    </span>
                    <span className={clsx(
                      "inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md",
                      colorClass
                    )}>
                      {label}
                    </span>
                    {entry.entity_name && (
                      <span className="text-sm text-slate-600 truncate">
                        {entry.entity_name}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-slate-400">{relativeTime(entry.created_at)}</span>
                    {entry.project_id && (
                      <a href={`/projects/${entry.project_id}`}
                        className="text-xs text-brand-500 hover:underline">
                        Project bekijken →
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {nextCursor && (
            <div className="px-5 py-4 text-center">
              <button onClick={() => fetchEntries(nextCursor)} disabled={loadingMore}
                className="inline-flex items-center gap-2 text-sm text-brand-600 hover:text-brand-700 font-medium disabled:opacity-60">
                {loadingMore
                  ? <><RefreshCw size={13} className="animate-spin" /> Laden…</>
                  : <><ChevronDown size={13} /> Meer laden</>}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
