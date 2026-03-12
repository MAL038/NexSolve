/**
 * GET /api/organisation/my-orgs
 * Geeft alle organisaties terug waar de ingelogde gebruiker lid van is.
 */
import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/api";

export async function GET() {
  const auth = await requireApiContext();
  if (!auth.ok) return auth.res;
  const { supabase, user } = auth.ctx;

  const { data: memberships } = await supabase
    .from("organisation_members")
    .select("role, org:organisations(id, name, logo_url, primary_color)")
    .eq("user_id", user.id);

  const { data: profile } = await supabase
    .from("profiles")
    .select("current_org_id")
    .eq("id", user.id)
    .single();

  const orgs = (memberships ?? [])
    .map((m: any) => ({ ...m.org, role: m.role }))
    .filter(Boolean);

  return NextResponse.json({
    orgs,
    current_org_id: profile?.current_org_id ?? null,
  });
}
