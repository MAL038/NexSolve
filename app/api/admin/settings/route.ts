import { NextRequest, NextResponse } from "next/server";
import { requireApiContext } from "@/lib/apiContext";
import { createClient } from "@/lib/supabaseServer";

async function requireSuperuser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: isSu } = await supabase.rpc("is_superuser");
  if (!isSu) return null;
  return { supabase, userId: user.id };
}

export async function GET() {
  const ctx = await requireSuperuser();
  if (!ctx) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  const { data, error } = await ctx.supabase
    .from("platform_settings").select("*").limit(1).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest) {
  const ctx = await requireSuperuser();
  if (!ctx) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });

  const body = await req.json();
  const updates: Record<string, any> = {
    updated_by: ctx.userId,
    updated_at: new Date().toISOString(),
  };
  if (body.company_name  !== undefined) updates.company_name  = body.company_name;
  if (body.logo_url      !== undefined) updates.logo_url      = body.logo_url;
  if (body.primary_color !== undefined) updates.primary_color = body.primary_color;
  if (body.accent_color  !== undefined) updates.accent_color  = body.accent_color;

  const { data: existing } = await ctx.supabase
    .from("platform_settings").select("id").limit(1).single();
  if (!existing)
    return NextResponse.json({ error: "Settings niet gevonden" }, { status: 404 });

  const { data, error } = await ctx.supabase
    .from("platform_settings").update(updates).eq("id", existing.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
