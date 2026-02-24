import { requireSuperuser } from "@/lib/auth";
import { createClient } from "@/lib/supabaseServer";
import AdminProjectenClient from "./AdminProjectenClient";
import type { Profile, Project } from "@/types";

export const metadata = { title: "Admin – Projecten" };

export default async function AdminProjectenPage() {
  await requireSuperuser();
  const supabase = await createClient();

  const [{ data: projecten }, { data: eigenaren }] = await Promise.all([
    supabase
      .from("projects")
      .select("*, customer:customers(id, name), owner:profiles!projects_owner_id_fkey(full_name, email)")
      .order("updated_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("id, full_name")
      .order("full_name"),
  ]);

  return (
    <AdminProjectenClient
      projecten={(projecten as any[]) ?? []}
      eigenaren={(eigenaren as Pick<Profile, "id" | "full_name">[]) ?? []}
    />
  );
}
