import { X } from "lucide-react";
import clsx from "clsx";
import type { ToastState } from "@/lib/hooks/useToast";

interface Props {
  toast:    ToastState | null;
  onClose?: () => void;
}

/**
 * Centrale Toast-weergave component.
 * Gebruik samen met useToast() hook.
 *
 * @example
 * const { toast, showToast, clearToast } = useToast();
 * return <Toast toast={toast} onClose={clearToast} />;
 */
export default function Toast({ toast, onClose }: Props) {
  if (!toast) return null;

  return (
    <div className={clsx(
      "fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-semibold shadow-lg",
      toast.ok
        ? "bg-white border-brand-200 text-brand-700"
        : "bg-white border-red-200 text-red-700"
    )}>
      <span className={clsx(
        "w-2 h-2 rounded-full flex-shrink-0",
        toast.ok ? "bg-brand-500" : "bg-red-500"
      )} />
      {toast.msg}
      {onClose && (
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 ml-1 flex-shrink-0 transition-colors"
        >
          <X size={13} />
        </button>
      )}
    </div>
  );
}
