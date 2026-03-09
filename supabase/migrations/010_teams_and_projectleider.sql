-- ─────────────────────────────────────────────────────────────────────────────
-- 010_teams_and_projectleider.sql
--
-- 1. Teams & team_members tabellen (idempotent — IF NOT EXISTS)
-- 2. can_manage_teams() SECURITY DEFINER functie
--    (lost het "function does not exist" crash op bij team aanmaken)
-- 3. Projectleider rol toevoegen aan profiles.role CHECK-constraint
-- 4. RLS voor teams en team_members
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Teams tabel ──────────────────────────────────────────────────────────

create table if not exists public.teams (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organisations(id) on delete cascade,
  name        text not null,
  description text,
  leader_id   uuid references public.profiles(id) on delete set null,
  created_by  uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Zorg dat bestaande tabellen ook org_id hebben (idempotent)
alter table public.teams
  add column if not exists org_id uuid references public.organisations(id) on delete cascade;

create table if not exists public.team_members (
  team_id  uuid not null references public.teams(id) on delete cascade,
  user_id  uuid not null references public.profiles(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (team_id, user_id)
);

-- Indexes
create index if not exists teams_org_id_idx         on public.teams(org_id);
create index if not exists teams_leader_id_idx      on public.teams(leader_id);
create index if not exists teams_created_by_idx     on public.teams(created_by);
create index if not exists team_members_user_id_idx on public.team_members(user_id);

-- ── 2. can_manage_teams() ───────────────────────────────────────────────────
-- SECURITY DEFINER zodat de functie buiten RLS opereert (geen recursie).
-- Admins, superusers én projectleiders mogen teams beheren.

create or replace function public.can_manage_teams()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role in ('admin', 'superuser', 'projectleider')
       from public.profiles
      where id = auth.uid()
      limit 1),
    false
  );
$$;

-- ── 3. Projectleider toevoegen aan profiles.role ────────────────────────────

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('admin', 'member', 'viewer', 'superuser', 'projectleider'));

-- ── 4. RLS – Teams ──────────────────────────────────────────────────────────

alter table public.teams enable row level security;

drop policy if exists "Teams: authenticated lezen"  on public.teams;
drop policy if exists "Teams: beheer insert"        on public.teams;
drop policy if exists "Teams: beheer update"        on public.teams;
drop policy if exists "Teams: beheer delete"        on public.teams;

-- Iedereen die ingelogd is mag teams lezen
create policy "Teams: authenticated lezen"
  on public.teams for select
  using (auth.role() = 'authenticated');

-- Alleen beheerders mogen teams aanmaken
create policy "Teams: beheer insert"
  on public.teams for insert
  with check (public.can_manage_teams());

-- Beheerders én de teamleider / aanmaker mogen updaten
create policy "Teams: beheer update"
  on public.teams for update
  using (
    public.can_manage_teams()
    or leader_id  = auth.uid()
    or created_by = auth.uid()
  );

-- Beheerders én de aanmaker mogen verwijderen
create policy "Teams: beheer delete"
  on public.teams for delete
  using (
    public.can_manage_teams()
    or created_by = auth.uid()
  );

-- ── 5. RLS – Team_members ────────────────────────────────────────────────────

alter table public.team_members enable row level security;

drop policy if exists "TeamMembers: authenticated lezen" on public.team_members;
drop policy if exists "TeamMembers: beheer"              on public.team_members;
drop policy if exists "TeamMembers: beheer insert"       on public.team_members;
drop policy if exists "TeamMembers: beheer delete"       on public.team_members;

-- Iedereen die ingelogd is mag ledenlijsten lezen
create policy "TeamMembers: authenticated lezen"
  on public.team_members for select
  using (auth.role() = 'authenticated');

-- Beheerders mogen leden toevoegen / verwijderen
create policy "TeamMembers: beheer insert"
  on public.team_members for insert
  with check (public.can_manage_teams());

create policy "TeamMembers: beheer delete"
  on public.team_members for delete
  using (public.can_manage_teams());
