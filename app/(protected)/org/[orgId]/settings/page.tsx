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
      // Alle kolommen ophalen zodat het Organisation type volledig gevuld is
      .select("*")
      .eq("id", orgId)
      .maybeSingle(),

    serviceClient
      .from("organisation_members")
      .select(`
        user_id,
        role,
        joined_at,
        profile:profiles!organisation_members_user_id_fkey (
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

  return (
    <div>
      {/* Broodkruimel — alleen tonen als superuser via admin panel */}
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
        initialMembers={members ?? []}
        currentProfile={profile}
        isSuperuser={isSuperuser}
      />
    </div>
  );
}
