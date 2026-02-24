import { requireSuperuser } from "@/lib/auth";
import { createClient } from "@/lib/supabaseServer";
import RollenClient from "./RollenClient";
import type { CustomRole } from "@/types";

export const metadata = { title: "Projectrollen — Admin" };

export default async function AdminRollenPage() {
  await requireSuperuser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("custom_roles")
    .select("*")
    .order("position", { ascending: true });
  return <RollenClient initialRoles={(data as CustomRole[]) ?? []} />;
}
