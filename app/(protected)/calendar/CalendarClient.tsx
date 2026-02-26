"use client";

/**
 * CalendarClient.tsx — v2
 * Kalender met:
 * - Maandraster + agenda-kolom
 * - Verlof-events (calendar_events)
 * - Projectplanning-blokken (project_planning) met uren + capaciteitsbalk
 * - Filterbalk op persoon (team/org view)
 * - Capaciteitswaarschuwing bij > 8u/dag
 * - Planningsmodaal: project + persoon + uren kiezen
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  ChevronLeft, ChevronRight, Plus, X, Calendar,
  Users, Building2, Loader2, Trash2, Pencil,
  Palmtree, AlertCircle, CheckCircle2, FolderKanban,
  Search, AlertTriangle, Clock,
} from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import type { Profile } from "@/types";

// ─── Types ────────────────────────────────────────────────────

export type CalendarScope    = "mine" | "team" | "org";
export type EventType        = "verlof" | "niet_beschikbaar";

export interface CalendarEvent {
  id: string;
  user_id: string;
  title: string;
  type: EventType;
  start_date: string;
  end_date: string;
  all_day: boolean;
  notes: string | null;
  created_at: string;
  profile?: ProfileSnip;
}

export interface PlanningEntry {
  id: string;
  project_id: string;
  user_id: string;
  planned_by: string;
  date: string;
  hours: number;
  notes: string | null;
  project?: { id: string; name: string; status: string };
  user?: ProfileSnip;
}

type ProfileSnip = Pick<Profile, "id" | "full_name" | "avatar_url" | "role"> & { id: string };

interface Props {
  initialScope:  CalendarScope;
  currentUserId: string;
  userRole:      string;
  /** Alle users in het systeem — voor filterbalk en planningsmodaal */
  allUsers:      ProfileSnip[];
  /** Projecten waar huidige user rechten op heeft */
  myProjects:    { id: string; name: string; status: string }[];
}

// ─── Config ───────────────────────────────────────────────────

const MONTHS_NL = ["Januari","Februari","Maart","April","Mei","Juni",
                   "Juli","Augustus","September","Oktober","November","December"];
const DAYS_NL   = ["Ma","Di","Wo","Do","Vr","Za","Zo"];

const EVENT_CFG: Record<EventType, { label: string; color: string; bg: string; dot: string; border: string }> = {
  verlof:           { label: "Verlof",           color: "text-amber-700",  bg: "bg-amber-50",  dot: "bg-amber-400",  border: "border-amber-200" },
  niet_beschikbaar: { label: "Niet beschikbaar", color: "text-red-700",    bg: "bg-red-50",    dot: "bg-red-400",    border: "border-red-200"   },
};

// Vaste kleuren per project (hash-gebaseerd)
const PROJECT_COLORS = [
  { bg: "bg-blue-100",   border: "border-blue-300",   text: "text-blue-800",   dot: "bg-blue-400"   },
  { bg: "bg-violet-100", border: "border-violet-300", text: "text-violet-800", dot: "bg-violet-400" },
  { bg: "bg-teal-100",   border: "border-teal-300",   text: "text-teal-800",   dot: "bg-teal-400"   },
  { bg: "bg-orange-100", border: "border-orange-300", text: "text-orange-800", dot: "bg-orange-400" },
  { bg: "bg-pink-100",   border: "border-pink-300",   text: "text-pink-800",   dot: "bg-pink-400"   },
  { bg: "bg-cyan-100",   border: "border-cyan-300",   text: "text-cyan-800",   dot: "bg-cyan-400"   },
  { bg: "bg-lime-100",   border: "border-lime-300",   text: "text-lime-800",   dot: "bg-lime-400"   },
  { bg: "bg-rose-100",   border: "border-rose-300",   text: "text-rose-800",   dot: "bg-rose-400"   },
];

function projectColor(projectId: string) {
  let h = 0;
  for (let i = 0; i < projectId.length; i++) h = (h * 31 + projectId.charCodeAt(i)) & 0xffffffff;
  return PROJECT_COLORS[Math.abs(h) % PROJECT_COLORS.length];
}

const SCOPE_CFG: Record<CalendarScope, { label: string; icon: React.ElementType }> = {
  mine: { label: "Mijn kalender", icon: Calendar  },
  team: { label: "Team",          icon: Users      },
  org:  { label: "Organisatie",   icon: Building2  },
};

