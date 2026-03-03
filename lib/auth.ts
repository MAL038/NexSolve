// lib/auth.ts
import { createClient } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import type { Profile, OrgRole } from "@/types";

// ─── Basishelper: haal huidig profiel op ─────────────────────
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

// ─── Platform guards ──────────────────────────────────────────

/** Vereist een ingelogde gebruiker. Redirect naar login als niet ingelogd. */
export async function requireAuth(): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/auth/login");
  return profile;
}

/** Vereist superuser. Redirect naar dashboard als niet superuser. */
export async function requireSuperuser(): Promise<Profile> {
  const profile = await requireAuth();
  if (profile.role !== "superuser") redirect("/dashboard");
  return profile;
}

// ─── Org-level guards ─────────────────────────────────────────

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
 * Vereist dat de huidige user admin is van de opgegeven org.
 * Superusers worden altijd doorgelaten (zij staan boven alle orgs).
 * Redirect naar dashboard als niet gemachtigd.
 */
export async function requireOrgAdmin(orgId: string): Promise<Profile> {
  const profile = await requireAuth();

  // Superuser heeft altijd toegang
  if (profile.role === "superuser") return profile;

  const orgRole = await getOrgRole(orgId);
  if (orgRole !== "admin") redirect("/dashboard");

  return profile;
}

/**
 * Vereist dat de huidige user lid (any role) is van de opgegeven org.
 * Superusers worden altijd doorgelaten.
 */
export async function requireOrgMember(orgId: string): Promise<Profile> {
  const profile = await requireAuth();
  if (profile.role === "superuser") return profile;

  const orgRole = await getOrgRole(orgId);
  if (!orgRole) redirect("/dashboard");

  return profile;
}

// ─── Convenience checks (geen redirect, voor conditionele UI) ─

export function isSuperuser(profile: Profile): boolean {
  return profile.role === "superuser";
}

export function isOrgAdmin(orgRole: OrgRole | null): boolean {
  return orgRole === "admin";
}
