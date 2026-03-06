import { NextRequest, NextResponse } from "next/server";
import { requireSuperuser } from "@/lib/api";

export async function GET() {
  const auth = await requireSuperuser();
  if (!auth.ok) return auth.res;

  const { supabase } = auth.ctx;

  const { data, error } = await supabase
    .from("platform_settings")
    .select("*")
    .limit(1)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest) {
  const auth = await requireSuperuser();
  if (!auth.ok) return auth.res;

  const { supabase, user } = auth.ctx;
  const body = await req.json();

  const updates: Record<string, any> = {
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  };

  if (body.company_name !== undefined) updates.company_name = body.company_name;
  if (body.logo_url !== undefined) updates.logo_url = body.logo_url;
  if (body.primary_color !== undefined) updates.primary_color = body.primary_color;
  if (body.accent_color !== undefined) updates.accent_color = body.accent_color;

  const { data: existing, error: existingError } = await supabase
    .from("platform_settings")
    .select("id")
    .limit(1)
    .single();

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 });
  }

  if (!existing) {
    return NextResponse.json({ error: "Settings niet gevonden" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("platform_settings")
    .update(updates)
    .eq("id", existing.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}