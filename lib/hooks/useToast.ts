import { useState, useCallback } from "react";

export interface ToastState {
  msg: string;
  ok:  boolean;
}

/**
 * Centrale toast-hook — gebruik in alle detail-clients ipv inline state.
 * showToast("Opgeslagen")         → groene toast
 * showToast("Fout opgetreden", false) → rode toast
 */
export function useToast(duration = 3500) {
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = useCallback((msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), duration);
  }, [duration]);

  const clearToast = useCallback(() => setToast(null), []);

  return { toast, showToast, clearToast };
}
