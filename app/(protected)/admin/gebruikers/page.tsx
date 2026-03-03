// app/(protected)/admin/gebruikers/page.tsx
import { requireSuperuser } from "@/lib/auth";
import { createClient } from "@/lib/supabaseServer";
import GebruikersClient from "./GebruikersClient";
import type { Profile, Organisation } from "@/types";

export const metadata = { title: "Gebruikers — Admin" };

export default async function AdminGebruikersPage() {
  await requireSuperuser();
  const supabase = await createClient();

  // 🔎 DEBUG
  const { data: userData } = await supabase.auth.getUser();
  const { data: isSu } = await supabase.rpc("is_superuser");

  console.log("SERVER USER ID:", userData?.user?.id);
  console.log("SERVER is_superuser:", isSu);

  const [{ data: users }, { data: orgs, error: orgError }] = await Promise.all([
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

  console.log("ORGANISATIONS COUNT:", orgs?.length);
  console.log("ORGANISATIONS ERROR:", orgError);

  return (
    <GebruikersClient
      initialUsers={(users as Profile[]) ?? []}
      organisations={(orgs as Organisation[]) ?? []}
    />
  );
}