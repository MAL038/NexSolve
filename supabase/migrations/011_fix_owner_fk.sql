-- ─────────────────────────────────────────────────────────────────────────────
-- 011_fix_owner_fk.sql
--
-- Probleem: projects.owner_id verwijst naar auth.users(id), maar PostgREST
-- kan geen embedded join maken naar public.profiles via auth.users.
-- Dit veroorzaakt PGRST200 errors bij queries als:
--   owner:profiles!projects_owner_id_fkey(full_name, email)
--
-- Oplossing: voeg een tweede FK toe van projects.owner_id naar profiles.id.
-- Omdat profiles.id == auth.users.id (zelfde UUID-waarden), zijn de data
-- altijd consistent. PostgREST kan daarna joinen via de nieuwe FK.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.projects
  drop constraint if exists projects_owner_profiles_fkey;

alter table public.projects
  add constraint projects_owner_profiles_fkey
  foreign key (owner_id) references public.profiles(id) on delete cascade;
