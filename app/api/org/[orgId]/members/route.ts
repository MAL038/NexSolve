// app/api/org/[orgId]/members/route.ts  — GET + POST (bulk)
// app/api/org/[orgId]/members/[userId]/route.ts — PATCH + DELETE

// ── route.ts ──────────────────────────────────────────────────
import { NextRequest, NextResponse } from "next/server";
import { requireApiContext } from "@/lib/apiContext";
type Params = { params: Promise<{ orgId: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const { orgId } = await params;
    const ctx = await requireApiContext();
  if (!ctx.ok) return ctx.res;
  const { supabase, user, orgId: ctxOrgId, orgRole, isSuperuser } = ctx;
  const { data: isSu }     = await supabase.rpc("is_superuser");
  const { data: isMember } = await supabase.rpc("is_org_member", { p_org_id: orgId });

  if (!isSu && !isMember) {
    return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("org_members")
    .select(`
      org_id, user_id, org_role, invited_by, joined_at,
      profile:profiles(id, full_name, email, avatar_url, is_active)
    `)
    .eq("org_id", orgId)
    .order("joined_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Supabase geeft profile terug als array bij een join — normaliseer naar object
  const normalized = (data ?? []).map((m: any) => ({
    ...m,
    profile: Array.isArray(m.profile) ? m.profile[0] ?? undefined : m.profile,
  }));

  return NextResponse.json(normalized);
}
