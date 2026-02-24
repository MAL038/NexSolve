import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";

/**
 * GET /api/export/pdf
 *
 * Query params:
 *   scope    = "all" | "theme:{themeId}" | "project:{projectId}"
 *   date     = ISO date string (YYYY-MM-DD) — filters to that day's activity
 *
 * Returns JSON that the client uses to render/download the PDF via jsPDF.
 * (Server-side PDF generation would require puppeteer which isn't available here.)
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const scope    = searchParams.get("scope") ?? "all";
  const dateStr  = searchParams.get("date");  // e.g. "2025-03-15"

  // ── Build projects query ──────────────────────────────────
  let query = supabase
    .from("projects")
    .select(`
      id, name, description, status, created_at, updated_at,
      theme_id, process_id,
      customer:customers(name),
      owner:profiles!projects_owner_id_fkey(full_name, email),
      subprocesses(id, title, status, created_at),
      project_members(user_id, role, profile:profiles(full_name, email))
    `)
    .order("created_at", { ascending: false });

  // Scope filter
  if (scope.startsWith("project:")) {
    query = query.eq("id", scope.replace("project:", ""));
  } else if (scope.startsWith("theme:")) {
    query = query.eq("theme_id", scope.replace("theme:", ""));
  }

  // Date filter on updated_at (activity on that day)
  if (dateStr) {
    const start = `${dateStr}T00:00:00.000Z`;
    const end   = `${dateStr}T23:59:59.999Z`;
    query = query.gte("updated_at", start).lte("updated_at", end);
  }

  const { data: projects, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Fetch theme labels
  const { data: themes } = await supabase
    .from("themes")
    .select("id, name, processes(id, name)");

  // Build theme lookup
  const themeMap: Record<string, string> = {};
  const processMap: Record<string, string> = {};
  (themes ?? []).forEach((t: any) => {
    themeMap[t.id] = t.name;
    (t.processes ?? []).forEach((p: any) => { processMap[p.id] = p.name; });
  });

  // Enrich projects
  const enriched = (projects ?? []).map((p: any) => ({
    ...p,
    theme_name:   p.theme_id   ? themeMap[p.theme_id]     : null,
    process_name: p.process_id ? processMap[p.process_id] : null,
    customer_name: p.customer?.name ?? null,
    owner_name:    p.owner?.full_name ?? null,
    subprocesses_done:  (p.subprocesses ?? []).filter((s: any) => s.status === "done").length,
    subprocesses_total: (p.subprocesses ?? []).length,
  }));

  return NextResponse.json({
    exported_at: new Date().toISOString(),
    scope,
    date_filter: dateStr ?? null,
    count: enriched.length,
    projects: enriched,
  });
}
