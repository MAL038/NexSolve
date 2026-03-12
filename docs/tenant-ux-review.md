# NexSolve UX, Multi-tenant & Permissions Review

## 1) UX improvements

### Global search (Ctrl/Cmd+K) modal stays too small

**Observed likely cause**
- The modal is hard-capped to `max-w-2xl` and positioned with `top-[15vh]`, which feels like a dropdown on large screens instead of a command palette modal.

**Fix architecture**
- Move to a reusable `Dialog` shell with standardized modal sizes (`sm|md|lg|xl|full`) and a dedicated size for command search (`xl`, `max-w-4xl`).
- Use consistent viewport-based height (`max-h-[75vh]`) and center alignment (`items-start` mobile, `items-center` desktop).

**Code example**
```tsx
// components/ui/CommandDialog.tsx
export function CommandDialog({ open, onOpenChange, children }: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => onOpenChange(false)} />
      <div className="absolute inset-0 flex items-start sm:items-center justify-center p-3 sm:p-8">
        <div className="w-full max-w-4xl max-h-[75vh] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          {children}
        </div>
      </div>
    </div>
  );
}
```

---

### Button color inconsistency (black vs primary)

**Observed likely cause**
- The design system already defines `.btn-primary`, but multiple screens still use ad-hoc utility classes (e.g. direct `bg-black`) instead of tokenized button variants.

**Fix architecture**
- Introduce a single `Button` component with semantic variants: `primary`, `secondary`, `ghost`, `danger`, `outline`.
- Forbid raw color utilities on buttons via ESLint custom rule or review guideline.

**Code example**
```tsx
// components/ui/Button.tsx
const variants = {
  primary: "btn btn-primary",
  secondary: "btn btn-secondary",
  outline: "btn btn-outline",
  ghost: "btn btn-ghost",
  danger: "btn btn-danger",
};

export function Button({ variant = "primary", className, ...props }: ButtonProps) {
  return <button className={cn(variants[variant], className)} {...props} />;
}
```

---

### Customers edit inconsistency vs Projects

**Recommendation: choose Option A (edit in Settings tab only)**
- This already matches the Projects pattern where overview nudges users to settings for structural edits.
- It reduces duplicate validation/UI paths and keeps audit logging cleaner.

**Concrete UX rules**
1. Overview tab: read-only summary + “Edit in Settings” CTA.
2. Settings tab: all editable fields + working save/cancel states.
3. Each module (Projects, Customers, Teams) follows same pattern.

---

## 2) Multi-tenant permission fixes

### Tenant navigation redirects users to dashboard

**Observed likely causes**
1. Two API context implementations exist. One old implementation reads `organisation_members` with `.single()`, which breaks for multi-org users.
2. A separate server helper still reads `profiles.active_org_id` while the rest of the app uses `profiles.current_org_id`.

**Fix architecture**
- Use **one authoritative context resolver** for all API routes and server guards:
  - resolves org from `profiles.current_org_id`
  - validates membership against that org
  - applies module enablement + role checks.
- Remove/deprecate `lib/api/requireApiContext.ts` (legacy) and route everything through the newer resolver.

**Code example**
```ts
// pseudo: unified resolver
const currentOrgId = profile.current_org_id;
const membership = await db.from("organisation_members")
  .select("org_id, role")
  .eq("user_id", user.id)
  .eq("org_id", currentOrgId)
  .maybeSingle();

if (!membership) deny(403);
```

---

### Projects module inaccessible for org.admin in another tenant

**Likely cause**
- Role + org resolution mismatch due to legacy context and old field names (`active_org_id` vs `current_org_id`).

**Fix**
- Role checks must always run against the active tenant only.
- Add defensive check in middleware/layout: if URL org context differs from `current_org_id`, force switch or show explicit error state (not silent dashboard redirect).

---

### Team module shows cross-tenant members

**Likely cause**
- Query path is mostly correct in some places, but leakage can still happen when nested relations on `profiles` are not guarded by strict RLS and when alternate APIs fetch users globally.

