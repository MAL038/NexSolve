// lib/modules.ts
// Client-side helper — importeer ModuleKey altijd vanuit moduleDefinitions
export type { ModuleKey } from "@/lib/moduleDefinitions";
import { moduleDefault } from "@/lib/moduleDefinitions";
import type { ModuleKey } from "@/lib/moduleDefinitions";

export function isModuleEnabled(
  enabled: Record<string, boolean> | null | undefined,
  key: ModuleKey
): boolean {
  return enabled?.[key] ?? moduleDefault(key);
}