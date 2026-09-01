# Tournament RSVP Design Spec

**Date:** 2026-09-01
**Feature:** Tournament RSVP — email blast with one-click yes/no/maybe, player roster view, admin dashboard with overrides and reminders

---

## Goal

Admins, managers, and coaches can send a tournament RSVP request to all players on a team with a single button click. Players respond directly from their email (no login required) or visit the site. Admins see live response counts, can override any player's status, and can resend reminders to non-responders and maybes.

---

## Approach

Option B: RSVP-only Supabase tables, existing tournament management unchanged. Tournaments remain in localStorage. Two new Supabase tables store RSVP state and a snapshot of tournament details needed for reminder emails. Three Edge Functions handle the blast, response recording, and reminders. A standalone `rsvp.html` page handles one-click responses and shows the team roster.

---

## Data Model

### `tournament_rsvps` table
One row per player per tournament.

```sql
CREATE TABLE tournament_rsvps (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id  text NOT NULL,
  player_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token          uuid NOT NULL DEFAULT gen_random_uuid(),
  status         text NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','yes','no','maybe')),
  responded_at   timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tournament_id, player_id),
  UNIQUE (token)
);
```

RLS policies (included in `tournament-rsvp-tables.sql`):
```sql
ALTER TABLE tournament_rsvps ENABLE ROW LEVEL SECURITY;
-- Edge functions use service_role key (bypasses RLS) for token writes
-- Admin override uses authenticated user's JWT
CREATE POLICY "anon can read rsvps" ON tournament_rsvps FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin can update rsvps" ON tournament_rsvps FOR UPDATE TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','manager','coach'));
```

### `tournament_email_meta` table
One row per tournament blast — stores snapshot for reminders.

```sql
CREATE TABLE tournament_email_meta (
  tournament_id  text PRIMARY KEY,
  name           text NOT NULL,
  start_date     text NOT NULL,
  end_date       text,
  location       text,
  team_id        text NOT NULL,
  sent_at        timestamptz NOT NULL DEFAULT now(),
  created_at     timestamptz NOT NULL DEFAULT now()
);
```

RLS: authenticated users can SELECT (admin checks whether blast has been sent). Service role writes on send.

---

## Edge Functions

### `send-tournament-rsvp`
**Auth:** required — caller must have role `admin`, `manager`, or `coach`

**Request body:**
```json
{
  "tournament_id": "t-abc123",
  "name": "TOC Kansas City Tournament",
  "start_date": "2026-09-12",
  "end_date": "2026-09-13",
  "location": "Kansas City, MO",
  "team_id": "55s-aaa"
}
```

**Logic:**
1. Verify caller role from profiles
2. Upsert row into `tournament_email_meta`
3. Fetch all approved profiles WHERE team_id matches (role = 'player' | 'coach' | 'manager')
4. For each player: INSERT into `tournament_rsvps` (tournament_id, player_id) ON CONFLICT DO NOTHING — preserves existing responses
5. Fetch all rsvp rows for this tournament (with player email + display_name from profiles join)
6. Send one Resend email per player with yes/no/maybe links
7. Return `{ sent: N }`

**Email format:**
- Subject: `You're invited: [Tournament Name] ⚾`
- Body: Tournament name, dates (start – end), location
- Three CTA buttons: ✅ Yes / ❌ No / 🤔 Maybe
- Each links to `https://heroesseniorsoftball.com/rsvp.html?token=TOKEN&r=yes` (or no/maybe)

---

### `record-tournament-rsvp`
**Auth:** none — public endpoint

**Request body:**
```json
{ "token": "uuid", "response": "yes" }
```

**Logic:**
1. Look up `tournament_rsvps` WHERE token = token
2. If not found → return 404
3. Update status = response, responded_at = now() (using service role)
4. Fetch `tournament_email_meta` for the tournament_id
5. Fetch all `tournament_rsvps` for the tournament_id, joined with profiles (display_name only)
6. Return `{ tournament: {...meta}, myStatus: "yes", roster: [{name, status}, ...] }`

---

### `send-tournament-reminders`
**Auth:** required — caller must have role `admin`, `manager`, or `coach`

**Request body:**
```json
{ "tournament_id": "t-abc123" }
```

