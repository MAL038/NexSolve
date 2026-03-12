/**
 * POST /api/organisation/switch
 * Wijzig de actieve organisatie van de ingelogde gebruiker.
 * Body: { org_id: string }
 */
import { NextRequest, NextResponse } from "next/server";
import { requireApiContext } from "@/lib/api";

export async function POST(req: NextRequest) {
  const auth = await requireApiContext();
  if (!auth.ok) return auth.res;
  const { supabase, user } = auth.ctx;

  const { org_id } = await req.json();
  if (!org_id) {
    return NextResponse.json({ error: "org_id is verplicht" }, { status: 400 });
  }

  // Controleer of de user lid is van de org
  const { data: membership } = await supabase
    .from("organisation_members")
    .select("role")
    .eq("org_id", org_id)
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    return NextResponse.json({ error: "Geen toegang tot deze organisatie" }, { status: 403 });
  }

  const { error } = await supabase
    .from("profiles")
    .update({ current_org_id: org_id })
    .eq("id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
