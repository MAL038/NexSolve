// app/api/calendar/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";
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
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const result = updateSchema.safeParse(body);
  if (!result.success)
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 });

  // RLS zorgt ervoor dat alleen de eigenaar kan updaten
  const { data, error } = await supabase
    .from("calendar_events")
    .update({ ...result.data, notes: result.data.notes || null })
    .eq("id", id)
    .eq("user_id", user.id) // extra zekerheid
    .select(`*, profile:profiles!calendar_events_user_id_fkey(id, full_name, avatar_url, role)`)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase
    .from("calendar_events")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
