-- ═══════════════════════════════════════════════════════════════
-- NEXSOLVE – Migration 005: Updated Theme Hierarchy (Dutch)
-- Replaces old seed data. Tables already exist from migration 004.
-- Idempotent: ON CONFLICT DO NOTHING + explicit deletes of old data.
-- ═══════════════════════════════════════════════════════════════

-- ─── Clear old seed data (slugs from migration 004) ──────────
delete from public.themes where slug in (
  'hrm-payroll', 'erp', 'recruitment'
);
-- Cascades to processes + process_types automatically.

-- ─── Level 1: Themes ─────────────────────────────────────────
insert into public.themes (name, slug, position) values
  ('Algemeen',        'algemeen',        0),
  ('CRM',             'crm',             1),
  ('HRM',             'hrm',             2),
  ('Ordermanagement', 'ordermanagement', 3),
  ('Payroll',         'payroll',         4),
  ('ERP',             'erp',             5)
on conflict (slug) do update set
  name     = excluded.name,
  position = excluded.position;

-- ─── Level 2: Processes ──────────────────────────────────────

-- HRM processes
insert into public.processes (theme_id, name, slug, position)
select t.id, p.name, p.slug, p.pos
from public.themes t
cross join (values
  ('Employee Self Service (ESS)', 'ess',                        0),
  ('Verlof & Verzuim',            'verlof-verzuim',             1),
  ('Instroom (MSS)',              'instroom-mss',               2),
  ('Doorstroom (MSS)',            'doorstroom-mss',             3),
  ('Uitstroom (MSS)',             'uitstroom-mss',              4),
  ('Wet verbetering poortwachter','wet-verbetering-poortwachter',5),
  ('Talentmanagement',            'talentmanagement',           6),
  ('Werving & Selectie',          'werving-selectie',           7),
  ('Performance Management',      'performance-management',     8)
) as p(name, slug, pos)
where t.slug = 'hrm'
on conflict (theme_id, slug) do update set
  name     = excluded.name,
  position = excluded.position;

-- Payroll processes
insert into public.processes (theme_id, name, slug, position)
select t.id, p.name, p.slug, p.pos
from public.themes t
cross join (values
  ('Looncomponenten',  'looncomponenten',  0),
  ('Rekeningschema',   'rekeningschema',   1),
  ('Grootboekrekening','grootboekrekening',2),
  ('Journalisering',   'journalisering',   3),
  ('Kostenplaats',     'kostenplaats',     4),
  ('Kostendrager',     'kostendrager',     5),
  ('Declaraties',      'declaraties',      6)
) as p(name, slug, pos)
where t.slug = 'payroll'
on conflict (theme_id, slug) do update set
  name     = excluded.name,
  position = excluded.position;

-- ERP processes
insert into public.processes (theme_id, name, slug, position)
select t.id, p.name, p.slug, p.pos
from public.themes t
cross join (values
  ('Financieel',       'financieel',       0),
  ('Ordermanagement',  'ordermanagement',  1),
  ('Projecten',        'projecten',        2)
) as p(name, slug, pos)
where t.slug = 'erp'
on conflict (theme_id, slug) do update set
  name     = excluded.name,
  position = excluded.position;

-- Algemeen and CRM have no sub-processes (top-level only themes)
-- Ordermanagement has no sub-processes
