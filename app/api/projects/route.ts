// app/api/projects/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";
import { logActivity } from "@/lib/activityLogger";
import { z } from "zod";

const optionalUuid = () =>
  z.preprocess(
    (v) => (v === "" || v === undefined ? null : v),
    z.string().uuid().nullable().optional()
  );

const optionalDate = () =>
  z.preprocess(
    (v) => (v === "" || v === undefined ? null : v),
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional()
  );

const projectSchema = z.object({
  name:           z.string().min(1).max(200),
  code:           z.string().max(30).optional().nullable(),
  auto_code:      z.boolean().optional().default(true),
  description:    z.string().max(2000).optional().or(z.literal("")),
  status:         z.enum(["active", "in-progress", "archived"]).default("active"),
  customer_id:    optionalUuid(),
  theme_id:       optionalUuid(),
  process_id:     optionalUuid(),
  process_type_id:optionalUuid(),
  team_id:        optionalUuid(),
  start_date:     optionalDate(),
  end_date:       optionalDate(),
});

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

  if (themeSlug) {
    const { data: theme } = await supabase.from("themes").select("id").eq("slug", themeSlug).single();
    if (theme) query = query.eq("theme_id", theme.id);
  }
  if (processSlug) {
    const { data: process } = await supabase.from("processes").select("id").eq("slug", processSlug).single();
    if (process) query = query.eq("process_id", process.id);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = projectSchema.safeParse(body);
  if (!result.success) {
    const flat = result.error.flatten();
    const message = flat.formErrors?.[0] ??
      Object.entries(flat.fieldErrors).flatMap(([k, m]) => (m ?? []).map(msg => `${k}: ${msg}`)).join(" • ") ??
      "Validatiefout";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const payload = result.data;

  // Auto-nummering: roep DB-functie aan als auto_code=true
  let projectCode: string | null = payload.code ?? null;
  if (payload.auto_code !== false && !projectCode) {
    const { data: codeData } = await supabase.rpc("next_project_code");
    projectCode = codeData ?? null;
  }

  const { data, error } = await supabase
    .from("projects")
    .insert({
      ...payload,
      code:        projectCode,
      owner_id:    user.id,
      description: payload.description || null,
      customer_id: payload.customer_id    ?? null,
      theme_id:    payload.theme_id       ?? null,
      process_id:  payload.process_id     ?? null,
      process_type_id: payload.process_type_id ?? null,
      team_id:     payload.team_id        ?? null,
      start_date:  payload.start_date     ?? null,
      end_date:    payload.end_date       ?? null,
    })
    .select(`
      *,
      customer:customers!projects_customer_id_fkey(id, name),
      owner:profiles!projects_owner_id_fkey(full_name, email, avatar_url),
      team:teams!projects_team_id_fkey(id, name)
    `)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 🔔 Log activiteit
  await logActivity(supabase, {
    actorId:    user.id,
    action:     'project.created',
    entityType: 'project',
    entityId:   data.id,
    entityName: data.name,
    projectId:  data.id,
    customerId: data.customer_id,
  });

  return NextResponse.json(data, { status: 201 });
}
