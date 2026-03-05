// app/api/profile/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireApiContext } from "@/lib/apiContext";
import { z } from "zod";
import { LOCALE_COOKIE } from "@/lib/i18n";

const profileUpdateSchema = z.object({
  full_name:          z.string().min(1).max(100).optional(),
  avatar_url:         z.string().url().nullable().optional(),
  preferred_language: z.enum(["en", "nl", "de", "fr"]).optional(),
});

export async function PATCH(req: NextRequest) {
    const ctx = await requireApiContext();
  if (!ctx.ok) return ctx.res;
  const { supabase, user, orgId: ctxOrgId, orgRole, isSuperuser } = ctx;
  const body = await req.json();
  const parsed = profileUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updates = { ...parsed.data, updated_at: new Date().toISOString() };

  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Als taal is gewijzigd: zet cookie in response header
  const res = NextResponse.json(data);
  if (parsed.data.preferred_language) {
    res.cookies.set(LOCALE_COOKIE, parsed.data.preferred_language, {
      path:     "/",
      maxAge:   60 * 60 * 24 * 365, // 1 jaar
      sameSite: "lax",
    });
  }

  return res;
}
