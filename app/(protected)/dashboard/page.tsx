import { Suspense } from "react";
import { createClient } from "@/lib/supabaseServer";
import { getCurrentProfile } from "@/lib/auth";
import { formatDate } from "@/lib/time";
import {
  FolderKanban, CheckCircle2, Building2,
  Plus, AlertTriangle, TrendingUp, ArrowRight,
  CheckSquare, AlertCircle, FileText,
} from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import Link from "next/link";
import type { Customer, Project, Subprocess } from "@/types";
import { ActivityFeed } from "@/components/activity/ActivityFeed";

export const metadata = { title: "Dashboard" };

// ─── Project health helper ────────────────────────────────────
type HealthStatus = "good" | "attention" | "at_risk";

function projectHealth(
  project: { id: string; end_date?: string | null },
  sps: Array<{ project_id: string; status: string; updated_at?: string }>
): HealthStatus {
  const projectSps = sps.filter(s => s.project_id === project.id);
  if (projectSps.some(s => s.status === "blocked")) return "at_risk";
  if (project.end_date) {
    const daysLeft = Math.ceil((new Date(project.end_date).getTime() - Date.now()) / 86400000);
    if (daysLeft < 0) return "at_risk";
    if (daysLeft <= 3) return "attention";
  }
  if (projectSps.length > 0) {
    const lastUpdate = Math.max(...projectSps.map(s => new Date((s as any).updated_at ?? 0).getTime()));
    if ((Date.now() - lastUpdate) / 86400000 > 7) return "attention";
  }
  return "good";
}

const HEALTH_CFG: Record<HealthStatus, { label: string; dot: string; text: string; bg: string }> = {
  good:      { label: "Op schema", dot: "bg-emerald-400", text: "text-emerald-700", bg: "bg-emerald-50"  },
  attention: { label: "Let op",    dot: "bg-amber-400",   text: "text-amber-700",   bg: "bg-amber-50"    },
  at_risk:   { label: "Risico",    dot: "bg-red-400",     text: "text-red-700",     bg: "bg-red-50"      },
};

// ─── Deadline urgency helper ──────────────────────────────────
function deadlineUrgency(endDate: string): { label: string; color: string; bg: string; days: number } {
  const days = Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000);
  if (days < 0)  return { label: "Verlopen",  color: "text-red-600",   bg: "bg-red-50",    days };
  if (days === 0) return { label: "Vandaag",   color: "text-red-600",   bg: "bg-red-50",    days };
  if (days <= 3)  return { label: `${days}d`,  color: "text-red-500",   bg: "bg-red-50",    days };
  if (days <= 7)  return { label: `${days}d`,  color: "text-amber-600", bg: "bg-amber-50",  days };
  return               { label: `${days}d`,  color: "text-slate-500", bg: "bg-slate-100", days };
}

