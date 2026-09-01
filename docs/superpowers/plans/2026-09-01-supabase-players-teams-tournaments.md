# Supabase Players, Teams & Tournaments Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `heroes_data` JSON-blob storage for players, teams, and tournaments with proper relational Supabase tables, keeping `loadData()` synchronous via a localStorage read cache.

**Architecture:** Four new tables (`teams`, `players`, `player_teams`, `tournaments`) with RLS policies; `initData()` fetches from all four and populates the localStorage cache; `saveCollection()` dispatches writes for these three collections to dedicated sync helpers instead of the JSON blob; a one-time admin migration button pushes any localStorage-only data to Supabase.

**Tech Stack:** Supabase (PostgreSQL + RLS + JS client v2), vanilla HTML/JS, GitHub Pages

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `Heroes Website/supabase/players-teams-tournaments-tables.sql` | **Create** | DDL, RLS, seed INSERTs, FK on tournament_rsvps |
| `Heroes Website/assets/js/data.js` | **Modify** | DB_COLLECTIONS, initData, saveCollection, 3 sync helpers |
| `Heroes Website/admin.html` | **Modify** | Migrate Data button in Data Management page |
| `Heroes-staging/assets/js/data.js` | **Copy** | Mirror prod changes |
| `Heroes-staging/admin.html` | **Copy** | Mirror prod changes |

---

## Context for all tasks

- **Repo root (prod):** `/Users/scottspratlen/Documents/Claude/Projects/Heroes Website/Heroes Website/`
- **Repo root (staging):** `/Users/scottspratlen/Documents/Claude/Projects/Heroes-staging/`
- **Supabase project:** `mpgbgucmnxowteonldoh` — SQL applied via Supabase MCP `execute_sql`
- **`loadData()`** is synchronous and reads only from localStorage. It must stay that way. Supabase is read via the async `initData()` called once on page load.
- **`saveCollection(name, value)`** currently writes to localStorage then calls `_pushCollectionToSupabase()`. We add a dispatch: if name is `players`, `teams`, or `tournaments`, call the corresponding sync helper and return early instead.
- **Player IDs**: In JavaScript, players use their legacy `"p1"`, `"p2"` etc string IDs. The new `players` table stores these as `legacy_id text UNIQUE` and uses a UUID `id` internally. `initData()` reconstructs the JS shape using `legacy_id` as the JS-facing `id`.
- **ADMIN_ROLES** = `['admin', 'manager', 'coach']` (module-level constant in admin.html)

---

### Task 1: Create SQL schema + seed file

**Files:**
- Create: `Heroes Website/supabase/players-teams-tournaments-tables.sql`

- [ ] **Step 1: Create the SQL file**

```bash
touch "/Users/scottspratlen/Documents/Claude/Projects/Heroes Website/Heroes Website/supabase/players-teams-tournaments-tables.sql"
```

- [ ] **Step 2: Write the complete SQL**

Write the following to `Heroes Website/supabase/players-teams-tournaments-tables.sql`:

