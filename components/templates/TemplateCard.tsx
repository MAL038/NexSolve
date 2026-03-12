import clsx from "clsx";
import { LayoutTemplate, CheckSquare, Workflow, ChevronRight } from "lucide-react";

interface TemplateCardProps {
  id:           string;
  name:         string;
  description?: string | null;
  taskCount:    number;
  processName?: string | null;
  themeName?:   string | null;
  onSelect?:    (id: string) => void;
  selected?:    boolean;
}

export default function TemplateCard({
  id, name, description, taskCount, processName, themeName, onSelect, selected,
}: TemplateCardProps) {
  const isClickable = !!onSelect;
  const Wrapper: any = isClickable ? "button" : "div";

  return (
    <Wrapper
      onClick={isClickable ? () => onSelect?.(id) : undefined}
      className={clsx(
        "card p-5 text-left w-full transition-all group",
        isClickable && "cursor-pointer hover:border-brand-300 hover:bg-brand-50/20",
        selected && "border-brand-400 bg-brand-50/30 ring-2 ring-brand-100"
      )}
    >
      <div className="flex items-start gap-3">
        <div className={clsx(
          "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5",
          selected ? "bg-brand-100" : "bg-slate-100 group-hover:bg-brand-50"
        )}>
          <LayoutTemplate size={16} className={selected ? "text-brand-600" : "text-slate-500 group-hover:text-brand-500"} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={clsx(
            "text-sm font-semibold truncate",
            selected ? "text-brand-700" : "text-slate-700 group-hover:text-brand-600"
          )}>
            {name}
          </p>
          {description && (
            <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{description}</p>
          )}
          <div className="flex flex-wrap items-center gap-2 mt-2.5">
            {taskCount > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg font-medium">
                <CheckSquare size={10} />
                {taskCount} taak{taskCount !== 1 ? "en" : ""}
              </span>
            )}
            {processName && (
              <span className="inline-flex items-center gap-1 text-[11px] text-brand-600 bg-brand-50 px-2 py-0.5 rounded-lg font-medium border border-brand-100">
                <Workflow size={10} />
                {themeName ? `${themeName} · ` : ""}{processName}
              </span>
            )}
          </div>
        </div>
        {isClickable && (
          <ChevronRight size={14} className={clsx(
            "flex-shrink-0 mt-1 transition-colors",
            selected ? "text-brand-500" : "text-slate-300 group-hover:text-brand-400"
          )} />
        )}
      </div>
    </Wrapper>
  );
}
