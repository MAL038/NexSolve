// app/(protected)/beheer/page.tsx
// Functioneel beheerpaneel voor org-owners.
// Toont: org-instellingen, leden, activiteitenlog (eigen org).

import { createClient } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import BeheerClient from "./BeheerClient";

export const metadata = { title: "Beheer" };

export default async function BeheerPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("current_org_id, id")
    .eq("id", user.id)
    .single();

  if (!profile?.current_org_id) redirect("/dashboard");

  // Alleen owner heeft toegang
  const { data: membership } = await supabase
    .from("organisation_members")
    .select("role")
    .eq("org_id", profile.current_org_id)
    .eq("user_id", user.id)
    .single();

  if (membership?.role !== "owner") redirect("/dashboard");

  const orgId = profile.current_org_id;

  const [
    { data: org },
    { data: modules },
    { data: members },
    { data: activity },
    { data: projectCount },
  ] = await Promise.all([
    supabase.from("organisations").select("*").eq("id", orgId).single(),
    supabase.from("organisation_modules").select("module, is_enabled").eq("org_id", orgId),
    supabase
      .from("organisation_members")
      .select("role, joined_at, profile:profiles!organisation_members_user_id_fkey(id, full_name, email, avatar_url, is_active)")
      .eq("org_id", orgId)
      .order("joined_at", { ascending: true }),
    supabase
      .from("activity_log")
      .select("*, actor:profiles!activity_log_actor_id_fkey(id, full_name, avatar_url)")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase.from("projects").select("id", { count: "exact", head: true }).eq("org_id", orgId),
  ]);

  return (
    <BeheerClient
      org={org}
      modules={modules ?? []}
      members={(members ?? []) as any[]}
      activity={(activity ?? []) as any[]}
      projectCount={projectCount ?? 0}
    />
  );
}
