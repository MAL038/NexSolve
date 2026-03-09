// app/(protected)/admin/loading.tsx

export default function AdminLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="h-7 w-40 bg-slate-200 rounded-lg" />

      {/* Stat cards — 4 kolommen */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-slate-100 bg-white p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-4 w-20 bg-slate-200 rounded" />
              <div className="h-8 w-8 bg-slate-100 rounded-xl" />
            </div>
            <div className="h-7 w-16 bg-slate-200 rounded" />
            <div className="h-3 w-24 bg-slate-100 rounded" />
          </div>
        ))}
      </div>

      {/* Activiteitenlijst */}
      <div className="rounded-2xl border border-slate-100 bg-white p-5 space-y-4">
        <div className="h-5 w-32 bg-slate-200 rounded-lg" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="h-7 w-7 rounded-full bg-slate-100 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 w-3/4 bg-slate-200 rounded" />
              <div className="h-3 w-24 bg-slate-100 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
