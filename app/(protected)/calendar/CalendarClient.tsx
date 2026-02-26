"use client";

/**
 * CalendarClient.tsx
 * Kalender-pagina met:
 * - Maandraster links
 * - Agenda-lijst rechts (geselecteerde week)
 * - Filterknoppen: Mijn kalender / Team / Organisatie
 * - Event aanmaken/bewerken/verwijderen via modaal
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  ChevronLeft, ChevronRight, Plus, X, Calendar,
  Users, Building2, Loader2, Trash2, Pencil,
  Palmtree, AlertCircle, CheckCircle2,
} from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import type { Profile } from "@/types";

// ─── Types ────────────────────────────────────────────────────

export type CalendarScope = "mine" | "team" | "org";

export type EventType = "verlof" | "niet_beschikbaar";

export interface CalendarEvent {
  id: string;
  user_id: string;
  title: string;
  type: EventType;
  start_date: string; // YYYY-MM-DD
  end_date: string;
  all_day: boolean;
  notes: string | null;
  created_at: string;
  profile?: Pick<Profile, "id" | "full_name" | "avatar_url" | "role"> & { id: string };
}

interface Props {
  initialScope: CalendarScope;
  currentUserId: string;
  userRole: string;
}

// ─── Constanten ───────────────────────────────────────────────

const MONTHS_NL = ["Januari","Februari","Maart","April","Mei","Juni",
                   "Juli","Augustus","September","Oktober","November","December"];
const DAYS_NL   = ["Ma","Di","Wo","Do","Vr","Za","Zo"];

const EVENT_CONFIG: Record<EventType, { label: string; color: string; bg: string; dot: string; icon: React.ElementType }> = {
  verlof:           { label: "Verlof",           color: "text-amber-700",  bg: "bg-amber-50  border-amber-200",  dot: "bg-amber-400",  icon: Palmtree    },
  niet_beschikbaar: { label: "Niet beschikbaar", color: "text-red-700",    bg: "bg-red-50    border-red-200",    dot: "bg-red-400",    icon: AlertCircle },
};

const SCOPE_CONFIG: Record<CalendarScope, { label: string; icon: React.ElementType; desc: string }> = {
  mine: { label: "Mijn kalender", icon: Calendar,  desc: "Alleen jouw eigen afwezigheid" },
  team: { label: "Team",          icon: Users,     desc: "Beschikbaarheid van jouw team" },
  org:  { label: "Organisatie",   icon: Building2, desc: "Volledig overzicht organisatie" },
};

// ─── Helpers ──────────────────────────────────────────────────

function toKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function parseDate(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function addDays(date: Date, n: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth()    === b.getMonth()    &&
         a.getDate()     === b.getDate();
}

function eventSpansDay(event: CalendarEvent, day: Date): boolean {
  const start = parseDate(event.start_date);
  const end   = parseDate(event.end_date);
  return day >= start && day <= end;
}

/** Geeft de maandagraster terug: 6 weken × 7 dagen, beginnend op maandag */
function getMonthGrid(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1);
  // Maandag = 0 in onze grid (js: 0=zo, 1=ma, …)
  const startOffset = (firstDay.getDay() + 6) % 7; // shift zo maandag-gebaseerd
  const gridStart   = addDays(firstDay, -startOffset);
  return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
}

// ─── Kleurbalk per persoon (voor team/org view) ───────────────

const PERSON_COLORS = [
  "bg-blue-400","bg-violet-400","bg-pink-400","bg-orange-400",
  "bg-teal-400","bg-cyan-400","bg-lime-500","bg-rose-400",
];
function colorForUser(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = (hash * 31 + userId.charCodeAt(i)) & 0xffffffff;
  return PERSON_COLORS[Math.abs(hash) % PERSON_COLORS.length];
}

// ─── Modaal voor aanmaken/bewerken ───────────────────────────

interface ModalState {
  mode: "create" | "edit";
  event?: CalendarEvent;
  prefillDate?: string;
}

