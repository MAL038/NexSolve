import clsx from "clsx";
import type { ProjectStatus } from "@/types";

const CONFIG: Record<ProjectStatus, { label: string; dot: string; bg: string; text: string }> = {
  "active":      { label: "Actief",        dot: "bg-brand-500", bg: "bg-brand-50",  text: "text-brand-700"  },
  "in-progress": { label: "In uitvoering", dot: "bg-amber-500", bg: "bg-amber-50",  text: "text-amber-700"  },
  "archived":    { label: "Gearchiveerd",  dot: "bg-slate-400", bg: "bg-slate-100", text: "text-slate-600"  },
};

export default function StatusBadge({ status }: { status: ProjectStatus }) {
  const c = CONFIG[status] ?? CONFIG["active"];
  return (
    <span className={clsx(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold",
      c.bg, c.text
    )}>
      <span className={clsx("w-1.5 h-1.5 rounded-full flex-shrink-0", c.dot)} />
      {c.label}
    </span>
  );
}
