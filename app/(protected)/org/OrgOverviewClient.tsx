"use client";
// app/(protected)/org/OrgOverviewClient.tsx

import { useState } from "react";
import Link from "next/link";
import {
  Building2, Users, Settings, Plus, Search,
  ChevronRight, CheckCircle2, XCircle, Calendar,
} from "lucide-react";
import clsx from "clsx";
import { formatDate } from "@/lib/time";
import type { Organisation } from "@/types";

interface OrgWithCount extends Organisation {
  member_count: number;
}

interface Props {
  organisations: OrgWithCount[];
}

export default function OrgOverviewClient({ organisations }: Props) {
  const [search, setSearch] = useState("");

  const filtered = organisations.filter(o =>
    o.name.toLowerCase().includes(search.toLowerCase()) ||
    o.slug.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Organisaties</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {organisations.length} organisatie{organisations.length !== 1 ? "s" : ""} op het platform
          </p>
        </div>
        <Link
          href="/admin/organisaties/nieuw"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors shadow-sm"
        >
          <Plus size={15} /> Nieuwe organisatie
        </Link>
      </div>

      {/* Zoekbalk */}
      <div className="relative max-w-xs">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition"
          placeholder="Zoek op naam of slug..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Lijst */}
      {filtered.length === 0 ? (
        <div className="card p-16 text-center">
          <Building2 size={32} className="mx-auto mb-3 text-slate-300" />
          <p className="text-sm text-slate-400">Geen organisaties gevonden</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(org => (
            <div
              key={org.id}
              className={clsx(
                "card flex items-center gap-4 px-5 py-4 hover:border-brand-200 transition-all group",
                !org.is_active && "opacity-60 bg-slate-50"
              )}
            >
              {/* Avatar / initialen */}
              <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center flex-shrink-0">
                {org.logo_url ? (
                  <img src={org.logo_url} alt={org.name} className="w-full h-full object-cover rounded-xl" />
                ) : (
                  <span className="text-sm font-bold text-brand-600">
                    {org.name.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-slate-800">{org.name}</p>
                  <span className="text-xs text-slate-400 font-mono">{org.slug}</span>
                  {!org.is_active && (
                    <span className="flex items-center gap-1 text-xs text-red-500 bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                      <XCircle size={10} /> Inactief
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-1 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Users size={11} /> {org.member_count} leden
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar size={11} /> Aangemaakt {formatDate(org.created_at)}
                  </span>
                </div>
              </div>

              {/* Status badge */}
              {org.is_active && (
                <span className="flex items-center gap-1.5 text-xs font-medium text-brand-700 bg-brand-50 px-2.5 py-1 rounded-lg border border-brand-100 flex-shrink-0">
                  <CheckCircle2 size={11} /> Actief
                </span>
              )}

              {/* Settings link */}
              <Link
                href={`/org/${org.id}/settings`}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-500 hover:text-brand-600 hover:bg-brand-50 transition-colors flex-shrink-0"
              >
                <Settings size={13} />
                Beheren
                <ChevronRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
