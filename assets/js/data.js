/* ============================================================
   HEROES SENIOR SOFTBALL - Data Layer
   Edit this file to update default data, or use Admin Panel
   ============================================================ */

const HeroesData = {
  // ─── CONFIG ───────────────────────────────────────────────
  // Fallback only — real values are stored in Supabase heroes_data table.
  config: {
    orgName: "Heroes Senior Softball",
    city: "Omaha",
    state: "NE",
    foundedYear: 2021,
    primaryColor: "#C8102E",
    accentColor: "#F0A500",
    venmoHandle: "@HeroesSoftball",
    storeUrl: "",
    facebookUrl: "",
    contactEmail: "",
    adminPassword: "",
  },

  // All record collections are empty — Supabase is the single source of truth.
  // These empty arrays prevent dummy data from ever being pushed to Supabase.
  teams:           [],
  players:         [],
  games:           [],
  events:          [],
  news:            [],
  sponsors:        [],
  awards:          [],
  accountRequests: [],
  albums:          [],
  photos:          [],
  tournaments:     [],

  // ─── HOME PAGE LAYOUT ─────────────────────────────────────
  // Fallback only — real layout is stored in Supabase heroes_data table.
  pageLayouts: {
    home: [
      { id:"hero",    type:"hero",           visible:true, settings:{} },
      { id:"teams",   type:"team-cards",     visible:true, settings:{ title:"Our Teams", subtitle:"Three competitive teams under one organization" } },
      { id:"record",  type:"latest-results", visible:true, settings:{ title:"Latest Results", count:5 } },
      { id:"leaders", type:"stat-leaders",   visible:true, settings:{ title:"Season Leaders", categories:["avg","hr","rbi"] } },
      { id:"news",    type:"news-feed",      visible:true, settings:{ title:"News & Updates", count:4 } },
      { id:"awards",  type:"awards",         visible:true, settings:{ title:"Achievements", subtitle:"Tournament honors and team accomplishments" } },
      { id:"sponsors",type:"sponsors",       visible:true, settings:{ title:"Our Sponsors", subtitle:"Thank you to our generous supporters" } },
    ]
  }
};

// ─── STAT CALCULATIONS ─────────────────────────────────────
const StatCalc = {
  avg: (h, ab) => ab > 0 ? (h / ab).toFixed(3).replace(/^0/, '') : '.000',
  obp: (h, bb, hbp, ab, sf) => {
    const denom = ab + bb + hbp + sf;
    return denom > 0 ? ((h + bb + hbp) / denom).toFixed(3).replace(/^0/, '') : '.000';
  },
  slg: (s, d, t, hr, ab) => {
    const tb = s + 2*d + 3*t + 4*hr;
    return ab > 0 ? (tb / ab).toFixed(3).replace(/^0/, '') : '.000';
  },
  ops: (obp, slg) => {
    const o = parseFloat('0' + obp), s = parseFloat('0' + slg);
    return (o + s).toFixed(3).replace(/^0/, '');
  }
};

// ─── COMPUTED: PLAYER SEASON STATS ────────────────────────
function getPlayerStats(playerId, filters = {}) {
  const data = loadData();
  let games = data.games;
  if (filters.season) games = games.filter(g => (g.season+'') === (filters.season+''));
  if (filters.teamId) games = games.filter(g => g.teamId === filters.teamId);
  if (filters.dateFrom) games = games.filter(g => g.date >= filters.dateFrom);
  if (filters.dateTo) games = games.filter(g => g.date <= filters.dateTo);
  
  const totals = { g: 0, ab: 0, h: 0, s: 0, d: 0, t: 0, hr: 0, hbp: 0, k: 0, bb: 0, sf: 0, rbi: 0, r: 0 };
  games.forEach(game => {
    const stat = game.playerStats?.find(ps => ps.playerId === playerId);
    // Only count games where the player had at least one official AB.
    // This excludes bad-import entries (ab=0, h>0) and prevents AVG > 1.000.
    if (stat && (Number(stat.ab) || 0) > 0) {
      totals.g++;
      Object.keys(totals).forEach(k => { if (k !== 'g' && stat[k] != null) totals[k] += Number(stat[k]) || 0; });
    }
  });
  return {
    ...totals,
    avg: StatCalc.avg(totals.h, totals.ab),
    obp: StatCalc.obp(totals.h, totals.bb, totals.hbp, totals.ab, totals.sf),
    slg: StatCalc.slg(totals.s, totals.d, totals.t, totals.hr, totals.ab),
    ops: StatCalc.ops(
      StatCalc.obp(totals.h, totals.bb, totals.hbp, totals.ab, totals.sf),
      StatCalc.slg(totals.s, totals.d, totals.t, totals.hr, totals.ab)
    ),
    tb: totals.s + 2*totals.d + 3*totals.t + 4*totals.hr
  };
}

