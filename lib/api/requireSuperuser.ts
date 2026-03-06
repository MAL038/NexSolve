import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";

type Ok = {
  ok: true;
  ctx: {
    supabase: Awaited<ReturnType<typeof createClient>>;
    user: {
      id: string;
    };
  };
};

type Err = {
  ok: false;
  res: NextResponse;
};

export async function requireSuperuser(): Promise<Ok | Err> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      res: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (error || profile?.role !== "superuser") {
    return {
      ok: false,
      res: NextResponse.json({ error: "Geen toegang" }, { status: 403 }),
    };
  }

  return {
    ok: true,
    ctx: {
      supabase,
      user: {
        id: user.id,
      },
    },
  };
}