import { createClient } from "@/lib/supabaseServer";
import TeamClient from "./TeamClient";

export const metadata = { title: "Team" };

export default async function TeamPage() {
  const supabase = await createClient();
  const { data: members } = await supabase
    .from("profiles")
    .select("id, full_name, email, avatar_url, role, created_at")
    .order("created_at", { ascending: true });

  return <TeamClient initialMembers={members ?? []} />;
}
