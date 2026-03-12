// app/(protected)/taken/page.tsx
import { createClient } from "@/lib/supabaseServer";
import { requireAuth } from "@/lib/auth";
import TakenClient from "./TakenClient";

export const metadata = { title: "Taken — NexSolve" };

export default async function TakenPage() {
  await requireAuth();
  const supabase = await createClient();

  const [{ data: tasks }, { data: projects }] = await Promise.all([
    supabase
      .from("subprocesses")
      .select(`
        id, title, description, status, position, created_at, updated_at, project_id,
        project:projects!inner(id, name, status, customer:customers(id, name))
      `)
      .order("updated_at", { ascending: false }),

    supabase
      .from("projects")
      .select("id, name, status")
      .neq("status", "archived")
      .order("name"),
  ]);

  return (
    <TakenClient
      tasks={(tasks ?? []) as any[]}
      projects={(projects ?? []) as any[]}
    />
  );
}
