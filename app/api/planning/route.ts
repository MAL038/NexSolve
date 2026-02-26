// app/api/planning/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";
import { z } from "zod";

const planningSchema = z.object({
  project_id: z.string().uuid("Ongeldig project"),
  user_id:    z.string().uuid("Ongeldige gebruiker"),
  date:       z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ongeldige datum"),
  hours:      z.number().min(0.5, "Minimaal 0.5 uur").max(24, "Maximaal 24 uur"),
  notes:      z.string().max(300).optional().or(z.literal("")),
});

// ─── Autorisatiecheck ─────────────────────────────────────────
async function canPlan(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, projectId: string) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (profile?.role === "admin" || profile?.role === "superuser") return true;

  const { data: project } = await supabase
    .from("projects")
    .select("owner_id")
    .eq("id", projectId)
    .single();

  if (project?.owner_id === userId) return true;

  const { data: membership } = await supabase
    .from("project_members")
    .select("role")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .maybeSingle();

  return membership?.role === "admin";
}

// GET /api/planning?month=2026-02&scope=mine|team|org
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month");
  const scope = searchParams.get("scope") ?? "mine";

  let startFilter: string | undefined;
  let endFilter:   string | undefined;
  if (month) {
    const [year, mon] = month.split("-").map(Number);
    startFilter = new Date(year, mon - 2, 1).toISOString().slice(0, 10);
    endFilter   = new Date(year, mon + 1, 0).toISOString().slice(0, 10);
  }

  let query = supabase
    .from("project_planning")
    .select(`
      *,
      project:projects!project_planning_project_id_fkey(id, name, status),
      user:profiles!project_planning_user_id_fkey(id, full_name, avatar_url, role)
    `)
    .order("date", { ascending: true });

  if (startFilter) query = query.gte("date", startFilter);
  if (endFilter)   query = query.lte("date", endFilter);

  if (scope === "mine") {
    query = query.eq("user_id", user.id);
  }
  // team / org: geen extra filter — RLS en applicatielaag regelen zichtbaarheid

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// POST /api/planning
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const result = planningSchema.safeParse(body);
  if (!result.success)
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 });

  // Autorisatiecheck
  const allowed = await canPlan(supabase, user.id, result.data.project_id);
  if (!allowed)
    return NextResponse.json({ error: "Geen toestemming om in te plannen op dit project" }, { status: 403 });

  // Capaciteitscheck: wat staat er al gepland voor deze persoon op deze dag?
  const { data: existing } = await supabase
    .from("project_planning")
    .select("hours")
    .eq("user_id", result.data.user_id)
    .eq("date",    result.data.date);

  const totalExisting = (existing ?? []).reduce((sum, r) => sum + Number(r.hours), 0);
  const newTotal      = totalExisting + result.data.hours;

  // We slaan het op ook al is het over capaciteit — maar retourneren een waarschuwing
  const { data, error } = await supabase
    .from("project_planning")
    .insert({
      project_id: result.data.project_id,
      user_id:    result.data.user_id,
      planned_by: user.id,
      date:       result.data.date,
      hours:      result.data.hours,
      notes:      result.data.notes || null,
    })
    .select(`
      *,
      project:projects!project_planning_project_id_fkey(id, name, status),
      user:profiles!project_planning_user_id_fkey(id, full_name, avatar_url, role)
    `)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(
    { ...data, warning: newTotal > 8 ? `${result.data.user_id} heeft nu ${newTotal}u gepland op ${result.data.date} (max 8u)` : null },
    { status: 201 }
  );
}
