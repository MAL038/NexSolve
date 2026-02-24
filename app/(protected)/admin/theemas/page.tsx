import { requireSuperuser } from "@/lib/auth";
import { createClient } from "@/lib/supabaseServer";
import ThemasClient from "./ThemasClient";
import type { ThemeWithChildren } from "@/types";

export const metadata = { title: "Themas — Admin" };

export default async function AdminThemasPage() {
  await requireSuperuser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("themes")
    .select("id, name, slug, position, created_at, processes(id, name, slug, position, theme_id, created_at)")
    .order("position", { ascending: true })
    .order("position", { ascending: true, foreignTable: "processes" });
  return <ThemasClient initialHierarchy={(data as ThemeWithChildren[]) ?? []} />;
}
