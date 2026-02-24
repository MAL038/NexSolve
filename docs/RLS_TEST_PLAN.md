# RLS Manual Test Plan

Use two separate browser sessions (or one incognito):
- **User A** = owner
- **User B** = member (invited by A)
- **User C** = unrelated user (no access)

---

## Test 1 – Owner sees own projects
**As User A:** Go to /projects → should see all projects created by A.
✓ RLS: `owner_id = auth.uid()`

## Test 2 – Non-member cannot see project
**As User C:** Call `GET /api/projects/:id` for a project owned by A.
✓ Expected: 404 (RLS filters it out entirely).

## Test 3 – Owner can add a member
**As User A:** On project detail → search for User B → click Add.
✓ Expected: POST `/api/projects/:id/members` → 201, member appears in list.

## Test 4 – Member can see project after being added
**As User B:** Go to /projects → project owned by A should now appear.
✓ RLS: `EXISTS (select 1 from project_members pm where pm.project_id = id and pm.user_id = auth.uid())`

## Test 5 – Non-member still cannot see project
**As User C:** Repeat Test 2 after User B was added.
✓ Expected: still 404 for User C.

## Test 6 – Member cannot delete project (owner-only)
**As User B:** Call `DELETE /api/projects/:id`.
✓ Expected: 403 or empty result (RLS blocks DELETE; route handler returns 403 if owner check fails first).

## Test 7 – Member cannot add other members
**As User B:** Call `POST /api/projects/:id/members` with User C's id.
✓ Expected: 403 "Only the project owner can add members".

## Test 8 – Owner can remove a member
**As User A:** Click remove on User B in MembersPanel.
✓ Expected: DELETE `/api/projects/:id/members/:userId` → 204, member disappears from list.

## Test 9 – Removed member loses project access
**As User B:** Refresh /projects after being removed.
✓ Expected: project owned by A no longer visible.

## Test 10 – Customer visibility is owner-only
**As User A:** Create a customer, note the customer id.
**As User B:** Call `GET /api/customers/:id` with that id.
✓ Expected: 404 (RLS: `owner_id = auth.uid()` on customers table).

---

## Bonus: Verify in Supabase Dashboard
Go to **Table Editor → project_members** → try to insert a row with a project_id not owned by the calling user.
✓ Expected: RLS INSERT policy rejects it.

Go to **Table Editor → projects** → switch to a different user session → verify the project list is empty.
✓ Expected: only rows matching `owner_id = auth.uid()` OR presence in `project_members` are returned.
