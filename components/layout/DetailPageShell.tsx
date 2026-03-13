"use client";

/**
 * DetailPageShell
 * ──────────────────────────────────────────────────────────────────────────
 * Generiek shell-component voor alle detail-pagina's in NexSolve.
 * Gebruikt door: ProjectDetailClient, CustomerDetailClient,
 *               en toekomstige Team member / Subprocess / Dashboard detail.
 *
 * Structuur:
 *   ┌─────────────────────────────────────────────────────────┐
 *   │ [aside: 260px, wit]         │ [main: flex-1, slate-50]  │
 *   │  ┌─ Header blok ──────────┐ │  ┌─ Content header ─────┐ │
 *   │  │  breadcrumb            │ │  │  breadcrumb (mobile) │ │
 *   │  │  titel + badge         │ │  │  titel + badge       │ │
 *   │  │  subtitle              │ │  │  acties              │ │
 *   │  │  [slot: entityMeta]    │ │  └──────────────────────┘ │
 *   │  └────────────────────────┘ │  ┌─ Tab content ────────┐ │
 *   │  ┌─ Tab nav ──────────────┐ │  │  {children}          │ │
 *   │  │  [tabs]                │ │  └──────────────────────┘ │
 *   │  └────────────────────────┘ │                           │
 *   │  ┌─ Footer meta ──────────┐ │                           │
 *   │  │  [slot: sidebarMeta]   │ │                           │
 *   │  └────────────────────────┘ │                           │
 *   └─────────────────────────────────────────────────────────┘
 *
 * Props API:
 *   - breadcrumb       → { label, href }[]  — navigatiepad
 *   - title            → string             — entiteitnaam
 *   - titleBadge       → ReactNode          — StatusBadge of custom pill
 *   - subtitle         → string?            — code, email, of andere meta-regel
 *   - entityMeta       → ReactNode?         — klantblok, progress-bar, etc.
 *   - tabs             → TabDef[]           — tab-definities
 *   - activeTab        → string             — huidige tab id
 *   - onTabChange      → (id) => void
 *   - sidebarMeta      → ReactNode?         — footer-slot in sidebar (owner, datum, etc.)
 *   - headerActions    → ReactNode?         — knoppen rechts in content-header (PDF, archief…)
 *   - editButton       → ReactNode?         — edit-knop in content-header naast titel
 *   - toast            → string | null      — succes-toast tekst
 *   - error            → string | null      — error-banner in content-area
 *   - onErrorDismiss   → () => void?
 *   - children         → ReactNode          — tab-inhoud
 */

import React from "react";
import Link from "next/link";
import { ArrowLeft, AlertCircle, X, CheckCircle2 } from "lucide-react";
import clsx from "clsx";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface TabDef<T extends string = string> {
  id:      T;
  label:   string;
  icon:    React.ElementType;
  /** Optioneel badge-getal of tekst rechts in de tab (bijv. "3/7" voor taken) */
  badge?:  string | number | null;
}

export interface DetailPageShellProps<T extends string = string> {
  // Navigatie
  breadcrumb:     BreadcrumbItem[];

  // Header
  title:          string;
  titleBadge?:    React.ReactNode;
  subtitle?:      string | null;
  /** Slot onder de title in de sidebar — klantblok, progressbar, etc. */
  entityMeta?:    React.ReactNode;

  // Tabs
  tabs:           TabDef<T>[];
  activeTab:      T;
  onTabChange:    (tab: T) => void;

  // Sidebar footer
  sidebarMeta?:   React.ReactNode;

  // Content header — acties rechts bovenaan de content-area
  headerActions?: React.ReactNode;
  /** Kleine edit-knop naast de titel in de content-header */
  editButton?:    React.ReactNode;

  // Feedback
  toast?:         string | null;
  toastVariant?:  "success" | "error";
  error?:         string | null;
  onErrorDismiss?: () => void;