// ─── Openstaande taken — eigen async component (Suspense boundary) ──
async function OpenTasksSection() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("subprocesses")
    .select("id, title, status, project_id, projects(name)")
    .in("status", ["todo", "in-progress"])
    .order("updated_at", { ascending: true })
    .limit(6);

  const tasks = (data as any[]) ?? [];

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-xl bg-emerald-50 flex items-center justify-center">
          <CheckSquare size={14} className="text-emerald-500" />
        </div>
        <h2 className="font-semibold text-slate-700 text-sm">Openstaande taken</h2>
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-6">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 size={22} className="text-emerald-500" />
          </div>
          <p className="text-sm font-semibold text-slate-700">Alles afgehandeld 🎉</p>
          <p className="text-xs text-slate-400 mt-1">Geen openstaande deeltaken.</p>
          <Link
            href="/projects"
            className="inline-flex items-center gap-1 text-xs text-brand-500 hover:text-brand-600 mt-3 font-medium"
          >
            Projecten bekijken <ArrowRight size={11} />
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map(s => (
            <Link
              key={s.id}
              href={`/projects/${s.project_id}`}
              className="flex items-start gap-2.5 p-2.5 rounded-xl hover:bg-slate-50 transition-colors group"
            >
              <span className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${
                s.status === "in-progress" ? "bg-amber-400" : "bg-slate-300"
              }`} />
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-700 truncate group-hover:text-brand-600 transition-colors">
                  {s.title}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">{s.projects?.name}</p>
              </div>
            </Link>
          ))}
          <Link href="/taken" className="block text-center text-xs text-brand-500 hover:text-brand-600 pt-1 font-medium flex items-center justify-center gap-1">
            Alle taken bekijken <ArrowRight size={11} />
          </Link>
        </div>
      )}
    </div>
  );
}

// ─── Skeleton terwijl OpenTasksSection laadt ──────────────────
function OpenTasksSkeleton() {
  return (
    <div className="card p-5 animate-pulse">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-xl bg-slate-100" />
        <div className="h-4 w-36 bg-slate-100 rounded-lg" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-start gap-2.5 p-2.5">
            <div className="mt-1 w-2 h-2 rounded-full bg-slate-100 flex-shrink-0" />
            <div className="flex-1 space-y-1">
              <div className="h-3.5 bg-slate-100 rounded w-full" />
              <div className="h-3 bg-slate-50 rounded w-24" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Hoofd dashboard pagina ───────────────────────────────────
export default async function DashboardPage() {
  const supabase = await createClient();
  const profile  = await getCurrentProfile();

  // ── Kritieke data parallel ophalen (openstaande taken gaan via Suspense) ──
  const [
    { data: projectsRaw },
    { data: customersRaw },
    { data: teamRaw },
    { data: subprocessesRaw },
  ] = await Promise.all([
    supabase
      .from("projects")
      .select("*, customer:customers(id, name)")
      .order("created_at", { ascending: false }),
    supabase.from("customers").select("id, name, created_at").order("name"),
    supabase.from("profiles").select("id, full_name, avatar_url, role").order("full_name"),
    supabase.from("subprocesses").select("id, project_id, status, title, updated_at"),
  ]);

  const ps  = (projectsRaw  as Project[])      ?? [];
  const cs  = (customersRaw as Customer[])     ?? [];
  const sps = (subprocessesRaw as Subprocess[]) ?? [];

  // ── Stats ────────────────────────────────────────────────
  const active       = ps.filter(p => p.status === "active").length;
  const inProgress   = ps.filter(p => p.status === "in-progress").length;
  const archived     = ps.filter(p => p.status === "archived").length;
  const openTasks    = sps.filter(s => s.status === "todo" || s.status === "in-progress").length;
  const doneTasks    = sps.filter(s => s.status === "done").length;
  const blockedTasks = sps.filter(s => s.status === "blocked").length;

  // ── Deadlines binnen 14 dagen ────────────────────────────
  const upcoming = ps
    .filter(p => p.status !== "archived" && (p as any).end_date)
    .map(p => ({ ...p, urgency: deadlineUrgency((p as any).end_date) }))
    .filter(p => p.urgency.days <= 14)
    .sort((a, b) => a.urgency.days - b.urgency.days)
    .slice(0, 5);

  // ── Voortgang + health per project (top 6 actieve) ───────
  const activeProjects = ps
    .filter(p => p.status !== "archived")
    .slice(0, 6)
    .map(p => {
      const projectSps = sps.filter(s => s.project_id === p.id);
      const done  = projectSps.filter(s => s.status === "done").length;
      const total = projectSps.length;
      const pct   = total > 0 ? Math.round((done / total) * 100) : 0;
      const health = projectHealth({ id: p.id, end_date: (p as any).end_date }, sps as any);
      return { ...p, done, total, pct, health };
    });

  // ── Projecten die aandacht vereisen ──────────────────────
  const attentionProjects = activeProjects.filter(p => p.health !== "good").slice(0, 4);

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
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200
                       text-sm text-slate-600 hover:border-slate-300 hover:bg-slate-50 transition-colors font-medium"
          >
            <Plus size={14} /> Klant
          </Link>
          <Link
            href="/projects?new=1"
            className="btn-primary inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl
                       text-sm font-medium hover:bg-brand-700 transition-colors"
          >
            <Plus size={14} /> Nieuw project
          </Link>
        </div>
      </div>

      {/* ── Stats row ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={FolderKanban} label="Actieve projecten"  value={active + inProgress}
          sub={`${archived} gearchiveerd`}              color="bg-brand-50 text-brand-600"    />
        <StatCard icon={CheckSquare}  label="Open taken"         value={openTasks}
          sub={`${doneTasks} afgerond`}                 color="bg-amber-50 text-amber-600"    />
        <StatCard icon={AlertCircle}  label="Geblokkeerde taken" value={blockedTasks}
          sub={blockedTasks > 0 ? "Actie vereist" : "Alles loopt goed"}
          color={blockedTasks > 0 ? "bg-red-50 text-red-500" : "bg-slate-50 text-slate-400"} />
        <StatCard icon={Building2}    label="Klanten"            value={cs.length}
          sub={`${teamRaw?.length ?? 0} teamleden`}    color="bg-violet-50 text-violet-600"  />
      </div>

      {/* ── Aandacht vereist ─────────────────────────────────── */}
      {attentionProjects.length > 0 && (
        <div className="card p-5 border-amber-100 bg-amber-50/30">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-xl bg-amber-100 flex items-center justify-center">
              <AlertTriangle size={14} className="text-amber-600" />
            </div>
            <h2 className="font-semibold text-slate-700 text-sm">Aandacht vereist</h2>
            <span className="ml-auto text-xs text-amber-700 font-bold bg-amber-100 px-2 py-0.5 rounded-full">
              {attentionProjects.length}
            </span>
          </div>
          <div className="grid sm:grid-cols-2 gap-2">
            {attentionProjects.map(p => {
              const hcfg = HEALTH_CFG[p.health as HealthStatus];
              return (
                <Link
                  key={p.id}
                  href={`/projects/${p.id}`}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/80 transition-colors group bg-white/50 border border-white"
                >
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${hcfg.dot}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate group-hover:text-brand-600 transition-colors">{p.name}</p>
                    {(p as any).customer && (
                      <p className="text-xs text-slate-400 truncate">{(p as any).customer.name}</p>
                    )}
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-lg flex-shrink-0 ${hcfg.bg} ${hcfg.text}`}>
                    {hcfg.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Hoofdgrid: links 2/3, rechts 1/3 ───────────────── */}
      <div className="grid lg:grid-cols-3 gap-6">

        {/* Links: deadlines + project voortgang + klanten */}
        <div className="lg:col-span-2 space-y-6">

          {/* Naderende deadlines */}
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
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-2xl bg-brand-50 flex items-center justify-center mx-auto mb-3">
                  <FolderKanban size={20} className="text-brand-400" />
                </div>
                <p className="text-sm font-semibold text-slate-700">Nog geen actieve projecten</p>
                <p className="text-xs text-slate-400 mt-1">Start je eerste project om de voortgang te volgen.</p>
                <Link
                  href="/projects?new=1"
                  className="btn-primary inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 text-white text-xs font-semibold hover:bg-brand-700 transition-colors mt-4"
                >
                  <Plus size={12} /> Nieuw project aanmaken
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {activeProjects.map(p => {
                  const hcfg = HEALTH_CFG[p.health as HealthStatus];
                  return (
                  <Link key={p.id} href={`/projects/${p.id}`} className="block group">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${hcfg.dot}`} title={hcfg.label} />
                        <p className="text-sm font-medium text-slate-700 truncate group-hover:text-brand-600 transition-colors">
                          {p.name}
                        </p>
                        {(p as any).customer && (
                          <span className="text-xs text-slate-400 truncate shrink-0">· {(p as any).customer.name}</span>
                        )}
                      </div>
                      <span className="text-xs text-slate-500 font-medium ml-3 shrink-0">
                        {p.done}/{p.total}
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
                  );
                })}
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
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-2xl bg-violet-50 flex items-center justify-center mx-auto mb-3">
                  <Building2 size={20} className="text-violet-400" />
                </div>
                <p className="text-sm font-semibold text-slate-700">Nog geen klanten</p>
                <p className="text-xs text-slate-400 mt-1">Voeg je eerste klant toe om te beginnen.</p>
                <Link
                  href="/customers?new=1"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 text-xs text-slate-600 font-semibold hover:bg-slate-50 transition-colors mt-4"
                >
                  <Plus size={12} /> Klant toevoegen
                </Link>
              </div>
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

        {/* Rechts: quick links + openstaande taken + activiteit */}
        <div className="space-y-6">

          {/* Quick links */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { href: "/taken",      icon: CheckSquare, label: "Taken",      color: "text-amber-600 bg-amber-50"  },
              { href: "/documenten", icon: FileText,    label: "Documenten", color: "text-blue-600 bg-blue-50"    },
            ].map(item => (
              <Link
                key={item.href}
                href={item.href}
                className="card p-3.5 flex flex-col items-center gap-2 hover:border-brand-200 hover:bg-brand-50/30 transition-all group text-center"
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${item.color}`}>
                  <item.icon size={15} />
                </div>
                <span className="text-xs font-semibold text-slate-600 group-hover:text-brand-700 transition-colors">
                  {item.label}
                </span>
              </Link>
            ))}
          </div>

          {/* Openstaande taken via Suspense — laadt onafhankelijk */}
          <Suspense fallback={<OpenTasksSkeleton />}>
            <OpenTasksSection />
          </Suspense>

          {/* Activiteitenfeed — eigen client fetch */}
          <ActivityFeed
            limit={10}
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
