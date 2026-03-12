import type { ReactNode } from "react";

interface SectionHeaderProps {
  title:        string;
  description?: string;
  action?:      ReactNode;
  /** Extra className voor de wrapper */
  className?:   string;
}

/**
 * Consistente paginakop met optionele beschrijving en actie-slot.
 * Gebruik als vervanging van losse h1+p combinaties op list- en detailpagina's.
 */
export default function SectionHeader({
  title, description, action, className = "",
}: SectionHeaderProps) {
  return (
    <div className={`flex items-start justify-between gap-4 ${className}`}>
      <div>
        <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
        {description && (
          <p className="text-sm text-slate-500 mt-0.5">{description}</p>
        )}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}