function EventModal({
  modal,
  onClose,
  onSave,
  onDelete,
  currentUserId,
}: {
  modal: ModalState;
  onClose: () => void;
  onSave: (data: Partial<CalendarEvent>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  currentUserId: string;
}) {
  const [title,     setTitle]     = useState(modal.event?.title      ?? "Verlof");
  const [type,      setType]      = useState<EventType>(modal.event?.type ?? "verlof");
  const [startDate, setStartDate] = useState(modal.event?.start_date ?? modal.prefillDate ?? toKey(new Date()));
  const [endDate,   setEndDate]   = useState(modal.event?.end_date   ?? modal.prefillDate ?? toKey(new Date()));
  const [notes,     setNotes]     = useState(modal.event?.notes      ?? "");
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");

  async function handleSave() {
    if (!title.trim()) { setError("Titel is verplicht"); return; }
    if (endDate < startDate) { setError("Einddatum mag niet vóór startdatum liggen"); return; }
    setLoading(true); setError("");
    await onSave({ title: title.trim(), type, start_date: startDate, end_date: endDate, notes: notes || undefined });
    setLoading(false);
  }

  async function handleDelete() {
    if (!modal.event || !onDelete) return;
    if (!confirm("Event verwijderen?")) return;
    setLoading(true);
    await onDelete(modal.event.id);
    setLoading(false);
  }

  const cfg = EVENT_CONFIG[type];

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">
            {modal.mode === "create" ? "Afwezigheid toevoegen" : "Afwezigheid bewerken"}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">{error}</div>
          )}

          {/* Type */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Type</label>
            <div className="flex gap-2">
              {(Object.entries(EVENT_CONFIG) as [EventType, typeof EVENT_CONFIG[EventType]][]).map(([key, c]) => (
                <button
                  key={key}
                  onClick={() => { setType(key); if (!title.trim() || title === EVENT_CONFIG[type === key ? key : type === "verlof" ? "niet_beschikbaar" : "verlof"].label) setTitle(c.label); }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all
                    ${type === key ? `${c.bg} ${c.color} ring-2 ring-offset-1 ring-current` : "border-slate-200 text-slate-500 hover:border-slate-300"}`}
                >
                  <c.icon size={14} />
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Titel */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Omschrijving</label>
            <input
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="bijv. Zomervakantie"
              autoFocus
            />
          </div>

          {/* Datums */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Vanaf</label>
              <input
                type="date"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                value={startDate}
                onChange={e => { setStartDate(e.target.value); if (e.target.value > endDate) setEndDate(e.target.value); }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Tot en met</label>
              <input
                type="date"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                value={endDate}
                min={startDate}
                onChange={e => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {/* Notities */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Notitie (optioneel)</label>
            <textarea
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 resize-none"
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Extra toelichting…"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
          <div>
            {modal.mode === "edit" && onDelete && (
              <button
                onClick={handleDelete}
                disabled={loading}
                className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700 transition-colors"
              >
                <Trash2 size={14} /> Verwijderen
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-slate-500 hover:bg-slate-100 transition-colors">
              Annuleren
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors shadow-sm disabled:opacity-60"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              {modal.mode === "create" ? "Toevoegen" : "Opslaan"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Hoofd component ──────────────────────────────────────────

export default function CalendarClient({ initialScope, currentUserId, userRole }: Props) {
  const today = new Date();
  const [scope,   setScope]   = useState<CalendarScope>(initialScope);
  const [year,    setYear]    = useState(today.getFullYear());
  const [month,   setMonth]   = useState(today.getMonth()); // 0-based
  const [selected, setSelected] = useState<Date>(today);
  const [events,  setEvents]  = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [modal,   setModal]   = useState<ModalState | null>(null);

  const canSeeOrg  = userRole === "admin" || userRole === "superuser";
  const canSeeTeam = true; // iedereen mag teamkalender zien

  // ─── Data laden ─────────────────────────────────────────────

  const loadEvents = useCallback(async () => {
    setLoading(true);
    const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;
    const res = await fetch(`/api/calendar?scope=${scope}&month=${monthStr}`);
    const data = await res.json();
    setEvents(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [scope, year, month]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  // ─── Maandnavigatie ──────────────────────────────────────────

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }

  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  // ─── Grid berekenen ──────────────────────────────────────────

  const grid = useMemo(() => getMonthGrid(year, month), [year, month]);

  // Events per dag (voor dots op het grid)
  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach(ev => {
      const start = parseDate(ev.start_date);
      const end   = parseDate(ev.end_date);
      const cur   = new Date(start);
      while (cur <= end) {
        const key = toKey(cur);
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(ev);
        cur.setDate(cur.getDate() + 1);
      }
    });
    return map;
  }, [events]);

  // Events voor de geselecteerde dag
  const selectedDayEvents = useMemo(() =>
    (eventsByDay.get(toKey(selected)) ?? []).sort((a, b) =>
      a.start_date.localeCompare(b.start_date)
    ), [eventsByDay, selected]);

  // Komende 7 dagen events (voor agenda-kolom)
  const agendaEvents = useMemo(() => {
    const result: { day: Date; events: CalendarEvent[] }[] = [];
    for (let i = 0; i < 7; i++) {
      const day = addDays(selected, i);
      const evs = eventsByDay.get(toKey(day)) ?? [];
      if (evs.length > 0 || i === 0) result.push({ day, events: evs });
    }
    return result;
  }, [selected, eventsByDay]);

  // ─── CRUD handlers ───────────────────────────────────────────

  async function handleSave(data: Partial<CalendarEvent>) {
    if (modal?.mode === "create") {
      const res  = await fetch("/api/calendar", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(data),
      });
      const json = await res.json();
      if (res.ok) { setEvents(prev => [...prev, json]); setModal(null); }
    } else if (modal?.mode === "edit" && modal.event) {
      const res  = await fetch(`/api/calendar/${modal.event.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(data),
      });
      const json = await res.json();
      if (res.ok) { setEvents(prev => prev.map(e => e.id === modal.event!.id ? json : e)); setModal(null); }
    }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/calendar/${id}`, { method: "DELETE" });
    setEvents(prev => prev.filter(e => e.id !== id));
    setModal(null);
  }

  // ─── Render ───────────────────────────────────────────────

  return (
    <div className="max-w-7xl mx-auto space-y-5">

      {/* ── Pagina-header ──────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Kalender</h2>
          <p className="text-sm text-slate-400 mt-0.5">{SCOPE_CONFIG[scope].desc}</p>
        </div>
        <button
          onClick={() => setModal({ mode: "create", prefillDate: toKey(selected) })}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors shadow-sm shadow-brand-200"
        >
          <Plus size={15} /> Afwezigheid toevoegen
        </button>
      </div>

      {/* ── Scope filterknoppen ─────────────────────────────── */}
      <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-2xl w-fit">
        {(Object.entries(SCOPE_CONFIG) as [CalendarScope, typeof SCOPE_CONFIG[CalendarScope]][]).map(([key, cfg]) => {
          if (key === "org"  && !canSeeOrg)  return null;
          if (key === "team" && !canSeeTeam) return null;
          const active = scope === key;
          return (
            <button
              key={key}
              onClick={() => setScope(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all
                ${active
                  ? "bg-white text-brand-700 shadow-sm shadow-slate-200 font-semibold"
                  : "text-slate-500 hover:text-slate-700"
                }`}
            >
              <cfg.icon size={14} />
              {cfg.label}
            </button>
          );
        })}
      </div>

      {/* ── Hoofd layout: maand + agenda ───────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">

        {/* ─── Maandkalender ─────────────────────────────── */}
        <div className="card p-5">

          {/* Maand navigatie */}
          <div className="flex items-center justify-between mb-5">
            <button onClick={prevMonth} className="p-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-500">
              <ChevronLeft size={18} />
            </button>
            <div className="text-center">
              <h3 className="text-lg font-bold text-slate-800">
                {MONTHS_NL[month]} {year}
              </h3>
              {loading && <Loader2 size={12} className="animate-spin text-slate-400 mx-auto mt-0.5" />}
            </div>
            <button onClick={nextMonth} className="p-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-500">
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Dag-headers */}
          <div className="grid grid-cols-7 mb-2">
            {DAYS_NL.map(d => (
              <div key={d} className="text-center text-xs font-semibold text-slate-400 uppercase tracking-wider py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Dag-cellen */}
          <div className="grid grid-cols-7 gap-y-1">
            {grid.map((day, i) => {
              const inMonth   = day.getMonth() === month;
              const isToday   = isSameDay(day, today);
              const isSelected = isSameDay(day, selected);
              const dayEvents = eventsByDay.get(toKey(day)) ?? [];
              const hasEvents = dayEvents.length > 0;

              return (
                <button
                  key={i}
                  onClick={() => setSelected(day)}
                  onDoubleClick={() => setModal({ mode: "create", prefillDate: toKey(day) })}
                  className={`relative flex flex-col items-center py-1.5 rounded-xl transition-all group
                    ${isSelected ? "bg-brand-500 text-white shadow-md shadow-brand-200" : ""}
                    ${isToday && !isSelected ? "ring-2 ring-brand-400 ring-offset-1" : ""}
                    ${!inMonth ? "opacity-30" : ""}
                    ${!isSelected ? "hover:bg-slate-100" : ""}
                  `}
                >
                  <span className={`text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full
                    ${isSelected ? "text-white" : isToday ? "text-brand-600" : "text-slate-700"}
                  `}>
                    {day.getDate()}
                  </span>

                  {/* Event dots */}
                  {hasEvents && (
                    <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center max-w-[40px]">
                      {dayEvents.slice(0, 3).map((ev, j) => (
                        <span
                          key={j}
                          className={`w-1.5 h-1.5 rounded-full flex-shrink-0
                            ${isSelected
                              ? "bg-white/70"
                              : scope === "mine"
                                ? EVENT_CONFIG[ev.type].dot
                                : colorForUser(ev.user_id)
                            }`}
                        />
                      ))}
                      {dayEvents.length > 3 && (
                        <span className={`text-[9px] font-bold ${isSelected ? "text-white/70" : "text-slate-400"}`}>
                          +{dayEvents.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legenda */}
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-100">
            {Object.entries(EVENT_CONFIG).map(([key, cfg]) => (
              <div key={key} className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
                {cfg.label}
              </div>
            ))}
            <span className="text-xs text-slate-400 ml-auto">Dubbelklik op dag om toe te voegen</span>
          </div>
        </div>

        {/* ─── Agenda-kolom ──────────────────────────────── */}
        <div className="card p-5 flex flex-col gap-4 overflow-y-auto" style={{ maxHeight: "600px" }}>
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-slate-700 text-sm">
              Agenda — komende 7 dagen
            </h4>
            <button
              onClick={() => setModal({ mode: "create", prefillDate: toKey(selected) })}
              className="p-1.5 rounded-lg text-slate-400 hover:bg-brand-50 hover:text-brand-600 transition-colors"
              title="Afwezigheid toevoegen"
            >
              <Plus size={14} />
            </button>
          </div>

          {agendaEvents.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
              <CheckCircle2 size={28} className="text-brand-300 mb-2" />
              <p className="text-sm text-slate-400">Iedereen beschikbaar</p>
              <p className="text-xs text-slate-300 mt-1">Geen afwezigheid gepland</p>
            </div>
          ) : (
            <div className="space-y-4">
              {agendaEvents.map(({ day, events: dayEvs }) => (
                <div key={toKey(day)}>
                  {/* Dag-label */}
                  <div className={`flex items-center gap-2 mb-2`}>
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold
                      ${isSameDay(day, today)
                        ? "bg-brand-500 text-white"
                        : isSameDay(day, selected)
                          ? "bg-brand-50 text-brand-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {day.getDate()}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-700">
                        {DAYS_NL[(day.getDay() + 6) % 7]}{" "}
                        {MONTHS_NL[day.getMonth()].slice(0, 3)}
                      </p>
                      {isSameDay(day, today) && (
                        <p className="text-[10px] text-brand-500 font-medium">Vandaag</p>
                      )}
                    </div>
                  </div>

                  {/* Events van die dag */}
                  <div className="space-y-1.5 ml-10">
                    {dayEvs.map(ev => {
                      const cfg      = EVENT_CONFIG[ev.type];
                      const isOwn    = ev.user_id === currentUserId;
                      const duration = Math.round(
                        (parseDate(ev.end_date).getTime() - parseDate(ev.start_date).getTime())
                        / 86400000
                      ) + 1;

                      return (
                        <div
                          key={ev.id}
                          className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all hover:shadow-sm ${cfg.bg}`}
                          onClick={() => isOwn && setModal({ mode: "edit", event: ev })}
                        >
                          {/* Avatar (team/org) of icoon */}
                          {scope !== "mine" && ev.profile ? (
                            <Avatar name={ev.profile.full_name} url={ev.profile.avatar_url} size="sm" />
                          ) : (
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                              <cfg.icon size={13} className={cfg.color} />
                            </div>
                          )}

                          <div className="flex-1 min-w-0">
                            {scope !== "mine" && ev.profile && (
                              <p className="text-[11px] font-semibold text-slate-500 truncate">
                                {ev.profile.full_name}
                              </p>
                            )}
                            <p className={`text-sm font-medium truncate ${cfg.color}`}>{ev.title}</p>
                            <p className="text-[11px] text-slate-400">
                              {cfg.label} · {duration} dag{duration !== 1 ? "en" : ""}
                            </p>
                            {ev.notes && (
                              <p className="text-[11px] text-slate-400 italic truncate mt-0.5">{ev.notes}</p>
                            )}
                          </div>

                          {isOwn && (
                            <Pencil size={12} className="text-slate-300 flex-shrink-0 mt-0.5" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Event modaal ───────────────────────────────────── */}
      {modal && (
        <EventModal
          modal={modal}
          onClose={() => setModal(null)}
          onSave={handleSave}
          onDelete={modal.mode === "edit" ? handleDelete : undefined}
          currentUserId={currentUserId}
        />
      )}
    </div>
  );
}
