import { createClient } from "@/lib/supabaseServer";
import { requireAuth } from "@/lib/auth";
import { notFound } from "next/navigation";
import type { Customer, Project } from "@/types";
import CustomerDetailClient from "./CustomerDetailClient";

interface Props { params: Promise<{ id: string }> }

export default async function CustomerDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await requireAuth();
  const supabase = await createClient();

  // Resolve active org
  const { data: profileRow } = await supabase
    .from("profiles")
    .select("current_org_id")
    .eq("id", session.user.id)
    .maybeSingle();
  const orgId = (profileRow as any)?.current_org_id as string | null;

  const [{ data: customer, error }, { data: linkedProjects }, { data: allProjects }, { data: membership }] =
    await Promise.all([
      supabase.from("customers").select("*").eq("id", id).single(),
      supabase.from("projects").select("*").eq("customer_id", id).order("created_at", { ascending: false }),
      supabase.from("projects").select("*, customer:customers(id, name)").order("name"),
      orgId
        ? supabase.from("organisation_members").select("role").eq("org_id", orgId).eq("user_id", session.user.id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

  if (error || !customer) notFound();

  const orgRole   = (membership as any)?.role ?? "member";
  const canEdit   = !!membership;
  const canDelete = orgRole === "admin" || orgRole === "owner" || orgRole === "org.admin";

  return (
    <CustomerDetailClient
      customer={customer as Customer}
      linkedProjects={(linkedProjects as Project[]) ?? []}
      allProjects={(allProjects as Project[]) ?? []}
      canEdit={canEdit}
      canDelete={canDelete}
    />
  );
}
