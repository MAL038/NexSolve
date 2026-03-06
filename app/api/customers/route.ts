import { NextResponse } from "next/server";

import { apiRoute } from "@/lib/api";
import { customerSchema } from "@/lib/validators";

type CreateBody = {
  autoCode?: boolean;
  name?: string;
  code?: string | null;
  status?: string;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  address_street?: string | null;
  address_zip?: string | null;
  address_city?: string | null;
  address_country?: string | null;
  contact_name?: string | null;
  contact_role?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
};

async function generateNextCode(
  supabase: any,
  ownerId: string,
): Promise<string> {
  const { data } = await supabase
    .from("customers")
    .select("code")
    .eq("owner_id", ownerId)
    .not("code", "is", null);

  if (!data || data.length === 0) return "0001";

  const maxNum = data
    .map((r: { code: string | null }) => parseInt(r.code ?? "0", 10))
    .filter((n: number) => !Number.isNaN(n))
    .reduce((max: number, n: number) => Math.max(max, n), 0);

  return String(maxNum + 1).padStart(4, "0");
}

function nullify(v?: string | null) {
  return v?.trim() || null;
}

export const GET = apiRoute(
  { requireOrg: false, parseBody: false },
  async ({ supabase, user }) => {
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .eq("owner_id", user.id)
      .order("code", { ascending: true, nullsFirst: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }
);

export const POST = apiRoute(
  { requireOrg: false },
  async ({ supabase, user, body }) => {
    const requestBody: CreateBody = { ...(body ?? {}) };

    if (requestBody.autoCode === true) {
      requestBody.code = await generateNextCode(supabase, user.id);
    }

    const result = customerSchema.safeParse(requestBody);
    if (!result.success) {
      return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
    }

    const { autoCode, ...fields } = result.data;

    const { data, error } = await supabase
      .from("customers")
      .insert({
        owner_id: user.id,
        name: fields.name,
        code: fields.code,
        status: fields.status ?? "active",
        email: nullify(fields.email),
        phone: nullify(fields.phone),
        website: nullify(fields.website),
        address_street: nullify(fields.address_street),
        address_zip: nullify(fields.address_zip),
        address_city: nullify(fields.address_city),
        address_country: nullify(fields.address_country) ?? "Nederland",
        contact_name: nullify(fields.contact_name),
        contact_role: nullify(fields.contact_role),
        contact_email: nullify(fields.contact_email),
        contact_phone: nullify(fields.contact_phone),
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: `Code '${fields.code}' is al in gebruik.` }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  }
);
