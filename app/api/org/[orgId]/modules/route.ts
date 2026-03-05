import { NextRequest, NextResponse } from "next/server";
import { requireApiContext } from "@/lib/apiContext";
import { z } from "zod";

type Params = { params: Promise<{ orgId: string }> };

const upsertSchema = z.object({
  modules: z.record(z.boolean()),
});

const DEFAULTS: Record<string, boolean> = {
  dashboard: true,
  projects: true,
  customers: true,
  team: true,
  time: true,
  calendar: true,
  export: true,
};

export async function GET(_: NextRequest, { params }: Params) {
  const { orgId } = await params;
    const ctx = await requireApiContext();
  if (!ctx.ok) return ctx.res;
  const { supabase, user, orgId: ctxOrgId, orgRole, isSuperuser } = ctx;
  const { data: isMember } = await supabase.rpc("is_org_member", { p_org_id: orgId });
  const { data: isSu } = await supabase.rpc("is_superuser");
  if (!isSu && !isMember) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });

  const { data, error } = await supabase
    .from("organisation_modules")
    .select("module,is_enabled")
    .eq("org_id", orgId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const map: Record<string, boolean> = { ...DEFAULTS };
  for (const row of data ?? []) map[row.module] = !!row.is_enabled;

  return NextResponse.json(map);
}

export async function PUT(req: NextRequest, { params }: Params) {
  const { orgId } = await params;
    const ctx = await requireApiContext();
  if (!ctx.ok) return ctx.res;
  const { supabase, user, orgId: ctxOrgId, orgRole, isSuperuser } = ctx;
  const { data: isSu } = await supabase.rpc("is_superuser");
  const { data: isAdmin } = await supabase.rpc("is_org_admin", { p_org_id: orgId });
  if (!isSu && !isAdmin) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });

  const body = await req.json();
  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const rows = Object.entries(parsed.data.modules).map(([module, is_enabled]) => ({
    org_id: orgId,
    module,
    is_enabled,
  }));

  const { error } = await supabase
    .from("organisation_modules")
    .upsert(rows, { onConflict: "org_id,module" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}