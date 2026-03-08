// app/api/org/[orgId]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";
import { z } from "zod";

// ── Validatieschema ───────────────────────────────────────────

const orgUpdateSchema = z.object({
  name:          z.string().min(1, "Naam is verplicht").max(100).optional(),
  logo_url:      z.string().url("Ongeldig URL").nullable().optional(),
  primary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Ongeldige kleurcode").optional(),
  accent_color:  z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Ongeldige kleurcode").optional(),
});

// ── Autorisatiecheck ──────────────────────────────────────────
// Staat toe: org-admin (org_role = 'admin' in org_members) OF superuser

async function canManageOrg(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orgId: string,
): Promise<boolean> {
  // Superuser check via SECURITY DEFINER RPC — geen RLS-recursie
  const { data: isSu } = await supabase.rpc("is_superuser");
  if (isSu === true) return true;

  // Org-admin check
  const { data: isOrgAdmin } = await supabase.rpc("is_org_admin", {
    p_org_id: orgId,
  });
  return isOrgAdmin === true;
}

// ── PATCH /api/org/[orgId] ────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const { orgId } = await params;
  const supabase  = await createClient();

  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  // Autorisatie
  const allowed = await canManageOrg(supabase, orgId);
  if (!allowed) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });

  // Body parsen en valideren
  const body   = await req.json();
  const result = orgUpdateSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  // Alleen aangeleverde velden updaten (geen undefined wegschrijven)
  const updates: Record<string, unknown> = {};
  if (result.data.name          !== undefined) updates.name          = result.data.name;
  if (result.data.logo_url      !== undefined) updates.logo_url      = result.data.logo_url;
  if (result.data.primary_color !== undefined) updates.primary_color = result.data.primary_color;
  if (result.data.accent_color  !== undefined) updates.accent_color  = result.data.accent_color;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Geen velden om bij te werken" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("organisations")
    .update(updates)
    .eq("id", orgId)
    .select("id, name, logo_url, primary_color, accent_color, slug, plan, is_active, created_at")
    .single();

  if (error) {
    console.error("PATCH /api/org/[orgId] error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// ── GET /api/org/[orgId] ──────────────────────────────────────
// Handig voor toekomstig gebruik (bijv. client-side refresh)

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const { orgId } = await params;
  const supabase  = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  const allowed = await canManageOrg(supabase, orgId);
  if (!allowed) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });

  const { data, error } = await supabase
    .from("organisations")
    .select("id, name, logo_url, primary_color, accent_color, slug, plan, is_active, created_at")
    .eq("id", orgId)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}