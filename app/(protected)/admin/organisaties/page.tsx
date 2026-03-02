// app/(protected)/admin/organisaties/page.tsx
import { createClient } from "@/lib/supabaseServer";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import OrganisatiesClient from "./OrganisatiesClient";

export const metadata = { title: "Organisaties – Admin" };

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function requireSuperuser() {
  const supabase = await createClient();
  const { data: isSu } = await supabase.rpc("is_superuser");
  if (!isSu) throw new Error("Forbidden");
  return supabase;
}

export default async function OrganisatiesPage() {
  try {
    await requireSuperuser();
  } catch {
    return null;
  }

  const admin = adminClient();

  const [{ data: orgs }, { data: profiles }] = await Promise.all([
    admin
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
      .order("created_at", { ascending: false }),
    admin
      .from("profiles")
      .select("id, full_name, email")
      .eq("is_active", true)
      .order("full_name"),
  ]);

  return (
    <OrganisatiesClient
      initialOrgs={(orgs as any[]) ?? []}
      profiles={profiles ?? []}
    />
  );
}
