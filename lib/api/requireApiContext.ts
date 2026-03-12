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

  // 1) Preferred org comes from profiles.current_org_id (set via OrgSwitcher)
  const { data: profile } = await supabase
    .from("profiles")
    .select("current_org_id")
    .eq("id", user.id)
    .maybeSingle();

  const preferredOrgId = (profile as { current_org_id?: string | null } | null)?.current_org_id ?? null;

  // 2) Resolve membership in preferred org first
  let orgId: string | null = null;

  if (preferredOrgId) {
    const { data: preferredMembership } = await supabase
      .from("organisation_members")
      .select("org_id")
      .eq("user_id", user.id)
      .eq("org_id", preferredOrgId)
      .maybeSingle();

    orgId = preferredMembership?.org_id ?? null;
  }

  // 3) Fallback: first membership (for users without current_org_id yet)
  if (!orgId) {
    const { data: fallbackMembership } = await supabase
      .from("organisation_members")
      .select("org_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    orgId = fallbackMembership?.org_id ?? null;
  }

  if (requireOrg && !orgId) {
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
