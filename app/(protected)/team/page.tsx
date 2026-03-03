// app/(protected)/team/page.tsx
import { createClient } from "@/lib/supabaseServer";
import { getCurrentProfile } from "@/lib/auth";
import TeamClient from "./TeamClient";

export const metadata = { title: "Team" };

export default async function TeamPage() {
  const supabase = await createClient();
  const profile  = await getCurrentProfile();

  const { data: members } = await supabase
    .from("profiles")
    .select("id, full_name, email, avatar_url, role, created_at")
    .eq("is_active", true)
    .order("full_name");

  // superuser kan teams beheren; gewone members niet
  const canManageTeams = profile?.role === "superuser";

  return (
    <TeamClient
      initialMembers={members ?? []}
      currentUserId={profile?.id ?? ""}
      currentUserRole={profile?.role ?? "member"}
      canManageTeams={canManageTeams}
    />
  );
}
