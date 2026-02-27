import { createClient } from "@/lib/supabaseServer";
import { getCurrentProfile } from "@/lib/auth";
import { formatDate, relativeTime } from "@/lib/time";
import {
  FolderKanban, Users, CheckCircle2, Building2,
  Plus, AlertTriangle, TrendingUp, Clock, ArrowRight,
  CalendarClock, CheckSquare, XCircle,
} from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import Link from "next/link";
import type { Customer, Project, Subprocess } from "@/types";
import { ActivityFeed } from "@/components/activity/ActivityFeed";

export const metadata = { title: "Dashboard" };

// ─── Deadline urgency helper ──────────────────────────────────
function deadlineUrgency(endDate: string): { label: string; color: string; bg: string; days: number } {
  const days = Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000);
  if (days < 0)  return { label: "Verlopen",        color: "text-red-600",    bg: "bg-red-50",    days };
  if (days === 0) return { label: "Vandaag",         color: "text-red-600",    bg: "bg-red-50",    days };
  if (days <= 3)  return { label: `${days}d`,        color: "text-red-500",    bg: "bg-red-50",    days };
  if (days <= 7)  return { label: `${days}d`,        color: "text-amber-600",  bg: "bg-amber-50",  days };
  return               { label: `${days}d`,          color: "text-slate-500",  bg: "bg-slate-100", days };
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const profile  = await getCurrentProfile();
  const today    = new Date().toISOString().split("T")[0];

  // ── Alle data parallel ophalen ────────────────────────────
  const [
    { data: projectsRaw },
    { data: customersRaw },
    { data: teamRaw },
    { data: subprocessesRaw },
    { data: mySubprocessesRaw },
  ] = await Promise.all([
    supabase
      .from("projects")
      .select("*, customer:customers(id, name)")
      .order("created_at", { ascending: false }),
    supabase.from("customers").select("id, name, created_at").order("name"),
    supabase.from("profiles").select("id, full_name, avatar_url, role").order("full_name"),
    // Alle subprocesses voor voortgangsberekening
    supabase.from("subprocesses").select("id, project_id, status, title"),
    // Mijn openstaande taken (todo + in-progress op projecten waar ik bij zit)
    supabase
      .from("subprocesses")
      .select("id, title, status, project_id, projects(name)")
      .in("status", ["todo", "in-progress"])
      .order("updated_at", { ascending: true })
      .limit(5),
  ]);

  const ps  = (projectsRaw  as Project[])    ?? [];
  const cs  = (customersRaw as Customer[])   ?? [];
  const sps = (subprocessesRaw as Subprocess[]) ?? [];

  // ── Stats ────────────────────────────────────────────────
  const active      = ps.filter(p => p.status === "active").length;
  const inProgress  = ps.filter(p => p.status === "in-progress").length;
  const archived    = ps.filter(p => p.status === "archived").length;
  const totalTasks  = sps.length;
  const doneTasks   = sps.filter(s => s.status === "done").length;
  const blockedTasks= sps.filter(s => s.status === "blocked").length;

  // ── Deadlines binnen 14 dagen ────────────────────────────
  const upcoming = ps
    .filter(p => p.status !== "archived" && (p as any).end_date)
    .map(p => ({ ...p, urgency: deadlineUrgency((p as any).end_date) }))
    .filter(p => p.urgency.days <= 14)
    .sort((a, b) => a.urgency.days - b.urgency.days)
    .slice(0, 5);

  // ── Voortgang per project (top 4 actieve) ────────────────
  const activeProjects = ps
    .filter(p => p.status !== "archived")
    .slice(0, 4)
    .map(p => {
      const projectSps = sps.filter(s => s.project_id === p.id);
      const done = projectSps.filter(s => s.status === "done").length;
      const total = projectSps.length;
      const pct = total > 0 ? Math.round((done / total) * 100) : 0;
      return { ...p, done, total, pct };
    });

  // ── Klanten met meeste projecten ─────────────────────────
  const customerMap: Record<string, number> = {};
  ps.forEach(p => {
    if (p.customer_id) customerMap[p.customer_id] = (customerMap[p.customer_id] ?? 0) + 1;
  });

  const topCustomers = cs
    .map(c => ({ ...c, projectCount: customerMap[c.id] ?? 0 }))
    .sort((a, b) => b.projectCount - a.projectCount)
    .slice(0, 4);

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            {getGreeting()}, {profile?.full_name?.split(" ")[0] ?? "daar"} 👋
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            {new Date().toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/customers?new=1"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:border-slate-300 hover:bg-slate-50 transition-colors font-medium"
          >
            <Plus size={14} /> Klant
          </Link>
          <Link
            href="/projects?new=1"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors"
          >
            <Plus size={14} /> Nieuw project
          </Link>
        </div>
      </div>

      {/* ── Stats row ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={FolderKanban} label="Actieve projecten"  value={active + inProgress}  sub={`${archived} gearchiveerd`}    color="bg-brand-50 text-brand-600"   />
        <StatCard icon={CheckCircle2} label="Taken gereed"       value={doneTasks}             sub={`van ${totalTasks} totaal`}    color="bg-emerald-50 text-emerald-600"/>
        <StatCard icon={XCircle}      label="Geblokkeerde taken" value={blockedTasks}          sub={blockedTasks > 0 ? "Actie vereist" : "Alles loopt goed"} color={blockedTasks > 0 ? "bg-red-50 text-red-500" : "bg-slate-50 text-slate-400"} />
        <StatCard icon={Building2}    label="Klanten"            value={cs.length}             sub={`${teamRaw?.length ?? 0} teamleden`}  color="bg-violet-50 text-violet-600" />
      </div>

      {/* ── Hoofdgrid: links 2/3, rechts 1/3 ───────────────── */}
      <div className="grid lg:grid-cols-3 gap-6">

        {/* Links: projecten + voortgang */}
        <div className="lg:col-span-2 space-y-6">

          {/* Deadlines */}
          {upcoming.length > 0 && (
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-xl bg-amber-50 flex items-center justify-center">
                  <AlertTriangle size={14} className="text-amber-500" />
                </div>
                <h2 className="font-semibold text-slate-700 text-sm">Naderende deadlines</h2>
              </div>
              <div className="space-y-2">
                {upcoming.map(p => (
                  <Link
                    key={p.id}
                    href={`/projects/${p.id}`}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors group"
                  >
                    <span className={`text-xs font-bold px-2 py-1 rounded-lg min-w-[44px] text-center ${p.urgency.bg} ${p.urgency.color}`}>
                      {p.urgency.label}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate group-hover:text-brand-600 transition-colors">{p.name}</p>
                      {(p as any).customer && (
                        <p className="text-xs text-slate-400 truncate">{(p as any).customer.name}</p>
                      )}
                    </div>
                    <StatusBadge status={p.status} />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Projectvoortgang */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-brand-50 flex items-center justify-center">
                  <TrendingUp size={14} className="text-brand-500" />
                </div>
                <h2 className="font-semibold text-slate-700 text-sm">Projectvoortgang</h2>
              </div>
              <Link href="/projects" className="text-xs text-brand-500 hover:text-brand-600 font-medium flex items-center gap-1">
                Alles <ArrowRight size={11} />
              </Link>
            </div>

            {activeProjects.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">
                Geen actieve projecten. <Link href="/projects?new=1" className="text-brand-500">Maak er een aan →</Link>
              </p>
            ) : (
              <div className="space-y-4">
                {activeProjects.map(p => (
                  <Link key={p.id} href={`/projects/${p.id}`} className="block group">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <p className="text-sm font-medium text-slate-700 truncate group-hover:text-brand-600 transition-colors">
                          {p.name}
                        </p>
                        {(p as any).customer && (
                          <span className="text-xs text-slate-400 truncate shrink-0">· {(p as any).customer.name}</span>
                        )}
                      </div>
                      <span className="text-xs text-slate-500 font-medium ml-3 shrink-0">
                        {p.done}/{p.total} taken
                      </span>
                    </div>
                    {p.total > 0 ? (
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            p.pct === 100 ? "bg-emerald-500" :
                            p.pct >= 50   ? "bg-brand-500"   :
                            "bg-amber-400"
                          }`}
                          style={{ width: `${p.pct}%` }}
                        />
                      </div>
                    ) : (
                      <div className="w-full bg-slate-100 rounded-full h-1.5">
                        <div className="h-full w-0" />
                      </div>
                    )}
                    <p className="text-[10px] text-slate-400 mt-1">
                      {p.total === 0 ? "Nog geen deeltaken" : `${p.pct}% voltooid`}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Top klanten */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-violet-50 flex items-center justify-center">
                  <Building2 size={14} className="text-violet-500" />
                </div>
                <h2 className="font-semibold text-slate-700 text-sm">Klanten</h2>
              </div>
              <Link href="/customers" className="text-xs text-brand-500 hover:text-brand-600 font-medium flex items-center gap-1">
                Alles <ArrowRight size={11} />
              </Link>
            </div>
            {topCustomers.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">
                Nog geen klanten. <Link href="/customers" className="text-brand-500">Voeg er een toe →</Link>
              </p>
            ) : (
              <div className="divide-y divide-slate-50">
                {topCustomers.map(c => (
                  <Link key={c.id} href={`/customers/${c.id}`} className="flex items-center gap-3 py-2.5 hover:text-brand-600 group transition-colors">
                    <div className="w-8 h-8 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
                      <Building2 size={13} className="text-violet-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate group-hover:text-brand-600 transition-colors">{c.name}</p>
                      <p className="text-xs text-slate-400">Klant sinds {formatDate(c.created_at)}</p>
                    </div>
                    <span className="text-xs text-slate-400 bg-slate-100 rounded-full px-2.5 py-1 font-medium shrink-0">
                      {c.projectCount} project{c.projectCount !== 1 ? "en" : ""}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Rechts: openstaande taken + activiteit */}
        <div className="space-y-6">

          {/* Openstaande taken */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-xl bg-emerald-50 flex items-center justify-center">
                <CheckSquare size={14} className="text-emerald-500" />
              </div>
              <h2 className="font-semibold text-slate-700 text-sm">Openstaande taken</h2>
            </div>
            {!mySubprocessesRaw || mySubprocessesRaw.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">Geen openstaande taken 🎉</p>
            ) : (
              <div className="space-y-2">
                {(mySubprocessesRaw as any[]).map(s => (
                  <Link
                    key={s.id}
                    href={`/projects/${s.project_id}`}
                    className="flex items-start gap-2.5 p-2.5 rounded-xl hover:bg-slate-50 transition-colors group"
                  >
                    <span className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${
                      s.status === "in-progress" ? "bg-amber-400" : "bg-slate-300"
                    }`} />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-700 truncate group-hover:text-brand-600 transition-colors">{s.title}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{s.projects?.name}</p>
                    </div>
                  </Link>
                ))}
                <Link href="/projects" className="block text-center text-xs text-brand-500 hover:text-brand-600 pt-1 font-medium">
                  Alle projecten bekijken →
                </Link>
              </div>
            )}
          </div>

          {/* Activiteitenfeed compact */}
          <ActivityFeed
            limit={10}
            compact
            title="Recente activiteit"
          />
        </div>
      </div>
    </div>
  );
}

// ─── StatCard ─────────────────────────────────────────────────
function StatCard({
  icon: Icon, label, value, sub, color,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  sub: string;
  color: string;
}) {
  return (
    <div className="card p-5">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${color}`}>
        <Icon size={17} />
      </div>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
      <p className="text-xs font-medium text-slate-600 mt-0.5">{label}</p>
      <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>
    </div>
  );
}

// ─── Greeting ─────────────────────────────────────────────────
function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Goedemorgen";
  if (h < 18) return "Goedemiddag";
  return "Goedenavond";
}
