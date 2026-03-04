// app/(protected)/org/[orgId]/settings/page.tsx
import { requireOrgAdminOrSuperuser } from "@/lib/auth";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import OrgSettingsClient from "./OrgSettingsClient";

export const metadata = { title: "Organisatie-instellingen" };

interface Props {
  params:       Promise<{ orgId: string }>;
  searchParams: Promise<{ from?: string }>;
}

export default async function OrgSettingsPage({ params, searchParams }: Props) {
  const { orgId } = await params;
  const { from }  = await searchParams;

  const profile     = await requireOrgAdminOrSuperuser(orgId);
  const isSuperuser = profile.role === "superuser";

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const [{ data: org }, { data: members }] = await Promise.all([
    serviceClient
      .from("organisations")
      .select("*")
      .eq("id", orgId)
      .maybeSingle(),

    serviceClient
      .from("org_members")
      .select(`
        *,
        profile:profiles!org_members_user_id_fkey (
          id,
          full_name,
          email,
          avatar_url,
          role,
          is_active
        )
      `)
      .eq("org_id", orgId)
      .order("joined_at", { ascending: true }),
  ]);

  if (!org) notFound();

  // Normaliseer: profile kan (afhankelijk van join) soms array zijn
  const normalizedMembers = (members ?? []).map((m: any) => ({
    ...m,
    profile: Array.isArray(m.profile) ? m.profile[0] : m.profile,
  }));

  // org-role voor de current user (als hij member is)
  const myRow = normalizedMembers.find((m: any) => m.user_id === profile.id);
  const currentOrgRole = (myRow?.org_role ?? "member") as any;

  return (
    <div>
      {isSuperuser && from === "admin" && (
        <div className="px-8 pt-6">
          <Link
            href="/admin/organisaties"
            className="inline-flex items-center gap-2 text-sm text-slate-500
                       hover:text-brand-600 font-medium transition-colors"
          >
            <ArrowLeft size={15} />
            Terug naar organisaties
          </Link>
        </div>
      )}

      <OrgSettingsClient
        org={org}
        initialMembers={normalizedMembers}
        currentUserId={profile.id}
        currentOrgRole={currentOrgRole}
        isSuperuser={isSuperuser}
      />
    </div>
  );
}