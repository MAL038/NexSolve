import { createClient } from "@/lib/supabaseServer";

export async function getUserContext() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, current_org_id")
    .eq("id", user.id)
    .maybeSingle();

  const preferredOrgId = (profile as { current_org_id?: string | null } | null)?.current_org_id ?? null;

  let membership: { role?: string | null; org_id?: string | null } | null = null;

  if (preferredOrgId) {
    const { data } = await supabase
      .from("organisation_members")
      .select("role, org_id")
      .eq("user_id", user.id)
      .eq("org_id", preferredOrgId)
      .maybeSingle();
    membership = data;
  }

  if (!membership) {
    const { data } = await supabase
      .from("organisation_members")
      .select("role, org_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    membership = data;
  }

  return {
    user,
    isSuperuser: profile?.role === "superuser",
    activeOrgId: preferredOrgId ?? membership?.org_id ?? null,
    orgRole: membership?.role ?? null,
  };
}
