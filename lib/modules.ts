// lib/modules.ts
export type ModuleKey =
  | "dashboard"
  | "projects"
  | "customers"
  | "team"
  | "time"
  | "calendar"
  | "export"
  | "rapportages"
  | "templates";

export function isModuleEnabled(
  enabled: Record<string, boolean> | null | undefined,
  key: ModuleKey
) {
  // default: aan
  return enabled?.[key] ?? true;
}
