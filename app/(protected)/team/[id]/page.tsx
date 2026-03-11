import { createClient } from "@/lib/supabaseServer";
import { getCurrentProfile } from "@/lib/auth";
import { notFound } from "next/navigation";
import TeamDetailClient from "./TeamDetailClient";

export const metadata = { title: "Team detail" };

const FULL_SELECT = `*, leader:profiles!teams_leader_id_fkey(id, full_name, avatar_url),
  members:team_members(team_id, user_id, added_at,
    profile:profiles!team_members_user_id_fkey(id, full_name, email, avatar_url, role))`;

export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const profile  = await getCurrentProfile();

  const { data: team, error } = await supabase
    .from("teams")
    .select(FULL_SELECT)
    .eq("id", id)
    .single();

  if (error || !team) notFound();

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, status, code, customer_id, customer:customers(id, name)")
    .eq("team_id", id)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });

  const canManage = ["superuser", "admin", "projectleider"].includes(profile?.role ?? "");

  return (
    <TeamDetailClient
      team={team}
      initialProjects={projects ?? []}
      currentUserId={profile?.id ?? ""}
      canManage={canManage}
    />
  );
}
