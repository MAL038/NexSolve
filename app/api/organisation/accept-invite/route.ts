// app/api/auth/accept-invite/route.ts
// Wordt aangeroepen door de accept-invite pagina nadat Supabase
// de sessie heeft gezet. Valideert invite-token en koppelt user aan org.

import { NextRequest, NextResponse } from "next/server";
import { requireApiContext } from "@/lib/apiContext";
import { createClient } from "@/lib/supabaseServer";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { z } from "zod";

const schema = z.object({
  token: z.string().min(10, "token ontbreekt of ongeldig"),
});

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// DB accepteert alleen admin|member (org_members.org_role constraint)
type DbOrgRole = "admin" | "member";

function normalizeOrgRole(input: unknown): DbOrgRole {
  const raw = String(input ?? "member").toLowerCase().trim();

  // app-rol → db-rol mapping
  // org.admin en owner worden beide 'admin' in org_members
  if (raw === "org.admin" || raw === "admin" || raw === "owner") return "admin";

  // alles anders (viewer, member, etc.)
  return "member";
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const { token } = parsed.data;

  const admin = adminClient();

  // 1) Invite ophalen (bron van waarheid)
  const { data: invite, error: inviteErr } = await admin
    .from("team_invites")
    .select("id, token, email, org_id, org_role, expires_at, accepted_at")
    .eq("token", token)
    .maybeSingle();

  if (inviteErr) return NextResponse.json({ error: inviteErr.message }, { status: 500 });
  if (!invite) return NextResponse.json({ error: "Invite niet gevonden." }, { status: 404 });

  if (invite.accepted_at) {
    return NextResponse.json({ success: true, org_name: null, alreadyAccepted: true });
  }

  const expiresAt = new Date(invite.expires_at);
  if (expiresAt <= new Date()) {
    return NextResponse.json({ error: "Invite is verlopen." }, { status: 410 });
  }

  if (invite.email?.toLowerCase() !== (user.email ?? "").toLowerCase()) {
    return NextResponse.json({ error: "Deze invite is niet voor dit account." }, { status: 403 });
  }

  // 2) Org ophalen
  const { data: org, error: orgErr } = await admin
    .from("organisations")
    .select("id, name")
    .eq("id", invite.org_id)
    .maybeSingle();

  if (orgErr) return NextResponse.json({ error: orgErr.message }, { status: 500 });
  if (!org) return NextResponse.json({ error: "Organisatie niet gevonden" }, { status: 404 });

  // 3) Membership upsert → correcte tabel: org_members, correcte kolom: org_role
  const orgRole: DbOrgRole = normalizeOrgRole(invite.org_role);

  const { error: memberErr } = await admin
    .from("org_members")
    .upsert(
      {
        org_id:   invite.org_id,
        user_id:  user.id,
        org_role: orgRole,
      },
      { onConflict: "org_id,user_id" }
    );

  if (memberErr) return NextResponse.json({ error: memberErr.message }, { status: 500 });

  // 4) Profiel: current_org_id zetten
  const { error: profileErr } = await admin
    .from("profiles")
    .update({ current_org_id: invite.org_id, org_id: invite.org_id })
    .eq("id", user.id);

  if (profileErr) return NextResponse.json({ error: profileErr.message }, { status: 500 });

  // 5) Modules defaults (best effort)
  const modules = ["projects", "customers", "intake", "calendar"];
  for (const module of modules) {
    await admin
      .from("organisation_modules")
      .upsert({ org_id: invite.org_id, module, is_enabled: true }, { onConflict: "org_id,module" });
  }

  // 6) Invite markeren als geaccepteerd
  const { error: acceptErr } = await admin
    .from("team_invites")
    .update({ accepted_at: new Date().toISOString(), accepted_by: user.id })
    .eq("id", invite.id);

  if (acceptErr) return NextResponse.json({ error: acceptErr.message }, { status: 500 });

  return NextResponse.json({ success: true, org_name: org.name, role: orgRole });
}