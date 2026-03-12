import type { ReactNode } from "react";
import { Lock } from "lucide-react";

interface PermissionGateProps {
  /** Als false: kinderen verbergen of fallback tonen */
  allowed: boolean;
  /**
   * "hidden"    → niets renderen (default)
   * "disabled"  → kinderen grijs + niet klikbaar tonen
   * ReactNode   → eigen fallback renderen
   */
  fallback?: "hidden" | "disabled" | ReactNode;
  children: ReactNode;
}

/**
 * Wrapper die kinderen conditioneel rendert op basis van een permissie.
 *
 * @example
 * <PermissionGate allowed={canDeleteProject(orgRole, role)}>
 *   <DeleteButton />
 * </PermissionGate>
 */
export default function PermissionGate({ allowed, fallback = "hidden", children }: PermissionGateProps) {
  if (allowed) return <>{children}</>;
  if (fallback === "hidden") return null;
  if (fallback === "disabled") {
    return (
      <div className="opacity-40 pointer-events-none select-none" aria-disabled>
        {children}
      </div>
    );
  }
  return <>{fallback}</>;
}

// ─── Paginaniveau unauthorized state ──────────────────────────

export function UnauthorizedState() {
  return (
    <div className="card p-16 text-center max-w-sm mx-auto">
      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
        <Lock size={20} className="text-slate-400" />
      </div>
      <p className="font-semibold text-slate-700">Geen toegang</p>
      <p className="text-slate-400 text-sm mt-1">
        Je hebt geen rechten om deze pagina te bekijken.
      </p>
    </div>
  );
}
