import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  role:  z.literal("member").default("member"),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  const body = await req.json();
  const result = schema.safeParse(body);
  if (!result.success)
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 });

  const { email, role } = result.data;

  // Check if user already exists in profiles
  const { data: existing } = await supabase
    .from("profiles")
    .select("id, email")
    .eq("email", email)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "Dit e-mailadres is al geregistreerd als teamlid." },
      { status: 409 }
    );
  }

  // Check if there's already a pending invite
  const { data: pendingInvite } = await supabase
    .from("team_invites")
    .select("id, expires_at")
    .eq("email", email)
    .is("accepted_at", null)
    .maybeSingle();

  if (pendingInvite) {
    const expires = new Date(pendingInvite.expires_at);
    if (expires > new Date()) {
      return NextResponse.json(
        { error: "Er is al een openstaande uitnodiging voor dit e-mailadres." },
        { status: 409 }
      );
    }
    // Expired — delete old invite and create new one
    await supabase.from("team_invites").delete().eq("id", pendingInvite.id);
  }

  // Create the invite record
  const { data: invite, error: inviteErr } = await supabase
    .from("team_invites")
    .insert({ email, invited_by: user.id, role })
    .select()
    .single();

  if (inviteErr)
    return NextResponse.json({ error: inviteErr.message }, { status: 500 });

  // Send invite email via Supabase Admin (inviteUserByEmail)
  // This creates a magic-link style activation email
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { error: emailErr } = await adminClient.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/accept-invite?token=${invite.token}`,
    data: { invited_by: user.id, role },
  });

  if (emailErr) {
    // Clean up the invite if email fails
    await supabase.from("team_invites").delete().eq("id", invite.id);
    return NextResponse.json({ error: `E-mail verzenden mislukt: ${emailErr.message}` }, { status: 500 });
  }

  return NextResponse.json({ success: true, invite }, { status: 201 });
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  const { data, error } = await supabase
    .from("team_invites")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
