// app/api/teams/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireApiContext } from "@/lib/apiContext";
import { z } from "zod";

const updateSchema = z.object({
  name:        z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().or(z.literal("")),
  leader_id:   z.string().uuid().optional().nullable(),
});

const membersSchema = z.object({
  action:  z.enum(["add", "remove"]),
  user_id: z.string().uuid(),
});

async function canManageTeam(supabase: any, orgId: string, userId: string, teamId: string, isSuperuser: boolean) {
  if (isSuperuser) return true;

  const { data: team, error } = await supabase
    .from("teams")
    .select("id, org_id, leader_id, created_by")
    .eq("id", teamId)
    .maybeSingle();

  if (error || !team) return false;
  if (team.org_id && team.org_id !== orgId) return false;

  return team.leader_id === userId || team.created_by === userId;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<Record<string, string>> },
) {
  const { id } = await params;

  const ctx = await requireApiContext({ module: "team" });
  if (!ctx.ok) return ctx.res;
  const { supabase, user, orgId: ctxOrgId, isSuperuser } = ctx;

  const allowed = await canManageTeam(supabase, ctxOrgId, user.id, id, isSuperuser);
  if (!allowed) return NextResponse.json({ error: "Geen toestemming" }, { status: 403 });

  const body = await req.json();

  // Members beheren (add/remove)
  if ("action" in body) {
    const result = membersSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
    }

    if (result.data.action === "add") {
      await supabase.from("team_members").upsert(
        { org_id: ctxOrgId, team_id: id, user_id: result.data.user_id },
        { onConflict: "team_id,user_id" },
      );
    } else {
      await supabase
        .from("team_members")
        .delete()
        .eq("team_id", id)
        .eq("user_id", result.data.user_id)
        .eq("org_id", ctxOrgId);
    }

    const { data } = await supabase
      .from("teams")
      .select(`*,
        leader:profiles!teams_leader_id_fkey(id, full_name, avatar_url),
        members:team_members(team_id, user_id, added_at,
          profile:profiles!team_members_user_id_fkey(id, full_name, email, avatar_url, role)
        )`)
      .eq("id", id)
      .eq("org_id", ctxOrgId)
      .single();

    return NextResponse.json(data);
  }

  // Team gegevens updaten
  const result = updateSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("teams")
    .update({ ...result.data, description: result.data.description || null })
    .eq("id", id)
    .eq("org_id", ctxOrgId)
    .select(`*,
      leader:profiles!teams_leader_id_fkey(id, full_name, avatar_url),
      members:team_members(team_id, user_id, added_at,
        profile:profiles!team_members_user_id_fkey(id, full_name, email, avatar_url, role)
      )`)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