function getTeamRecord(teamId, filters = {}) {
  const data = loadData();
  let games = data.games.filter(g => g.teamId === teamId);
  if (filters.season) games = games.filter(g => (g.season+'') === (filters.season+''));
  const res = g => {
    if (g.heroScore != null && g.oppScore != null && g.heroScore !== '' && g.oppScore !== '') {
      const h = Number(g.heroScore), o = Number(g.oppScore);
      if (h > o) return 'W';
      if (h < o) return 'L';
      return 'T';
    }
    const r = (g.result || '').toLowerCase();
    if (r === 'w' || r === 'win') return 'W';
    if (r === 'l' || r === 'loss') return 'L';
    if (r === 't') return 'T';
    return null;
  };
  const wins = games.filter(g => res(g) === 'W').length;
  const losses = games.filter(g => res(g) === 'L').length;
  const ties = games.filter(g => res(g) === 'T').length;
  return { wins, losses, ties, games: games.length };
}

function getLeaders(stat, limit = 5, filters = {}) {
  const data = loadData();
  const players = data.players.filter(p => p.active);
  // Rate stats need AB; counting stats only need at least one plate appearance (h+bb+hbp>0)
  const rateStats = new Set(['avg','obp','slg','ops']);
  const results = players.map(p => ({ player: p, stats: getPlayerStats(p.id, filters) }))
    .filter(x => rateStats.has(stat) ? x.stats.ab >= 5 : (x.stats.h + x.stats.bb + x.stats.hbp + x.stats.r + x.stats.rbi) > 0)
    .sort((a, b) => {
      const va = parseFloat('0' + a.stats[stat]) || a.stats[stat] || 0;
      const vb = parseFloat('0' + b.stats[stat]) || b.stats[stat] || 0;
      return vb - va;
    });
  return results.slice(0, limit);
}

function getAvailableSeasons() {
  const data = loadData();
  const yearSet = new Set();
  data.players.forEach(p => {
    if (p.seasonStats) Object.keys(p.seasonStats).forEach(y => yearSet.add(y));
  });
  return [...yearSet].sort().reverse();
}

function getSeasonLeaders(stat, year, teamId, n = 5) {
  const data = loadData();
  let players = data.players.filter(p => p.active);
  if (teamId && teamId !== 'all') players = players.filter(p => (p.teams || []).includes(teamId));
  return players
    .map(p => {
      const s = (year === 'all') ? p.careerStats : (p.seasonStats && p.seasonStats[year]);
      if (!s) return null;
      const val = s[stat];
      if (val == null) return null;
      const numVal = typeof val === 'string' ? parseFloat(val) : Number(val);
      if (isNaN(numVal)) return null;
      return { player: p, stats: s, sortVal: numVal };
    })
    .filter(Boolean)
    .sort((a, b) => b.sortVal - a.sortVal)
    .slice(0, n);
}

// ─── SUPABASE CONFIG ──────────────────────────────────────
// Replace these two values after creating your Supabase project
const SUPABASE_URL     = 'https://mpgbgucmnxowteonldoh.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_qEfH752_O5r7F9pdKTalEA_B8P0LkV0';