// ─── Datum helpers ────────────────────────────────────────────

function toKey(d: Date)   { return d.toISOString().slice(0, 10); }
function parseDate(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function addDays(d: Date, n: number) {
  const r = new Date(d); r.setDate(r.getDate() + n); return r;
}
function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth()    === b.getMonth()    &&
         a.getDate()     === b.getDate();
}
function getMonthGrid(year: number, month: number): Date[] {
  const first  = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  return Array.from({ length: 42 }, (_, i) => addDays(first, i - offset));
}

// ─── Capaciteitsbalk ──────────────────────────────────────────

function CapacityBar({ hours, max = 8 }: { hours: number; max?: number }) {
  const pct  = Math.min((hours / max) * 100, 100);
  const over = hours > max;
  return (
    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${
          over    ? "bg-red-500" :
          pct > 75 ? "bg-orange-400" :
                     "bg-brand-500"
        }`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ─── Planning modaal ──────────────────────────────────────────

interface PlanModalState {
  mode:     "create" | "edit";
  entry?:   PlanningEntry;
  prefillDate?: string;
  prefillUser?: ProfileSnip;
}

function PlanningModal({
  modal, onClose, onSave, onDelete,
  myProjects, allUsers, currentUserId, userRole,
}: {
  modal:         PlanModalState;
  onClose:       () => void;
  onSave:        (data: Partial<PlanningEntry>) => Promise<{ warning?: string | null } | void>;
  onDelete?:     (id: string) => Promise<void>;
  myProjects:    Props["myProjects"];
  allUsers:      ProfileSnip[];
  currentUserId: string;
  userRole:      string;
}) {
  const canPlanOthers = userRole === "admin" || userRole === "superuser";

  const [projectId, setProjectId] = useState(modal.entry?.project_id ?? myProjects[0]?.id ?? "");
  const [userId,    setUserId]    = useState(modal.entry?.user_id    ?? modal.prefillUser?.id ?? currentUserId);
  const [date,      setDate]      = useState(modal.entry?.date       ?? modal.prefillDate ?? toKey(new Date()));
  const [hours,     setHours]     = useState<number>(modal.entry ? Number(modal.entry.hours) : 4);
  const [notes,     setNotes]     = useState(modal.entry?.notes ?? "");
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");
  const [warning,   setWarning]   = useState("");

  async function handleSave() {
    if (!projectId) { setError("Kies een project"); return; }
    if (hours <= 0)  { setError("Vul een geldig aantal uren in"); return; }
    setLoading(true); setError(""); setWarning("");
    const result = await onSave({ project_id: projectId, user_id: userId, date, hours, notes: notes || undefined });
    setLoading(false);
    if ((result as any)?.warning) { setWarning((result as any).warning); return; }
    onClose();
  }

  // Bevestiging bij waarschuwing
  async function confirmOverCapacity() {
    setWarning("");
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">

        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <FolderKanban size={16} className="text-brand-600" />
            {modal.mode === "create" ? "Inplannen op project" : "Planning bewerken"}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100">
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          {/* Capaciteitswaarschuwing */}
          {warning && (
            <div className="flex flex-col gap-3 text-sm text-orange-700 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
              <div className="flex items-start gap-2">
                <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                <span>{warning}</span>
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setWarning("")} className="px-3 py-1.5 rounded-lg bg-white border border-orange-200 text-xs font-medium">
                  Aanpassen
                </button>
                <button onClick={confirmOverCapacity} className="px-3 py-1.5 rounded-lg bg-orange-500 text-white text-xs font-medium">
                  Toch opslaan
                </button>
              </div>
            </div>
          )}

          {/* Project */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Project *</label>
            <select
              value={projectId}
              onChange={e => setProjectId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 bg-white"
            >
              <option value="">— Kies project —</option>
              {myProjects.filter(p => p.status !== "archived").map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Persoon (alleen voor admins/owners) */}
          {canPlanOthers && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Persoon</label>
              <select
                value={userId}
                onChange={e => setUserId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 bg-white"
              >
                {allUsers.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.full_name}{u.id === currentUserId ? " (jij)" : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Datum + Uren */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Datum</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Uren <span className="text-slate-400 normal-case font-normal">(max 8 aanbevolen)</span>
              </label>
              {/* Snelkeuze-knoppen + handmatige invoer */}
              <div className="flex gap-1.5 mb-1.5">
                {[2, 4, 6, 8].map(h => (
                  <button
                    key={h}
                    onClick={() => setHours(h)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all
                      ${hours === h
                        ? "bg-brand-600 text-white border-brand-600"
                        : "bg-white text-slate-600 border-slate-200 hover:border-brand-400"
                      }`}
                  >
                    {h}u
                  </button>
                ))}
              </div>
              <input
                type="number"
                min={0.5}
                max={24}
                step={0.5}
                value={hours}
                onChange={e => setHours(Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
              />
            </div>
          </div>

          {/* Notitie */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Notitie (optioneel)</label>
            <input
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="bijv. ochtend / kick-off meeting"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
            />
          </div>
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
          <div>
            {modal.mode === "edit" && onDelete && modal.entry && (
              <button
                onClick={async () => { if (confirm("Planning verwijderen?")) { setLoading(true); await onDelete(modal.entry!.id); } }}
                disabled={loading}
                className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700"
              >
                <Trash2 size={14} /> Verwijderen
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-slate-500 hover:bg-slate-100">
              Annuleren
            </button>
            <button
              onClick={handleSave}
              disabled={loading || !!warning}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors shadow-sm disabled:opacity-60"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              {modal.mode === "create" ? "Inplannen" : "Opslaan"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Verlof modaal (ongewijzigd t.o.v. v1) ───────────────────

interface AbsenceModalState {
  mode: "create" | "edit";
  event?: CalendarEvent;
  prefillDate?: string;
}

function AbsenceModal({
  modal, onClose, onSave, onDelete,
}: {
  modal:     AbsenceModalState;
  onClose:   () => void;
  onSave:    (d: Partial<CalendarEvent>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}) {
  const [title,     setTitle]     = useState(modal.event?.title      ?? "Verlof");
  const [type,      setType]      = useState<EventType>(modal.event?.type ?? "verlof");
  const [startDate, setStartDate] = useState(modal.event?.start_date ?? modal.prefillDate ?? toKey(new Date()));
  const [endDate,   setEndDate]   = useState(modal.event?.end_date   ?? modal.prefillDate ?? toKey(new Date()));
  const [notes,     setNotes]     = useState(modal.event?.notes ?? "");
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");

  async function handleSave() {
    if (!title.trim()) { setError("Titel is verplicht"); return; }
    if (endDate < startDate) { setError("Einddatum mag niet vóór startdatum liggen"); return; }
    setLoading(true); setError("");
    await onSave({ title: title.trim(), type, start_date: startDate, end_date: endDate, notes: notes || undefined });
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <Palmtree size={16} className="text-amber-500" />
            {modal.mode === "create" ? "Afwezigheid toevoegen" : "Afwezigheid bewerken"}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100"><X size={16} /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">{error}</div>}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Type</label>
            <div className="flex gap-2">
              {(Object.entries(EVENT_CFG) as [EventType, typeof EVENT_CFG[EventType]][]).map(([key, c]) => (
                <button key={key} onClick={() => setType(key)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all
                    ${type === key ? `${c.bg} ${c.color} ${c.border} ring-2 ring-offset-1 ring-current` : "border-slate-200 text-slate-500"}`}
                >
                  {key === "verlof" ? <Palmtree size={14} /> : <AlertCircle size={14} />}
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Omschrijving</label>
            <input className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
              value={title} onChange={e => setTitle(e.target.value)} placeholder="bijv. Zomervakantie" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Vanaf</label>
              <input type="date" className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                value={startDate} onChange={e => { setStartDate(e.target.value); if (e.target.value > endDate) setEndDate(e.target.value); }} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Tot en met</label>
              <input type="date" min={startDate} className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Notitie (optioneel)</label>
            <textarea className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 resize-none"
              rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Extra toelichting…" />
          </div>
        </div>
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
          <div>
            {modal.mode === "edit" && onDelete && modal.event && (
              <button onClick={() => { if (confirm("Verwijderen?")) onDelete(modal.event!.id); }}
                className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700">
                <Trash2 size={14} /> Verwijderen
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-slate-500 hover:bg-slate-100">Annuleren</button>
            <button onClick={handleSave} disabled={loading}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-60">
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

export default function CalendarClient({
  initialScope, currentUserId, userRole, allUsers, myProjects,
}: Props) {
  const today  = new Date();
  const [scope,    setScope]    = useState<CalendarScope>(initialScope);
  const [year,     setYear]     = useState(today.getFullYear());
  const [month,    setMonth]    = useState(today.getMonth());
  const [selected, setSelected] = useState<Date>(today);
  const [events,   setEvents]   = useState<CalendarEvent[]>([]);
  const [planning, setPlanning] = useState<PlanningEntry[]>([]);
  const [loading,  setLoading]  = useState(false);

  // Filter op personen
  const [personSearch,  setPersonSearch]  = useState("");
  const [activePersons, setActivePersons] = useState<Set<string>>(new Set());

  // Modalen
  const [absenceModal, setAbsenceModal] = useState<AbsenceModalState | null>(null);
  const [planModal,    setPlanModal]    = useState<PlanModalState    | null>(null);

  const canSeeOrg  = userRole === "admin" || userRole === "superuser";
  const canPlan    = userRole === "admin" || userRole === "superuser" ||
                     myProjects.some(p => p.status !== "archived"); // eigenaar van minimaal 1 project

  // ─── Data laden ──────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true);
    const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;
    const [evRes, plRes] = await Promise.all([
      fetch(`/api/calendar?scope=${scope}&month=${monthStr}`),
      fetch(`/api/planning?scope=${scope}&month=${monthStr}`),
    ]);
    const [evData, plData] = await Promise.all([evRes.json(), plRes.json()]);
    setEvents(Array.isArray(evData) ? evData : []);
    setPlanning(Array.isArray(plData) ? plData : []);
    setLoading(false);
  }, [scope, year, month]);

  useEffect(() => { loadData(); }, [loadData]);

  // ─── Maandnavigatie ───────────────────────────────────────────

  function prevMonth() { month === 0 ? (setMonth(11), setYear(y => y - 1)) : setMonth(m => m - 1); }
  function nextMonth() { month === 11 ? (setMonth(0),  setYear(y => y + 1)) : setMonth(m => m + 1); }

  // ─── Persoonfilter ────────────────────────────────────────────

  const filteredUsers = useMemo(() =>
    allUsers.filter(u => u.full_name.toLowerCase().includes(personSearch.toLowerCase())),
    [allUsers, personSearch]
  );

  function togglePerson(id: string) {
    setActivePersons(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // Geen actieve filters = iedereen zien
  const activeFilter = activePersons.size > 0;

  // ─── Grid + event-maps ───────────────────────────────────────

  const grid = useMemo(() => getMonthGrid(year, month), [year, month]);

  // Events + planning filteren op actieve personen
  const filteredEvents   = useMemo(() =>
    activeFilter ? events.filter(e  => activePersons.has(e.user_id))  : events,
    [events, activePersons, activeFilter]);

  const filteredPlanning = useMemo(() =>
    activeFilter ? planning.filter(p => activePersons.has(p.user_id)) : planning,
    [planning, activePersons, activeFilter]);

  // Per dag: verlof-events
  const absenceByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    filteredEvents.forEach(ev => {
      const cur = new Date(parseDate(ev.start_date));
      const end = parseDate(ev.end_date);
      while (cur <= end) {
        const k = toKey(cur);
        map.set(k, [...(map.get(k) ?? []), ev]);
        cur.setDate(cur.getDate() + 1);
      }
    });
    return map;
  }, [filteredEvents]);

  // Per dag: planning-entries
  const planningByDay = useMemo(() => {
    const map = new Map<string, PlanningEntry[]>();
    filteredPlanning.forEach(p => {
      map.set(p.date, [...(map.get(p.date) ?? []), p]);
    });
    return map;
  }, [filteredPlanning]);

  // Per (dag + user): totaal uren → voor capaciteitsberekening
  const capacityByDayUser = useMemo(() => {
    const map = new Map<string, number>(); // key: "date__userId"
    planning.forEach(p => { // altijd alle planning, niet gefilterd
      const k = `${p.date}__${p.user_id}`;
      map.set(k, (map.get(k) ?? 0) + Number(p.hours));
    });
    return map;
  }, [planning]);

  // ─── Agenda: geselecteerde dag ───────────────────────────────

  const selectedKey      = toKey(selected);
  const selectedAbsences = absenceByDay.get(selectedKey)   ?? [];
  const selectedPlanning = planningByDay.get(selectedKey)  ?? [];

  // Alle users met activiteit op geselecteerde dag
  const dayUserIds = useMemo(() => {
    const ids = new Set<string>();
    selectedAbsences.forEach(e => ids.add(e.user_id));
    selectedPlanning.forEach(p => ids.add(p.user_id));
    return ids;
  }, [selectedAbsences, selectedPlanning]);

  // ─── CRUD: verlof ─────────────────────────────────────────────

  async function saveAbsence(data: Partial<CalendarEvent>) {
    if (absenceModal?.mode === "create") {
      const res  = await fetch("/api/calendar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const json = await res.json();
      if (res.ok) { setEvents(p => [...p, json]); setAbsenceModal(null); }
    } else if (absenceModal?.mode === "edit" && absenceModal.event) {
      const res  = await fetch(`/api/calendar/${absenceModal.event.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const json = await res.json();
      if (res.ok) { setEvents(p => p.map(e => e.id === absenceModal.event!.id ? json : e)); setAbsenceModal(null); }
    }
  }

  async function deleteAbsence(id: string) {
    await fetch(`/api/calendar/${id}`, { method: "DELETE" });
    setEvents(p => p.filter(e => e.id !== id));
    setAbsenceModal(null);
  }

  // ─── CRUD: planning ───────────────────────────────────────────

  async function savePlanning(data: Partial<PlanningEntry>) {
    if (planModal?.mode === "create") {
      const res  = await fetch("/api/planning", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const json = await res.json();
      if (res.ok) {
        setPlanning(p => [...p, json]);
        return { warning: json.warning };
      }
    } else if (planModal?.mode === "edit" && planModal.entry) {
      const res  = await fetch(`/api/planning/${planModal.entry.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const json = await res.json();
      if (res.ok) {
        setPlanning(p => p.map(e => e.id === planModal.entry!.id ? json : e));
        return { warning: json.warning };
      }
    }
  }

  async function deletePlanning(id: string) {
    await fetch(`/api/planning/${id}`, { method: "DELETE" });
    setPlanning(p => p.filter(e => e.id !== id));
    setPlanModal(null);
  }

  // ─── Render ───────────────────────────────────────────────────

  return (
    <div className="max-w-7xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Kalender</h2>
          <p className="text-sm text-slate-400 mt-0.5">{SCOPE_CFG[scope].label}</p>
        </div>
        <div className="flex items-center gap-2">
          {canPlan && (
            <button
              onClick={() => setPlanModal({ mode: "create", prefillDate: selectedKey })}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors shadow-sm"
            >
              <FolderKanban size={14} /> Inplannen
            </button>
          )}
          <button
            onClick={() => setAbsenceModal({ mode: "create", prefillDate: selectedKey })}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors"
          >
            <Palmtree size={14} /> Afwezigheid
          </button>
        </div>
      </div>

      {/* Scope tabs */}
      <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-2xl w-fit">
        {(Object.entries(SCOPE_CFG) as [CalendarScope, typeof SCOPE_CFG[CalendarScope]][]).map(([key, cfg]) => {
          if (key === "org" && !canSeeOrg) return null;
          return (
            <button key={key} onClick={() => setScope(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all
                ${scope === key ? "bg-white text-brand-700 shadow-sm font-semibold" : "text-slate-500 hover:text-slate-700"}`}
            >
              <cfg.icon size={14} /> {cfg.label}
            </button>
          );
        })}
      </div>

      {/* Persoon-filterbalk (alleen team/org) */}
      {scope !== "mine" && (
        <div className="card px-4 py-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={personSearch}
                onChange={e => setPersonSearch(e.target.value)}
                placeholder="Zoek persoon…"
                className="pl-8 pr-3 py-1.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 w-44"
              />
            </div>

            {/* Persoon-pills */}
            <div className="flex items-center gap-1.5 flex-wrap flex-1">
              {activeFilter && (
                <button
                  onClick={() => setActivePersons(new Set())}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-200 text-slate-600 hover:bg-slate-300 transition-colors"
                >
                  <X size={10} /> Wis filter
                </button>
              )}
              {filteredUsers.map(u => {
                const active = activePersons.has(u.id);
                return (
                  <button
                    key={u.id}
                    onClick={() => togglePerson(u.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all
                      ${active
                        ? "bg-brand-600 text-white border-brand-600 shadow-sm"
                        : "bg-white text-slate-600 border-slate-200 hover:border-brand-400 hover:text-brand-700"
                      }`}
                  >
                    <Avatar name={u.full_name} url={u.avatar_url} size="xs" />
                    {u.full_name.split(" ")[0]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Hoofd-grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5">

        {/* ── Maandkalender ──────────────────────────────── */}
        <div className="card p-5">

          {/* Navigatie */}
          <div className="flex items-center justify-between mb-5">
            <button onClick={prevMonth} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500">
              <ChevronLeft size={18} />
            </button>
            <div className="text-center">
              <h3 className="text-lg font-bold text-slate-800">{MONTHS_NL[month]} {year}</h3>
              {loading && <Loader2 size={12} className="animate-spin text-slate-400 mx-auto mt-0.5" />}
            </div>
            <button onClick={nextMonth} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500">
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Dag-headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS_NL.map(d => (
              <div key={d} className="text-center text-xs font-semibold text-slate-400 uppercase tracking-wider py-1">{d}</div>
            ))}
          </div>

          {/* Dag-cellen */}
          <div className="grid grid-cols-7 gap-y-0.5">
            {grid.map((day, i) => {
              const inMonth    = day.getMonth() === month;
              const isToday    = isSameDay(day, today);
              const isSel      = isSameDay(day, selected);
              const dayKey     = toKey(day);
              const dayAbs     = absenceByDay.get(dayKey)   ?? [];
              const dayPlan    = planningByDay.get(dayKey)  ?? [];
              const hasContent = dayAbs.length > 0 || dayPlan.length > 0;

              // Capaciteitswaarschuwing: iemand over 8u?
              const hasOvercap = Array.from(dayUserIds).some(uid => {
                const k = `${dayKey}__${uid}`;
                return (capacityByDayUser.get(k) ?? 0) > 8;
              }) || (() => {
                // check voor deze dag ook al dayUserIds niet gevuld
                const usersOnDay = new Set([
                  ...dayAbs.map(e => e.user_id),
                  ...dayPlan.map(p => p.user_id),
                ]);
                return Array.from(usersOnDay).some(uid => (capacityByDayUser.get(`${dayKey}__${uid}`) ?? 0) > 8);
              })();

              return (
                <button
                  key={i}
                  onClick={() => setSelected(day)}
                  onDoubleClick={() => setPlanModal({ mode: "create", prefillDate: dayKey })}
                  className={`relative flex flex-col items-center py-1 px-0.5 rounded-xl transition-all min-h-[56px] justify-start
                    ${isSel     ? "bg-brand-500 text-white shadow-md shadow-brand-200" : ""}
                    ${isToday && !isSel ? "ring-2 ring-brand-400 ring-offset-1" : ""}
                    ${!inMonth  ? "opacity-25" : ""}
                    ${!isSel    ? "hover:bg-slate-50" : ""}
                  `}
                >
                  {/* Datum */}
                  <span className={`text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full mt-0.5
                    ${isSel ? "text-white" : isToday ? "text-brand-600" : "text-slate-700"}`}>
                    {day.getDate()}
                  </span>

                  {/* Capaciteitswaarschuwing */}
                  {hasOvercap && (
                    <AlertTriangle size={9} className={`absolute top-1 right-1 ${isSel ? "text-yellow-200" : "text-orange-400"}`} />
                  )}

                  {/* Content indicators */}
                  {hasContent && (
                    <div className="flex flex-col gap-0.5 w-full px-0.5 mt-0.5">
                      {/* Verlof-dot(s) */}
                      {dayAbs.slice(0, 1).map((ev, j) => (
                        <div key={j} className={`w-full h-1 rounded-full ${isSel ? "bg-white/60" : EVENT_CFG[ev.type].dot}`} />
                      ))}
                      {/* Planning-blokjes (unieke projecten) */}
                      {[...new Set(dayPlan.map(p => p.project_id))].slice(0, 2).map(pid => {
                        const c = projectColor(pid);
                        return <div key={pid} className={`w-full h-1 rounded-full ${isSel ? "bg-white/60" : c.dot}`} />;
                      })}
                      {(dayAbs.length + [...new Set(dayPlan.map(p => p.project_id))].length) > 3 && (
                        <span className={`text-[8px] font-bold ${isSel ? "text-white/70" : "text-slate-400"}`}>
                          +{dayAbs.length + [...new Set(dayPlan.map(p => p.project_id))].length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legenda */}
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-100 flex-wrap">
            {Object.entries(EVENT_CFG).map(([key, c]) => (
              <div key={key} className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className={`w-2.5 h-2.5 rounded-full ${c.dot}`} /> {c.label}
              </div>
            ))}
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-400" /> Project ingepland
            </div>
            <div className="flex items-center gap-1.5 text-xs text-orange-500 ml-auto">
              <AlertTriangle size={11} /> Over capaciteit
            </div>
          </div>
        </div>

        {/* ── Agenda: geselecteerde dag ──────────────────── */}
        <div className="card p-5 flex flex-col gap-4 overflow-y-auto" style={{ maxHeight: "640px" }}>

          {/* Dag-header */}
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-slate-800">
                {DAYS_NL[(selected.getDay() + 6) % 7]} {selected.getDate()} {MONTHS_NL[selected.getMonth()]}
              </h4>
              {isToday(selected) && <p className="text-xs text-brand-500 font-medium">Vandaag</p>}
            </div>
            <div className="flex gap-1.5">
              {canPlan && (
                <button onClick={() => setPlanModal({ mode: "create", prefillDate: selectedKey })}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-brand-50 hover:text-brand-600 transition-colors" title="Inplannen">
                  <FolderKanban size={14} />
                </button>
              )}
              <button onClick={() => setAbsenceModal({ mode: "create", prefillDate: selectedKey })}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-amber-50 hover:text-amber-600 transition-colors" title="Afwezigheid">
                <Palmtree size={14} />
              </button>
            </div>
          </div>

          {/* Geen activiteit */}
          {selectedAbsences.length === 0 && selectedPlanning.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-10">
              <CheckCircle2 size={28} className="text-brand-300 mb-2" />
              <p className="text-sm text-slate-400">Iedereen beschikbaar</p>
              <p className="text-xs text-slate-300 mt-1">Niets gepland voor deze dag</p>
            </div>
          )}

          {/* Per persoon: capaciteitsbalk + blokken */}
          {scope !== "mine" && dayUserIds.size > 0 && (
            <div className="space-y-4">
              {Array.from(dayUserIds).map(uid => {
                const user       = allUsers.find(u => u.id === uid);
                const userAbs    = selectedAbsences.filter(e => e.user_id === uid);
                const userPlan   = selectedPlanning.filter(p => p.user_id === uid);
                const totalHours = capacityByDayUser.get(`${selectedKey}__${uid}`) ?? 0;
                const overCap    = totalHours > 8;

                return (
                  <div key={uid} className="space-y-2">
                    {/* Persoon + capaciteitsbalk */}
                    <div className="flex items-center gap-2.5">
                      <Avatar name={user?.full_name} url={user?.avatar_url} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-semibold text-slate-700 truncate">{user?.full_name ?? "Onbekend"}</p>
                          <div className="flex items-center gap-1">
                            {overCap && <AlertTriangle size={12} className="text-orange-400" />}
                            <span className={`text-xs font-bold ${overCap ? "text-orange-500" : "text-slate-500"}`}>
                              {Math.round((totalHours / 8) * 100)}%
                            </span>
                            <span className="text-xs text-slate-400">({totalHours}u / 8u)</span>
                          </div>
                        </div>
                        <CapacityBar hours={totalHours} />
                      </div>
                    </div>

                    {/* Verlof-blokken */}
                    {userAbs.map(ev => {
                      const c = EVENT_CFG[ev.type];
                      return (
                        <div key={ev.id}
                          className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border ${c.bg} ${c.border} cursor-pointer hover:shadow-sm transition-all ml-10`}
                          onClick={() => ev.user_id === currentUserId && setAbsenceModal({ mode: "edit", event: ev })}
                        >
                          {ev.type === "verlof" ? <Palmtree size={13} className={c.color} /> : <AlertCircle size={13} className={c.color} />}
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${c.color} truncate`}>{ev.title}</p>
                            <p className="text-xs text-slate-400">{c.label}</p>
                          </div>
                        </div>
                      );
                    })}

                    {/* Planning-blokken */}
                    {userPlan.map(entry => {
                      const pc = projectColor(entry.project_id);
                      const isOwn = entry.planned_by === currentUserId || entry.user_id === currentUserId;
                      return (
                        <div key={entry.id}
                          className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border ${pc.bg} ${pc.border} cursor-pointer hover:shadow-sm transition-all ml-10`}
                          onClick={() => isOwn && setPlanModal({ mode: "edit", entry })}
                        >
                          <FolderKanban size={13} className={pc.text} />
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-semibold ${pc.text} truncate`}>{entry.project?.name ?? "Project"}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="flex items-center gap-1 text-xs text-slate-500">
                                <Clock size={10} /> {entry.hours}u
                              </span>
                              {entry.notes && <span className="text-xs text-slate-400 truncate italic">{entry.notes}</span>}
                            </div>
                          </div>
                          {isOwn && <Pencil size={11} className="text-slate-300 flex-shrink-0" />}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}

          {/* Mijn kalender: eigen dag-overzicht */}
          {scope === "mine" && (selectedAbsences.length > 0 || selectedPlanning.length > 0) && (
            <div className="space-y-2">
              {/* Eigen verlof */}
              {selectedAbsences.map(ev => {
                const c = EVENT_CFG[ev.type];
                return (
                  <div key={ev.id}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border ${c.bg} ${c.border} cursor-pointer hover:shadow-sm`}
                    onClick={() => setAbsenceModal({ mode: "edit", event: ev })}
                  >
                    {ev.type === "verlof" ? <Palmtree size={14} className={c.color} /> : <AlertCircle size={14} className={c.color} />}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${c.color}`}>{ev.title}</p>
                      <p className="text-xs text-slate-400">{c.label}</p>
                    </div>
                    <Pencil size={12} className="text-slate-300" />
                  </div>
                );
              })}

              {/* Eigen planning + capaciteitsbalk */}
              {selectedPlanning.length > 0 && (
                <div>
                  {/* Capaciteitsbalk eigen dag */}
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-slate-500">Capaciteit vandaag</span>
                    <div className="flex items-center gap-1">
                      {(capacityByDayUser.get(`${selectedKey}__${currentUserId}`) ?? 0) > 8 &&
                        <AlertTriangle size={12} className="text-orange-400" />}
                      <span className="text-xs font-bold text-slate-600">
                        {Math.round(((capacityByDayUser.get(`${selectedKey}__${currentUserId}`) ?? 0) / 8) * 100)}%
                      </span>
                      <span className="text-xs text-slate-400">
                        ({capacityByDayUser.get(`${selectedKey}__${currentUserId}`) ?? 0}u / 8u)
                      </span>
                    </div>
                  </div>
                  <CapacityBar hours={capacityByDayUser.get(`${selectedKey}__${currentUserId}`) ?? 0} />
                  <div className="mt-2 space-y-1.5">
                    {selectedPlanning.map(entry => {
                      const pc = projectColor(entry.project_id);
                      return (
                        <div key={entry.id}
                          className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border ${pc.bg} ${pc.border} cursor-pointer hover:shadow-sm`}
                          onClick={() => setPlanModal({ mode: "edit", entry })}
                        >
                          <FolderKanban size={13} className={pc.text} />
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-semibold ${pc.text} truncate`}>{entry.project?.name}</p>
                            <span className="flex items-center gap-1 text-xs text-slate-500">
                              <Clock size={10} /> {entry.hours}u {entry.notes && `· ${entry.notes}`}
                            </span>
                          </div>
                          <Pencil size={11} className="text-slate-300" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Modalen ────────────────────────────────────── */}
      {absenceModal && (
        <AbsenceModal modal={absenceModal} onClose={() => setAbsenceModal(null)}
          onSave={saveAbsence} onDelete={deleteAbsence} />
      )}
      {planModal && (
        <PlanningModal modal={planModal} onClose={() => setPlanModal(null)}
          onSave={savePlanning} onDelete={deletePlanning}
          myProjects={myProjects} allUsers={allUsers}
          currentUserId={currentUserId} userRole={userRole} />
      )}
    </div>
  );
}

function isToday(d: Date) {
  const t = new Date();
  return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
}
