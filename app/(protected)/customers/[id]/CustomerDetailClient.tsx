"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Building2, FolderKanban, Plus,
  Search, X, Link2,
} from "lucide-react";
import { createClient } from "@/lib/supabaseClient";
import StatusBadge from "@/components/ui/StatusBadge";
import { formatDate, relativeTime } from "@/lib/time";
import PdfExportButton from "@/components/ui/PdfExportButton";
import type { Customer, Project } from "@/types";

interface Props {
  customer: Customer;
  linkedProjects: Project[];
  allProjects: Project[];
}

export default function CustomerDetailClient({ customer, linkedProjects: initial, allProjects }: Props) {
  const router = useRouter();
  const [linked,      setLinked]      = useState<Project[]>(initial);
  const [showLink,    setShowLink]    = useState(false);
  const [linkSearch,  setLinkSearch]  = useState("");
  const [linkLoading, setLinkLoading] = useState<string | null>(null);

  const stats = {
    total:      linked.length,
    active:     linked.filter(p => p.status === "active").length,
    inProgress: linked.filter(p => p.status === "in-progress").length,
    archived:   linked.filter(p => p.status === "archived").length,
  };

  // Projects not yet linked to this customer
  const linkable = allProjects.filter(p =>
    p.customer_id !== customer.id &&
    p.name.toLowerCase().includes(linkSearch.toLowerCase())
  );

  async function linkProject(projectId: string) {
    setLinkLoading(projectId);
    const supabase = createClient();
    await supabase.from("projects").update({ customer_id: customer.id }).eq("id", projectId);
    const project = allProjects.find(p => p.id === projectId);
    if (project) setLinked(prev => [{ ...project, customer_id: customer.id }, ...prev]);
    setLinkLoading(null);
  }

  async function unlinkProject(projectId: string) {
    setLinkLoading(projectId);
    const supabase = createClient();
    await supabase.from("projects").update({ customer_id: null }).eq("id", projectId);
    setLinked(prev => prev.filter(p => p.id !== projectId));
    setLinkLoading(null);
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link href="/customers"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-brand-600 font-medium transition-colors">
        <ArrowLeft size={16} /> Terug naar klanten
      </Link>

      {/* Klant header card */}
      <div className="card p-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center">
            <Building2 size={26} className="text-brand-500" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-800">{customer.name}</h1>
            <p className="text-sm text-slate-400">Klant sinds {formatDate(customer.created_at)}</p>
          </div>
          <PdfExportButton scope={`theme:all`} label="Exporteer" />
        </div>

        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Totaal",         value: stats.total       },
            { label: "Actief",         value: stats.active      },
            { label: "In uitvoering",  value: stats.inProgress  },
            { label: "Gearchiveerd",   value: stats.archived    },
          ].map(s => (
            <div key={s.label} className="bg-slate-50 rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-slate-800">{s.value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Projects section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-slate-700 flex items-center gap-2">
            <FolderKanban size={16} className="text-brand-500" />
            Projecten ({linked.length})
          </h2>
          <button
            onClick={() => { setShowLink(v => !v); setLinkSearch(""); }}
            className="btn-secondary text-xs"
          >
            {showLink ? <><X size={13} /> Annuleren</> : <><Link2 size={13} /> Project koppelen</>}
          </button>
        </div>

        {/* Link project panel */}
        {showLink && (
          <div className="card p-4 mb-4 space-y-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="input pl-9 text-sm"
                placeholder="Projecten zoeken…"
                value={linkSearch}
                onChange={e => setLinkSearch(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-1.5 max-h-52 overflow-y-auto">
              {linkable.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">
                  {linkSearch ? `Geen projecten gevonden voor "${linkSearch}"` : "Geen projecten meer te koppelen"}
                </p>
              ) : linkable.map(p => (
                <div key={p.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-slate-100 hover:border-brand-200 hover:bg-brand-50/40 transition-colors">
                  <FolderKanban size={14} className="text-slate-400 flex-shrink-0" />
                  <span className="flex-1 text-sm text-slate-700 truncate">{p.name}</span>
                  {p.customer_id && p.customer && (
                    <span className="text-xs text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full flex-shrink-0">
                      {(p.customer as any).name}
                    </span>
                  )}
                  <StatusBadge status={p.status} />
                  <button
                    onClick={() => linkProject(p.id)}
                    disabled={linkLoading === p.id}
                    className="btn-secondary text-xs px-2.5 py-1.5 flex-shrink-0"
                  >
                    {linkLoading === p.id ? "…" : "Koppelen"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Linked projects list */}
        <div className="card overflow-hidden">
          {linked.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-sm">
              Nog geen projecten gekoppeld.{" "}
              <button onClick={() => setShowLink(true)} className="text-brand-500 hover:underline">
                Koppel er een →
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {linked.map(p => (
                <div key={p.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors group">
                  <Link href={`/projects/${p.id}`} className="flex-1 min-w-0 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-slate-800 truncate">{p.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{relativeTime(p.created_at)}</p>
                    </div>
                    <StatusBadge status={p.status} />
                  </Link>
                  <button
                    onClick={() => unlinkProject(p.id)}
                    disabled={linkLoading === p.id}
                    className="text-xs text-red-400 hover:text-red-600 font-medium px-2 py-1 rounded-lg hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                  >
                    {linkLoading === p.id ? "…" : "Ontkoppelen"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
