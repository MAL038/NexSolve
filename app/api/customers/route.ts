// app/api/customers/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";
import { customerSchema } from "@/lib/validators";

// ─── Autonummering (serverside, per team via owner_id) ────────
async function generateNextCode(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ownerId: string,
): Promise<string> {
  const { data } = await supabase
    .from("customers")
    .select("code")
    .eq("owner_id", ownerId)
    .not("code", "is", null);

  if (!data || data.length === 0) return "0001";

  const maxNum = data
    .map(r => parseInt(r.code ?? "0", 10))
    .filter(n => !isNaN(n))
    .reduce((max, n) => Math.max(max, n), 0);

  return String(maxNum + 1).padStart(4, "0");
}

// ─── Lege strings → null helper ───────────────────────────────
function nullify(v?: string | null) {
  return v?.trim() || null;
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("owner_id", user.id)
    .order("code", { ascending: true, nullsFirst: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  // Autonummering serverside uitvoeren vóór validatie
  if (body.autoCode === true) {
    body.code = await generateNextCode(supabase, user.id);
  }

  const result = customerSchema.safeParse(body);
  if (!result.success)
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 });

  const { autoCode, ...fields } = result.data;

  const { data, error } = await supabase
    .from("customers")
    .insert({
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
    if (error.code === "23505")
      return NextResponse.json({ error: `Code '${fields.code}' is al in gebruik.` }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}


// ─────────────────────────────────────────────────────────────
// app/api/customers/[id]/route.ts  (PATCH gedeelte)
// ─────────────────────────────────────────────────────────────
// Vervang de bestaande PATCH handler met onderstaande versie:

export async function PATCH_HANDLER(req: NextRequest, id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { customerUpdateSchema } = await import("@/lib/validators");
  const result = customerUpdateSchema.safeParse(body);
  if (!result.success)
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 });

  const fields = result.data;

  const updatePayload: Record<string, unknown> = {};
  if (fields.name !== undefined)            updatePayload.name            = fields.name;
  if (fields.code !== undefined)            updatePayload.code            = fields.code;
  if (fields.status !== undefined)          updatePayload.status          = fields.status;
  if (fields.email !== undefined)           updatePayload.email           = nullify(fields.email);
  if (fields.phone !== undefined)           updatePayload.phone           = nullify(fields.phone);
  if (fields.website !== undefined)         updatePayload.website         = nullify(fields.website);
  if (fields.address_street !== undefined)  updatePayload.address_street  = nullify(fields.address_street);
  if (fields.address_zip !== undefined)     updatePayload.address_zip     = nullify(fields.address_zip);
  if (fields.address_city !== undefined)    updatePayload.address_city    = nullify(fields.address_city);
  if (fields.address_country !== undefined) updatePayload.address_country = nullify(fields.address_country);
  if (fields.contact_name !== undefined)    updatePayload.contact_name    = nullify(fields.contact_name);
  if (fields.contact_role !== undefined)    updatePayload.contact_role    = nullify(fields.contact_role);
  if (fields.contact_email !== undefined)   updatePayload.contact_email   = nullify(fields.contact_email);
  if (fields.contact_phone !== undefined)   updatePayload.contact_phone   = nullify(fields.contact_phone);

  const { data, error } = await supabase
    .from("customers")
    .update(updatePayload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "23505")
      return NextResponse.json({ error: `Code '${fields.code}' is al in gebruik.` }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
