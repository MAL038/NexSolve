"use client";

import React, { useEffect, useMemo, useState } from "react";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  Settings,
  LogOut,
  Building2,
  ShieldCheck,
  Calendar,
  CalendarDays,
  CalendarRange,
  ChevronDown,
  Clock,
  Landmark,
} from "lucide-react";
import clsx from "clsx";
import Logo from "@/components/ui/Logo";
import Avatar from "@/components/ui/Avatar";
import { ExportModal } from "@/components/ui/ExportModal";
import { createClient } from "@/lib/supabaseClient";
import { GlobalSearch } from "@/components/search/GlobalSearch";
import type { Profile, ThemeWithChildren } from "@/types";

interface SidebarProps {
  profile: Profile | null;
  hierarchy: ThemeWithChildren[];
  isSuperuser?: boolean;
  isOrgAdmin?: boolean;
  orgId?: string | null;
  orgName?: string | null;

  /**
   * Modules die aan/uit staan voor de huidige organisatie.
   * Als dit NIET wordt meegegeven, haalt Sidebar het zelf op via /api/org/[orgId]/modules.
   */
  enabledModules?: Record<string, boolean> | null;

  onNavigate?: () => void;
}

const CALENDAR_ITEMS = [
  { href: "/calendar?scope=mine", scope: "mine", label: "Mijn kalender", icon: Calendar, roles: ["member", "admin", "viewer", "superuser"] },
  { href: "/calendar?scope=team", scope: "team", label: "Kalender team", icon: CalendarDays, roles: ["member", "admin", "viewer", "superuser"] },
  { href: "/calendar?scope=org",  scope: "org",  label: "Kalender organisatie", icon: CalendarRange, roles: ["member", "admin", "viewer", "superuser"] },
];

function isModuleEnabled(enabled: Record<string, boolean> | null | undefined, key: string) {
  // Default: aan (handig voor oudere orgs of als modules nog niet geladen zijn)
  return enabled?.[key] ?? true;
}

