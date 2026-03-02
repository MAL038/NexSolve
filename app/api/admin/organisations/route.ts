// app/api/admin/organisations/route.ts
// Alleen superuser toegang

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { z } from "zod";

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function requireSuperuser() {
  const supabase = await createClient();
  const { data: isSu } = await supabase.rpc("is_superuser");
  if (!isSu) throw new Error("Forbidden");
  return supabase;
}

const schema = z.object({
  name:     z.string().min(1).max(100),
  plan:     z.enum(["trial", "starter", "pro", "enterprise"]).default("trial"),
  owner_id: z.string().uuid().nullable().optional(),
});

// GET — alle organisaties
export async function GET() {
  try {
    await requireSuperuser();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = adminClient();
  const { data, error } = await admin
    .from("organisations")
    .select(`
      id, name, slug, plan, is_active, created_at,
      organisation_members(
        role, user_id,
        profile:profiles!organisation_members_user_id_fkey(
          id, full_name, email
        )
      )
    `)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// POST — nieuwe organisatie aanmaken
export async function POST(req: NextRequest) {
  try {
    await requireSuperuser();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const result = schema.safeParse(body);
  if (!result.success) return NextResponse.json({ error: result.error.flatten() }, { status: 400 });

  const { name, plan, owner_id } = result.data;
  const admin = adminClient();

  // Slug genereren
  let slug = name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  let counter = 0;
  while (true) {
    const testSlug = counter === 0 ? slug : `${slug}-${counter}`;
    const { data: exists } = await admin.from("organisations").select("id").eq("slug", testSlug).maybeSingle();
    if (!exists) { slug = testSlug; break; }
    counter++;
  }

  // Org aanmaken
  const { data: org, error: orgErr } = await admin
    .from("organisations")
    .insert({ name, slug, plan })
    .select()
    .single();

  if (orgErr) return NextResponse.json({ error: orgErr.message }, { status: 500 });

  // Standaard modules activeren
  await admin.from("organisation_modules").insert([
    { org_id: org.id, module: "projects",  is_enabled: true  },
    { org_id: org.id, module: "customers", is_enabled: true  },
    { org_id: org.id, module: "intake",    is_enabled: true  },
    { org_id: org.id, module: "calendar",  is_enabled: true  },
    { org_id: org.id, module: "planning",  is_enabled: false },
    { org_id: org.id, module: "hrm",       is_enabled: false },
  ]);

  // Owner koppelen indien opgegeven
  if (owner_id) {
    await admin.from("organisation_members").upsert({
      org_id: org.id, user_id: owner_id, role: "owner",
    }, { onConflict: "org_id,user_id" });

    await admin.from("profiles")
      .update({ current_org_id: org.id })
      .eq("id", owner_id);
  }

  // Org ophalen met members voor de response
  const { data: full } = await admin
    .from("organisations")
    .select(`
      id, name, slug, plan, is_active, created_at,
      organisation_members(
        role, user_id,
        profile:profiles!organisation_members_user_id_fkey(id, full_name, email)
      )
    `)
    .eq("id", org.id)
    .single();

  return NextResponse.json(full, { status: 201 });
}
