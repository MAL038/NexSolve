/**
 * GET /api/rapportages
 *
 * Aggregeert statistieken voor de rapportagesmodule:
 * projecten, taken, deadlines en klanten — op basis van de org van de gebruiker.
 */
import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/api";

// ─── Health helper (spiegelt dashboard logica) ────────────────
type Health = "good" | "attention" | "at_risk";

function calcHealth(
  project: { id: string; end_date?: string | null },
  taskMap: Record<string, { open: number; done: number; blocked: number; total: number; lastUpdated: number }>
): Health {
  const t = taskMap[project.id];
  if (t?.blocked > 0) return "at_risk";
  if (project.end_date) {
    const daysLeft = Math.ceil((new Date(project.end_date).getTime() - Date.now()) / 86400000);
    if (daysLeft < 0) return "at_risk";
    if (daysLeft <= 3) return "attention";
  }
  if (t && t.total > 0) {
    if ((Date.now() - t.lastUpdated) / 86400000 > 7) return "attention";
  }
  return "good";
}

export async function GET() {
  const auth = await requireApiContext();
  if (!auth.ok) return auth.res;
  const { supabase } = auth.ctx;

  const today    = new Date().toISOString().split("T")[0];
  const weekEnd  = new Date(Date.now() + 7  * 86400000).toISOString().split("T")[0];
  const monthEnd = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];

  const [projectsRes, subprocessesRes, customersRes] = await Promise.allSettled([
    supabase
      .from("projects")
      .select("id, name, status, end_date, customer:customers(id, name)")
      .order("name"),

    supabase
      .from("subprocesses")
      .select("id, project_id, status, updated_at")
      .order("updated_at", { ascending: false }),

    supabase
      .from("customers")
      .select("id, name, status"),
  ]);

  const projects     = projectsRes.status     === "fulfilled" ? (projectsRes.value.data     ?? []) : [];
  const subprocesses = subprocessesRes.status === "fulfilled" ? (subprocessesRes.value.data ?? []) : [];
  const customers    = customersRes.status    === "fulfilled" ? (customersRes.value.data    ?? []) : [];

  // ── Per-project task map ─────────────────────────────────
  const taskMap: Record<string, { open: number; done: number; blocked: number; total: number; lastUpdated: number }> = {};
  for (const s of subprocesses) {
    if (!taskMap[s.project_id]) {
      taskMap[s.project_id] = { open: 0, done: 0, blocked: 0, total: 0, lastUpdated: 0 };
    }
    taskMap[s.project_id].total++;
    const ts = new Date(s.updated_at ?? 0).getTime();
    if (ts > taskMap[s.project_id].lastUpdated) taskMap[s.project_id].lastUpdated = ts;
    if (s.status === "done")    taskMap[s.project_id].done++;
    else if (s.status === "blocked") taskMap[s.project_id].blocked++;
    else                        taskMap[s.project_id].open++;
  }

  // ── Projects breakdown ───────────────────────────────────
  const nonArchived = projects.filter(p => p.status !== "archived");
  const projectsByStatus = {
    active:        projects.filter(p => p.status === "active").length,
    "in-progress": projects.filter(p => p.status === "in-progress").length,
    archived:      projects.filter(p => p.status === "archived").length,
  };

  const projectsWithHealth = nonArchived.map(p => ({
    id:       p.id,
    name:     p.name,
    status:   p.status,
    end_date: p.end_date ?? null,
    customer: (p as any).customer ?? null,
    tasks:    taskMap[p.id] ?? { open: 0, done: 0, blocked: 0, total: 0, lastUpdated: 0 },
    health:   calcHealth(p, taskMap),
  }));

  const healthBreakdown = {
    good:      projectsWithHealth.filter(p => p.health === "good").length,
    attention: projectsWithHealth.filter(p => p.health === "attention").length,
    at_risk:   projectsWithHealth.filter(p => p.health === "at_risk").length,
  };

  // ── Tasks breakdown ──────────────────────────────────────
  const tasksByStatus = {
    todo:          subprocesses.filter(s => s.status === "todo").length,
    "in-progress": subprocesses.filter(s => s.status === "in-progress").length,
    blocked:       subprocesses.filter(s => s.status === "blocked").length,
    done:          subprocesses.filter(s => s.status === "done").length,
  };

  // ── Deadlines ────────────────────────────────────────────
  const withDeadline = nonArchived.filter(p => p.end_date);
  const deadlines = {
    overdue:    withDeadline.filter(p => p.end_date! < today).slice(0, 10),
    this_week:  withDeadline.filter(p => p.end_date! >= today && p.end_date! <= weekEnd).slice(0, 10),
    this_month: withDeadline.filter(p => p.end_date! > weekEnd && p.end_date! <= monthEnd).slice(0, 10),
  };

  // ── Customer project counts ──────────────────────────────
  const custMap: Record<string, { customer: { id: string; name: string }; count: number }> = {};
  for (const p of projects) {
    const c = (p as any).customer;
    if (c?.id) {
      custMap[c.id] = custMap[c.id] ?? { customer: c, count: 0 };
      custMap[c.id].count++;
    }
  }
  const topCustomers = Object.values(custMap).sort((a, b) => b.count - a.count).slice(0, 10);

  return NextResponse.json({
    projects: {
      total:     projects.length,
      active:    nonArchived.length,
      by_status: projectsByStatus,
      health:    healthBreakdown,
    },
    tasks: {
      total:     subprocesses.length,
      open:      tasksByStatus.todo + tasksByStatus["in-progress"],
      by_status: tasksByStatus,
    },
    deadlines,
    customers: {
      total:            customers.length,
      active:           customers.filter(c => c.status === "active").length,
      top_by_projects:  topCustomers,
    },
    projects_with_health: projectsWithHealth,
  });
}
