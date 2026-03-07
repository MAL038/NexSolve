// app/(protected)/org/[orgId]/settings/page.tsx

import { requireOrgAdminOrSuperuser, getOrgRole } from "@/lib/auth";
import { createClient } from "@/lib/supabaseServer";
import { notFound } from "next/navigation";
import OrgSettingsClient from "./OrgSettingsClient";
import type { Organisation, OrgMember, OrgRole } from "@/types";

type Params = { params: Promise<{ orgId: string }> };

export async function generateMetadata({ params }: Params) {
  const { orgId } = await params;
  const supabase  = await createClient();
  const { data }  = await supabase.from("organisations").select("name").eq("id", orgId).maybeSingle();
  return { title: `${data?.name ?? "Organisatie"} — Instellingen` };
}

export default async function OrgSettingsPage({ params }: Params) {
  const { orgId } = await params;

  // Vereist org-admin of superuser
  const profile = await requireOrgAdminOrSuperuser(orgId);

  const supabase = await createClient();

  // Haal org op
  const { data: org } = await supabase
    .from("organisations")
    .select("*")
    .eq("id", orgId)
    .maybeSingle();

  if (!org) notFound();

  // Haal leden op
  // Supabase geeft profile terug als array bij een join — we normaliseren dat hier
  const { data: membersRaw } = await supabase
    .from("org_members")
    .select(`
      org_id, user_id, org_role, invited_by, joined_at,
      profile:profiles(id, full_name, email, avatar_url, is_active)
    `)
    .eq("org_id", orgId)
    .order("joined_at", { ascending: true });

  // Normaliseer: profile[] → profile (neem eerste element)
  const members: OrgMember[] = (membersRaw ?? []).map((m: any) => ({
    ...m,
    profile: Array.isArray(m.profile) ? m.profile[0] ?? undefined : m.profile,
  }));

  // Haal org_role van huidige user op
  const orgRole = await getOrgRole(orgId);

  return (
    <OrgSettingsClient
      org={org as Organisation}
      initialMembers={members}
      currentUserId={profile.id}
      currentOrgRole={(orgRole ?? "member") as OrgRole}
    />
  );
}
