// app/api/admin/invite/route.ts
//
// Superuser-only: nodigt een nieuwe gebruiker uit op platform-niveau.
// De uitnodiging is altijd gekoppeld aan een organisatie (org_id verplicht).
// Na acceptatie wordt de user lid van die org met de opgegeven org_role.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { z } from "zod";

const schema = z.object({
  email: z.string().email("Ongeldig e-mailadres"),
  org_id: z.string().uuid("Ongeldig org_id"),
  org_role: z.enum(["admin", "member", "viewer"]).default("member"),
});

function getOrigin(req: NextRequest) {
  // Vercel/Proxy: deze headers zijn het meest betrouwbaar
  const proto = req.headers.get("x-forwarded-proto");
  const host = req.headers.get("x-forwarded-host");
  if (proto && host) return `${proto}://${host}`;

  // Fallback (lokaal meestal OK)
  return new URL(req.url).origin;
}

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createAdminClient(url, service, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  // ── Auth: alleen superuser ────────────────────────────────
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  const user = userData?.user;
  if (userErr) {
    return NextResponse.json({ error: userErr.message }, { status: 401 });
  }
  if (!user) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const { data: isSu, error: suErr } = await supabase.rpc("is_superuser");
  if (suErr) {
    return NextResponse.json({ error: suErr.message }, { status: 500 });
  }
  if (!isSu) {
    return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  }

  // ── Valideer input ────────────────────────────────────────
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  const { email, org_id, org_role } = parsed.data;

  // ── Admin client (service role) ────────────────────────────
  const admin = adminClient();

  // ── Controleer of org bestaat ─────────────────────────────
  const { data: org, error: orgErr } = await admin
    .from("organisations")
    .select("id, name")
    .eq("id", org_id)
    .maybeSingle();

  if (orgErr) {
    return NextResponse.json({ error: orgErr.message }, { status: 500 });
  }
  if (!org) {
    return NextResponse.json({ error: "Organisatie niet gevonden" }, { status: 404 });
  }

  // ── Check: al geregistreerd? ──────────────────────────────
  const { data: existing, error: existingErr } = await supabase
    .from("profiles")
    .select("id, org_id")
    .eq("email", email)
    .maybeSingle();

  if (existingErr) {
    return NextResponse.json({ error: existingErr.message }, { status: 500 });
  }
  if (existing) {
    return NextResponse.json(
      { error: "Dit e-mailadres is al geregistreerd." },
      { status: 409 }
    );
  }

  // ── Check: al een openstaande uitnodiging? ────────────────
  const { data: pending, error: pendingErr } = await supabase
    .from("team_invites")
    .select("id, expires_at")
    .eq("email", email)
    .eq("org_id", org_id)
    .is("accepted_at", null)
    .maybeSingle();

  if (pendingErr) {
    return NextResponse.json({ error: pendingErr.message }, { status: 500 });
  }

  if (pending) {
    const expires = new Date(pending.expires_at);
    if (expires > new Date()) {
      return NextResponse.json(
        { error: "Er is al een openstaande uitnodiging voor dit e-mailadres." },
        { status: 409 }
      );
    }
    // Verlopen — verwijder en maak nieuwe aan
    await supabase.from("team_invites").delete().eq("id", pending.id);
  }

  // ── Maak invite record aan ────────────────────────────────
  const { data: invite, error: inviteErr } = await supabase
    .from("team_invites")
    .insert({
      email,
      org_id,
      org_role,
      invited_by: user.id,
    })
    .select()
    .single();

  if (inviteErr) {
    return NextResponse.json({ error: inviteErr.message }, { status: 500 });
  }

  // ── Redirect URL (werkt lokaal + vercel) ──────────────────
  const origin = getOrigin(req);
  const redirectTo = `${origin}/auth/accept-invite?token=${invite.token}`;

  // ── Verstuur uitnodigingsmail via Supabase Admin ──────────
  const { error: emailErr } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo,
    data: {
      invited_by: user.id,
      org_id,
      org_role,
      org_name: org.name,
      invite_token: invite.token, // handig voor debugging/flow
    },
  });

  if (emailErr) {
    // rollback invite record
    await supabase.from("team_invites").delete().eq("id", invite.id);
    return NextResponse.json(
      { error: `E-mail verzenden mislukt: ${emailErr.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, invite, redirectTo }, { status: 201 });
}

// ── GET: lijst van alle openstaande uitnodigingen (superuser) ─
export async function GET(req: NextRequest) {
  const supabase = await createClient();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  const { data: isSu } = await supabase.rpc("is_superuser");
  if (!isSu) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const orgId = searchParams.get("org_id");

  let query = supabase
    .from("team_invites")
    .select("*, organisations(name)")
    .is("accepted_at", null)
    .order("created_at", { ascending: false });

  if (orgId) query = query.eq("org_id", orgId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// ── DELETE: trek een uitnodiging in (superuser) ───────────────
export async function DELETE(req: NextRequest) {
  const supabase = await createClient();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  const { data: isSu } = await supabase.rpc("is_superuser");
  if (!isSu) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const id = body?.id as string | undefined;
  if (!id) return NextResponse.json({ error: "id verplicht" }, { status: 400 });

  const { error } = await supabase.from("team_invites").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}