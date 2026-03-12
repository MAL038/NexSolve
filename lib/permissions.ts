/**
 * lib/permissions.ts
 *
 * Gecentraliseerde permissie-helpers voor NexSolve.
 * Pure functies — geen async, geen side effects.
 * Voor async DB-checks (RPC) zie lib/auth.ts.
 */
import type { UserRole, OrgRole, MemberRole } from "@/types";

// ─── Platform-niveau ──────────────────────────────────────────

/** Toegang tot het superuser-beheerpaneel */
export function canAccessAdmin(role: UserRole): boolean {
  return role === "superuser";
}

/** Toegang tot org-instellingen en org-beheer */
export function canManageOrg(orgRole: OrgRole | null, role: UserRole): boolean {
  return role === "superuser" || orgRole === "admin";
}

// ─── Project-niveau ───────────────────────────────────────────

/** Project bewerken (naam, status, beschrijving, datums) */
export function canEditProject(
  projectRole: MemberRole | null,
  orgRole: OrgRole | null,
  role: UserRole
): boolean {
  return role === "superuser" || orgRole === "admin" || projectRole === "projectleider";
}

/** Project verwijderen of archiveren */
export function canDeleteProject(orgRole: OrgRole | null, role: UserRole): boolean {
  return role === "superuser" || orgRole === "admin";
}

/** Teamleden beheren in een project */
export function canManageProjectTeam(
  projectRole: MemberRole | null,
  orgRole: OrgRole | null,
  role: UserRole
): boolean {
  return canEditProject(projectRole, orgRole, role);
}

// ─── Content-niveau ───────────────────────────────────────────

/** Klanten aanmaken of bewerken */
export function canCreateCustomer(orgRole: OrgRole | null, role: UserRole): boolean {
  return role === "superuser" || orgRole === "admin" || orgRole === "member";
}

/** Documenten beheren */
export function canManageDossiers(orgRole: OrgRole | null, role: UserRole): boolean {
  return role === "superuser" || orgRole === "admin" || orgRole === "member";
}

/** Rapportages inzien */
export function canViewReports(orgRole: OrgRole | null, role: UserRole): boolean {
  // Alle ingelogde leden mogen rapportages zien; restrict later als nodig
  return role !== "viewer" || orgRole === "admin";
}

/** Templates beheren */
export function canManageTemplates(orgRole: OrgRole | null, role: UserRole): boolean {
  return role === "superuser" || orgRole === "admin";
}

// ─── Role display helpers ─────────────────────────────────────

export const PLATFORM_ROLE_CONFIG: Record<UserRole, {
  label: string; color: string; bg: string; border: string;
}> = {
  superuser:     { label: "Superuser",     color: "text-violet-700", bg: "bg-violet-50",  border: "border-violet-200" },
  admin:         { label: "Beheerder",     color: "text-brand-700",  bg: "bg-brand-50",   border: "border-brand-200"  },
  projectleider: { label: "Projectleider", color: "text-amber-700",  bg: "bg-amber-50",   border: "border-amber-200"  },
  member:        { label: "Medewerker",    color: "text-slate-600",  bg: "bg-slate-100",  border: "border-slate-200"  },
  viewer:        { label: "Kijker",        color: "text-slate-500",  bg: "bg-slate-50",   border: "border-slate-200"  },
};

export const ORG_ROLE_CONFIG: Record<OrgRole, {
  label: string; color: string; bg: string; border: string;
}> = {
  admin:  { label: "Org Admin", color: "text-brand-700", bg: "bg-brand-50",  border: "border-brand-200" },
  member: { label: "Lid",       color: "text-slate-600", bg: "bg-slate-100", border: "border-slate-200" },
  viewer: { label: "Kijker",    color: "text-slate-500", bg: "bg-slate-50",  border: "border-slate-200" },
};
