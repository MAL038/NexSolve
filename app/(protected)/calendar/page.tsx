// app/(protected)/calendar/page.tsx
import { createClient } from "@/lib/supabaseServer";
import { getCurrentProfile } from "@/lib/auth";
import CalendarClient from "./CalendarClient";
import type { CalendarScope } from "./CalendarClient";

export const metadata = { title: "Kalender" };

interface Props {
  searchParams: Promise<{ scope?: string }>;
}

export default async function CalendarPage({ searchParams }: Props) {
  const { scope: rawScope } = await searchParams;

  const validScopes: CalendarScope[] = ["mine", "team", "org"];
  const scope: CalendarScope = validScopes.includes(rawScope as CalendarScope)
    ? (rawScope as CalendarScope)
    : "mine";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const profile = await getCurrentProfile();

  return (
    <CalendarClient
      initialScope={scope}
      currentUserId={user?.id ?? ""}
      userRole={profile?.role ?? "member"}
    />
  );
}
