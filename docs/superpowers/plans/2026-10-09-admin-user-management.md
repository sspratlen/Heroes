# Admin User Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin-only "Users" page in `admin.html` listing every login account with link/role/password/delete actions.

**Architecture:** New focused file `assets/js/admin-users.js` (admin.html is ~4.5k lines) exposing `window.renderUsers`; admin.html only gets a script tag, sidebar link, and page-map entries. Reuses existing Edge Functions `admin-get-logins`, `admin-set-password`, `delete-player` and RLS from `20261009_lock_down_rls.sql`.

**Tech Stack:** Vanilla JS, supabase-js v2 (global `_getClient()`), admin.html helpers `setContent`, `openModal`, `closeModal`, `toast`, `auditLog`, `ROLE_PILL`, `_adminProfile`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `HeroesPassword.check`.

Spec: `docs/superpowers/specs/2026-10-09-admin-user-management-design.md`

---

### Task 1: DB behaviour tests (rolled back)
- [ ] Run inside `BEGIN … ROLLBACK` via MCP `execute_sql`, as admin (mkinse) and as player (Tom):
  - admin sets/clears another profile's `player_id` → 1 row each
  - admin changes another profile's role/approved → 1 row
  - player sets own `player_id` → raises "cannot change … player link"
  - player updates another profile → 0 rows
- [ ] Expected: all PASS (no schema change needed).

### Task 2: delete-player refuses self-delete
**Files:** Modify `supabase/functions/delete-player/index.ts` (after profile lookup)
```ts
    if (profile.id === user.id) {
      return json({ error: 'You cannot delete your own account.' }, 400);
    }
```
- [ ] Deploy with MCP `deploy_edge_function` (verify_jwt: true, same as v1).
- [ ] Verify: deployed source contains the guard.

### Task 3: `assets/js/admin-users.js`
**Files:** Create `assets/js/admin-users.js`
- State: `_users` (profiles rows), `_logins` (email → lastLogin), `_filter` ('all'|'unlinked'|'pending'|'admins'), `_query`.
- Helpers: `linkedPlayer(u)` (player_id, else email match), `suggestedPlayer(u)` (unique same last name + first initial, not linked elsewhere), `linkedToOther(playerId, userId)`, `approvedAdmins()`, `isMe(u)`.
- `renderUsers()` → admin check, load profiles + logins in parallel, `draw()`; `drawRows()` re-renders tbody only (keeps search focus).
- Modals: `usersLinkModal`, `usersQuickLink`, `usersRoleModal`, `usersPasswordModal`, `usersDeleteModal` — each validates, writes, `auditLog('user_*', 'profiles', id, …)`, toasts, reloads.
- Guards: no self demote/un-approve/delete; never leave zero approved admins.

### Task 4: Wire into admin.html
**Files:** Modify `admin.html`
- Sidebar link `<a class="sidebar-link" id="sidebar-users" onclick="showPage('users')">` after Account Requests; hidden unless admin (set in `showAdminLayout`).
- `pages` map: `'users': ['Users','Login Accounts & Access',false]`; fn map: `users: renderUsers`.
- `<script src="assets/js/admin-users.js"></script>` after photo-picker.js.
- Audit log: `canRestore` false for `collection === 'profiles'` (restore can't apply to accounts).

### Task 5: Verify in browser (local staging, stubbed admin, no writes)
- [ ] Page renders all accounts; counts on chips; search filters; suggestions shown for unlinked.
- [ ] Each modal opens; password validation blocks short/breached; self-delete/demote blocked.
- [ ] No console errors.

### Task 6: Ship
- [ ] Commit + push staging, copy to prod, push; confirm both live.
- [ ] Give user a manual checklist for real-admin testing on staging.
