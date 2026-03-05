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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<Record<string, string>> }
) {
  const ctx = await requireSuperuser();
  if (!ctx) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();

  if (id === ctx.currentUserId && body.role && body.role !== "superuser") {
    return NextResponse.json({ error: "Je kunt je eigen superuser-rol niet verwijderen" }, { status: 400 });
  }

  if (body.action === "reset_password") {
    const { data: profile } = await ctx.supabase
      .from("profiles").select("email").eq("id", id).single();
    if (!profile?.email)
      return NextResponse.json({ error: "Gebruiker niet gevonden" }, { status: 404 });

    const admin = adminClient();
    const { error } = await admin.auth.resetPasswordForEmail(profile.email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, message: "Wachtwoord-reset e-mail verstuurd" });
  }

  const updates: Record<string, any> = {};
  if (body.role      !== undefined) updates.role      = body.role;
  if (body.is_active !== undefined) updates.is_active = body.is_active;

  if (Object.keys(updates).length === 0)
    return NextResponse.json({ error: "Geen velden opgegeven" }, { status: 400 });

  const { data, error } = await ctx.supabase
    .from("profiles").update(updates).eq("id", id).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<Record<string, string>> }
) {
  const ctx = await requireSuperuser();
  if (!ctx) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });

  const { id } = await params;
  if (id === ctx.currentUserId)
    return NextResponse.json({ error: "Je kunt je eigen account niet verwijderen" }, { status: 400 });

  const admin = adminClient();
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
