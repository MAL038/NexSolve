// app/(protected)/processen/[id]/page.tsx
import { createClient } from "@/lib/supabaseServer";
import { requireAuth } from "@/lib/auth";
import { notFound } from "next/navigation";
import ProcesDetailClient from "./ProcesDetailClient";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("themes").select("name").eq("id", id).single();
  return { title: data?.name ? `${data.name} — Processen` : "Thema — NexSolve" };
}

export default async function ProcesDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAuth();
  const { id } = await params;
  const supabase = await createClient();

  const { data: theme } = await supabase
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
    .eq("id", id)
    .order("position", { ascending: true, foreignTable: "processes" })
    .order("position", { ascending: true, foreignTable: "process_types" })
    .single();

  if (!theme) notFound();

  return <ProcesDetailClient theme={theme as any} />;
}
