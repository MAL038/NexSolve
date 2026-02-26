"use client";
// app/(protected)/settings/SettingsClient.tsx

import { useState } from "react";
import { Bell, Shield, User, ChevronRight } from "lucide-react";
import Link from "next/link";
import clsx from "clsx";
import { getTranslations, type Locale } from "@/lib/i18n";
import type { Profile } from "@/types";

interface Props {
  profile: Profile;
  locale:  Locale;
}

// Toggle component
function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={clsx(
        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2",
        checked ? "bg-brand-600" : "bg-slate-200",
      )}
    >
      <span
        className={clsx(
          "inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform",
          checked ? "translate-x-6" : "translate-x-1",
        )}
      />
    </button>
  );
}

export default function SettingsClient({ profile, locale }: Props) {
  const { t } = getTranslations(locale);

  // Notification prefs (lokale state; in productie zou je dit opslaan in profiles/user_prefs)
  const [emailNotif,   setEmailNotif]   = useState(true);
  const [browserNotif, setBrowserNotif] = useState(false);

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t("settings.title")}</h1>
        <p className="text-sm text-slate-500 mt-1">{t("settings.subtitle")}</p>
      </div>

      {/* ── Snelle link naar profiel ──────────────────────────── */}
      <Link
        href="/profile"
        className="flex items-center gap-4 bg-white rounded-2xl border border-slate-200 p-5 hover:border-brand-300 hover:bg-brand-50/30 transition-all group"
      >
        <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0">
          <User size={18} className="text-brand-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800">{profile.full_name}</p>
          <p className="text-xs text-slate-400 truncate">{profile.email}</p>
        </div>
        <div className="flex items-center gap-1 text-xs text-brand-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
          {t("nav.dashboard").replace("Dashboard", "Profiel")}
          <ChevronRight size={14} />
        </div>
      </Link>

      {/* ── Notificaties ─────────────────────────────────────── */}
      <section className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
          <Bell size={16} className="text-brand-600" />
          {t("settings.notifications")}
        </h2>

        <div className="space-y-4 divide-y divide-slate-100">
          <div className="flex items-center justify-between py-1">
            <div>
              <p className="text-sm font-medium text-slate-800">{t("settings.notifEmail")}</p>
              <p className="text-xs text-slate-400 mt-0.5">{t("settings.notifEmailDesc")}</p>
            </div>
            <Toggle checked={emailNotif} onChange={setEmailNotif} />
          </div>

          <div className="flex items-center justify-between pt-4">
            <div>
              <p className="text-sm font-medium text-slate-800">{t("settings.notifBrowser")}</p>
              <p className="text-xs text-slate-400 mt-0.5">{t("settings.notifBrowserDesc")}</p>
            </div>
            <Toggle checked={browserNotif} onChange={setBrowserNotif} />
          </div>
        </div>
      </section>

      {/* ── Beveiliging ──────────────────────────────────────── */}
      <section className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
          <Shield size={16} className="text-brand-600" />
          {t("settings.account")}
        </h2>

        <Link
          href="/profile#security"
          className="flex items-center justify-between py-2 text-sm text-slate-700 hover:text-brand-600 transition-colors"
        >
          <span>Change password</span>
          <ChevronRight size={15} className="text-slate-400" />
        </Link>
      </section>

      {/* ── Gevarenzone ──────────────────────────────────────── */}
      <section className="bg-white rounded-2xl border border-red-100 p-6">
        <h2 className="text-sm font-semibold text-red-600 mb-4">
          {t("settings.dangerZone")}
        </h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-800">{t("settings.deleteAccount")}</p>
            <p className="text-xs text-slate-400 mt-0.5">{t("settings.deleteAccountDesc")}</p>
          </div>
          <button
            type="button"
            className="px-4 py-2 rounded-xl border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors"
            onClick={() => alert("Contact an admin to delete your account.")}
          >
            {t("settings.deleteAccount")}
          </button>
        </div>
      </section>

    </div>
  );
}
