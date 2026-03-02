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

  // Haal org-rol op server-side zodat de sidebar geen extra fetch nodig heeft
  let isOrgAdmin = false;
  if (profile?.current_org_id) {
    const { data: membership } = await supabase
      .from("organisation_members")
      .select("role")
      .eq("org_id", profile.current_org_id)
      .eq("user_id", profile.id)
      .single();
    isOrgAdmin = membership?.role === "owner";
  }

  return (
    <AppShellClient
      sidebar={
        <Sidebar
          profile={profile}
          hierarchy={(hierarchy as ThemeWithChildren[]) ?? []}
          isSuperuser={isSuperuser}
          isOrgAdmin={isOrgAdmin}
        />
      }
    >
      {children}
    </AppShellClient>
  );
}
