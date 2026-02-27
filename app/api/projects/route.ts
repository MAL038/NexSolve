// app/api/projects/route.ts  — vervang de bestaande versie volledig
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";
import { z } from "zod";

const projectSchema = z.object({
  name:            z.string().min(1, "Naam is verplicht").max(200),
  description:     z.string().max(2000).optional().or(z.literal("")),
  status:          z.enum(["active", "in-progress", "archived"]).default("active"),
  customer_id:     z.string().uuid().optional().nullable(),
  theme_id:        z.string().uuid().optional().nullable(),
  process_id:      z.string().uuid().optional().nullable(),
  process_type_id: z.string().uuid().optional().nullable(),
  team_id:         z.string().uuid().optional().nullable(),
  start_date:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  end_date:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
});

// GET /api/projects
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const themeSlug   = searchParams.get("theme");
  const processSlug = searchParams.get("process");

  let query = supabase
    .from("projects")
    .select(`
      *,
      customer:customers!projects_customer_id_fkey(id, name),
      owner:profiles!projects_owner_id_fkey(full_name, email, avatar_url),
      project_members(user_id, role,
        profile:profiles!project_members_user_id_fkey(full_name, email, avatar_url)
      ),
      team:teams!projects_team_id_fkey(id, name)
    `)
    .order("created_at", { ascending: false });

  // Thema/submodule filter via joined themes/processes
  if (themeSlug) {
    const { data: theme } = await supabase
      .from("themes").select("id").eq("slug", themeSlug).single();
    if (theme) query = query.eq("theme_id", theme.id);
  }
  if (processSlug) {
    const { data: process } = await supabase
      .from("processes").select("id").eq("slug", processSlug).single();
    if (process) query = query.eq("process_id", process.id);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// POST /api/projects
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const result = projectSchema.safeParse(body);
  if (!result.success)
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 });

  const { data, error } = await supabase
    .from("projects")
    .insert({
      ...result.data,
      owner_id:    user.id,
      description: result.data.description || null,
      customer_id: result.data.customer_id ?? null,
      team_id:     result.data.team_id     ?? null,
      start_date:  result.data.start_date  ?? null,
      end_date:    result.data.end_date    ?? null,
    })
    .select(`
      *,
      customer:customers!projects_customer_id_fkey(id, name),
      owner:profiles!projects_owner_id_fkey(full_name, email, avatar_url),
      team:teams!projects_team_id_fkey(id, name)
    `)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
