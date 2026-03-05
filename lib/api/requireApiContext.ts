import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabaseServer";
import { getUserContext } from "@/lib/getUserContext";

export type ApiContext = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  user: NonNullable<Awaited<ReturnType<typeof getUserContext>>>["user"];
  isSuperuser: boolean;
  activeOrgId: string | null;
  orgRole: string | null;
};

type Ok = { ok: true; ctx: ApiContext };
type Err = { ok: false; res: Response };

/**
 * Centrale auth + context helper voor API routes.
 *
 * - Maakt server-side Supabase client
 * - Authenticeert via supabase.auth.getUser()
 * - Haalt profile/org context op via getUserContext()
 */
export async function requireApiContext(opts?: {
  requireOrg?: boolean;
}): Promise<Ok | Err> {
  const supabase = await createClient();
  const uc = await getUserContext();

  if (!uc?.user) {
    return {
      ok: false,
      res: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  if (opts?.requireOrg && !uc.activeOrgId && !uc.isSuperuser) {
    return {
      ok: false,
      res: NextResponse.json({ error: "No active organisation" }, { status: 403 }),
    };
  }

  return {
    ok: true,
    ctx: {
      supabase,
      user: uc.user,
      isSuperuser: uc.isSuperuser,
      activeOrgId: uc.activeOrgId,
      orgRole: uc.orgRole,
    },
  };
}
