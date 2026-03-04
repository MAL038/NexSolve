import { createClient } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import type { Profile } from "@/types";

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

export async function getSession() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Gebruikt de RLS-policy "eigen rij" — geen recursie
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return data as Profile | null;
}

// ─────────────────────────────────────────────────────────────
// Guards
// ─────────────────────────────────────────────────────────────

/**
 * Vereist een actieve sessie.
 * Redirect naar /auth/login als de gebruiker niet is ingelogd.
 */
export async function requireAuth() {
  const session = await getSession();
  if (!session) redirect("/auth/login");
  return session;
}

/**
 * Vereist de superuser-rol.
 * Gebruikt de SECURITY DEFINER RPC `is_superuser()` om RLS-recursie te vermijden.
 * Redirect naar /dashboard als de gebruiker geen superuser is.
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

/**
 * Vereist dat de gebruiker org-admin (owner) is van de opgegeven organisatie,
 * OF een superuser is op platform-niveau.
 *
 * Logica:
 *  1. Superuser → altijd toegang, ongeacht organisation_members
 *  2. Org-admin  → moet een rij hebben in organisation_members
 *                  met role = 'owner' voor dit specifieke orgId
 *  3. Al het andere → redirect naar /dashboard
 *
 * Gebruik in server components:
 *   const profile = await requireOrgAdminOrSuperuser(params.orgId);
 */
export async function requireOrgAdminOrSuperuser(orgId: string): Promise<Profile> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // ── Stap 1: superuser check via SECURITY DEFINER RPC (geen RLS-recursie) ──
  const { data: isSu } = await supabase.rpc("is_superuser");

  if (isSu === true) {
    // Superuser mag altijd door — haal profiel op via eigen-rij policy
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (!profile) redirect("/dashboard");
    return profile as Profile;
  }

  // ── Stap 2: org-admin check via is_org_admin RPC ──
  // Consistent met AppShell die dezelfde RPC gebruikt
  const { data: isOrgAdmin } = await supabase.rpc("is_org_admin", {
    p_org_id: orgId,
  });

  if (!isOrgAdmin) redirect("/dashboard");

  // ── Stap 3: profiel ophalen voor de org-admin ──
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/dashboard");
  return profile as Profile;
}