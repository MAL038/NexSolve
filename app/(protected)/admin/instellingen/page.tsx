import { requireSuperuser } from "@/lib/auth";
import { createClient } from "@/lib/supabaseServer";
import InstellingenClient from "./InstellingenClient";
import type { PlatformSettings } from "@/types";

export const metadata = { title: "Instellingen — Admin" };

export default async function AdminInstellingenPage() {
  await requireSuperuser();
  const supabase = await createClient();
  const { data } = await supabase.from("platform_settings").select("*").limit(1).single();
  return <InstellingenClient initialSettings={data as PlatformSettings} />;
}
