// app/(protected)/admin/gebruikers/page.tsx
import { requireSuperuser } from "@/lib/auth";
import { createClient } from "@/lib/supabaseServer";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import GebruikersClient from "./GebruikersClient";
import type { Profile, Organisation } from "@/types";

export const metadata = { title: "Gebruikers — Admin" };

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export default async function AdminGebruikersPage() {
  await requireSuperuser();

  const supabase = await createClient();
  const admin = adminClient();

  const [{ data: users }, { data: orgs }] = await Promise.all([
    supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false }),

    // ✅ via service role -> niet stuk door ontbrekende RLS policies
    admin
      .from("organisations")
      .select("id, name, slug, logo_url, is_active, created_by, created_at, updated_at")
      .eq("is_active", true)
      .order("name"),
  ]);

  return (
    <GebruikersClient
      initialUsers={(users as Profile[]) ?? []}
      organisations={(orgs as Organisation[]) ?? []}
    />
  );
}