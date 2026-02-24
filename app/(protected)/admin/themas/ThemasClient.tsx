"use client";

import { useState, useEffect } from "react";
import {
  Layers, Plus, Pencil, Trash2, Check, X,
  ChevronRight, Loader2, GripVertical,
} from "lucide-react";
import clsx from "clsx";

interface Proces { id: string; name: string; slug: string; position: number; theme_id: string; }
interface Thema  { id: string; name: string; slug: string; position: number; processes: Proces[]; }

const THEMA_KLEUREN = [
  "bg-slate-100 text-slate-700",
  "bg-blue-50 text-blue-700",
  "bg-brand-50 text-brand-700",
  "bg-amber-50 text-amber-700",
  "bg-violet-50 text-violet-700",
  "bg-rose-50 text-rose-700",
];

export default function ThemasClient() {
  const [themas,       setThemas]       = useState<Thema[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [fout,         setFout]         = useState("");
  const [openThema,    setOpenThema]    = useState<string | null>(null);

  // Bewerken thema
  const [bewerkThema,  setBewerkThema]  = useState<string | null>(null);
  const [bewerkNaam,   setBewerkNaam]   = useState("");
  const [opslaan,      setOpslaan]      = useState(false);

  // Nieuw thema
  const [nieuwThema,   setNieuwThema]   = useState(false);
  const [nieuwNaam,    setNieuwNaam]    = useState("");

  // Bewerken proces
  const [bewerkProces, setBewerkProces] = useState<string | null>(null);
  const [bewerkPNaam,  setBewerkPNaam]  = useState("");

  // Nieuw proces
  const [nieuwProces,  setNieuwProces]  = useState<string | null>(null); // themaId
  const [nieuwPNaam,   setNieuwPNaam]   = useState("");

  useEffect(() => { laadThemas(); }, []);

  async function laadThemas() {
    setLoading(true);
    const res = await fetch("/api/admin/themas");
    const d = await res.json();
    setThemas(Array.isArray(d) ? d : []);
    setLoading(false);
  }

  // ── Thema CRUD ───────────────────────────────────────────────

  async function slaThemaOp() {
    if (!bewerkNaam.trim()) return;
    setOpslaan(true); setFout("");
    const res = await fetch("/api/admin/themas", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: bewerkThema, name: bewerkNaam }),
    });
    const d = await res.json();
    if (!res.ok) { setFout(d.error); }
    else { setThemas(prev => prev.map(t => t.id === bewerkThema ? { ...t, name: d.name, slug: d.slug } : t)); }
    setBewerkThema(null); setOpslaan(false);
  }

  async function voegThemaToe() {
    if (!nieuwNaam.trim()) return;
    setOpslaan(true); setFout("");
    const res = await fetch("/api/admin/themas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: nieuwNaam, position: themas.length + 1 }),
    });
    const d = await res.json();
    if (!res.ok) { setFout(d.error); }
    else { setThemas(prev => [...prev, { ...d, processes: [] }]); setNieuwThema(false); setNieuwNaam(""); }
    setOpslaan(false);
  }

  async function verwijderThema(id: string, naam: string) {
    if (!confirm(`Thema "${naam}" verwijderen? Alle submodules worden ook verwijderd.`)) return;
    setFout("");
    const res = await fetch(`/api/admin/themas?id=${id}`, { method: "DELETE" });
    if (!res.ok) { const d = await res.json(); setFout(d.error); return; }
    setThemas(prev => prev.filter(t => t.id !== id));
  }

  // ── Proces CRUD ──────────────────────────────────────────────

  async function slaProcesOp(themaId: string) {
    if (!bewerkPNaam.trim()) return;
    setOpslaan(true); setFout("");
    const res = await fetch(`/api/admin/themas/${themaId}/processen`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: bewerkProces, name: bewerkPNaam }),
    });
    const d = await res.json();
    if (!res.ok) { setFout(d.error); }
    else {
      setThemas(prev => prev.map(t =>
        t.id === themaId
          ? { ...t, processes: t.processes.map(p => p.id === bewerkProces ? { ...p, name: d.name } : p) }
          : t
      ));
    }
    setBewerkProces(null); setOpslaan(false);
  }

  async function voegProcesToe(themaId: string) {
    if (!nieuwPNaam.trim()) return;
    setOpslaan(true); setFout("");
    const t = themas.find(t => t.id === themaId);
    const res = await fetch(`/api/admin/themas/${themaId}/processen`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: nieuwPNaam, position: (t?.processes.length ?? 0) + 1 }),
    });
    const d = await res.json();
    if (!res.ok) { setFout(d.error); }
    else {
      setThemas(prev => prev.map(t => t.id === themaId ? { ...t, processes: [...t.processes, d] } : t));
      setNieuwProces(null); setNieuwPNaam("");
    }
    setOpslaan(false);
  }

  async function verwijderProces(themaId: string, procesId: string, naam: string) {
    if (!confirm(`Submodule "${naam}" verwijderen?`)) return;
    setFout("");
    const res = await fetch(`/api/admin/themas/${themaId}/processen?id=${procesId}`, { method: "DELETE" });
    if (!res.ok) { const d = await res.json(); setFout(d.error); return; }
    setThemas(prev => prev.map(t =>
      t.id === themaId ? { ...t, processes: t.processes.filter(p => p.id !== procesId) } : t
    ));
  }

  if (loading) return (
    <div className="flex justify-center py-16">
      <Loader2 size={28} className="animate-spin text-brand-400" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Thema's & submodules</h2>
          <p className="text-sm text-slate-500 mt-0.5">{themas.length} thema's, {themas.reduce((s, t) => s + t.processes.length, 0)} submodules</p>
        </div>
        <button
          onClick={() => { setNieuwThema(true); setNieuwNaam(""); }}
          className="btn-primary"
        >
          <Plus size={15} /> Nieuw thema
        </button>
      </div>

      {fout && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
          <X size={14} /> {fout}
          <button onClick={() => setFout("")} className="ml-auto"><X size={12} /></button>
        </div>
      )}

      {/* Nieuw thema form */}
      {nieuwThema && (
        <div className="card p-4 border-2 border-brand-200 flex items-center gap-3">
          <Layers size={16} className="text-brand-400 flex-shrink-0" />
          <input
            autoFocus className="input flex-1"
            placeholder="Naam van het nieuwe thema"
            value={nieuwNaam}
            onChange={e => setNieuwNaam(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") voegThemaToe(); if (e.key === "Escape") setNieuwThema(false); }}
          />
          <button onClick={voegThemaToe} disabled={opslaan || !nieuwNaam.trim()}
            className="btn-primary py-2">
            {opslaan ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          </button>
          <button onClick={() => setNieuwThema(false)} className="btn-outline py-2"><X size={14} /></button>
        </div>
      )}

      {/* Thema-lijst */}
      <div className="space-y-3">
        {themas.map((t, idx) => {
          const kleur = THEMA_KLEUREN[idx % THEMA_KLEUREN.length];
          const isOpen = openThema === t.id;

          return (
            <div key={t.id} className="card overflow-hidden">
              {/* Thema header */}
              <div className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50/50 group">
                <button onClick={() => setOpenThema(isOpen ? null : t.id)}
                  className="flex items-center gap-3 flex-1 text-left min-w-0">
                  <div className={clsx("w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0", kleur)}>
                    <Layers size={13} />
                  </div>
                  {bewerkThema === t.id ? (
                    <input autoFocus className="input py-1 text-sm flex-1"
                      value={bewerkNaam}
                      onChange={e => setBewerkNaam(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") slaThemaOp(); if (e.key === "Escape") setBewerkThema(null); }}
                      onClick={e => e.stopPropagation()}
                    />
                  ) : (
                    <span className="font-semibold text-slate-800 flex-1 truncate">{t.name}</span>
                  )}
                  <span className="text-xs text-slate-400 flex-shrink-0">{t.processes.length} submodules</span>
                  <ChevronRight size={14} className={clsx(
                    "text-slate-400 transition-transform duration-200 flex-shrink-0",
                    isOpen && "rotate-90"
                  )} />
                </button>

                {/* Acties */}
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  {bewerkThema === t.id ? (
                    <>
                      <button onClick={slaThemaOp} disabled={opslaan} className="p-1.5 rounded-lg text-brand-500 hover:bg-brand-50">
                        {opslaan ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                      </button>
                      <button onClick={() => setBewerkThema(null)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100">
                        <X size={13} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => { setBewerkThema(t.id); setBewerkNaam(t.name); }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => verwijderThema(t.id, t.name)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50">
                        <Trash2 size={13} />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Submodules */}
              {isOpen && (
                <div className="border-t border-slate-100 bg-slate-50/50">
                  {t.processes.map(p => (
                    <div key={p.id} className="flex items-center gap-3 px-5 py-2.5 border-b border-slate-100/80 group/p hover:bg-white/60 transition-colors">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-300 flex-shrink-0 ml-2" />
                      {bewerkProces === p.id ? (
                        <input autoFocus className="input py-1 text-sm flex-1"
                          value={bewerkPNaam}
                          onChange={e => setBewerkPNaam(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") slaProcesOp(t.id); if (e.key === "Escape") setBewerkProces(null); }}
                        />
                      ) : (
                        <span className="flex-1 text-sm text-slate-700 truncate">{p.name}</span>
                      )}
                      <div className="flex gap-1 opacity-0 group-hover/p:opacity-100 transition-opacity">
                        {bewerkProces === p.id ? (
                          <>
                            <button onClick={() => slaProcesOp(t.id)} className="p-1 rounded text-brand-500 hover:bg-brand-50">
                              <Check size={12} />
                            </button>
                            <button onClick={() => setBewerkProces(null)} className="p-1 rounded text-slate-400 hover:bg-slate-100">
                              <X size={12} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => { setBewerkProces(p.id); setBewerkPNaam(p.name); }}
                              className="p-1 rounded text-slate-400 hover:text-brand-600 hover:bg-brand-50">
                              <Pencil size={12} />
                            </button>
                            <button onClick={() => verwijderProces(t.id, p.id, p.name)}
                              className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50">
                              <Trash2 size={12} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Nieuw proces */}
                  {nieuwProces === t.id ? (
                    <div className="flex items-center gap-2 px-5 py-2.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-brand-300 flex-shrink-0 ml-2" />
                      <input autoFocus className="input py-1 text-sm flex-1"
                        placeholder="Naam submodule"
                        value={nieuwPNaam}
                        onChange={e => setNieuwPNaam(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") voegProcesToe(t.id); if (e.key === "Escape") setNieuwProces(null); }}
                      />
                      <button onClick={() => voegProcesToe(t.id)} disabled={opslaan || !nieuwPNaam.trim()}
                        className="p-1.5 rounded-lg text-brand-500 hover:bg-brand-50">
                        {opslaan ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                      </button>
                      <button onClick={() => setNieuwProces(null)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100">
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setNieuwProces(t.id); setNieuwPNaam(""); }}
                      className="w-full flex items-center gap-2 px-5 py-2.5 text-xs text-slate-400 hover:text-brand-600 hover:bg-white/80 transition-colors"
                    >
                      <Plus size={12} /> Submodule toevoegen
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {themas.length === 0 && !nieuwThema && (
        <div className="card p-12 text-center">
          <Layers size={36} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-400 text-sm">Nog geen thema's. Maak er een aan!</p>
        </div>
      )}
    </div>
  );
}
