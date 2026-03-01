// app/api/teams/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";
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

async function guardTeam(supabase: Awaited<ReturnType<typeof createClient>>, teamId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role === "admin" || profile?.role === "superuser") return user;

  const { data: team } = await supabase
    .from("teams").select("leader_id, created_by").eq("id", teamId).single();
  if (!team) return null;
  if (team.leader_id === user.id || team.created_by === user.id) return user;

  return null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<Record<string, string>> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const user = await guardTeam(supabase, id);
  if (!user) return NextResponse.json({ error: "Geen toestemming" }, { status: 403 });

  const body = await req.json();

  // Members beheren (add/remove)
  if ("action" in body) {
    const result = membersSchema.safeParse(body);
    if (!result.success) return NextResponse.json({ error: result.error.flatten() }, { status: 400 });

    if (result.data.action === "add") {
      await supabase.from("team_members")
        .upsert({ team_id: id, user_id: result.data.user_id }, { onConflict: "team_id,user_id" });
    } else {
      await supabase.from("team_members")
        .delete().eq("team_id", id).eq("user_id", result.data.user_id);
    }

    const { data } = await supabase
      .from("teams")
      .select(`*, leader:profiles!teams_leader_id_fkey(id, full_name, avatar_url),
        members:team_members(team_id, user_id, added_at,
          profile:profiles!team_members_user_id_fkey(id, full_name, email, avatar_url, role))`)
      .eq("id", id).single();
    return NextResponse.json(data);
  }

  // Team gegevens updaten
  const result = updateSchema.safeParse(body);
  if (!result.success) return NextResponse.json({ error: result.error.flatten() }, { status: 400 });

  const { data, error } = await supabase
    .from("teams")
    .update({ ...result.data, description: result.data.description || null })
    .eq("id", id)
    .select(`*, leader:profiles!teams_leader_id_fkey(id, full_name, avatar_url),
      members:team_members(team_id, user_id, added_at,
        profile:profiles!team_members_user_id_fkey(id, full_name, email, avatar_url, role))`)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<Record<string, string>> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const user = await guardTeam(supabase, id);
  if (!user) return NextResponse.json({ error: "Geen toestemming" }, { status: 403 });

  const { error } = await supabase.from("teams").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
