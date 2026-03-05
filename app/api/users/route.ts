import { NextRequest, NextResponse } from "next/server";
import { requireApiContext } from "@/lib/apiContext";
export async function GET(req: NextRequest) {
    const ctx = await requireApiContext();
  if (!ctx.ok) return ctx.res;
  const { supabase, user, orgId: ctxOrgId, orgRole, isSuperuser } = ctx;
  const query = new URL(req.url).searchParams.get("query")?.trim() ?? "";

  if (query.length < 2)
    return NextResponse.json([]);

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, avatar_url")
    // Search full_name OR email, case-insensitive
    .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
    // Never return the calling user themselves
    .neq("id", user.id)
    .limit(10);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
