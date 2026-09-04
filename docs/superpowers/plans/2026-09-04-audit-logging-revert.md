# Audit Logging + Revert/Restore Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend audit_log with before/after snapshots and changed_by, fill coverage gaps across all data collections, and add a ↩ Restore button on the audit log page.

**Architecture:** Add `previous_value jsonb`, `new_value jsonb`, and `changed_by text` columns to `audit_log` via SQL migration. Update `auditLog()` to populate them automatically. Wire snapshot capture into every save call site in `admin.html`. Add `restoreFromAudit()` and update the audit log table UI.

**Tech Stack:** Vanilla JS, Supabase JS v2, HTML/CSS. Two repos: prod at `Heroes Website/Heroes Website/`, staging at `Heroes-staging/`. Both receive identical changes.

**Repo paths:**
- Prod: `/Users/scottspratlen/Documents/Claude/Projects/Heroes Website/Heroes Website/`
- Staging: `/Users/scottspratlen/Documents/Claude/Projects/Heroes-staging/`

---

### Task 1: SQL Migration

**Files:**
- Create: `supabase/migrations/20260904_audit_log_snapshots.sql` (prod repo)

- [ ] **Step 1: Create the migration file**

Create `/Users/scottspratlen/Documents/Claude/Projects/Heroes Website/Heroes Website/supabase/migrations/20260904_audit_log_snapshots.sql` with this exact content:

```sql
-- Extend audit_log with before/after snapshots and display name
alter table audit_log
  add column if not exists previous_value jsonb,
  add column if not exists new_value      jsonb,
  add column if not exists changed_by     text;
```

- [ ] **Step 2: Copy to staging**

```bash
cp "/Users/scottspratlen/Documents/Claude/Projects/Heroes Website/Heroes Website/supabase/migrations/20260904_audit_log_snapshots.sql" \
   "/Users/scottspratlen/Documents/Claude/Projects/Heroes-staging/supabase/migrations/20260904_audit_log_snapshots.sql"
```

- [ ] **Step 3: Commit in prod**

```bash
cd "/Users/scottspratlen/Documents/Claude/Projects/Heroes Website/Heroes Website"
git add supabase/migrations/20260904_audit_log_snapshots.sql
git commit -m "feat: add audit_log snapshot columns migration"
```

- [ ] **Step 4: Tell the user to run it**

The user must run this SQL in the Supabase dashboard (SQL Editor) for the prod project before the new columns will work. Post a reminder — the migration file is the source of truth. The app will still function without running it (errors are caught in auditLog), but restore won't work until the columns exist.

---

### Task 2: Update `auditLog()` Function

**Files:**
- Modify: `admin.html` (prod repo) — lines 493–511

The current function:
```js
async function auditLog(action, collection, recordId, summary) {
  try {
    const sb = _getClient();
    if (!sb) return;
    let userEmail = 'unknown', userId = null;
    try {
      if (typeof HeroesAuth !== 'undefined') {
        const prof = HeroesAuth.getProfile();
        const sess = HeroesAuth.getSession();
        userEmail = prof?.email || sess?.user?.email || 'unknown';
        userId = sess?.user?.id || null;
      }
    } catch(_) {}
    await sb.from('audit_log').insert({
      user_email: userEmail, user_id: userId,
      action, collection, record_id: String(recordId || ''), summary: summary || ''
    });
  } catch(e) { console.warn('audit log skipped (table may not exist yet):', e.message); }
}
```

- [ ] **Step 1: Replace `auditLog()` with the updated version**

Find the block above (lines 493–511) and replace it with:

```js
async function auditLog(action, collection, recordId, summary, opts = {}) {
  try {
    const sb = _getClient();
    if (!sb) return;
    let userEmail = 'unknown', userId = null, changedBy = null;
    try {
      if (typeof HeroesAuth !== 'undefined') {
        const prof = HeroesAuth.getProfile();
        const sess = HeroesAuth.getSession();
        userEmail = prof?.email || sess?.user?.email || 'unknown';
        userId    = sess?.user?.id || null;
        changedBy = prof?.display_name || prof?.email || null;
      }
    } catch(_) {}
    await sb.from('audit_log').insert({
      user_email:     userEmail,
      user_id:        userId,
      changed_by:     changedBy,
      action, collection,
      record_id:      String(recordId || ''),
      summary:        summary || '',
      previous_value: opts.previousValue ?? null,
      new_value:      opts.newValue      ?? null,
    });
  } catch(e) { console.warn('audit log skipped:', e.message); }
}
```

- [ ] **Step 2: Verify syntax**

```bash
node --check "/Users/scottspratlen/Documents/Claude/Projects/Heroes Website/Heroes Website/admin.html" 2>&1 | head -5
```

