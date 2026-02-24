-- ═══════════════════════════════════════════════════════════════
-- NEXSOLVE – Migration 004: Theme Hierarchy
-- Three-level: theme → process → process_type
-- Idempotent: safe to re-run.
-- ═══════════════════════════════════════════════════════════════

-- ─── Level 1: Themes ─────────────────────────────────────────
create table if not exists public.themes (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  slug       text not null unique,           -- e.g. 'hrm-payroll', for stable references
  position   integer not null default 0,     -- display order
  created_at timestamptz not null default now()
);

-- ─── Level 2: Processes ──────────────────────────────────────
create table if not exists public.processes (
  id         uuid primary key default gen_random_uuid(),
  theme_id   uuid not null references public.themes(id) on delete cascade,
  name       text not null,
  slug       text not null,
  position   integer not null default 0,
  created_at timestamptz not null default now(),
  unique (theme_id, slug)
);

-- ─── Level 3: Process Types ──────────────────────────────────
create table if not exists public.process_types (
  id          uuid primary key default gen_random_uuid(),
  process_id  uuid not null references public.processes(id) on delete cascade,
  name        text not null,
  slug        text not null,
  position    integer not null default 0,
  created_at  timestamptz not null default now(),
  unique (process_id, slug)
);

-- ─── Link projects to hierarchy ──────────────────────────────
-- All three are nullable: a project can be at any depth.
alter table public.projects
  add column if not exists theme_id        uuid references public.themes(id)       on delete set null,
  add column if not exists process_id      uuid references public.processes(id)    on delete set null,
  add column if not exists process_type_id uuid references public.process_types(id) on delete set null;

-- ─── RLS ─────────────────────────────────────────────────────
-- Theme hierarchy is global/read-only reference data.
-- Anyone authenticated can read; only service role can modify
-- (manage via Supabase dashboard or admin tooling).

alter table public.themes       enable row level security;
alter table public.processes    enable row level security;
alter table public.process_types enable row level security;

drop policy if exists "Themes: authenticated read"        on public.themes;
drop policy if exists "Processes: authenticated read"     on public.processes;
drop policy if exists "ProcessTypes: authenticated read"  on public.process_types;

create policy "Themes: authenticated read"
  on public.themes for select
  using (auth.role() = 'authenticated');

create policy "Processes: authenticated read"
  on public.processes for select
  using (auth.role() = 'authenticated');

create policy "ProcessTypes: authenticated read"
  on public.process_types for select
  using (auth.role() = 'authenticated');

-- ─── Indexes ─────────────────────────────────────────────────
create index if not exists processes_theme_id_idx         on public.processes(theme_id);
create index if not exists process_types_process_id_idx   on public.process_types(process_id);
create index if not exists projects_theme_id_idx          on public.projects(theme_id);
create index if not exists projects_process_id_idx        on public.projects(process_id);
create index if not exists projects_process_type_id_idx   on public.projects(process_type_id);

-- ═══════════════════════════════════════════════════════════════
-- SEED DATA
-- ═══════════════════════════════════════════════════════════════

-- ─── Themes ──────────────────────────────────────────────────
insert into public.themes (name, slug, position) values
  ('HRM/Payroll',  'hrm-payroll',  0),
  ('ERP',          'erp',          1),
  ('Recruitment',  'recruitment',  2)
on conflict (slug) do nothing;

-- ─── Processes ───────────────────────────────────────────────
insert into public.processes (theme_id, name, slug, position)
select t.id, p.name, p.slug, p.position
from public.themes t
cross join (values
  ('hrm-payroll', 'Onboarding',           'onboarding',         0),
  ('hrm-payroll', 'Internal transfer',    'internal-transfer',  1),
  ('hrm-payroll', 'Offboarding',          'offboarding',        2)
) as p(theme_slug, name, slug, position)
where t.slug = p.theme_slug
on conflict (theme_id, slug) do nothing;

insert into public.processes (theme_id, name, slug, position)
select t.id, p.name, p.slug, p.position
from public.themes t
cross join (values
  ('erp', 'Procurement',        'procurement',        0),
  ('erp', 'Inventory',          'inventory',          1),
  ('erp', 'Finance',            'finance',            2),
  ('erp', 'Order management',   'order-management',   3)
) as p(theme_slug, name, slug, position)
where t.slug = p.theme_slug
on conflict (theme_id, slug) do nothing;

insert into public.processes (theme_id, name, slug, position)
select t.id, p.name, p.slug, p.position
from public.themes t
cross join (values
  ('recruitment', 'Job posting',      'job-posting',      0),
  ('recruitment', 'Screening',        'screening',        1),
  ('recruitment', 'Onboarding',       'onboarding',       2)
) as p(theme_slug, name, slug, position)
where t.slug = p.theme_slug
on conflict (theme_id, slug) do nothing;

-- ─── Process Types ───────────────────────────────────────────

-- HRM/Payroll → Internal transfer
insert into public.process_types (process_id, name, slug, position)
select pr.id, pt.name, pt.slug, pt.position
from public.processes pr
join public.themes t on pr.theme_id = t.id
cross join (values
  ('Job change',         'job-change',         0),
  ('Schedule change',    'schedule-change',    1),
  ('Salary change',      'salary-change',      2),
  ('Contract change',    'contract-change',    3),
  ('Contract extension', 'contract-extension', 4)
) as pt(name, slug, position)
where t.slug = 'hrm-payroll' and pr.slug = 'internal-transfer'
on conflict (process_id, slug) do nothing;

-- HRM/Payroll → Onboarding
insert into public.process_types (process_id, name, slug, position)
select pr.id, pt.name, pt.slug, pt.position
from public.processes pr
join public.themes t on pr.theme_id = t.id
cross join (values
  ('New hire',           'new-hire',           0),
  ('Rehire',             'rehire',             1),
  ('Contractor',         'contractor',         2)
) as pt(name, slug, position)
where t.slug = 'hrm-payroll' and pr.slug = 'onboarding'
on conflict (process_id, slug) do nothing;

-- HRM/Payroll → Offboarding
insert into public.process_types (process_id, name, slug, position)
select pr.id, pt.name, pt.slug, pt.position
from public.processes pr
join public.themes t on pr.theme_id = t.id
cross join (values
  ('Resignation',   'resignation',   0),
  ('Termination',   'termination',   1),
  ('Retirement',    'retirement',    2)
) as pt(name, slug, position)
where t.slug = 'hrm-payroll' and pr.slug = 'offboarding'
on conflict (process_id, slug) do nothing;

-- ERP → Procurement
insert into public.process_types (process_id, name, slug, position)
select pr.id, pt.name, pt.slug, pt.position
from public.processes pr
join public.themes t on pr.theme_id = t.id
cross join (values
  ('Purchase order',  'purchase-order',  0),
  ('Vendor approval', 'vendor-approval', 1),
  ('Invoice matching','invoice-matching',2)
) as pt(name, slug, position)
where t.slug = 'erp' and pr.slug = 'procurement'
on conflict (process_id, slug) do nothing;

-- Recruitment → Screening
insert into public.process_types (process_id, name, slug, position)
select pr.id, pt.name, pt.slug, pt.position
from public.processes pr
join public.themes t on pr.theme_id = t.id
cross join (values
  ('CV review',        'cv-review',        0),
  ('Phone interview',  'phone-interview',  1),
  ('Assessment',       'assessment',       2),
  ('Final interview',  'final-interview',  3)
) as pt(name, slug, position)
where t.slug = 'recruitment' and pr.slug = 'screening'
on conflict (process_id, slug) do nothing;
