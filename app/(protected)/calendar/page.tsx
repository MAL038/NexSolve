// app/(protected)/calendar/page.tsx
import { createClient } from "@/lib/supabaseServer";
import { requireAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import CalendarClient from "./CalendarClient";
import type { CalendarScope } from "./CalendarClient";
import type { Profile } from "@/types";

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
  if (!session) redirect("/auth/login");

  const supabase = await createClient();

  // ── Alle actieve gebruikers binnen dezelfde org ────────────
  // Org-isolatie: alleen users met dezelfde org_id zichtbaar
  const { data: allUsers } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, role, org_id")
    .eq("is_active", true)
    .eq("org_id", session.org_id ?? "")
    .order("full_name");

  // ── Projecten waar huidige user rechten op heeft ───────────
  const { data: ownedProjects } = await supabase
    .from("projects")
    .select("id, name, status")
    .eq("owner_id", session.id)
    .neq("status", "archived");

  const { data: memberProjects } = await supabase
    .from("project_members")
    .select("project_id, role, project:projects!project_members_project_id_fkey(id, name, status)")
    .eq("user_id", session.id)
    .eq("role", "projectleider");

  // Combineer en dedupliceer
  const projectMap = new Map<string, { id: string; name: string; status: string }>();
  (ownedProjects ?? []).forEach(p => projectMap.set(p.id, p));
  (memberProjects ?? []).forEach(m => {
    const p = m.project as any;
    if (p && p.status !== "archived") projectMap.set(p.id, p);
  });

  // Superuser ziet alle niet-gearchiveerde projecten
  let myProjects = Array.from(projectMap.values());
  if (session.role === "superuser") {
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
      currentUserId={session.id}
      userRole={session.role}
      allUsers={(allUsers ?? []) as any}
      myProjects={myProjects}
    />
  );
}
