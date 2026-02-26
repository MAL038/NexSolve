// app/(protected)/profile/page.tsx
import { getCurrentProfile } from "@/lib/auth";
import { redirect } from "next/navigation";
import ProfileClient from "./ProfileClient";
import { getLocaleFromCookie } from "@/lib/i18n";
import { cookies } from "next/headers";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const cookieStore = await cookies();
  const locale = getLocaleFromCookie(
    cookieStore.getAll().map(c => `${c.name}=${c.value}`).join("; ")
  );

  const profile = await getCurrentProfile();
  if (!profile) redirect("/auth/login");

  return <ProfileClient initialProfile={profile} initialLocale={locale} />;
}
