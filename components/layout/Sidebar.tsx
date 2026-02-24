"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  LayoutDashboard, FolderKanban, Users, Settings,
  LogOut, Building2, ChevronRight, Plus, ShieldCheck,
} from "lucide-react";
import clsx from "clsx";
import { useState, useEffect } from "react";
import Logo from "@/components/ui/Logo";
import Avatar from "@/components/ui/Avatar";
import PdfExportButton from "@/components/ui/PdfExportButton";
import { createClient } from "@/lib/supabaseClient";
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
}

export default function Sidebar({ profile, hierarchy, isSuperuser }: SidebarProps) {
  const pathname     = usePathname();
  const router       = useRouter();
  const searchParams = useSearchParams();
  const isProjectsArea = pathname.startsWith("/projects");

  const urlTheme   = searchParams.get("theme")   ?? "";
  const urlProcess = searchParams.get("process") ?? "";

  // Thema-boom altijd uitklapbaar, niet alleen op /projects
  const [expandedTheme, setExpandedTheme] = useState<string>(urlTheme);

  // Sync expansion wanneer URL verandert (bijv. sidebar-klik elders)
  useEffect(() => { if (urlTheme) setExpandedTheme(urlTheme); }, [urlTheme]);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  }

  // Navigeer naar projecten-filter EN expandeer thema
  function goTheme(id: string) {
    if (expandedTheme === id && urlTheme === id && !urlProcess) {
      // Tweede klik: collapse + wis filter
      setExpandedTheme("");
      router.push("/projects");
    } else {
      setExpandedTheme(id);
      router.push(`/projects?theme=${id}`);
    }
  }

  function goProcess(themeId: string, processId: string) {
    setExpandedTheme(themeId);
    if (urlProcess === processId) {
      router.push(`/projects?theme=${themeId}`);
    } else {
      router.push(`/projects?theme=${themeId}&process=${processId}`);
    }
  }

  // Nieuw project aanmaken met pre-filled thema/process via query params
  function createWithContext(themeId?: string, processId?: string) {
    const params = new URLSearchParams();
    if (themeId)   params.set("theme",   themeId);
    if (processId) params.set("process", processId);
    params.set("new", "1");
    router.push(`/projects?${params.toString()}`);
  }

  const pdfScope = urlProcess ? `process:${urlProcess}` : urlTheme ? `theme:${urlTheme}` : "all";

  return (
    <aside className="flex flex-col w-64 min-h-screen bg-white border-r border-slate-100 py-6 px-4 flex-shrink-0 overflow-y-auto">
      <div className="px-2 mb-8 flex-shrink-0">
        <Logo variant="main" />
      </div>

      <nav className="flex-1 flex flex-col gap-0.5">

        <NavItem href="/dashboard" icon={LayoutDashboard} label="Dashboard" active={pathname === "/dashboard"} />

        {/* ── Projecten + altijd-zichtbare thema-boom ── */}
        <div>
          {/* Hoofd "Projecten" knop — toont alle projecten */}
          <div className="flex items-center gap-1">
            <Link
              href="/projects"
              className={clsx(
                "flex-1 flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                isProjectsArea && !urlTheme
                  ? "bg-brand-500 text-white shadow-sm shadow-brand-200"
                  : isProjectsArea
                  ? "bg-brand-50 text-brand-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-brand-600"
              )}
            >
              <FolderKanban size={18} />
              <span className="flex-1">Projecten</span>
            </Link>
            {/* + knop: nieuw project zonder filter */}
            <button
              onClick={() => createWithContext()}
              title="Nieuw project"
              className="p-2 rounded-xl text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors flex-shrink-0"
            >
              <Plus size={15} />
            </button>
          </div>

          {/* ── Thema-boom: ALTIJD zichtbaar ── */}
          <div className="mt-1 ml-3 border-l-2 border-slate-100 pl-2 pb-1 space-y-0.5">

            {/* "Alle projecten" chip — alleen tonen als we al in /projects zijn */}
            {isProjectsArea && (
              <button
                onClick={() => { setExpandedTheme(""); router.push("/projects"); }}
                className={clsx(
                  "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all text-left",
                  isProjectsArea && !urlTheme
                    ? "bg-slate-800 text-white"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                )}
              >
                <span className="flex-1">Alle projecten</span>
              </button>
            )}

            {hierarchy.map(t => {
              const c          = tc(t.slug);
              const isActive   = urlTheme === t.id;
              const isExpanded = expandedTheme === t.id;
              const hasSubs    = (t.processes?.length ?? 0) > 0;

              return (
                <div key={t.id}>
                  {/* Thema-rij */}
                  <div className="flex items-center gap-1 group/theme">
                    <button
                      onClick={() => goTheme(t.id)}
                      className={clsx(
                        "flex-1 flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all text-left",
                        isActive && !urlProcess
                          ? `${c.activeBg} ${c.active}`
                          : isActive
                          ? `${c.activeBg} ${c.active} opacity-80`
                          : `text-slate-500 ${c.hoverBg} ${c.hoverText}`
                      )}
                    >
                      <span className={clsx("w-2 h-2 rounded-full flex-shrink-0", c.dot)} />
                      <span className="flex-1 truncate">{t.name}</span>
                      {hasSubs && (
                        <ChevronRight
                          size={12}
                          className={clsx(
                            "flex-shrink-0 transition-transform duration-200 opacity-40",
                            isExpanded && "rotate-90"
                          )}
                        />
                      )}
                    </button>

                    {/* + knop naast elk thema */}
                    <button
                      onClick={e => { e.stopPropagation(); createWithContext(t.id); }}
                      title={`Nieuw project in ${t.name}`}
                      className="p-1 rounded-lg text-slate-300 hover:text-brand-500 hover:bg-brand-50 transition-colors opacity-0 group-hover/theme:opacity-100 flex-shrink-0"
                    >
                      <Plus size={11} />
                    </button>
                  </div>

                  {/* Subprocessen — zichtbaar als expanded */}
                  {isExpanded && hasSubs && (
                    <div className="ml-4 mt-0.5 space-y-0.5 border-l border-slate-100 pl-2.5">
                      {t.processes.map(p => {
                        const pa = urlProcess === p.id;
                        return (
                          <div key={p.id} className="flex items-center gap-1 group/proc">
                            <button
                              onClick={() => goProcess(t.id, p.id)}
                              className={clsx(
                                "flex-1 flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs transition-all text-left",
                                pa
                                  ? `${c.activeBg} ${c.active} font-semibold`
                                  : `text-slate-400 ${c.hoverBg} ${c.hoverText} font-medium`
                              )}
                            >
                              <span className={clsx("w-1 h-1 rounded-full flex-shrink-0", pa ? c.dot : "bg-slate-300")} />
                              <span className="truncate">{p.name}</span>
                            </button>

                            {/* + knop naast elk subproces */}
                            <button
                              onClick={e => { e.stopPropagation(); createWithContext(t.id, p.id); }}
                              title={`Nieuw project in ${p.name}`}
                              className="p-1 rounded-lg text-slate-300 hover:text-brand-500 hover:bg-brand-50 transition-colors opacity-0 group-hover/proc:opacity-100 flex-shrink-0"
                            >
                              <Plus size={11} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <NavItem href="/customers" icon={Building2} label="Klanten"     active={pathname.startsWith("/customers")} />
        <NavItem href="/team"      icon={Users}     label="Team"         active={pathname.startsWith("/team")}      />
        <PdfExportButton scope={pdfScope} variant="sidebar" />
        <NavItem href="/settings"  icon={Settings}  label="Instellingen" active={pathname.startsWith("/settings")}  />

        {isSuperuser && (
          <>
            <div className="my-2 border-t border-slate-100" />
            <NavItem href="/admin" icon={ShieldCheck} label="Beheerpaneel" active={pathname.startsWith("/admin")} variant="admin" />
          </>
        )}
      </nav>

      <div className="border-t border-slate-100 pt-4 mt-4 flex-shrink-0">
        <Link href="/profile" className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors group">
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

function NavItem({ href, icon: Icon, label, active, variant }: {
  href: string; icon: React.ElementType; label: string; active: boolean; variant?: "admin";
}) {
  return (
    <Link href={href} className={clsx(
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
