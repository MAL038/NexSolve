// app/(protected)/admin/organisaties/page.tsx
import { requireSuperuser } from "@/lib/auth";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import OrganisatiesClient from "./OrganisatiesClient";

export const metadata = { title: "Organisaties — Admin" };

export default async function AdminOrganisatiesPage() {
  await requireSuperuser();

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Twee parallelle queries — Supabase embedded count is onbetrouwbaar
  // voor aggregaties; aparte ledencount is robuuster
  const [{ data: orgs }, { data: memberRows }] = await Promise.all([
    serviceClient
      .from("organisations")
      .select("id, name, slug, created_at")
      .order("name", { ascending: true }),

    serviceClient
      .from("organisation_members")
      .select("org_id"),
  ]);

  // Bouw een map: orgId → aantal leden
  const countMap: Record<string, number> = {};
  for (const row of memberRows ?? []) {
    countMap[row.org_id] = (countMap[row.org_id] ?? 0) + 1;
  }

  // Voeg memberCount toe aan elke org
  const orgsWithCount = (orgs ?? []).map(org => ({
    ...org,
    memberCount: countMap[org.id] ?? 0,
  }));

  return <OrganisatiesClient organisations={orgsWithCount} />;
}
