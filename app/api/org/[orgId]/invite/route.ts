// app/api/org/[orgId]/invite/route.ts
//
// Org-admin only: nodigt een gebruiker uit binnen zijn eigen org.
// Superusers worden ook doorgelaten.

import { NextRequest, NextResponse } from "next/server";
import { requireApiContext } from "@/lib/apiContext";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { z } from "zod";

const schema = z.object({
  email:    z.string().email("Ongeldig e-mailadres"),
  org_role: z.enum(["admin", "member", "viewer"]).default("member"),
});

type Params = { params: Promise<{ orgId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { orgId } = await params;
    const ctx = await requireApiContext();
  if (!ctx.ok) return ctx.res;
  const { supabase, user, orgId: ctxOrgId, orgRole, isSuperuser } = ctx;
  // Superuser of org-admin mag uitnodigen
  const { data: isSu }   = await supabase.rpc("is_superuser");
  const { data: isAdmin } = await supabase.rpc("is_org_admin", { p_org_id: orgId });

  if (!isSu && !isAdmin) {
    return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  }

  // ── Controleer of org bestaat ─────────────────────────────
  const { data: org } = await supabase
    .from("organisations")
    .select("id, name")
    .eq("id", orgId)
    .maybeSingle();

  if (!org) return NextResponse.json({ error: "Organisatie niet gevonden" }, { status: 404 });

  // ── Valideer input ────────────────────────────────────────
  const body = await req.json();
  const result = schema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten().fieldErrors }, { status: 400 });
  }
  const { email, org_role } = result.data;

  // ── Check: al geregistreerd in deze org? ──────────────────
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id, org_id")
    .eq("email", email)
    .maybeSingle();

  if (existingProfile?.org_id === orgId) {
    return NextResponse.json(
      { error: "Dit e-mailadres is al lid van deze organisatie." },
      { status: 409 }
    );
  }

  // ── Check: al een openstaande uitnodiging voor deze org? ──
  const { data: pending } = await supabase
    .from("team_invites")
    .select("id, expires_at")
    .eq("email", email)
    .eq("org_id", orgId)
    .is("accepted_at", null)
    .maybeSingle();

  if (pending) {
    const expires = new Date(pending.expires_at);
    if (expires > new Date()) {
      return NextResponse.json(
        { error: "Er is al een openstaande uitnodiging voor dit e-mailadres." },
        { status: 409 }
      );
    }
    await supabase.from("team_invites").delete().eq("id", pending.id);
  }

  // ── Maak invite record aan ────────────────────────────────
  const { data: invite, error: inviteErr } = await supabase
    .from("team_invites")
    .insert({
      email,
      org_id:     orgId,
      org_role,
      invited_by: user.id,
    })
    .select()
    .single();

  if (inviteErr) {
    return NextResponse.json({ error: inviteErr.message }, { status: 500 });
  }

  // ── Verstuur uitnodigingsmail ─────────────────────────────
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { error: emailErr } = await adminClient.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/accept-invite?token=${invite.token}`,
    data: {
      invited_by: user.id,
      org_id:     orgId,
      org_role,
      org_name:   org.name,
    },
  });

  if (emailErr) {
    await supabase.from("team_invites").delete().eq("id", invite.id);
    return NextResponse.json(
      { error: `E-mail verzenden mislukt: ${emailErr.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, invite }, { status: 201 });
}

// ── GET: openstaande uitnodigingen voor deze org ──────────────
export async function GET(req: NextRequest, { params }: Params) {
  const { orgId } = await params;
    const ctx = await requireApiContext();
  if (!ctx.ok) return ctx.res;
  const { supabase, user, orgId: ctxOrgId, orgRole, isSuperuser } = ctx;
  const { data: isSu }   = await supabase.rpc("is_superuser");
  const { data: isAdmin } = await supabase.rpc("is_org_admin", { p_org_id: orgId });
  if (!isSu && !isAdmin) {
    return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("team_invites")
    .select("*")
    .eq("org_id", orgId)
    .is("accepted_at", null)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// ── DELETE: trek uitnodiging in ───────────────────────────────
export async function DELETE(req: NextRequest, { params }: Params) {
  const { orgId } = await params;
    const ctx = await requireApiContext();
  if (!ctx.ok) return ctx.res;
  const { supabase, user, orgId: ctxOrgId, orgRole, isSuperuser } = ctx;
  const { data: isSu }   = await supabase.rpc("is_superuser");
  const { data: isAdmin } = await supabase.rpc("is_org_admin", { p_org_id: orgId });
  if (!isSu && !isAdmin) {
    return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  }

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id verplicht" }, { status: 400 });

  // Zorg dat de invite bij deze org hoort
  const { error } = await supabase
    .from("team_invites")
    .delete()
    .eq("id", id)
    .eq("org_id", orgId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
