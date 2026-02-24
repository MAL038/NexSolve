import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";

async function guardSuperuser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: p } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!p || p.role !== "superuser") return null;
  return supabase;
}

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

// POST /api/admin/themas/[themaId]/processen — voeg submodule toe
export async function POST(req: NextRequest, { params }: { params: Promise<{ themaId: string }> }) {
  const supabase = await guardSuperuser();
  if (!supabase) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });

  const { themaId } = await params;
  const { name, position } = await req.json();
  if (!name) return NextResponse.json({ error: "naam is verplicht" }, { status: 400 });

  const { data, error } = await supabase
    .from("processes")
    .insert({ name, slug: slugify(name), theme_id: themaId, position: position ?? 99 })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

// PATCH /api/admin/themas/[themaId]/processen — update proces
export async function PATCH(req: NextRequest) {
  const supabase = await guardSuperuser();
  if (!supabase) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });

  const { id, name, position } = await req.json();
  if (!id) return NextResponse.json({ error: "id is verplicht" }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if (name !== undefined)     { updates.name = name; updates.slug = slugify(name); }
  if (position !== undefined) updates.position = position;

  const { data, error } = await supabase.from("processes").update(updates).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE /api/admin/themas/[themaId]/processen?id=xxx
export async function DELETE(req: NextRequest) {
  const supabase = await guardSuperuser();
  if (!supabase) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is verplicht" }, { status: 400 });

  const { error } = await supabase.from("processes").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
