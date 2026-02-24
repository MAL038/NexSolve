-- ═══════════════════════════════════════════════════════════════
-- NEXSOLVE – Migration 002: Customers + Project Members
-- Idempotent: safe to re-run.
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. CUSTOMERS ────────────────────────────────────────────
create table if not exists public.customers (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- updated_at trigger for customers
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists customers_updated_at on public.customers;
create trigger customers_updated_at
  before update on public.customers
  for each row execute procedure public.set_updated_at();

-- RLS: customers
alter table public.customers enable row level security;

drop policy if exists "Customers: owner select"  on public.customers;
drop policy if exists "Customers: owner insert"  on public.customers;
drop policy if exists "Customers: owner update"  on public.customers;
drop policy if exists "Customers: owner delete"  on public.customers;

create policy "Customers: owner select"
  on public.customers for select
  using (owner_id = auth.uid());

create policy "Customers: owner insert"
  on public.customers for insert
  with check (owner_id = auth.uid());

create policy "Customers: owner update"
  on public.customers for update
  using (owner_id = auth.uid());

create policy "Customers: owner delete"
  on public.customers for delete
  using (owner_id = auth.uid());

-- ─── 2. ADD customer_id TO PROJECTS ─────────────────────────
-- Nullable: existing rows stay intact (migratiepad)
alter table public.projects
  add column if not exists customer_id uuid
  references public.customers(id) on delete set null;

-- ─── 3. PROJECT MEMBERS ──────────────────────────────────────
create table if not exists public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  role       text not null default 'member'
             check (role in ('member', 'admin')),
  added_at   timestamptz not null default now(),
  primary key (project_id, user_id)
);

-- RLS: project_members
alter table public.project_members enable row level security;

drop policy if exists "PM: owner or self select" on public.project_members;
drop policy if exists "PM: owner insert"         on public.project_members;
drop policy if exists "PM: owner delete"         on public.project_members;
drop policy if exists "PM: owner update role"    on public.project_members;

-- SELECT: project owner OR the member themselves
create policy "PM: owner or self select"
  on public.project_members for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.projects p
      where p.id = project_id
        and p.owner_id = auth.uid()
    )
  );

-- INSERT: only the project owner may add members
create policy "PM: owner insert"
  on public.project_members for insert
  with check (
    exists (
      select 1 from public.projects p
      where p.id = project_id
        and p.owner_id = auth.uid()
    )
  );

-- DELETE: only the project owner may remove members
create policy "PM: owner delete"
  on public.project_members for delete
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_id
        and p.owner_id = auth.uid()
    )
  );

-- UPDATE (role change): only project owner
create policy "PM: owner update role"
  on public.project_members for update
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_id
        and p.owner_id = auth.uid()
    )
  );

-- ─── 4. UPDATE PROJECTS RLS ──────────────────────────────────
-- Drop old policies and rewrite with member access

drop policy if exists "Projects: owner can read own"  on public.projects;
drop policy if exists "Projects: owner can insert"    on public.projects;
drop policy if exists "Projects: owner can update"    on public.projects;
drop policy if exists "Projects: owner can delete"    on public.projects;

-- SELECT: owner OR member via project_members
create policy "Projects: owner or member select"
  on public.projects for select
  using (
    owner_id = auth.uid()
    or exists (
      select 1 from public.project_members pm
      where pm.project_id = id
        and pm.user_id = auth.uid()
    )
  );

-- INSERT: authenticated user; owner_id must match auth.uid()
create policy "Projects: owner insert"
  on public.projects for insert
  with check (owner_id = auth.uid());

-- UPDATE: only owner (for now)
create policy "Projects: owner update"
  on public.projects for update
  using (owner_id = auth.uid());

-- DELETE: only owner
create policy "Projects: owner delete"
  on public.projects for delete
  using (owner_id = auth.uid());

-- ─── 5. INDEXES ──────────────────────────────────────────────
create index if not exists projects_customer_id_idx     on public.projects(customer_id);
create index if not exists customers_owner_id_idx       on public.customers(owner_id);
create index if not exists project_members_user_id_idx  on public.project_members(user_id);
create index if not exists project_members_project_idx  on public.project_members(project_id);
