import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabaseServer";
import RapportagesClient from "./RapportagesClient";

export const metadata = { title: "Rapportages — NexSolve" };

export default async function RapportagesPage() {
  await requireAuth();
  const supabase = await createClient();

  const today    = new Date().toISOString().split("T")[0];
  const weekEnd  = new Date(Date.now() + 7  * 86400000).toISOString().split("T")[0];
  const monthEnd = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];

  const [{ data: projects }, { data: subprocesses }, { data: customers }] = await Promise.all([
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

  const ps  = (projects     ?? []) as any[];
  const sps = (subprocesses ?? []) as any[];
  const cs  = (customers    ?? []) as any[];

  // ── Per-project task map ──────────────────────────────────
  const taskMap: Record<string, { open: number; done: number; blocked: number; total: number; lastUpdated: number }> = {};
  for (const s of sps) {
    if (!taskMap[s.project_id]) taskMap[s.project_id] = { open: 0, done: 0, blocked: 0, total: 0, lastUpdated: 0 };
    taskMap[s.project_id].total++;
    const ts = new Date(s.updated_at ?? 0).getTime();
    if (ts > taskMap[s.project_id].lastUpdated) taskMap[s.project_id].lastUpdated = ts;
    if (s.status === "done")         taskMap[s.project_id].done++;
    else if (s.status === "blocked") taskMap[s.project_id].blocked++;
    else                             taskMap[s.project_id].open++;
  }

  function calcHealth(p: any): "good" | "attention" | "at_risk" {
    const t = taskMap[p.id];
    if (t?.blocked > 0) return "at_risk";
    if (p.end_date) {
      const d = Math.ceil((new Date(p.end_date).getTime() - Date.now()) / 86400000);
      if (d < 0) return "at_risk";
      if (d <= 3) return "attention";
    }
    if (t && t.total > 0 && (Date.now() - t.lastUpdated) / 86400000 > 7) return "attention";
    return "good";
  }

  const nonArchived = ps.filter(p => p.status !== "archived");

  const projectsWithHealth = nonArchived.map(p => ({
    id: p.id, name: p.name, status: p.status, end_date: p.end_date ?? null,
    customer: p.customer ?? null,
    tasks: taskMap[p.id] ?? { open: 0, done: 0, blocked: 0, total: 0, lastUpdated: 0 },
    health: calcHealth(p),
  }));

  const data = {
    projects: {
      total:     ps.length,
      active:    nonArchived.length,
      by_status: {
        active:        ps.filter(p => p.status === "active").length,
        "in-progress": ps.filter(p => p.status === "in-progress").length,
        archived:      ps.filter(p => p.status === "archived").length,
      },
      health: {
        good:      projectsWithHealth.filter(p => p.health === "good").length,
        attention: projectsWithHealth.filter(p => p.health === "attention").length,
        at_risk:   projectsWithHealth.filter(p => p.health === "at_risk").length,
      },
    },
    tasks: {
      total:     sps.length,
      open:      sps.filter(s => s.status === "todo" || s.status === "in-progress").length,
      by_status: {
        todo:          sps.filter(s => s.status === "todo").length,
        "in-progress": sps.filter(s => s.status === "in-progress").length,
        blocked:       sps.filter(s => s.status === "blocked").length,
        done:          sps.filter(s => s.status === "done").length,
      },
    },
    deadlines: {
      overdue:    nonArchived.filter(p => p.end_date && p.end_date < today).slice(0, 10),
      this_week:  nonArchived.filter(p => p.end_date && p.end_date >= today && p.end_date <= weekEnd).slice(0, 10),
      this_month: nonArchived.filter(p => p.end_date && p.end_date > weekEnd && p.end_date <= monthEnd).slice(0, 10),
    },
    customers: {
      total:  cs.length,
      active: cs.filter(c => c.status === "active").length,
      top_by_projects: (() => {
        const m: Record<string, { customer: any; count: number }> = {};
        ps.forEach(p => { if (p.customer?.id) { m[p.customer.id] = m[p.customer.id] ?? { customer: p.customer, count: 0 }; m[p.customer.id].count++; } });
        return Object.values(m).sort((a, b) => b.count - a.count).slice(0, 10);
      })(),
    },
    projects_with_health: projectsWithHealth,
  };

  return <RapportagesClient data={data} />;
}
