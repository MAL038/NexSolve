import { NextRequest, NextResponse } from "next/server";
import { requireApiContext } from "@/lib/apiContext";
import { createClient } from "@/lib/supabaseServer";
import { createClient as createAdminClient } from "@supabase/supabase-js";

async function guardSuperuser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || profile.role !== "superuser") return null;
  return { supabase, user };
}

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// GET /api/admin/gebruikers — haal alle gebruikers op
export async function GET() {
  const ctx = await guardSuperuser();
  if (!ctx) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });

  const { data, error } = await ctx.supabase
    .from("profiles")
    .select("id, full_name, email, role, created_at, avatar_url")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// PATCH /api/admin/gebruikers — wijzig rol van gebruiker
export async function PATCH(req: NextRequest) {
  const ctx = await guardSuperuser();
  if (!ctx) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });

  const { userId, role } = await req.json();
  if (!userId || !role) return NextResponse.json({ error: "userId en role zijn verplicht" }, { status: 400 });

  const validRoles = ["member", "admin", "viewer", "superuser"];
  if (!validRoles.includes(role)) return NextResponse.json({ error: "Ongeldige rol" }, { status: 400 });

  const { error } = await ctx.supabase
    .from("profiles")
    .update({ role, updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

// DELETE /api/admin/gebruikers?userId=xxx — verwijder gebruiker
export async function DELETE(req: NextRequest) {
  const ctx = await guardSuperuser();
  if (!ctx) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });

  const userId = new URL(req.url).searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId is verplicht" }, { status: 400 });

  // Verwijder via admin client (auth.admin.deleteUser)
  const admin = adminClient();
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
