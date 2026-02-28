"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  LayoutDashboard, FolderKanban, Users, Settings,
  LogOut, Building2, ChevronRight, Plus, ShieldCheck,
  Calendar, CalendarDays, CalendarRange, ChevronDown, Clock,
} from "lucide-react";
import clsx from "clsx";
import { useState, useEffect } from "react";
import Logo from "@/components/ui/Logo";
import Avatar from "@/components/ui/Avatar";
import { ExportModal } from "@/components/ui/ExportModal";
import { createClient } from "@/lib/supabaseClient";
import { GlobalSearch } from "@/components/search/GlobalSearch";
import type { Profile, ThemeWithChildren } from "@/types";

const THEME_COLORS: Record<string, {
  dot: string; active: string; activeBg: string; hoverBg: string; hoverText: string;
}> = {
  "algemeen":        { dot: "bg-slate-400",  active: "text-slate-700",  activeBg: "bg-slate-100",  hoverBg: "hover:bg-slate-50",  hoverText: "hover:text-slate-700"  },
  "crm":             { dot: "bg-blue-400",   active: "text-blue-700",   activeBg: "bg-blue-50",    hoverBg: "hover:bg-blue-50",   hoverText: "hover:text-blue-700"   },
  "hrm":             { dot: "bg-brand-500",  active: "text-brand-700",  activeBg: "bg-brand-50",   hoverBg: "hover:bg-brand-50",  hoverText: "hover:text-brand-700"  },
  "ordermanagement": { dot: "bg-amber-400",  active: "text-amber-700",  activeBg: "bg-amber-50",   hoverBg: "hover:bg-amber-50",  hoverText: "hover:text-amber-700"  },
  "payroll":         { dot: "bg-violet-400", active: "text-violet-700", activeBg: "bg-violet-50",  hoverBg: "hover:bg-violet-50", hoverText: "hover:text-violet-700" },
  "erp":             { dot: "bg-rose-400",   active: "text-rose-700",   activeBg: "bg-rose-50",    hoverBg: "hover:bg-rose-50",   hoverText: "hover:text-rose-700"   },
};
function tc(slug: string) { return THEME_COLORS[slug] ?? THEME_COLORS["algemeen"]; }

interface SidebarProps {
  profile:      Profile | null;
  hierarchy:    ThemeWithChildren[];
  isSuperuser?: boolean;
  onNavigate?:  () => void;
}

// ─── Kalender submenu items ───────────────────────────────────

const CALENDAR_ITEMS = [
  { href: "/calendar?scope=mine", scope: "mine", label: "Mijn kalender",      icon: Calendar,      roles: ["member","admin","viewer","superuser"] },
  { href: "/calendar?scope=team", scope: "team", label: "Kalender team",       icon: CalendarDays,  roles: ["member","admin","viewer","superuser"] },
  { href: "/calendar?scope=org",  scope: "org",  label: "Kalender organisatie",icon: CalendarRange, roles: ["admin","superuser"] },
];

