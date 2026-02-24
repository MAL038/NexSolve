import { createClient } from "@/lib/supabaseServer";
import { getCurrentProfile } from "@/lib/auth";
import { relativeTime, formatDate } from "@/lib/time";
import { FolderKanban, Users, CheckCircle, Building2 } from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import Link from "next/link";
import type { Customer, Project } from "@/types";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const supabase  = await createClient();
  const profile   = await getCurrentProfile();

  const [{ data: projects }, { data: customers }, { data: team }] = await Promise.all([
    supabase.from("projects").select("*, customer:customers(id, name)").order("created_at", { ascending: false }),
    supabase.from("customers").select("*").order("name"),
    supabase.from("profiles").select("id"),
  ]);

  const ps = (projects as Project[]) ?? [];
  const cs = (customers as Customer[]) ?? [];

  const active     = ps.filter(p => p.status === "active").length;
  const inProgress = ps.filter(p => p.status === "in-progress").length;
  const recent     = ps.slice(0, 5);

  const projectCountMap: Record<string, number> = {};
  ps.forEach(p => {
    if (p.customer_id) projectCountMap[p.customer_id] = (projectCountMap[p.customer_id] ?? 0) + 1;
  });

  const stats = [
    { label: "Projecten",      value: ps.length,        icon: FolderKanban, color: "bg-brand-50 text-brand-500"    },
    { label: "Actief",         value: active,            icon: CheckCircle,  color: "bg-emerald-50 text-emerald-600" },
    { label: "In uitvoering",  value: inProgress,        icon: FolderKanban, color: "bg-amber-50 text-amber-600"    },
    { label: "Klanten",        value: cs.length,         icon: Building2,    color: "bg-violet-50 text-violet-600"  },
    { label: "Teamleden",      value: team?.length ?? 0, icon: Users,        color: "bg-blue-50 text-blue-600"      },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">
          {getGreeting()}, {profile?.full_name?.split(" ")[0] ?? "daar"} 👋
        </h2>
        <p className="text-slate-500 mt-1 text-sm">Hier is een overzicht van jouw workspace. Lekker bezig!</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card p-5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
              <Icon size={20} />
            </div>
            <p className="text-2xl font-bold text-slate-800">{value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-700 flex items-center gap-2">
              <FolderKanban size={15} className="text-brand-500" /> Recente projecten
            </h3>
            <Link href="/projects" className="text-sm text-brand-500 hover:text-brand-600 font-medium">Alles bekijken →</Link>
          </div>
          <div className="card divide-y divide-slate-50 overflow-hidden">
            {recent.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                Nog geen projecten. <Link href="/projects" className="text-brand-500">Maak je eerste aan →</Link>
              </div>
            ) : recent.map(p => (
              <Link key={p.id} href={`/projects/${p.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-slate-800 truncate">{p.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-slate-400">{relativeTime(p.created_at)}</p>
                    {p.customer && <span className="text-xs text-brand-500 font-medium truncate">· {(p.customer as any).name}</span>}
                  </div>
                </div>
                <StatusBadge status={p.status} />
              </Link>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-700 flex items-center gap-2">
              <Building2 size={15} className="text-brand-500" /> Klanten
            </h3>
            <Link href="/customers" className="text-sm text-brand-500 hover:text-brand-600 font-medium">Alles bekijken →</Link>
          </div>
          <div className="card divide-y divide-slate-50 overflow-hidden">
            {cs.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                Nog geen klanten. <Link href="/customers" className="text-brand-500">Voeg een toe →</Link>
              </div>
            ) : cs.slice(0, 5).map(c => {
              const count = projectCountMap[c.id] ?? 0;
              return (
                <Link key={c.id} href={`/customers/${c.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0">
                    <Building2 size={15} className="text-brand-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-slate-800 truncate">{c.name}</p>
                    <p className="text-xs text-slate-400">Klant sinds {formatDate(c.created_at)}</p>
                  </div>
                  <span className="text-xs text-slate-400 bg-slate-100 rounded-full px-2.5 py-1 font-medium flex-shrink-0">
                    {count} project{count !== 1 ? "en" : ""}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Goedemorgen";
  if (h < 18) return "Goedemiddag";
  return "Goedenavond";
}
