"use client";

import { Trash2 } from "lucide-react";

export interface ConfirmDialogProps {
  open:          boolean;
  title:         string;
  description?:  string;
  confirmLabel?: string;
  cancelLabel?:  string;
  variant?:      "danger" | "default";
  onConfirm:     () => void;
  onCancel:      () => void;
}

/**
 * Modale bevestigingsdialoog.
 * Gebruik samen met useConfirm() hook.
 *
 * @example
 * const { requestConfirm, confirmProps } = useConfirm();
 * // ...
 * if (!(await requestConfirm({ title: "Verwijderen?", variant: "danger" }))) return;
 * // ... actie uitvoeren
 * return <ConfirmDialog {...confirmProps} />;
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Bevestigen",
  cancelLabel  = "Annuleren",
  variant      = "default",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 z-40 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm pointer-events-auto overflow-hidden">

          {/* Icon + inhoud */}
          <div className="p-6">
            {variant === "danger" && (
              <div className="w-10 h-10 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
                <Trash2 size={18} className="text-red-500" />
              </div>
            )}
            <h3 className="text-base font-semibold text-slate-800 leading-snug">{title}</h3>
            {description && (
              <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">{description}</p>
            )}
          </div>

          {/* Knoppen */}
          <div className="flex items-center justify-end gap-2 px-6 py-4 bg-slate-50 border-t border-slate-100">
            <button onClick={onCancel} className="btn-outline">
              {cancelLabel}
            </button>
            <button
              onClick={onConfirm}
              className={variant === "danger" ? "btn-danger" : "btn-primary"}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
