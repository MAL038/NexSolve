// app/api/org/[orgId]/logo/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";

// ── Autorisatiecheck ──────────────────────────────────────────

async function canManageOrg(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orgId: string,
): Promise<boolean> {
  const { data: isSu } = await supabase.rpc("is_superuser");
  if (isSu === true) return true;

  const { data: isOrgAdmin } = await supabase.rpc("is_org_admin", { p_org_id: orgId });
  return isOrgAdmin === true;
}

// ── POST /api/org/[orgId]/logo ────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const { orgId } = await params;
  const supabase  = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  const allowed = await canManageOrg(supabase, orgId);
  if (!allowed) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });

  // Bestand ophalen
  const formData = await req.formData();
  const file     = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Geen bestand" }, { status: 400 });

  // Validatie: type en grootte
  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json(
      { error: "Ongeldig bestandstype. Gebruik JPG, PNG, WebP of SVG." },
      { status: 400 },
    );
  }
  if (file.size > 2 * 1024 * 1024) {
    return NextResponse.json({ error: "Bestand te groot. Max 2MB." }, { status: 400 });
  }

  // SVG krijgt ext "svg", rest via split
  const ext      = file.type === "image/svg+xml" ? "svg" : file.type.split("/")[1];
  const filePath = `${orgId}/logo.${ext}`;
  const buffer   = Buffer.from(await file.arrayBuffer());

  // Upload naar bucket "org-logos"
  const { error: uploadError } = await supabase.storage
    .from("org-logos")
    .upload(filePath, buffer, {
      contentType: file.type,
      upsert:      true, // overschrijf bestaand logo
    });

  if (uploadError) {
    console.error("Logo upload error:", uploadError);
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  // Publieke URL ophalen — met cache-busting timestamp
  const { data: { publicUrl } } = supabase.storage
    .from("org-logos")
    .getPublicUrl(filePath);

  const logoUrlWithBust = `${publicUrl}?t=${Date.now()}`;

  // Sla URL op in organisations tabel
  const { error: updateError } = await supabase
    .from("organisations")
    .update({ logo_url: logoUrlWithBust })
    .eq("id", orgId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ logo_url: logoUrlWithBust });
}

// ── DELETE /api/org/[orgId]/logo ──────────────────────────────

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const { orgId } = await params;
  const supabase  = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  const allowed = await canManageOrg(supabase, orgId);
  if (!allowed) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });

  // Verwijder alle mogelijke extensies (we weten niet welke er staat)
  await supabase.storage
    .from("org-logos")
    .remove([
      `${orgId}/logo.jpg`,
      `${orgId}/logo.jpeg`,
      `${orgId}/logo.png`,
      `${orgId}/logo.webp`,
      `${orgId}/logo.svg`,
    ]);

  // Zet logo_url op null in de database
  const { error } = await supabase
    .from("organisations")
    .update({ logo_url: null })
    .eq("id", orgId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}