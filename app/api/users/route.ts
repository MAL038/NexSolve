import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
