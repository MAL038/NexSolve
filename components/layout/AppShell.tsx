// components/layout/AppShell.tsx
import Sidebar from "@/components/layout/Sidebar";
import AppShellClient from "@/components/layout/AppShellClient";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabaseServer";
import type { ThemeWithChildren } from "@/types";

export default async function AppShell({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const [profile, { data: hierarchy }, { data: isSu }] = await Promise.all([
    getCurrentProfile(),
    supabase
      .from("themes")
      .select(`id, name, slug, position, created_at, processes(id, name, slug, position, theme_id, created_at)`)
      .order("position", { ascending: true })
      .order("position", { ascending: true, foreignTable: "processes" }),
    supabase.rpc("is_superuser"),
  ]);

  const isSuperuser = isSu === true;

  // ── Org-admin context ophalen ──────────────────────────────
  // Alleen doen als de gebruiker GEEN superuser is — superusers
  // hebben geen organisation_members rij en de RPC zou false teruggeven.
  let isOrgAdmin = false;
  let orgId: string | null = null;
  let orgName: string | null = null;

  if (!isSuperuser && profile) {
    // Haal de org op waar deze gebruiker owner van is
    const { data: membership } = await supabase
      .from("organisation_members")
      .select("org_id, role, organisations(id, name)")
      .eq("user_id", profile.id)
      .eq("role", "owner")
      .maybeSingle();

    if (membership) {
      isOrgAdmin = true;
      orgId      = membership.org_id;
      // organisations kan een object of array zijn afhankelijk van de join
      const org  = Array.isArray(membership.organisations)
        ? membership.organisations[0]
        : membership.organisations;
      orgName    = org?.name ?? null;
    }
  }

  return (
    <AppShellClient
      sidebar={
        <Sidebar
          profile={profile}
          hierarchy={(hierarchy as ThemeWithChildren[]) ?? []}
          isSuperuser={isSuperuser}
          isOrgAdmin={isOrgAdmin}
          orgId={orgId}
          orgName={orgName}
        />
      }
    >
      {children}
    </AppShellClient>
  );
}
