"use client";
// ─── hooks/useLocale.ts ───────────────────────────────────────
// Client-side hook: leest locale uit cookie en biedt t() aan.
// Alle Client Components die vertalingen nodig hebben importeren dit.
// ─────────────────────────────────────────────────────────────

import { useMemo } from "react";
import { getTranslations, DEFAULT_LOCALE, LOCALE_COOKIE, type Locale } from "@/lib/i18n";

function getCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  return document.cookie
    .split("; ")
    .find(row => row.startsWith(`${name}=`))
    ?.split("=")[1];
}

export function useLocale() {
  const locale = useMemo((): Locale => {
    const val = getCookie(LOCALE_COOKIE);
    if (val && ["en", "nl", "de", "fr"].includes(val)) return val as Locale;
    return DEFAULT_LOCALE;
  }, []);

  return getTranslations(locale);
}
