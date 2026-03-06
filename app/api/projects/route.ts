import { NextResponse } from "next/server";
import { z } from "zod";

import { apiRoute } from "@/lib/api";
import { logActivity } from "@/lib/activityLogger";

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
  name: z.string().min(1).max(200),
  code: z.string().max(30).optional().nullable(),
  auto_code: z.boolean().optional().default(true),
  description: z.string().max(2000).optional().or(z.literal("")),
  status: z.enum(["active", "in-progress", "archived"]).default("active"),
  customer_id: optionalUuid(),
  theme_id: optionalUuid(),
  process_id: optionalUuid(),
  process_type_id: optionalUuid(),
  team_id: optionalUuid(),
  start_date: optionalDate(),
  end_date: optionalDate(),
});

export const GET = apiRoute(
  { requireOrg: false, parseBody: false },
  async ({ req, supabase }) => {
    const { searchParams } = new URL(req.url);
    const themeSlug = searchParams.get("theme");
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
);

export const POST = apiRoute(
  { requireOrg: false },
  async ({ supabase, user, body }) => {
    const result = projectSchema.safeParse(body);
    if (!result.success) {
      const flat = result.error.flatten();
      const message =
        flat.formErrors?.[0] ??
        Object.entries(flat.fieldErrors)
          .flatMap(([k, m]) => (m ?? []).map((msg) => `${k}: ${msg}`))
          .join(" • ") ??
        "Validatiefout";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const { auto_code, code: rawCode, ...dbPayload } = result.data;

    let projectCode: string | null = rawCode ?? null;
    if (auto_code !== false && !projectCode) {
      const { data: codeData } = await supabase.rpc("next_project_code");
      projectCode = codeData ?? null;
    }

    const { data, error } = await supabase
      .from("projects")
      .insert({
        ...dbPayload,
        code: projectCode,
        owner_id: user.id,
        description: dbPayload.description || null,
        customer_id: dbPayload.customer_id ?? null,
        theme_id: dbPayload.theme_id ?? null,
        process_id: dbPayload.process_id ?? null,
        process_type_id: dbPayload.process_type_id ?? null,
        team_id: dbPayload.team_id ?? null,
        start_date: dbPayload.start_date ?? null,
        end_date: dbPayload.end_date ?? null,
      })
      .select(`
        *,
        customer:customers!projects_customer_id_fkey(id, name),
        owner:profiles!projects_owner_id_fkey(full_name, email, avatar_url),
        team:teams!projects_team_id_fkey(id, name)
      `)
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logActivity(supabase, {
      actorId: user.id,
      action: "project.created",
      entityType: "project",
      entityId: data.id,
      entityName: data.name,
      projectId: data.id,
      customerId: data.customer_id,
    });

    return NextResponse.json(data, { status: 201 });
  }
);
