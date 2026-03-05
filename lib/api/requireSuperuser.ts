import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabaseServer";

type Ok = { ok: true; supabase: Awaited<ReturnType<typeof createClient>> };
type Err = { ok: false; res: Response };

/**
 * Superuser gate voor admin routes.
 *
 * Gebruikt de SECURITY DEFINER RPC `is_superuser()` om recursie via RLS te vermijden.
 */
export async function requireSuperuser(): Promise<Ok | Err> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, res: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const { data: isSu, error } = await supabase.rpc("is_superuser");
  if (error || !isSu) {
    return { ok: false, res: NextResponse.json({ error: "Geen toegang" }, { status: 403 }) };
  }

  return { ok: true, supabase };
}
