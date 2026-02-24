-- ═══════════════════════════════════════════════════════════════
-- NEXSOLVE – Migration 007: Superuser rol & platform-instellingen
-- ═══════════════════════════════════════════════════════════════

-- 1. Voeg 'superuser' toe aan het rol-enum in profiles
--    (als de kolom type text is hoef je het enum niet te wijzigen)
--    We passen simpelweg de CHECK-constraint aan als die bestaat.
--    Standaard is de rol-kolom TEXT — niets te doen.

-- 2. Platform-instellingen tabel (singleton: altijd 1 rij)
create table if not exists public.platform_settings (
  id            uuid primary key default gen_random_uuid(),
  company_name  text not null default 'NEXSOLVE',
  logo_url      text,
  primary_color text not null default '#0A6645',
  accent_color  text not null default '#69B296',
  updated_at    timestamptz not null default now(),
  updated_by    uuid references auth.users(id) on delete set null
);

-- Zorg dat er altijd precies één rij bestaat
insert into public.platform_settings (id)
values ('00000000-0000-0000-0000-000000000001')
on conflict (id) do nothing;

-- RLS
alter table public.platform_settings enable row level security;

drop policy if exists "Settings: iedereen kan lezen"       on public.platform_settings;
drop policy if exists "Settings: alleen superuser schrijft" on public.platform_settings;

create policy "Settings: iedereen kan lezen"
  on public.platform_settings for select
  using (true);

create policy "Settings: alleen superuser schrijft"
  on public.platform_settings for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'superuser'
    )
  );

-- 3. Helper-functie: is de huidige gebruiker superuser?
create or replace function public.is_superuser()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'superuser'
  );
$$;

-- 4. Superuser mag ALLE projecten lezen/schrijven (bypass owner-only policy)
--    Voeg een extra SELECT policy toe voor projecten
drop policy if exists "Projects: superuser ziet alles" on public.projects;
create policy "Projects: superuser ziet alles"
  on public.projects for all
  using (public.is_superuser());

-- 5. Superuser mag alle profiles lezen/schrijven
drop policy if exists "Profiles: superuser beheert alles" on public.profiles;
create policy "Profiles: superuser beheert alles"
  on public.profiles for all
  using (public.is_superuser());

-- 6. Superuser mag themas/processes/process_types volledig beheren
drop policy if exists "Themes: superuser schrijft" on public.themes;
create policy "Themes: superuser schrijft"
  on public.themes for all
  using (public.is_superuser());

drop policy if exists "Processes: superuser schrijft" on public.processes;
create policy "Processes: superuser schrijft"
  on public.processes for all
  using (public.is_superuser());

-- ── Maak de eerste superuser aan ────────────────────────────────
-- Vervang het e-mailadres hieronder met jouw eigen e-mail,
-- of run dit los na de migratie via de Supabase SQL-editor:
--
--   UPDATE profiles SET role = 'superuser' WHERE email = 'jouw@email.nl';
--
