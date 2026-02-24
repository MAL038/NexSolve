import { createClient } from "@/lib/supabaseServer";
import type { Customer, Project } from "@/types";
import CustomersClient from "./CustomersClient";

export const metadata = { title: "Klanten" };

export default async function CustomersPage() {
  const supabase = await createClient();

  const [{ data: customers }, { data: projects }] = await Promise.all([
    supabase.from("customers").select("*").order("name"),
    supabase.from("projects").select("*, customer:customers(id, name)").order("name"),
  ]);

  return (
    <CustomersClient
      initialCustomers={(customers as Customer[]) ?? []}
      allProjects={(projects as Project[]) ?? []}
    />
  );
}
