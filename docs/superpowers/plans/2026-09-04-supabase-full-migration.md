# Full Supabase Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move fan preferences (attending events + favorite teams) from per-device localStorage to Supabase, and add a reliable Supabase-direct backup button to admin.

**Architecture:** A new `fan_preferences` Supabase table (one row per user) stores each user's attending/favorites arrays. `HeroesAuth` gains an in-memory `_fanCache` populated on login from Supabase; all synchronous callers continue working unchanged. On first login after the update, any localStorage fan data is auto-migrated to Supabase. The admin topbar gains a "Supabase Backup" button that queries all tables directly (bypassing the localStorage cache) and downloads a complete JSON snapshot.

**Tech Stack:** Vanilla JS, Supabase JS v2 (`supabase.createClient`), HTML/CSS. Two repos: prod at `Heroes Website/Heroes Website/`, staging at `Heroes-staging/`. Both receive identical changes.

**Repo paths used throughout this plan:**
- Prod: `/Users/scottspratlen/Documents/Claude/Projects/Heroes Website/Heroes Website/`
- Staging: `/Users/scottspratlen/Documents/Claude/Projects/Heroes-staging/`

---

### Task 1: SQL Migration File for `fan_preferences`

> The `fan_preferences` table was already applied to the prod Supabase project by the user. This task creates the migration file for staging consistency and documentation.

**Files:**
- Create: `supabase/migrations/20260904_fan_preferences.sql` (prod repo)

- [ ] **Step 1: Create the migration SQL file**

Create `/Users/scottspratlen/Documents/Claude/Projects/Heroes Website/Heroes Website/supabase/migrations/20260904_fan_preferences.sql` with this exact content:

```sql
-- Fan preferences: per-user attending events and favorite teams
-- Moved from localStorage (per-device) to Supabase (cross-device, persistent)
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

- [ ] **Step 2: Copy migration file to staging repo**

```bash
cp "/Users/scottspratlen/Documents/Claude/Projects/Heroes Website/Heroes Website/supabase/migrations/20260904_fan_preferences.sql" \
   "/Users/scottspratlen/Documents/Claude/Projects/Heroes-staging/supabase/migrations/20260904_fan_preferences.sql"
