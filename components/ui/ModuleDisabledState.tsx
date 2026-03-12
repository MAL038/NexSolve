import { Package } from "lucide-react";
import Link from "next/link";

interface ModuleDisabledStateProps {
  moduleName:   string;
  description?: string;
  orgId?:       string;
}

/**
 * Getoond wanneer een module is uitgeschakeld voor de huidige organisatie.
 */
export default function ModuleDisabledState({
  moduleName, description, orgId,
}: ModuleDisabledStateProps) {
  return (
    <div className="card p-16 text-center max-w-sm mx-auto">
      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
        <Package size={20} className="text-slate-400" />
      </div>
      <p className="font-semibold text-slate-700">{moduleName} is uitgeschakeld</p>
      <p className="text-slate-400 text-sm mt-1 max-w-xs mx-auto">
        {description ?? "Deze module is niet actief voor jouw organisatie."}
      </p>
      {orgId && (
        <Link
          href={`/org/${orgId}/settings`}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200
                     text-sm text-slate-600 font-medium hover:bg-slate-50 transition-colors mt-4"
        >
          Module inschakelen
        </Link>
      )}
    </div>
  );
}
