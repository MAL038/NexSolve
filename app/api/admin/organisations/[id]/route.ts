// app/api/admin/organisations/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { requireApiContext } from "@/lib/apiContext";
import { createClient } from "@/lib/supabaseServer";
import { createClient as createAdminClient } from "@supabase/supabase-js";

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function requireSuperuser() {
  const supabase = await createClient();
  const { data: isSu } = await supabase.rpc("is_superuser");
  if (!isSu) throw new Error("Forbidden");
}

// PATCH — organisatie bijwerken (is_active, plan, naam)
export async function PATCH(req: NextRequest, context: any) {
  try { await requireSuperuser(); }
  catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }); }

  const { id } = await context.params;
  const body = await req.json();
  const admin = adminClient();

  const allowed = ["is_active", "plan", "name"] as const;
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }

  const { data, error } = await admin
    .from("organisations")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE — organisatie verwijderen
export async function DELETE(_req: NextRequest, context: any) {
  try { await requireSuperuser(); }
  catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }); }

  const { id } = await context.params;
  const admin = adminClient();

  const { error } = await admin
    .from("organisations")
    .delete()
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
