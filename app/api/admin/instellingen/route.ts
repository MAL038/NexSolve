import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";

const SETTINGS_ID = "00000000-0000-0000-0000-000000000001";

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("platform_settings")
    .select("*")
    .eq("id", SETTINGS_ID)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || profile.role !== "superuser") return NextResponse.json({ error: "Geen toegang" }, { status: 403 });

  const body = await req.json();
  const allowed = ["company_name", "logo_url", "primary_color", "accent_color"];
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString(), updated_by: user.id };

  allowed.forEach(key => { if (body[key] !== undefined) updates[key] = body[key]; });

  const { data, error } = await supabase
    .from("platform_settings")
    .update(updates)
    .eq("id", SETTINGS_ID)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