```sql
-- ─── TEAMS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS teams (
  id                text PRIMARY KEY,
  name              text NOT NULL,
  short_name        text,
  division          text,
  age_group         int,
  color             text,
  manager           text,
  assistant_manager text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read teams" ON teams
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "admin write teams" ON teams
  FOR ALL TO authenticated
  USING   ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','manager','coach'))
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','manager','coach'));

-- ─── PLAYERS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS players (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id   text UNIQUE,
  first_name  text NOT NULL DEFAULT '',
  last_name   text NOT NULL DEFAULT '',
  number      text DEFAULT '',
  position    text DEFAULT '',
  bats        text DEFAULT 'R',
  throws      text DEFAULT 'R',
  join_year   int,
  active      bool NOT NULL DEFAULT true,
  photo       text DEFAULT '',
  email       text DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read players" ON players
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "admin write players" ON players
  FOR ALL TO authenticated
  USING   ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','manager','coach'))
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','manager','coach'));

-- ─── PLAYER_TEAMS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS player_teams (
  player_id  uuid REFERENCES players(id) ON DELETE CASCADE,
  team_id    text REFERENCES teams(id)   ON DELETE CASCADE,
  PRIMARY KEY (player_id, team_id)
);

ALTER TABLE player_teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read player_teams" ON player_teams
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "admin write player_teams" ON player_teams
  FOR ALL TO authenticated
  USING   ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','manager','coach'))
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','manager','coach'));

-- ─── TOURNAMENTS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tournaments (
  id          text PRIMARY KEY,
  name        text NOT NULL,
  team_id     text REFERENCES teams(id),
  start_date  text,
  end_date    text,
  location    text,
  season      int,
  placement   text,
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read tournaments" ON tournaments
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "admin write tournaments" ON tournaments
  FOR ALL TO authenticated
  USING   ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','manager','coach'))
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','manager','coach'));

-- ─── FK: tournament_rsvps → tournaments (cascade delete) ──────
ALTER TABLE tournament_rsvps
  ADD CONSTRAINT IF NOT EXISTS fk_rsvps_tournament
  FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE;

-- ─── SEED: TEAMS ──────────────────────────────────────────────
INSERT INTO teams (id, name, short_name, division, age_group, color, manager, assistant_manager) VALUES
  ('55s-aaa',     '55''s AAA',    '55s',   'AAA',         55,   '#C8102E', 'Mike Marlow',    'James Bennar'),
  ('50s-aaa',     '50''s AAA',    '50s-A', 'AAA',         50,   '#1C6EA4', 'Scott Spratlen', ''),
  ('50s-aa',      '50''s AA',     '50s-B', 'AA',          50,   '#16803A', 'Doyle Ollis',    ''),
  ('majors',      'Majors',        'Maj',   'Majors',      NULL, '#C2410C', '',               ''),
  ('majors-plus', 'Majors Plus',   'Maj+',  'Majors Plus', NULL, '#0F766E', '',               '')
ON CONFLICT (id) DO NOTHING;

-- ─── SEED: PLAYERS ────────────────────────────────────────────
INSERT INTO players (legacy_id, first_name, last_name, number, position, bats, throws, join_year, active, photo, email) VALUES
  ('p1',  'Mike',    'Marlow',      '', 'P/OF',  'R', 'R', 2021, true, '', ''),
  ('p2',  'James',   'Bennar',      '', 'P',     'R', 'R', 2021, true, '', ''),
  ('p3',  'Clint',   'Spiegel',     '', 'P',     'R', 'R', 2021, true, '', ''),
  ('p4',  'Dwayne',  'Hosey',       '', 'OF',    'R', 'R', 2021, true, '', ''),
  ('p5',  'Tom',     'Blazek',      '', 'OF',    'R', 'R', 2021, true, '', ''),
  ('p6',  'Jerry',   'Wegiel',      '', '3B',    'R', 'R', 2021, true, '', ''),
  ('p7',  'Doug',    'Collins',     '', 'OF',    'R', 'R', 2021, true, '', ''),
  ('p8',  'Doug',    'Otten',       '', '1B',    'R', 'R', 2021, true, '', ''),
  ('p9',  'Dave',    'Boyer',       '', 'OF',    'R', 'R', 2021, true, '', ''),
  ('p10', 'AJ',      '',            '', '',      'R', 'R', 2021, true, '', ''),
  ('p11', 'Roger',   'Hein',        '', '',      'R', 'R', 2023, true, '', ''),
  ('p12', 'Jerry',   'Imig',        '', '',      'R', 'R', 2022, true, '', ''),
  ('p13', 'Mike',    'Gaughen',     '', '',      'R', 'R', 2023, true, '', ''),
  ('p14', 'Mike',    'Shewfelt',    '', '',      'R', 'R', 2024, true, '', ''),
  ('p15', 'Marc',    'Kurz',        '', '',      'R', 'R', 2023, true, '', ''),
  ('p16', 'Jason',   'Becker',      '', '',      'R', 'R', 2024, true, '', ''),
  ('p17', 'Scott',   'Spratlen',    '', 'SS/2B', 'R', 'R', 2024, true, '', 'scottspratlen@gmail.com'),
  ('p18', 'Brian',   'Holbrook',    '', 'DH',    'R', 'R', 2024, true, '', ''),
  ('p19', 'Chad',    'Pfortmiller', '', '',      'R', 'R', 2024, true, '', ''),
  ('p20', 'Scott',   'Frasier',     '', '',      'R', 'R', 2024, true, '', ''),
  ('p21', 'Brad',    'Bell',        '', '',      'R', 'R', 2024, true, '', ''),
  ('p22', 'Yeti',    '',            '', 'OF',    'R', 'R', 2024, true, '', ''),
  ('p23', 'JJ',      'Boedecker',   '', '',      'R', 'R', 2024, true, '', ''),
  ('p24', 'Chris',   'Abeyta',      '', '',      'R', 'R', 2024, true, '', ''),
  ('p25', 'Travis',  'Burbage',     '', '',      'R', 'R', 2024, true, '', ''),
  ('p26', 'Zach',    'Weeks',       '', '',      'R', 'R', 2024, true, '', ''),
  ('p27', 'Joe',     'Williams',    '', '',      'R', 'R', 2024, true, '', ''),
  ('p28', 'Tom',     'Barkhaus',    '', '',      'R', 'R', 2024, true, '', ''),
  ('p29', 'Gabby',   'Duron',       '', 'C',     'R', 'R', 2024, true, '', ''),
  ('p30', 'Todd',    'B.',          '', '',      'R', 'R', 2024, true, '', ''),
  ('p31', 'Chris',   'Gee',         '', '',      'R', 'R', 2024, true, '', ''),
  ('p32', 'Scott',   'Studer',      '', '',      'R', 'R', 2024, true, '', ''),
  ('p33', 'Seth',    'Fairman',     '', '',      'R', 'R', 2024, true, '', ''),
  ('p34', 'Cris',    'Aguilera',    '', '',      'R', 'R', 2024, true, '', ''),
  ('p35', 'Will',    'Williams',    '', '',      'R', 'R', 2024, true, '', ''),
  ('p36', '',        'Thew',        '', '',      'R', 'R', 2024, true, '', ''),
  ('p37', 'Doyle',   'Ollis',       '', '',      'R', 'R', 2024, true, '', ''),
  ('p38', 'Stephen', 'Parks',       '', '',      'R', 'R', 2024, true, '', ''),
  ('p39', 'Orlando', '',            '', '',      'R', 'R', 2024, true, '', ''),
  ('p40', 'Pat',     'Russell',     '', '',      'R', 'R', 2024, true, '', ''),
  ('p41', 'Jeff',    'Harper',      '', '',      'R', 'R', 2024, true, '', ''),
  ('p42', 'Steven',  'Jacobs',      '', '',      'R', 'R', 2024, true, '', ''),
  ('p43', 'Mike',    'McCarthy',    '', '',      'R', 'R', 2024, true, '', ''),
  ('p44', 'Jerome',  'Ritonya',     '', '',      'R', 'R', 2024, true, '', ''),
  ('p45', 'Jay',     'Schubert',    '', '',      'R', 'R', 2024, true, '', ''),
  ('p46', 'Chris',   'Dyer',        '', '',      'R', 'R', 2024, true, '', ''),
  ('p47', 'Scott',   'Urbach',      '', '',      'R', 'R', 2024, true, '', '')
ON CONFLICT (legacy_id) DO NOTHING;

-- ─── SEED: PLAYER_TEAMS ───────────────────────────────────────
-- 55's AAA roster (p1–p16)
INSERT INTO player_teams (player_id, team_id)
  SELECT id, '55s-aaa' FROM players
  WHERE legacy_id IN ('p1','p2','p3','p4','p5','p6','p7','p8','p9','p10','p11','p12','p13','p14','p15','p16')
ON CONFLICT DO NOTHING;

-- 50's AAA roster (p17–p36)
INSERT INTO player_teams (player_id, team_id)
  SELECT id, '50s-aaa' FROM players
  WHERE legacy_id IN ('p17','p18','p19','p20','p21','p22','p23','p24','p25','p26','p27','p28','p29','p30','p31','p32','p33','p34','p35','p36')
ON CONFLICT DO NOTHING;

-- 50's AA roster (p37–p47)
INSERT INTO player_teams (player_id, team_id)
  SELECT id, '50s-aa' FROM players
  WHERE legacy_id IN ('p37','p38','p39','p40','p41','p42','p43','p44','p45','p46','p47')
ON CONFLICT DO NOTHING;
```

