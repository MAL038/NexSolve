/**
 * POST /api/admin/users/invite
 * Stuurt een uitnodigingsmail via Supabase Admin API.
 * Body: { email, role, full_name? }
 */
import { NextRequest, NextResponse } from "next/server";
import { requireSuperuser } from "@/lib/api";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { z } from "zod";

const schema = z.object({
  email: z.string().email("Ongeldig e-mailadres"),
  role: z.enum(["member", "viewer", "superuser"]).default("member"),
  full_name: z.string().min(1).max(100).optional(),
});

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function POST(req: NextRequest) {
  const auth = await requireSuperuser();
  if (!auth.ok) return auth.res;

  const { supabase } = auth.ctx;

  const body = await req.json();
  const result = schema.safeParse(body);

  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
  }

  const { email, role, full_name } = result.data;

  const { data: existing, error: existingError } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 });
  }

  if (existing) {
    return NextResponse.json(
      { error: "Dit e-mailadres is al geregistreerd" },
      { status: 409 }
    );
  }

  const admin = adminClient();

  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: full_name ?? "", role },
    redirectTo: process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL}/auth/accept-invite`
      : "https://app.nexsolve.nl/auth/accept-invite",
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (data.user) {
    const { error: upsertError } = await admin.from("profiles").upsert(
      {
        id: data.user.id,
        email,
        full_name: full_name ?? "",
        role,
        is_active: true,
      },
      { onConflict: "id" }
    );

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }
  }

  return NextResponse.json(
    {
      success: true,
      message: `Uitnodiging verstuurd naar ${email}`,
      user_id: data.user?.id,
    },
    { status: 201 }
  );
}