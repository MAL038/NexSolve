// app/(protected)/customers/loading.tsx
// Getoond door Next.js terwijl de async CustomersPage laadt.

export default function CustomersLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="h-7 w-32 bg-slate-200 rounded-lg" />
          <div className="h-4 w-20 bg-slate-100 rounded mt-1.5" />
        </div>
        <div className="h-9 w-32 bg-slate-200 rounded-xl" />
      </div>

      {/* Zoek + filter skeleton */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="h-9 w-60 bg-slate-100 rounded-xl" />
        <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
          {[52, 52, 64].map((w, i) => (
            <div key={i} className="h-7 rounded-lg bg-slate-200" style={{ width: `${w}px` }} />
          ))}
        </div>
      </div>

      {/* Klantkaarten skeleton — 3 kolommen op desktop */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-slate-100 bg-white p-5 space-y-3">
            {/* Badge + acties row */}
            <div className="flex items-start justify-between gap-2">
              <div className="h-6 w-16 bg-slate-100 rounded-lg" />
              <div className="flex gap-1">
                <div className="h-6 w-6 bg-slate-100 rounded-lg" />
                <div className="h-6 w-6 bg-slate-100 rounded-lg" />
              </div>
            </div>
            {/* Naam */}
            <div>
              <div className="h-4 w-3/4 bg-slate-200 rounded" />
              <div className="h-3 w-1/3 bg-slate-100 rounded mt-1.5" />
            </div>
            {/* Footer */}
            <div className="flex items-center gap-3 pt-2 border-t border-slate-50">
              <div className="h-3 w-20 bg-slate-100 rounded" />
              <div className="h-3 w-28 bg-slate-100 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
