import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/apiContext";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getUserContext } from "@/lib/getUserContext";

export async function PATCH(req: Request) {
  const ctx = await getUserContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!ctx.activeOrgId) {
    return NextResponse.json({ error: "No active org" }, { status: 400 });
  }

  if (!ctx.isSuperuser && !["owner", "admin"].includes(ctx.orgRole ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const payload = await req.json();
  const admin = createAdminClient();

  const { data: before } = await admin
    .from("organisations")
    .select("*")
    .eq("id", ctx.activeOrgId)
    .single();

  const { data: after, error } = await admin
    .from("organisations")
    .update(payload)
    .eq("id", ctx.activeOrgId)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await admin.from("audit_log").insert({
    actor_user_id: ctx.user.id,
    actor_email: ctx.user.email,
    actor_role: ctx.isSuperuser ? "superuser" : ctx.orgRole,
    org_id: ctx.activeOrgId,
    action: "org.update",
    entity: "organisations",
    entity_id: ctx.activeOrgId,
    before,
    after,
    ip: req.headers.get("x-forwarded-for"),
    user_agent: req.headers.get("user-agent"),
  });

  return NextResponse.json({ data: after });
}