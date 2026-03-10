import { NextResponse } from "next/server";
import { z } from "zod";

import { apiRoute } from "@/lib/api";

const bulkSchema = z.object({
  ids:    z.array(z.string().uuid()).min(1).max(100),
  action: z.enum(["delete", "status"]),
  status: z.enum(["active", "in-progress", "archived"]).optional(),
});

export const POST = apiRoute(
  { requireOrg: false },
  async ({ supabase, body }) => {
    const result = bulkSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
    }

    const { ids, action, status } = result.data;

    if (action === "delete") {
      const { error } = await supabase
        .from("projects")
        .update({ deleted_at: new Date().toISOString() })
        .in("id", ids);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    } else if (action === "status" && status) {
      const { error } = await supabase
        .from("projects")
        .update({ status, updated_at: new Date().toISOString() })
        .in("id", ids);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return new NextResponse(null, { status: 204 });
  }
);
