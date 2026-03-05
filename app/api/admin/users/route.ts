import { NextResponse } from "next/server";
import { requireSuperuser } from "@/lib/api";

export async function GET() {
  const su = await requireSuperuser();
  if (!su.ok) return su.res;
  const sb = su.supabase;

  const { data, error } = await sb
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}