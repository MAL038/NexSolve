"use client";
// app/(protected)/profile/ProfileClient.tsx

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { User, Mail, Camera, Globe, Lock, Eye, EyeOff, Trash2, Upload } from "lucide-react";
import clsx from "clsx";
import Avatar from "@/components/ui/Avatar";
import { getTranslations, SUPPORTED_LOCALES, LOCALE_COOKIE, type Locale } from "@/lib/i18n";
import type { Profile } from "@/types";

interface Props {
  initialProfile: Profile;
  initialLocale:  Locale;
}

export default function ProfileClient({ initialProfile, initialLocale }: Props) {
  const router = useRouter();

  // ── State ────────────────────────────────────────────────────
  const [profile,   setProfile]   = useState(initialProfile);
  const [locale,    setLocale]    = useState<Locale>(initialLocale);
  const { t } = getTranslations(locale);

  // Persoonlijke info
  const [fullName,  setFullName]  = useState(profile.full_name);
  const [infoSaving, setInfoSaving] = useState(false);
  const [infoMsg,   setInfoMsg]   = useState<{ text: string; ok: boolean } | null>(null);

  // Avatar
  const fileRef = useRef<HTMLInputElement>(null);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarMsg, setAvatarMsg] = useState<string | null>(null);

  // Taal
  const [langSaving, setLangSaving] = useState(false);
  const [langMsg,    setLangMsg]    = useState<string | null>(null);

  // Wachtwoord
  const [pwOpen,    setPwOpen]    = useState(false);
  const [newPw,     setNewPw]     = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showNew,   setShowNew]   = useState(false);
  const [showConf,  setShowConf]  = useState(false);
  const [pwSaving,  setPwSaving]  = useState(false);
  const [pwMsg,     setPwMsg]     = useState<{ text: string; ok: boolean } | null>(null);

  // ── Helpers ──────────────────────────────────────────────────
  function toast(
    setter: (v: { text: string; ok: boolean } | null) => void,
    text: string,
    ok: boolean,
    ms = 3500,
  ) {
    setter({ text, ok });
    setTimeout(() => setter(null), ms);
  }

  function toastSimple(
    setter: (v: string | null) => void,
    text: string,
    ms = 3500,
  ) {
    setter(text);
    setTimeout(() => setter(null), ms);
  }

  // ── Persoonlijke info opslaan ────────────────────────────────
  async function saveInfo(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) return;
    setInfoSaving(true);
    const res  = await fetch("/api/profile", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ full_name: fullName.trim() }),
    });
    const data = await res.json();
    setInfoSaving(false);
    if (!res.ok) {
      toast(setInfoMsg, data.error ?? t("common.error"), false);
    } else {
      setProfile(prev => ({ ...prev, full_name: data.full_name }));
      toast(setInfoMsg, t("profile.profileSaved"), true);
      router.refresh(); // Sidebar naam bijwerken
    }
  }

  // ── Avatar upload ────────────────────────────────────────────
  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarLoading(true);
    const form = new FormData();
    form.append("file", file);
    const res  = await fetch("/api/profile/avatar", { method: "POST", body: form });
    const data = await res.json();
    setAvatarLoading(false);
    if (!res.ok) {
      toastSimple(setAvatarMsg, data.error ?? t("common.error"));
    } else {
      setProfile(prev => ({ ...prev, avatar_url: data.avatar_url }));
      toastSimple(setAvatarMsg, t("common.success"));
      router.refresh();
    }
  }

  async function removeAvatar() {
    setAvatarLoading(true);
    const res = await fetch("/api/profile/avatar", { method: "DELETE" });
    setAvatarLoading(false);
    if (res.ok) {
      setProfile(prev => ({ ...prev, avatar_url: null }));
      toastSimple(setAvatarMsg, t("common.success"));
      router.refresh();
    }
  }

  // ── Taal opslaan ─────────────────────────────────────────────
  async function saveLanguage(lang: Locale) {
    setLocale(lang);           // optimistische UI-update (taal wisselt direct)
    setLangSaving(true);
    const res  = await fetch("/api/profile", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ preferred_language: lang }),
    });
    setLangSaving(false);
    if (!res.ok) {
      const data = await res.json();
      toastSimple(setLangMsg, data.error ?? t("common.error"));
    } else {
      // Cookie is al gezet door de API route — pagina refreshen zodat
      // server components ook de nieuwe taal oppakken.
      router.refresh();
      toastSimple(setLangMsg, getTranslations(lang).t("profile.profileSaved"));
    }
  }

  // ── Wachtwoord wijzigen ──────────────────────────────────────
  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPw !== confirmPw) {
      toast(setPwMsg, t("profile.passwordMismatch"), false);
      return;
    }
    if (newPw.length < 8) {
      toast(setPwMsg, t("profile.passwordTooShort"), false);
      return;
    }
    setPwSaving(true);
    const res  = await fetch("/api/profile/password", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ password: newPw }),
    });
    const data = await res.json();
    setPwSaving(false);
    if (!res.ok) {
      toast(setPwMsg, data.error ?? t("common.error"), false);
    } else {
      toast(setPwMsg, t("profile.passwordChanged"), true);
      setNewPw(""); setConfirmPw(""); setPwOpen(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t("profile.title")}</h1>
        <p className="text-sm text-slate-500 mt-1">{t("profile.subtitle")}</p>
      </div>

      {/* ── Profielfoto ───────────────────────────────────────── */}
      <section className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
          <Camera size={16} className="text-brand-600" />
          {t("profile.avatar")}
        </h2>

        <div className="flex items-center gap-5">
          <div className="relative">
            <Avatar name={profile.full_name} url={profile.avatar_url} size="lg" />
            {avatarLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/70 rounded-full">
                <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleAvatarChange}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={avatarLoading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
            >
              <Upload size={14} />
              {t("profile.avatarUpload")}
            </button>
            {profile.avatar_url && (
              <button
                type="button"
                onClick={removeAvatar}
                disabled={avatarLoading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm hover:bg-slate-50 disabled:opacity-50 transition-colors"
              >
                <Trash2 size={14} />
                {t("profile.avatarRemove")}
              </button>
            )}
            <p className="text-xs text-slate-400">{t("profile.avatarHint")}</p>
            {avatarMsg && <p className="text-xs text-brand-600">{avatarMsg}</p>}
          </div>
        </div>
      </section>

      {/* ── Persoonlijke informatie ───────────────────────────── */}
      <section className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
          <User size={16} className="text-brand-600" />
          {t("profile.personalInfo")}
        </h2>

        <form onSubmit={saveInfo} className="space-y-4">
          {/* Naam */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              {t("profile.fullName")}
            </label>
            <input
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
            />
          </div>

          {/* E-mail (readonly) */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5 flex items-center gap-1.5">
              <Mail size={12} />
              {t("profile.email")}
            </label>
            <input
              type="email"
              value={profile.email}
              disabled
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-400 bg-slate-50 cursor-not-allowed"
            />
            <p className="text-xs text-slate-400 mt-1">{t("profile.emailNote")}</p>
          </div>

          <div className="flex items-center justify-between pt-1">
            {infoMsg ? (
              <p className={clsx("text-xs font-medium", infoMsg.ok ? "text-brand-600" : "text-red-500")}>
                {infoMsg.text}
              </p>
            ) : <span />}
            <button
              type="submit"
              disabled={infoSaving || !fullName.trim()}
              className="px-5 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
            >
              {infoSaving ? t("common.saving") : t("common.save")}
            </button>
          </div>
        </form>
      </section>

      {/* ── Taalvoorkeur ─────────────────────────────────────── */}
      <section className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-1 flex items-center gap-2">
          <Globe size={16} className="text-brand-600" />
          {t("profile.language")}
        </h2>
        <p className="text-xs text-slate-400 mb-4">{t("profile.languageHint")}</p>

        <div className="grid grid-cols-2 gap-3">
          {SUPPORTED_LOCALES.map(loc => (
            <button
              key={loc.value}
              type="button"
              onClick={() => saveLanguage(loc.value)}
              disabled={langSaving}
              className={clsx(
                "flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium transition-all",
                locale === loc.value
                  ? "border-brand-500 bg-brand-50 text-brand-700 ring-2 ring-brand-200"
                  : "border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50",
              )}
            >
              <span className="text-lg">{loc.flag}</span>
              <span>{loc.label}</span>
              {locale === loc.value && (
                <span className="ml-auto w-2 h-2 rounded-full bg-brand-500" />
              )}
            </button>
          ))}
        </div>

        {langMsg && (
          <p className="text-xs text-brand-600 mt-3">{langMsg}</p>
        )}
      </section>

      {/* ── Wachtwoord wijzigen ───────────────────────────────── */}
      <section className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <Lock size={16} className="text-brand-600" />
            {t("profile.security")}
          </h2>
          <button
            type="button"
            onClick={() => { setPwOpen(o => !o); setPwMsg(null); }}
            className="text-xs text-brand-600 hover:text-brand-700 font-medium"
          >
            {pwOpen ? t("common.cancel") : t("profile.changePassword")}
          </button>
        </div>

        {!pwOpen ? (
          <p className="text-sm text-slate-400">••••••••••••</p>
        ) : (
          <form onSubmit={savePassword} className="space-y-4">
            {/* Nieuw wachtwoord */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                {t("profile.newPassword")}
              </label>
              <div className="relative">
                <input
                  type={showNew ? "text" : "password"}
                  value={newPw}
                  onChange={e => setNewPw(e.target.value)}
                  required
                  minLength={8}
                  className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Bevestig wachtwoord */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                {t("profile.confirmPassword")}
              </label>
              <div className="relative">
                <input
                  type={showConf ? "text" : "password"}
                  value={confirmPw}
                  onChange={e => setConfirmPw(e.target.value)}
                  required
                  className={clsx(
                    "w-full px-3.5 py-2.5 pr-10 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition",
                    confirmPw && newPw !== confirmPw ? "border-red-300" : "border-slate-200",
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowConf(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showConf ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {confirmPw && newPw !== confirmPw && (
                <p className="text-xs text-red-500 mt-1">{t("profile.passwordMismatch")}</p>
              )}
            </div>

            <div className="flex items-center justify-between pt-1">
              {pwMsg ? (
                <p className={clsx("text-xs font-medium", pwMsg.ok ? "text-brand-600" : "text-red-500")}>
                  {pwMsg.text}
                </p>
              ) : <span />}
              <button
                type="submit"
                disabled={pwSaving || !newPw || !confirmPw}
                className="px-5 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
              >
                {pwSaving ? t("common.saving") : t("profile.changePassword")}
              </button>
            </div>
          </form>
        )}
      </section>

    </div>
  );
}