- [ ] **Step 3: Apply the SQL to Supabase via MCP**

Use the Supabase MCP `execute_sql` tool with the full content above (or via the Supabase dashboard SQL editor). The SQL uses `CREATE TABLE IF NOT EXISTS` and `ON CONFLICT DO NOTHING`, so it is safe to run multiple times.

Expected result: 5 tables exist (`teams`, `players`, `player_teams`, `tournaments`), RLS enabled on all four, 5 team rows, 47 player rows, 47 player_teams rows (all mapping to their correct team). The `tournament_rsvps` table gains the `fk_rsvps_tournament` FK constraint.

Verify with:
```sql
SELECT COUNT(*) FROM teams;         -- expect 5
SELECT COUNT(*) FROM players;       -- expect 47
SELECT COUNT(*) FROM player_teams;  -- expect 47
SELECT COUNT(*) FROM tournaments;   -- expect 0 (no default seed)
```

- [ ] **Step 4: Commit the SQL file**

```bash
cd "/Users/scottspratlen/Documents/Claude/Projects/Heroes Website/Heroes Website"
git add supabase/players-teams-tournaments-tables.sql
git commit -m "feat: add players/teams/tournaments Supabase tables with RLS and seed data"
```

---

### Task 2: Update data.js

**Files:**
- Modify: `Heroes Website/assets/js/data.js` (lines 455, 492–497, 536–565, insert after line 531)