export default function Sidebar({
  profile,
  hierarchy,
  isSuperuser,
  isOrgAdmin: isOrgAdminProp,
  orgId,
  orgName,
  enabledModules: enabledModulesProp,
  onNavigate,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const isOrgAdmin = isOrgAdminProp ?? false;

  const isProjectsArea = pathname.startsWith("/projects");
  const isCalendarArea = pathname.startsWith("/calendar");
  const isBeheerArea = orgId ? pathname.startsWith(`/org/${orgId}`) : false;

  const urlScope = searchParams.get("scope") ?? "mine";

  const [calendarExpanded, setCalendarExpanded] = useState(isCalendarArea);

  // ✅ Nieuw: lokale modules-state (fallback als prop niet is meegegeven)
  const [enabledModules, setEnabledModules] = useState<Record<string, boolean> | null>(
    enabledModulesProp ?? null
  );

  // Als parent later wél enabledModules meegeeft: syncen
  useEffect(() => {
    if (enabledModulesProp) setEnabledModules(enabledModulesProp);
  }, [enabledModulesProp]);

  // ✅ Nieuw: als enabledModules niet via props komt, laad via API (organisation_modules)
  useEffect(() => {
    if (!orgId) return;
    if (enabledModulesProp) return; // parent regelt het al
    if (enabledModules) return;     // al geladen

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`/api/org/${orgId}/modules`, { method: "GET" });
        const data = await res.json();
        if (!cancelled) setEnabledModules(data ?? {});
      } catch {
        if (!cancelled) setEnabledModules({});
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [orgId, enabledModulesProp, enabledModules]);

  useEffect(() => {
    if (isCalendarArea) setCalendarExpanded(true);
  }, [isCalendarArea]);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
    onNavigate?.();
  }

  const userRole = profile?.role ?? "member";

  const visibleCalendarItems = useMemo(
    () => CALENDAR_ITEMS.filter((item) => item.roles.includes(userRole)),
    [userRole]
  );

  // ─────────────────────────────────────────────────────────────
  // ✅ Stap 11 (client-side): redirect als module uit staat
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!orgId) return;
    if (!enabledModules) return; // wacht tot modules geladen zijn

    const guards: Array<{ key: string; match: (p: string) => boolean; redirectTo: string }> = [
      { key: "dashboard", match: (p) => p === "/dashboard", redirectTo: "/dashboard" },
      { key: "projects",  match: (p) => p.startsWith("/projects"), redirectTo: "/dashboard" },
      { key: "customers", match: (p) => p.startsWith("/customers"), redirectTo: "/dashboard" },
      { key: "team",      match: (p) => p.startsWith("/team"), redirectTo: "/dashboard" },
      { key: "time",      match: (p) => p.startsWith("/hours"), redirectTo: "/dashboard" },
      { key: "calendar",  match: (p) => p.startsWith("/calendar"), redirectTo: "/dashboard" },
      // Export is modal; geen route guard nodig
    ];

    for (const g of guards) {
      if (g.match(pathname) && !isModuleEnabled(enabledModules, g.key)) {
        router.replace(g.redirectTo);
        break;
      }
    }
  }, [enabledModules, orgId, pathname, router]);

  // ─────────────────────────────────────────────────────────────
  // ✅ Stap 10B: menu-items conditioneel renderen
  // ─────────────────────────────────────────────────────────────
  const showDashboard = isModuleEnabled(enabledModules, "dashboard");
  const showProjects  = isModuleEnabled(enabledModules, "projects");
  const showCustomers = isModuleEnabled(enabledModules, "customers");
  const showTeam      = isModuleEnabled(enabledModules, "team");
  const showHours     = isModuleEnabled(enabledModules, "time");
  const showCalendar  = isModuleEnabled(enabledModules, "calendar");
  const showExport    = isModuleEnabled(enabledModules, "export");

  return (
    <aside className="flex flex-col w-64 min-h-screen bg-white border-r border-slate-100 py-6 px-4 flex-shrink-0">
      <div className="px-2 mb-4">
        <Logo variant="main" />
      </div>

      <div className="mb-4">
        <GlobalSearch />
      </div>

      <nav className="flex-1 flex flex-col gap-0.5 overflow-y-auto">
        {showDashboard && (
          <NavItem
            href="/dashboard"
            icon={LayoutDashboard}
            label="Dashboard"
            active={pathname === "/dashboard"}
            onNavigate={onNavigate}
          />
        )}

        {showProjects && (
          <div className="space-y-0.5">
            <NavItem
              href="/projects"
              icon={FolderKanban}
              label="Projecten"
              active={isProjectsArea}
              onNavigate={onNavigate}
            />
          </div>
        )}

        {showCustomers && (
          <NavItem
            href="/customers"
            icon={Building2}
            label="Klanten"
            active={pathname.startsWith("/customers")}
            onNavigate={onNavigate}
          />
        )}

        {showTeam && (
          <NavItem
            href="/team"
            icon={Users}
            label="Team"
            active={pathname.startsWith("/team")}
            onNavigate={onNavigate}
          />
        )}

        {showHours && (
          <NavItem
            href="/hours"
            icon={Clock}
            label="Urenregistratie"
            active={pathname.startsWith("/hours")}
            onNavigate={onNavigate}
          />
        )}

        {showCalendar && (
          <div className="space-y-0.5">
            <button
              onClick={() => {
                setCalendarExpanded((v: boolean) => !v);
                if (!isCalendarArea) {
                  router.push("/calendar?scope=mine");
                  onNavigate?.();
                }
              }}
              className={clsx(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                isCalendarArea
                  ? "bg-brand-500 text-white shadow-sm shadow-brand-200"
                  : "text-slate-600 hover:bg-slate-50 hover:text-brand-600"
              )}
            >
              <Calendar size={18} />
              <span className="flex-1 text-left">Kalender</span>
              <ChevronDown
                size={14}
                className={clsx("transition-transform duration-200", calendarExpanded && "rotate-180")}
              />
            </button>

            {calendarExpanded && (
              <div className="space-y-0.5 ml-1">
                {visibleCalendarItems.map((item) => {
                  const active = isCalendarArea && urlScope === item.scope;
                  return (
                    <Link
                      key={item.scope}
                      href={item.href}
                      onClick={() => onNavigate?.()}
                      className={clsx(
                        "flex items-center gap-2.5 pl-8 pr-3 py-2 rounded-xl text-xs font-medium transition-all",
                        active
                          ? "bg-brand-50 text-brand-700 font-semibold"
                          : "text-slate-500 hover:bg-slate-50 hover:text-brand-600"
                      )}
                    >
                      <item.icon size={13} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {showExport && <ExportModal variant="sidebar" />}

        {(isOrgAdmin || isSuperuser) && orgId && (
          <NavItem
            href={isSuperuser ? `/org/${orgId}/settings?from=admin` : `/org/${orgId}/settings`}
            icon={Landmark}
            label={orgName ? `Beheer · ${orgName}` : "Beheer"}
            active={isBeheerArea}
            onNavigate={onNavigate}
          />
        )}

        {isSuperuser && !orgId && (
          <NavItem
            href="/admin/organisaties"
            icon={Landmark}
            label="Organisaties"
            active={pathname.startsWith("/admin/organisaties")}
            onNavigate={onNavigate}
          />
        )}

        <NavItem
          href="/settings"
          icon={Settings}
          label="Instellingen"
          active={pathname.startsWith("/settings")}
          onNavigate={onNavigate}
        />

        {isSuperuser && (
          <>
            <div className="my-2 border-t border-slate-100" />
            <NavItem
              href="/admin"
              icon={ShieldCheck}
              label="Beheerpaneel"
              active={pathname.startsWith("/admin")}
              variant="admin"
              onNavigate={onNavigate}
            />
          </>
        )}
      </nav>

      <div className="border-t border-slate-100 pt-4 mt-4 flex-shrink-0">
        <Link
          href="/profile"
          onClick={() => onNavigate?.()}
          className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors group"
        >
          <Avatar name={profile?.full_name} url={profile?.avatar_url} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-800 truncate">
              {profile?.full_name ?? "Gebruiker"}
            </p>
            <p className="text-xs text-slate-400 truncate">{profile?.email ?? ""}</p>
          </div>
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 mt-1 rounded-xl text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all duration-150"
        >
          <LogOut size={16} /> Uitloggen
        </button>
      </div>
    </aside>
  );
}

function NavItem({
  href,
  icon: Icon,
  label,
  active,
  variant,
  onNavigate,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  active: boolean;
  variant?: "admin";
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={() => onNavigate?.()}
      className={clsx(
        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
        variant === "admin"
          ? active
            ? "bg-brand-50 text-brand-700 border border-brand-200"
            : "text-brand-600 hover:bg-brand-50 hover:text-brand-700 border border-transparent"
          : active
          ? "bg-brand-500 text-white shadow-sm shadow-brand-200"
          : "text-slate-600 hover:bg-slate-50 hover:text-brand-600"
      )}
    >
      <Icon size={18} />
      {label}
    </Link>
  );
}