const ctx = await getUserContext();

if (!ctx || !ctx.activeOrgId) {
  notFound();
}

if (!ctx.isSuperuser && !["owner", "admin"].includes(ctx.orgRole ?? "")) {
  notFound();
}