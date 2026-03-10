import { NextResponse } from "next/server";

import { apiRoute } from "@/lib/api";

export const GET = apiRoute(
  { requireOrg: false, parseBody: false },
  async ({ supabase, user }) => {
    const { data, error } = await supabase
      .from("favourites")
      .select("*")
      .eq("user_id", user.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? []);
  }
);

export const POST = apiRoute(
  { requireOrg: false },
  async ({ supabase, user, body }) => {
    const { entity_type, entity_id } = body ?? {};
    if (!entity_type || !entity_id) {
      return NextResponse.json({ error: "entity_type en entity_id zijn verplicht" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("favourites")
      .upsert(
        { user_id: user.id, entity_type, entity_id },
        { onConflict: "user_id,entity_type,entity_id" }
      )
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  }
);

export const DELETE = apiRoute(
  { requireOrg: false, parseBody: false },
  async ({ req, supabase, user }) => {
    const { searchParams } = new URL(req.url);
    const entity_type = searchParams.get("entity_type");
    const entity_id   = searchParams.get("entity_id");

    const { error } = await supabase
      .from("favourites")
      .delete()
      .eq("user_id", user.id)
      .eq("entity_type", entity_type)
      .eq("entity_id", entity_id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return new NextResponse(null, { status: 204 });
  }
);
