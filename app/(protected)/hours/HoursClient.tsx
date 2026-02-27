"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  ChevronLeft, ChevronRight, Plus, Trash2,
  Clock, TrendingUp, Calendar, Loader2, AlertTriangle,
} from "lucide-react";
import clsx from "clsx";

// ─── Types ────────────────────────────────────────────────────

interface Project {
  id: string;
  name: string;
  customerName?: string;
}

interface HoursEntry {
  id: string;
  project_id: string;
  user_id: string;
  date: string;
  hours: number;
  notes: string | null;
  project?: { id: string; name: string };
}

interface Props {
  userId:   string;
  userName: string;
  projects: Project[];
}

// ─── Helpers ──────────────────────────────────────────────────

function toISODate(d: Date) {
  return d.toISOString().split("T")[0];
}

function startOfWeek(d: Date): Date {
  const day = new Date(d);
  const diff = (day.getDay() + 6) % 7; // maandag = 0
  day.setDate(day.getDate() - diff);
  day.setHours(0, 0, 0, 0);
  return day;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function formatWeekLabel(monday: Date): string {
  const sunday = addDays(monday, 6);
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  return `${monday.toLocaleDateString("nl-NL", opts)} – ${sunday.toLocaleDateString("nl-NL", opts)}`;
}

const DAY_LABELS = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];
const DAY_NAMES  = ["Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag", "Zondag"];

// Consistent kleur per project
const PROJECT_COLORS = [
  "bg-brand-100 text-brand-700 border-brand-200",
  "bg-violet-100 text-violet-700 border-violet-200",
  "bg-amber-100 text-amber-700 border-amber-200",
  "bg-blue-100 text-blue-700 border-blue-200",
  "bg-emerald-100 text-emerald-700 border-emerald-200",
  "bg-rose-100 text-rose-700 border-rose-200",
  "bg-indigo-100 text-indigo-700 border-indigo-200",
];
function projectColor(idx: number) { return PROJECT_COLORS[idx % PROJECT_COLORS.length]; }

// ─── Quick-add modal ──────────────────────────────────────────

interface QuickAddProps {
  date: string;
  projects: Project[];
  onSave: (entry: { project_id: string; date: string; hours: number; notes?: string }) => Promise<void>;
  onClose: () => void;
}

