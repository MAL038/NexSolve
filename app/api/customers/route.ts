// app/api/customers/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";
import { customerSchema } from "@/lib/validators";

// ─── Autonummering (serverside, per org) ──────────────────────
async function generateNextCode(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orgId: string,
): Promise<string> {
  const { data, error } = await supabase
    .from("customers")
    .select("code")
    .eq("org_id", orgId)
    .not("code", "is", null);

  if (error) throw error;
  if (!data || data.length === 0) return "0001";

  const maxNum = data
    .map((r) => parseInt(r.code ?? "0", 10))
    .filter((n) => !isNaN(n))
    .reduce((max, n) => Math.max(max, n), 0);

  return String(maxNum + 1).padStart(4, "0");
}

// ─── Lege strings → null helper ───────────────────────────────
function nullify(v?: string | null) {
  return v?.trim() || null;
}

// ─── Org context helper (user -> org_id) ──────────────────────
async function getOrgId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
) {
  const { data, error } = await supabase
    .from("organisation_members")
    .select("org_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data?.org_id ?? null;
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getOrgId(supabase, user.id);
  if (!orgId) return NextResponse.json({ error: "No organisation for user" }, { status: 403 });

  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("org_id", orgId)
    .order("code", { ascending: true, nullsFirst: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getOrgId(supabase, user.id);
  if (!orgId) return NextResponse.json({ error: "No organisation for user" }, { status: 403 });

  const body = await req.json();

  // Autonummering serverside uitvoeren vóór validatie
  if (body.autoCode === true) {
    body.code = await generateNextCode(supabase, orgId);
  }

  const result = customerSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
  }

  const { autoCode, ...fields } = result.data;

  const { data, error } = await supabase
    .from("customers")
    .insert({
      org_id:          orgId,
      owner_id:        user.id,
      name:            fields.name,
      code:            fields.code,
      status:          fields.status ?? "active",
      email:           nullify(fields.email),
      phone:           nullify(fields.phone),
      website:         nullify(fields.website),
      address_street:  nullify(fields.address_street),
      address_zip:     nullify(fields.address_zip),
      address_city:    nullify(fields.address_city),
      address_country: nullify(fields.address_country) ?? "Nederland",
      contact_name:    nullify(fields.contact_name),
      contact_role:    nullify(fields.contact_role),
      contact_email:   nullify(fields.contact_email),
      contact_phone:   nullify(fields.contact_phone),
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: `Code '${fields.code}' is al in gebruik.` },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}