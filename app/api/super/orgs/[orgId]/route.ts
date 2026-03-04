import { NextResponse } from "next/server";
import { getUserContext } from "@/lib/getUserContext";
import { createAdminClient } from "@/lib/supabaseAdmin";

export async function PATCH(req: Request, { params }: { params: { orgId: string } }) {
  const ctx = await getUserContext();
  if (!ctx?.isSuperuser) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const payload = await req.json();
  const admin = createAdminClient();

  const { data: before } = await admin
    .from("organisations")
    .select("*")
    .eq("id", params.orgId)
    .single();

  const { data: after, error } = await admin
    .from("organisations")
    .update(payload)
    .eq("id", params.orgId)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await admin.from("audit_log").insert({
    actor_user_id: ctx.user.id,
    actor_email: ctx.user.email,
    actor_role: "superuser",
    org_id: params.orgId,
    action: "org.update",
    entity: "organisations",
    entity_id: params.orgId,
    before,
    after,
    ip: req.headers.get("x-forwarded-for"),
    user_agent: req.headers.get("user-agent"),
  });

  return NextResponse.json({ data: after });
}