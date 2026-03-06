import { NextRequest, NextResponse } from "next/server";
import { requireSuperuser } from "@/lib/api";
export async function GET() {
const su = await requireSuperuser();
if (!su.ok) return su.res;

const { supabase } = su.ctx;
const sb = supabase;

  const { data, error } = await sb
    .from("custom_roles")
    .select("*")
    .order("position", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
 const su = await requireSuperuser();
if (!su.ok) return su.res;

const { supabase } = su.ctx;
const sb = supabase;

  const body = await req.json();
  if (!body.name?.trim()) return NextResponse.json({ error: "Naam is verplicht" }, { status: 400 });

  const slug = body.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

  const { data: existing } = await sb
    .from("custom_roles")
    .select("position")
    .order("position", { ascending: false })
    .limit(1);
  const position = (existing?.[0]?.position ?? -1) + 1;

  const { data, error } = await sb
    .from("custom_roles")
    .insert({
      name: body.name.trim(),
      slug,
      color: body.color ?? "#6B7280",
      position,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