// ─── GROUPME CONFIG ───────────────────────────────────────
// Get this from https://dev.groupme.com → Applications → your app → Client ID
const GROUPME_CLIENT_ID = 'bTdVyzTEvs0OYSwkwAsf7UumR0adTL1LBdvP9FHRrLhYF8bt';

// Collections that get synced to Supabase
const DB_COLLECTIONS = ['config','games','events','news','awards','sponsors','accountRequests','pageLayouts','albums','photos'];

let _sb = null;
function _getClient() {
  if (_sb) return _sb;
  if (typeof supabase === 'undefined' || SUPABASE_URL === 'YOUR_SUPABASE_URL') return null;
  _sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return _sb;
}

// ─── DATA PERSISTENCE ──────────────────────────────────────

// loadData() stays synchronous — always reads from localStorage cache.
// Supabase data is pre-loaded into the cache by initData() on startup.
function loadData() {
  const saved = localStorage.getItem('heroes_data');
  if (saved) {
    try {
      const d = JSON.parse(saved);
      if (!d.accountRequests) d.accountRequests = [];
      if (!d.tournaments) d.tournaments = [];
      return d;
    } catch(e) {}
  }
  return JSON.parse(JSON.stringify(HeroesData));
}

// saveData: write to localStorage immediately (keeps UI snappy),
// then async-push each changed collection to Supabase in the background.
function saveData(data) {
  localStorage.setItem('heroes_data', JSON.stringify(data));
  _pushToSupabase(data);
}

// saveCollection: update a single named collection without touching others.
// Use this instead of saveData() when only one collection changed — prevents
// stale in-memory snapshots from overwriting other collections in Supabase.
function saveCollection(name, value) {
  const data = loadData();
  data[name] = value;
  localStorage.setItem('heroes_data', JSON.stringify(data));

  if (name === 'players')     { _syncPlayersToSupabase(value);     return; }
  if (name === 'teams')       { _syncTeamsToSupabase(value);        return; }
  if (name === 'tournaments') { _syncTournamentsToSupabase(value);  return; }

  _pushCollectionToSupabase(name, value);
}

async function _pushToSupabase(data) {
  const client = _getClient();
  if (!client) return;
  try {
    const rows = DB_COLLECTIONS
      .filter(col => data[col] !== undefined)
      .map(col => ({ collection: col, value: data[col], updated_at: new Date().toISOString() }));
    const { error } = await client.from('heroes_data').upsert(rows, { onConflict: 'collection' });
    if (error) console.warn('Supabase push error:', error.message);
  } catch(e) {
    console.warn('Supabase push failed (offline?):', e.message);
  }
}

async function _pushCollectionToSupabase(name, value) {
  const client = _getClient();
  if (!client) return false;
  try {
    const { error } = await client.from('heroes_data').upsert(
      [{ collection: name, value: value, updated_at: new Date().toISOString() }],
      { onConflict: 'collection' }
    );
    if (error) {
      console.error('Supabase push error:', error.message);
      if (typeof toast === 'function') toast('⚠️ Cloud save failed: ' + error.message + ' — data is local only.', 'error');
      return false;
    }
    return true;
  } catch(e) {
    console.warn('Supabase push failed (offline?):', e.message);
    return false;
  }
}

async function _syncTeamsToSupabase(teams) {
  const client = _getClient();
  if (!client) return;
  try {
    const currentLegacyIds = teams.map(t => t.id);
    const rows = teams.map(t => ({
      legacy_id:         t.id,
      name:              t.name,
      short_name:        t.shortName        || '',
      division:          t.division          || '',
      age_group:         t.ageGroup          || null,
      color:             t.color             || '',
      manager:           t.manager           || '',
      assistant_manager: t.assistantManager  || '',
    }));
    const { data: session } = await client.auth.getSession();
    if (!session?.session) {
      if (typeof toast === 'function') toast('⚠️ Team save failed: not authenticated — sign out and back in', 'error');
      console.warn('Teams sync: no active session');
      return;
    }

    const { data: upserted, error } = await client.from('teams').upsert(rows, { onConflict: 'legacy_id' }).select();
    if (error) {
      console.error('Supabase teams sync error:', error.message);
      if (typeof toast === 'function') toast('⚠️ Team save failed: ' + error.message, 'error');
      return;
    }
    if (!upserted || upserted.length < rows.length) {
      const msg = `Team save blocked by Supabase (${upserted?.length ?? 0}/${rows.length} rows written) — check your role in Supabase`;
      console.warn(msg);
      if (typeof toast === 'function') toast('⚠️ ' + msg, 'error');
      return;
    }

    const { data: existing } = await client.from('teams').select('legacy_id');
    const toDelete = (existing || []).map(r => r.legacy_id).filter(lid => !currentLegacyIds.includes(lid));
    for (const lid of toDelete) {
      await client.from('teams').delete().eq('legacy_id', lid);
    }
  } catch(e) {
    console.warn('Teams sync failed:', e.message);
  }
}

