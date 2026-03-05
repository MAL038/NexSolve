export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const ctx = await requireApiContext({ module: "customers" });
  if (!ctx.ok) return ctx.res;

  const body = await req.json();
  const result = customerUpdateSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
  }

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

  const { data, error } = await ctx.supabase
    .from("customers")
    .update(updatePayload)
    .eq("id", id)
    .eq("org_id", ctx.orgId)
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

  return NextResponse.json(data);
}