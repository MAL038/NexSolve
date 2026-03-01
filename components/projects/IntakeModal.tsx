"use client";

/**
 * IntakeModal.tsx
 * Wizard voor het genereren van een project-intake document.
 * Stap 1: Kies welke secties je wilt opnemen
 * Stap 2: Bevestiging + snelkoppelingen
 */

import { useState, useEffect } from "react";
import {
  X, Check, Loader2, ChevronRight, FileText,
  Sparkles, AlertCircle, ToggleLeft, ToggleRight,
} from "lucide-react";
import clsx from "clsx";

interface Question {
  id: string;
  type: "text" | "textarea" | "select";
  label: string;
  required?: boolean;
  options?: string[];
}

interface Section {
  id: string;
  title: string;
  questions: Question[];
}

interface Props {
  projectId:   string;
  projectName: string;
  themeId?:    string | null;
  onCreated:   (intake: any) => void;
  onClose:     () => void;
}

export default function IntakeModal({
  projectId, projectName, themeId, onCreated, onClose,
}: Props) {
  const [loading,    setLoading]    = useState(false);
  const [fetching,   setFetching]   = useState(true);
  const [error,      setError]      = useState("");
  const [created,    setCreated]    = useState<any>(null);

  const [allSections, setAllSections]   = useState<Section[]>([]);
  const [selected,    setSelected]      = useState<Set<string>>(new Set());

  // Haal beschikbare secties op (generiek + thema-specifiek)
  useEffect(() => {
    async function load() {
      setFetching(true);
      try {
        // Generieke template
        const res = await fetch(`/api/intake-templates?theme_id=${themeId ?? ""}`);
        if (!res.ok) throw new Error("Laden mislukt");
        const data = await res.json();
        const sections: Section[] = data.sections ?? [];
        setAllSections(sections);
        // Standaard alles aangevinkt
        setSelected(new Set(sections.map((s: Section) => s.id)));
      } catch {
        setError("Kon vragenlijst niet laden");
      } finally {
        setFetching(false);
      }
    }
    load();
  }, [themeId]);

  function toggleSection(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else              next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === allSections.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(allSections.map(s => s.id)));
    }
  }

  async function handleGenerate() {
    if (selected.size === 0) { setError("Selecteer minimaal één sectie"); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/intakes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id:          projectId,
          selected_section_ids: Array.from(selected),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Aanmaken mislukt"); return; }
      setCreated(data);
      onCreated(data);
    } catch {
      setError("Er ging iets mis");
    } finally {
      setLoading(false);
    }
  }

  const allSelected = selected.size === allSections.length && allSections.length > 0;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[88vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 flex-shrink-0 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center">
              <FileText size={17} className="text-brand-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Intake document genereren</h3>
              <p className="text-xs text-slate-400 truncate max-w-[280px]">{projectName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">

          {!created ? (
            <>
              {error && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5 mb-4">
                  <AlertCircle size={14} /> {error}
                </div>
              )}

              {fetching ? (
                <div className="flex items-center justify-center py-12 text-slate-400">
                  <Loader2 size={20} className="animate-spin mr-2" /> Vragenlijst laden…
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm text-slate-500">
                      Kies welke secties je wilt opnemen in het intake document.
                    </p>
                    <button
                      onClick={toggleAll}
                      className="flex items-center gap-1.5 text-xs text-brand-600 font-semibold hover:text-brand-700"
                    >
                      {allSelected
                        ? <><ToggleRight size={15} /> Alles deselecteren</>
                        : <><ToggleLeft  size={15} /> Alles selecteren</>
                      }
                    </button>
                  </div>

                  {allSections.map(section => {
                    const isSelected = selected.has(section.id);
                    return (
                      <button
                        key={section.id}
                        onClick={() => toggleSection(section.id)}
                        className={clsx(
                          "w-full text-left flex items-start gap-3 px-4 py-3.5 rounded-xl border transition-all",
                          isSelected
                            ? "bg-brand-50 border-brand-200"
                            : "bg-white border-slate-200 hover:border-slate-300"
                        )}
                      >
                        <div className={clsx(
                          "w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all",
                          isSelected
                            ? "bg-brand-600 border-brand-600"
                            : "border-slate-300"
                        )}>
                          {isSelected && <Check size={11} className="text-white" />}
                        </div>
                        <div className="min-w-0">
                          <p className={clsx(
                            "text-sm font-semibold",
                            isSelected ? "text-brand-700" : "text-slate-700"
                          )}>
                            {section.title}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {section.questions.length} vraag{section.questions.length !== 1 ? "en" : ""}
                            {section.questions.filter(q => q.required).length > 0 &&
                              ` · ${section.questions.filter(q => q.required).length} verplicht`
                            }
                          </p>
                        </div>
                        <ChevronRight size={13} className="text-slate-300 flex-shrink-0 mt-0.5 ml-auto" />
                      </button>
                    );
                  })}

                  {allSections.length === 0 && (
                    <div className="text-center py-8 text-slate-400 text-sm">
                      Geen vragenlijst beschikbaar voor dit project.
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            /* Bevestiging */
            <div className="space-y-4 py-2">
              <div className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center mx-auto mb-3">
                  <Sparkles size={24} className="text-brand-600" />
                </div>
                <h4 className="font-bold text-slate-800">Intake aangemaakt!</h4>
                <p className="text-sm text-slate-400 mt-1">
                  Het document is opgeslagen bij dit project.
                </p>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Secties</span>
                  <span className="font-semibold text-slate-700">
                    {(created.template_snapshot?.sections ?? []).length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Status</span>
                  <span className="font-semibold text-slate-700">Concept</span>
                </div>
              </div>

              <p className="text-xs text-slate-400 text-center">
                Je kunt het document downloaden als PDF of via e-mail versturen vanuit de Intake-tab op de projectpagina.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm text-slate-500 hover:bg-slate-100 transition-colors"
          >
            {created ? "Sluiten" : "Annuleren"}
          </button>

          {!created && (
            <button
              onClick={handleGenerate}
              disabled={loading || fetching || selected.size === 0}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors disabled:opacity-50"
            >
              {loading
                ? <><Loader2 size={14} className="animate-spin" /> Genereren…</>
                : <><FileText size={14} /> Document genereren</>
              }
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
