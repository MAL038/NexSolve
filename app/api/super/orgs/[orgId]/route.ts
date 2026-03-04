import { NextResponse } from "next/server";
import { getUserContext } from "@/lib/getUserContext";
import { createAdminClient } from "@/lib/supabaseAdmin";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await context.params;

  const ctx = await getUserContext();
  if (!ctx?.isSuperuser) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const payload = await req.json();
  const admin = createAdminClient();

  const { data: before, error: e1 } = await admin
    .from("organisations")
    .select("*")
    .eq("id", orgId)
    .single();

  if (e1) return NextResponse.json({ error: e1.message }, { status: 400 });

  const { data: after, error: e2 } = await admin
    .from("organisations")
    .update(payload)
    .eq("id", orgId)
    .select("*")
    .single();

  if (e2) return NextResponse.json({ error: e2.message }, { status: 400 });

  await admin.from("audit_log").insert({
    actor_user_id: ctx.user.id,
    actor_email: ctx.user.email,
    actor_role: "superuser",
    org_id: orgId,
    action: "org.update",
    entity: "organisations",
    entity_id: orgId,
    before,
    after,
    ip: req.headers.get("x-forwarded-for"),
    user_agent: req.headers.get("user-agent"),
  });

  return NextResponse.json({ data: after });
}