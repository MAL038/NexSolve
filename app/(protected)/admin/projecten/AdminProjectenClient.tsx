"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  FolderKanban, Search, Building2, User, ChevronRight,
  Layers, Pencil, Trash2, X, ExternalLink,
} from "lucide-react";
import clsx from "clsx";
import StatusBadge from "@/components/ui/StatusBadge";
import { relativeTime } from "@/lib/time";
import type { Project, Customer, Profile } from "@/types";

interface AdminProject extends Omit<Project, "owner" | "customer"> {
  customer: Pick<Customer, "id" | "name"> | null;
  owner: Pick<Profile, "full_name" | "email"> | null;
}

interface Props {
  projecten:  AdminProject[];
  eigenaren:  Pick<Profile, "id" | "full_name">[];
}

export default function AdminProjectenClient({ projecten, eigenaren }: Props) {
  const router = useRouter();
  const [zoek,         setZoek]         = useState("");
  const [eigenaarFilter, setEigenaarFilter] = useState("all");
  const [verwijderen,  setVerwijderen]  = useState<string | null>(null);
  const [fout,         setFout]         = useState("");

  const gefilterd = projecten.filter(p => {
    const matchZoek  = p.name.toLowerCase().includes(zoek.toLowerCase()) ||
                       (p.description ?? "").toLowerCase().includes(zoek.toLowerCase());
    const matchEigenaar = eigenaarFilter === "all" || p.owner_id === eigenaarFilter;
    return matchZoek && matchEigenaar;
  });

  async function verwijderProject(id: string, naam: string) {
    if (!confirm(`Project "${naam}" definitief verwijderen?`)) return;
    setVerwijderen(id); setFout("");
    const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
    if (!res.ok) { const d = await res.json(); setFout(d.error ?? "Verwijderen mislukt"); }
    setVerwijderen(null);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Alle projecten</h2>
          <p className="text-sm text-slate-500 mt-0.5">{projecten.length} projecten in totaal</p>
        </div>
      </div>

      {fout && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
          <X size={14} /> {fout}
          <button onClick={() => setFout("")} className="ml-auto"><X size={12} /></button>
        </div>
      )}

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="Zoeken op naam of omschrijving…"
            value={zoek} onChange={e => setZoek(e.target.value)} />
        </div>
        <select className="select max-w-[220px]" value={eigenaarFilter}
          onChange={e => setEigenaarFilter(e.target.value)}>
          <option value="all">Alle eigenaren</option>
          {eigenaren.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
        </select>
      </div>

      <div className="card overflow-hidden">
        {gefilterd.length === 0 ? (
          <div className="p-12 text-center">
            <FolderKanban size={36} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-400 text-sm">Geen projecten gevonden.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-5 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Project</th>
                <th className="text-left px-5 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide hidden lg:table-cell">Eigenaar</th>
                <th className="text-left px-5 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide hidden md:table-cell">Status</th>
                <th className="text-left px-5 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide hidden xl:table-cell">Bijgewerkt</th>
                <th className="px-5 py-3 w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {gefilterd.map(p => (
                <tr key={p.id} className="hover:bg-slate-50/60 transition-colors group">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0">
                        <FolderKanban size={14} className="text-brand-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-slate-800 truncate">{p.name}</p>
                        {p.customer && (
                          <p className="text-xs text-slate-400 flex items-center gap-1">
                            <Building2 size={10} /> {p.customer.name}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 hidden lg:table-cell">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <User size={12} />
                      {p.owner?.full_name ?? "—"}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 hidden md:table-cell">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="px-5 py-3.5 hidden xl:table-cell">
                    <span className="text-xs text-slate-400">{relativeTime(p.updated_at)}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => router.push(`/projects/${p.id}`)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                        title="Bekijken"
                      >
                        <ExternalLink size={13} />
                      </button>
                      <button
                        onClick={() => verwijderProject(p.id, p.name)}
                        disabled={verwijderen === p.id}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Verwijderen"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
