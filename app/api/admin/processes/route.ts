import { NextRequest, NextResponse } from "next/server";
import { requireSuperuser } from "@/lib/api";
export async function POST(req: NextRequest) {
const su = await requireSuperuser();
if (!su.ok) return su.res;

const { supabase } = su.ctx;
const sb = supabase;

  const body = await req.json();
  if (!body.name?.trim()) return NextResponse.json({ error: "Naam is verplicht" }, { status: 400 });
  if (!body.theme_id)     return NextResponse.json({ error: "theme_id is verplicht" }, { status: 400 });

  const slug = body.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

  const { data: existing } = await sb
    .from("processes")
    .select("position")
    .eq("theme_id", body.theme_id)
    .order("position", { ascending: false })
    .limit(1);

  const position = (existing?.[0]?.position ?? -1) + 1;

  const { data, error } = await sb
    .from("processes")
    .insert({ name: body.name.trim(), slug, theme_id: body.theme_id, position })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
