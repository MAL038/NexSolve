import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabaseServer";
import { getUserContext } from "@/lib/getUserContext";
import { moduleDefault } from "@/lib/moduleDefinitions";

const DEFAULTS: Record<string, boolean> = {
  dashboard: true,
  projects: true,
  customers: true,
  team: true,
  time: true,
  calendar: true,
  export: true,
};

export async function requireModuleEnabled(moduleKey: string, redirectTo = "/dashboard") {
  const ctx = await getUserContext();

  if (!ctx?.user) {
    redirect("/auth/login");
  }

  if (!ctx.activeOrgId) {
    redirect(redirectTo);
  }

  const supabase = await createClient();

  const { data } = await supabase
    .from("organisation_modules")
    .select("is_enabled")
    .eq("org_id", ctx.activeOrgId)
    .eq("module", moduleKey)
    .maybeSingle();

  const enabled = data?.is_enabled ?? moduleDefault(moduleKey as ModuleKey);

  if (!enabled) {
    redirect(redirectTo);
  }

  return true;
}