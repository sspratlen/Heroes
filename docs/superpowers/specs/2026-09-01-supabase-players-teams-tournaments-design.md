# Supabase Migration: Players, Teams & Tournaments Design Spec

**Date:** 2026-09-01  
**Feature:** Migrate players, teams, and tournaments from the `heroes_data` JSON blob table to proper relational Supabase tables with RLS, referential integrity, and real SQL queries.

---

## Goal

Replace the localStorage-backed JSON blob pattern for three collections (players, teams, tournaments) with dedicated Supabase tables. All existing synchronous `loadData()` calls continue to work — Supabase is the source of truth, localStorage is a read cache populated by `initData()` on page load.

---

## Approach

Approach A: Full relational tables.

- `teams`, `players`, `player_teams` (many-to-many junction), `tournaments` tables created in Supabase
- `initData()` fetches from these tables and reconstructs the existing localStorage shape
- `saveCollection('players' | 'teams' | 'tournaments', ...)` dispatches to new Supabase write helpers instead of the JSON blob
- `DB_COLLECTIONS` loses these three entries (they no longer go to `heroes_data`)
- Existing `tournament_rsvps.tournament_id → tournaments.id` FK added for cascade-delete of RSVPs when a tournament is deleted
- One-time migration button in admin.html to push any localStorage-only data (admins added after the seed) into the new tables

---

## Data Model

### `teams` table

```sql
CREATE TABLE teams (
  id                text PRIMARY KEY,  -- "55s-aaa", "50s-aaa", etc.
  name              text NOT NULL,
  short_name        text,
  division          text,
  age_group         int,
  color             text,
  manager           text,
  assistant_manager text,
  created_at        timestamptz NOT NULL DEFAULT now()
);
```

### `players` table

```sql
CREATE TABLE players (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id   text UNIQUE,        -- original "p1", "p2" IDs; JS-facing identifier
  first_name  text NOT NULL DEFAULT '',
  last_name   text NOT NULL DEFAULT '',
  number      text DEFAULT '',
  position    text DEFAULT '',
  bats        text DEFAULT 'R',
  throws      text DEFAULT 'R',
  join_year   int,
  active      bool NOT NULL DEFAULT true,
  photo       text DEFAULT '',    -- data URL or path, kept as-is
  email       text DEFAULT '',    -- lowercase; links to profiles.email when account exists
  created_at  timestamptz NOT NULL DEFAULT now()
);
```

`credentials` is intentionally **not** migrated — it is legacy auth data that is no longer used.

### `player_teams` junction table

```sql
CREATE TABLE player_teams (
  player_id  uuid REFERENCES players(id) ON DELETE CASCADE,
  team_id    text REFERENCES teams(id)   ON DELETE CASCADE,
  PRIMARY KEY (player_id, team_id)
);
```

### `tournaments` table

```sql
CREATE TABLE tournaments (
  id          text PRIMARY KEY,   -- "tr1234567890"; kept as-is for tournament_rsvps FK compat
  name        text NOT NULL,
  team_id     text REFERENCES teams(id),
  start_date  text,               -- "YYYY-MM-DD"
  end_date    text,
  location    text,
  season      int,
  placement   text,
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
```

---

## RLS Policies

All four tables follow the same pattern: public read (roster and schedule are visible to everyone), authenticated write for admin/manager/coach roles only.

```sql
-- teams
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read teams" ON teams
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin write teams" ON teams
  FOR ALL TO authenticated
  USING   ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','manager','coach'))
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','manager','coach'));

-- players (same pattern)
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read players" ON players
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin write players" ON players
  FOR ALL TO authenticated
  USING   ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','manager','coach'))
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','manager','coach'));

-- player_teams (same pattern)
ALTER TABLE player_teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read player_teams" ON player_teams
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin write player_teams" ON player_teams
  FOR ALL TO authenticated
  USING   ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','manager','coach'))
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','manager','coach'));

-- tournaments (same pattern)
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read tournaments" ON tournaments
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin write tournaments" ON tournaments
  FOR ALL TO authenticated
  USING   ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','manager','coach'))
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','manager','coach'));
```

Additionally, add a FK from `tournament_rsvps` to `tournaments` to enable cascade-delete of RSVPs when a tournament is deleted:

```sql
ALTER TABLE tournament_rsvps
  ADD CONSTRAINT fk_rsvps_tournament
  FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE;
```

---

## data.js Changes

### DB_COLLECTIONS

Remove `'teams'`, `'players'`, and `'tournaments'` — they no longer go to the `heroes_data` JSON blob:

```js
const DB_COLLECTIONS = ['config','games','events','news','awards','sponsors',
  'accountRequests','pageLayouts','albums','photos'];
```

### initData() — new table fetch

After the existing `heroes_data` fetch, fetch from the four new tables and overwrite those three keys in `merged`:

