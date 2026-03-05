import { NextRequest, NextResponse } from "next/server";
import { requireApiContext } from "@/lib/api";
import { logActivity } from "@/lib/activityLogger";
import { z } from "zod";

const updateSchema = z.object({
  title:       z.string().min(1).max(300).optional(),
  description: z.string().max(1000).nullable().optional(),
  status:      z.enum(["todo", "in-progress", "done", "blocked"]).optional(),
  position:    z.number().int().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<Record<string, string>> }) {
  const { id, subId } = await params;
  const auth = await requireApiContext();
  if (!auth.ok) return auth.res;
  const { supabase, user } = auth.ctx;
  const { data: current } = await supabase
    .from("subprocesses").select("title, status").eq("id", subId).single();

  const body = await req.json();
  const result = updateSchema.safeParse(body);
  if (!result.success)
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 });

  const { data, error } = await supabase
    .from("subprocesses")
    .update({ ...result.data, updated_at: new Date().toISOString() })
    .eq("id", subId)
    .eq("project_id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 🔔 Log: status change vs algemene update
  if (result.data.status && current && result.data.status !== current.status) {
    await logActivity(supabase, {
      actorId:    user.id,
      action:     'subprocess.status_changed',
      entityType: 'subprocess',
      entityId:   subId,
      entityName: data.title,
      projectId:  id,
      metadata:   { from: current.status, to: result.data.status },
    });
  } else if (result.data.title || result.data.description) {
    await logActivity(supabase, {
      actorId:    user.id,
      action:     'subprocess.updated',
      entityType: 'subprocess',
      entityId:   subId,
      entityName: data.title,
      projectId:  id,
    });
  }

  return NextResponse.json(data);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<Record<string, string>> }) {
  const { id, subId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: sub } = await supabase
    .from("subprocesses").select("title").eq("id", subId).single();

  const { error } = await supabase
    .from("subprocesses").delete().eq("id", subId).eq("project_id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logActivity(supabase, {
    actorId:    user.id,
    action:     'subprocess.deleted',
    entityType: 'subprocess',
    entityId:   subId,
    entityName: sub?.title,
    projectId:  id,
  });

  return new NextResponse(null, { status: 204 });
}
