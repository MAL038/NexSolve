import clsx from "clsx";

interface SkeletonTableProps {
  rows?: number;
  cols?: number;
  className?: string;
}

/**
 * Animated tabel-placeholder voor lijst-pagina's.
 * Gebruik tijdens loading state om layout shift te voorkomen.
 */
export default function SkeletonTable({ rows = 6, cols = 4, className }: SkeletonTableProps) {
  return (
    <div className={clsx("card overflow-hidden animate-pulse", className)}>
      {/* Header */}
      <div className="flex items-center gap-4 px-5 py-3.5 border-b border-slate-100 bg-slate-50/60">
        {Array.from({ length: cols }).map((_, i) => (
          <div
            key={i}
            className={clsx("h-3 bg-slate-200 rounded-lg", i === 0 ? "w-36" : i === cols - 1 ? "w-16" : "flex-1")}
          />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 px-5 py-4 border-b border-slate-50 last:border-0">
          {Array.from({ length: cols }).map((_, c) => (
            <div
              key={c}
              className={clsx(
                "h-3.5 rounded-lg",
                c === 0        ? "w-44 bg-slate-150" :
                c === cols - 1 ? "w-20 bg-slate-100"  :
                c === 1        ? "flex-1 bg-slate-100" :
                "flex-1 bg-slate-100",
                // Vary opacity slightly for visual texture
                r % 2 === 0 ? "opacity-100" : "opacity-70"
              )}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Kleinere skeleton voor een enkele tabelrij.
 */
export function SkeletonRow({ cols = 4 }: { cols?: number }) {
  return (
    <div className="flex items-center gap-4 px-5 py-4 animate-pulse">
      {Array.from({ length: cols }).map((_, i) => (
        <div key={i} className={clsx("h-3.5 bg-slate-100 rounded-lg", i === 0 ? "w-44" : "flex-1")} />
      ))}
    </div>
  );
}
