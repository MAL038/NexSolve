import { createClient } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import type { Profile, OrgRole } from "@/types";

export async function getSession() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return data as Profile | null;
}

export async function requireAuth() {
  const session = await getSession();
  if (!session) redirect("/auth/login");
  return session;
}

export async function requireSuperuser(): Promise<Profile> {
  const session = await getSession();
  if (!session) redirect("/auth/login");

  const supabase = await createClient();
  const { data: isSu } = await supabase.rpc("is_superuser");
  if (!isSu) redirect("/dashboard");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", session.user.id)
    .single();

  if (!profile) redirect("/dashboard");
  return profile as Profile;
}

/**
 * Geeft de org_role van de huidige gebruiker terug voor de opgegeven org.
 *
 * - Superusers hebben geen rij in org_members → fallback: "admin"
 *   (ze hebben platform-brede toegang, dus admin is de juiste weergave)
 * - Gewone leden krijgen hun werkelijke org_role terug
 * - Geen rij gevonden én geen superuser → null
 */
export async function getOrgRole(orgId: string): Promise<OrgRole | null> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Superuser heeft geen org_members rij — geef "admin" terug als fallback
  const { data: isSu } = await supabase.rpc("is_superuser");
  if (isSu === true) return "admin";

  const { data } = await supabase
    .from("org_members")
    .select("org_role")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .maybeSingle();

  return (data?.org_role as OrgRole) ?? null;
}

/**
 * Vereist org-admin OF superuser toegang.
 *
 * Correcte tabel/kolom (uit DB):
 *   public.org_members  →  org_role = 'admin'
 *
 * De is_org_admin(p_org_id) RPC controleert dit al correct.
 */
export async function requireOrgAdminOrSuperuser(orgId: string): Promise<Profile> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Superuser check — SECURITY DEFINER, geen RLS-recursie
  const { data: isSu } = await supabase.rpc("is_superuser");

  if (isSu === true) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (!profile) redirect("/dashboard");
    return profile as Profile;
  }

  // Org-admin check — is_org_admin kijkt in org_members waar org_role = 'admin'
  const { data: isOrgAdmin } = await supabase.rpc("is_org_admin", {
    p_org_id: orgId,
  });

  if (!isOrgAdmin) redirect("/dashboard");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/dashboard");
  return profile as Profile;
}