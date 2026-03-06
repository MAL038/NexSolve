// app/api/calendar/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireApiContext } from "@/lib/api";
import { z } from "zod";

const updateSchema = z.object({
  title:      z.string().min(1).max(200).optional(),
  type:       z.enum(["verlof", "niet_beschikbaar"]).optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes:      z.string().max(500).optional().or(z.literal("")),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<Record<string, string>> }
) {
  const { id } = await params;
  const auth = await requireApiContext();
  if (!auth.ok) return auth.res;
  const { supabase, user } = auth.ctx;
  const body = await req.json();
  const result = updateSchema.safeParse(body);
  if (!result.success)
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 });

  const { data, error } = await supabase
    .from("calendar_events")
    .update({ ...result.data, notes: result.data.notes || null })
    .eq("id", id)
    .eq("user_id", user.id)
    .select(`*, profile:profiles!calendar_events_user_id_fkey(id, full_name, avatar_url, role)`)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<Record<string, string>> }
) {
  const { id } = await params;
  const auth = await requireApiContext();
  if (!auth.ok) return auth.res;
  const { supabase, user } = auth.ctx;

  const { error } = await supabase
    .from("calendar_events")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
