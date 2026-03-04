"use client";

// app/(protected)/admin/organisaties/OrganisatiesClient.tsx
import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Building2, Search, ArrowRight, Users, Calendar, ChevronRight,
} from "lucide-react";
import clsx from "clsx";

interface OrgRow {
  id: string;
  name: string;
  slug: string | null;
  created_at: string;
  memberCount: number;
}

interface Props {
  organisations: OrgRow[];
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("nl-NL", {
    day: "numeric", month: "short", year: "numeric",
  });
}

export default function OrganisatiesClient({ organisations }: Props) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() =>
    organisations.filter(o =>
      o.name.toLowerCase().includes(search.toLowerCase()) ||
      (o.slug ?? "").toLowerCase().includes(search.toLowerCase())
    ),
    [organisations, search]
  );

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Building2 size={16} className="text-brand-500" />
          <span className="text-xs font-semibold uppercase tracking-widest text-brand-500">Superuser</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-800">Organisaties</h1>
        <p className="text-sm text-slate-500 mt-1">
          {organisations.length} organisatie{organisations.length !== 1 ? "s" : ""} op het platform
        </p>
      </div>

      {/* Zoekbalk */}
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Zoek op naam of slug..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm
                     focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500
                     bg-white placeholder:text-slate-400"
        />
      </div>

      {/* Tabel */}
      <div className="card overflow-hidden">

        {/* Tabelheader */}
        <div className="grid grid-cols-[1fr_100px_140px_48px] items-center px-5 py-3
                        border-b border-slate-100 bg-slate-50/70">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Organisatie</span>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Leden</span>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Aangemaakt</span>
          <span />
        </div>

        {/* Rijen */}
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <Building2 size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">
              {search ? "Geen organisaties gevonden voor deze zoekopdracht" : "Nog geen organisaties"}
            </p>
          </div>
        ) : (
          filtered.map((org, i) => {
            const memberCount = org.memberCount;
            return (
              <Link
                key={org.id}
                href={`/org/${org.id}/settings?from=admin`}
                className={clsx(
                  "grid grid-cols-[1fr_100px_140px_48px] items-center px-5 py-4",
                  "transition-colors hover:bg-slate-50 group",
                  i !== 0 && "border-t border-slate-100"
                )}
              >
                {/* Naam + slug */}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{org.name}</p>
                  {org.slug && (
                    <p className="text-xs text-slate-400 mt-0.5 font-mono truncate">{org.slug}</p>
                  )}
                </div>

                {/* Ledencount */}
                <div className="flex items-center gap-1.5 text-sm text-slate-600">
                  <Users size={13} className="text-slate-400 flex-shrink-0" />
                  {memberCount}
                </div>

                {/* Aanmaakdatum */}
                <div className="flex items-center gap-1.5 text-sm text-slate-400">
                  <Calendar size={13} className="flex-shrink-0" />
                  {formatDate(org.created_at)}
                </div>

                {/* Pijl */}
                <div className="flex justify-end">
                  <ChevronRight
                    size={16}
                    className="text-slate-300 group-hover:text-brand-500 transition-colors"
                  />
                </div>
              </Link>
            );
          })
        )}
      </div>

      {/* Footer count bij actieve search */}
      {search && filtered.length > 0 && (
        <p className="text-xs text-slate-400 text-center">
          {filtered.length} van {organisations.length} organisaties
        </p>
      )}
    </div>
  );
}
