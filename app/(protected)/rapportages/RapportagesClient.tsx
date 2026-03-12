"use client";

import React, { useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import {
  BarChart2, FolderKanban, CheckSquare, AlertTriangle,
  Building2, ArrowRight, AlertCircle, CheckCircle2,
  TrendingUp, Clock,
} from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";

// ─── Types ────────────────────────────────────────────────────

type Health = "good" | "attention" | "at_risk";

interface ProjectRow {
  id:       string;
  name:     string;
  status:   string;
  end_date: string | null;
  health:   Health;
  customer: { id: string; name: string } | null;
  tasks:    { open: number; done: number; blocked: number; total: number };
}

interface RapportagesData {
  projects: {
    total:     number;
    active:    number;
    by_status: { active: number; "in-progress": number; archived: number };
    health:    { good: number; attention: number; at_risk: number };
  };
  tasks: {
    total:     number;
    open:      number;
    by_status: { todo: number; "in-progress": number; blocked: number; done: number };
  };
  deadlines: {
    overdue:    any[];
    this_week:  any[];
    this_month: any[];
  };
  customers: {
    total:           number;
    active:          number;
    top_by_projects: Array<{ customer: { id: string; name: string }; count: number }>;
  };
  projects_with_health: ProjectRow[];
}

// ─── Health config ────────────────────────────────────────────
const HEALTH_CFG: Record<Health, { label: string; dot: string; text: string; bg: string; border: string }> = {
  good:      { label: "Op schema", dot: "bg-emerald-400", text: "text-emerald-700", bg: "bg-emerald-50",  border: "border-emerald-200" },
  attention: { label: "Let op",    dot: "bg-amber-400",   text: "text-amber-700",   bg: "bg-amber-50",    border: "border-amber-200"   },
  at_risk:   { label: "Risico",    dot: "bg-red-400",     text: "text-red-700",     bg: "bg-red-50",      border: "border-red-200"     },
};

// ─── Tabs ─────────────────────────────────────────────────────
type Tab = "overzicht" | "projecten" | "taken" | "deadlines" | "klanten";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "overzicht",  label: "Overzicht",  icon: BarChart2      },
  { id: "projecten",  label: "Projecten",  icon: FolderKanban   },
  { id: "taken",      label: "Taken",      icon: CheckSquare    },
  { id: "deadlines",  label: "Deadlines",  icon: AlertTriangle  },
  { id: "klanten",    label: "Klanten",    icon: Building2      },
];

// ─── Helpers ──────────────────────────────────────────────────
function pct(n: number, total: number) {
  return total > 0 ? Math.round((n / total) * 100) : 0;
}

function deadlineDays(end_date: string) {
  return Math.ceil((new Date(end_date).getTime() - Date.now()) / 86400000);
}

// ─── Sub-components ───────────────────────────────────────────

