// lib/auth.ts
import { createClient } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import type { Profile, OrgRole } from "@/types";

// ─────────────────────────────────────────────────────────────
// PLATFORM GUARDS
// ─────────────────────────────────────────────────────────────

/**
 * Geeft de Supabase Session terug.
 * Backward-compatible: bestaande pages gebruiken session.user.id
 */
export async function getSession(): Promise<Session | null> {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

/**
 * Vereist een ingelogde sessie.
 * Geeft de Supabase Session terug (session.user.id werkt overal).
 * Redirect naar /auth/login als niet ingelogd.
 */
export async function requireAuth(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/auth/login");
  return session;
}

/**
 * Haal het profiel op van de huidige ingelogde gebruiker.
 * Geeft null terug als niet ingelogd of profiel niet gevonden.
 */
export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (data as Profile) ?? null;
}

/**
 * Vereist superuser.
 * Redirect naar /dashboard als niet superuser.
 * Geeft het volledige Profile terug.
 */
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

// ─────────────────────────────────────────────────────────────
// ORG GUARDS
// ─────────────────────────────────────────────────────────────

/**
 * Haal de org_role op van de huidige user voor een specifieke org.
 * Geeft null terug als de user geen lid is van die org.
 */
export async function getOrgRole(orgId: string): Promise<OrgRole | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("org_members")
    .select("org_role")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .maybeSingle();

  return (data?.org_role as OrgRole) ?? null;
}

/**
 * Vereist org-admin of superuser.
 * Geeft het Profile terug (niet Session — org pages hebben Profile nodig).
 * Redirect naar /dashboard als niet gemachtigd.
 */
export async function requireOrgAdmin(orgId: string): Promise<Profile> {
  const session = await getSession();
  if (!session) redirect("/auth/login");

  const supabase = await createClient();

  // Haal profiel op
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", session.user.id)
    .single();

  if (!profile) redirect("/auth/login");

  // Superuser heeft altijd toegang
  if ((profile as Profile).role === "superuser") return profile as Profile;

  // Controleer org-admin via RPC (SECURITY DEFINER, geen recursie)
  const { data: isAdmin } = await supabase.rpc("is_org_admin", { p_org_id: orgId });
  if (!isAdmin) redirect("/dashboard");

  return profile as Profile;
}

/**
 * Vereist lid van een org (any role) of superuser.
 * Geeft het Profile terug.
 */
export async function requireOrgMember(orgId: string): Promise<Profile> {
  const session = await getSession();
  if (!session) redirect("/auth/login");

  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", session.user.id)
    .single();

  if (!profile) redirect("/auth/login");

  if ((profile as Profile).role === "superuser") return profile as Profile;

  const { data: isMember } = await supabase.rpc("is_org_member", { p_org_id: orgId });
  if (!isMember) redirect("/dashboard");

  return profile as Profile;
}

// ─────────────────────────────────────────────────────────────
// CONVENIENCE HELPERS (geen redirect, voor conditionele UI)
// ─────────────────────────────────────────────────────────────

export function isSuperuser(profile: Profile): boolean {
  return profile.role === "superuser";
}

export function isOrgAdmin(orgRole: OrgRole | null): boolean {
  return orgRole === "admin";
}