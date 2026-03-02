// app/(protected)/admin/organisaties/page.tsx
import { createClient } from "@/lib/supabaseServer";
import OrganisatiesClient from "./OrganisatiesClient";

export const metadata = { title: "Organisaties – Admin" };

export default async function OrganisatiesPage() {
  const supabase = await createClient();

  const { data: orgs } = await supabase
    .from("organisations")
    .select(`
      id, name, slug, plan, is_active, created_at,
      organisation_members(
        role, user_id,
        profile:profiles!organisation_members_user_id_fkey(
          id, full_name, email
        )
      )
    `)
    .order("created_at", { ascending: false });

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("is_active", true)
    .order("full_name");

  return (
    <OrganisatiesClient
      initialOrgs={(orgs as any[]) ?? []}
      profiles={profiles ?? []}
    />
  );
}
