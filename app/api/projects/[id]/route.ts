import { NextResponse } from "next/server";
import { z } from "zod";

import { apiRoute } from "@/lib/api";
import { logActivity } from "@/lib/activityLogger";

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  status: z.enum(["active", "in-progress", "archived"]).optional(),
  customer_id: z.string().uuid().nullable().optional(),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
  team_id: z.string().uuid().nullable().optional(),
  theme_id: z.string().uuid().nullable().optional(),
  process_id: z.string().uuid().nullable().optional(),
  process_type_id: z.string().uuid().nullable().optional(),
});

type Params = { id: string };

export const GET = apiRoute(
  { requireOrg: false, parseBody: false },
  async ({ supabase, params }) => {
    const { id } = params as Params;

    const { data, error } = await supabase
      .from("projects")
      .select(`
        *,
        customer:customers(id, name),
        owner:profiles!projects_owner_id_fkey(full_name, email, avatar_url),
        project_members(user_id, role, added_at,
          profile:profiles(full_name, email, avatar_url)
        )
      `)
      .eq("id", id)
      .single();

    if (error) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(data);
  }
);

export const PATCH = apiRoute(
  { requireOrg: false },
  async ({ supabase, user, params, body }) => {
    const { id } = params as Params;

    const { data: current } = await supabase
      .from("projects")
      .select("name, status, customer_id")
      .eq("id", id)
      .single();

    const result = updateSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("projects")
      .update({ ...result.data, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("*, customer:customers(id, name)")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (result.data.status && current && result.data.status !== current.status) {
      await logActivity(supabase, {
        actorId: user.id,
        action: "project.status_changed",
        entityType: "project",
        entityId: id,
        entityName: data.name,
        projectId: id,
        customerId: data.customer_id,
        metadata: { from: current.status, to: result.data.status },
      });
    } else {
      await logActivity(supabase, {
        actorId: user.id,
        action: "project.updated",
        entityType: "project",
        entityId: id,
        entityName: data.name,
        projectId: id,
        customerId: data.customer_id,
      });
    }

    return NextResponse.json(data);
  }
);

export const DELETE = apiRoute(
  { requireOrg: false, parseBody: false },
  async ({ supabase, user, params }) => {
    const { id } = params as Params;

    const { data: project } = await supabase
      .from("projects")
      .select("name, customer_id")
      .eq("id", id)
      .single();

    const { error } = await supabase
      .from("projects")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logActivity(supabase, {
      actorId: user.id,
      action: "project.deleted",
      entityType: "project",
      entityId: id,
      entityName: project?.name,
      customerId: project?.customer_id,
    });

    return new NextResponse(null, { status: 204 });
  }
);