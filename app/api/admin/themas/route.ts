import { NextRequest, NextResponse } from "next/server";
import { requireApiContext } from "@/lib/apiContext";
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

// GET /api/admin/themas
export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("themes")
    .select(`id, name, slug, position, created_at,
      processes(id, name, slug, position, theme_id, created_at)`)
    .order("position", { ascending: true })
    .order("position", { ascending: true, foreignTable: "processes" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST /api/admin/themas — nieuw thema
export async function POST(req: NextRequest) {
  const supabase = await guardSuperuser();
  if (!supabase) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });

  const { name, position } = await req.json();
  if (!name) return NextResponse.json({ error: "naam is verplicht" }, { status: 400 });

  const { data, error } = await supabase
    .from("themes")
    .insert({ name, slug: slugify(name), position: position ?? 99 })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

// PATCH /api/admin/themas — update thema
export async function PATCH(req: NextRequest) {
  const supabase = await guardSuperuser();
  if (!supabase) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });

  const { id, name, position } = await req.json();
  if (!id) return NextResponse.json({ error: "id is verplicht" }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if (name !== undefined)     { updates.name = name; updates.slug = slugify(name); }
  if (position !== undefined) updates.position = position;

  const { data, error } = await supabase.from("themes").update(updates).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE /api/admin/themas?id=xxx
export async function DELETE(req: NextRequest) {
  const supabase = await guardSuperuser();
  if (!supabase) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is verplicht" }, { status: 400 });

  const { error } = await supabase.from("themes").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
