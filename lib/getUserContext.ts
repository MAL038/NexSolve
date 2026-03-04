import { createClient } from "@/lib/supabaseServer";

export async function getUserContext() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, active_org_id")
    .eq("id", user.id)
    .single();

  const { data: membership } = await supabase
    .from("organisation_members")
    .select("role, org_id")
    .eq("user_id", user.id)
    .maybeSingle();

  return {
    user,
    isSuperuser: profile?.role === "superuser",
    activeOrgId: profile?.active_org_id ?? membership?.org_id ?? null,
    orgRole: membership?.role ?? null,
  };
}