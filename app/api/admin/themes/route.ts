import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";

async function requireSuperuser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  // Gebruik SECURITY DEFINER RPC — leest rol buiten RLS om, geen recursie
  const { data: isSu } = await supabase.rpc("is_superuser");
  if (!isSu) return null;
  return supabase;
}

export async function GET() {
  const sb = await requireSuperuser();
  if (!sb) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });

  const { data, error } = await sb
    .from("themes")
    .select(`id, name, slug, position, created_at, processes(id, name, slug, position, theme_id, created_at)`)
    .order("position", { ascending: true })
    .order("position", { ascending: true, foreignTable: "processes" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const sb = await requireSuperuser();
  if (!sb) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });

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
