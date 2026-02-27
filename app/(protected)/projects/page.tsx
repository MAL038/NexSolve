import { createClient } from "@/lib/supabaseServer";
import type { Customer, Project, ThemeWithChildren } from "@/types";
import ProjectsClient from "./ProjectsClient";

export const metadata = { title: "Projecten" };

interface Props {
  searchParams: Promise<{ theme?: string; process?: string }>;
}

export default async function ProjectsPage({ searchParams }: Props) {
  const { theme, process } = await searchParams;
  const supabase = await createClient();

  const [{ data: projects }, { data: customers }, { data: hierarchy }] = await Promise.all([
    supabase
      .from("projects")
      .select("*, customer:customers(id, name)")
      .order("created_at", { ascending: false }),
    supabase
      .from("customers")
      .select("id, name")
      .order("name"),
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
      initialThemeId={theme ?? ""}
      initialProcessId={process ?? ""}
    />
  );
}
