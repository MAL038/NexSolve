"use client";

/**
 * ProjectWizard.tsx — 5-staps modal wizard
 * Stap 1: Identiteit (naam, beschrijving, status)
 * Stap 2: Thema & submodule
 * Stap 3: Klant koppelen
 * Stap 4: Team + leden + deadlines
 * Stap 5: Bevestiging + confetti + snelkoppelingen
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  X, ChevronRight, ChevronLeft, Check, Loader2,
  FolderKanban, Layers, Building2, Users, Calendar,
  Sparkles, ExternalLink, Search, Crown,
  AlertCircle,
} from "lucide-react";
import clsx from "clsx";
import Avatar from "@/components/ui/Avatar";
import { CustomerWizard } from "@/components/CustomerWizard";
import type { ThemeWithChildren, Customer, Team, Profile } from "@/types";

// ─── Types ────────────────────────────────────────────────────

type ProjectStatus = "active" | "in-progress" | "archived";

interface FormData {
  // Stap 1
  name:        string;
  code:        string;
  autoCode:    boolean;
  description: string;
  status:      ProjectStatus;
  // Stap 2
  theme_id:        string | null;
  process_id:      string | null;
  process_type_id: string | null;
  // Stap 3
  customer_id: string | null;
  // Stap 4
  team_id:    string | null;
  start_date: string;
  end_date:   string;
}

interface Props {
  onClose:      () => void;
  onCreated:    (project: any) => void;
  hierarchy:    ThemeWithChildren[];
  editProject?: any;  // als gezet: edit-modus (PATCH)
}

// ─── Config ───────────────────────────────────────────────────

const STATUS_OPTIONS: { value: ProjectStatus; label: string; color: string; bg: string }[] = [
  { value: "active",      label: "Actief",       color: "text-brand-700",  bg: "bg-brand-50  border-brand-200"  },
  { value: "in-progress", label: "In uitvoering", color: "text-amber-700",  bg: "bg-amber-50  border-amber-200"  },
  { value: "archived",    label: "Gearchiveerd",  color: "text-slate-500",  bg: "bg-slate-100 border-slate-200"  },
];

const STEPS = [
  { num: 1, label: "Identiteit",  icon: FolderKanban },
  { num: 2, label: "Thema",       icon: Layers       },
  { num: 3, label: "Klant",       icon: Building2    },
  { num: 4, label: "Team",        icon: Users        },
  { num: 5, label: "Klaar!",      icon: Sparkles     },
];

// ─── Confetti ─────────────────────────────────────────────────

function ConfettiCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx    = canvas.getContext("2d")!;
    canvas.width  = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    const pieces  = Array.from({ length: 100 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      size: 5 + Math.random() * 7,
      color: ["#0A6645","#69B296","#34d399","#fbbf24","#f472b6","#60a5fa","#a78bfa"][Math.floor(Math.random() * 7)],
      speed: 2 + Math.random() * 3,
      angle: Math.random() * 360,
      spin:  (Math.random() - 0.5) * 4,
    }));
    let frame: number;
    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pieces.forEach(p => {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.angle * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.4);
        ctx.restore();
        p.y     += p.speed;
        p.angle += p.spin;
        if (p.y > canvas.height) { p.y = -10; p.x = Math.random() * canvas.width; }
      });
      frame = requestAnimationFrame(tick);
    };
    tick();
    const timeout = setTimeout(() => cancelAnimationFrame(frame), 4000);
    return () => { cancelAnimationFrame(frame); clearTimeout(timeout); };
  }, []);
  return <canvas ref={ref} className="absolute inset-0 w-full h-full pointer-events-none rounded-2xl" />;
}

// ─── Step indicator ───────────────────────────────────────────

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-1 mb-6">
      {STEPS.map((step, i) => {
        const done   = current > step.num;
        const active = current === step.num;
        return (
          <div key={step.num} className="flex items-center">
            <div className={clsx(
              "flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-all border-2",
              done   ? "bg-brand-500 border-brand-500 text-white" :
              active ? "bg-white border-brand-500 text-brand-600" :
                       "bg-slate-100 border-slate-200 text-slate-400"
            )}>
              {done ? <Check size={13} /> : step.num}
            </div>
            {i < STEPS.length - 1 && (
              <div className={clsx("w-6 h-0.5 mx-1", done ? "bg-brand-500" : "bg-slate-200")} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Hoofd component ──────────────────────────────────────────

export default function ProjectWizard({ onClose, onCreated, hierarchy, editProject }: Props) {
  const router  = useRouter();
  const [step,    setStep]    = useState(1);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [created, setCreated] = useState<any>(null);

  const [form, setForm] = useState<FormData>({
    name: "", code: "", autoCode: true, description: "", status: "active",
    theme_id: null, process_id: null, process_type_id: null,
    customer_id: null,
    team_id: null, start_date: "", end_date: "",
  });

  // Data voor dropdowns
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [teams,     setTeams]     = useState<Team[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [showNewTeam, setShowNewTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamLoading, setNewTeamLoading] = useState(false);
  const [newTeamError, setNewTeamError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/customers").then(r => r.ok ? r.json() : []),
      fetch("/api/teams").then(r => r.ok ? r.json() : []),
    ]).then(([c, t]) => {
      setCustomers(Array.isArray(c) ? c : []);
      setTeams(Array.isArray(t) ? t : []);
    });
  }, []);

  // Pre-fill form bij edit-modus
  useEffect(() => {
    if (editProject) {
      setForm({
        name:            editProject.name        ?? "",
        code:            editProject.code        ?? "",
        autoCode:        false,
        description:     editProject.description ?? "",
        status:          editProject.status       ?? "active",
        theme_id:        editProject.theme_id     ?? null,
        process_id:      editProject.process_id   ?? null,
        process_type_id: editProject.process_type_id ?? null,
        customer_id:     editProject.customer_id  ?? null,
        team_id:         editProject.team_id      ?? null,
        start_date:      editProject.start_date   ?? "",
        end_date:        editProject.end_date      ?? "",
      });
    }
  }, [editProject]);

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm(f => ({ ...f, [key]: value }));
  }

  // ─── Validatie per stap ──────────────────────────────────────

  function validateStep(s: number): string {
    if (s === 1 && !form.name.trim()) return "Projectnaam is verplicht";
    if (s === 4 && form.end_date && form.start_date && form.end_date < form.start_date)
      return "Einddatum mag niet vóór startdatum liggen";
    return "";
  }

  function next() {
    const err = validateStep(step);
    if (err) { setError(err); return; }
    setError("");
    const lastStep = editProject ? 4 : 4;  // stap 5 = confetti, alleen bij nieuw
    if (step < lastStep) { setStep(s => s + 1); return; }
    handleCreate();
  }

  function prev() { setError(""); setStep(s => s - 1); }

  // ─── Aanmaken / Bewerken ────────────────────────────────────

  async function handleCreate() {
    setLoading(true); setError("");
    const payload = {
      name:            form.name.trim(),
      code:            form.autoCode ? undefined : (form.code.trim() || undefined),
      auto_code:       form.autoCode,
      description:     form.description.trim() || null,
      status:          form.status,
      theme_id:        form.theme_id        || null,
      process_id:      form.process_id      || null,
      process_type_id: form.process_type_id || null,
      customer_id:     form.customer_id     || null,
      team_id:         form.team_id         || null,
      start_date:      form.start_date      || null,
      end_date:        form.end_date        || null,
    };

    const isEdit = !!editProject;
    const url    = isEdit ? `/api/projects/${editProject.id}` : "/api/projects";
    const method = isEdit ? "PATCH" : "POST";

    const res  = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(payload),
    });
    const json = await res.json();
    setLoading(false);

    if (!res.ok) { setError(json.error ?? (isEdit ? "Opslaan mislukt" : "Aanmaken mislukt")); return; }

    if (isEdit) {
      onCreated(json);  // caller update de lijst
      onClose();
    } else {
      setCreated(json);
      setStep(5);
      onCreated(json);
    }
  }

  // ─── Geselecteerde labels voor bevestiging ───────────────────

  // ─── Team snel aanmaken ──────────────────────────────────────

  async function handleCreateTeam() {
    if (!newTeamName.trim()) { setNewTeamError("Teamnaam is verplicht"); return; }
    setNewTeamLoading(true); setNewTeamError("");
    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTeamName.trim() }),
      });
      const json = await res.json();
      if (!res.ok) { setNewTeamError(json.error ?? "Aanmaken mislukt"); return; }
      setTeams(prev => [json, ...prev]);
      set("team_id", json.id);
      setShowNewTeam(false);
      setNewTeamName("");
    } catch {
      setNewTeamError("Er ging iets mis");
    } finally {
      setNewTeamLoading(false);
    }
  }

  const selectedTheme   = hierarchy.find(t => t.id === form.theme_id);
  const selectedProcess = selectedTheme?.processes.find(p => p.id === form.process_id);
  const selectedCustomer = customers.find(c => c.id === form.customer_id);
  const selectedTeam     = teams.find(t => t.id === form.team_id);

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase())
  );

  // ─── Render ─────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col relative overflow-hidden">

        {step === 5 && <ConfettiCanvas />}

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-2 flex-shrink-0 relative z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-brand-50 flex items-center justify-center">
              <FolderKanban size={16} className="text-brand-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">
                {step < 5 ? "Nieuw project aanmaken" : "Project aangemaakt! 🎉"}
              </h3>
              <p className="text-xs text-slate-400">
                {step < 5 ? `Stap ${step} van 4 — ${STEPS[step - 1].label}` : created?.name}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100"><X size={16} /></button>
        </div>

        {/* Step indicator */}
        <div className="px-6 py-3 relative z-10">
          <StepIndicator current={step} total={5} />
        </div>

        {/* Body */}
        <div className="px-6 pb-2 flex-1 overflow-y-auto relative z-10">

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5 mb-4">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          {/* ── Stap 1: Identiteit ───────────────────────── */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Projectnaam *</label>
                <input
                  autoFocus
                  value={form.name}
                  onChange={e => set("name", e.target.value)}
                  onKeyDown={e => e.key === "Enter" && next()}
                  placeholder="bijv. ESS Implementatie Q1"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                />
              </div>

              {/* Projectcode */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Projectcode</label>
                <div className="flex items-center gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => set("autoCode", true)}
                    className={clsx(
                      "flex-1 py-2 rounded-xl border text-xs font-semibold transition-all",
                      form.autoCode
                        ? "bg-brand-50 border-brand-300 text-brand-700 ring-2 ring-brand-100"
                        : "border-slate-200 text-slate-500 hover:border-slate-300"
                    )}>
                    Automatisch (PRJ-0001)
                  </button>
                  <button
                    type="button"
                    onClick={() => set("autoCode", false)}
                    className={clsx(
                      "flex-1 py-2 rounded-xl border text-xs font-semibold transition-all",
                      !form.autoCode
                        ? "bg-brand-50 border-brand-300 text-brand-700 ring-2 ring-brand-100"
                        : "border-slate-200 text-slate-500 hover:border-slate-300"
                    )}>
                    Zelf invullen
                  </button>
                </div>
                {!form.autoCode && (
                  <input
                    value={form.code}
                    onChange={e => set("code", e.target.value)}
                    placeholder="bijv. PRJ-2024-Q1"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                  />
                )}
                {form.autoCode && (
                  <p className="text-xs text-slate-400 flex items-center gap-1">
                    Code wordt automatisch toegekend na aanmaken
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Beschrijving (optioneel)</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={e => set("description", e.target.value)}
                  placeholder="Wat is het doel van dit project?"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Status</label>
                <div className="flex gap-2">
                  {STATUS_OPTIONS.map(s => (
                    <button
                      key={s.value}
                      onClick={() => set("status", s.value)}
                      className={clsx(
                        "flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all",
                        form.status === s.value
                          ? `${s.bg} ${s.color} ring-2 ring-offset-1 ring-current`
                          : "border-slate-200 text-slate-500 hover:border-slate-300"
                      )}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Stap 2: Thema & submodule ────────────────── */}
          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-slate-500">Koppel een thema en submodule aan dit project. Dit is optioneel.</p>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Thema</label>
                <div className="grid grid-cols-2 gap-2">
                  {hierarchy.map(t => (
                    <button
                      key={t.id}
                      onClick={() => { set("theme_id", form.theme_id === t.id ? null : t.id); set("process_id", null); set("process_type_id", null); }}
                      className={clsx(
                        "flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-sm font-medium transition-all text-left",
                        form.theme_id === t.id
                          ? "bg-brand-50 border-brand-300 text-brand-700"
                          : "border-slate-200 text-slate-600 hover:border-brand-300 hover:bg-brand-50/40"
                      )}
                    >
                      <span className={clsx(
                        "w-2.5 h-2.5 rounded-full flex-shrink-0",
                        form.theme_id === t.id ? "bg-brand-500" : "bg-slate-300"
                      )} />
                      {t.name}
                      {form.theme_id === t.id && <Check size={13} className="ml-auto text-brand-600" />}
                    </button>
                  ))}
                </div>
              </div>

              {form.theme_id && (() => {
                const theme = hierarchy.find(t => t.id === form.theme_id);
                if (!theme || theme.processes.length === 0) return null;
                return (
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Submodule</label>
                    <div className="space-y-1.5">
                      {theme.processes.map(p => (
                        <button
                          key={p.id}
                          onClick={() => set("process_id", form.process_id === p.id ? null : p.id)}
                          className={clsx(
                            "w-full flex items-center gap-2 px-3.5 py-2 rounded-xl border text-sm transition-all text-left",
                            form.process_id === p.id
                              ? "bg-brand-50 border-brand-300 text-brand-700 font-medium"
                              : "border-slate-200 text-slate-600 hover:border-slate-300"
                          )}
                        >
                          <ChevronRight size={13} className="text-slate-400 flex-shrink-0" />
                          {p.name}
                          {form.process_id === p.id && <Check size={13} className="ml-auto text-brand-600" />}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {!form.theme_id && (
                <div className="flex items-center justify-center py-6 text-slate-400 text-sm">
                  <Layers size={20} className="mr-2 opacity-40" /> Selecteer eerst een thema
                </div>
              )}
            </div>
          )}

          {/* ── Stap 3: Klant ────────────────────────────── */}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-slate-500">Koppel een klant aan dit project. Dit is optioneel.</p>

              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={customerSearch}
                  onChange={e => setCustomerSearch(e.target.value)}
                  placeholder="Klant zoeken…"
                  className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                />
              </div>

              {/* Geen klant optie */}
              <button
                onClick={() => set("customer_id", null)}
                className={clsx(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm transition-all",
                  !form.customer_id
                    ? "bg-slate-100 border-slate-300 text-slate-700 font-medium"
                    : "border-slate-200 text-slate-400 hover:border-slate-300"
                )}
              >
                <div className="w-8 h-8 rounded-xl bg-slate-200 flex items-center justify-center">
                  <X size={14} className="text-slate-400" />
                </div>
                <span>Geen klant koppelen</span>
                {!form.customer_id && <Check size={13} className="ml-auto text-slate-600" />}
              </button>

              <div className="max-h-52 overflow-y-auto space-y-1.5">
                {filteredCustomers.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-6">Geen klanten gevonden</p>
                ) : filteredCustomers.map(c => (
                  <button
                    key={c.id}
                    onClick={() => set("customer_id", form.customer_id === c.id ? null : c.id)}
                    className={clsx(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm transition-all text-left",
                      form.customer_id === c.id
                        ? "bg-brand-50 border-brand-300 text-brand-700"
                        : "border-slate-200 text-slate-600 hover:border-slate-300"
                    )}
                  >
                    <div className="w-8 h-8 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0">
                      <Building2 size={14} className="text-brand-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{c.name}</p>
                      {(c as any).code && <p className="text-xs text-slate-400">{(c as any).code}</p>}
                    </div>
                    {form.customer_id === c.id && <Check size={13} className="text-brand-600 flex-shrink-0" />}
                  </button>
                ))}
              </div>

              {/* Nieuwe klant aanmaken */}
              <button
                onClick={() => setShowNewCustomer(true)}
                className="w-full flex items-center justify-center gap-2 mt-3 px-4 py-2.5 rounded-xl border border-dashed border-brand-300 text-sm text-brand-600 hover:bg-brand-50 transition-colors font-medium"
              >
                <Building2 size={14} />
                Nieuwe klant aanmaken
              </button>

              {/* CustomerWizard modal */}
              {showNewCustomer && (
                <CustomerWizard
                  onCreated={(newCustomer) => {
                    setCustomers(prev => [newCustomer, ...prev]);
                    set("customer_id", newCustomer.id);
                    setShowNewCustomer(false);
                  }}
                  onCancel={() => setShowNewCustomer(false)}
                />
              )}
            </div>
          )}

          {/* ── Stap 4: Team + deadlines ──────────────────── */}
          {step === 4 && (
            <div className="space-y-5">

              {/* Team koppelen */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Team koppelen (optioneel)</label>
                <div className="space-y-1.5">
                  <button
                    onClick={() => set("team_id", null)}
                    className={clsx(
                      "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border text-sm transition-all",
                      !form.team_id
                        ? "bg-slate-100 border-slate-300 text-slate-700 font-medium"
                        : "border-slate-200 text-slate-400 hover:border-slate-300"
                    )}
                  >
                    <div className="w-7 h-7 rounded-lg bg-slate-200 flex items-center justify-center">
                      <X size={12} className="text-slate-400" />
                    </div>
                    <span className="flex-1 text-left">Geen team</span>
                    {!form.team_id && <Check size={13} className="text-slate-600" />}
                  </button>

                  {teams.map(t => {
                    const memberCount = t.members?.length ?? 0;
                    return (
                      <button
                        key={t.id}
                        onClick={() => set("team_id", form.team_id === t.id ? null : t.id)}
                        className={clsx(
                          "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border text-sm transition-all text-left",
                          form.team_id === t.id
                            ? "bg-brand-50 border-brand-300 text-brand-700"
                            : "border-slate-200 text-slate-600 hover:border-slate-300"
                        )}
                      >
                        <div className="w-7 h-7 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0">
                          <Users size={13} className="text-brand-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{t.name}</p>
                          <p className="text-xs text-slate-400">
                            {memberCount} lid{memberCount !== 1 ? "en" : ""}
                            {t.leader && ` · ${t.leader.full_name}`}
                          </p>
                        </div>
                        {form.team_id === t.id && <Check size={13} className="text-brand-600 flex-shrink-0" />}
                      </button>
                    );
                  })}
                  {teams.length === 0 && !showNewTeam && (
                    <p className="text-sm text-slate-400 text-center py-3">Nog geen teams aangemaakt</p>
                  )}
                </div>

                {/* Team snel aanmaken */}
                {!showNewTeam ? (
                  <button
                    onClick={() => setShowNewTeam(true)}
                    className="w-full flex items-center justify-center gap-2 mt-3 px-4 py-2.5 rounded-xl border border-dashed border-brand-300 text-sm text-brand-600 hover:bg-brand-50 transition-colors font-medium"
                  >
                    <Users size={14} /> Nieuw team aanmaken
                  </button>
                ) : (
                  <div className="mt-3 p-4 rounded-xl border border-brand-200 bg-brand-50/50 space-y-3">
                    <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Nieuw team</p>
                    <input
                      autoFocus
                      value={newTeamName}
                      onChange={e => setNewTeamName(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && handleCreateTeam()}
                      placeholder="Teamnaam…"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                    />
                    {newTeamError && (
                      <p className="text-xs text-red-600">{newTeamError}</p>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={handleCreateTeam}
                        disabled={newTeamLoading}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-60 transition-colors"
                      >
                        {newTeamLoading ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                        Aanmaken
                      </button>
                      <button
                        onClick={() => { setShowNewTeam(false); setNewTeamName(""); setNewTeamError(""); }}
                        className="px-4 py-2 rounded-xl border border-slate-200 text-slate-500 text-sm hover:bg-slate-50 transition-colors"
                      >
                        Annuleren
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Deadlines */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Projectperiode (optioneel)</label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Startdatum</label>
                    <input
                      type="date"
                      value={form.start_date}
                      onChange={e => { set("start_date", e.target.value); if (form.end_date && e.target.value > form.end_date) set("end_date", e.target.value); }}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Einddatum</label>
                    <input
                      type="date"
                      value={form.end_date}
                      min={form.start_date}
                      onChange={e => set("end_date", e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Stap 5: Bevestiging ───────────────────────── */}
          {step === 5 && created && (
            <div className="space-y-4">
              {/* Samenvatting */}
              <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Samenvatting</p>
                {[
                  { label: "Code",     value: created.code ?? "—" },
                  { label: "Project",  value: created.name },
                  { label: "Status",   value: STATUS_OPTIONS.find(s => s.value === form.status)?.label },
                  { label: "Thema",    value: selectedTheme?.name ?? "—" },
                  { label: "Submodule",value: selectedProcess?.name ?? "—" },
                  { label: "Klant",    value: selectedCustomer?.name ?? "—" },
                  { label: "Team",     value: selectedTeam?.name ?? "—" },
                  { label: "Periode",  value: form.start_date ? `${form.start_date} → ${form.end_date || "geen einddatum"}` : "—" },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between text-sm">
                    <span className="text-slate-400 font-medium">{row.label}</span>
                    <span className="text-slate-700 font-semibold text-right max-w-[60%] truncate">{row.value || "—"}</span>
                  </div>
                ))}
              </div>

              {/* Snelkoppelingen */}
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Wat wil je nu doen?</p>
                <div className="space-y-2">
                  <button
                    onClick={() => { router.push(`/projects/${created.id}`); onClose(); }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors"
                  >
                    <ExternalLink size={15} /> Naar de projectpagina
                  </button>
                  <button
                    onClick={() => { router.push(`/projects/${created.id}?tab=members`); onClose(); }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
                  >
                    <Users size={15} className="text-brand-500" /> Teamleden toevoegen aan project
                  </button>
                  <button
                    onClick={() => { router.push(`/calendar?scope=mine`); onClose(); }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
                  >
                    <Calendar size={15} className="text-brand-500" /> Plannen op de kalender
                  </button>
                  <button
                    onClick={onClose}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 text-slate-500 text-sm hover:bg-slate-50 transition-colors"
                  >
                    <X size={15} /> Sluiten
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer navigatie */}
        {step < 5 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 flex-shrink-0">
            <button
              onClick={step === 1 ? onClose : prev}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm text-slate-500 hover:bg-slate-100 transition-colors"
            >
              <ChevronLeft size={15} />
              {step === 1 ? "Annuleren" : "Terug"}
            </button>

            <div className="flex items-center gap-2">
              {/* Overslaan (stap 2, 3, 4) */}
              {step > 1 && step < 5 && (
                <button
                  onClick={() => { setError(""); if (step < 4) setStep(s => s + 1); else handleCreate(); }}
                  className="px-4 py-2 rounded-xl text-sm text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Overslaan
                </button>
              )}
              <button
                onClick={next}
                disabled={loading}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors shadow-sm disabled:opacity-60"
              >
                {loading ? (
                  <><Loader2 size={14} className="animate-spin" /> Aanmaken…</>
                ) : step === 4 ? (
                  <><Sparkles size={14} /> Project aanmaken</>
                ) : (
                  <>Volgende <ChevronRight size={14} /></>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
