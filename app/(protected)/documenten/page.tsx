// app/(protected)/documenten/page.tsx
import { requireAuth } from "@/lib/auth";
import { DossierList } from "@/components/dossiers/DossierList";

export const metadata = { title: "Documenten — NexSolve" };

export default async function DocumentenPage() {
  await requireAuth();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Documenten</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Alle documenten en dossiers in jouw organisatie
        </p>
      </div>
      <DossierList />
    </div>
  );
}
