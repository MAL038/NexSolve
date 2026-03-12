import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabaseServer";
import TemplatesClient from "./TemplatesClient";

export const metadata = { title: "Templates — NexSolve" };

export default async function TemplatesPage() {
  await requireAuth();
  const supabase = await createClient();

  // Processes ophalen voor het template-formulier
  const { data: processes } = await supabase
    .from("processes")
    .select("id, name, theme:themes(id, name)")
    .order("name");

  // Templates ophalen — graceful fallback als tabel ontbreekt
  const { data: templatesRaw, error } = await supabase
    .from("project_templates" as any)
    .select(`
      id, name, description, is_active, created_at, default_tasks,
      process:processes(id, name, theme:themes(id, name))
    `)
    .eq("is_active", true)
    .order("name");

  const isTableMissing =
    !!error &&
    (error.code === "42P01" ||
      error.message?.includes("does not exist") ||
      error.message?.includes("relation"));

  return (
    <TemplatesClient
      templates={((!error && templatesRaw) ?? []) as any[]}
      processes={(processes ?? []) as any[]}
      needsSetup={isTableMissing}
    />
  );
}
