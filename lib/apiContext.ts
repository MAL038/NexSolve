// lib/apiContext.ts
// Central server-side context for API route handlers.
// - Authenticates user
// - Resolves active org (supports both org_members and organisation_members tables)
// - Optional: enforces org-role and module enablement

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";

export type OrgRole = "owner" | "org.admin" | "org.member" | "member" | "viewer" | string;

export type ModuleKey =
  | "dashboard"
  | "projects"
  | "customers"
  | "team"
  | "time"
  | "calendar"
  | "export";

const MODULE_DEFAULTS: Record<string, boolean> = {
  dashboard: true,
  projects: true,
  customers: true,
  team: true,
  time: true,
  calendar: true,
  export: true,
};

function roleRank(role: OrgRole | null | undefined) {
  const r = (role ?? "").toLowerCase();
  if (r === "owner") return 3;
  if (r === "org.admin" || r === "admin") return 2;
  if (r === "org.member" || r === "member") return 1;
  return 0;
}

async function resolveMembership(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
) {
  // Prefer new schema (org_members), but fall back to legacy (organisation_members).
  // We also fall back if the user simply has no row in org_members.
  const primary = await supabase
    .from("org_members")
    .select("org_id, org_role")
    .eq("user_id", userId)
    .order("joined_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!primary.error && primary.data?.org_id) {
    return {
      orgId: primary.data.org_id as string,
      orgRole: (primary.data as any)?.org_role ?? null,
    };
  }

  const legacy = await supabase
    .from("organisation_members")
    .select("org_id, role")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (legacy.error || !legacy.data?.org_id) {
    return { orgId: null as string | null, orgRole: null as OrgRole | null };
  }

  return {
    orgId: legacy.data.org_id as string,
    orgRole: (legacy.data as any)?.role ?? null,
  };
}

async function isModuleEnabled(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orgId: string,
  moduleKey: ModuleKey,
) {
  // Prefer organisation_modules table
  const primary = await supabase
    .from("organisation_modules")
    .select("is_enabled")
    .eq("org_id", orgId)
    .eq("module", moduleKey)
    .maybeSingle();

  if (!primary.error) {
    return primary.data?.is_enabled ?? MODULE_DEFAULTS[moduleKey] ?? true;
  }

  // Fall back to organisations.enabled_modules JSON if present
  const fallback = await supabase
    .from("organisations")
    .select("enabled_modules")
    .eq("id", orgId)
    .maybeSingle();

  const enabled = (fallback.data as any)?.enabled_modules?.[moduleKey];
  return enabled ?? MODULE_DEFAULTS[moduleKey] ?? true;
}

export async function requireApiContext(opts?: {
  module?: ModuleKey;
  minRole?: OrgRole; // e.g. "org.admin" or "owner"
  requireSuperuser?: boolean;
}) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return {
      ok: false as const,
      res: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const { data: isSu } = await supabase.rpc("is_superuser");
  if (opts?.requireSuperuser && !isSu) {
    return {
      ok: false as const,
      res: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  const { orgId, orgRole } = await resolveMembership(supabase, user.id);
  if (!orgId) {
    return {
      ok: false as const,
      res: NextResponse.json({ error: "No organisation for user" }, { status: 403 }),
    };
  }

  if (opts?.minRole && !isSu) {
    if (roleRank(orgRole) < roleRank(opts.minRole)) {
      return {
        ok: false as const,
        res: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      };
    }
  }

  if (opts?.module) {
    const enabled = await isModuleEnabled(supabase, orgId, opts.module);
    if (!enabled) {
      return {
        ok: false as const,
        res: NextResponse.json({ error: "Module disabled" }, { status: 403 }),
      };
    }
  }

  return {
    ok: true as const,
    supabase,
    user,
    orgId,
    orgRole,
    isSuperuser: !!isSu,
  };
}