  // Tab-inhoud
  children:       React.ReactNode;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DetailPageShell<T extends string = string>({
  breadcrumb,
  title,
  titleBadge,
  subtitle,
  entityMeta,
  tabs,
  activeTab,
  onTabChange,
  sidebarMeta,
  headerActions,
  editButton,
  toast,
  toastVariant = "success",
  error,
  onErrorDismiss,
  children,
}: DetailPageShellProps<T>) {
  // Laatste breadcrumb-item is de huidige pagina — geen link
  const parentCrumbs = breadcrumb.slice(0, -1);
  const backCrumb    = parentCrumbs[parentCrumbs.length - 1];

  return (
    // Neutraliseert de main padding van AppShell → edge-to-edge layout
    <div className="-mx-4 sm:-mx-6 -my-4 sm:-my-6 flex min-h-[calc(100dvh-56px)]">

      {/* ── Toast ──────────────────────────────────────────────────────────── */}
      {toast && (
        <div
          className={clsx(
            "fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl",
            "border text-sm font-medium shadow-lg animate-in slide-in-from-top-2 duration-200",
            toastVariant === "error"
              ? "bg-red-50 border-red-200 text-red-700"
              : "bg-white border-[var(--brand-primary-border)] text-[var(--brand-primary-text)]",
          )}
        >
          {toastVariant === "error"
            ? <X size={14} className="flex-shrink-0" />
            : <span className="w-2 h-2 rounded-full bg-[var(--brand-primary)] flex-shrink-0" />
          }
          {toast}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SIDEBAR — desktop only (hidden op mobile)
      ══════════════════════════════════════════════════════════════════════ */}
      <aside className="hidden lg:flex flex-col w-[260px] flex-shrink-0 border-r border-slate-200 bg-white">

        {/* ── Header blok ──────────────────────────────────────────────────── */}
        <div className="px-5 pt-5 pb-4 border-b border-slate-200">

          {/* Breadcrumb terug-link */}
          {backCrumb && (
            <Link
              href={backCrumb.href ?? "#"}
              className="inline-flex items-center gap-1.5 text-xs text-slate-500
                         hover:text-[var(--brand-primary)] font-semibold transition-colors mb-3"
            >
              <ArrowLeft size={13} />
              {backCrumb.label}
            </Link>
          )}

          {/* Titel + badge */}
          <div className="flex items-start gap-2 min-w-0">
            <h1 className="font-bold text-slate-800 text-base leading-snug flex-1 min-w-0 break-words">
              {title}
            </h1>
            {titleBadge && (
              <div className="flex-shrink-0 mt-0.5">{titleBadge}</div>
            )}
          </div>

          {/* Subtitle — code, email, of korte meta */}
          {subtitle && (
            <p className="text-xs text-slate-400 mt-1 truncate">{subtitle}</p>
          )}

          {/* Entity-specifieke meta (klantblok, progress, etc.) */}
          {entityMeta && (
            <div className="mt-3">{entityMeta}</div>
          )}
        </div>

        {/* ── Tab navigatie ─────────────────────────────────────────────────── */}
        <nav className="flex flex-col gap-0.5 px-2 py-3 flex-1 overflow-y-auto">
          {tabs.map(tab => {
            const Icon   = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={clsx(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl",
                  "text-sm font-medium transition-all text-left",
                  active
                    ? "bg-[var(--brand-primary)] text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-800",
                )}
              >
                <Icon size={15} className={active ? "opacity-75" : "text-slate-400"} />
                <span className="flex-1 truncate">{tab.label}</span>
                {tab.badge != null && (
                  <span
                    className={clsx(
                      "text-[11px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0",
                      active
                        ? "bg-white/25 text-white"
                        : "bg-slate-100 text-slate-500",
                    )}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* ── Sidebar footer meta ───────────────────────────────────────────── */}
        {sidebarMeta && (
          <div className="px-5 py-4 border-t border-slate-200 space-y-2 text-xs text-slate-500">
            {sidebarMeta}
          </div>
        )}
      </aside>

      {/* ══════════════════════════════════════════════════════════════════════
          CONTENT AREA — scrollt zelf
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 min-w-0 flex flex-col overflow-y-auto bg-slate-50">

        {/* ── Vaste content-header (wit, sticky) ───────────────────────────── */}
        <div className="sticky top-0 z-20 bg-white border-b border-slate-200 flex-shrink-0">

          {/* Breadcrumb balk — altijd zichtbaar, ook desktop */}
          <div className="flex items-center gap-1.5 px-6 pt-4 pb-0 text-xs text-slate-400 font-medium">
            {breadcrumb.map((crumb, i) => {
              const isLast = i === breadcrumb.length - 1;
              return (
                <React.Fragment key={i}>
                  {i > 0 && <span className="text-slate-300">›</span>}
                  {isLast || !crumb.href ? (
                    <span className={isLast ? "text-slate-700 font-semibold truncate max-w-[200px]" : ""}>
                      {crumb.label}
                    </span>
                  ) : (
                    <Link
                      href={crumb.href}
                      className="hover:text-[var(--brand-primary)] transition-colors"
                    >
                      {crumb.label}
                    </Link>
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Titel-rij: naam, badge, edit-knop, acties */}
          <div className="flex items-center gap-3 px-6 py-3">
            {/* Mobile terug-knop */}
            {backCrumb?.href && (
              <Link
                href={backCrumb.href}
                className="lg:hidden text-slate-400 hover:text-[var(--brand-primary)] transition-colors flex-shrink-0"
              >
                <ArrowLeft size={16} />
              </Link>
            )}

            {/* Titel */}
            <h1 className="font-bold text-slate-800 text-lg leading-tight flex-1 min-w-0 truncate">
              {title}
            </h1>

            {/* Status badge */}
            {titleBadge && (
              <div className="flex-shrink-0">{titleBadge}</div>
            )}

            {/* Edit-knop */}
            {editButton && (
              <div className="flex-shrink-0">{editButton}</div>
            )}

            {/* Primaire acties rechts */}
            {headerActions && (
              <div className="flex items-center gap-2 flex-shrink-0">
                {headerActions}
              </div>
            )}
          </div>

          {/* Mobiele horizontale tabs */}
          <div className="lg:hidden flex gap-1 px-4 pb-2 overflow-x-auto">
            {tabs.map(tab => {
              const Icon   = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={clsx(
                    "flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg",
                    "text-xs font-medium transition-all whitespace-nowrap",
                    active
                      ? "bg-[var(--brand-primary)] text-white"
                      : "text-slate-500 hover:bg-slate-100 hover:text-slate-700",
                  )}
                >
                  <Icon size={12} />
                  {tab.label}
                  {tab.badge != null && (
                    <span
                      className={clsx(
                        "text-[10px] font-bold px-1 py-0.5 rounded-full",
                        active ? "bg-white/25 text-white" : "bg-slate-200 text-slate-600",
                      )}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Error banner ─────────────────────────────────────────────────── */}
        {error && (
          <div className="mx-6 mt-4 flex items-center gap-2 px-4 py-3
                          bg-red-50 border border-red-200 rounded-xl
                          text-sm text-red-700 font-medium flex-shrink-0">
            <AlertCircle size={14} className="flex-shrink-0" />
            <span className="flex-1">{error}</span>
            {onErrorDismiss && (
              <button
                onClick={onErrorDismiss}
                className="text-red-400 hover:text-red-600 transition-colors ml-auto"
              >
                <X size={14} />
              </button>
            )}
          </div>
        )}

        {/* ── Tab content ──────────────────────────────────────────────────── */}
        <div className="flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}

// ─── Helper sub-components ────────────────────────────────────────────────────

/**
 * SidebarMetaRow — consistente rij in de sidebar footer
 * Gebruik: <SidebarMetaRow icon={Calendar} label="31 dec 2025" variant="warning" />
 */
export function SidebarMetaRow({
  icon: Icon,
  label,
  href,
  variant = "default",
  children,
}: {
  icon:      React.ElementType;
  label?:    string;
  href?:     string;
  variant?:  "default" | "warning" | "muted";
  children?: React.ReactNode;
}) {
  const colorClass =
    variant === "warning" ? "text-red-500" :
    variant === "muted"   ? "text-slate-300" :
    "text-slate-500";

  const content = (
    <span className={clsx("flex items-center gap-2 min-w-0", colorClass)}>
      <Icon size={11} className="flex-shrink-0" />
      {label && <span className="truncate">{label}</span>}
      {children}
    </span>
  );

  if (href) {
    return (
      <a href={href} className={clsx(colorClass, "hover:text-[var(--brand-primary)] transition-colors block")}>
        {content}
      </a>
    );
  }
  return <div>{content}</div>;
}

/**
 * TabContent — wrapper voor tab-inhoud met consistente padding
 * maxWidth: "sm" | "md" | "lg" | "full"
 */
export function TabContent({
  children,
  maxWidth = "lg",
  className,
}: {
  children:   React.ReactNode;
  maxWidth?:  "sm" | "md" | "lg" | "full";
  className?: string;
}) {
  const widthClass = {
    sm:   "max-w-sm",
    md:   "max-w-2xl",
    lg:   "max-w-4xl",
    full: "w-full",
  }[maxWidth];

  return (
    <div className={clsx("p-6", widthClass, className)}>
      {children}
    </div>
  );
}
