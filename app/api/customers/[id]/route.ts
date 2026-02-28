import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";
import { logActivity } from "@/lib/activityLogger";
import { customerUpdateSchema } from "@/lib/validators";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: customer, error } = await supabase
    .from("customers").select("*").eq("id", id).single();
  if (error) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: projects } = await supabase
    .from("projects")
    .select("*, project_members(count)")
    .eq("customer_id", id)
    .order("created_at", { ascending: false });

  return NextResponse.json({ ...customer, projects: projects ?? [] });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const result = customerUpdateSchema.safeParse(body);
  if (!result.success)
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 });

  // Lege strings omzetten naar null voor optionele velden
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const [key, value] of Object.entries(result.data)) {
    payload[key] = value === "" ? null : value;
  }

  const { data, error } = await supabase
    .from("customers")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logActivity(supabase, {
    actorId:    user.id,
    action:     "customer.updated",
    entityType: "customer",
    entityId:   id,
    entityName: data.name,
    customerId: id,
  });

  return NextResponse.json(data);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: customer } = await supabase
    .from("customers").select("name").eq("id", id).single();

  const { error } = await supabase.from("customers").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logActivity(supabase, {
    actorId:    user.id,
    action:     "customer.deleted",
    entityType: "customer",
    entityId:   id,
    entityName: customer?.name,
    customerId: id,
  });

  return new NextResponse(null, { status: 204 });
}