async function _syncPlayersToSupabase(players) {
  const client = _getClient();
  if (!client) return;
  try {
    const playerRows = players.map(p => ({
      legacy_id:  p.id,
      first_name: p.firstName || '',
      last_name:  p.lastName  || '',
      number:     p.number ? parseInt(p.number, 10) : null,
      position:   p.position  || '',
      bats:       p.bats      || 'R',
      throws:     p.throws    || 'R',
      join_year:  p.joinYear  || null,
      active:     p.active !== false,
      photo:      p.photo     || '',
      email:      p.email     || '',
    }));
    const { error: playerErr } = await client.from('players').upsert(playerRows, { onConflict: 'legacy_id' });
    if (playerErr) {
      console.error('Supabase players sync error:', playerErr.message);
      if (typeof toast === 'function') toast('⚠️ Player save failed: ' + playerErr.message, 'error');
      return;
    }

    // Delete rows whose legacy_id is no longer in the current players array
    const currentLegacyIds = players.map(p => p.id);
    const { data: existingPlayers } = await client.from('players').select('legacy_id');
    const toDelete = (existingPlayers || []).map(r => r.legacy_id).filter(lid => !currentLegacyIds.includes(lid));
    for (const lid of toDelete) {
      await client.from('players').delete().eq('legacy_id', lid);
    }

    const [{ data: playerUuids }, { data: teamUuids }] = await Promise.all([
      client.from('players').select('id, legacy_id'),
      client.from('teams').select('id, legacy_id'),
    ]);
    const legacyToPlayerUuid = {};
    (playerUuids || []).forEach(p => { legacyToPlayerUuid[p.legacy_id] = p.id; });
    const legacyToTeamUuid = {};
    (teamUuids || []).forEach(t => { legacyToTeamUuid[t.legacy_id] = t.id; });

    const affectedUuids = players.map(p => legacyToPlayerUuid[p.id]).filter(Boolean);
    if (affectedUuids.length > 0) {
      await client.from('player_teams').delete().in('player_id', affectedUuids);
      const ptRows = [];
      players.forEach(p => {
        const playerUuid = legacyToPlayerUuid[p.id];
        if (!playerUuid) return;
        (p.teams || []).forEach(teamLegacyId => {
          const teamUuid = legacyToTeamUuid[teamLegacyId];
          if (teamUuid) ptRows.push({ player_id: playerUuid, team_id: teamUuid });
        });
      });
      if (ptRows.length > 0) {
        const { error: ptErr } = await client.from('player_teams').insert(ptRows);
        if (ptErr) console.error('Supabase player_teams sync error:', ptErr.message);
      }
    }
  } catch(e) {
    console.warn('Players sync failed:', e.message);
  }
}

