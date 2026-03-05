import { NextRequest, NextResponse } from "next/server";
import { requireSuperuser } from "@/lib/api";
export async function GET() {
  const su = await requireSuperuser();
  if (!su.ok) return su.res;
  const sb = su.supabase;

  const { data, error } = await sb
    .from("themes")
    .select(`id, name, slug, position, created_at, processes(id, name, slug, position, theme_id, created_at)`)
    .order("position", { ascending: true })
    .order("position", { ascending: true, foreignTable: "processes" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const su = await requireSuperuser();
  if (!su.ok) return su.res;
  const sb = su.supabase;

  const body = await req.json();
  if (!body.name?.trim()) return NextResponse.json({ error: "Naam is verplicht" }, { status: 400 });

  const slug = body.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

  // Get max position
  const { data: existing } = await sb.from("themes").select("position").order("position", { ascending: false }).limit(1);
  const position = (existing?.[0]?.position ?? -1) + 1;

  const { data, error } = await sb
    .from("themes")
    .insert({ name: body.name.trim(), slug, position })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