export default function Sidebar({ profile, hierarchy, isSuperuser, onNavigate }: SidebarProps) {
  const pathname     = usePathname();
  const router       = useRouter();
  const searchParams = useSearchParams();
  const isProjectsArea  = pathname.startsWith("/projects");
  const isCalendarArea  = pathname.startsWith("/calendar");

  const urlTheme   = searchParams.get("theme")   ?? "";
  const urlProcess = searchParams.get("process") ?? "";
  const urlScope   = searchParams.get("scope")   ?? "mine";

  const [expandedTheme,    setExpandedTheme]    = useState<string>(urlTheme);
  const [calendarExpanded, setCalendarExpanded] = useState(isCalendarArea);

  useEffect(() => { if (urlTheme) setExpandedTheme(urlTheme); }, [urlTheme]);
  useEffect(() => { if (isCalendarArea) setCalendarExpanded(true); }, [isCalendarArea]);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
    onNavigate?.();
  }

  const userRole = profile?.role ?? "member";

  // Welke kalender-items mag deze user zien?
  const visibleCalendarItems = CALENDAR_ITEMS.filter(item =>
    item.roles.includes(userRole)
  );

  // PDF export scope
  const pdfScope = isProjectsArea
    ? (urlTheme ? (urlProcess ? "subprocess" : "theme") : "all")
    : "all";

  return (
    <aside className="flex flex-col w-64 min-h-screen bg-white border-r border-slate-100 py-6 px-4 flex-shrink-0">

      <div className="px-2 mb-4">
        <Logo variant="main" />
      </div>

      <div className="mb-4">
        <GlobalSearch />
      </div>

      <nav className="flex-1 flex flex-col gap-0.5 overflow-y-auto">

        {/* Dashboard */}
        <NavItem href="/dashboard" icon={LayoutDashboard} label="Dashboard"
          active={pathname === "/dashboard"} onNavigate={onNavigate} />

        {/* Projecten (met thema-boom) */}
        <div className="space-y-0.5">
          <NavItem href="/projects" icon={FolderKanban} label="Projecten"
            active={isProjectsArea && !urlTheme} onNavigate={onNavigate} />

          {/* Thema-submenu */}
          {hierarchy.map(t => {
            const c   = tc(t.slug ?? "algemeen");
            const ta  = urlTheme === t.slug;
            const exp = expandedTheme === t.slug;
            return (
              <div key={t.id}>
                <div className="flex items-center group/theme">
                  <button
                    onClick={() => {
                      router.push(`/projects?theme=${t.slug}`);
                      setExpandedTheme(exp ? "" : t.slug ?? "");
                      onNavigate?.();
                    }}
                    className={clsx(
                      "flex-1 flex items-center gap-2.5 pl-6 pr-2 py-2 rounded-xl text-xs font-medium transition-all",
                      ta ? `${c.activeBg} ${c.active} font-semibold` : `text-slate-400 ${c.hoverBg} ${c.hoverText}`
                    )}
                  >
                    <span className={clsx("w-2 h-2 rounded-full flex-shrink-0", ta ? c.dot : "bg-slate-200")} />
                    <span className="flex-1 truncate">{t.name}</span>
                  </button>

                  <div className="flex items-center gap-0.5 opacity-0 group-hover/theme:opacity-100 transition-opacity">
                    <button
                      onClick={() => setExpandedTheme(exp ? "" : t.slug ?? "")}
                      className="p-1 rounded text-slate-300 hover:text-slate-500"
                    >
                      <ChevronRight size={12} className={clsx("transition-transform", exp && "rotate-90")} />
                    </button>
                  </div>
                </div>

                {exp && t.processes?.map(p => {
                  const pa = urlProcess === p.slug;
                  return (
                    <div key={p.id} className="flex items-center group/proc">
                      <button
                        onClick={() => { router.push(`/projects?theme=${t.slug}&process=${p.slug}`); onNavigate?.(); }}
                        className={clsx(
                          "flex-1 flex items-center gap-2 pl-10 pr-2 py-1.5 rounded-xl text-xs transition-all",
                          pa ? `${c.activeBg} ${c.active} font-semibold` : `text-slate-400 ${c.hoverBg} ${c.hoverText} font-medium`
                        )}
                      >
                        <span className={clsx("w-1 h-1 rounded-full flex-shrink-0", pa ? c.dot : "bg-slate-300")} />
                        <span className="truncate">{p.name}</span>
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); router.push(`/projects/new?theme=${t.id}&process=${p.id}`); }}
                        title={`Nieuw project in ${p.name}`}
                        className="p-1 rounded-lg text-slate-300 hover:text-brand-500 hover:bg-brand-50 transition-colors opacity-0 group-hover/proc:opacity-100 flex-shrink-0"
                      >
                        <Plus size={11} />
                      </button>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Klanten */}
        <NavItem href="/customers" icon={Building2} label="Klanten"
          active={pathname.startsWith("/customers")} onNavigate={onNavigate} />

        {/* Team */}
        <NavItem href="/team" icon={Users} label="Team"
          active={pathname.startsWith("/team")} onNavigate={onNavigate} />

        {/* Urenregistratie */}
        <NavItem href="/hours" icon={Clock} label="Urenregistratie"
          active={pathname.startsWith("/hours")} onNavigate={onNavigate} />

        {/* ─── Kalender (met submenu) ─────────────────────── */}
        <div className="space-y-0.5">
          {/* Hoofd kalender-knop — toggle submenu */}
          <button
            onClick={() => {
              setCalendarExpanded(v => !v);
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

          {/* Submenu */}
          {calendarExpanded && (
            <div className="space-y-0.5 ml-1">
              {visibleCalendarItems.map(item => {
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

        <ExportModal variant="sidebar" />

        <NavItem href="/settings" icon={Settings} label="Instellingen"
          active={pathname.startsWith("/settings")} onNavigate={onNavigate} />

        {isSuperuser && (
          <>
            <div className="my-2 border-t border-slate-100" />
            <NavItem href="/admin" icon={ShieldCheck} label="Beheerpaneel"
              active={pathname.startsWith("/admin")} variant="admin" onNavigate={onNavigate} />
          </>
        )}
      </nav>

      {/* Profiel + uitloggen */}
      <div className="border-t border-slate-100 pt-4 mt-4 flex-shrink-0">
        <Link href="/profile" onClick={() => onNavigate?.()} className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors group">
          <Avatar name={profile?.full_name} url={profile?.avatar_url} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-800 truncate">{profile?.full_name ?? "Gebruiker"}</p>
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

function NavItem({ href, icon: Icon, label, active, variant, onNavigate }: {
  href: string;
  icon: React.ElementType;
  label: string;
  active: boolean;
  variant?: "admin";
  onNavigate?: () => void;
}) {
  return (
    <Link href={href} onClick={() => onNavigate?.()} className={clsx(
      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
      variant === "admin"
        ? active
          ? "bg-brand-50 text-brand-700 border border-brand-200"
          : "text-brand-600 hover:bg-brand-50 hover:text-brand-700 border border-transparent"
        : active
          ? "bg-brand-500 text-white shadow-sm shadow-brand-200"
          : "text-slate-600 hover:bg-slate-50 hover:text-brand-600"
    )}>
      <Icon size={18} />
      {label}
    </Link>
  );
}