function StatCard({
  icon: Icon, value, label, sub, color,
}: { icon: React.ElementType; value: number; label: string; sub?: string; color: string }) {
  return (
    <div className="card p-5">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${color}`}>
        <Icon size={16} />
      </div>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
      <p className="text-xs font-semibold text-slate-600 mt-0.5">{label}</p>
      {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function HealthBar({ good, attention, at_risk }: { good: number; attention: number; at_risk: number }) {
  const total = good + attention + at_risk;
  if (total === 0) return (
    <div className="card p-5">
      <p className="text-sm font-semibold text-slate-700 mb-3">Project gezondheid</p>
      <p className="text-xs text-slate-400">Nog geen actieve projecten.</p>
    </div>
  );
  return (
    <div className="card p-5">
      <p className="text-sm font-semibold text-slate-700 mb-4">Project gezondheid</p>
      <div className="flex h-3 rounded-full overflow-hidden gap-0.5 mb-4">
        {good      > 0 && <div className="bg-emerald-400 rounded-l-full" style={{ width: `${pct(good, total)}%` }} />}
        {attention > 0 && <div className="bg-amber-400"                  style={{ width: `${pct(attention, total)}%` }} />}
        {at_risk   > 0 && <div className="bg-red-400 rounded-r-full"     style={{ width: `${pct(at_risk, total)}%` }} />}
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        {([
          { label: "Op schema",  value: good,      dot: "bg-emerald-400", text: "text-emerald-700", bg: "bg-emerald-50"  },
          { label: "Let op",     value: attention, dot: "bg-amber-400",   text: "text-amber-700",   bg: "bg-amber-50"    },
          { label: "Risico",     value: at_risk,   dot: "bg-red-400",     text: "text-red-700",     bg: "bg-red-50"      },
        ] as const).map(item => (
          <div key={item.label} className={`flex items-center gap-2 p-2 rounded-xl ${item.bg}`}>
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${item.dot}`} />
            <div>
              <p className={`font-bold text-sm leading-tight ${item.text}`}>{item.value}</p>
              <p className={`text-[10px] font-medium ${item.text} opacity-80`}>{item.label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TasksBreakdown({ by_status, total }: { by_status: RapportagesData["tasks"]["by_status"]; total: number }) {
  const bars = [
    { label: "Te doen",       key: "todo"         as const, color: "bg-slate-300",   bg: "bg-slate-50"   },
    { label: "In uitvoering", key: "in-progress"  as const, color: "bg-amber-400",   bg: "bg-amber-50"   },
    { label: "Geblokkeerd",   key: "blocked"      as const, color: "bg-red-400",     bg: "bg-red-50"     },
    { label: "Afgerond",      key: "done"         as const, color: "bg-emerald-400", bg: "bg-emerald-50" },
  ];
  return (
    <div className="card p-5">
      <p className="text-sm font-semibold text-slate-700 mb-4">Taken per status</p>
      {total === 0 ? (
        <p className="text-xs text-slate-400">Nog geen taken aangemaakt.</p>
      ) : (
        <div className="space-y-3">
          {bars.map(b => {
            const n = by_status[b.key];
            return (
              <div key={b.key}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-slate-600">{b.label}</span>
                  <span className="text-xs font-bold text-slate-700">{n} <span className="text-slate-400 font-normal">({pct(n, total)}%)</span></span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${b.color}`} style={{ width: `${pct(n, total)}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Hoofd component ──────────────────────────────────────────

export default function RapportagesClient({ data }: { data: RapportagesData }) {
  const [activeTab, setActiveTab] = useState<Tab>("overzicht");

  const { projects, tasks, deadlines, customers, projects_with_health } = data;

  return (
    <div className="space-y-6">

      {/* ── Header ──────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Rapportages</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Inzicht in projecten, taken, deadlines en klanten
        </p>
      </div>

      {/* ── Tabs ────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 border-b border-slate-100 pb-0 -mb-2">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                "flex items-center gap-2 px-3.5 py-2.5 text-sm font-medium rounded-t-xl transition-all border-b-2",
                activeTab === tab.id
                  ? "text-brand-600 border-brand-500 bg-brand-50/50"
                  : "text-slate-500 border-transparent hover:text-slate-700 hover:bg-slate-50"
              )}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Overzicht tab ───────────────────────────────────── */}
      {activeTab === "overzicht" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={FolderKanban} value={projects.active}    label="Actieve projecten"  sub={`${projects.by_status.archived} gearchiveerd`} color="bg-brand-50 text-brand-600" />
            <StatCard icon={CheckSquare}  value={tasks.open}         label="Open taken"         sub={`${tasks.by_status.done} afgerond`}            color="bg-amber-50 text-amber-600" />
            <StatCard icon={AlertCircle}  value={tasks.by_status.blocked} label="Geblokkeerd"   sub={tasks.by_status.blocked > 0 ? "Actie vereist" : "Alles loopt goed"} color={tasks.by_status.blocked > 0 ? "bg-red-50 text-red-500" : "bg-slate-50 text-slate-400"} />
            <StatCard icon={Building2}    value={customers.total}    label="Klanten"            sub={`${customers.active} actief`}                  color="bg-violet-50 text-violet-600" />
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <HealthBar
              good={projects.health.good}
              attention={projects.health.attention}
              at_risk={projects.health.at_risk}
            />
            <TasksBreakdown by_status={tasks.by_status} total={tasks.total} />
          </div>

          {/* Aandacht + deadlines samenvatting */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* At-risk projecten */}
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-red-50 flex items-center justify-center">
                    <AlertCircle size={13} className="text-red-500" />
                  </div>
                  <p className="text-sm font-semibold text-slate-700">Projecten met risico</p>
                </div>
                <button onClick={() => setActiveTab("projecten")} className="text-xs text-brand-500 hover:text-brand-600 font-medium flex items-center gap-1">
                  Alles <ArrowRight size={11} />
                </button>
              </div>
              {projects_with_health.filter(p => p.health !== "good").length === 0 ? (
                <div className="flex items-center gap-2 py-3 text-xs text-emerald-600">
                  <CheckCircle2 size={14} />
                  <span>Alle projecten lopen op schema.</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {projects_with_health.filter(p => p.health !== "good").slice(0, 5).map(p => {
                    const hcfg = HEALTH_CFG[p.health];
                    return (
                      <Link key={p.id} href={`/projects/${p.id}`} className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors group">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${hcfg.dot}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-700 truncate group-hover:text-brand-600">{p.name}</p>
                          {p.customer && <p className="text-xs text-slate-400">{p.customer.name}</p>}
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-lg flex-shrink-0 ${hcfg.bg} ${hcfg.text}`}>{hcfg.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Deadline samenvatting */}
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-amber-50 flex items-center justify-center">
                    <Clock size={13} className="text-amber-500" />
                  </div>
                  <p className="text-sm font-semibold text-slate-700">Deadlines</p>
                </div>
                <button onClick={() => setActiveTab("deadlines")} className="text-xs text-brand-500 hover:text-brand-600 font-medium flex items-center gap-1">
                  Alles <ArrowRight size={11} />
                </button>
              </div>
              <div className="space-y-2">
                {[
                  { label: "Verlopen",     items: deadlines.overdue,    color: "bg-red-50 text-red-700 border-red-100"     },
                  { label: "Deze week",    items: deadlines.this_week,  color: "bg-amber-50 text-amber-700 border-amber-100"},
                  { label: "Deze maand",   items: deadlines.this_month, color: "bg-slate-100 text-slate-600 border-slate-200"},
                ].map(({ label, items, color }) => (
                  <div key={label} className={`flex items-center justify-between px-3 py-2.5 rounded-xl border ${color}`}>
                    <span className="text-xs font-medium">{label}</span>
                    <span className="text-sm font-bold">{items.length} project{items.length !== 1 ? "en" : ""}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Projecten tab ───────────────────────────────────── */}
      {activeTab === "projecten" && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {([
              { label: "Actief",        value: projects.by_status.active,        color: "bg-brand-50 text-brand-700"  },
              { label: "In uitvoering", value: projects.by_status["in-progress"], color: "bg-amber-50 text-amber-700"  },
              { label: "Gearchiveerd",  value: projects.by_status.archived,      color: "bg-slate-100 text-slate-600" },
            ] as const).map(item => (
              <div key={item.label} className={`card p-4 ${item.color}`}>
                <p className="text-2xl font-bold">{item.value}</p>
                <p className="text-xs font-semibold mt-0.5 opacity-80">{item.label}</p>
              </div>
            ))}
          </div>

          <div className="card overflow-hidden">
            {/* Thead */}
            <div className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-4 px-5 py-3 border-b border-slate-100 bg-slate-50/60 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
              <span className="w-2" />
              <span>Project</span>
              <span className="hidden sm:block w-28 text-center">Status</span>
              <span className="hidden md:block w-24 text-right">Taken</span>
              <span className="w-6" />
            </div>

            {projects_with_health.length === 0 ? (
              <div className="px-5 py-10 text-center text-xs text-slate-400">
                Geen actieve projecten gevonden.
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {projects_with_health.map(p => {
                  const hcfg = HEALTH_CFG[p.health];
                  const t = p.tasks;
                  const progress = t.total > 0 ? Math.round((t.done / t.total) * 100) : 0;
                  return (
                    <Link
                      key={p.id}
                      href={`/projects/${p.id}`}
                      className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-4 px-5 py-3.5 hover:bg-slate-50/60 transition-colors group"
                    >
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${hcfg.dot}`} title={hcfg.label} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-700 truncate group-hover:text-brand-600 transition-colors">{p.name}</p>
                        {p.customer && <p className="text-xs text-slate-400 truncate">{p.customer.name}</p>}
                      </div>
                      <div className="hidden sm:block w-28 flex justify-center">
                        <StatusBadge status={p.status as any} />
                      </div>
                      <div className="hidden md:flex flex-col items-end gap-1 w-24">
                        <span className="text-xs text-slate-500 font-medium">{t.done}/{t.total}</span>
                        <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${progress === 100 ? "bg-emerald-400" : "bg-brand-400"}`} style={{ width: `${progress}%` }} />
                        </div>
                      </div>
                      <ArrowRight size={12} className="text-slate-300 group-hover:text-brand-400 transition-colors" />
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Taken tab ───────────────────────────────────────── */}
      {activeTab === "taken" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {([
              { label: "Te doen",       value: tasks.by_status.todo,          color: "bg-slate-100 text-slate-700", sub: `${pct(tasks.by_status.todo, tasks.total)}% van totaal`        },
              { label: "In uitvoering", value: tasks.by_status["in-progress"], color: "bg-amber-50 text-amber-700",  sub: `${pct(tasks.by_status["in-progress"], tasks.total)}% van totaal`},
              { label: "Geblokkeerd",   value: tasks.by_status.blocked,       color: tasks.by_status.blocked > 0 ? "bg-red-50 text-red-700" : "bg-slate-50 text-slate-500", sub: tasks.by_status.blocked > 0 ? "Vereist actie" : "Geen blokkades" },
              { label: "Afgerond",      value: tasks.by_status.done,          color: "bg-emerald-50 text-emerald-700", sub: `${pct(tasks.by_status.done, tasks.total)}% van totaal`    },
            ] as const).map(item => (
              <div key={item.label} className={`card p-5 ${item.color}`}>
                <p className="text-2xl font-bold">{item.value}</p>
                <p className="text-xs font-semibold mt-0.5">{item.label}</p>
                <p className="text-[10px] opacity-70 mt-0.5">{item.sub}</p>
              </div>
            ))}
          </div>

          <TasksBreakdown by_status={tasks.by_status} total={tasks.total} />

          {/* Projecten met de meeste open taken */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-slate-700">Meeste open taken per project</p>
              <Link href="/taken" className="text-xs text-brand-500 hover:text-brand-600 font-medium flex items-center gap-1">
                Alle taken <ArrowRight size={11} />
              </Link>
            </div>
            {projects_with_health.filter(p => p.tasks.open > 0).length === 0 ? (
              <div className="flex items-center gap-2 py-3 text-xs text-emerald-600">
                <CheckCircle2 size={14} />
                <span>Geen openstaande taken.</span>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {projects_with_health
                  .filter(p => p.tasks.open > 0)
                  .sort((a, b) => b.tasks.open - a.tasks.open)
                  .slice(0, 8)
                  .map(p => (
                    <Link key={p.id} href={`/projects/${p.id}`} className="flex items-center gap-3 py-3 hover:text-brand-600 group transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700 truncate group-hover:text-brand-600">{p.name}</p>
                        {p.customer && <p className="text-xs text-slate-400">{p.customer.name}</p>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {p.tasks.blocked > 0 && (
                          <span className="text-[10px] font-bold bg-red-50 text-red-600 px-2 py-0.5 rounded-lg">
                            {p.tasks.blocked} geblokkeerd
                          </span>
                        )}
                        <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-xl">
                          {p.tasks.open} open
                        </span>
                      </div>
                    </Link>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Deadlines tab ───────────────────────────────────── */}
      {activeTab === "deadlines" && (
        <div className="space-y-6">
          {[
            { key: "overdue"    as const, label: "Verlopen deadlines",   color: "border-red-200 bg-red-50/30", badge: "bg-red-100 text-red-700",       icon: AlertCircle,   iconColor: "text-red-500" },
            { key: "this_week"  as const, label: "Deze week",            color: "border-amber-200 bg-amber-50/30", badge: "bg-amber-100 text-amber-700", icon: Clock,         iconColor: "text-amber-500" },
            { key: "this_month" as const, label: "Deze maand",           color: "border-slate-200",            badge: "bg-slate-100 text-slate-600",   icon: TrendingUp,    iconColor: "text-slate-400" },
          ].map(section => {
            const items = deadlines[section.key];
            return (
              <div key={section.key} className={`card p-5 border ${section.color}`}>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-7 h-7 rounded-xl bg-white/60 flex items-center justify-center">
                    <section.icon size={13} className={section.iconColor} />
                  </div>
                  <p className="text-sm font-semibold text-slate-700">{section.label}</p>
                  <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${section.badge}`}>
                    {items.length}
                  </span>
                </div>
                {items.length === 0 ? (
                  <p className="text-xs text-slate-400 py-2">Geen projecten in deze periode.</p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {items.map((p: any) => {
                      const days = p.end_date ? deadlineDays(p.end_date) : null;
                      return (
                        <Link
                          key={p.id}
                          href={`/projects/${p.id}`}
                          className="flex items-center gap-3 py-2.5 hover:opacity-80 transition-opacity group"
                        >
                          {days !== null && (
                            <span className={clsx(
                              "text-[11px] font-bold px-2 py-1 rounded-lg shrink-0 min-w-[52px] text-center",
                              days < 0 ? "bg-red-100 text-red-700" : days <= 3 ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"
                            )}>
                              {days < 0 ? `${Math.abs(days)}d over` : days === 0 ? "Vandaag" : `${days}d`}
                            </span>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-700 truncate group-hover:text-brand-600">{p.name}</p>
                            {p.customer && <p className="text-xs text-slate-400">{p.customer.name}</p>}
                          </div>
                          <StatusBadge status={p.status} />
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Klanten tab ─────────────────────────────────────── */}
      {activeTab === "klanten" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <StatCard icon={Building2} value={customers.total}  label="Totaal klanten" sub={`${customers.active} actief`}                            color="bg-violet-50 text-violet-600" />
            <StatCard icon={FolderKanban} value={projects.total} label="Totaal projecten" sub={`${projects.active} actief`}                           color="bg-brand-50 text-brand-600"   />
          </div>

          <div className="card overflow-hidden">
            <div className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-5 py-3 border-b border-slate-100 bg-slate-50/60 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
              <span>Klant</span>
              <span className="w-24 text-center">Projecten</span>
              <span className="w-6" />
            </div>
            {customers.top_by_projects.length === 0 ? (
              <div className="px-5 py-10 text-center text-xs text-slate-400">
                Nog geen klanten met projecten.
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {customers.top_by_projects.map(({ customer, count }) => (
                  <Link
                    key={customer.id}
                    href={`/customers/${customer.id}`}
                    className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-5 py-3.5 hover:bg-slate-50/60 transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
                        <Building2 size={13} className="text-violet-500" />
                      </div>
                      <p className="text-sm font-medium text-slate-700 truncate group-hover:text-brand-600 transition-colors">
                        {customer.name}
                      </p>
                    </div>
                    <span className="text-xs font-bold bg-brand-50 text-brand-700 px-2.5 py-1 rounded-xl w-24 text-center">
                      {count} project{count !== 1 ? "en" : ""}
                    </span>
                    <ArrowRight size={12} className="text-slate-300 group-hover:text-brand-400 transition-colors" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
