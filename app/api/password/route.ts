// app/api/profile/password/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireApiContext } from "@/lib/api";
import { z } from "zod";

const passwordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(req: NextRequest) {
  const auth = await requireApiContext();
  if (!auth.ok) return auth.res;
  const { supabase, user } = auth.ctx;
  const body = await req.json();
  const parsed = passwordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors.password?.[0] ?? "Invalid" }, { status: 400 });
  }

  // Supabase Auth: updateUser wijzigt het wachtwoord van de huidige sessie-gebruiker
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
