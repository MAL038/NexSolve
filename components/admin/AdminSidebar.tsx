"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ShieldCheck, Users, Layers, Settings, ArrowLeft, LogOut, LayoutDashboard, Activity,
} from "lucide-react";
import clsx from "clsx";
import Logo from "@/components/ui/Logo";
import { createClient } from "@/lib/supabaseClient";

const NAV = [
  { href: "/admin",              icon: LayoutDashboard, label: "Overzicht",           exact: true  },
  { href: "/admin/gebruikers",   icon: Users,           label: "Gebruikers",          exact: false },
  { href: "/admin/theemas",      icon: Layers,          label: "Themas & submodules", exact: false },
  { href: "/admin/rollen",       icon: ShieldCheck,     label: "Projectrollen",       exact: false },
  { href: "/admin/activiteit",   icon: Activity,        label: "Activiteitenlog",     exact: false },
  { href: "/admin/instellingen", icon: Settings,        label: "Instellingen",        exact: false },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router   = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  }

  return (
    <aside className="flex flex-col w-64 min-h-screen bg-white border-r border-slate-100 py-6 px-4 flex-shrink-0">

      <div className="px-2 mb-6">
        <Logo variant="main" />
        <div className="mt-3 flex items-center gap-2 px-3 py-1.5 bg-brand-50 rounded-xl border border-brand-100">
          <ShieldCheck size={13} className="text-brand-500 flex-shrink-0" />
          <span className="text-xs font-semibold text-brand-600 uppercase tracking-wider">Beheerpaneel</span>
        </div>
      </div>

      <nav className="flex-1 flex flex-col gap-0.5">
        {NAV.map(item => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href}
              className={clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                active
                  ? "bg-brand-500 text-white shadow-sm shadow-brand-200"
                  : "text-slate-600 hover:bg-slate-50 hover:text-brand-600"
              )}
            >
              <item.icon size={18} />
              {item.label}
            </Link>
          );
        })}

        <div className="my-3 border-t border-slate-100" />

        <Link href="/dashboard"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-all"
        >
          <ArrowLeft size={16} />
          Terug naar app
        </Link>
      </nav>

      <div className="border-t border-slate-100 pt-4 mt-4">
        <button onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all"
        >
          <LogOut size={16} /> Uitloggen
        </button>
      </div>
    </aside>
  );
}
