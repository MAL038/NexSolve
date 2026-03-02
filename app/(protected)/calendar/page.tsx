// app/(protected)/calendar/page.tsx
import { createClient } from "@/lib/supabaseServer";
import { getCurrentProfile } from "@/lib/auth";
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

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const profile = await getCurrentProfile();

  // Alle actieve gebruikers (voor filterbalk + planningsmodaal)
  const { data: allUsers } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, role")
    .eq("is_active", true)
    .order("full_name");

  // Projecten waar huidige user rechten op heeft (eigenaar of admin-member)
  const { data: ownedProjects } = await supabase
    .from("projects")
    .select("id, name, status")
    .eq("owner_id", user?.id ?? "")
    .neq("status", "archived");

  const { data: adminMemberships } = await supabase
    .from("project_members")
    .select("project_id, role, project:projects!project_members_project_id_fkey(id, name, status)")
    .eq("user_id", user?.id ?? "")
    .eq("role", "lead");

  // Combineer en dedupliceer
  const projectMap = new Map<string, { id: string; name: string; status: string }>();
  (ownedProjects ?? []).forEach(p => projectMap.set(p.id, p));
  (adminMemberships ?? []).forEach(m => {
    const p = m.project as any;
    if (p && p.status !== "archived") projectMap.set(p.id, p);
  });

  // Org-owners/superusers mogen alle niet-gearchiveerde projecten inplannen
  let myProjects = Array.from(projectMap.values());
  
  // Check of user org-owner is
  let isOrgOwner = false;
  if (profile?.current_org_id) {
    const { data: ownerMembership } = await supabase
      .from("organisation_members")
      .select("role")
      .eq("org_id", profile.current_org_id)
      .eq("user_id", profile.id)
      .single();
    isOrgOwner = ownerMembership?.role === "owner";
  }

  if (isOrgOwner || profile?.role === "superuser") {
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
      currentUserId={user?.id ?? ""}
      userRole={profile?.role ?? "member"}
      isOrgOwner={isOrgOwner}
      allUsers={(allUsers ?? []) as any}
      myProjects={myProjects}
    />
  );
}
