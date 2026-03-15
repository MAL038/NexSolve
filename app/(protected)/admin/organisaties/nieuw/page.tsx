// app/(protected)/admin/organisaties/nieuw/page.tsx
// Server component — haalt gebruikerslijst op voor de owner-dropdown.

import { requireSuperuser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabaseAdmin";
import NieuweOrgWizard from "./NieuweOrgWizard";

export const metadata = { title: "Nieuwe organisatie — Admin" };

export default async function NieuweOrgPage() {
  await requireSuperuser();

  const admin = createAdminClient();

  // Alle gebruikers ophalen voor de owner-dropdown
  const { data: users } = await admin
    .from("profiles")
    .select("id, full_name, email")
    .eq("is_active", true)
    .order("full_name", { ascending: true });

  return <NieuweOrgWizard users={(users ?? []) as any[]} />;
}