- [ ] **Step 1: Update DB_COLLECTIONS (line 455)**

Find and replace in `assets/js/data.js`:

Old:
```js
const DB_COLLECTIONS = ['config','teams','players','games','events','news','awards','sponsors','accountRequests','pageLayouts','albums','photos'];
```

New:
```js
const DB_COLLECTIONS = ['config','games','events','news','awards','sponsors','accountRequests','pageLayouts','albums','photos'];
```

- [ ] **Step 2: Add three Supabase sync helpers after `_pushCollectionToSupabase`**

After the closing `}` of `_pushCollectionToSupabase` (currently ending around line 531), insert:

```js
async function _syncTeamsToSupabase(teams) {
  const client = _getClient();
  if (!client) return;
  try {
    const rows = teams.map(t => ({
      id:                t.id,
      name:              t.name,
      short_name:        t.shortName        || null,
      division:          t.division         || null,
      age_group:         t.ageGroup         || null,
      color:             t.color            || null,
      manager:           t.manager          || null,
      assistant_manager: t.assistantManager || null,
    }));
    const { error } = await client.from('teams').upsert(rows, { onConflict: 'id' });
    if (error) { console.error('_syncTeamsToSupabase:', error.message); return; }

    const currentIds = teams.map(t => t.id);
    const { data: existing } = await client.from('teams').select('id');
    const toDelete = (existing || []).map(r => r.id).filter(id => !currentIds.includes(id));
    if (toDelete.length > 0) await client.from('teams').delete().in('id', toDelete);
  } catch(e) {
    console.warn('_syncTeamsToSupabase failed:', e.message);
  }
}

async function _syncPlayersToSupabase(players) {
  const client = _getClient();
  if (!client) return;
  try {
    const rows = players.map(p => ({
      legacy_id:  p.id,
      first_name: p.firstName || '',
      last_name:  p.lastName  || '',
      number:     p.number    || '',
      position:   p.position  || '',
      bats:       p.bats      || 'R',
      throws:     p.throws    || 'R',
      join_year:  p.joinYear  || null,
      active:     p.active    !== false,
      photo:      p.photo     || '',
      email:      (p.email    || '').toLowerCase(),
    }));
    const { error: upsertErr } = await client.from('players')
      .upsert(rows, { onConflict: 'legacy_id' });
    if (upsertErr) { console.error('_syncPlayersToSupabase upsert:', upsertErr.message); return; }

    // Build legacyId → uuid map
    const { data: allPlayers } = await client.from('players').select('id, legacy_id');
    const uuidMap = new Map((allPlayers || []).map(p => [p.legacy_id, p.id]));

    // Rebuild player_teams for every player in the array
    const uuids = players.map(p => uuidMap.get(p.id)).filter(Boolean);
    if (uuids.length > 0) {
      await client.from('player_teams').delete().in('player_id', uuids);
    }
    const ptRows = [];
    for (const p of players) {
      const uuid = uuidMap.get(p.id);
      if (!uuid) continue;
      for (const teamId of (p.teams || [])) {
        ptRows.push({ player_id: uuid, team_id: teamId });
      }
    }
    if (ptRows.length > 0) {
      await client.from('player_teams').insert(ptRows);
    }

    // Delete players removed from the array
    const currentLegacyIds = players.map(p => p.id);
    const toDelete = (allPlayers || [])
      .filter(r => r.legacy_id && !currentLegacyIds.includes(r.legacy_id))
      .map(r => r.id);
    if (toDelete.length > 0) await client.from('players').delete().in('id', toDelete);
  } catch(e) {
    console.warn('_syncPlayersToSupabase failed:', e.message);
  }
}

async function _syncTournamentsToSupabase(tournaments) {
  const client = _getClient();
  if (!client) return;
  try {
    const rows = (tournaments || []).map(t => ({
      id:         t.id,
      name:       t.name,
      team_id:    t.teamId    || null,
      start_date: t.startDate || null,
      end_date:   t.endDate   || null,
      location:   t.location  || null,
      season:     t.season    || null,
      placement:  t.placement || null,
      notes:      t.notes     || null,
    }));
    if (rows.length > 0) {
      const { error } = await client.from('tournaments').upsert(rows, { onConflict: 'id' });
      if (error) { console.error('_syncTournamentsToSupabase:', error.message); return; }
    }

    const currentIds = (tournaments || []).map(t => t.id);
    const { data: existing } = await client.from('tournaments').select('id');
    const toDelete = (existing || []).map(r => r.id).filter(id => !currentIds.includes(id));
    if (toDelete.length > 0) await client.from('tournaments').delete().in('id', toDelete);
  } catch(e) {
    console.warn('_syncTournamentsToSupabase failed:', e.message);
  }
}
```

