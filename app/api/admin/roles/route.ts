import { NextRequest, NextResponse } from "next/server";
import { requireApiContext } from "@/lib/apiContext";
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
    .from("custom_roles")
    .select("*")
    .order("position", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const sb = await requireSuperuser();
  if (!sb) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });

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
