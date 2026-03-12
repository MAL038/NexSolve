// app/api/taken/route.ts
// Haalt alle deeltaken (subprocesses) op voor de huidige org,
// gefilterd op status en/of project indien opgegeven.
import { NextRequest, NextResponse } from "next/server";
import { requireApiContext } from "@/lib/api";

export async function GET(req: NextRequest) {
  const auth = await requireApiContext();
  if (!auth.ok) return auth.res;
  const { supabase } = auth.ctx;

  const { searchParams } = req.nextUrl;
  const status    = searchParams.get("status");
  const projectId = searchParams.get("project_id");
  const limit     = Math.min(parseInt(searchParams.get("limit") ?? "200"), 500);

  let query = supabase
    .from("subprocesses")
    .select(`
      id, title, description, status, position, created_at, updated_at, project_id,
      project:projects!inner(id, name, status, customer:customers(id, name))
    `)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (status && status !== "all") query = query.eq("status", status);
  if (projectId) query = query.eq("project_id", projectId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
