"use client";

import { useState, useCallback, useRef } from "react";
import type { ConfirmDialogProps } from "@/components/ui/ConfirmDialog";

export interface ConfirmOptions {
  title:         string;
  description?:  string;
  confirmLabel?: string;
  cancelLabel?:  string;
  variant?:      "danger" | "default";
}

/**
 * Hook voor programmatische bevestigingsdialogen.
 * Geeft een Promise-gebaseerde `requestConfirm` functie terug
 * die resolvet naar `true` (bevestigd) of `false` (geannuleerd).
 *
 * @example
 * const { requestConfirm, confirmProps } = useConfirm();
 *
 * async function handleDelete() {
 *   const ok = await requestConfirm({
 *     title: "Item verwijderen?",
 *     description: "Dit kan niet ongedaan worden gemaakt.",
 *     confirmLabel: "Verwijderen",
 *     variant: "danger",
 *   });
 *   if (!ok) return;
 *   // ... daadwerkelijk verwijderen
 * }
 *
 * return <ConfirmDialog {...confirmProps} />;
 */
export function useConfirm() {
  const resolveRef = useRef<((value: boolean) => void) | null>(null);
  const [opts, setOpts] = useState<(ConfirmOptions & { open: boolean }) | null>(null);

  const requestConfirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise(resolve => {
      resolveRef.current = resolve;
      setOpts({ ...options, open: true });
    });
  }, []);

  const onConfirm = useCallback(() => {
    resolveRef.current?.(true);
    resolveRef.current = null;
    setOpts(null);
  }, []);

  const onCancel = useCallback(() => {
    resolveRef.current?.(false);
    resolveRef.current = null;
    setOpts(null);
  }, []);

  const confirmProps: ConfirmDialogProps = {
    open:         opts?.open ?? false,
    title:        opts?.title ?? "",
    description:  opts?.description,
    confirmLabel: opts?.confirmLabel,
    cancelLabel:  opts?.cancelLabel,
    variant:      opts?.variant,
    onConfirm,
    onCancel,
  };

  return { requestConfirm, confirmProps };
}
