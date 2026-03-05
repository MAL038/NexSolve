// app/api/org/[orgId]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";
import { z } from "zod";

const patchSchema = z.object({
  name:     z.string().min(1).max(100).optional(),
  logo_url: z.string().url().nullable().optional(),
});

type Params = { params: Promise<{ orgId: string }> };

// ── PATCH: update org naam / logo ─────────────────────────────
export async function PATCH(req: NextRequest, { params }: Params) {
  const { orgId } = await params;
  const supabase  = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  // Superuser of org-admin mag updaten
  const { data: isSu }    = await supabase.rpc("is_superuser");
  const { data: isAdmin } = await supabase.rpc("is_org_admin", { p_org_id: orgId });

  if (!isSu && !isAdmin) {
    return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  }

  const body = await req.json();
  const result = patchSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten().fieldErrors }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("organisations")
    .update(result.data)
    .eq("id", orgId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// ── GET: haal org op ──────────────────────────────────────────
export async function GET(req: NextRequest, { params }: Params) {
  const { orgId } = await params;
  const supabase  = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  const { data: isMember } = await supabase.rpc("is_org_member", { p_org_id: orgId });
  const { data: isSu }     = await supabase.rpc("is_superuser");

  if (!isSu && !isMember) {
    return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("organisations")
    .select("*")
    .eq("id", orgId)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
