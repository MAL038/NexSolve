// app/api/teams/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireApiContext } from "@/lib/apiContext";
import { z } from "zod";

const teamSchema = z.object({
  name:        z.string().min(1, "Naam is verplicht").max(100),
  description: z.string().max(500).optional().or(z.literal("")),
  leader_id:   z.string().uuid().optional().nullable(),
  member_ids:  z.array(z.string().uuid()).optional(),
});

async function requireCanManageTeams(supabase: any) {
  const { data: ok } = await supabase.rpc("can_manage_teams");
  return !!ok;
}

// GET /api/teams
export async function GET() {
  const ctx = await requireApiContext({ module: "team" });
  if (!ctx.ok) return ctx.res;
  const { supabase, orgId: ctxOrgId } = ctx;

  const { data, error } = await supabase
    .from("teams")
    .select(`
      *,
      leader:profiles!teams_leader_id_fkey(id, full_name, avatar_url),
      members:team_members(
        team_id, user_id, added_at,
        profile:profiles!team_members_user_id_fkey(id, full_name, email, avatar_url, role)
      )
    `)
    .eq("org_id", ctxOrgId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// POST /api/teams
export async function POST(req: NextRequest) {
  const ctx = await requireApiContext({ module: "team", minRole: "org.admin" });
  if (!ctx.ok) return ctx.res;
  const { supabase, user, orgId: ctxOrgId } = ctx;

  const canManage = await requireCanManageTeams(supabase);
  if (!canManage) {
    return NextResponse.json({ error: "Geen toestemming om teams aan te maken" }, { status: 403 });
  }

  const body = await req.json();
  const result = teamSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
  }

  const { member_ids, ...teamData } = result.data;

  // Team aanmaken
  const { data: team, error: teamErr } = await supabase
    .from("teams")
    .insert({
      ...teamData,
      org_id: ctxOrgId,
      description: teamData.description || null,
      created_by: user.id,
    })
    .select("*")
    .single();

  if (teamErr) return NextResponse.json({ error: teamErr.message }, { status: 500 });

  // Leden toevoegen
  const allMemberIds = new Set<string>(member_ids ?? []);
  if (teamData.leader_id) allMemberIds.add(teamData.leader_id); // teamleider is altijd lid

  if (allMemberIds.size > 0) {
    const memberRows = Array.from(allMemberIds).map((uid) => ({
      org_id: ctxOrgId,
      team_id: team.id,
      user_id: uid,
    }));
    await supabase.from("team_members").insert(memberRows);
  }

  // Return team met leden
  const { data: full } = await supabase
    .from("teams")
    .select(`
      *,
      leader:profiles!teams_leader_id_fkey(id, full_name, avatar_url),
      members:team_members(
        team_id, user_id, added_at,
        profile:profiles!team_members_user_id_fkey(id, full_name, email, avatar_url, role)
      )
    `)
    .eq("id", team.id)
    .eq("org_id", ctxOrgId)
    .single();

  return NextResponse.json(full, { status: 201 });
}
