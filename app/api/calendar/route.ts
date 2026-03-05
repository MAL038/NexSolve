// app/api/calendar/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireApiContext } from "@/lib/api";
import { z } from "zod";

const eventSchema = z.object({
  title:      z.string().min(1, "Titel is verplicht").max(200),
  type:       z.enum(["verlof", "niet_beschikbaar"]).default("verlof"),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ongeldige datum"),
  end_date:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ongeldige datum"),
  notes:      z.string().max(500).optional().or(z.literal("")),
});

// GET /api/calendar?scope=mine|team|org&month=2026-02
export async function GET(req: NextRequest) {
  const auth = await requireApiContext();
  if (!auth.ok) return auth.res;
  const { supabase, user } = auth.ctx;
  const { searchParams } = new URL(req.url);
  const scope = searchParams.get("scope") ?? "mine";
  const month = searchParams.get("month"); // bijv. "2026-02"

  // Datumrange op basis van maand (± 1 maand buffer voor kalenderweergave)
  let startFilter: string | undefined;
  let endFilter: string | undefined;
  if (month) {
    const [year, mon] = month.split("-").map(Number);
    const start = new Date(year, mon - 2, 1); // vorige maand
    const end   = new Date(year, mon + 1, 0); // volgende maand einde
    startFilter = start.toISOString().slice(0, 10);
    endFilter   = end.toISOString().slice(0, 10);
  }

  let query = supabase
    .from("calendar_events")
    .select(`
      *,
      profile:profiles!calendar_events_user_id_fkey(id, full_name, avatar_url, role)
    `)
    .order("start_date", { ascending: true });

  // Datumfilter
  if (startFilter) query = query.gte("start_date", startFilter);
  if (endFilter)   query = query.lte("end_date",   endFilter);

  // Scope-filter
  if (scope === "mine") {
    query = query.eq("user_id", user.id);
  } else if (scope === "team") {
    // Haal user IDs op van alle teamgenoten via project_members
    const { data: memberships } = await supabase
      .from("project_members")
      .select("user_id")
      .neq("user_id", user.id);
    const ownerIds = [user.id]; // eigen events altijd tonen

    // Projecten waarvan huidige user eigenaar is → alle members zichtbaar
    const { data: ownedProjects } = await supabase
      .from("projects")
      .select("id")
      .eq("owner_id", user.id);
    const ownedProjectIds = (ownedProjects ?? []).map(p => p.id);

    let teamUserIds = new Set<string>([user.id]);
    if (ownedProjectIds.length > 0) {
      const { data: teamMembers } = await supabase
        .from("project_members")
        .select("user_id")
        .in("project_id", ownedProjectIds);
      (teamMembers ?? []).forEach(m => teamUserIds.add(m.user_id));
    }

    // Eigen team = projecten waar user zelf member van is
    const { data: myMemberships } = await supabase
      .from("project_members")
      .select("project_id")
      .eq("user_id", user.id);
    if (myMemberships && myMemberships.length > 0) {
      const { data: sameProjectMembers } = await supabase
        .from("project_members")
        .select("user_id")
        .in("project_id", myMemberships.map(m => m.project_id));
      (sameProjectMembers ?? []).forEach(m => teamUserIds.add(m.user_id));
    }

    query = query.in("user_id", Array.from(teamUserIds));
  }
  // scope === "org": geen extra filter → alle events (RLS regelt de rest)

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// POST /api/calendar
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const result = eventSchema.safeParse(body);
  if (!result.success)
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 });

  const { data, error } = await supabase
    .from("calendar_events")
    .insert({
      ...result.data,
      user_id: user.id,
      notes: result.data.notes || null,
    })
    .select(`*, profile:profiles!calendar_events_user_id_fkey(id, full_name, avatar_url, role)`)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
