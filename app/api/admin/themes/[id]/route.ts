import { NextRequest, NextResponse } from "next/server";
import { requireSuperuser } from "@/lib/api";
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<Record<string, string>> }
) {
  const su = await requireSuperuser();
  if (!su.ok) return su.res;
  const sb = su.supabase;

  const { id } = await params;
  const body = await req.json();
  const updates: Record<string, any> = {};

  if (body.name) {
    updates.name = body.name.trim();
    updates.slug = body.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  }
  if (body.position !== undefined) updates.position = body.position;

  const { data, error } = await sb.from("themes").update(updates).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<Record<string, string>> }
) {
  const su = await requireSuperuser();
  if (!su.ok) return su.res;
  const sb = su.supabase;

  const { id } = await params;
  const { error } = await sb.from("themes").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
