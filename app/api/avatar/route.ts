// app/api/profile/avatar/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireApiContext } from "@/lib/apiContext";
export async function POST(req: NextRequest) {
    const ctx = await requireApiContext();
  if (!ctx.ok) return ctx.res;
  const { supabase, user, orgId: ctxOrgId, orgRole, isSuperuser } = ctx;
  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  // Valideer bestandstype en grootte
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: "Invalid file type. Use JPG, PNG or WebP." }, { status: 400 });
  }
  if (file.size > 2 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large. Max 2MB." }, { status: 400 });
  }

  const ext      = file.type.split("/")[1];
  const fileName = `${user.id}/avatar.${ext}`;
  const buffer   = Buffer.from(await file.arrayBuffer());

  // Upload naar Supabase Storage bucket "avatars" (maak deze bucket aan in je Supabase dashboard)
  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(fileName, buffer, {
      contentType: file.type,
      upsert:      true, // overschrijf bestaande avatar
    });

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  // Publieke URL ophalen
  const { data: { publicUrl } } = supabase.storage
    .from("avatars")
    .getPublicUrl(fileName);

  // Sla URL op in profiel
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  return NextResponse.json({ avatar_url: publicUrl });
}

export async function DELETE(req: NextRequest) {
    const ctx = await requireApiContext();
  if (!ctx.ok) return ctx.res;
  const { supabase, user, orgId: ctxOrgId, orgRole, isSuperuser } = ctx;
  // Verwijder avatar en zet null in profiel
  await supabase.storage.from("avatars").remove([
    `${user.id}/avatar.jpg`,
    `${user.id}/avatar.png`,
    `${user.id}/avatar.webp`,
  ]);

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: null, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
