"use client";

import { useState, useEffect } from "react";
import {
  Users, FolderKanban, Clock, TrendingUp, AlertTriangle,
  UserPlus, Activity, Shield, RefreshCw, ChevronRight,
  UserCheck, UserX, Archive,
} from "lucide-react";
import Link from "next/link";
import { relativeTime } from "@/lib/time";
import clsx from "clsx";

interface StaleProject {
  id: string; name: string; status: string; updated_at: string;
  owner: { full_name: string } | null;
}
interface RecentUser {
  id: string; full_name: string; email: string; role: string; created_at: string;
}
interface ActiveUser {
  name: string; avatar: string | null; count: number;
}
interface Stats {
  users:    { total: number; active: number; blocked: number; newThisMonth: number; recentSignups: RecentUser[] };
  projects: { total: number; active: number; archived: number; stale: StaleProject[] };
  hours:    { thisMonth: number };
  activity: { mostActive: ActiveUser[] };
}

const ROLE_COLORS: Record<string, string> = {
  superuser:    "bg-brand-100 text-brand-700",
  admin:        "bg-blue-100 text-blue-700",
  member:       "bg-slate-100 text-slate-600",
  viewer:       "bg-slate-50 text-slate-400",
  projectleider:"bg-green-100 text-green-700",
};
const ROLE_NL: Record<string, string> = {
  superuser: "Superuser", admin: "Admin", member: "Teamlid",
  viewer: "Viewer", projectleider: "Projectleider",
};

