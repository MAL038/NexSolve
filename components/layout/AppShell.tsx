// components/layout/AppShell.tsx

import Sidebar from "@/components/layout/Sidebar";
import AppShellClient from "@/components/layout/AppShellClient";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabaseServer";
import type { ThemeWithChildren } from "@/types";

const FALLBACK_PRIMARY = "#0A6645";

function clamp(value: number, min = 0, max = 255) {
  return Math.min(max, Math.max(min, value));
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const raw = hex.trim().replace("#", "");
  const normalized = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw;

  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return null;
  }

  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (v: number) => clamp(v).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function darkenHex(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  const factor = 1 - Math.max(0, Math.min(1, amount));
  return rgbToHex(
    Math.round(rgb.r * factor),
    Math.round(rgb.g * factor),
    Math.round(rgb.b * factor)
  );
}

function withAlpha(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return `rgba(10, 102, 69, ${alpha})`;

  const safeAlpha = Math.max(0, Math.min(1, alpha));
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${safeAlpha})`;
}

export default async function AppShell({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const [profile, { data: hierarchy }, { data: isSu }] = await Promise.all([
    getCurrentProfile(),
    supabase
      .from("themes")
      .select(`id, name, slug, position, created_at, processes(id, name, slug, position, theme_id, created_at)`)
      .order("position", { ascending: true })
      .order("position", { ascending: true, foreignTable: "processes" }),
    supabase.rpc("is_superuser"),
  ]);

  let orgPrimaryColor: string | null = null;
  let orgAccentColor: string | null = null;

  if (profile) {
    const currentOrgId = (profile as any)?.current_org_id as string | null;

    if (currentOrgId) {
      const { data: org } = await supabase
        .from("organisations")
        .select("primary_color, accent_color")
        .eq("id", currentOrgId)
        .maybeSingle();

      orgPrimaryColor = (org as any)?.primary_color ?? null;
      orgAccentColor = (org as any)?.accent_color ?? null;
    }
  }

  const resolvedPrimary = hexToRgb(orgPrimaryColor ?? "") ? (orgPrimaryColor as string) : FALLBACK_PRIMARY;

  const themeVars = {
    "--brand-primary": resolvedPrimary,
    "--brand-primary-hover": darkenHex(resolvedPrimary, 0.1),
    "--brand-primary-active": darkenHex(resolvedPrimary, 0.2),
    "--brand-primary-soft": withAlpha(resolvedPrimary, 0.08),
    "--brand-primary-soft-hover": withAlpha(resolvedPrimary, 0.14),
    "--brand-primary-border": withAlpha(resolvedPrimary, 0.24),
    "--brand-primary-ring": withAlpha(resolvedPrimary, 0.35),
    "--brand-primary-text": darkenHex(resolvedPrimary, 0.12),
  } as React.CSSProperties;

  const isSuperuser = isSu === true;

  let orgId: string | null = null;
  let orgName: string | null = null;
  let isOrgAdmin = false;

  if (profile) {
    if (isSuperuser) {
      const { data: ownRow } = await supabase
        .from("org_members")
        .select("org_id, organisations(id, name)")
        .eq("user_id", profile.id)
        .eq("org_role", "admin")
        .maybeSingle();

      if (ownRow?.org_id) {
        orgId = ownRow.org_id;
        orgName = (ownRow.organisations as any)?.name ?? null;
      } else {
        const { data: firstOrg } = await supabase
          .from("organisations")
          .select("id, name")
          .eq("is_active", true)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();

        orgId = firstOrg?.id ?? null;
        orgName = firstOrg?.name ?? null;
      }

      isOrgAdmin = orgId !== null;
    } else {
      const { data: membership } = await supabase
        .from("org_members")
        .select("org_id, org_role, organisations(id, name)")
        .eq("user_id", profile.id)
        .eq("org_role", "admin")
        .maybeSingle();

      if (membership?.org_id) {
        isOrgAdmin = true;
        orgId = membership.org_id;
        orgName = (membership.organisations as any)?.name ?? null;
      }
    }
  }

  return (
    <div style={themeVars}>
      <AppShellClient
        primaryColor={orgPrimaryColor}
        accentColor={orgAccentColor}
        profile={profile}
        sidebar={
          <Sidebar
            profile={profile}
            hierarchy={(hierarchy as ThemeWithChildren[]) ?? []}
            isSuperuser={isSuperuser}
            isOrgAdmin={isOrgAdmin}
            orgId={orgId}
            orgName={orgName}
          />
        }
      >
        {children}
      </AppShellClient>
    </div>
  );
}