- [ ] **Step 3: Update saveCollection to dispatch for the three collections**

Find:
```js
function saveCollection(name, value) {
  const data = loadData();
  data[name] = value;
  localStorage.setItem('heroes_data', JSON.stringify(data));
  _pushCollectionToSupabase(name, value);
}
```

Replace with:
```js
function saveCollection(name, value) {
  const data = loadData();
  data[name] = value;
  localStorage.setItem('heroes_data', JSON.stringify(data));
  if (name === 'players')     { _syncPlayersToSupabase(value);     return; }
  if (name === 'teams')       { _syncTeamsToSupabase(value);       return; }
  if (name === 'tournaments') { _syncTournamentsToSupabase(value); return; }
  _pushCollectionToSupabase(name, value);
}
```

- [ ] **Step 4: Update initData() to fetch from the four new tables**

Find the `// Merge Supabase rows into the local data object` block inside `initData()` and replace the entire try block:

Old `initData()` try block (lines ~540–564):
```js
  try {
    const { data: rows, error } = await client
      .from('heroes_data')
      .select('collection, value');

    if (error) { console.warn('Supabase fetch error:', error.message); return; }
    if (!rows || rows.length === 0) {
      // First run — push defaults up to Supabase so other devices get them
      const defaults = JSON.parse(JSON.stringify(HeroesData));
      localStorage.setItem('heroes_data', JSON.stringify(defaults));
      await _pushToSupabase(defaults);
      return;
    }

    // Merge Supabase rows into the local data object
    const base = JSON.parse(JSON.stringify(HeroesData));
    const current = loadData(); // may have unsaved local changes
    const merged = { ...base, ...current };
    rows.forEach(row => { if (row.collection) merged[row.collection] = row.value; });
    if (!merged.accountRequests) merged.accountRequests = [];
    localStorage.setItem('heroes_data', JSON.stringify(merged));
    console.log('✓ Synced from Supabase');
  } catch(e) {
    console.warn('Supabase unavailable, using local cache:', e.message);
  }
```

