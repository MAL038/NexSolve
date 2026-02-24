-- ═══════════════════════════════════════════════════════════════
-- NEXSOLVE – Migration 007: Admin Panel
-- FIX: gebruik SECURITY DEFINER functie om recursie te voorkomen
-- ═══════════════════════════════════════════════════════════════

-- ─── Stap 1: kolommen & constraints ──────────────────────────
alter table public.profiles
  add column if not exists is_active boolean not null default true;

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('admin', 'member', 'viewer', 'superuser'));

-- ─── Stap 2: SECURITY DEFINER helper ─────────────────────────
-- Deze functie leest de rol BUITEN RLS om (via auth.uid() rechtstreeks).
-- Zo vermijden we oneindige recursie in alle policies die superuser checken.
create or replace function public.get_my_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid() limit 1;
$$;

-- Handige boolean wrapper
create or replace function public.is_superuser()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role = 'superuser' from public.profiles where id = auth.uid() limit 1),
    false
  );
$$;

-- ─── Stap 3: Profiles RLS – geen recursie meer ───────────────
-- Verwijder ALLE bestaande policies op profiles zodat we schoon beginnen
do $$
declare
  pol record;
begin
  for pol in
    select policyname from pg_policies where tablename = 'profiles' and schemaname = 'public'
  loop
    execute format('drop policy if exists %I on public.profiles', pol.policyname);
  end loop;
end$$;

alter table public.profiles enable row level security;

-- Eigen profiel altijd leesbaar/bewerkbaar
create policy "Profiles: eigen rij"
  on public.profiles for all
  using  (auth.uid() = id)
  with check (auth.uid() = id);

-- Superuser mag alle profielen zien en bewerken
-- Gebruikt is_superuser() — geen subquery op profiles → geen recursie
create policy "Profiles: superuser alles"
  on public.profiles for all
  using  (public.is_superuser())
  with check (public.is_superuser());

-- Gewone gebruikers mogen andere profielen lezen (voor member-search etc.)
create policy "Profiles: authenticated lezen"
  on public.profiles for select
  using (auth.role() = 'authenticated');

-- ─── Stap 4: Platform-instellingen ───────────────────────────
create table if not exists public.platform_settings (
  id             uuid primary key default gen_random_uuid(),
  company_name   text not null default 'NEXSOLVE',
  logo_url       text,
  primary_color  text not null default '#0A6645',
  accent_color   text not null default '#69B296',
  updated_at     timestamptz not null default now(),
  updated_by     uuid references auth.users(id) on delete set null
);

insert into public.platform_settings (company_name, primary_color, accent_color)
values ('NEXSOLVE', '#0A6645', '#69B296')
on conflict do nothing;

alter table public.platform_settings enable row level security;

drop policy if exists "Settings: lezen"      on public.platform_settings;
drop policy if exists "Settings: bewerken"   on public.platform_settings;
drop policy if exists "Settings: anyone can read"    on public.platform_settings;
drop policy if exists "Settings: superuser can edit" on public.platform_settings;

create policy "Settings: lezen"
  on public.platform_settings for select
  using (true);

create policy "Settings: bewerken"
  on public.platform_settings for update
  using (public.is_superuser());

-- ─── Stap 5: Aangepaste project-rollen ───────────────────────
create table if not exists public.custom_roles (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  color       text not null default '#6B7280',
  position    integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

insert into public.custom_roles (name, slug, color, position) values
  ('Projectleider',   'projectleider',  '#0A6645', 0),
  ('Teamlid',         'teamlid',        '#3B82F6', 1),
  ('Consultant',      'consultant',     '#8B5CF6', 2),
  ('Kwaliteitscheck', 'kwaliteitscheck','#F59E0B', 3),
  ('Viewer',          'viewer',         '#6B7280', 4)
on conflict (slug) do nothing;

alter table public.custom_roles enable row level security;

drop policy if exists "CustomRoles: lezen"        on public.custom_roles;
drop policy if exists "CustomRoles: beheren"       on public.custom_roles;
drop policy if exists "CustomRoles: anyone can read active" on public.custom_roles;
drop policy if exists "CustomRoles: superuser can manage"   on public.custom_roles;

create policy "CustomRoles: lezen"
  on public.custom_roles for select
  using (is_active = true or public.is_superuser());

create policy "CustomRoles: beheren"
  on public.custom_roles for all
  using  (public.is_superuser())
  with check (public.is_superuser());

-- ─── Stap 6: Projecten – superuser-toegang ───────────────────
-- Verwijder de oude conflicterende policy als die bestaat
drop policy if exists "Projects: superuser full access" on public.projects;

create policy "Projects: superuser full access"
  on public.projects for all
  using (
    owner_id = auth.uid()
    or exists (select 1 from public.project_members where project_id = id and user_id = auth.uid())
    or public.is_superuser()
  )
  with check (
    owner_id = auth.uid()
    or public.is_superuser()
  );

-- ─── Stap 7: Thema's & processen – superuser-beheer ──────────
drop policy if exists "Themes: superuser can manage"    on public.themes;
drop policy if exists "Processes: superuser can manage" on public.processes;

create policy "Themes: superuser can manage"
  on public.themes for all
  using  (public.is_superuser())
  with check (public.is_superuser());

create policy "Processes: superuser can manage"
  on public.processes for all
  using  (public.is_superuser())
  with check (public.is_superuser());

-- ─── Stap 8: Indexen ─────────────────────────────────────────
create index if not exists profiles_role_idx      on public.profiles(role);
create index if not exists profiles_is_active_idx on public.profiles(is_active);
