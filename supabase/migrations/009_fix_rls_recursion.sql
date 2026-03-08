-- ─────────────────────────────────────────────────────────────────────────────
-- 009_fix_rls_recursion.sql
--
-- Probleem: oneindige recursie in RLS-policies tussen projects en project_members.
--
-- Recursie-keten:
--   projects SELECT policy     → EXISTS (SELECT FROM project_members ...)
--   project_members SELECT policy → EXISTS (SELECT FROM projects ...)  ← lus!
--
-- Oplossing: een SECURITY DEFINER helper-functie die project-eigenaarschap
-- checkt zonder RLS te activeren op de projects-tabel. Hierdoor wordt de
-- recursie-keten doorbroken.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Helper-functie ───────────────────────────────────────────────────────
-- Controleer of de huidige gebruiker eigenaar is van een project.
-- SECURITY DEFINER bypasses RLS op de projects-tabel → geen recursie.

create or replace function public.is_project_owner_bypassrls(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from projects
    where id = p_project_id
      and owner_id = auth.uid()
  );
$$;

-- ── 2. Herstel project_members policies ─────────────────────────────────────
-- Vervang alle EXISTS (SELECT FROM projects ...) door de SECURITY DEFINER functie.

drop policy if exists "PM: owner or self select"  on public.project_members;
drop policy if exists "PM: owner insert"          on public.project_members;
drop policy if exists "PM: owner delete"          on public.project_members;
drop policy if exists "PM: owner update role"     on public.project_members;

-- SELECT: lid zelf OF project-eigenaar
create policy "PM: owner or self select"
  on public.project_members for select
  using (
    user_id = auth.uid()
    or public.is_project_owner_bypassrls(project_id)
  );

-- INSERT: alleen project-eigenaar mag leden toevoegen
create policy "PM: owner insert"
  on public.project_members for insert
  with check (
    public.is_project_owner_bypassrls(project_id)
  );

-- DELETE: alleen project-eigenaar mag leden verwijderen
create policy "PM: owner delete"
  on public.project_members for delete
  using (
    public.is_project_owner_bypassrls(project_id)
  );

-- UPDATE: alleen project-eigenaar mag rollen wijzigen
create policy "PM: owner update role"
  on public.project_members for update
  using (
    public.is_project_owner_bypassrls(project_id)
  );
