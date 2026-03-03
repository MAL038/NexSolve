// app/(protected)/org/page.tsx
import { requireSuperuser } from "@/lib/auth";
import { createClient } from "@/lib/supabaseServer";
import OrgOverviewClient from "./OrgOverviewClient";
import type { Organisation } from "@/types";

export const metadata = { title: "Organisaties" };

export default async function OrgPage() {
  await requireSuperuser();
  const supabase = await createClient();

  // Haal alle orgs op met ledentelling
  const { data: orgs } = await supabase
    .from("organisations")
    .select(`
      *,
      member_count:org_members(count)
    `)
    .order("name");

  // Normaliseer count (Supabase geeft array terug)
  const organisations = (orgs ?? []).map((o: any) => ({
    ...o,
    member_count: o.member_count?.[0]?.count ?? 0,
  }));

  return <OrgOverviewClient organisations={organisations} />;
}