**Fix architecture**
- Enforce tenant isolation at DB level (RLS first), then filter in API query.

**Correct query example**
```ts
const { data } = await supabase
  .from("organisation_members")
  .select(`
    org_id,
    role,
    profile:profiles!organisation_members_user_id_fkey(
      id, full_name, email, avatar_url, role
    )
  `)
  .eq("org_id", orgId)
  .order("joined_at", { ascending: true });
```

**RLS policy example**
```sql
create policy "members_select_own_org"
on organisation_members
for select
using (
  org_id in (
    select om.org_id
    from organisation_members om
    where om.user_id = auth.uid()
  )
);

create policy "profiles_select_same_org"
on profiles
for select
using (
  exists (
    select 1
    from organisation_members me
    join organisation_members target on target.org_id = me.org_id
    where me.user_id = auth.uid()
      and target.user_id = profiles.id
  )
);
```

---

## 3) Database changes

### Favourites persistence bug

**Diagnosis**
- Frontend toggles local state regardless of API response status (optimistic without rollback).
- No migration for `favourites` is present in the repository, indicating table/policy drift risk between environments.

**Likely issue type**
- Primarily **database/schema + RLS drift**, secondarily **state management error handling**.

**Fix**
1. Add explicit migration for `favourites` table + unique index + RLS policies.
2. In UI, only commit optimistic state when `res.ok`; otherwise rollback and toast error.
3. Filter GET by `entity_type='project'` where needed.

**Migration example**
```sql
create table if not exists favourites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid null references organisations(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  created_at timestamptz not null default now(),
  unique(user_id, org_id, entity_type, entity_id)
);

alter table favourites enable row level security;

create policy "favourites_select_own"
on favourites for select
using (user_id = auth.uid());

create policy "favourites_insert_own"
on favourites for insert
with check (user_id = auth.uid());

create policy "favourites_delete_own"
on favourites for delete
using (user_id = auth.uid());
```

---

### Customer tab in Projects properties

- The Project detail model already includes a dedicated `Klant` tab. If users report missing Customer context, the issue is likely in another project properties surface (modal/wizard/settings) not mirroring this tab set.
- Standardize tabs across all project edit surfaces with one tab config source.

---

## 4) API changes

1. **Unify API context**
   - Replace all uses of legacy `lib/api/requireApiContext.ts` with the unified org-aware resolver.
2. **Add module guard middleware helper**
   - `requireModule("projects")` should fail with structured 403 payload (`{code:'MODULE_DISABLED'}`) instead of generic redirects.
3. **Favourites endpoints**
   - Add optional `entity_type` query param to GET.
   - Return typed errors (`FAVOURITES_TABLE_MISSING`, `RLS_DENIED`) for better client diagnostics.

---

## 5) UI component changes

1. Create `Button` component with variant tokens and remove raw color button classes.
2. Create shared `ModalShell` + `CommandDialog` and migrate search modal.
3. Add `ModuleGuard` UI state (already partly present in codebase) to show “module disabled for your tenant” instead of dashboard redirect loops.
4. Normalize detail pages with a shared `EntityDetailLayout` (tabs, header actions, edit CTA conventions).

---

## 6) Suggested architecture improvements

### A. Tenant context as first-class domain object
- Implement `TenantContext` resolver used by server components, route handlers, and policies:
  - `userId`
  - `currentOrgId`
  - `orgRole`
  - `enabledModules`

### B. Permission map by module + action
- Replace ad-hoc role checks with centralized capabilities:
  - `projects.read`, `projects.write`, `projects.admin`
  - `customers.read`, `customers.write`
- Store tenant overrides in `organisation_modules` + `organisation_permissions` JSONB.

### C. Data access boundary
- Introduce repository layer (or service functions) per module to prevent direct ad-hoc queries in UI/page files.
- Every repository function requires `TenantContext` and enforces `.eq("org_id", ctx.currentOrgId)`.

### D. Observability and regression safety
- Add integration tests for:
  1. Multi-tenant user switching tenants and opening sidebar modules.
  2. Team page never returning cross-tenant users.
  3. Favourite persistence after refresh.
