# Admin User Management Screen — Design

**Date:** 2026-10-09 · **Status:** Approved

## Goal
One admin-only place to see and manage every login account (Supabase auth user + `profiles` row), including accounts not linked to a roster player — today those are invisible in the admin panel.

## Placement
New **Users** page in `admin.html` sidebar (after Account Requests), rendered by `renderUsers()` via the existing `showPage('users')` pattern. Sidebar link and page are shown only when `_adminProfile.role === 'admin'`.

## Data
- `profiles` (staff can read all under current RLS): id, email, display_name, role, approved, player_id, pending_role, created_at.
- Last login: existing `admin-get-logins` Edge Function (keyed by email).
- Roster: `loadData().players` (id = roster legacy id).
- Roster link = `profiles.player_id`; an account also counts as linked when its email equals a roster player's email (same rule as `_profileForPlayer`).

## Table
Columns: Name · Email · Role · Status (Approved / Pending) · Roster player · Last login · Joined · Actions.
- Search box (name or email, case-insensitive).
- Filter chips: All · Unlinked · Pending approval · Admins (with counts).
- Unlinked rows: amber highlight; if exactly one roster player has the same last name and first initial, show "Suggested: <name>" with a one-click **Link** button.

## Actions (one modal each)
1. **Link / Unlink** — searchable roster picker; players already linked to another account are labelled "(linked to <name>)" and disabled. Writes `profiles.player_id` (null to unlink).
2. **Role & approval** — role select (player, fan, coach, manager, admin) + approved checkbox. Writes `profiles.role`, `profiles.approved`, clears `pending_role` when it matches the new role.
3. **Reset password** — new password + confirm, validated with `HeroesPassword.check`; "must change at next login" checkbox. Calls `admin-set-password` `{ email, password, mustChangePassword }`.
4. **Delete** — confirm by typing the account's email. Calls `delete-player` `{ email }`. Copy states the roster record is kept; login, profile and RSVPs are removed.

Every successful action calls `auditLog(...)` (actor stamped server-side) and re-renders the table.

## Safety rails
- Cannot delete, demote, or un-approve your own account (UI).
- Cannot remove admin from / delete the last approved admin (UI check against loaded profiles).
- `delete-player` Edge Function: reject when the target is the caller (server-side), redeployed.
- Database already enforces: only admins grant/remove admin (`private.profiles_guard`), only staff edit others' profiles (RLS).

## Error handling
Supabase/Edge errors surface in the modal (red text) or via `toast(..., 'error')`; the table is not re-rendered on failure.

## Testing
- SQL tests inside BEGIN…ROLLBACK as an admin and as a player for link/role/approve updates.
- Browser: page renders, filters/search work, modals open and validate (pretend-admin stub; no real writes).
- Manual checklist for the user on staging with a real admin login.
