/**
 * GET  /api/templates       — Lijst alle projecttemplates
 * POST /api/templates       — Maak een nieuw projecttemplate aan
 *
 * De project_templates tabel moet handmatig aangemaakt worden in Supabase:
 *
 *   create table project_templates (
 *     id            uuid primary key default gen_random_uuid(),
 *     org_id        uuid references organisations(id) on delete cascade,
 *     name          text not null,
 *     description   text,
 *     process_id    uuid references processes(id),
 *     default_tasks jsonb not null default '[]',
 *     created_by    uuid references profiles(id),
 *     is_active     boolean not null default true,
 *     created_at    timestamptz default now(),
 *     updated_at    timestamptz default now()
 *   );
 *   alter table project_templates enable row level security;
 *   -- RLS: org-members kunnen lezen, admins kunnen schrijven
 *
 * Zolang de tabel niet bestaat, geeft de API [] terug zonder fout.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireApiContext } from "@/lib/api";

export async function GET() {
  const auth = await requireApiContext();
  if (!auth.ok) return auth.res;
  const { supabase } = auth.ctx;

  const { data, error } = await supabase
    .from("project_templates" as any)
    .select(`
      id, name, description, is_active, created_at, updated_at,
      default_tasks,
      process:processes(id, name, theme:themes(id, name))
    `)
    .eq("is_active", true)
    .order("name");

  // Als de tabel nog niet bestaat, stuur een nette lege response
  if (error) {
    const isTableMissing =
      error.code === "42P01" ||
      error.message?.includes("does not exist") ||
      error.message?.includes("relation");

    if (isTableMissing) {
      return NextResponse.json({ templates: [], needs_setup: true });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ templates: data ?? [], needs_setup: false });
}

export async function POST(req: NextRequest) {
  const auth = await requireApiContext();
  if (!auth.ok) return auth.res;
  const { supabase, user } = auth.ctx;

  const body = await req.json();
  const { name, description, process_id, default_tasks } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "Naam is verplicht" }, { status: 400 });
  }

  // Haal org_id op van de gebruiker
  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", user.id)
    .single();

  const { data, error } = await supabase
    .from("project_templates" as any)
    .insert({
      name:          name.trim(),
      description:   description?.trim() || null,
      process_id:    process_id || null,
      default_tasks: default_tasks ?? [],
      org_id:        profile?.org_id ?? null,
      created_by:    user.id,
    })
    .select()
    .single();

  if (error) {
    const isTableMissing = error.code === "42P01" || error.message?.includes("does not exist");
    if (isTableMissing) {
      return NextResponse.json(
        { error: "Templates module is nog niet geconfigureerd in de database." },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
