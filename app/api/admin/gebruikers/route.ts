import { NextRequest, NextResponse } from "next/server";
import { requireSuperuser } from "@/lib/api";
import { createClient as createAdminClient } from "@supabase/supabase-js";

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function GET() {
  const auth = await requireSuperuser();
  if (!auth.ok) return auth.res;

  const { supabase } = auth.ctx;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, created_at, avatar_url")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest) {
  const auth = await requireSuperuser();
  if (!auth.ok) return auth.res;

  const { supabase } = auth.ctx;
  const { userId, role } = await req.json();

  if (!userId || !role) {
    return NextResponse.json({ error: "userId en role zijn verplicht" }, { status: 400 });
  }

  const validRoles = ["member", "admin", "viewer", "superuser"];
  if (!validRoles.includes(role)) {
    return NextResponse.json({ error: "Ongeldige rol" }, { status: 400 });
  }

  const { error } = await supabase
    .from("profiles")
    .update({ role, updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireSuperuser();
  if (!auth.ok) return auth.res;

  const userId = new URL(req.url).searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId is verplicht" }, { status: 400 });

  const admin = adminClient();
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