Expected: no output (browser globals like `supabase` may warn but that's fine — we only care about syntax errors). If there are syntax errors, fix them before continuing.

- [ ] **Step 3: Commit**

```bash
cd "/Users/scottspratlen/Documents/Claude/Projects/Heroes Website/Heroes Website"
git add admin.html
git commit -m "feat: update auditLog() with snapshot opts and changed_by"
```

---

### Task 3: Add Snapshots to Existing auditLog Calls

**Files:**
- Modify: `admin.html` (prod repo)

This task updates 18 existing `auditLog()` call sites to pass `previousValue`/`newValue`. Do them in order. After all changes, do one commit at the end.

#### 3a — `player_add` (line ~1094)

Find:
```js
    saveCollection('players', d.players); auditLog('player_add', 'players', id, `${val('pf-first')} ${val('pf-last')}`); closeModal(); renderPlayers(); toast('Player added!');
```

The new player object is built inline in the `d.players.push({...})` call just above. Restructure the add block so the object is captured in a variable:

Find the full push block:
```js
    const id = 'p' + Date.now();
    d.players.push({
      id, firstName: val('pf-first'), lastName: val('pf-last'), number: val('pf-num'),
      position: val('pf-pos'), teams: Array.from(document.querySelectorAll('.pf-team:checked')).map(c=>c.value),
      bats: val('pf-bats'), throws: val('pf-throws'), joinYear: parseInt(val('pf-year')||new Date().getFullYear()),
      active: document.getElementById('pf-active').checked, photo: val('pf-photo'), email: val('pf-email'),
      credentials: { username: '', password: '' }
    });
    saveCollection('players', d.players); auditLog('player_add', 'players', id, `${val('pf-first')} ${val('pf-last')}`); closeModal(); renderPlayers(); toast('Player added!');
```

Replace with:
```js
    const id = 'p' + Date.now();
    const newPlayer = {
      id, firstName: val('pf-first'), lastName: val('pf-last'), number: val('pf-num'),
      position: val('pf-pos'), teams: Array.from(document.querySelectorAll('.pf-team:checked')).map(c=>c.value),
      bats: val('pf-bats'), throws: val('pf-throws'), joinYear: parseInt(val('pf-year')||new Date().getFullYear()),
      active: document.getElementById('pf-active').checked, photo: val('pf-photo'), email: val('pf-email'),
      credentials: { username: '', password: '' }
    };
    d.players.push(newPlayer);
    saveCollection('players', d.players); auditLog('player_add', 'players', id, `${val('pf-first')} ${val('pf-last')}`, { previousValue: null, newValue: newPlayer }); closeModal(); renderPlayers(); toast('Player added!');
```

#### 3b — `player_edit` (lines ~1113–1125)

The callback opens with `const d = loadData()` and `const idx = ...`. Add a `before` capture immediately after finding `idx`:

Find inside the `editPlayer` modal callback:
```js
    const d = loadData();
    const idx = d.players.findIndex(x => x.id === id);
    const email = val('pf-email');
    d.players[idx] = { ...d.players[idx],
```

Replace with:
```js
    const d = loadData();
    const idx = d.players.findIndex(x => x.id === id);
    const before = d.players[idx] ? { ...d.players[idx] } : null;
    const email = val('pf-email');
    d.players[idx] = { ...d.players[idx],
```

Then find:
```js
    saveCollection('players', d.players);
    auditLog('player_edit', 'players', id, `${val('pf-first')} ${val('pf-last')}`);
```

Replace with:
```js
    saveCollection('players', d.players);
    auditLog('player_edit', 'players', id, `${val('pf-first')} ${val('pf-last')}`, { previousValue: before, newValue: d.players[idx] });
```

#### 3c — `player_deactivate` (line ~1170)

Find:
```js
  saveCollection('players', d.players); auditLog('player_deactivate', 'players', id, `${p.firstName} ${p.lastName}`); renderPlayers(); toast('Player removed');
```

The function already has `p` = the player before deactivation. Replace with:
```js
  saveCollection('players', d.players); auditLog('player_deactivate', 'players', id, `${p.firstName} ${p.lastName}`, { previousValue: { ...p, active: true }, newValue: d.players.find(x=>x.id===id) }); renderPlayers(); toast('Player removed');
```

#### 3d — `player_reactivate` (line ~1177)

Find:
```js
  saveCollection('players', d.players); auditLog('player_reactivate', 'players', id, `${rp.firstName} ${rp.lastName}`); renderPlayers(); toast('Player reactivated');
```

Replace with:
```js
  saveCollection('players', d.players); auditLog('player_reactivate', 'players', id, `${rp.firstName} ${rp.lastName}`, { previousValue: { ...rp, active: false }, newValue: d.players.find(x=>x.id===id) }); renderPlayers(); toast('Player reactivated');
```

#### 3e — `player_delete` (lines ~826–827)

Find:
```js
        // Remove from players list and sync to Supabase
        const fresh = loadData();
        fresh.players = fresh.players.filter(x => x.id !== playerId);
        saveCollection('players', fresh.players);
        auditLog('player_delete', 'players', playerId, fullName);
```

Replace with:
```js
        // Remove from players list and sync to Supabase
        const fresh = loadData();
        const deletedPlayer = fresh.players.find(x => x.id === playerId) || null;
        fresh.players = fresh.players.filter(x => x.id !== playerId);
        saveCollection('players', fresh.players);
        auditLog('player_delete', 'players', playerId, fullName, { previousValue: deletedPlayer, newValue: null });
```

#### 3f — `roster_add` (line ~758)

Find:
```js
  saveCollection('players', d.players); auditLog('roster_add', 'players', playerId, `Added to team ${teamId}`); renderPlayers(); toast('Player added to roster!');
```

This is inside a function that has `d = loadData()` and modifies a player. Find the player before the roster change was applied. Look at the surrounding code context — the player is found with `const p = d.players.find(...)` before being mutated. Capture before/after:

Find the full roster_add block. It will look something like:
```js
  const p = d.players.find(x=>x.id===playerId);
  if (!p) return;
  if (!p.teams) p.teams = [];
  if (p.teams.includes(teamId)) { toast('Already on this team'); return; }
  const before = { ...p, teams: [...(p.teams||[])] };
  p.teams.push(teamId);
  saveCollection('players', d.players); auditLog('roster_add', 'players', playerId, `Added to team ${teamId}`); renderPlayers(); toast('Player added to roster!');
```

If `before` is not yet captured, add `const before = { ...p, teams: [...(p.teams||[])] };` before `p.teams.push(teamId)`, then replace the auditLog call with:
```js
  saveCollection('players', d.players); auditLog('roster_add', 'players', playerId, `Added to team ${teamId}`, { previousValue: before, newValue: { ...p } }); renderPlayers(); toast('Player added to roster!');
```

Read lines 750–770 to see the exact current code before making this edit.

#### 3g — `roster_remove` (line ~767)

Same pattern as 3f. Capture `before` = player with the team in its teams array, `after` = player after filter. Replace the auditLog call with:
```js
  saveCollection('players', d.players); auditLog('roster_remove', 'players', playerId, `Removed from team ${teamId}`, { previousValue: before, newValue: { ...p } }); renderPlayers(); toast('Player removed from roster');
```

Read lines 760–770 for the exact current code.

#### 3h — `team_add` (line ~1445)

Find:
```js
    saveCollection('teams', d.teams); auditLog('team_add', 'teams', tid, val('tf-name')); closeModal(); renderTeams(); toast('Team added!');
```

The team object is built inline in a `d.teams.push({...})` just above. Refactor to capture it:

Find the push block (it will be something like):
```js
    const tid = 't'+Date.now();
    d.teams.push({ id: tid, name: val('tf-name'), ... });
    saveCollection('teams', d.teams); auditLog('team_add', 'teams', tid, val('tf-name')); closeModal(); renderTeams(); toast('Team added!');
```

Read lines 1435–1450 for the exact structure, then replace with a pattern that captures `newTeam`:
```js
    const tid = 't'+Date.now();
    const newTeam = { id: tid, name: val('tf-name'), /* all other fields as they currently appear */ };
    d.teams.push(newTeam);
    saveCollection('teams', d.teams); auditLog('team_add', 'teams', tid, val('tf-name'), { previousValue: null, newValue: newTeam }); closeModal(); renderTeams(); toast('Team added!');
```

#### 3i — `team_edit` (line ~1453)

Find:
```js
    saveCollection('teams', d.teams); auditLog('team_edit', 'teams', id, val('tf-name')); closeModal(); renderTeams(); toast('Team updated!');
```

Add `before` capture before the edit. The edit callback loads `d = loadData()` and finds `idx`. Add capture immediately after finding `idx`:

Read lines 1445–1460 to see the exact callback structure, then add:
```js
    const before = d.teams[idx] ? { ...d.teams[idx] } : null;
```

before the `d.teams[idx] = { ...` assignment, and update the auditLog call:
```js
    saveCollection('teams', d.teams); auditLog('team_edit', 'teams', id, val('tf-name'), { previousValue: before, newValue: d.teams[idx] }); closeModal(); renderTeams(); toast('Team updated!');
```

#### 3j — `team_delete` (line ~1458)

Find:
```js
  const d = loadData(); const dt = d.teams.find(t=>t.id===id); d.teams = d.teams.filter(t=>t.id!==id); saveCollection('teams', d.teams); auditLog('team_delete', 'teams', id, dt?.name||id); renderTeams(); toast('Team deleted');
```

Replace with:
```js
  const d = loadData(); const dt = d.teams.find(t=>t.id===id); d.teams = d.teams.filter(t=>t.id!==id); saveCollection('teams', d.teams); auditLog('team_delete', 'teams', id, dt?.name||id, { previousValue: dt || null, newValue: null }); renderTeams(); toast('Team deleted');
```

#### 3k — `game_add` (line ~1586)

Find the game push block and auditLog call. Read lines 1578–1592 to see the exact game object fields, then capture `newGame`:

Pattern:
```js
    const gid = 'g'+Date.now();
    const newGame = { id: gid, /* all current fields */ };
    d.games.push(newGame);
    saveCollection('games', d.games); auditLog('game_add', 'games', gid, `${val('gf-date')} vs ${val('gf-opp')}`, { previousValue: null, newValue: newGame }); closeModal(); renderGames(); toast('Game added!');
```

Read lines 1578–1592 for the current game object structure before editing.

#### 3l — `game_edit` (line ~1601)

Add `before` capture after finding `idx` in the edit callback. Read lines 1592–1607 for the exact callback, then add:
```js
    const before = d.games[idx] ? { ...d.games[idx] } : null;
```

before the `d.games[idx] = { ...` assignment, then update auditLog:
```js
    saveCollection('games', d.games); auditLog('game_edit', 'games', id, `${val('gf-date')} vs ${val('gf-opp')}`, { previousValue: before, newValue: d.games[idx] }); closeModal(); renderGames(); toast('Game updated!');
```

#### 3m — `game_delete` (line ~1607)

Find:
```js
  const d = loadData(); const dg = d.games.find(g=>g.id===id); d.games = d.games.filter(g=>g.id!==id); saveCollection('games', d.games); auditLog('game_delete', 'games', id, dg ? `${dg.date} vs ${dg.opponent}` : id); renderGames(); toast('Game deleted');
```

Replace with:
```js
  const d = loadData(); const dg = d.games.find(g=>g.id===id); d.games = d.games.filter(g=>g.id!==id); saveCollection('games', d.games); auditLog('game_delete', 'games', id, dg ? `${dg.date} vs ${dg.opponent}` : id, { previousValue: dg || null, newValue: null }); renderGames(); toast('Game deleted');
```

#### 3n — `event_add` (line ~2584)

Find:
```js
    saveData(d); auditLog('event_add', 'events', 'e'+Date.now(), val('ef-name')); closeModal(); renderEvents(); toast('Event added!');
```

The event is pushed just above with an id. Read lines 2575–2590 to get the exact push structure. Capture `newEvent`:

Pattern:
```js
    const eid = 'e'+Date.now();
    const newEvent = { id: eid, /* all fields */ };
    d.events.push(newEvent);
    saveData(d); auditLog('event_add', 'events', eid, val('ef-name'), { previousValue: null, newValue: newEvent }); closeModal(); renderEvents(); toast('Event added!');
```

#### 3o — `event_edit` (line ~2604)

Read lines 2594–2610 for the exact edit callback. Add `before` capture before the assignment, then update auditLog:
```js
    saveData(d); auditLog('event_edit', 'events', id, val('ef-name'), { previousValue: before, newValue: d.events[idx] }); closeModal(); renderEvents(); toast('Event updated!');
```

#### 3p — `event_delete` (line ~2609)

Find:
```js
  const d=loadData(); const de=d.events.find(e=>e.id===id); d.events=d.events.filter(e=>e.id!==id); saveData(d); auditLog('event_delete', 'events', id, de?.name||id); renderEvents(); toast('Event deleted');
```

Replace with:
```js
  const d=loadData(); const de=d.events.find(e=>e.id===id); d.events=d.events.filter(e=>e.id!==id); saveData(d); auditLog('event_delete', 'events', id, de?.name||id, { previousValue: de||null, newValue: null }); renderEvents(); toast('Event deleted');
```

#### 3q — `approve` profile (line ~4330)

Find:
```js
      auditLog('approve', 'profiles', profileId, `Approved account as ${grantRole}${matched ? ' (linked to player ' + matched.firstName + ' ' + matched.lastName + ')' : ''}`);
```

Read lines 4315–4335 to find `prof` (the profile object). Replace with:
```js
      auditLog('approve', 'profiles', profileId, `Approved account as ${grantRole}${matched ? ' (linked to player ' + matched.firstName + ' ' + matched.lastName + ')' : ''}`, { previousValue: { ...prof, approved: false }, newValue: { ...prof, approved: true, role: grantRole } });
```

#### 3r — `approve` role upgrade (line ~4389)

Find:
```js
      auditLog('approve', 'profiles', profileId, `Role upgraded to ${prof.pending_role} for ${prof.display_name || profileId}`);
```

Replace with:
```js
      auditLog('approve', 'profiles', profileId, `Role upgraded to ${prof.pending_role} for ${prof.display_name || profileId}`, { previousValue: { ...prof, role: prof.role }, newValue: { ...prof, role: prof.pending_role, pending_role: null } });
```

- [ ] **Step 2: Verify no syntax errors**

```bash
node --check "/Users/scottspratlen/Documents/Claude/Projects/Heroes Website/Heroes Website/admin.html" 2>&1 | head -5
```

- [ ] **Step 3: Commit**

```bash
cd "/Users/scottspratlen/Documents/Claude/Projects/Heroes Website/Heroes Website"
git add admin.html
git commit -m "feat: add before/after snapshots to existing auditLog calls"
```

---

### Task 4: New auditLog Calls for Gap Collections

**Files:**
- Modify: `admin.html` (prod repo)

Add `auditLog()` calls with snapshots for all previously-unlogged collections.

#### 4a — Tournaments

**tournament_add** (after line ~1813 `saveCollection('tournaments', d.tournaments)`):

Read lines 1797–1816. The tournament object is pushed inline. Refactor to capture it:

Find:
```js
    d.tournaments.push({
      id: 'tr'+Date.now(), name,
      teamId: val('tf-team')||null,
      startDate: val('tf-start')||null,
      endDate: val('tf-end')||null,
      location: val('tf-location'),
      season: val('tf-season')||new Date().getFullYear(),
      placement: null,
      notes: val('tf-notes')
    });
    saveCollection('tournaments', d.tournaments);
    closeModal(); renderTournaments(); toast('Tournament added!');
```

Replace with:
```js
    const newTournament = {
      id: 'tr'+Date.now(), name,
      teamId: val('tf-team')||null,
      startDate: val('tf-start')||null,
      endDate: val('tf-end')||null,
      location: val('tf-location'),
      season: val('tf-season')||new Date().getFullYear(),
      placement: null,
      notes: val('tf-notes')
    };
    d.tournaments.push(newTournament);
    saveCollection('tournaments', d.tournaments);
    auditLog('tournament_add', 'tournaments', newTournament.id, name, { previousValue: null, newValue: newTournament });
    closeModal(); renderTournaments(); toast('Tournament added!');
```

**tournament_edit** (after line ~1834 `saveCollection('tournaments', d.tournaments)`):

Find inside `editTournament` callback:
```js
    const d = loadData();
    const idx = d.tournaments.findIndex(x=>x.id===id);
    d.tournaments[idx] = { ...d.tournaments[idx], name,
```

Replace with:
```js
    const d = loadData();
    const idx = d.tournaments.findIndex(x=>x.id===id);
    const beforeTournament = d.tournaments[idx] ? { ...d.tournaments[idx] } : null;
    d.tournaments[idx] = { ...d.tournaments[idx], name,
```

Then find:
```js
    saveCollection('tournaments', d.tournaments);
    closeModal(); renderTournaments(); toast('Tournament updated!');
```

Replace with:
```js
    saveCollection('tournaments', d.tournaments);
    auditLog('tournament_edit', 'tournaments', id, name, { previousValue: beforeTournament, newValue: d.tournaments[idx] });
    closeModal(); renderTournaments(); toast('Tournament updated!');
```

**savePlacement** (after line ~2028 `saveCollection('tournaments', d.tournaments)`):

Find:
```js
window.savePlacement = function(id, place) {
  const d = loadData();
  const idx = d.tournaments.findIndex(x=>x.id===id);
  if (idx<0) return;
  d.tournaments[idx].placement = place;
  saveCollection('tournaments', d.tournaments);
  renderTournaments();
  toast(place ? `Placement set to ${placementLabel(place)}` : 'Placement cleared');
};
```

Replace with:
```js
window.savePlacement = function(id, place) {
  const d = loadData();
  const idx = d.tournaments.findIndex(x=>x.id===id);
  if (idx<0) return;
  const beforePlacement = { ...d.tournaments[idx] };
  d.tournaments[idx].placement = place;
  saveCollection('tournaments', d.tournaments);
  auditLog('tournament_placement', 'tournaments', id, `Placement set to ${place || 'none'}`, { previousValue: beforePlacement, newValue: d.tournaments[idx] });
  renderTournaments();
  toast(place ? `Placement set to ${placementLabel(place)}` : 'Placement cleared');
};
```

**tournament_delete** (after line ~2038–2040 inside `deleteTournament`):

Find:
```js
function deleteTournament(id) {
  if (!confirm('Delete this tournament? Games assigned to it will be unlinked.')) return;
  const d = loadData();
  d.tournaments = (d.tournaments||[]).filter(t=>t.id!==id);
  d.games = d.games.map(g=>g.tournamentId===id?{...g,tournamentId:null}:g);
  saveCollection('tournaments', d.tournaments);
  saveCollection('games', d.games);
  renderTournaments(); toast('Tournament deleted');
}
```

Replace with:
```js
function deleteTournament(id) {
  if (!confirm('Delete this tournament? Games assigned to it will be unlinked.')) return;
  const d = loadData();
  const deletedTournament = (d.tournaments||[]).find(t=>t.id===id) || null;
  d.tournaments = (d.tournaments||[]).filter(t=>t.id!==id);
  d.games = d.games.map(g=>g.tournamentId===id?{...g,tournamentId:null}:g);
  saveCollection('tournaments', d.tournaments);
  saveCollection('games', d.games);
  auditLog('tournament_delete', 'tournaments', id, deletedTournament?.name||id, { previousValue: deletedTournament, newValue: null });
  renderTournaments(); toast('Tournament deleted');
}
```

#### 4b — News

**news_add** (line ~2844):

Find:
```js
    saveData(d); closeModal(); renderNews(); toast('Article published!');
```

The article is unshifted inline as `{ id:'n'+Date.now(), title:..., ... }`. Read lines 2839–2845 for the exact object. Refactor to capture `newArticle`:

```js
    const newArticle = { id:'n'+Date.now(), title:val('nf-title'), category:val('nf-cat'), date:val('nf-date'), season:new Date().getFullYear().toString(), excerpt:val('nf-excerpt'), content:val('nf-content'), image, author:val('nf-author'), pinned:document.getElementById('nf-pinned').checked };
    d.news.unshift(newArticle);
    saveData(d); auditLog('news_add', 'news', newArticle.id, val('nf-title'), { previousValue: null, newValue: newArticle }); closeModal(); renderNews(); toast('Article published!');
```

**news_edit** (line ~2853):

Read lines 2847–2855. Add `before` capture before the assignment:
```js
    const beforeArticle = d.news[idx] ? { ...d.news[idx] } : null;
    d.news[idx]={...d.news[idx], title:val('nf-title'), ...};
    saveData(d); auditLog('news_edit', 'news', id, val('nf-title'), { previousValue: beforeArticle, newValue: d.news[idx] }); closeModal(); renderNews(); toast('Article updated!');
```

**news_delete** (line ~2858):

Find:
```js
  const d=loadData(); d.news=d.news.filter(n=>n.id!==id); saveData(d); renderNews();
```

Replace with:
```js
  const d=loadData(); const dn=d.news.find(n=>n.id===id); d.news=d.news.filter(n=>n.id!==id); saveData(d); auditLog('news_delete', 'news', id, dn?.title||id, { previousValue: dn||null, newValue: null }); renderNews();
```

#### 4c — Awards

**award_add** (line ~2987):

Find the unshift inside `addAward`:
```js
    d.awards.unshift({id:'a'+Date.now(),year:val('af-year'),title:val('af-title'),team:val('af-team'),description:val('af-desc'),icon:val('af-icon')});
    saveData(d); closeModal(); renderAwards(); toast('Award added!');
```

Replace with:
```js
    const newAward = {id:'a'+Date.now(),year:val('af-year'),title:val('af-title'),team:val('af-team'),description:val('af-desc'),icon:val('af-icon')};
    d.awards.unshift(newAward);
    saveData(d); auditLog('award_add', 'awards', newAward.id, val('af-title'), { previousValue: null, newValue: newAward }); closeModal(); renderAwards(); toast('Award added!');
```

**award_edit** (line ~2995):

Find in `editAward` callback:
```js
    const d=loadData(); const idx=d.awards.findIndex(x=>x.id===id);
    d.awards[idx]={...d.awards[idx],year:val('af-year'),title:val('af-title'),team:val('af-team'),description:val('af-desc'),icon:val('af-icon')};
    saveData(d); closeModal(); renderAwards(); toast('Award updated!');
```

Replace with:
```js
    const d=loadData(); const idx=d.awards.findIndex(x=>x.id===id);
    const beforeAward = d.awards[idx] ? { ...d.awards[idx] } : null;
    d.awards[idx]={...d.awards[idx],year:val('af-year'),title:val('af-title'),team:val('af-team'),description:val('af-desc'),icon:val('af-icon')};
    saveData(d); auditLog('award_edit', 'awards', id, val('af-title'), { previousValue: beforeAward, newValue: d.awards[idx] }); closeModal(); renderAwards(); toast('Award updated!');
```

**award_delete** (line ~3000):

Find:
```js
  const d=loadData(); d.awards=d.awards.filter(a=>a.id!==id); saveData(d); renderAwards();
```

Replace with:
```js
  const d=loadData(); const da=d.awards.find(a=>a.id===id); d.awards=d.awards.filter(a=>a.id!==id); saveData(d); auditLog('award_delete', 'awards', id, da?.title||id, { previousValue: da||null, newValue: null }); renderAwards();
```

#### 4d — Sponsors

**sponsor_add** (line ~3287):

Find the push inside `addSponsor`:
```js
    d.sponsors.push({id:'s'+Date.now(),name:val('sf-name'),url:val('sf-url'),logo:val('sf-logo'),tier:val('sf-tier')});
    saveData(d); closeModal(); renderSponsors(); toast('Sponsor added!');
```

Replace with:
```js
    const newSponsor = {id:'s'+Date.now(),name:val('sf-name'),url:val('sf-url'),logo:val('sf-logo'),tier:val('sf-tier')};
    d.sponsors.push(newSponsor);
    saveData(d); auditLog('sponsor_add', 'sponsors', newSponsor.id, val('sf-name'), { previousValue: null, newValue: newSponsor }); closeModal(); renderSponsors(); toast('Sponsor added!');
```

**sponsor_edit** (line ~3295):

Find in `editSponsor` callback:
```js
    const d=loadData(); const idx=d.sponsors.findIndex(x=>x.id===id);
    d.sponsors[idx]={...d.sponsors[idx],name:val('sf-name'),url:val('sf-url'),logo:val('sf-logo'),tier:val('sf-tier')};
    saveData(d); closeModal(); renderSponsors(); toast('Updated!');
```

Replace with:
```js
    const d=loadData(); const idx=d.sponsors.findIndex(x=>x.id===id);
    const beforeSponsor = d.sponsors[idx] ? { ...d.sponsors[idx] } : null;
    d.sponsors[idx]={...d.sponsors[idx],name:val('sf-name'),url:val('sf-url'),logo:val('sf-logo'),tier:val('sf-tier')};
    saveData(d); auditLog('sponsor_edit', 'sponsors', id, val('sf-name'), { previousValue: beforeSponsor, newValue: d.sponsors[idx] }); closeModal(); renderSponsors(); toast('Updated!');
```

**sponsor_delete** (line ~3300):

Find:
```js
  const d=loadData(); d.sponsors=d.sponsors.filter(s=>s.id!==id); saveData(d); renderSponsors();
```

Replace with:
```js
  const d=loadData(); const ds=d.sponsors.find(s=>s.id===id); d.sponsors=d.sponsors.filter(s=>s.id!==id); saveData(d); auditLog('sponsor_delete', 'sponsors', id, ds?.name||id, { previousValue: ds||null, newValue: null }); renderSponsors();
```

#### 4e — Albums and Photos

**album_add** (line ~3143):

Find inside `addAlbum` callback:
```js
    d.albums.push({ id:'al'+Date.now(), name:val('al-name'), category:alCat, date:val('al-date'), teamId:val('al-team'), description:val('al-desc'), coverUrl:val('al-cover') });
    saveCollection('albums', d.albums); closeModal(); renderGalleryAdmin(); toast('Album added!');
```

Replace with:
```js
    const newAlbum = { id:'al'+Date.now(), name:val('al-name'), category:alCat, date:val('al-date'), teamId:val('al-team'), description:val('al-desc'), coverUrl:val('al-cover') };
    d.albums.push(newAlbum);
    saveCollection('albums', d.albums); auditLog('album_add', 'albums', newAlbum.id, val('al-name'), { previousValue: null, newValue: newAlbum }); closeModal(); renderGalleryAdmin(); toast('Album added!');
```

**album_edit** (line ~3152):

Find in `editAlbum` callback:
```js
    const d = loadData(); const idx = (d.albums||[]).findIndex(a=>a.id===id);
    const alCat2 = ...;
    if (idx>=0) d.albums[idx] = { ...d.albums[idx], name:val('al-name'), ... };
    saveCollection('albums', d.albums); closeModal(); renderGalleryAdmin(); toast('Album updated!');
```

Replace with:
```js
    const d = loadData(); const idx = (d.albums||[]).findIndex(a=>a.id===id);
    const alCat2 = val('al-category')==='__new__' ? (val('al-cat-new')||'').toLowerCase().trim()||'site' : val('al-category')||'site';
    const beforeAlbum = idx>=0 ? { ...d.albums[idx] } : null;
    if (idx>=0) d.albums[idx] = { ...d.albums[idx], name:val('al-name'), category:alCat2, date:val('al-date'), teamId:val('al-team'), description:val('al-desc'), coverUrl:val('al-cover') };
    saveCollection('albums', d.albums); auditLog('album_edit', 'albums', id, val('al-name'), { previousValue: beforeAlbum, newValue: idx>=0 ? d.albums[idx] : null }); closeModal(); renderGalleryAdmin(); toast('Album updated!');
```

**album_delete** (line ~3160):

Find:
```js
  d.albums = (d.albums||[]).filter(a=>a.id!==id);
  d.photos = (d.photos||[]).filter(p=>p.albumId!==id);
  saveCollection('albums', d.albums); saveCollection('photos', d.photos); renderGalleryAdmin(); toast('Album deleted');
```

Replace with:
```js
  const deletedAlbum = (d.albums||[]).find(a=>a.id===id) || null;
  const deletedPhotos = (d.photos||[]).filter(p=>p.albumId===id);
  d.albums = (d.albums||[]).filter(a=>a.id!==id);
  d.photos = (d.photos||[]).filter(p=>p.albumId!==id);
  saveCollection('albums', d.albums); saveCollection('photos', d.photos);
  auditLog('album_delete', 'albums', id, deletedAlbum?.name||id, { previousValue: { album: deletedAlbum, photos: deletedPhotos }, newValue: null });
  renderGalleryAdmin(); toast('Album deleted');
```

Note: for `album_delete` the `d = loadData()` line is inside `deleteAlbum`. Read lines 3155–3161 to confirm `d` is already loaded.

**photo_add** (line ~3196):

Find:
```js
    d.photos.push({ id:'ph'+Date.now(), albumId, url, caption:val('ph-caption') });
    saveCollection('photos', d.photos); closeModal(); managePhotos(albumId); toast('Photo added!');
```

Replace with:
```js
    const newPhoto = { id:'ph'+Date.now(), albumId, url, caption:val('ph-caption') };
    d.photos.push(newPhoto);
    saveCollection('photos', d.photos); auditLog('photo_add', 'photos', newPhoto.id, url, { previousValue: null, newValue: newPhoto }); closeModal(); managePhotos(albumId); toast('Photo added!');
```

**photo_delete** (line ~3202):

Find:
```js
  const d = loadData(); d.photos = (d.photos||[]).filter(p=>p.id!==photoId);
  saveCollection('photos', d.photos); toast('Photo deleted'); managePhotos(albumId);
```

Replace with:
```js
  const d = loadData(); const dp = (d.photos||[]).find(p=>p.id===photoId); d.photos = (d.photos||[]).filter(p=>p.id!==photoId);
  saveCollection('photos', d.photos); auditLog('photo_delete', 'photos', photoId, dp?.url||photoId, { previousValue: dp||null, newValue: null }); toast('Photo deleted'); managePhotos(albumId);
```

#### 4f — Page Builder

All page builder save operations call `saveData(d)`. Capture the `pageLayouts` collection before and after.

**pbDrop / reorder** (line ~3464):

Find:
```js
  saveData(d); renderPageBuilder();
```

inside `window.pbDrop`. Read lines 3456–3465 to get the exact block. Add before/after:

```js
  const beforeLayout = JSON.parse(JSON.stringify(d.pageLayouts));
  const [item] = layout.splice(pbDragIdx, 1);
  layout.splice(targetIdx, 0, item);
  saveData(d);
  auditLog('pagelayout_reorder', 'pageLayouts', 'home', `Moved section from position ${pbDragIdx} to ${targetIdx}`, { previousValue: beforeLayout, newValue: d.pageLayouts });
  renderPageBuilder();
```

**pbToggleVisible** (line ~3467):

Find:
```js
window.pbToggleVisible = function(idx, visible) {
  const d = loadData(); d.pageLayouts.home[idx].visible = visible; saveData(d);
};
```

Replace with:
```js
window.pbToggleVisible = function(idx, visible) {
  const d = loadData();
  const before = JSON.parse(JSON.stringify(d.pageLayouts));
  d.pageLayouts.home[idx].visible = visible;
  saveData(d);
  auditLog('pagelayout_visibility', 'pageLayouts', 'home', `Section ${idx} set to ${visible ? 'visible' : 'hidden'}`, { previousValue: before, newValue: d.pageLayouts });
};
```

**pbRemoveSection** (line ~3471):

Find:
```js
window.pbRemoveSection = function(idx) {
  if(!confirm('Remove this section?')) return;
  const d = loadData(); d.pageLayouts.home.splice(idx,1); saveData(d); renderPageBuilder();
};
```

Replace with:
```js
window.pbRemoveSection = function(idx) {
  if(!confirm('Remove this section?')) return;
  const d = loadData();
  const before = JSON.parse(JSON.stringify(d.pageLayouts));
  const removed = d.pageLayouts.home[idx];
  d.pageLayouts.home.splice(idx,1);
  saveData(d);
  auditLog('pagelayout_remove', 'pageLayouts', 'home', `Removed section type: ${removed?.type||idx}`, { previousValue: before, newValue: d.pageLayouts });
  renderPageBuilder();
};
```

**pbAddSection** (line ~3477):

Find inside `window.pbAddSection`:
```js
  d.pageLayouts.home.push({ id: type+'-'+Date.now(), type, visible: true, settings: {} });
  saveData(d);
```

Replace with:
```js
  const before = JSON.parse(JSON.stringify(d.pageLayouts));
  d.pageLayouts.home.push({ id: type+'-'+Date.now(), type, visible: true, settings: {} });
  saveData(d);
  auditLog('pagelayout_add', 'pageLayouts', 'home', `Added ${type} section`, { previousValue: before, newValue: d.pageLayouts });
```

**pbEditSection save** (line ~3562):

Find:
```js
    saveData(d); closeModal(); renderPageBuilder(); toast('Section updated!');
```

inside the `pbEditSection` modal callback. Add before/after capture. Read lines 3488–3564 to find where `d` is loaded. Add `before` immediately after the `d = loadData()` call in the callback:

```js
    const before = JSON.parse(JSON.stringify(d.pageLayouts));
```

Then replace the save line:
```js
    saveData(d); auditLog('pagelayout_edit', 'pageLayouts', 'home', `Edited section ${idx}`, { previousValue: before, newValue: d.pageLayouts }); closeModal(); renderPageBuilder(); toast('Section updated!');
```

#### 4g — Config/Settings

**saveSettings** (line ~3717):

Find:
```js
  saveCollection('config', d.config); renderSettings(); toast('Settings saved!');
```

Replace with:
```js
  const beforeConfig = { ...loadData().config };
  saveCollection('config', d.config);
  auditLog('config_save', 'config', 'settings', 'Site settings updated', { previousValue: beforeConfig, newValue: d.config });
  renderSettings(); toast('Settings saved!');
```

Wait — `d.config` is already set before this line in `saveSettings`. Read lines 3704–3718 to confirm `d` is loaded and `d.config` is mutated. The `before` must be captured before the mutation. If `d = loadData()` is on line 3705, then add immediately after that line:

```js
  const beforeConfig = { ...d.config };
```

Then remove the `{ ...loadData().config }` from the replacement above and just use `beforeConfig`.

- [ ] **Step 2: Verify no syntax errors**

```bash
node --check "/Users/scottspratlen/Documents/Claude/Projects/Heroes Website/Heroes Website/admin.html" 2>&1 | head -5
```

- [ ] **Step 3: Commit**

```bash
cd "/Users/scottspratlen/Documents/Claude/Projects/Heroes Website/Heroes Website"
git add admin.html
git commit -m "feat: add auditLog calls for all unlogged collections (tournaments, news, awards, sponsors, albums, photos, pageLayouts, config)"
```

---

### Task 5: Add `restoreFromAudit()` Function

**Files:**
- Modify: `admin.html` (prod repo) — insert immediately after the closing `}` of `auditLog()` (line ~511)

- [ ] **Step 1: Add `restoreFromAudit()` after `auditLog()`**

Find the closing brace of `auditLog()`:
```js
  } catch(e) { console.warn('audit log skipped:', e.message); }
}
```

Add this block immediately after it:

```js
async function restoreFromAudit(entry) {
  const { action, collection, record_id, previous_value, new_value } = entry;
  const isDelete = action.includes('_delete') || action === 'delete';
  const isAdd    = action.includes('_add')    || action === 'add';

  try {
    if (['players', 'teams', 'tournaments'].includes(collection)) {
      const d = loadData();
      if (!d[collection]) d[collection] = [];
      if (isDelete) {
        d[collection] = [...d[collection], previous_value];
      } else if (isAdd) {
        d[collection] = d[collection].filter(r => r.id !== record_id);
      } else {
        d[collection] = d[collection].map(r => r.id === record_id ? previous_value : r);
      }
      saveCollection(collection, d[collection]);
    } else if (collection === 'pageLayouts' || collection === 'config') {
      // Full collection restore
      const d = loadData();
      d[collection] = previous_value;
      saveData(d);
    } else {
      // heroes_data blob collections (games, events, news, awards, sponsors, albums, photos)
      const d = loadData();
      if (!d[collection]) d[collection] = [];
      if (isDelete) {
        d[collection] = [...d[collection], previous_value];
      } else if (isAdd) {
        d[collection] = d[collection].filter(r => r.id !== record_id);
      } else if (Array.isArray(previous_value)) {
        d[collection] = previous_value;
      } else {
        d[collection] = d[collection].map(r => r.id === record_id ? previous_value : r);
      }
      saveData(d);
    }

    const when = new Date(entry.created_at).toLocaleString('en-US',{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'});
    auditLog('restore', collection, record_id, `Restored to state from ${when}`);
    toast('Restored successfully!');
    renderAuditLog();
  } catch(e) {
    console.error('restoreFromAudit error:', e);
    toast('Restore failed: ' + e.message, 'error');
  }
}
```

- [ ] **Step 2: Verify syntax**

```bash
node --check "/Users/scottspratlen/Documents/Claude/Projects/Heroes Website/Heroes Website/admin.html" 2>&1 | head -5
```

- [ ] **Step 3: Commit**

```bash
cd "/Users/scottspratlen/Documents/Claude/Projects/Heroes Website/Heroes Website"
git add admin.html
git commit -m "feat: add restoreFromAudit() function"
```

---

### Task 6: Update Audit Log UI

**Files:**
- Modify: `admin.html` (prod repo) — `renderAuditLog()` function, lines ~3567–3644

- [ ] **Step 1: Expand the `actionLabel` map**

Find:
```js
    const actionLabel = {
      player_add:'➕ Added player', player_edit:'✏️ Edited player', player_delete:'🗑 Deleted player',
      player_deactivate:'⏸ Deactivated player', player_reactivate:'▶️ Reactivated player',
      roster_add:'➕ Added to roster', roster_remove:'➖ Removed from roster',
      team_add:'➕ Added team', team_edit:'✏️ Edited team', team_delete:'🗑 Deleted team',
      game_add:'➕ Added game', game_edit:'✏️ Edited game', game_delete:'🗑 Deleted game',
      event_add:'➕ Added event', event_edit:'✏️ Edited event', event_delete:'🗑 Deleted event',
    };
```

Replace with:
```js
    const actionLabel = {
      player_add:'➕ Added player', player_edit:'✏️ Edited player', player_delete:'🗑 Deleted player',
      player_deactivate:'⏸ Deactivated player', player_reactivate:'▶️ Reactivated player',
      roster_add:'➕ Added to roster', roster_remove:'➖ Removed from roster',
      team_add:'➕ Added team', team_edit:'✏️ Edited team', team_delete:'🗑 Deleted team',
      game_add:'➕ Added game', game_edit:'✏️ Edited game', game_delete:'🗑 Deleted game',
      event_add:'➕ Added event', event_edit:'✏️ Edited event', event_delete:'🗑 Deleted event',
      tournament_add:'➕ Added tournament', tournament_edit:'✏️ Edited tournament', tournament_delete:'🗑 Deleted tournament', tournament_placement:'🏆 Set placement',
      news_add:'➕ Published article', news_edit:'✏️ Edited article', news_delete:'🗑 Deleted article',
      award_add:'➕ Added award', award_edit:'✏️ Edited award', award_delete:'🗑 Deleted award',
      sponsor_add:'➕ Added sponsor', sponsor_edit:'✏️ Edited sponsor', sponsor_delete:'🗑 Deleted sponsor',
      album_add:'➕ Added album', album_edit:'✏️ Edited album', album_delete:'🗑 Deleted album',
      photo_add:'➕ Added photo', photo_delete:'🗑 Deleted photo',
      pagelayout_add:'➕ Added page section', pagelayout_edit:'✏️ Edited page section', pagelayout_remove:'🗑 Removed page section', pagelayout_reorder:'↕️ Reordered page', pagelayout_visibility:'👁 Toggled section visibility',
      config_save:'⚙️ Updated settings',
      approve:'✅ Approved account',
      restore:'↩ Restored record',
    };
```

- [ ] **Step 2: Update the table header to add `Changed By` and `Restore` columns**

Find:
```js
        <thead>
          <tr style="border-bottom:2px solid var(--border)">
            <th style="text-align:left;padding:8px 12px;color:var(--gray);font-weight:600">When</th>
            <th style="text-align:left;padding:8px 12px;color:var(--gray);font-weight:600">Who</th>
            <th style="text-align:left;padding:8px 12px;color:var(--gray);font-weight:600">Action</th>
            <th style="text-align:left;padding:8px 12px;color:var(--gray);font-weight:600">Detail</th>
          </tr>
        </thead>
```

Replace with:
```js
        <thead>
          <tr style="border-bottom:2px solid var(--border)">
            <th style="text-align:left;padding:8px 12px;color:var(--gray);font-weight:600">When</th>
            <th style="text-align:left;padding:8px 12px;color:var(--gray);font-weight:600">Changed By</th>
            <th style="text-align:left;padding:8px 12px;color:var(--gray);font-weight:600">Action</th>
            <th style="text-align:left;padding:8px 12px;color:var(--gray);font-weight:600">Detail</th>
            <th style="text-align:left;padding:8px 12px;color:var(--gray);font-weight:600">Restore</th>
          </tr>
        </thead>
```

- [ ] **Step 3: Update the row rendering**

First, add a module-level entry map above the `rows.map(...)` block so onclick handlers can look up full row objects by id (avoids JSON/HTML encoding issues with summary text containing quotes):

Add immediately before the `el.innerHTML = \`` line:
```js
    window._auditEntryMap = {};
    rows.forEach(r => { window._auditEntryMap[r.id] = r; });
```

Find:
```js
          ${rows.map(r => {
            const d = new Date(r.created_at);
            const when = d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) + ' ' +
                         d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});
            const label = actionLabel[r.action] || r.action;
            return `<tr style="border-bottom:1px solid var(--border)">
              <td style="padding:8px 12px;white-space:nowrap;color:var(--gray)">${when}</td>
              <td style="padding:8px 12px">${r.user_email || '—'}</td>
              <td style="padding:8px 12px;white-space:nowrap">${label}</td>
              <td style="padding:8px 12px;color:var(--gray)">${r.summary || ''}</td>
            </tr>`;
          }).join('')}
```

Replace with:
```js
          ${rows.map(r => {
            const d = new Date(r.created_at);
            const when = d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) + '<br><span style="font-size:11px">' +
                         d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'}) + '</span>';
            const label = actionLabel[r.action] || r.action;
            const who = r.changed_by ? `<div style="font-weight:600">${r.changed_by}</div><div style="font-size:11px;color:var(--gray)">${r.user_email||''}</div>` : (r.user_email || '—');
            const canRestore = (r.previous_value !== null && r.previous_value !== undefined) ||
                               (r.action && (r.action.includes('_add') || r.action === 'add') && r.new_value !== null && r.new_value !== undefined);
            const restoreBtn = canRestore && r.action !== 'restore'
              ? `<button class="btn btn-sm btn-secondary" style="padding:3px 8px;font-size:11px" onclick="confirmRestore('${r.id}')">↩ Restore</button>`
              : '—';
            return `<tr style="border-bottom:1px solid var(--border)">
              <td style="padding:8px 12px;white-space:nowrap;color:var(--gray)">${when}</td>
              <td style="padding:8px 12px">${who}</td>
              <td style="padding:8px 12px;white-space:nowrap">${label}</td>
              <td style="padding:8px 12px;color:var(--gray)">${r.summary || ''}</td>
              <td style="padding:8px 12px">${restoreBtn}</td>
            </tr>`;
          }).join('')}
```

- [ ] **Step 4: Add `confirmRestore()` helper function**

Add this function immediately after `restoreFromAudit()` (after Task 5's code):

```js
function confirmRestore(entryId) {
  const entry = window._auditEntryMap?.[entryId];
  if (!entry) { toast('Entry not found — refresh the audit log', 'error'); return; }
  const when = new Date(entry.created_at).toLocaleString('en-US',{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'});
  const actionLabels = {
    player_add:'➕ Added player', player_edit:'✏️ Edited player', player_delete:'🗑 Deleted player',
    team_add:'➕ Added team', team_edit:'✏️ Edited team', team_delete:'🗑 Deleted team',
    game_add:'➕ Added game', game_edit:'✏️ Edited game', game_delete:'🗑 Deleted game',
    event_add:'➕ Added event', event_edit:'✏️ Edited event', event_delete:'🗑 Deleted event',
    tournament_add:'➕ Added tournament', tournament_edit:'✏️ Edited tournament', tournament_delete:'🗑 Deleted tournament',
    news_add:'➕ Published article', news_edit:'✏️ Edited article', news_delete:'🗑 Deleted article',
    award_add:'➕ Added award', award_edit:'✏️ Edited award', award_delete:'🗑 Deleted award',
    sponsor_add:'➕ Added sponsor', sponsor_edit:'✏️ Edited sponsor', sponsor_delete:'🗑 Deleted sponsor',
    album_add:'➕ Added album', album_edit:'✏️ Edited album', album_delete:'🗑 Deleted album',
    photo_add:'➕ Added photo', photo_delete:'🗑 Deleted photo',
    pagelayout_add:'Added page section', pagelayout_edit:'Edited page section', pagelayout_remove:'Removed page section', pagelayout_reorder:'Reordered page', pagelayout_visibility:'Toggled section visibility',
    config_save:'Updated settings',
    approve:'Approved account',
  };
  const label = actionLabels[entry.action] || entry.action;
  openModal(
    '↩ Confirm Restore',
    `<p style="color:var(--text);margin:0 0 12px">Restore this change to its prior state?</p>
     <div style="background:var(--light);border-radius:8px;padding:12px;font-size:13px">
       <div><strong>Action:</strong> ${label}</div>
       <div><strong>Record:</strong> ${entry.summary || entry.record_id}</div>
       <div><strong>Changed:</strong> ${when}</div>
       ${entry.changed_by ? `<div><strong>By:</strong> ${entry.changed_by}</div>` : ''}
     </div>
     <p style="color:var(--gray);font-size:13px;margin:12px 0 0">This will overwrite the current record with its previous state.</p>`,
    'Restore',
    () => restoreFromAudit(entry)
  );
}
```

- [ ] **Step 5: Verify syntax**

```bash
node --check "/Users/scottspratlen/Documents/Claude/Projects/Heroes Website/Heroes Website/admin.html" 2>&1 | head -5
```

- [ ] **Step 6: Commit**

```bash
cd "/Users/scottspratlen/Documents/Claude/Projects/Heroes Website/Heroes Website"
git add admin.html
git commit -m "feat: update audit log UI with changed_by, full timestamp, restore button"
```

---

### Task 7: Copy to Staging and Push Both Repos

**Files:** All changed files copied to staging.

- [ ] **Step 1: Copy to staging**

```bash
cp "/Users/scottspratlen/Documents/Claude/Projects/Heroes Website/Heroes Website/admin.html" \
   "/Users/scottspratlen/Documents/Claude/Projects/Heroes-staging/admin.html"

cp "/Users/scottspratlen/Documents/Claude/Projects/Heroes Website/Heroes Website/supabase/migrations/20260904_audit_log_snapshots.sql" \
   "/Users/scottspratlen/Documents/Claude/Projects/Heroes-staging/supabase/migrations/20260904_audit_log_snapshots.sql"
```

- [ ] **Step 2: Commit staging**

```bash
cd "/Users/scottspratlen/Documents/Claude/Projects/Heroes-staging"
git add admin.html supabase/migrations/20260904_audit_log_snapshots.sql
git commit -m "feat: comprehensive audit logging with snapshots and restore"
```

- [ ] **Step 3: Push prod**

```bash
cd "/Users/scottspratlen/Documents/Claude/Projects/Heroes Website/Heroes Website"
git push
```

- [ ] **Step 4: Push staging**

```bash
cd "/Users/scottspratlen/Documents/Claude/Projects/Heroes-staging"
git push
```

- [ ] **Step 5: Remind user to run SQL migration**

Remind the user to run the following SQL in the Supabase dashboard SQL Editor for the **prod** project before testing:

```sql
alter table audit_log
  add column if not exists previous_value jsonb,
  add column if not exists new_value      jsonb,
  add column if not exists changed_by     text;
```

Without this, auditLog calls will silently fail (caught by try/catch) and restore will not work.
