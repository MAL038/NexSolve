"use client";

import { useEffect, useState } from "react";
import { Trash2, RotateCcw, Loader2 } from "lucide-react";
import clsx from "clsx";
import { formatDate } from "@/lib/time";
import { CardGridSkeleton } from "@/components/ui/Skeleton";

interface TrashedItem {
  id:         string;
  name:       string;
  deleted_at: string;
}

interface Props {
  entityType: "project" | "customer";
}

export default function TrashPanel({ entityType }: Props) {
  const [items,     setItems]     = useState<TrashedItem[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [deleting,  setDeleting]  = useState<string | null>(null);

  const endpoint = entityType === "project" ? "/api/projects" : "/api/customers";

  useEffect(() => {
    fetch(`${endpoint}?trashed=1`)
      .then(r => r.json())
      .then(data => setItems(data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [endpoint]);

  async function restore(id: string) {
    setRestoring(id);
    await fetch(`${endpoint}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deleted_at: null }),
    });
    setItems(prev => prev.filter(i => i.id !== id));
    setRestoring(null);
  }

  async function permanentDelete(id: string) {
    setDeleting(id);
    await fetch(`${endpoint}/${id}?permanent=1`, { method: "DELETE" });
    setItems(prev => prev.filter(i => i.id !== id));
    setDeleting(null);
  }

  if (loading) return <CardGridSkeleton count={3} />;

  if (items.length === 0) {
    return (
      <div className="card p-16 text-center">
        <Trash2 size={40} className="mx-auto text-slate-300 mb-3" />
        <p className="text-slate-500 text-sm font-medium">Prullenbak is leeg</p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden divide-y divide-slate-100">
      {items.map(item => (
        <div key={item.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50/60">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-700 truncate">{item.name}</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Verwijderd op {formatDate(item.deleted_at)}
            </p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => restore(item.id)}
              disabled={!!restoring || !!deleting}
              className={clsx(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors",
                "text-brand-600 bg-brand-50 hover:bg-brand-100 disabled:opacity-50"
              )}
            >
              {restoring === item.id
                ? <Loader2 size={11} className="animate-spin" />
                : <RotateCcw size={11} />}
              Herstellen
            </button>
            <button
              onClick={() => permanentDelete(item.id)}
              disabled={!!restoring || !!deleting}
              className={clsx(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors",
                "text-red-600 bg-red-50 hover:bg-red-100 disabled:opacity-50"
              )}
            >
              {deleting === item.id
                ? <Loader2 size={11} className="animate-spin" />
                : <Trash2 size={11} />}
              Definitief
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
