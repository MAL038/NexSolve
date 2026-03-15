// app/(protected)/admin/organisaties/[orgId]/page.tsx
// Superuser-only detailpagina voor een specifieke organisatie.
// Haalt alle data server-side op en geeft door aan OrgDetailClient.

import { requireSuperuser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { redirect } from "next/navigation";
import OrgDetailClient from "./OrgDetailClient";
import { defaultModuleSet } from "@/lib/moduleDefinitions";
import type { ModuleKey } from "@/lib/moduleDefinitions";

export const metadata = { title: "Organisatie — Admin" };

type Params = { params: Promise<{ orgId: string }> };

export default async function AdminOrgDetailPage({ params }: Params) {
  await requireSuperuser();

  const { orgId } = await params;
  const admin = createAdminClient();

  // Alle data parallel ophalen
  const [
    { data: org, error: orgErr },
    { data: moduleRows },
    { data: memberRows },
    { count: projectCount },
  ] = await Promise.all([
    admin
      .from("organisations")
      .select("id, name, slug, plan, is_active, created_at, logo_url, primary_color, accent_color")
      .eq("id", orgId)
      .single(),

    admin
      .from("organisation_modules")
      .select("module, is_enabled")
      .eq("org_id", orgId),

    admin
      .from("org_members")
      .select("user_id, org_role, joined_at, profiles(id, full_name, email, avatar_url, role)")
      .eq("org_id", orgId)
      .order("joined_at", { ascending: true }),

    admin
      .from("projects")
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId),
  ]);

  if (orgErr || !org) redirect("/admin/organisaties");

  // Bouw module-map: DB-waarden over defaults heen
  const modulesMap = defaultModuleSet() as Record<string, boolean>;
  for (const row of moduleRows ?? []) {
    modulesMap[row.module] = row.is_enabled;
  }

  return (
    <OrgDetailClient
      org={org as any}
      modulesMap={modulesMap}
      members={(memberRows ?? []) as any[]}
      projectCount={projectCount ?? 0}
    />
  );
}