```js
const [{ data: playerRows }, { data: ptRows }, { data: teamRows }, { data: tourneyRows }] =
  await Promise.all([
    client.from('players').select('*'),
    client.from('player_teams').select('*'),
    client.from('teams').select('*'),
    client.from('tournaments').select('*'),
  ]);

merged.players = (playerRows || []).map(p => ({
  id:        p.legacy_id || p.id,
  firstName: p.first_name,
  lastName:  p.last_name,
  number:    p.number   || '',
  position:  p.position || '',
  teams:     (ptRows || []).filter(pt => pt.player_id === p.id).map(pt => pt.team_id),
  bats:      p.bats    || 'R',
  throws:    p.throws  || 'R',
  joinYear:  p.join_year,
  active:    p.active,
  photo:     p.photo   || '',
  email:     p.email   || '',
}));

merged.teams = (teamRows || []).map(t => ({
  id:               t.id,
  name:             t.name,
  shortName:        t.short_name        || '',
  division:         t.division          || '',
  ageGroup:         t.age_group,
  color:            t.color             || '',
  manager:          t.manager           || '',
  assistantManager: t.assistant_manager || '',
}));

merged.tournaments = (tourneyRows || []).map(t => ({
  id:        t.id,
  name:      t.name,
  teamId:    t.team_id,
  startDate: t.start_date,
  endDate:   t.end_date,
  location:  t.location || '',
  season:    t.season,
  placement: t.placement || null,
  notes:     t.notes    || '',
}));
```

### New Supabase write helpers

Three new async functions, each following a upsert-then-delete pattern:

**`_syncTeamsToSupabase(teams)`**
- Upsert all team rows (`onConflict: 'id'`)
- Delete rows whose `id` is not in the current array

**`_syncPlayersToSupabase(players)`**
- Upsert all player rows (`onConflict: 'legacy_id'`), mapping JS camelCase → SQL snake_case; use each player's JS `id` field as `legacy_id`
- After upsert, fetch all player rows (`SELECT id, legacy_id`) to build a `legacyId → uuid` map
- Delete all `player_teams` rows for the affected player UUIDs, then re-insert the current `teams[]` arrays using the UUID map

**`_syncTournamentsToSupabase(tournaments)`**
- Upsert tournament rows (`onConflict: 'id'`)
- Delete rows whose `id` is not in the current array

### saveCollection dispatch

Add a dispatch block at the top of `saveCollection` (before the existing localStorage write + `_pushCollectionToSupabase` call):

```js
function saveCollection(name, value) {
  const data = loadData();
  data[name] = value;
  localStorage.setItem('heroes_data', JSON.stringify(data));

  if (name === 'players')     { _syncPlayersToSupabase(value);     return; }
  if (name === 'teams')       { _syncTeamsToSupabase(value);        return; }
  if (name === 'tournaments') { _syncTournamentsToSupabase(value);  return; }

  _pushCollectionToSupabase(name, value);
}
```

---

## Migration Strategy

### Seed data (SQL file)

The schema migration SQL file includes `INSERT` statements for all default teams and players from `HeroesData` in `data.js`:
- 5 teams → inserted directly
- ~50 players → inserted with `legacy_id` set to original `"p1"` etc.; `credentials` omitted
- `player_teams` rows derived from each player's `teams[]` array

Tournaments have no default seed data — any real tournaments exist only in localStorage or were created by admins.

### One-time admin migration button

A "Migrate Data to Database" button appears in the admin Settings section (visible to admins only). When clicked:
1. Reads current `loadData().players`, `.teams`, `.tournaments` from localStorage
2. Calls `_syncPlayersToSupabase`, `_syncTeamsToSupabase`, `_syncTournamentsToSupabase`
3. Shows a toast confirming how many records were pushed

This handles any players or tournaments that were added after the seed was applied and exist only in localStorage. Run once, then the button can be ignored.

---

## Files Touched

| File | Action |
|------|--------|
| `supabase/players-teams-tournaments-tables.sql` | **Create** — DDL for all 4 tables + RLS + seed INSERTs + FK on tournament_rsvps |
| `assets/js/data.js` | **Modify** — remove 3 collections from DB_COLLECTIONS, update initData(), add 3 sync helpers, update saveCollection dispatch |
| `admin.html` | **Modify** — add "Migrate Data" button in Settings section |

---

## Out of Scope

- Migrating the `events` collection (tournaments with `type:"tournament"` in the schedule — those are separate from the admin-managed tournament RSVP objects)
- Photo storage migration to Supabase Storage (photos stay as data URLs / paths in the `photo` text column)
- Offline/conflict resolution (if offline, localStorage writes succeed; Supabase sync fails silently and will be stale until next `initData()` run)
- Removing `heroes_data` JSON blob rows for players/teams/tournaments after migration (stale but harmless — they just stop being written to)
