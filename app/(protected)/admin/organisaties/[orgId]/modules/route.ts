// app/api/admin/organisations/[orgId]/modules/route.ts
// Superuser-only: modules aan/uitzetten voor een specifieke organisatie.

import { NextRequest, NextResponse } from "next/server";
import { requireSuperuser } from "@/lib/api";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { defaultModuleSet } from "@/lib/moduleDefinitions";
import type { ModuleKey } from "@/lib/moduleDefinitions";
import { z } from "zod";

type Params = { params: Promise<{ orgId: string }> };

const schema = z.object({
  modules: z.record(z.boolean()),
});

// GET — huidige module-staat voor een org
export async function GET(_: NextRequest, { params }: Params) {
  const auth = await requireSuperuser();
  if (!auth.ok) return auth.res;

  const { orgId } = await params;
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("organisation_modules")
    .select("module, is_enabled")
    .eq("org_id", orgId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Merge met defaults zodat alle 10 modules altijd in de response zitten
  const defaults = defaultModuleSet();
  const result: Record<string, boolean> = { ...defaults };
  for (const row of data ?? []) {
    result[row.module] = row.is_enabled;
  }

  return NextResponse.json(result);
}

// PUT — volledige module-staat opslaan voor een org
export async function PUT(req: NextRequest, { params }: Params) {
  const auth = await requireSuperuser();
  if (!auth.ok) return auth.res;

  const { orgId } = await params;

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const admin = createAdminClient();

  const rows = Object.entries(parsed.data.modules).map(([module, is_enabled]) => ({
    org_id: orgId,
    module,
    is_enabled,
  }));

  const { error } = await admin
    .from("organisation_modules")
    .upsert(rows, { onConflict: "org_id,module" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
