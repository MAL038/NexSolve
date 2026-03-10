export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card p-5 animate-pulse space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div className="h-5 bg-slate-200 rounded-lg w-20" />
            <div className="flex gap-1">
              <div className="w-7 h-7 bg-slate-200 rounded-lg" />
              <div className="w-7 h-7 bg-slate-200 rounded-lg" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-4 bg-slate-200 rounded w-3/4" />
            <div className="h-3 bg-slate-200 rounded w-full" />
            <div className="h-3 bg-slate-200 rounded w-2/3" />
          </div>
          <div className="pt-2 border-t border-slate-100 flex gap-3">
            <div className="h-3 bg-slate-200 rounded w-20" />
            <div className="h-3 bg-slate-200 rounded w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}
