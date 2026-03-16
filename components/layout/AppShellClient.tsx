"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X, ChevronRight, User, Settings, LogOut } from "lucide-react";
import clsx from "clsx";
import { createClient } from "@/lib/supabaseClient";
import Avatar from "@/components/ui/Avatar";
import { GlobalSearch } from "@/components/search/GlobalSearch";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import type { Profile } from "@/types";

// ─── Breadcrumb route map ──────────────────────────────────────
const ROUTE_LABELS: Record<string, string> = {
  dashboard:    "Dashboard",
  projects:     "Projecten",
  customers:    "Klanten",
  team:         "Team",
  hours:        "Urenregistratie",
  calendar:     "Kalender",
  processen:    "Processen",
  settings:     "Instellingen",
  profile:      "Profiel",
  beheer:       "Beheer",
  org:          "Organisatie",
  admin:        "Beheerpaneel",
  gebruikers:   "Gebruikers",
  organisaties: "Organisaties",
  themas:       "Thema's",
  rollen:       "Rollen",
  instellingen: "Instellingen",
  activiteit:   "Activiteit",
  projecten:    "Projecten",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function buildBreadcrumbs(pathname: string): { label: string; href: string }[] {
  const segments = pathname.split("/").filter(Boolean);
  const crumbs: { label: string; href: string }[] = [];
  let href = "";
  for (const seg of segments) {
    href += `/${seg}`;
    if (UUID_RE.test(seg) || (seg.length > 24 && !ROUTE_LABELS[seg])) continue; // skip IDs
    const label = ROUTE_LABELS[seg];
    if (label) crumbs.push({ label, href });
  }
  return crumbs;
}

// ─── Shortcut type ────────────────────────────────────────────
interface Shortcut {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  action: () => void;
  description: string;
}

// ─── Component ────────────────────────────────────────────────
export default function AppShellClient({
  sidebar,
  children,
  primaryColor,
  accentColor,
  profile,
}: {
  sidebar: React.ReactNode;
  children: React.ReactNode;
  primaryColor?: string | null;
  accentColor?: string | null;
  profile?: Profile | null;
}) {
  const [open,         setOpen]         = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const pathname  = usePathname();
  const router    = useRouter();
  const menuRef   = useRef<HTMLDivElement>(null);

  // Keyboard shortcuts
  const shortcuts = useMemo<Shortcut[]>(() => [
    // Navigation shortcuts
    { key: "1", ctrl: true, action: () => router.push("/dashboard"), description: "Ga naar Dashboard" },
    { key: "2", ctrl: true, action: () => router.push("/projects"), description: "Ga naar Projecten" },
    { key: "3", ctrl: true, action: () => router.push("/customers"), description: "Ga naar Klanten" },
    { key: "4", ctrl: true, action: () => router.push("/team"), description: "Ga naar Team" },
    { key: "5", ctrl: true, action: () => router.push("/calendar"), description: "Ga naar Kalender" },
    { key: "6", ctrl: true, action: () => router.push("/processen"), description: "Ga naar Processen" },

    // Action shortcuts
    { key: "k", ctrl: true, action: () => {
      // GlobalSearch opent zichzelf via Ctrl+K intern
    }, description: "Open globale zoekbalk" },
    { key: "n", ctrl: true, action: () => {
      if (pathname.startsWith("/projects")) router.push("/projects?new=1");
      // Add more context-aware actions as needed
    }, description: "Nieuw item aanmaken" },
    { key: "Escape", action: () => {
      setOpen(false);
      setUserMenuOpen(false);
    }, description: "Sluit menu's en modals" },
  ], [router, pathname]);

  useKeyboardShortcuts(shortcuts);

  const sidebarNode = useMemo(() => {
    if (React.isValidElement(sidebar)) {
      return React.cloneElement(sidebar as React.ReactElement<{ onNavigate?: () => void }>, {
        onNavigate: () => setOpen(false),
      });
    }
    return sidebar;
  }, [sidebar]);

  // Lock body scroll when mobile drawer open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Close user menu on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    if (userMenuOpen) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [userMenuOpen]);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  }

  const breadcrumbs = useMemo(() => buildBreadcrumbs(pathname), [pathname]);

  // Org-branding: convert hex to --brand-N-rgb variables so Tailwind brand-* classes pick it up
  useEffect(() => {
    if (!primaryColor) return;
    const raw = primaryColor.trim();
    const hex = raw.startsWith("#") ? raw.slice(1) : raw;

    // Support #RGB en #RRGGBB
    const normalized = hex.length === 3
      ? hex.split("").map((c) => c + c).join("")
      : hex;

    if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return;
    const r = parseInt(normalized.slice(0, 2), 16);
    const g = parseInt(normalized.slice(2, 4), 16);
    const b = parseInt(normalized.slice(4, 6), 16);

    function mix(ratio: number, dark = false): string {
      const factor = dark ? (1 - ratio) : ratio;
      const bg     = dark ? 0 : 255;
      const nr = Math.round(r * factor + bg * (1 - factor));
      const ng = Math.round(g * factor + bg * (1 - factor));
      const nb = Math.round(b * factor + bg * (1 - factor));
      return `${nr} ${ng} ${nb}`;
    }

    const root = document.documentElement;
    root.style.setProperty("--brand-50-rgb",  mix(0.08));
    root.style.setProperty("--brand-100-rgb", mix(0.15));
    root.style.setProperty("--brand-200-rgb", mix(0.30));
    root.style.setProperty("--brand-300-rgb", mix(0.55));
    root.style.setProperty("--brand-400-rgb", mix(0.75));
    root.style.setProperty("--brand-500-rgb", `${r} ${g} ${b}`);
    root.style.setProperty("--brand-600-rgb", mix(0.92, true));
    root.style.setProperty("--brand-700-rgb", mix(0.85, true));
    root.style.setProperty("--brand-800-rgb", mix(0.65, true));
    root.style.setProperty("--brand-900-rgb", mix(0.45, true));
  }, [primaryColor]);

  return (
    <div
      className="flex h-dvh overflow-hidden bg-slate-50"
      style={{
        ...(primaryColor ? { "--color-brand": primaryColor } as React.CSSProperties : {}),
        ...(accentColor  ? { "--color-accent": accentColor  } as React.CSSProperties : {}),
      }}
    >
      {/* Mobile overlay */}
      {open && (
        <button
          aria-label="Sluit menu"
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────── */}
      <div
        className={clsx(
          "fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] transform transition-transform duration-200",
          "lg:static lg:z-auto lg:w-64 lg:translate-x-0 lg:flex-shrink-0",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="h-full shadow-xl lg:shadow-none">
          {sidebarNode}
        </div>
      </div>

      {/* ── Content kolom ───────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">

        {/* ── Topbar ──────────────────────────────────────────
            h-14 — sticky boven de main-content.
            Links: hamburger (mobile) + breadcrumbs (desktop)
            Rechts: GlobalSearch (compact) + user dropdown       */}
        <header className="flex-shrink-0 sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-100 bg-white px-4 lg:px-6">

          {/* Mobile: hamburger */}
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setOpen(true)}
            className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-50 transition-colors lg:hidden"
          >
            <Menu size={18} />
          </button>

          {/* Desktop breadcrumbs */}
          <nav className="hidden lg:flex flex-1 min-w-0 items-center gap-1.5 text-sm" aria-label="Navigatie">
            {breadcrumbs.length === 0 ? (
              <span className="text-sm font-semibold text-slate-700">NexSolve</span>
            ) : breadcrumbs.map((crumb, i) => (
              <React.Fragment key={crumb.href}>
                {i > 0 && <ChevronRight size={13} className="text-slate-300 flex-shrink-0" />}
                {i === breadcrumbs.length - 1 ? (
                  <span className="font-semibold text-slate-700 truncate">{crumb.label}</span>
                ) : (
                  <Link
                    href={crumb.href}
                    className="text-slate-400 hover:text-brand-600 transition-colors truncate"
                  >
                    {crumb.label}
                  </Link>
                )}
              </React.Fragment>
            ))}
          </nav>

          {/* Mobile: current page title */}
          <div className="flex-1 min-w-0 lg:hidden">
            <span className="text-sm font-semibold text-slate-700 truncate">
              {breadcrumbs[breadcrumbs.length - 1]?.label ?? "NexSolve"}
            </span>
          </div>

          {/* Right section */}
          <div className="flex flex-shrink-0 items-center gap-2">

            {/* Search (compact) */}
            <GlobalSearch compact />

            {/* Help button */}
            <button
              onClick={() => alert(`Keyboard Shortcuts:\n${shortcuts.map(s => `${s.ctrl ? 'Ctrl+' : ''}${s.alt ? 'Alt+' : ''}${s.shift ? 'Shift+' : ''}${s.key}: ${s.description}`).join('\n')}`)}
              className="hidden md:flex items-center justify-center w-8 h-8 rounded-xl text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
              title="Toetsenbord sneltoetsen"
            >
              ?
            </button>

            {/* User menu */}
            {profile && (
              <div ref={menuRef} className="relative">
                <button
                  onClick={() => setUserMenuOpen(v => !v)}
                  className="flex items-center gap-2 rounded-xl px-1.5 py-1 hover:bg-slate-50 transition-colors"
                  aria-label="Gebruikersmenu"
                >
                  <Avatar name={profile.full_name} url={profile.avatar_url} size="sm" />
                  <span className="hidden md:block text-sm font-medium text-slate-700 max-w-[120px] truncate">
                    {profile.full_name?.split(" ")[0]}
                  </span>
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-slate-200 bg-white py-1.5 shadow-xl z-50 overflow-hidden">
                    {/* Profile header */}
                    <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
                      <Avatar name={profile.full_name} url={profile.avatar_url} size="sm" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{profile.full_name}</p>
                        <p className="text-xs text-slate-400 truncate">{profile.email}</p>
                      </div>
                    </div>
                    {/* Links */}
                    <Link
                      href="/profile"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      <User size={14} /> Mijn profiel
                    </Link>
                    <Link
                      href="/settings"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      <Settings size={14} /> Instellingen
                    </Link>
                    <div className="border-t border-slate-100 mt-1 pt-1">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut size={14} /> Uitloggen
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Mobile: close button (when drawer open) */}
            {open && (
              <button
                type="button"
                aria-label="Sluit menu"
                onClick={() => setOpen(false)}
                className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-50 transition-colors lg:hidden"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </header>

        {/* ── Main content ─────────────────────────────────────
            flex-1 + overflow-y-auto: eigen scrolllaag.
            Detailpagina's gebruiken -mx/-my negative margins
            om de shell te overriden met hun eigen layout.     */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