```

- [ ] **Step 3: Commit in prod repo**

```bash
cd "/Users/scottspratlen/Documents/Claude/Projects/Heroes Website/Heroes Website"
git add supabase/migrations/20260904_fan_preferences.sql
git commit -m "feat: add fan_preferences migration (already applied to prod)"
```

- [ ] **Step 4: Verify file exists in both repos**

```bash
ls "/Users/scottspratlen/Documents/Claude/Projects/Heroes Website/Heroes Website/supabase/migrations/20260904_fan_preferences.sql"
ls "/Users/scottspratlen/Documents/Claude/Projects/Heroes-staging/supabase/migrations/20260904_fan_preferences.sql"
```

Expected: both paths print without error.

---

### Task 2: `exportFromSupabase()` in `data.js`

**Files:**
- Modify: `assets/js/data.js` (prod repo, after the existing `exportData()` function)

- [ ] **Step 1: Locate the insertion point in data.js**

Open `assets/js/data.js`. Find the `exportData()` function — it ends with `}` followed by a blank line before `function importData`. Insert the new function between `exportData` and `importData`.

- [ ] **Step 2: Add `exportFromSupabase()` after `exportData()`**

After the closing `}` of `exportData()`, add:

```js
async function exportFromSupabase() {
  const client = _getClient();
  if (!client) { alert('Supabase not configured'); return; }
  const btn = document.getElementById('topbar-backup-btn');
  if (btn) { btn.disabled = true; btn.textContent = '☁ Backing up…'; }
  try {
    const [
      { data: blobRows },
      { data: playerRows },
      { data: teamRows },
      { data: ptRows },
      { data: tourneyRows },
      { data: fanRows },
    ] = await Promise.all([
      client.from('heroes_data').select('collection, value, updated_at'),
      client.from('players').select('*'),
      client.from('teams').select('*'),
      client.from('player_teams').select('*'),
      client.from('tournaments').select('*'),
      client.from('fan_preferences').select('*'),
    ]);

    const snapshot = {
      exported_at: new Date().toISOString(),
      heroes_data: {},
      players: playerRows || [],
      teams: teamRows || [],
      player_teams: ptRows || [],
      tournaments: tourneyRows || [],
      fan_preferences: fanRows || [],
    };
    (blobRows || []).forEach(r => { snapshot.heroes_data[r.collection] = r.value; });

    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `heroes-supabase-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  } catch(e) {
    console.error('exportFromSupabase error:', e.message);
    alert('Backup failed: ' + e.message);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '☁ Supabase Backup'; }
  }
}
```

- [ ] **Step 3: Verify the function is syntactically correct**

```bash
node --check "/Users/scottspratlen/Documents/Claude/Projects/Heroes Website/Heroes Website/assets/js/data.js" 2>&1
```

Expected: no output (no syntax errors). If node complains about browser globals like `supabase`, that's expected — the check will fail on that. Instead just visually confirm the braces balance and the function is properly closed.

- [ ] **Step 4: Commit**

```bash
cd "/Users/scottspratlen/Documents/Claude/Projects/Heroes Website/Heroes Website"
git add assets/js/data.js
git commit -m "feat: add exportFromSupabase() backup function to data.js"
```

---

### Task 3: Backup Button in `admin.html`

**Files:**
- Modify: `admin.html` — topbar-actions div (prod repo, line ~134)

- [ ] **Step 1: Add the backup button to the topbar**

In `admin.html`, find this exact block (around line 133–135):

```html
        <button class="btn btn-sm btn-secondary" id="topbar-export-btn" onclick="exportData()">⬇ Export Data</button>
        <button class="btn btn-sm btn-primary" id="topbar-add-btn" onclick="triggerAddNew()">+ Add New</button>
```

Replace it with:

```html
        <button class="btn btn-sm btn-secondary" id="topbar-export-btn" onclick="exportData()">⬇ Export Data</button>
        <button class="btn btn-sm btn-secondary" id="topbar-backup-btn" onclick="exportFromSupabase()" title="Download complete Supabase backup">☁ Supabase Backup</button>
        <button class="btn btn-sm btn-primary" id="topbar-add-btn" onclick="triggerAddNew()">+ Add New</button>
```

- [ ] **Step 2: Commit**

```bash
cd "/Users/scottspratlen/Documents/Claude/Projects/Heroes Website/Heroes Website"
git add admin.html
git commit -m "feat: add Supabase Backup button to admin topbar"
```

---

### Task 4: `auth.js` — Fan Data to Supabase

This is the main change. Four sub-parts: (a) add the cache property, (b) refactor `_fanData` / `_saveFanData`, (c) add `_loadFanDataFromSupabase`, (d) wire it into init and sign-out.

**Files:**
- Modify: `assets/js/auth.js` (prod repo)

#### Part A: Add `_fanCache` property

- [ ] **Step 1: Add `_fanCache: null` to the HeroesAuth object**

In `auth.js`, find the top of the `HeroesAuth` object. The object starts with `const HeroesAuth = {`. The first property is `_initialized: false` (around line 36). Add `_fanCache` immediately after `_initialized`:

Find:
```js
  _initialized: false,
```

Replace with:
```js
  _initialized: false,
  _fanCache: null,
```

#### Part B: Refactor fan data read/write methods

- [ ] **Step 2: Replace the fan data block**

Find this exact block (lines ~183–197 in auth.js):

```js
  // ── Fan data (stored in localStorage per user) ────────────
  _fanKey() {
    const uid = this._profile?.id || this._session?.user?.id;
    return uid ? `heroes_fan_${uid}` : null;
  },
  _fanData() {
    const key = this._fanKey();
    if (!key) return { favorites: [], attending: [] };
    try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch(e) { return {}; }
  },
  _saveFanData(d) {
    const key = this._fanKey();
    if (!key) return;
    try { localStorage.setItem(key, JSON.stringify(d)); } catch(e) {}
  },
```

Replace it with:

```js
  // ── Fan data (Supabase-backed, localStorage for offline fallback) ──
  _fanKey() {
    const uid = this._profile?.id || this._session?.user?.id;
    return uid ? `heroes_fan_${uid}` : null;
  },
  _fanDataFromLocalStorage() {
    const key = this._fanKey();
    if (!key) return { favorites: [], attending: [] };
    try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch(e) { return {}; }
  },
  _fanData() {
    if (this._fanCache) return this._fanCache;
    return this._fanDataFromLocalStorage();
  },
  _saveFanData(d) {
    // Write to localStorage immediately (keeps toggles snappy)
    const key = this._fanKey();
    if (key) { try { localStorage.setItem(key, JSON.stringify(d)); } catch(e) {} }
    // Update in-memory cache
    this._fanCache = d;
    // Push to Supabase in background (fire-and-forget)
    const uid = this._profile?.id || this._session?.user?.id;
    if (!uid) return;
    const sb = _getClient();
    if (!sb) return;
    sb.from('fan_preferences').upsert(
      { user_id: uid, attending: d.attending || [], favorites: d.favorites || [], updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    ).then(({ error }) => {
      if (error) console.warn('[HeroesAuth] fan_preferences upsert error:', error.message);
    });
  },
  async _loadFanDataFromSupabase() {
    const sb = _getClient();
    const uid = this._profile?.id || this._session?.user?.id;
    if (!sb || !uid) return;
    try {
      const { data } = await sb
        .from('fan_preferences')
        .select('attending, favorites')
        .eq('user_id', uid)
        .single();
      if (data) {
        // Row found — Supabase is source of truth
        this._fanCache = { attending: data.attending || [], favorites: data.favorites || [] };
        const key = this._fanKey();
        if (key) { try { localStorage.setItem(key, JSON.stringify(this._fanCache)); } catch(e) {} }
      } else {
        // No Supabase row yet — check localStorage for one-time migration
        const local = this._fanDataFromLocalStorage();
        const hasData = (local.attending?.length || 0) + (local.favorites?.length || 0) > 0;
        if (hasData) {
          await sb.from('fan_preferences').upsert(
            { user_id: uid, attending: local.attending || [], favorites: local.favorites || [], updated_at: new Date().toISOString() },
            { onConflict: 'user_id' }
          );
        }
        this._fanCache = { attending: local.attending || [], favorites: local.favorites || [] };
      }
    } catch(e) {
      console.warn('[HeroesAuth] _loadFanDataFromSupabase error (using localStorage):', e.message);
      this._fanCache = this._fanDataFromLocalStorage();
    }
  },
```

#### Part C: Wire `_loadFanDataFromSupabase` into `init()`

- [ ] **Step 3: Update `init()` to load fan data on startup**

In `init()`, find (lines ~62–64):

```js
      if (session?.user) {
        await this._loadProfile(session.user.id);
      }
```

Replace with:

```js
      if (session?.user) {
        await this._loadProfile(session.user.id);
        await this._loadFanDataFromSupabase();
      }
```

#### Part D: Wire into `onAuthStateChange` and sign-out

- [ ] **Step 4: Update `onAuthStateChange` to load fan data on login and clear it on logout**

In the `onAuthStateChange` callback, find (lines ~95–100):

```js
      if (session?.user) {
        await this._loadProfile(session.user.id);
      } else {
        this._profile = null;
      }
      this.refreshNavAuth();
```

Replace with:

```js
      if (session?.user) {
        await this._loadProfile(session.user.id);
        await this._loadFanDataFromSupabase();
      } else {
        this._profile = null;
        this._fanCache = null;
      }
      this.refreshNavAuth();
```

- [ ] **Step 5: Clear `_fanCache` in `signOut()`**

In `signOut()`, find (lines ~300–302):

```js
    this._session = null;
    this._profile = null;
    this._initialized = false;
```

Replace with:

```js
    this._session = null;
    this._profile = null;
    this._fanCache = null;
    this._initialized = false;
```

- [ ] **Step 6: Commit auth.js changes**

```bash
cd "/Users/scottspratlen/Documents/Claude/Projects/Heroes Website/Heroes Website"
git add assets/js/auth.js
git commit -m "feat: persist fan preferences (attending/favorites) to Supabase

- Add _fanCache for in-memory storage after login
- _fanData() reads cache first, falls back to localStorage (anonymous users)
- _saveFanData() dual-writes: localStorage immediately + Supabase async
- _loadFanDataFromSupabase() fetches on login, auto-migrates localStorage data
- Clear _fanCache on sign-out"
```

#### Verification

- [ ] **Step 7: Verify the changes manually**

Open the live site (or local file) as a logged-in fan user:

1. Open DevTools → Application → Local Storage. Note which events are currently marked attending.
2. Open DevTools → Network. Look for a request to `fan_preferences` after page load — it should appear as a SELECT query to Supabase.
3. Toggle an event's attending status. Look for a `fan_preferences` UPSERT request in the Network tab.
4. Clear all localStorage (`localStorage.clear()` in DevTools console), then reload. The attending events should still show correctly (loaded from Supabase).

---

### Task 5: Copy to Staging and Push Both Repos

**Files:** All changed files copied to staging repo.

- [ ] **Step 1: Copy changed files to staging**

```bash
cp "/Users/scottspratlen/Documents/Claude/Projects/Heroes Website/Heroes Website/assets/js/data.js" \
   "/Users/scottspratlen/Documents/Claude/Projects/Heroes-staging/assets/js/data.js"

cp "/Users/scottspratlen/Documents/Claude/Projects/Heroes Website/Heroes Website/assets/js/auth.js" \
   "/Users/scottspratlen/Documents/Claude/Projects/Heroes-staging/assets/js/auth.js"

cp "/Users/scottspratlen/Documents/Claude/Projects/Heroes Website/Heroes Website/admin.html" \
   "/Users/scottspratlen/Documents/Claude/Projects/Heroes-staging/admin.html"
```

- [ ] **Step 2: Commit staging changes**

```bash
cd "/Users/scottspratlen/Documents/Claude/Projects/Heroes-staging"
git add assets/js/data.js assets/js/auth.js admin.html supabase/migrations/20260904_fan_preferences.sql
git commit -m "feat: full Supabase migration — fan preferences + backup button"
```

- [ ] **Step 3: Push prod repo**

```bash
cd "/Users/scottspratlen/Documents/Claude/Projects/Heroes Website/Heroes Website"
git push
```

- [ ] **Step 4: Push staging repo**

```bash
cd "/Users/scottspratlen/Documents/Claude/Projects/Heroes-staging"
git push
```

- [ ] **Step 5: Verify both pushes succeeded**

```bash
cd "/Users/scottspratlen/Documents/Claude/Projects/Heroes Website/Heroes Website" && git log --oneline -4
cd "/Users/scottspratlen/Documents/Claude/Projects/Heroes-staging" && git log --oneline -4
```

Expected: both show the new commits at the top.
