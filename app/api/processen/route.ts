// app/api/processen/route.ts
// Fetches the full theme → process → process_type hierarchy.
// Used by the Processen module (user-facing, read-only overview).
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  const { data, error } = await supabase
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

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
