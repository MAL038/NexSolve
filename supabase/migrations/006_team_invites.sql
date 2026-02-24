-- ═══════════════════════════════════════════════════════════════
-- NEXSOLVE – Migration 006: Team Invites
-- Allows owners to invite users who haven't registered yet.
-- ═══════════════════════════════════════════════════════════════

create table if not exists public.team_invites (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  invited_by  uuid not null references auth.users(id) on delete cascade,
  role        text not null default 'member' check (role in ('member', 'admin')),
  token       text not null unique default encode(gen_random_bytes(32), 'hex'),
  accepted_at timestamptz,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '7 days'
);

-- RLS
alter table public.team_invites enable row level security;

drop policy if exists "Invites: owner can read/create" on public.team_invites;
drop policy if exists "Invites: token lookup (anon)"   on public.team_invites;

-- Authenticated users can see/create invites
create policy "Invites: authenticated manage"
  on public.team_invites for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Index for fast token lookups (used during accept flow)
create index if not exists team_invites_token_idx on public.team_invites(token);
create index if not exists team_invites_email_idx on public.team_invites(email);
