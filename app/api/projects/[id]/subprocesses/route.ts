import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";
import { z } from "zod";

const createSchema = z.object({
  title:       z.string().min(1).max(300),
  description: z.string().max(1000).optional(),
  status:      z.enum(["todo", "in-progress", "done", "blocked"]).default("todo"),
  position:    z.number().int().optional(),
});

interface Params { params: { id: string } }

export async function GET(_: NextRequest, { params }: Params) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("subprocesses")
    .select("*")
    .eq("project_id", params.id)
    .order("position", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest, { params }: Params) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const result = createSchema.safeParse(body);
  if (!result.success)
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 });

  // Auto-assign position at end if not provided
  if (result.data.position === undefined) {
    const { count } = await supabase
      .from("subprocesses")
      .select("*", { count: "exact", head: true })
      .eq("project_id", params.id);
    (result.data as any).position = count ?? 0;
  }

  const { data, error } = await supabase
    .from("subprocesses")
    .insert({ ...result.data, project_id: params.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
