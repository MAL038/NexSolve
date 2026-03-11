"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Layers, GitBranch, Tag,
  LayoutDashboard, AlignLeft, FolderKanban,
  Settings, ChevronRight,
} from "lucide-react";
import clsx from "clsx";
import type { ThemeWithChildren } from "@/types";

interface Props { theme: ThemeWithChildren; }

type Tab = "overzicht" | "structuur" | "toepassingen" | "instellingen";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "overzicht",    label: "Overzicht",    icon: LayoutDashboard },
  { id: "structuur",    label: "Structuur",    icon: AlignLeft       },
  { id: "toepassingen", label: "Toepassingen", icon: FolderKanban    },
  { id: "instellingen", label: "Instellingen", icon: Settings        },
];

// ─── Helpers ──────────────────────────────────────────────────

function DataRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">{label}</p>
      <div className="text-sm text-slate-700 leading-snug">{children}</div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────

export default function ProcesDetailClient({ theme }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("overzicht");

  const processes   = theme.processes ?? [];
  const totalTypes  = processes.reduce((s, p) => s + (p.process_types?.length ?? 0), 0);

  return (
    <div className="-mx-4 sm:-mx-6 -my-4 sm:-my-6 flex min-h-[calc(100dvh-56px)]">

      {/* ══ SIDEBAR ══════════════════════════════════════════ */}
      <aside className="hidden lg:flex flex-col w-[260px] flex-shrink-0 border-r border-slate-200 bg-white">

        <div className="px-5 pt-5 pb-4 border-b border-slate-200">
          <Link href="/processen"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-brand-600
                       font-medium transition-colors mb-3">
            <ArrowLeft size={13} /> Terug naar processen
          </Link>

          <div className="flex items-start gap-2.5 mb-4">
            <div className="w-9 h-9 rounded-xl bg-brand-50 border border-brand-100 flex items-center
                            justify-center flex-shrink-0 mt-0.5">
              <Layers size={16} className="text-brand-600" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-bold text-slate-800 leading-tight break-words">{theme.name}</h1>
              <p className="text-[11px] text-slate-400 mt-0.5">Thema</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100">
            {[
              { label: "Processen",  value: processes.length, color: "text-slate-800"   },
              { label: "Procestypen", value: totalTypes,      color: "text-brand-700"   },
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className={clsx("text-lg font-bold", s.color)}>{s.value}</p>
                <p className="text-[10px] font-semibold text-slate-400">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tab navigatie */}
        <nav className="flex flex-col gap-0.5 px-2 py-3 flex-1">
          {TABS.map(tab => {
            const Icon   = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all text-left",
                  active
                    ? "bg-brand-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-800"
                )}>
                <Icon size={15} className={active ? "opacity-80" : "text-slate-400"} />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* ══ INHOUD ═══════════════════════════════════════════ */}
      <div className="flex-1 min-w-0 overflow-y-auto bg-slate-50">

        {/* Mobiele header */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-200">
          <Link href="/processen" className="text-slate-500 hover:text-brand-600 transition-colors">
            <ArrowLeft size={16} />
          </Link>
          <h1 className="font-bold text-slate-800 flex-1 truncate">{theme.name}</h1>
        </div>
        <div className="lg:hidden flex gap-1 px-4 py-2 bg-white border-b border-slate-200 overflow-x-auto">
          {TABS.map(tab => {
            const Icon   = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  "flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                  active ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-100"
                )}>
                <Icon size={12} /> {tab.label}
              </button>
            );
          })}
        </div>

        {/* ── Overzicht ──────────────────────────────────── */}
        {activeTab === "overzicht" && (
          <div className="p-5 sm:p-6 max-w-2xl space-y-5">
            <div className="card overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h2 className="text-sm font-semibold text-slate-700">Thema-informatie</h2>
              </div>
              <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                <DataRow label="Naam"><span className="font-medium">{theme.name}</span></DataRow>
                <DataRow label="Slug"><span className="font-mono text-xs text-slate-500">{theme.slug}</span></DataRow>
                <DataRow label="Processen"><span>{processes.length}</span></DataRow>
                <DataRow label="Procestypen"><span>{totalTypes}</span></DataRow>
              </div>
            </div>

            {/* Processen samenvatting */}
            <div className="card overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-700">Processen</h2>
                <button onClick={() => setActiveTab("structuur")}
                  className="text-xs text-brand-600 hover:text-brand-700 font-medium transition-colors">
                  Volledige structuur →
                </button>
              </div>
              {processes.length === 0 ? (
                <div className="px-5 py-8 text-center">
                  <GitBranch size={28} className="mx-auto mb-2 text-slate-200" />
                  <p className="text-sm text-slate-400">Nog geen processen in dit thema.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {processes.slice(0, 5).map(proc => (
                    <div key={proc.id} className="flex items-center gap-3 px-5 py-3">
                      <GitBranch size={13} className="text-slate-400 flex-shrink-0" />
                      <span className="flex-1 text-sm font-medium text-slate-700 truncate">{proc.name}</span>
                      <span className="text-xs text-slate-400 flex-shrink-0">
                        {proc.process_types?.length ?? 0} {(proc.process_types?.length ?? 0) === 1 ? "type" : "typen"}
                      </span>
                    </div>
                  ))}
                  {processes.length > 5 && (
                    <div className="px-5 py-2.5">
                      <button onClick={() => setActiveTab("structuur")}
                        className="text-xs text-slate-400 hover:text-brand-600 font-medium transition-colors">
                        +{processes.length - 5} meer processen
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Structuur ──────────────────────────────────── */}
        {activeTab === "structuur" && (
          <div className="p-5 sm:p-6 max-w-2xl space-y-3">
            {processes.length === 0 ? (
              <div className="card p-12 text-center">
                <GitBranch size={32} className="mx-auto mb-3 text-slate-200" />
                <p className="text-sm text-slate-400">Nog geen processen in dit thema.</p>
              </div>
            ) : processes.map(proc => {
              const types = proc.process_types ?? [];
              return (
                <div key={proc.id} className="card overflow-hidden">
                  <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-100">
                    <GitBranch size={14} className="text-brand-500 flex-shrink-0" />
                    <span className="flex-1 text-sm font-semibold text-slate-800 truncate">{proc.name}</span>
                    <span className="text-xs text-slate-400 flex-shrink-0">
                      {types.length} {types.length === 1 ? "type" : "typen"}
                    </span>
                    <ChevronRight size={13} className="text-slate-300 flex-shrink-0" />
                  </div>
                  {types.length > 0 && (
                    <div className="bg-slate-50/50 divide-y divide-slate-100">
                      {types.map(pt => (
                        <div key={pt.id} className="flex items-center gap-3 pl-12 pr-5 py-2.5">
                          <Tag size={11} className="text-slate-300 flex-shrink-0" />
                          <span className="text-xs text-slate-600 font-medium">{pt.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {types.length === 0 && (
                    <div className="pl-12 pr-5 py-2.5 bg-slate-50/30">
                      <span className="text-xs text-slate-400">Geen procestypen</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Toepassingen ───────────────────────────────── */}
        {activeTab === "toepassingen" && (
          <div className="p-5 sm:p-6 max-w-2xl">
            <div className="card p-10 text-center">
              <FolderKanban size={32} className="mx-auto mb-3 text-slate-200" />
              <p className="text-sm font-medium text-slate-500">Toepassingen</p>
              <p className="text-xs text-slate-400 mt-1">
                Projecten die dit thema gebruiken worden hier weergegeven.
              </p>
            </div>
          </div>
        )}

        {/* ── Instellingen ───────────────────────────────── */}
        {activeTab === "instellingen" && (
          <div className="p-5 sm:p-6 max-w-2xl space-y-5">
            <div className="card overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h2 className="text-sm font-semibold text-slate-700">Thema-instellingen</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Beheer thema's en processen via het beheerpaneel.
                </p>
              </div>
              <div className="px-5 py-4">
                <Link
                  href="/beheer"
                  className="inline-flex items-center gap-2 text-sm text-brand-600 hover:text-brand-700 font-medium transition-colors">
                  <Settings size={14} /> Naar beheerpaneel
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
