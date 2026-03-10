// Streaming skeleton voor het dashboard — toont direct terwijl data wordt geladen.
export default function DashboardLoading() {
  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-pulse">

      {/* Header skeleton */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="h-7 w-56 bg-slate-200 rounded-xl" />
          <div className="h-4 w-32 bg-slate-100 rounded-lg" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-20 bg-slate-100 rounded-xl" />
          <div className="h-9 w-28 bg-slate-200 rounded-xl" />
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card p-5 space-y-3">
            <div className="w-9 h-9 rounded-xl bg-slate-100" />
            <div className="h-7 w-12 bg-slate-200 rounded-lg" />
            <div className="h-3 w-24 bg-slate-100 rounded" />
            <div className="h-3 w-16 bg-slate-100 rounded" />
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Project progress card */}
          <div className="card p-5 space-y-4">
            <div className="h-5 w-32 bg-slate-200 rounded-lg" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex justify-between">
                  <div className="h-4 w-40 bg-slate-100 rounded" />
                  <div className="h-4 w-16 bg-slate-100 rounded" />
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full" />
              </div>
            ))}
          </div>

          {/* Top customers card */}
          <div className="card p-5 space-y-3">
            <div className="h-5 w-24 bg-slate-200 rounded-lg" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-1">
                <div className="w-8 h-8 rounded-xl bg-slate-100 flex-shrink-0" />
                <div className="flex-1 space-y-1">
                  <div className="h-3.5 w-32 bg-slate-100 rounded" />
                  <div className="h-3 w-20 bg-slate-50 rounded" />
                </div>
                <div className="h-6 w-16 bg-slate-100 rounded-full" />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          {/* Open tasks skeleton */}
          <div className="card p-5 space-y-3">
            <div className="h-5 w-36 bg-slate-200 rounded-lg" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-xl">
                <div className="mt-1 w-2 h-2 rounded-full bg-slate-100 flex-shrink-0" />
                <div className="flex-1 space-y-1">
                  <div className="h-3.5 w-full bg-slate-100 rounded" />
                  <div className="h-3 w-24 bg-slate-50 rounded" />
                </div>
              </div>
            ))}
          </div>

          {/* Activity skeleton */}
          <div className="card p-5 space-y-3">
            <div className="h-5 w-36 bg-slate-200 rounded-lg" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 py-1">
                <div className="w-7 h-7 rounded-xl bg-slate-100 flex-shrink-0" />
                <div className="flex-1 space-y-1 pt-0.5">
                  <div className="h-3.5 w-full bg-slate-100 rounded" />
                  <div className="h-3 w-16 bg-slate-50 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
