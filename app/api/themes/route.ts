import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";
import type { ThemeWithChildren } from "@/types";

/**
 * GET /api/themes
 *
 * Returns the full three-level hierarchy in a single request.
 * This is the recommended approach: load everything once on mount,
 * then filter client-side. Avoids cascading waterfall requests.
 *
 * Shape:
 * [
 *   {
 *     id, name, slug, position,
 *     processes: [
 *       {
 *         id, name, slug, position,
 *         process_types: [ { id, name, slug, position } ]
 *       }
 *     ]
 *   }
 * ]
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
    .order("position", { ascending: true, foreignTable: "processes.process_types" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data as ThemeWithChildren[]);
}
