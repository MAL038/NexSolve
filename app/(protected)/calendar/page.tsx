// app/(protected)/calendar/page.tsx
import { createClient } from "@/lib/supabaseServer";
import { requireAuth, getCurrentProfile } from "@/lib/auth";
import CalendarClient from "./CalendarClient";
import type { CalendarScope } from "./CalendarClient";

export const metadata = { title: "Kalender" };

interface Props {
  searchParams: Promise<{ scope?: string }>;
}

export default async function CalendarPage({ searchParams }: Props) {
  const { scope: rawScope } = await searchParams;

  const validScopes: CalendarScope[] = ["mine", "team", "org"];
  const scope: CalendarScope = validScopes.includes(rawScope as CalendarScope)
    ? (rawScope as CalendarScope)
    : "mine";

  const session = await requireAuth();
  const supabase = await createClient();
  const profile  = await getCurrentProfile();

  // ── Alle actieve gebruikers binnen dezelfde org ────────────
  const { data: allUsers } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, role")
    .eq("is_active", true)
    .order("full_name");

  // ── Projecten waar huidige user rechten op heeft ───────────
  const { data: ownedProjects } = await supabase
    .from("projects")
    .select("id, name, status")
    .eq("owner_id", session.user.id)
    .neq("status", "archived");

  // projectleider (vroeger: admin) in project_members
  const { data: leadProjects } = await supabase
    .from("project_members")
    .select("project_id, role, project:projects!project_members_project_id_fkey(id, name, status)")
    .eq("user_id", session.user.id)
    .eq("role", "projectleider");

  const projectMap = new Map<string, { id: string; name: string; status: string }>();
  (ownedProjects ?? []).forEach(p => projectMap.set(p.id, p));
  (leadProjects ?? []).forEach(m => {
    const p = m.project as any;
    if (p && p.status !== "archived") projectMap.set(p.id, p);
  });

  // Superuser ziet alle niet-gearchiveerde projecten
  let myProjects = Array.from(projectMap.values());
  if (profile?.role === "superuser") {
    const { data: allProjects } = await supabase
      .from("projects")
      .select("id, name, status")
      .neq("status", "archived")
      .order("name");
    myProjects = allProjects ?? [];
  }

  return (
    <CalendarClient
      initialScope={scope}
      currentUserId={session.user.id}
      userRole={profile?.role ?? "member"}
      allUsers={(allUsers ?? []) as any}
      myProjects={myProjects}
    />
  );
}