**Logic:**
1. Verify caller role
2. Fetch `tournament_email_meta` for tournament_id
3. Fetch `tournament_rsvps` WHERE tournament_id = X AND status IN ('pending', 'maybe') — joined with profiles for email + display_name
4. Resend email to each (same format as blast)
5. Return `{ sent: N }`

---

## rsvp.html

Standalone page at repo root. Same card layout as `join.html` — dark background (`#111`), centered white card, Heroes logo, `heroesseniorsoftball.com` footer link.

**URL pattern:** `heroesseniorsoftball.com/rsvp.html?token=UUID&r=yes`

**On load:**
1. Read `token` and `r` from URL params
2. Show spinner while calling `record-tournament-rsvp` edge function
3. On success → render confirmation card + roster
4. On error (invalid/missing token) → render error card: "This link is expired or invalid."

**Confirmation card:**
- Tournament name, formatted date range, location
- Status line: "You're marked as: ✅ Yes" (bold, colored)
- Three small change-response links below: "Change to: Yes · No · Maybe" — each re-calls the edge function with the same token and new response, then re-renders

**Team roster (below confirmation):**
- Heading: "Team Response Summary"
- List of all players on this tournament's team with status badges:
  - ✅ Yes (green)
  - ❌ No (red)
  - 🤔 Maybe (yellow)
  - ⏳ Pending (gray) — shown as player name + "Hasn't responded"
- Sorted: Yes first, then Maybe, then Pending, then No

**Scripts:** loads Supabase CDN and `data.js` only (`auth.js` not needed — no login required, no modal). Edge function call uses `SUPABASE_ANON_KEY` from `data.js`.

---

## Admin UI (admin.html)

### Tournament row — new buttons

Added alongside Edit / Place / Delete buttons for each tournament row.

**Before blast sent:** `📧 Send RSVP` button
- Click → confirmation modal: "Send RSVP request to all players on [Team Name] for [Tournament Name]? This will email [N] players."
- Confirm → calls `send-tournament-rsvp` → toast "RSVP emails sent to N players"
- Button state driven by `sentTournamentIds` — a Set of tournament_ids fetched from `tournament_email_meta` when the Tournaments admin page loads (one Supabase SELECT on `renderTournaments()` call, stored in a module-level variable `_sentTournamentIds`)

**After blast sent:** `📊 RSVP` button
- Click → RSVP dashboard modal

### RSVP dashboard modal

**Header:** "[Tournament Name] — RSVP Status"

**Summary row:**
```
✅ 8 Yes  ❌ 2 No  🤔 3 Maybe  ⏳ 4 Pending
```

**Player table:**
| Player | Status | Override |
|--------|--------|----------|
| Scott S. | ✅ Yes | `[dropdown: Yes/No/Maybe/Pending]` |
| John D. | ⏳ Pending | `[dropdown]` |

- Override dropdown visible only for roles `admin`, `manager`, `coach`
- Changing dropdown calls Supabase directly: `UPDATE tournament_rsvps SET status=X, responded_at=now() WHERE tournament_id=T AND player_id=P`

**Footer:** `🔔 Resend Reminders (N pending/maybe)` button
- Calls `send-tournament-reminders`
- Shows toast "Reminders sent to N players"
- N = count of pending + maybe rows for this tournament

### Role gate

`Send RSVP`, `📊 RSVP`, and `Resend Reminders` are only rendered when `currentUser.role` is `admin`, `manager`, or `coach`. Same pattern as the existing invite button.

---

## Files Touched

| File | Action |
|------|--------|
| `supabase/tournament-rsvp-tables.sql` | **Create** — DDL for both tables + RLS |
| `supabase/functions/send-tournament-rsvp/index.ts` | **Create** — Edge Function |
| `supabase/functions/record-tournament-rsvp/index.ts` | **Create** — Edge Function |
| `supabase/functions/send-tournament-reminders/index.ts` | **Create** — Edge Function |
| `rsvp.html` | **Create** — standalone response + roster page |
| `admin.html` | **Modify** — add RSVP buttons to tournament rows + dashboard modal |

---

## Out of Scope

- Migrating tournaments from localStorage to Supabase
- Push notifications or SMS
- Calendar integration (iCal attachment)
- Per-player notes on RSVP response
- Public-facing tournament RSVP page visible without a token
