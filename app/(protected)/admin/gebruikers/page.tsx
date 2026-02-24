import { requireSuperuser } from "@/lib/auth";
import { createClient } from "@/lib/supabaseServer";
import GebruikersClient from "./GebruikersClient";
import type { Profile } from "@/types";

export const metadata = { title: "Gebruikers — Admin" };

export default async function AdminGebruikersPage() {
  await requireSuperuser();
  const supabase = await createClient();
  const { data: users } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });
  return <GebruikersClient initialUsers={(users as Profile[]) ?? []} />;
}