function StatCard({ icon: Icon, label, value, sub, color, href }: {
  icon: any; label: string; value: number | string; sub?: string; color: string; href?: string;
}) {
  const inner = (
    <div className={clsx(
      "card p-5 flex items-start gap-4",
      href && "hover:-translate-y-0.5 transition-all group cursor-pointer"
    )}>
      <div className={clsx("w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0", color)}>
        <Icon size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-2xl font-bold text-slate-800 leading-none">{value}</p>
        <p className="text-sm font-semibold text-slate-600 mt-1">{label}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
      {href && <ChevronRight size={15} className="text-slate-300 group-hover:text-brand-500 transition-colors mt-1 flex-shrink-0" />}
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

export default function AdminDashboardClient() {
  const [stats,    setStats]    = useState<Stats | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  async function fetchStats() {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/admin/stats");
      if (!res.ok) throw new Error((await res.json()).error ?? "Fout bij ophalen");
      setStats(await res.json());
      setLastFetch(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Onbekende fout");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchStats(); }, []);

  if (loading) return (
    <div className="p-8 flex items-center justify-center min-h-64">
      <div className="flex items-center gap-3 text-slate-400">
        <RefreshCw size={16} className="animate-spin" />
        <span className="text-sm">Statistieken ophalen…</span>
      </div>
    </div>
  );

  if (error) return (
    <div className="p-8">
      <div className="card p-6 border-red-200 bg-red-50 text-red-700 text-sm">{error}</div>
    </div>
  );

  if (!stats) return null;

  const staleCount  = stats.projects.stale.length;
  const blockedCount = stats.users.blocked;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield size={14} className="text-brand-500" />
            <span className="text-xs font-bold uppercase tracking-widest text-brand-500">Superuser</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Systeemdashboard</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Platform-overzicht voor beheerders
            {lastFetch && <span> · bijgewerkt {relativeTime(lastFetch.toISOString())}</span>}
          </p>
        </div>
        <button onClick={fetchStats} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-slate-500 hover:border-brand-300 hover:text-brand-600 text-sm transition-colors">
          <RefreshCw size={14} /> Vernieuwen
        </button>
      </div>

      {/* Waarschuwingen */}
      {(staleCount > 0 || blockedCount > 0) && (
        <div className="space-y-2">
          {staleCount > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
              <AlertTriangle size={15} className="text-amber-500 flex-shrink-0" />
              <span><strong>{staleCount} project{staleCount !== 1 ? "en" : ""}</strong> zijn al 30+ dagen niet bijgewerkt</span>
              <a href="#stale" className="ml-auto text-amber-600 hover:underline text-xs font-medium">Bekijk →</a>
            </div>
          )}
          {blockedCount > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
              <UserX size={15} className="text-red-500 flex-shrink-0" />
              <span><strong>{blockedCount} gebruiker{blockedCount !== 1 ? "s" : ""}</strong> geblokkeerd</span>
              <Link href="/admin/gebruikers" className="ml-auto text-red-600 hover:underline text-xs font-medium">Beheer →</Link>
            </div>
          )}
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users}        label="Gebruikers"        value={stats.users.total}
          sub={`${stats.users.active} actief`}
          color="bg-blue-50 text-blue-600" href="/admin/gebruikers" />
        <StatCard icon={UserPlus}     label="Nieuw deze maand"  value={stats.users.newThisMonth}
          sub="geregistreerde accounts"
          color="bg-brand-50 text-brand-600" />
        <StatCard icon={FolderKanban} label="Actieve projecten" value={stats.projects.active}
          sub={`${stats.projects.total} totaal · ${stats.projects.archived} gearchiveerd`}
          color="bg-violet-50 text-violet-600" href="/projects" />
        <StatCard icon={Clock}        label="Uren deze maand"   value={`${stats.hours.thisMonth}u`}
          sub="geregistreerd over alle gebruikers"
          color="bg-amber-50 text-amber-600" href="/hours" />
      </div>

      {/* Twee kolommen: stilstaande projecten + meest actieve gebruikers */}
      <div className="grid lg:grid-cols-2 gap-6">

        {/* Stilstaande projecten */}
        <div id="stale" className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Archive size={15} className="text-amber-500" />
              <h2 className="text-sm font-semibold text-slate-700">Stilstaande projecten</h2>
            </div>
            <span className="text-xs text-slate-400">30+ dagen geen update</span>
          </div>
          {stats.projects.stale.length === 0 ? (
            <div className="px-5 py-10 text-center text-slate-400">
              <TrendingUp size={24} className="mx-auto mb-2 text-brand-400" />
              <p className="text-sm">Alle projecten zijn recent bijgewerkt</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {stats.projects.stale.map(p => (
                <Link key={p.id} href={`/projects/${p.id}`}
                  className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors group">
                  <div className={clsx("w-2 h-2 rounded-full flex-shrink-0",
                    p.status === "active" ? "bg-brand-400" : "bg-amber-400"
                  )} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate group-hover:text-brand-600">{p.name}</p>
                    <p className="text-xs text-slate-400">
                      {p.owner?.full_name ?? "Onbekend"} · {relativeTime(p.updated_at)}
                    </p>
                  </div>
                  <ChevronRight size={13} className="text-slate-300 group-hover:text-brand-500 transition-colors flex-shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Meest actieve gebruikers */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity size={15} className="text-brand-500" />
              <h2 className="text-sm font-semibold text-slate-700">Meest actief deze maand</h2>
            </div>
            <Link href="/admin/activiteit" className="text-xs text-brand-500 hover:underline">Alles zien →</Link>
          </div>
          {stats.activity.mostActive.length === 0 ? (
            <div className="px-5 py-10 text-center text-slate-400 text-sm">Nog geen activiteit</div>
          ) : (
            <div className="divide-y divide-slate-50">
              {stats.activity.mostActive.map((u, i) => (
                <div key={u.name} className="flex items-center gap-3 px-5 py-3.5">
                  <div className="w-7 h-7 rounded-full bg-brand-50 flex items-center justify-center flex-shrink-0 text-xs font-bold text-brand-600">
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{u.name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 rounded-full bg-brand-100 w-16 overflow-hidden">
                      <div className="h-full rounded-full bg-brand-500" style={{
                        width: `${Math.round((u.count / (stats.activity.mostActive[0]?.count || 1)) * 100)}%`
                      }} />
                    </div>
                    <span className="text-xs font-semibold text-slate-500 w-8 text-right">{u.count}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recente aanmeldingen */}
      {stats.users.recentSignups.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserCheck size={15} className="text-brand-500" />
              <h2 className="text-sm font-semibold text-slate-700">Recente aanmeldingen</h2>
            </div>
            <span className="text-xs text-slate-400">Afgelopen 7 dagen</span>
          </div>
          <div className="divide-y divide-slate-50">
            {stats.users.recentSignups.map(u => (
              <div key={u.id} className="flex items-center gap-4 px-5 py-3.5">
                <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0 text-xs font-bold text-slate-500">
                  {u.full_name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-700">{u.full_name}</p>
                  <p className="text-xs text-slate-400">{u.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={clsx("text-xs font-medium px-2 py-0.5 rounded-lg", ROLE_COLORS[u.role] ?? ROLE_COLORS.member)}>
                    {ROLE_NL[u.role] ?? u.role}
                  </span>
                  <span className="text-xs text-slate-400">{relativeTime(u.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
