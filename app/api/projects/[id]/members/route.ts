import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";
import { z } from "zod";

const addMemberSchema = z.object({
  user_id: z.string().uuid("Invalid user ID"),
  role:    z.enum(["member", "admin"]).default("member"),
});

interface Params { params: { id: string } }

export async function GET(_: NextRequest, { params }: Params) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("project_members")
    .select("*, profile:profiles(full_name, email, avatar_url)")
    .eq("project_id", params.id)
    .order("added_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest, { params }: Params) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify caller is project owner (RLS will also enforce, this gives a nicer error)
  const { data: project } = await supabase
    .from("projects")
    .select("owner_id")
    .eq("id", params.id)
    .single();

  if (!project) return NextResponse.json({ error: "Project niet gevonden" }, { status: 404 });
  if (project.owner_id !== user.id)
    return NextResponse.json({ error: "Only the project owner can add members" }, { status: 403 });

  const body = await req.json();
  const result = addMemberSchema.safeParse(body);
  if (!result.success)
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 });

  // Prevent adding the owner as a member (they already have full access)
  if (result.data.user_id === user.id)
    return NextResponse.json({ error: "Eigenaar is al lid van dit project" }, { status: 409 });

  const { data, error } = await supabase
    .from("project_members")
    .insert({ project_id: params.id, ...result.data })
    .select("*, profile:profiles(full_name, email, avatar_url)")
    .single();

  if (error) {
    // Unique constraint = already a member
    if (error.code === "23505")
      return NextResponse.json({ error: "User is already a member" }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