New try block:
```js
  try {
    const [
      { data: rows,        error: blobErr  },
      { data: playerRows,  error: pErr     },
      { data: ptRows,      error: ptErr    },
      { data: teamRows,    error: tErr     },
      { data: tourneyRows, error: trErr    },
    ] = await Promise.all([
      client.from('heroes_data').select('collection, value'),
      client.from('players').select('*'),
      client.from('player_teams').select('*'),
      client.from('teams').select('*'),
      client.from('tournaments').select('*'),
    ]);

    if (blobErr) { console.warn('Supabase fetch error:', blobErr.message); return; }
    if (pErr)    console.warn('players fetch error:', pErr.message);
    if (ptErr)   console.warn('player_teams fetch error:', ptErr.message);
    if (tErr)    console.warn('teams fetch error:', tErr.message);
    if (trErr)   console.warn('tournaments fetch error:', trErr.message);

    if (!rows || rows.length === 0) {
      // First run — push blob defaults to Supabase so other devices get them
      const defaults = JSON.parse(JSON.stringify(HeroesData));
      localStorage.setItem('heroes_data', JSON.stringify(defaults));
      await _pushToSupabase(defaults);
      return;
    }

    // Merge blob collections into local data
    const base = JSON.parse(JSON.stringify(HeroesData));
    const current = loadData();
    const merged = { ...base, ...current };
    rows.forEach(row => { if (row.collection) merged[row.collection] = row.value; });
    if (!merged.accountRequests) merged.accountRequests = [];
    if (!merged.tournaments)     merged.tournaments = [];

    // Overwrite players, teams, tournaments from their dedicated tables
    if (playerRows && playerRows.length > 0) {
      merged.players = playerRows.map(p => ({
        id:        p.legacy_id || p.id,
        firstName: p.first_name,
        lastName:  p.last_name,
        number:    p.number    || '',
        position:  p.position  || '',
        teams:     (ptRows || []).filter(pt => pt.player_id === p.id).map(pt => pt.team_id),
        bats:      p.bats      || 'R',
        throws:    p.throws    || 'R',
        joinYear:  p.join_year,
        active:    p.active,
        photo:     p.photo     || '',
        email:     p.email     || '',
      }));
    }
    if (teamRows && teamRows.length > 0) {
      merged.teams = teamRows.map(t => ({
        id:               t.id,
        name:             t.name,
        shortName:        t.short_name        || '',
        division:         t.division          || '',
        ageGroup:         t.age_group,
        color:            t.color             || '',
        manager:          t.manager           || '',
        assistantManager: t.assistant_manager || '',
      }));
    }
    if (tourneyRows && tourneyRows.length > 0) {
      merged.tournaments = tourneyRows.map(t => ({
        id:        t.id,
        name:      t.name,
        teamId:    t.team_id,
        startDate: t.start_date,
        endDate:   t.end_date,
        location:  t.location  || '',
        season:    t.season,
        placement: t.placement || null,
        notes:     t.notes     || '',
      }));
    }

    localStorage.setItem('heroes_data', JSON.stringify(merged));
    console.log('✓ Synced from Supabase');
  } catch(e) {
    console.warn('Supabase unavailable, using local cache:', e.message);
  }
```

- [ ] **Step 5: Manual smoke test — verify data.js is syntactically valid**

```bash
node --check "/Users/scottspratlen/Documents/Claude/Projects/Heroes Website/Heroes Website/assets/js/data.js"
```

Expected: no output (syntax valid). If there is an error, fix it before continuing.

- [ ] **Step 6: Commit data.js changes**

```bash
cd "/Users/scottspratlen/Documents/Claude/Projects/Heroes Website/Heroes Website"
git add assets/js/data.js
git commit -m "feat: migrate players/teams/tournaments writes to dedicated Supabase tables"
```

---

### Task 3: Update admin.html — Migrate Data button

**Files:**
- Modify: `Heroes Website/admin.html`

The "Data Management" page is rendered by `renderData()` (around line 4440). We add:
1. A new `migrateDataToSupabase` window function near the other admin functions
2. A new card in the `renderData()` grid for admin users

- [ ] **Step 1: Add `migrateDataToSupabase` function**

Find the closing `};` of `window.doImport` (around line 4488) and insert the following new function immediately after it:

```js
window.migrateDataToSupabase = async function() {
  if (!confirm('Migrate all players, teams, and tournaments from localStorage to Supabase?\n\nThis is safe to run multiple times — existing records will be updated, not duplicated.')) return;
  const data = loadData();
  const playerCount = (data.players   || []).length;
  const teamCount   = (data.teams     || []).length;
  const tourCount   = (data.tournaments || []).length;
  toast('Migrating data to Supabase…');
  try {
    await Promise.all([
      _syncPlayersToSupabase(data.players     || []),
      _syncTeamsToSupabase(data.teams         || []),
      _syncTournamentsToSupabase(data.tournaments || []),
    ]);
    toast(`✓ Migrated ${playerCount} players, ${teamCount} teams, ${tourCount} tournaments`);
  } catch(e) {
    toast('Migration failed: ' + e.message, 'error');
  }
};
```

- [ ] **Step 2: Add the Migrate Data card to `renderData()`**

Find inside `renderData()` the `<div class="admin-form">` block that starts `<div class="admin-form-header"><h3>📤 Deploy Instructions</h3>` and insert the following new card **before** it (they are siblings inside the grid `div`):

