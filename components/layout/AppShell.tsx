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

  // ── Org-context ophalen ───────────────────────────────────────
  // We hebben orgId + orgName nodig voor het "Beheer" menu-item in de Sidebar.
  //
  // Strategie:
  //   1. Superuser zonder org_members rij → orgId via profiles.org_id (als die bestaat)
  //      of via de eerste org in de lijst (superusers beheren alles).
  //   2. Org-admin → org_members rij met org_role = 'admin'.
  //   3. Gewone member → geen Beheer-link nodig.

  let orgId:     string | null = null;
  let orgName:   string | null = null;
  let isOrgAdmin = false;

  if (profile) {
    if (isSuperuser) {
      // Superuser: haal de eerste actieve org op zodat de Beheer-link werkt.
      // Als de superuser zelf ook org-admin is van een specifieke org,
      // pakken we die org_members rij; anders de eerste org.
      const { data: ownRow } = await supabase
        .from("org_members")
        .select("org_id, organisations(id, name)")
        .eq("user_id", profile.id)
        .eq("org_role", "admin")
        .maybeSingle();

      if (ownRow?.org_id) {
        // Superuser is ook org-admin van een specifieke org
        orgId   = ownRow.org_id;
        orgName = (ownRow.organisations as any)?.name ?? null;
      } else {
        // Superuser zonder org-admin rol: pak de eerste org om te kunnen navigeren
        const { data: firstOrg } = await supabase
          .from("organisations")
          .select("id, name")
          .eq("is_active", true)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();

        orgId   = firstOrg?.id   ?? null;
        orgName = firstOrg?.name ?? null;
      }

      // Superuser krijgt altijd de Beheer-link (mits er een org is)
      isOrgAdmin = orgId !== null;

    } else {
      // Gewone gebruiker: check of ze org-admin zijn
      const { data: membership } = await supabase
        .from("org_members")
        .select("org_id, org_role, organisations(id, name)")
        .eq("user_id", profile.id)
        .eq("org_role", "admin")
        .maybeSingle();

      if (membership?.org_id) {
        isOrgAdmin = true;
        orgId      = membership.org_id;
        orgName    = (membership.organisations as any)?.name ?? null;
      }
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
