import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";

type SuperuserContext = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  user: NonNullable<Awaited<ReturnType<Awaited<ReturnType<typeof createClient>>["auth"]["getUser"]>>["data"]["user"]>;
};

async function requireSuperuser(): Promise<SuperuserContext | null> {
  const supabase = await createClient();

  const { data, error: userErr } = await supabase.auth.getUser();
  const user = data?.user;
  if (userErr || !user) return null;

  // SECURITY DEFINER RPC — leest rol buiten RLS om, geen recursie
  const { data: isSu, error: suErr } = await supabase.rpc("is_superuser");
  if (suErr || !isSu) return null;

  return { supabase, user };
}

export async function GET() {
  const ctx = await requireSuperuser();
  if (!ctx) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });

  const { data, error } = await ctx.supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}