-- ═══════════════════════════════════════════════════════════════
-- NEXSOLVE – Migration 003: Subprocesses
-- Idempotent: safe to re-run.
-- ═══════════════════════════════════════════════════════════════

-- ─── Table ───────────────────────────────────────────────────
create table if not exists public.subprocesses (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  title       text not null,
  description text,
  status      text not null default 'todo'
              check (status in ('todo', 'in-progress', 'done', 'blocked')),
  position    integer not null default 0,  -- for manual ordering
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- updated_at trigger
drop trigger if exists subprocesses_updated_at on public.subprocesses;
create trigger subprocesses_updated_at
  before update on public.subprocesses
  for each row execute procedure public.set_updated_at();

-- ─── RLS ─────────────────────────────────────────────────────
alter table public.subprocesses enable row level security;

drop policy if exists "SP: project owner or member select" on public.subprocesses;
drop policy if exists "SP: project owner or member insert" on public.subprocesses;
drop policy if exists "SP: project owner or member update" on public.subprocesses;
drop policy if exists "SP: project owner delete"           on public.subprocesses;

-- SELECT: same access as the parent project (owner or member)
create policy "SP: project owner or member select"
  on public.subprocesses for select
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_id
        and (
          p.owner_id = auth.uid()
          or public.is_project_owner(project_id)
          or exists (
            select 1 from public.project_members pm
            where pm.project_id = p.id and pm.user_id = auth.uid()
          )
        )
    )
  );

-- INSERT: owner or member can add subprocesses
create policy "SP: project owner or member insert"
  on public.subprocesses for insert
  with check (
    exists (
      select 1 from public.projects p
      where p.id = project_id
        and (
          p.owner_id = auth.uid()
          or exists (
            select 1 from public.project_members pm
            where pm.project_id = p.id and pm.user_id = auth.uid()
          )
        )
    )
  );

-- UPDATE: owner or member can update subprocesses
create policy "SP: project owner or member update"
  on public.subprocesses for update
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_id
        and (
          p.owner_id = auth.uid()
          or exists (
            select 1 from public.project_members pm
            where pm.project_id = p.id and pm.user_id = auth.uid()
          )
        )
    )
  );

-- DELETE: only project owner
create policy "SP: project owner delete"
  on public.subprocesses for delete
  using (
    public.is_project_owner(project_id)
  );

-- ─── Indexes ─────────────────────────────────────────────────
create index if not exists subprocesses_project_id_idx on public.subprocesses(project_id);
create index if not exists subprocesses_position_idx   on public.subprocesses(project_id, position);
