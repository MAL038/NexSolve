// app/(protected)/admin/page.tsx
import { requireSuperuser } from "@/lib/auth";
import { createClient } from "@/lib/supabaseServer";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import Link from "next/link";
import { Users, FolderKanban, Layers, Settings, ArrowRight, ShieldCheck, Building2 } from "lucide-react";

export const metadata = { title: "Beheerpaneel — NEXSOLVE" };

export default async function AdminPage() {
  await requireSuperuser();
  const supabase = await createClient();

  // Service client voor org-count — superuser heeft geen org_members rij
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const [
    { count: userCount },
    { count: projectCount },
    { count: themeCount },
    { count: roleCount },
    { count: orgCount },         // ── WIJZIGING: org-count toegevoegd
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("projects").select("*", { count: "exact", head: true }),
    supabase.from("themes").select("*", { count: "exact", head: true }),
    supabase.from("custom_roles").select("*", { count: "exact", head: true }).eq("is_active", true),
    serviceClient.from("organisations").select("*", { count: "exact", head: true }),
  ]);

  const cards = [
    { label: "Gebruikers",    value: userCount    ?? 0, icon: Users,        href: "/admin/gebruikers",   desc: "Rollen, toegang & accounts",    color: "text-blue-600",   bg: "bg-blue-50",   border: "border-blue-100"   },
    { label: "Projecten",     value: projectCount ?? 0, icon: FolderKanban, href: "/projects",           desc: "Alle projecten overzien",        color: "text-brand-600",  bg: "bg-brand-50",  border: "border-brand-100"  },
    { label: "Organisaties",  value: orgCount     ?? 0, icon: Building2,    href: "/admin/organisaties", desc: "Tenants & org-instellingen",     color: "text-teal-600",   bg: "bg-teal-50",   border: "border-teal-100"   },
    { label: "Themas",        value: themeCount   ?? 0, icon: Layers,       href: "/admin/theemas",      desc: "Structuur & submodules",         color: "text-violet-600", bg: "bg-violet-50", border: "border-violet-100" },
    { label: "Rollen",        value: roleCount    ?? 0, icon: ShieldCheck,  href: "/admin/rollen",       desc: "Aangepaste projectrollen",       color: "text-amber-600",  bg: "bg-amber-50",  border: "border-amber-100"  },
  ];

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">

      <div>
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck size={16} className="text-brand-500" />
          <span className="text-xs font-semibold uppercase tracking-widest text-brand-500">Superuser</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-800">Beheerpaneel</h1>
        <p className="text-sm text-slate-500 mt-1">Beheer het platform, gebruikers, organisaties en instellingen.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {cards.map(c => (
          <Link key={c.label} href={c.href}
            className="card p-5 flex flex-col gap-3 hover:-translate-y-0.5 transition-all duration-150 group">
            <div className={`w-10 h-10 rounded-xl ${c.bg} border ${c.border} flex items-center justify-center`}>
              <c.icon size={18} className={c.color} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{c.value}</p>
              <p className="text-sm font-semibold text-slate-700 mt-0.5">{c.label}</p>
              <p className="text-xs text-slate-400 mt-0.5">{c.desc}</p>
            </div>
            <ArrowRight size={14} className="text-slate-300 group-hover:text-brand-500 transition-colors mt-auto" />
          </Link>
        ))}
      </div>

      {/* Snelle navigatie */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Snelle navigatie</h2>
        <div className="grid gap-2">
          {[
            { href: "/admin/gebruikers",   icon: Users,       label: "Gebruikersbeheer",      sub: "Rollen wijzigen, accounts blokkeren of verwijderen",  color: "text-blue-500",   bg: "bg-blue-50"   },
            { href: "/admin/organisaties", icon: Building2,   label: "Organisatiebeheer",     sub: "Tenants bekijken, instellingen per organisatie",      color: "text-teal-500",   bg: "bg-teal-50"   },
            { href: "/admin/theemas",      icon: Layers,      label: "Themas & submodules",   sub: "Categorieën en subprocessen toevoegen of aanpassen",  color: "text-violet-500", bg: "bg-violet-50" },
            { href: "/admin/rollen",       icon: ShieldCheck, label: "Projectrollen beheren", sub: "Aangepaste rollen voor projectteams",                 color: "text-amber-500",  bg: "bg-amber-50"  },
            { href: "/admin/instellingen", icon: Settings,    label: "Platforminstellingen",  sub: "Bedrijfsnaam, logo en projectstatussen",              color: "text-brand-500",  bg: "bg-brand-50"  },
          ].map(item => (
            <Link key={item.href} href={item.href}
              className="card flex items-center gap-4 px-5 py-4 hover:-translate-y-0.5 transition-all group">
              <div className={`w-9 h-9 rounded-xl ${item.bg} flex items-center justify-center flex-shrink-0`}>
                <item.icon size={16} className={item.color} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-700">{item.label}</p>
                <p className="text-xs text-slate-400 truncate">{item.sub}</p>
              </div>
              <ArrowRight size={14} className="text-slate-300 group-hover:text-brand-500 flex-shrink-0 transition-colors" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
