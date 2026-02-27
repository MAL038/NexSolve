import { createClient } from "@/lib/supabaseServer";
import type { Project, ThemeWithChildren } from "@/types";
import ProjectsClient from "./ProjectsClient";

export const metadata = { title: "Projecten" };

type PageProps = {
  searchParams?: { theme?: string; process?: string };
};

export default async function ProjectsPage({ searchParams }: PageProps) {
  // (Je gebruikt theme/process nu niet in ProjectsClient, maar laten staan kan geen kwaad)
  const theme = searchParams?.theme ?? "";
  const process = searchParams?.process ?? "";

  const supabase = await createClient();

  // ✅ Haal user op (server-side)
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  // Als dit echt protected is, kun je dit ook hard maken met redirect("/login")
  const currentUserId = user?.id ?? "";

  const [{ data: projects }, { data: hierarchy }] = await Promise.all([
    supabase
      .from("projects")
      .select("*, customer:customers(id, name)")
      .order("created_at", { ascending: false }),
    supabase
      .from("themes")
      .select(`
        id, name, slug, position, created_at,
        processes (
          id, name, slug, position, theme_id, created_at,
          process_types (
            id, name, slug, position, process_id, created_at
          )
        )
      `)
      .order("position", { ascending: true })
      .order("position", { ascending: true, foreignTable: "processes" })
      .order("position", { ascending: true, foreignTable: "processes.process_types" }),
  ]);

  return (
    <ProjectsClient
      initialProjects={(projects as Project[]) ?? []}
      hierarchy={(hierarchy as ThemeWithChildren[]) ?? []}
      currentUserId={currentUserId}
    />
  );
}