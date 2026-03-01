// app/api/planning/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";
import { z } from "zod";

const updateSchema = z.object({
  hours: z.number().min(0.5).max(24).optional(),
  notes: z.string().max(300).optional().or(z.literal("")),
  date:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

async function canModify(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  planningId: string,
) {
  const { data: entry } = await supabase
    .from("project_planning")
    .select("planned_by, project_id, user_id, hours, date")
    .eq("id", planningId)
    .single();

  if (!entry) return { allowed: false, entry: null };

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", userId).single();
  if (profile?.role === "admin" || profile?.role === "superuser")
    return { allowed: true, entry };

  if (entry.planned_by === userId) return { allowed: true, entry };

  const { data: project } = await supabase
    .from("projects").select("owner_id").eq("id", entry.project_id).single();
  if (project?.owner_id === userId) return { allowed: true, entry };

  return { allowed: false, entry };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<Record<string, string>> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { allowed, entry } = await canModify(supabase, user.id, id);
  if (!allowed) return NextResponse.json({ error: "Geen toestemming" }, { status: 403 });

  const body = await req.json();
  const result = updateSchema.safeParse(body);
  if (!result.success) return NextResponse.json({ error: result.error.flatten() }, { status: 400 });

  // Capaciteitscheck na update
  const targetDate = result.data.date ?? entry!.date;
  const newHours   = result.data.hours ?? Number(entry!.hours);

  const { data: existing } = await supabase
    .from("project_planning")
    .select("hours")
    .eq("user_id", entry!.user_id)
    .eq("date", targetDate)
    .neq("id", id); // exclude huidige entry

  const totalOther = (existing ?? []).reduce((s, r) => s + Number(r.hours), 0);
  const newTotal   = totalOther + newHours;

  const { data, error } = await supabase
    .from("project_planning")
    .update({ ...result.data, notes: result.data.notes || null })
    .eq("id", id)
    .select(`
      *,
      project:projects!project_planning_project_id_fkey(id, name, status),
      user:profiles!project_planning_user_id_fkey(id, full_name, avatar_url, role)
    `)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    ...data,
    warning: newTotal > 8 ? `Totaal ${newTotal}u op ${targetDate} (max 8u aanbevolen)` : null,
  });
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<Record<string, string>> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { allowed } = await canModify(supabase, user.id, id);
  if (!allowed) return NextResponse.json({ error: "Geen toestemming" }, { status: 403 });

  const { error } = await supabase.from("project_planning").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
