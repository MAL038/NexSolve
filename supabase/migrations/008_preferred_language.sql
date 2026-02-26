-- ═══════════════════════════════════════════════════════════════
-- NEXSOLVE – Migration 008: Taalvoorkeur per gebruiker
-- ═══════════════════════════════════════════════════════════════

alter table public.profiles
  add column if not exists preferred_language text not null default 'en'
  check (preferred_language in ('en', 'nl', 'de', 'fr'));
