import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";

type Options = {
  requireOrg?: boolean;
  module?: string;
};

type Ok = {
  ok: true;
  ctx: {
    supabase: Awaited<ReturnType<typeof createClient>>;
    user: { id: string };
    orgId: string | null;
  };
};

type Err = {
  ok: false;
  res: NextResponse;
};

export async function requireApiContext(
  options: Options = {}
): Promise<Ok | Err> {
  const { requireOrg = false } = options;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      res: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const { data: membership, error: membershipError } = await supabase
    .from("organisation_members")
    .select("org_id")
    .eq("user_id", user.id)
    .single();

  const orgId = membership?.org_id ?? null;

  if (requireOrg && (!orgId || membershipError)) {
    return {
      ok: false,
      res: NextResponse.json({ error: "Geen organisatie gevonden" }, { status: 403 }),
    };
  }

  return {
    ok: true,
    ctx: {
      supabase,
      user: { id: user.id },
      orgId,
    },
  };
}