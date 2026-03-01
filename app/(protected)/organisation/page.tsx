// app/(protected)/organisation/page.tsx
import { createClient } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import OrganisationClient from "./OrganisationClient";

export default async function OrganisationPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Haal profiel + org op
  const { data: profile } = await supabase
    .from("profiles")
    .select("current_org_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.current_org_id) redirect("/dashboard");

  // Check of user org-admin is
  const { data: membership } = await supabase
    .from("organisation_members")
    .select("role")
    .eq("org_id", profile.current_org_id)
    .eq("user_id", user.id)
    .single();

  const isOrgAdmin = membership?.role === "owner" || membership?.role === "admin";
  if (!isOrgAdmin) redirect("/dashboard");

  // Haal org-data op
  const { data: org } = await supabase
    .from("organisations")
    .select("*")
    .eq("id", profile.current_org_id)
    .single();

  // Haal modules op
  const { data: modules } = await supabase
    .from("organisation_modules")
    .select("module, is_enabled")
    .eq("org_id", profile.current_org_id);

  return (
    <OrganisationClient
      org={org}
      modules={modules ?? []}
      orgRole={membership?.role ?? "member"}
    />
  );
}
