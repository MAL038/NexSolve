// app/(protected)/admin/organisaties/page.tsx
import { requireSuperuser } from "@/lib/auth";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import Link from "next/link";
import { Building2, Plus, ArrowRight } from "lucide-react";
import OrganisatiesClient from "./OrganisatiesClient";

export const metadata = { title: "Organisaties — Admin" };

export default async function AdminOrganisatiesPage() {
  await requireSuperuser();

  // Service role client — superuser heeft geen organisation_members rij
  // dus de normale client zou lege resultaten geven via RLS
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Haal alle organisaties op met ledencount in één query
  const { data: orgs, error } = await serviceClient
    .from("organisations")
    .select(`
      id,
      name,
      slug,
      created_at,
      organisation_members ( count )
    `)
    .order("name", { ascending: true });

  if (error) {
    console.error("AdminOrganisatiesPage fetch error:", error.message);
  }

  return <OrganisatiesClient organisations={orgs ?? []} />;
}
