// app/api/org/[orgId]/members/[userId]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";
import { z } from "zod";

type Params = { params: Promise<{ orgId: string; userId: string }> };

const patchSchema = z.object({
  org_role: z.enum(["admin", "member", "viewer"]),
});

// ── PATCH: wijzig org_role van een member ─────────────────────
export async function PATCH(req: NextRequest, { params }: Params) {
  const { orgId, userId } = await params;
  const supabase          = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  const { data: isSu }   = await supabase.rpc("is_superuser");
  const { data: isAdmin } = await supabase.rpc("is_org_admin", { p_org_id: orgId });
  if (!isSu && !isAdmin) {
    return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  }

  // Bescherm: org admin kan zichzelf niet degraderen
  if (!isSu && userId === user.id) {
    return NextResponse.json(
      { error: "Je kunt je eigen rol niet wijzigen." },
      { status: 400 }
    );
  }

  const body = await req.json();
  const result = patchSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten().fieldErrors }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("org_members")
    .update({ org_role: result.data.org_role })
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .select(`
      org_id, user_id, org_role, joined_at,
      profile:profiles(id, full_name, email, avatar_url, is_active)
    `)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// ── DELETE: verwijder member uit org ──────────────────────────
export async function DELETE(req: NextRequest, { params }: Params) {
  const { orgId, userId } = await params;
  const supabase          = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  const { data: isSu }   = await supabase.rpc("is_superuser");
  const { data: isAdmin } = await supabase.rpc("is_org_admin", { p_org_id: orgId });
  if (!isSu && !isAdmin) {
    return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  }

  // Bescherm: je kunt jezelf niet verwijderen
  if (userId === user.id) {
    return NextResponse.json(
      { error: "Je kunt jezelf niet uit de organisatie verwijderen." },
      { status: 400 }
    );
  }

  // Verwijder uit org_members
  const { error: memberErr } = await supabase
    .from("org_members")
    .delete()
    .eq("org_id", orgId)
    .eq("user_id", userId);

  if (memberErr) return NextResponse.json({ error: memberErr.message }, { status: 500 });

  // Ontkoppel org_id van het profiel
  await supabase
    .from("profiles")
    .update({ org_id: null })
    .eq("id", userId);

  return NextResponse.json({ success: true });
}
