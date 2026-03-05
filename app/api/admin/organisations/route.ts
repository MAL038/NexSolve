// app/api/admin/organisations/route.ts
// Alleen superuser toegang

import { NextRequest, NextResponse } from "next/server";
import { requireSuperuser } from "@/lib/api";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { z } from "zod";

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

const schema = z.object({
  name: z.string().min(1).max(100),
  plan: z.enum(["trial", "starter", "pro", "enterprise"]).default("trial"),
  owner_id: z.string().uuid().nullable().optional(),
});

type OrgBase = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  is_active: boolean;
  created_at: string;
};

type OrgMemberBase = {
  org_id: string;
  role: string;
  user_id: string;
};

type ProfileBase = {
  id: string;
  full_name: string;
  email: string;
};

async function fetchOrganisationsWithMembers(admin: ReturnType<typeof adminClient>, orgId?: string) {
  let orgQuery = admin
    .from("organisations")
    .select("id, name, slug, plan, is_active, created_at")
    .order("created_at", { ascending: false });

  if (orgId) orgQuery = orgQuery.eq("id", orgId);

  const { data: orgs, error: orgErr } = await orgQuery;
  if (orgErr) return { error: orgErr.message, data: null };

  const orgRows = (orgs ?? []) as OrgBase[];
  if (orgRows.length === 0) return { error: null, data: [] };

  const orgIds = orgRows.map(o => o.id);

  const { data: members, error: memberErr } = await admin
    .from("organisation_members")
    .select("org_id, role, user_id")
    .in("org_id", orgIds);

  if (memberErr) return { error: memberErr.message, data: null };

  const memberRows = (members ?? []) as OrgMemberBase[];
  const userIds = [...new Set(memberRows.map(m => m.user_id))];

  let profilesById = new Map<string, ProfileBase>();
  if (userIds.length > 0) {
    const { data: profiles, error: profileErr } = await admin
      .from("profiles")
      .select("id, full_name, email")
      .in("id", userIds);

    if (profileErr) return { error: profileErr.message, data: null };
    profilesById = new Map((profiles ?? []).map((p: ProfileBase) => [p.id, p]));
  }

  const data = orgRows.map(org => ({
    ...org,
    organisation_members: memberRows
      .filter(m => m.org_id === org.id)
      .map(m => ({
        role: m.role,
        user_id: m.user_id,
        profile: profilesById.get(m.user_id) ?? null,
      })),
  }));

  return { error: null, data };
}

// GET — alle organisaties
export async function GET() {
  try {
    await requireSuperuser();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = adminClient();
  const { data, error } = await fetchOrganisationsWithMembers(admin);

  if (error) return NextResponse.json({ error }, { status: 500 });
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
    if (!exists) {
      slug = testSlug;
      break;
    }
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
    { org_id: org.id, module: "projects", is_enabled: true },
    { org_id: org.id, module: "customers", is_enabled: true },
    { org_id: org.id, module: "intake", is_enabled: true },
    { org_id: org.id, module: "calendar", is_enabled: true },
    { org_id: org.id, module: "planning", is_enabled: false },
    { org_id: org.id, module: "hrm", is_enabled: false },
  ]);

  // Owner koppelen indien opgegeven
  if (owner_id) {
    await admin.from("organisation_members").upsert(
      {
        org_id: org.id,
        user_id: owner_id,
        role: "owner",
      },
      { onConflict: "org_id,user_id" }
    );

    await admin.from("profiles").update({ current_org_id: org.id }).eq("id", owner_id);
  }

  const { data: fullData, error: fullErr } = await fetchOrganisationsWithMembers(admin, org.id);
  if (fullErr || !fullData || fullData.length === 0) {
    return NextResponse.json(
      {
        ...org,
        organisation_members: [],
      },
      { status: 201 }
    );
  }

  return NextResponse.json(fullData[0], { status: 201 });
}
