import { type ReactNode } from "react";
import { Search } from "lucide-react";

interface Props {
  icon:         React.ElementType;
  title:        string;
  description?: string;
  action?:      ReactNode;
}

export default function EmptyState({ icon: Icon, title, description, action }: Props) {
  return (
    <div className="card p-16 text-center">
      <Icon size={40} className="mx-auto text-slate-300 mb-3" />
      <p className="text-slate-700 font-semibold">{title}</p>
      {description && <p className="text-slate-400 text-sm mt-1">{description}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function EmptySearch({ query }: { query: string }) {
  return (
    <div className="card p-16 text-center">
      <Search size={40} className="mx-auto text-slate-300 mb-3" />
      <p className="text-slate-700 font-semibold">Geen resultaten voor &ldquo;{query}&rdquo;</p>
      <p className="text-slate-400 text-sm mt-1">Probeer een andere zoekterm.</p>
    </div>
  );
}
