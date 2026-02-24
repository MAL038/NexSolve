import Sidebar from "@/components/layout/Sidebar";
import Topbar  from "@/components/layout/Topbar";
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

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar profile={profile} hierarchy={(hierarchy as ThemeWithChildren[]) ?? []} isSuperuser={isSuperuser} />

      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
