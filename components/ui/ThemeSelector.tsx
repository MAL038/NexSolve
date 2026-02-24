"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Check, Loader2, ChevronRight } from "lucide-react";
import clsx from "clsx";
import type { ThemeWithChildren, ProcessWithChildren, ThemeSelection } from "@/types";

// ─── Color palette per theme slug ────────────────────────────
const THEME_COLORS: Record<string, { bg: string; activeBg: string; text: string; border: string; dot: string }> = {
  "algemeen":        { bg: "bg-slate-50",   activeBg: "bg-slate-700",   text: "text-slate-700",  border: "border-slate-200", dot: "bg-slate-400"  },
  "crm":             { bg: "bg-blue-50",    activeBg: "bg-blue-600",    text: "text-blue-700",   border: "border-blue-200",  dot: "bg-blue-400"   },
  "hrm":             { bg: "bg-brand-50",   activeBg: "bg-brand-600",   text: "text-brand-700",  border: "border-brand-200", dot: "bg-brand-500"  },
  "ordermanagement": { bg: "bg-amber-50",   activeBg: "bg-amber-600",   text: "text-amber-700",  border: "border-amber-200", dot: "bg-amber-400"  },
  "payroll":         { bg: "bg-violet-50",  activeBg: "bg-violet-600",  text: "text-violet-700", border: "border-violet-200",dot: "bg-violet-400" },
  "erp":             { bg: "bg-rose-50",    activeBg: "bg-rose-600",    text: "text-rose-700",   border: "border-rose-200",  dot: "bg-rose-400"   },
};

function getColor(slug: string) {
  return THEME_COLORS[slug] ?? THEME_COLORS["algemeen"];
}

// ─── Props ───────────────────────────────────────────────────
interface Props {
  value?: ThemeSelection;
  onChange: (sel: ThemeSelection) => void;
  initialHierarchy?: ThemeWithChildren[];
}

export default function ThemeSelector({ value, onChange, initialHierarchy }: Props) {
  const [hierarchy, setHierarchy] = useState<ThemeWithChildren[]>(initialHierarchy ?? []);
  const [loading,   setLoading]   = useState(!initialHierarchy);
  const [error,     setError]     = useState("");

  const [themeId,   setThemeId]   = useState(value?.theme_id   ?? "");
  const [processId, setProcessId] = useState(value?.process_id ?? "");

  // Sync if value prop changes externally (e.g. opening edit form)
  useEffect(() => {
    setThemeId(value?.theme_id   ?? "");
    setProcessId(value?.process_id ?? "");
  }, [value?.theme_id, value?.process_id]);

  useEffect(() => {
    if (initialHierarchy) return;
    fetch("/api/themes")
      .then(r => r.json())
      .then(d => { setHierarchy(d); setLoading(false); })
      .catch(() => { setError("Failed to load themes"); setLoading(false); });
  }, [initialHierarchy]);

  const selectedTheme   = hierarchy.find(t => t.id === themeId);
  const processOptions  = selectedTheme?.processes ?? [];
  const selectedProcess = processOptions.find(p => p.id === processId);

  const selectTheme = useCallback((t: ThemeWithChildren) => {
    if (themeId === t.id) {
      // Deselect
      setThemeId(""); setProcessId("");
      onChange({ theme_id: null, process_id: null, process_type_id: null });
    } else {
      setThemeId(t.id); setProcessId("");
      onChange({ theme_id: t.id, process_id: null, process_type_id: null });
    }
  }, [themeId, onChange]);

  const selectProcess = useCallback((p: ProcessWithChildren) => {
    if (processId === p.id) {
      setProcessId("");
      onChange({ theme_id: themeId || null, process_id: null, process_type_id: null });
    } else {
      setProcessId(p.id);
      onChange({ theme_id: themeId || null, process_id: p.id, process_type_id: null });
    }
  }, [processId, themeId, onChange]);

  const clear = useCallback(() => {
    setThemeId(""); setProcessId("");
    onChange({ theme_id: null, process_id: null, process_type_id: null });
  }, [onChange]);

  if (error) return (
    <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">{error}</div>
  );

  if (loading) return (
    <div className="flex items-center gap-2 text-slate-400 text-sm py-4">
      <Loader2 size={15} className="animate-spin" /> Loading themes…
    </div>
  );

  return (
    <div className="space-y-4">

      {/* ── Level 1: Theme tiles ─────────────────────────── */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Thema</p>
        <div className="grid grid-cols-3 gap-2">
          {hierarchy.map(t => {
            const c       = getColor(t.slug);
            const active  = themeId === t.id;
            const hasSubs = (t.processes?.length ?? 0) > 0;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => selectTheme(t)}
                className={clsx(
                  "relative flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left text-sm font-medium transition-all",
                  active
                    ? `${c.activeBg} text-white border-transparent shadow-sm`
                    : `${c.bg} ${c.text} ${c.border} hover:opacity-80`
                )}
              >
                {/* Color dot */}
                <span className={clsx(
                  "w-2 h-2 rounded-full flex-shrink-0",
                  active ? "bg-white/70" : c.dot
                )} />
                <span className="flex-1 truncate leading-tight">{t.name}</span>
                {hasSubs && (
                  <ChevronRight size={13} className={clsx(
                    "flex-shrink-0 transition-transform",
                    active ? "text-white/70 rotate-90" : "text-current opacity-40"
                  )} />
                )}
                {active && !hasSubs && (
                  <Check size={13} className="flex-shrink-0 text-white/90" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Level 2: Process list (only when theme with subs selected) ── */}
      {selectedTheme && processOptions.length > 0 && (
        <div className="pl-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Submodule — {selectedTheme.name}
          </p>
          <div className="grid grid-cols-1 gap-1.5">
            {processOptions.map(p => {
              const c      = getColor(selectedTheme.slug);
              const active = processId === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => selectProcess(p)}
                  className={clsx(
                    "flex items-center gap-3 px-3.5 py-2.5 rounded-xl border text-sm text-left transition-all",
                    active
                      ? `${c.activeBg} text-white border-transparent shadow-sm`
                      : `bg-white text-slate-600 border-slate-150 hover:${c.bg} hover:${c.text} hover:${c.border}`
                  )}
                >
                  <span className={clsx(
                    "w-1.5 h-1.5 rounded-full flex-shrink-0",
                    active ? "bg-white/70" : c.dot
                  )} />
                  <span className="flex-1">{p.name}</span>
                  {active && <Check size={13} className="flex-shrink-0 text-white/90" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Active selection summary ──────────────────────── */}
      {themeId && (
        <div className="flex items-center gap-2 pt-1">
          <div className="flex items-center gap-1.5 flex-wrap flex-1">
            {selectedTheme && (
              <span className={clsx(
                "badge font-medium",
                `${getColor(selectedTheme.slug).bg} ${getColor(selectedTheme.slug).text}`
              )}>
                {selectedTheme.name}
              </span>
            )}
            {selectedProcess && (
              <>
                <ChevronRight size={12} className="text-slate-300" />
                <span className={clsx(
                  "badge font-medium",
                  `${getColor(selectedTheme!.slug).activeBg} text-white`
                )}>
                  {selectedProcess.name}
                </span>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={clear}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors flex-shrink-0"
            title="Clear"
          >
            <X size={13} />
          </button>
        </div>
      )}
    </div>
  );
}
