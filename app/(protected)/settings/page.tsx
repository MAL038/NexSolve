// app/(protected)/settings/page.tsx
import { getCurrentProfile } from "@/lib/auth";
import { redirect } from "next/navigation";
import SettingsClient from "./SettingsClient";
import { getLocaleFromCookie } from "@/lib/i18n";
import { cookies } from "next/headers";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const cookieStore = await cookies();
  const locale = getLocaleFromCookie(
    cookieStore.getAll().map(c => `${c.name}=${c.value}`).join("; ")
  );

  const profile = await getCurrentProfile();
  if (!profile) redirect("/auth/login");

  return <SettingsClient profile={profile} locale={locale} />;
}