async function _syncTournamentsToSupabase(tournaments) {
  const client = _getClient();
  if (!client) return;
  try {
    const { data: teamUuids } = await client.from('teams').select('id, legacy_id');
    const legacyToTeamUuid = {};
    (teamUuids || []).forEach(t => { legacyToTeamUuid[t.legacy_id] = t.id; });

    const currentIds = tournaments.map(t => t.id);
    const rows = tournaments.map(t => ({
      id:         t.id,
      name:       t.name,
      team_id:    legacyToTeamUuid[t.teamId] || null,
      start_date: t.startDate  || null,
      end_date:   t.endDate    || null,
      location:   t.location   || '',
      season:     t.season     || null,
      placement:  t.placement  || null,
      notes:      t.notes      || '',
    }));
    if (rows.length > 0) {
      const { error } = await client.from('tournaments').upsert(rows, { onConflict: 'id' });
      if (error) console.error('Supabase tournaments sync error:', error.message);
    }

    const { data: existing } = await client.from('tournaments').select('id');
    const toDelete = (existing || []).map(r => r.id).filter(id => !currentIds.includes(id));
    for (const id of toDelete) {
      await client.from('tournaments').delete().eq('id', id);
    }
  } catch(e) {
    console.warn('Tournaments sync failed:', e.message);
  }
}

// initData() — called once on app startup.
// Pulls all collections from Supabase and merges into localStorage cache.
// Falls back to localStorage (or HeroesData defaults) if offline.
async function initData() {
  const client = _getClient();
  if (!client) return; // Supabase not configured yet — use localStorage only

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
    if (!merged.tournaments)     merged.tournaments     = [];

    // Fetch from relational tables (teams, players, player_teams, tournaments)
    const [{ data: teamRows }, { data: playerRows }, { data: ptRows }, { data: tourneyRows }] =
      await Promise.all([
        client.from('teams').select('*'),
        client.from('players').select('*'),
        client.from('player_teams').select('player_id, team_id'),
        client.from('tournaments').select('*'),
      ]);

    // Build UUID → legacy_id map for teams (used by player_teams and tournaments)
    const teamUuidToLegacyId = {};
    (teamRows || []).forEach(t => { if (t.id && t.legacy_id) teamUuidToLegacyId[t.id] = t.legacy_id; });

    if (teamRows && teamRows.length > 0) {
      merged.teams = teamRows.map(t => ({
        id:               t.legacy_id || t.id,
        name:             t.name,
        shortName:        t.short_name        || '',
        division:         t.division          || '',
        ageGroup:         t.age_group,
        color:            t.color             || '',
        manager:          t.manager           || '',
        assistantManager: t.assistant_manager || '',
      }));
    }

    if (playerRows && playerRows.length > 0) {
      merged.players = playerRows.map(p => ({
        id:        p.legacy_id || p.id,
        firstName: p.first_name,
        lastName:  p.last_name,
        number:    p.number != null ? String(p.number) : '',
        position:  p.position || '',
        teams:     (ptRows || []).filter(pt => pt.player_id === p.id).map(pt => teamUuidToLegacyId[pt.team_id] || pt.team_id),
        bats:      p.bats    || 'R',
        throws:    p.throws  || 'R',
        joinYear:  p.join_year,
        active:    p.active,
        photo:     p.photo   || '',
        email:     p.email   || '',
      }));
    }

    if (tourneyRows && tourneyRows.length > 0) {
      merged.tournaments = tourneyRows.map(t => ({
        id:        t.id,
        name:      t.name,
        teamId:    teamUuidToLegacyId[t.team_id] || t.team_id || '',
        startDate: t.start_date,
        endDate:   t.end_date,
        location:  t.location || '',
        season:    t.season,
        placement: t.placement || null,
        notes:     t.notes    || '',
      }));
    }

    localStorage.setItem('heroes_data', JSON.stringify(merged));
    console.log('✓ Synced from Supabase');
  } catch(e) {
    console.warn('Supabase unavailable, using local cache:', e.message);
  }
}

function resetData() {
  localStorage.removeItem('heroes_data');
  const defaults = JSON.parse(JSON.stringify(HeroesData));
  _pushToSupabase(defaults);
  return defaults;
}

function exportData() {
  const data = loadData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url;
  a.download = `heroes-data-${new Date().toISOString().slice(0,10)}.json`;
  a.click(); URL.revokeObjectURL(url);
}

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

function importData(jsonStr) {
  try {
    const data = JSON.parse(jsonStr);
    saveData(data);
    return true;
  } catch(e) { return false; }
}
