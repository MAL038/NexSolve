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
  accentColor?:  string | null;
}) {
  const [open, setOpen] = useState(false);

  const sidebarNode = useMemo(() => {
    // Sidebar kan een component zijn; geef optioneel een callback mee zodat we de drawer kunnen sluiten na navigatie.
    if (React.isValidElement(sidebar)) {
      return React.cloneElement(sidebar as any, {
        onNavigate: () => setOpen(false),
      });
    }
    return sidebar;
  }, [sidebar]);

  // Voorkom scrollen van de body wanneer de mobiele drawer open staat
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const p = primaryColor ?? "#0A6645";
  const a = accentColor  ?? "#085a3c";

  const brandVars = (primaryColor || accentColor) ? {
    "--brand-primary": p,
    "--brand-accent":  a,
    "--brand-50":  `color-mix(in srgb, ${p}  8%, white)`,
    "--brand-100": `color-mix(in srgb, ${p} 15%, white)`,
    "--brand-200": `color-mix(in srgb, ${p} 30%, white)`,
    "--brand-300": `color-mix(in srgb, ${p} 55%, white)`,
    "--brand-400": `color-mix(in srgb, ${p} 75%, white)`,
    "--brand-500": p,
    "--brand-600": a,
    "--brand-700": `color-mix(in srgb, ${a} 85%, black)`,
    "--brand-800": `color-mix(in srgb, ${a} 65%, black)`,
    "--brand-900": `color-mix(in srgb, ${a} 45%, black)`,
  } as React.CSSProperties : undefined;

  return (
    <div className="flex min-h-dvh bg-slate-50" style={brandVars}>
      {/* Mobile overlay */}
      {open && (
        <button
          aria-label="Sluit menu"
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar: drawer op mobile, vast op lg+ */}
      <div
        className={
          "fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] transform transition-transform duration-200 lg:static lg:z-auto lg:w-64 lg:translate-x-0" +
          (open ? " translate-x-0" : " -translate-x-full lg:translate-x-0")
        }
      >
        {/* We injecteren de sidebar; deze blijft zelf client-side */}
        <div
          // Op lg is dit irrelevant, op mobile willen we een 'sheet' effect
          className="h-full shadow-xl lg:shadow-none"
          onClick={() => {
            // Klikken ín de sidebar moet niet sluiten; links/buttons sluiten we via event bubbling niet.
          }}
        >
          {sidebarNode}
        </div>
      </div>

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-100 bg-white px-4 lg:px-6">
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

        <main className="flex-1 overflow-x-hidden overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
