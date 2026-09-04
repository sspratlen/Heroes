# Full Supabase Migration Design

## Goal

Move all remaining localStorage-only data to Supabase as the sole source of truth, with a reliable backup mechanism before any changes are made.

## Context

The app uses a hybrid storage model:
- **Supabase `heroes_data` table**: JSON blobs for config, games, events, news, awards, sponsors, accountRequests, pageLayouts, albums, photos
- **Supabase dedicated tables**: players, teams, player_teams, tournaments
- **localStorage `heroes_data`**: Read-cache of Supabase data — not a concern
- **localStorage fan preferences (per user)**: Each user's attending event IDs and favorite team IDs, keyed by their auth user ID — the only data not in Supabase

All admin mutations already write to Supabase correctly (player fix applied in previous session). The only remaining gap is fan preferences.

Previous data-loss incident: `HeroesData` in data.js contained dummy data that overwrote Supabase on first run. Already mitigated — all arrays are now empty `[]`.

## Architecture

### Phase 1: Enhanced Backup

**`data.js` — `exportFromSupabase()` async function**

Queries Supabase directly (bypasses localStorage cache) across all tables:
- `heroes_data` rows (config, games, events, etc.)
- `players`, `teams`, `player_teams`, `tournaments`
- `fan_preferences`

Merges into a single JSON object and triggers a browser download as `heroes-backup-YYYY-MM-DD.json`.

Restore path: existing `importData()` handles blob data restoration. Fan preferences can be restored by re-running the fan data upsert path.

**`admin.html` — Backup button**

One new button in the sidebar under the existing "Export Data" entry, labeled "Supabase Backup". Calls `exportFromSupabase()`, shows brief loading state during download.

### Phase 2: Fan Preferences Schema

**New Supabase table: `fan_preferences`**

```sql
create table if not exists fan_preferences (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  attending  jsonb not null default '[]',
  favorites  jsonb not null default '[]',
  updated_at timestamptz not null default now()
);

alter table fan_preferences enable row level security;

create policy "Users manage their own fan preferences"
  on fan_preferences for all
  to authenticated
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

One row per user. Arrays store IDs (event IDs for `attending`, team legacy IDs for `favorites`). Cascade delete removes preferences when a user account is deleted.

**Migration file:** `supabase/migrations/20260904_fan_preferences.sql`

### Phase 3: `auth.js` Changes

**New `_fanCache` property**

`_fanCache: null` — holds `{ attending: [], favorites: [] }` for the active session. Null means "not yet loaded from Supabase."

**Updated `_fanData()` — cache-first reads**

```
if (_fanCache is set) → return _fanCache
else → read from localStorage (fallback for anonymous users or pre-init)
```

All existing synchronous callers — `getAttendingEvents()`, `isAttendingEvent()`, `getFavoriteTeams()`, `toggleAttendingEvent()` — work without modification.

**Updated `_saveFanData(d)` — dual write**

1. Write to localStorage immediately (keeps toggles snappy)
2. Update `_fanCache`
3. Async upsert to `fan_preferences` in the background (fire-and-forget, same pattern as `_pushToSupabase()`)

**New `_loadFanDataFromSupabase()` async**

Called during login init, right before `_initialized = true`:

1. Query `fan_preferences` where `user_id = auth.uid()`
2. **Row exists** → set `_fanCache`, sync to localStorage
3. **No row** → read localStorage for existing fan data
   - If localStorage has attending or favorites → upsert to Supabase (one-time migration), set `_fanCache`
   - If empty → set `_fanCache = { attending: [], favorites: [] }`

**Sign-out cleanup**

Set `_fanCache = null` on sign-out so the next user gets a fresh load.

**Init sequence (after change)**

```
onAuthStateChange →
  session loaded →
    fetch profile →
      _loadFanDataFromSupabase() ← new
        _initialized = true
```

## Data Flow

```
Fan toggle click
  → toggleAttendingEvent(eid)
    → _fanData() reads _fanCache (sync, fast)
    → mutates array
    → _saveFanData(d)
        → localStorage.setItem (immediate)
        → _fanCache = d (immediate)
        → fan_preferences upsert (async, background)
  → UI re-renders with updated cache
```

## What Does NOT Change

- `loadData()` / `saveData()` / `saveCollection()` — unchanged
- `initData()` — unchanged
- All admin mutation calls — already correct after player fix
- `app.js` / `heroes-scoreboard.js` callers of `getAttendingEvents()` — unchanged
- `HeroesAuth._initialized` flag timing — still reliable, just extended slightly by the Supabase fetch

## Files Changed

| File | Change |
|------|--------|
| `supabase/migrations/20260904_fan_preferences.sql` | New — fan_preferences table + RLS |
| `assets/js/data.js` | New `exportFromSupabase()` function |
| `assets/js/auth.js` | `_fanCache`, updated `_fanData()`, `_saveFanData()`, new `_loadFanDataFromSupabase()`, sign-out cleanup |
| `admin.html` | New Supabase Backup button in sidebar |

Both repos (prod + staging) receive identical changes.

## Success Criteria

1. After login, a user's attending events survive a localStorage clear and a device switch
2. Toggling attending on an event persists after page refresh with empty localStorage
3. The Supabase Backup button downloads a complete JSON snapshot that includes all table data
4. Existing users' localStorage fan data is auto-migrated to Supabase on first login after the update
5. No regressions: anonymous browsing, admin functions, player/team/game mutations all continue to work
