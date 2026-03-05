import { NextRequest, NextResponse } from "next/server";
import { requireApiContext } from "@/lib/apiContext";
import { logActivity } from "@/lib/activityLogger";

export async function DELETE(_: NextRequest, { params }: { params: Promise<Record<string, string>> }) {
  const { id, userId } = await params;
    const ctx = await requireApiContext({ module: "projects" });
  if (!ctx.ok) return ctx.res;
  const { supabase, user, orgId: ctxOrgId, orgRole, isSuperuser } = ctx;
  const { data: project } = await supabase
    .from("projects").select("owner_id, name, customer_id").eq("id", id).single();

  if (!project) return NextResponse.json({ error: "Project niet gevonden" }, { status: 404 });
  if (project.owner_id !== user.id)
    return NextResponse.json({ error: "Only the project owner can remove members" }, { status: 403 });

  const { data: profile } = await supabase
    .from("profiles").select("full_name").eq("id", userId).single();

  const { error } = await supabase
    .from("project_members").delete().eq("project_id", id).eq("user_id", userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logActivity(supabase, {
    actorId:    user.id,
    action:     'member.removed',
    entityType: 'member',
    entityId:   userId,
    entityName: profile?.full_name,
    projectId:  id,
    customerId: project.customer_id,
    metadata:   { project_name: project.name },
  });

  return new NextResponse(null, { status: 204 });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<Record<string, string>> }) {
  const { id, userId } = await params;
    const ctx = await requireApiContext({ module: "projects" });
  if (!ctx.ok) return ctx.res;
  const { supabase, user, orgId: ctxOrgId, orgRole, isSuperuser } = ctx;
  const { data: project } = await supabase
    .from("projects").select("owner_id").eq("id", id).single();

  if (!project || project.owner_id !== user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { role } = await req.json();
  if (!["member", "admin"].includes(role))
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });

  const { data, error } = await supabase
    .from("project_members")
    .update({ role })
    .eq("project_id", id)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
