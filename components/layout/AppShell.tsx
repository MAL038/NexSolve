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

  // ── Org-admin context ────────────────────────────────────────
  // Alleen ophalen als de gebruiker geen superuser is.
  // Tabel: org_members, kolom: org_role = 'admin'
  let isOrgAdmin = false;
  let orgId: string | null = null;
  let orgName: string | null = null;

  if (!isSuperuser && profile) {
    const { data: membership } = await supabase
      .from("org_members")
      .select(`
        org_id,
        org_role,
        organisations ( id, name )
      `)
      .eq("user_id", profile.id)
      .eq("org_role", "admin")
      .maybeSingle();

    if (membership) {
      isOrgAdmin = true;
      orgId      = membership.org_id;
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
