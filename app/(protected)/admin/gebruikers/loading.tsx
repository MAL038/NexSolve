// app/(protected)/admin/gebruikers/loading.tsx

export default function GebruikersLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="h-7 w-40 bg-slate-200 rounded-lg" />
        <div className="h-9 w-32 bg-slate-200 rounded-xl" />
      </div>

      {/* Zoekbalk */}
      <div className="h-9 w-64 bg-slate-100 rounded-xl" />

      {/* Tabel skeleton */}
      <div className="rounded-2xl border border-slate-100 bg-white overflow-hidden">
        {/* Header row */}
        <div className="flex items-center gap-4 px-5 py-3 bg-slate-50 border-b border-slate-100">
          {[120, 180, 100, 100, 80].map((w, i) => (
            <div key={i} className="h-3 bg-slate-200 rounded" style={{ width: `${w}px` }} />
          ))}
        </div>
        {/* Data rows */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 px-5 py-4 border-b border-slate-50 last:border-0"
          >
            {/* Avatar + naam */}
            <div className="flex items-center gap-3 w-48 shrink-0">
              <div className="w-8 h-8 rounded-full bg-slate-200" />
              <div className="h-3.5 w-28 bg-slate-200 rounded" />
            </div>
            {/* Email */}
            <div className="h-3 w-44 bg-slate-100 rounded" />
            {/* Rol badge */}
            <div className="h-5 w-20 bg-slate-100 rounded-lg" />
            {/* Org */}
            <div className="h-3 w-24 bg-slate-100 rounded" />
            {/* Acties */}
            <div className="ml-auto flex gap-2">
              <div className="h-7 w-7 bg-slate-100 rounded-lg" />
              <div className="h-7 w-7 bg-slate-100 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
