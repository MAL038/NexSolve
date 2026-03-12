import clsx from "clsx";
import type { SubprocessStatus } from "@/types";

export const TASK_STATUS_CONFIG: Record<SubprocessStatus, {
  label:  string;
  dot:    string;
  bg:     string;
  text:   string;
  border: string;
}> = {
  "todo":        { label: "Te doen",       dot: "bg-slate-300",   bg: "bg-slate-50",    text: "text-slate-600",  border: "border-slate-200"  },
  "in-progress": { label: "In uitvoering", dot: "bg-amber-400",   bg: "bg-amber-50",    text: "text-amber-700",  border: "border-amber-200"  },
  "blocked":     { label: "Geblokkeerd",   dot: "bg-red-400",     bg: "bg-red-50",      text: "text-red-700",    border: "border-red-200"    },
  "done":        { label: "Afgerond",      dot: "bg-emerald-400", bg: "bg-emerald-50",  text: "text-emerald-700",border: "border-emerald-200"},
};

export default function TaskStatusBadge({ status }: { status: SubprocessStatus }) {
  const cfg = TASK_STATUS_CONFIG[status] ?? TASK_STATUS_CONFIG["todo"];
  return (
    <span className={clsx(
      "inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded-lg border flex-shrink-0",
      cfg.bg, cfg.text, cfg.border
    )}>
      <span className={clsx("w-1.5 h-1.5 rounded-full flex-shrink-0", cfg.dot)} />
      {cfg.label}
    </span>
  );
}
