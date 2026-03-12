import clsx from "clsx";
import { List, LayoutGrid } from "lucide-react";

export type ViewMode = "list" | "board";

interface ViewToggleProps {
  view:     ViewMode;
  onChange: (v: ViewMode) => void;
}

export default function ViewToggle({ view, onChange }: ViewToggleProps) {
  return (
    <div className="flex items-center gap-0.5 bg-slate-100 rounded-xl p-0.5">
      {([
        { id: "list"  as const, Icon: List,        label: "Lijst" },
        { id: "board" as const, Icon: LayoutGrid,  label: "Bord"  },
      ]).map(({ id, Icon, label }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          title={label}
          className={clsx(
            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all",
            view === id
              ? "bg-white text-slate-700 shadow-sm"
              : "text-slate-400 hover:text-slate-600"
          )}
        >
          <Icon size={13} />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}
