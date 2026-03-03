// app/(protected)/admin/gebruikers/page.tsx
import { requireSuperuser } from "@/lib/auth";
import { createClient } from "@/lib/supabaseServer";
import GebruikersClient from "./GebruikersClient";
import type { Profile, Organisation } from "@/types";

export const metadata = { title: "Gebruikers — Admin" };

export default async function AdminGebruikersPage() {
  await requireSuperuser();
  const supabase = await createClient();

  const [{ data: users }, { data: orgs }] = await Promise.all([
    supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase
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