function QuickAddModal({ date, projects, onSave, onClose }: QuickAddProps) {
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [hours, setHours]         = useState(1);
  const [notes, setNotes]         = useState("");
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const HOUR_OPTIONS = [0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 7, 7.5, 8];

  async function handleSave() {
    if (!projectId) { setError("Selecteer een project"); return; }
    setSaving(true);
    setError(null);
    try {
      await onSave({ project_id: projectId, date, hours, notes: notes || undefined });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Opslaan mislukt");
    } finally {
      setSaving(false);
    }
  }

  const dateLabel = new Date(date + "T12:00:00").toLocaleDateString("nl-NL", {
    weekday: "long", day: "numeric", month: "long",
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 rounded-xl bg-brand-50 flex items-center justify-center">
            <Clock size={15} className="text-brand-500" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-800 text-sm">Uren registreren</h2>
            <p className="text-xs text-slate-400 capitalize">{dateLabel}</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
            {error}
          </div>
        )}

        {/* Project */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-slate-600 mb-1.5">Project</label>
          <select
            value={projectId}
            onChange={e => setProjectId(e.target.value)}
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {projects.map(p => (
              <option key={p.id} value={p.id}>
                {p.name}{p.customerName ? ` · ${p.customerName}` : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Uren — quick select buttons */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-slate-600 mb-1.5">Uren</label>
          <div className="grid grid-cols-6 gap-1.5 mb-2">
            {HOUR_OPTIONS.map(h => (
              <button
                key={h}
                type="button"
                onClick={() => setHours(h)}
                className={clsx(
                  "py-1.5 rounded-lg text-xs font-medium transition-colors border",
                  hours === h
                    ? "bg-brand-600 text-white border-brand-600"
                    : "bg-white text-slate-600 border-slate-200 hover:border-brand-300"
                )}
              >
                {h}
              </button>
            ))}
          </div>
          <input
            type="number"
            value={hours}
            min={0.5}
            max={24}
            step={0.5}
            onChange={e => setHours(parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {/* Notitie */}
        <div className="mb-5">
          <label className="block text-xs font-medium text-slate-600 mb-1.5">Notitie <span className="text-slate-400">(optioneel)</span></label>
          <input
            type="text"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Wat heb je gedaan?"
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            maxLength={300}
          />
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
            Annuleren
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !projectId || hours <= 0}
            className="flex-1 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : null}
            Opslaan
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────

export default function HoursClient({ userId, userName, projects }: Props) {
  const [weekStart, setWeekStart]   = useState<Date>(() => startOfWeek(new Date()));
  const [entries, setEntries]       = useState<HoursEntry[]>([]);
  const [isLoading, setIsLoading]   = useState(true);
  const [quickAdd, setQuickAdd]     = useState<string | null>(null); // date string
  const [deleting, setDeleting]     = useState<string | null>(null);

  const weekDays = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const fetchEntries = useCallback(async () => {
    setIsLoading(true);
    const from = toISODate(weekStart);
    const to   = toISODate(addDays(weekStart, 6));
    const res  = await fetch(`/api/planning?scope=mine`);
    const all  = await res.json();
    // Filter client-side to current week
    setEntries((Array.isArray(all) ? all : []).filter(
      (e: HoursEntry) => e.date >= from && e.date <= to
    ));
    setIsLoading(false);
  }, [weekStart]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  // ── Computed stats ──────────────────────────────────────────

  const totalHoursWeek = entries.reduce((s, e) => s + Number(e.hours), 0);

  const hoursByDay = useMemo(() => {
    const map: Record<string, number> = {};
    entries.forEach(e => { map[e.date] = (map[e.date] ?? 0) + Number(e.hours); });
    return map;
  }, [entries]);

  const hoursByProject = useMemo(() => {
    const map: Record<string, { name: string; hours: number }> = {};
    entries.forEach(e => {
      const name = e.project?.name ?? projects.find(p => p.id === e.project_id)?.name ?? "Onbekend";
      if (!map[e.project_id]) map[e.project_id] = { name, hours: 0 };
      map[e.project_id].hours += Number(e.hours);
    });
    return Object.entries(map).sort((a, b) => b[1].hours - a[1].hours);
  }, [entries, projects]);

  // Project color index (stable per project)
  const projectColorMap = useMemo(() => {
    const map: Record<string, number> = {};
    [...new Set(entries.map(e => e.project_id))].forEach((id, i) => { map[id] = i; });
    return map;
  }, [entries]);

  // ── Actions ─────────────────────────────────────────────────

  async function handleAdd(data: { project_id: string; date: string; hours: number; notes?: string }) {
    const res = await fetch("/api/planning", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, user_id: userId }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error ?? "Opslaan mislukt");
    }
    const saved = await res.json();
    setEntries(prev => [...prev, saved]);
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    await fetch(`/api/planning/${id}`, { method: "DELETE" });
    setEntries(prev => prev.filter(e => e.id !== id));
    setDeleting(null);
  }

  const today = toISODate(new Date());

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Urenregistratie</h1>
          <p className="text-sm text-slate-500 mt-0.5">{userName}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekStart(startOfWeek(new Date()))}
            className="px-3.5 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors font-medium"
          >
            Deze week
          </button>
        </div>
      </div>

      {/* ── Week navigator ──────────────────────────────────── */}
      <div className="card p-4 flex items-center justify-between">
        <button
          onClick={() => setWeekStart(w => addDays(w, -7))}
          className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors"
        >
          <ChevronLeft size={18} />
        </button>

        <div className="text-center">
          <p className="font-semibold text-slate-800 text-sm">{formatWeekLabel(weekStart)}</p>
          <p className="text-xs text-slate-400 mt-0.5">
            {totalHoursWeek > 0
              ? `${totalHoursWeek} uur geregistreerd`
              : "Nog geen uren geregistreerd"}
          </p>
        </div>

        <button
          onClick={() => setWeekStart(w => addDays(w, 7))}
          className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* ── Week grid ───────────────────────────────────────── */}
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((day, i) => {
          const dateStr    = toISODate(day);
          const isToday    = dateStr === today;
          const isWeekend  = i >= 5;
          const dayEntries = entries.filter(e => e.date === dateStr);
          const dayHours   = hoursByDay[dateStr] ?? 0;
          const isOver     = dayHours > 8;

          return (
            <div
              key={dateStr}
              className={clsx(
                "rounded-2xl border p-2.5 min-h-[140px] flex flex-col gap-1.5 transition-colors",
                isToday   ? "border-brand-300 bg-brand-50/40" :
                isWeekend ? "border-slate-100 bg-slate-50/50" :
                "border-slate-200 bg-white"
              )}
            >
              {/* Day header */}
              <div className="flex items-center justify-between mb-1">
                <div>
                  <p className={clsx(
                    "text-[10px] font-semibold uppercase tracking-wide",
                    isToday ? "text-brand-600" : "text-slate-400"
                  )}>
                    {DAY_LABELS[i]}
                  </p>
                  <p className={clsx(
                    "text-sm font-bold leading-none",
                    isToday ? "text-brand-700" : "text-slate-700"
                  )}>
                    {day.getDate()}
                  </p>
                </div>
                {dayHours > 0 && (
                  <span className={clsx(
                    "text-[10px] font-bold px-1.5 py-0.5 rounded-lg",
                    isOver ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-500"
                  )}>
                    {dayHours}u
                  </span>
                )}
              </div>

              {/* Entries */}
              <div className="flex-1 space-y-1 overflow-hidden">
                {isLoading ? (
                  <div className="h-4 bg-slate-100 rounded animate-pulse" />
                ) : dayEntries.map(e => (
                  <div
                    key={e.id}
                    className={clsx(
                      "group flex items-start gap-1 px-1.5 py-1 rounded-lg border text-[10px] leading-tight",
                      projectColor(projectColorMap[e.project_id] ?? 0)
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">
                        {e.project?.name ?? projects.find(p => p.id === e.project_id)?.name ?? "—"}
                      </p>
                      <p className="font-bold">{e.hours}u</p>
                      {e.notes && <p className="opacity-70 truncate">{e.notes}</p>}
                    </div>
                    <button
                      onClick={() => handleDelete(e.id)}
                      disabled={deleting === e.id}
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-black/10 transition-all shrink-0 mt-0.5"
                    >
                      {deleting === e.id
                        ? <Loader2 size={9} className="animate-spin" />
                        : <Trash2 size={9} />}
                    </button>
                  </div>
                ))}
              </div>

              {/* Overflow warning */}
              {isOver && (
                <div className="flex items-center gap-1 text-[9px] text-red-500">
                  <AlertTriangle size={9} /> Meer dan 8u
                </div>
              )}

              {/* Add button */}
              {!isWeekend && (
                <button
                  onClick={() => setQuickAdd(dateStr)}
                  className={clsx(
                    "w-full flex items-center justify-center gap-1 py-1 rounded-lg text-[10px] font-medium transition-colors border border-dashed mt-auto",
                    isToday
                      ? "border-brand-300 text-brand-500 hover:bg-brand-50"
                      : "border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-500"
                  )}
                >
                  <Plus size={10} /> Toevoegen
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Week samenvatting ───────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Uren per project */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-xl bg-brand-50 flex items-center justify-center">
              <TrendingUp size={14} className="text-brand-500" />
            </div>
            <h2 className="font-semibold text-slate-700 text-sm">Uren per project</h2>
          </div>

          {hoursByProject.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">
              Nog geen uren geregistreerd deze week.
            </p>
          ) : (
            <div className="space-y-3">
              {hoursByProject.map(([id, { name, hours }], i) => (
                <div key={id}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-slate-700 truncate">{name}</p>
                    <span className="text-sm font-bold text-slate-600 ml-3 shrink-0">{hours}u</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={clsx(
                        "h-full rounded-full",
                        i === 0 ? "bg-brand-500" :
                        i === 1 ? "bg-violet-500" :
                        i === 2 ? "bg-amber-400" : "bg-slate-400"
                      )}
                      style={{ width: `${Math.min((hours / Math.max(totalHoursWeek, 1)) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
              <div className="pt-3 border-t border-slate-100 flex justify-between">
                <span className="text-xs text-slate-500">Totaal</span>
                <span className="text-sm font-bold text-slate-700">{totalHoursWeek}u</span>
              </div>
            </div>
          )}
        </div>

        {/* Dagelijkse verdeling */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-xl bg-emerald-50 flex items-center justify-center">
              <Calendar size={14} className="text-emerald-500" />
            </div>
            <h2 className="font-semibold text-slate-700 text-sm">Dagelijkse verdeling</h2>
          </div>

          <div className="flex items-end gap-2 h-24">
            {weekDays.map((day, i) => {
              const dateStr = toISODate(day);
              const hours   = hoursByDay[dateStr] ?? 0;
              const pct     = Math.min((hours / 8) * 100, 100);
              const isToday = dateStr === today;
              const isOver  = hours > 8;

              return (
                <div key={dateStr} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[9px] text-slate-400 font-medium">
                    {hours > 0 ? `${hours}u` : ""}
                  </span>
                  <div className="w-full bg-slate-100 rounded-t-lg overflow-hidden relative" style={{ height: "64px" }}>
                    <div
                      className={clsx(
                        "absolute bottom-0 w-full rounded-t-lg transition-all duration-300",
                        isOver   ? "bg-red-400" :
                        isToday  ? "bg-brand-500" :
                        i >= 5   ? "bg-slate-300" :
                        "bg-brand-400"
                      )}
                      style={{ height: `${pct}%` }}
                    />
                  </div>
                  <span className={clsx(
                    "text-[9px] font-semibold",
                    isToday ? "text-brand-600" : "text-slate-400"
                  )}>
                    {DAY_LABELS[i]}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Weekdoel: 40u</span>
            <span className={clsx(
              "font-semibold",
              totalHoursWeek >= 40 ? "text-emerald-600" :
              totalHoursWeek >= 32 ? "text-amber-600" : "text-slate-600"
            )}>
              {totalHoursWeek}/40u ({Math.round((totalHoursWeek / 40) * 100)}%)
            </span>
          </div>
        </div>
      </div>

      {/* Quick add modal */}
      {quickAdd && projects.length > 0 && (
        <QuickAddModal
          date={quickAdd}
          projects={projects}
          onSave={handleAdd}
          onClose={() => setQuickAdd(null)}
        />
      )}

      {/* Geen projecten state */}
      {projects.length === 0 && (
        <div className="card p-12 text-center">
          <p className="text-2xl mb-2">📋</p>
          <p className="text-sm font-medium text-slate-700">Geen projecten beschikbaar</p>
          <p className="text-xs text-slate-400 mt-1">Je bent nog niet gekoppeld aan een project.</p>
        </div>
      )}
    </div>
  );
}
