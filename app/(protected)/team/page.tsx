// app/(protected)/team/page.tsx
import { createClient } from "@/lib/supabaseServer";
import { getCurrentProfile } from "@/lib/auth";
import TeamClient from "./TeamClient";

export const metadata = { title: "Team" };

export default async function TeamPage() {
  const supabase = await createClient();
  const profile  = await getCurrentProfile();

  // Resolve active org from profiles.current_org_id
  const { data: profileFull } = await supabase
    .from("profiles")
    .select("current_org_id")
    .eq("id", profile?.id ?? "")
    .maybeSingle();

  const orgId = (profileFull as any)?.current_org_id as string | null;

  // Haal alleen leden op die bij de actieve org horen via organisation_members join
  let members: any[] = [];
  if (orgId) {
    const { data } = await supabase
      .from("organisation_members")
      .select("role, joined_at, profile:profiles!organisation_members_user_id_fkey(id, full_name, email, avatar_url, role, created_at)")
      .eq("org_id", orgId)
      .order("joined_at", { ascending: true });
    members = (data ?? []).map((m: any) => ({
      ...m.profile,
      org_role: m.role,
      created_at: m.profile?.created_at ?? m.joined_at,
    }));
  }

  // superuser, admin en projectleider kunnen teams beheren
  const canManageTeams = ["superuser", "admin", "projectleider"].includes(profile?.role ?? "");

  return (
    <TeamClient
      initialMembers={members}
      currentUserId={profile?.id ?? ""}
      currentUserRole={profile?.role ?? "member"}
      canManageTeams={canManageTeams}
    />
  );
}
