import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";

async function guardSuperuser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || profile.role !== "superuser") return null;
  return supabase;
}

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ themaId: string }> }
) {
  const supabase = await guardSuperuser();
  if (!supabase) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });

  const { themaId } = await params;
  const { name, position } = await req.json();

  const updates: Record<string, unknown> = {};
  if (name !== undefined) {
    updates.name = name;
    updates.slug = slugify(name);
  }
  if (position !== undefined) updates.position = position;

  const { data, error } = await supabase.from("themes").update(updates).eq("id", themaId).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ themaId: string }> }
) {
  const supabase = await guardSuperuser();
  if (!supabase) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });

  const { themaId } = await params;
  const { error } = await supabase.from("themes").delete().eq("id", themaId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
