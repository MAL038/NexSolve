// app/(protected)/projects/loading.tsx
// Getoond door Next.js terwijl de async ProjectsPage laadt.

export default function ProjectsLoading() {
  return (
    <div className="p-4 sm:p-6 space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-7 w-36 bg-slate-200 rounded-lg" />
        <div className="h-9 w-32 bg-slate-200 rounded-xl" />
      </div>

      {/* Filter bar skeleton */}
      <div className="flex gap-2">
        {[80, 96, 72, 88].map(w => (
          <div key={w} className="h-8 rounded-xl bg-slate-100" style={{ width: `${w}px` }} />
        ))}
      </div>

      {/* Project cards skeleton — 3 kolommen op desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-slate-100 bg-white p-5 space-y-3">
            {/* Title */}
            <div className="h-4 w-3/4 bg-slate-200 rounded" />
            {/* Subtitle */}
            <div className="h-3 w-1/2 bg-slate-100 rounded" />
            {/* Progress bar */}
            <div className="h-2 w-full bg-slate-100 rounded-full">
              <div
                className="h-full bg-slate-200 rounded-full"
                style={{ width: `${30 + (i % 3) * 20}%` }}
              />
            </div>
            {/* Footer row */}
            <div className="flex items-center justify-between pt-1">
              <div className="h-3 w-20 bg-slate-100 rounded" />
              <div className="h-6 w-16 bg-slate-100 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
