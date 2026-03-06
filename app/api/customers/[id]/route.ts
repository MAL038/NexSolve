import { NextResponse } from "next/server";

import { apiRoute } from "@/lib/api";
import { logActivity } from "@/lib/activityLogger";
import { customerUpdateSchema } from "@/lib/validators";

type Params = { id: string };

export const GET = apiRoute<Params>(
  { requireOrg: false, parseBody: false },
  async ({ supabase, params }) => {
    const { data: customer, error } = await supabase
      .from("customers")
      .select("*")
      .eq("id", params.id)
      .single();

    if (error) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { data: projects } = await supabase
      .from("projects")
      .select("*, project_members(count)")
      .eq("customer_id", params.id)
      .order("created_at", { ascending: false });

    return NextResponse.json({ ...customer, projects: projects ?? [] });
  }
);

export const PATCH = apiRoute<Params>(
  { requireOrg: false },
  async ({ supabase, user, params, body }) => {
    const result = customerUpdateSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
    }

    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const [key, value] of Object.entries(result.data)) {
      payload[key] = value === "" ? null : value;
    }

    const { data, error } = await supabase
      .from("customers")
      .update(payload)
      .eq("id", params.id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logActivity(supabase, {
      actorId: user.id,
      action: "customer.updated",
      entityType: "customer",
      entityId: params.id,
      entityName: data.name,
      customerId: params.id,
    });

    return NextResponse.json(data);
  }
);

export const DELETE = apiRoute<Params>(
  { requireOrg: false, parseBody: false },
  async ({ supabase, user, params }) => {
    const { data: customer } = await supabase
      .from("customers")
      .select("name")
      .eq("id", params.id)
      .single();

    const { error } = await supabase.from("customers").delete().eq("id", params.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logActivity(supabase, {
      actorId: user.id,
      action: "customer.deleted",
      entityType: "customer",
      entityId: params.id,
      entityName: customer?.name,
      customerId: params.id,
    });

    return new NextResponse(null, { status: 204 });
  }
);
