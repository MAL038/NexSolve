import { createClient } from "@/lib/supabaseServer";
import { notFound } from "next/navigation";
import type { Customer, Project } from "@/types";
import CustomerDetailClient from "./CustomerDetailClient";

interface Props { params: Promise<{ id: string }> }

export default async function CustomerDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: customer, error }, { data: linkedProjects }, { data: allProjects }] =
    await Promise.all([
      supabase.from("customers").select("*").eq("id", id).single(),
      supabase.from("projects").select("*").eq("customer_id", id).order("created_at", { ascending: false }),
      supabase.from("projects").select("*, customer:customers(id, name)").order("name"),
    ]);

  if (error || !customer) notFound();

  return (
    <CustomerDetailClient
      customer={customer as Customer}
      linkedProjects={(linkedProjects as Project[]) ?? []}
      allProjects={(allProjects as Project[]) ?? []}
    />
  );
}
