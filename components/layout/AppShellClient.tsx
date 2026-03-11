"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Menu, X } from "lucide-react";

export default function AppShellClient({
  sidebar,
  children,
  primaryColor,
  accentColor,
}: {
  sidebar: React.ReactNode;
  children: React.ReactNode;
  primaryColor?: string | null;
  accentColor?: string | null;
}) {
  const [open, setOpen] = useState(false);

  const sidebarNode = useMemo(() => {
    if (React.isValidElement(sidebar)) {
      return React.cloneElement(sidebar as any, {
        onNavigate: () => setOpen(false),
      });
    }
    return sidebar;
  }, [sidebar]);

  // Voorkom body-scroll als mobiele drawer open staat
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  return (
    // ── FIX: h-dvh + overflow-hidden i.p.v. min-h-dvh ──────────
    // De shell is exact het viewport. Scrollen gebeurt BINNEN de
    // main of binnen de DetailPageShell — nooit op de body zelf.
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

      {/* Sidebar — drawer op mobile, statisch op lg+ */}
      <div
        className={
          "fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] transform transition-transform duration-200" +
          " lg:static lg:z-auto lg:w-64 lg:translate-x-0 lg:flex-shrink-0" +
          (open ? " translate-x-0" : " -translate-x-full lg:translate-x-0")
        }
      >
        <div className="h-full shadow-xl lg:shadow-none">
          {sidebarNode}
        </div>
      </div>

      {/* Content kolom — vult de rest, scrollt zelf */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">

        {/* Topbar — sticky bovenaan de content-kolom */}
        <header className="flex-shrink-0 sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-100 bg-white px-4 lg:px-6">
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-50 lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>

          <div className="min-w-0 flex-1" />

          {open && (
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-50 lg:hidden"
              onClick={() => setOpen(false)}
              aria-label="Sluit menu"
            >
              <X size={20} />
            </button>
          )}
        </header>

        {/* ── FIX: flex-1 + overflow-y-auto ───────────────────────
            Hierdoor heeft main een vaste hoogte (resterende viewport)
            en kan hij zelf scrollen. Detailpagina's overschrijven
            dit via -mx / -my negative margin + eigen scroll-lagen. */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
