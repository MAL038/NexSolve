import { createClient } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import type { Profile } from "@/types";

export async function getSession() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function requireAuth() {
  const session = await getSession();
  if (!session) redirect("/auth/login");
  return session;
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  // Gebruikt de RLS-policy "eigen rij" — geen recursie
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  return data as Profile | null;
}

export async function requireSuperuser(): Promise<Profile> {
  const session = await getSession();
  if (!session) redirect("/auth/login");

  const supabase = await createClient();

  // Gebruik de SECURITY DEFINER RPC — leest rol buiten RLS om, geen recursie
  const { data: isSu } = await supabase.rpc("is_superuser");
  if (!isSu) redirect("/dashboard");

  // Haal nu het volledige profiel op via de veilige "eigen rij"-policy
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", session.user.id)
    .single();

  if (!profile) redirect("/dashboard");
  return profile as Profile;
}
