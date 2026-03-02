// app/api/admin/organisations/[id]/owner/route.ts
// Koppelt een bestaande gebruiker als owner aan een organisatie

import { NextRequest, NextResponse } from "next/server";
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

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try { await requireSuperuser(); }
  catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }); }

  const { id: org_id } = await params;
  const { user_id } = await req.json();

  if (!user_id) return NextResponse.json({ error: "user_id verplicht" }, { status: 400 });

  const admin = adminClient();

  // Downgrade huidige owner naar member
  await admin
    .from("organisation_members")
    .update({ role: "member" })
    .eq("org_id", org_id)
    .eq("role", "owner");

  // Nieuwe owner instellen
  await admin
    .from("organisation_members")
    .upsert({ org_id, user_id, role: "owner" }, { onConflict: "org_id,user_id" });

  // current_org_id instellen op profiel van nieuwe owner
  await admin
    .from("profiles")
    .update({ current_org_id: org_id })
    .eq("id", user_id);

  return NextResponse.json({ success: true });
}
