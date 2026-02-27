import { createClient } from "@/lib/supabaseServer";
import { getCurrentProfile } from "@/lib/auth";
import HoursClient from "./HoursClient";

export const metadata = { title: "Urenregistratie" };

export default async function HoursPage() {
  const supabase = await createClient();
  const profile  = await getCurrentProfile();
  const user     = profile!;

  // Alle actieve projecten waar deze gebruiker bij betrokken is
  const [{ data: ownedRaw }, { data: memberRaw }] = await Promise.all([
    supabase
      .from("projects")
      .select("id, name, status, customer:customers(name)")
      .eq("owner_id", user.id)
      .neq("status", "archived")
      .order("name"),
    supabase
      .from("project_members")
      .select("project:projects!project_members_project_id_fkey(id, name, status, customer:customers(name))")
      .eq("user_id", user.id),
  ]);

  // Dedupliceer
  const projectMap = new Map<string, { id: string; name: string; customerName?: string }>();
  (ownedRaw ?? []).forEach(p => projectMap.set(p.id, {
    id: p.id, name: p.name, customerName: (p.customer as any)?.name,
  }));
  (memberRaw ?? []).forEach(m => {
    const p = m.project as any;
    if (p && p.status !== "archived") {
      projectMap.set(p.id, { id: p.id, name: p.name, customerName: p.customer?.name });
    }
  });

  const projects = Array.from(projectMap.values()).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <HoursClient
      userId={user.id}
      userName={user.full_name}
      projects={projects}
    />
  );
}
