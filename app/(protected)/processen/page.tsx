// app/(protected)/processen/page.tsx
import { createClient } from "@/lib/supabaseServer";
import { requireAuth } from "@/lib/auth";
import ProcesenClient from "./ProcesenClient";

export const metadata = { title: "Processen — NexSolve" };

export default async function ProcesenPage() {
  await requireAuth();
  const supabase = await createClient();

  const { data: themes } = await supabase
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
    .order("position", { ascending: true, foreignTable: "process_types" });

  return <ProcesenClient themes={themes ?? []} />;
}