```html
      ${['admin','manager','coach'].includes(_adminProfile?.role) ? `
      <div class="admin-form">
        <div class="admin-form-header"><h3>☁️ Migrate Data to Supabase</h3></div>
        <div class="admin-form-body">
          <p style="color:var(--gray);font-size:14px;margin-bottom:16px">Push all players, teams, and tournaments from localStorage into the Supabase relational tables. Run this once after deploying the new database schema. Safe to run multiple times — existing records are updated, not duplicated.</p>
          <button class="btn btn-primary" onclick="migrateDataToSupabase()">Migrate Data to Supabase</button>
        </div>
      </div>
      ` : ''}
```

- [ ] **Step 3: Manual smoke test — verify admin.html has no obvious JS errors**

```bash
node --check "/Users/scottspratlen/Documents/Claude/Projects/Heroes Website/Heroes Website/admin.html" 2>&1 | head -5
```

Note: `node --check` doesn't parse HTML, so any output is expected. The real check is opening the page in a browser. If you can, open admin.html locally and confirm the Data Management page renders without console errors and shows the "Migrate Data to Supabase" card when logged in as admin.

- [ ] **Step 4: Commit admin.html**

```bash
cd "/Users/scottspratlen/Documents/Claude/Projects/Heroes Website/Heroes Website"
git add admin.html
git commit -m "feat: add one-time Migrate Data to Supabase button in Data Management"
```

---

### Task 4: Smoke test, copy to staging, push both repos

**Files:**
- Copy: `Heroes-staging/assets/js/data.js`
- Copy: `Heroes-staging/admin.html`

- [ ] **Step 1: Open the live admin page and verify basic functionality**

Navigate to `https://heroesseniorsoftball.com/admin.html`, log in as admin. Check:
- Players page loads without console errors and shows the full roster
- Teams page shows all 5 teams
- Tournaments page loads (may be empty if no tournaments created yet)
- Data Management page shows the "Migrate Data to Supabase" button

Open browser DevTools → Console. Look for errors related to `_syncPlayersToSupabase`, `player_teams`, or `teams`.

- [ ] **Step 2: Trigger the migration**

On the Data Management page, click "Migrate Data to Supabase". Confirm the prompt. Expect a toast: `✓ Migrated N players, M teams, K tournaments`.

- [ ] **Step 3: Verify Supabase received the migration data**

In the Supabase dashboard SQL editor (or via MCP `execute_sql`):
```sql
SELECT COUNT(*) FROM players;
SELECT COUNT(*) FROM teams;
SELECT COUNT(*) FROM player_teams;
SELECT COUNT(*) FROM tournaments;
```

Players and teams counts should match what was in localStorage. If no custom tournaments were added, tournaments count stays 0.

- [ ] **Step 4: Test a write — add a test player**

In admin.html → Players → Add Player: create a test player named "Test Migration" on any team. After saving, check Supabase:
```sql
SELECT legacy_id, first_name, last_name FROM players ORDER BY created_at DESC LIMIT 3;
SELECT * FROM player_teams ORDER BY player_id DESC LIMIT 3;
```

Expected: new player row exists in `players` with `legacy_id` matching the JS-generated ID, and a row in `player_teams` for their team.

- [ ] **Step 5: Delete the test player**

Delete "Test Migration" from admin.html. Verify in Supabase:
```sql
SELECT * FROM players WHERE first_name = 'Test' AND last_name = 'Migration';
```

Expected: 0 rows (player was deleted from both localStorage and Supabase).

- [ ] **Step 6: Copy data.js to staging**

```bash
cp "/Users/scottspratlen/Documents/Claude/Projects/Heroes Website/Heroes Website/assets/js/data.js" \
   "/Users/scottspratlen/Documents/Claude/Projects/Heroes-staging/assets/js/data.js"
```

- [ ] **Step 7: Copy admin.html to staging**

```bash
cp "/Users/scottspratlen/Documents/Claude/Projects/Heroes Website/Heroes Website/admin.html" \
   "/Users/scottspratlen/Documents/Claude/Projects/Heroes-staging/admin.html"
```

- [ ] **Step 8: Commit and push staging**

```bash
cd "/Users/scottspratlen/Documents/Claude/Projects/Heroes-staging"
git add assets/js/data.js admin.html
git commit -m "feat: migrate players/teams/tournaments to Supabase relational tables"
git push
```

- [ ] **Step 9: Push prod**

```bash
cd "/Users/scottspratlen/Documents/Claude/Projects/Heroes Website/Heroes Website"
git push
```

Expected: both pushes succeed, GitHub Pages redeploys within ~30 seconds.
