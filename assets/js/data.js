/* ============================================================
   HEROES SENIOR SOFTBALL - Data Layer
   Edit this file to update default data, or use Admin Panel
   ============================================================ */

const HeroesData = {
  // ─── CONFIG ───────────────────────────────────────────────
  config: {
    orgName: 'Heroes Senior Softball',
    city: 'Omaha',
    state: 'NE',
    foundedYear: 2021,
    primaryColor: '#C8102E',
    accentColor: '#F0A500',
    venmoHandle: '@HeroesSoftball',
    storeUrl: 'https://heroessb.itemorder.com/shop/sale/',
    facebookUrl: 'https://www.facebook.com/groups/heroesseniorsoftball',
    contactEmail: 'heroesseniorsoftball@gmail.com',
    adminPassword: 'heroes2024', // CHANGE THIS!
  },

  // ─── TEAMS ────────────────────────────────────────────────
  teams: [
    { id: '55s-aaa', name: "55's AAA", shortName: '55s', division: 'AAA', ageGroup: 55, color: '#C8102E', manager: 'Mike Marlow', assistantManager: '' },
    { id: '50s-aaa', name: "50's AAA", shortName: '50s-A', division: 'AAA', ageGroup: 50, color: '#1C6EA4', manager: 'Scott Spratlen', assistantManager: '' },
    { id: '50s-aa',  name: "50's AA",  shortName: '50s-B', division: 'AA',  ageGroup: 50, color: '#16803A', manager: '', assistantManager: '' },
  ],

  // ─── PLAYERS ──────────────────────────────────────────────
  players: [
    { id: 'p1', firstName: 'Mike', lastName: 'Marlow', number: '1', position: 'OF/P', teams: ['55s-aaa'], bats: 'R', throws: 'R', joinYear: 2021, active: true, photo: '', email: '', credentials: { username: 'mmarlow', password: 'heroes1' } },
    { id: 'p2', firstName: 'Scott', lastName: 'Spratlen', number: '7', position: 'SS/2B', teams: ['50s-aaa'], bats: 'R', throws: 'R', joinYear: 2021, active: true, photo: '', email: '', credentials: { username: 'sspratlen', password: 'heroes7' } },
    { id: 'p3', firstName: 'Vinny', lastName: 'Barraza', number: '12', position: '1B', teams: ['55s-aaa'], bats: 'L', throws: 'L', joinYear: 2022, active: true, photo: '', email: '', credentials: { username: 'vbarraza', password: 'heroes12' } },
    { id: 'p4', firstName: 'Jim', lastName: 'Anderson', number: '22', position: '3B', teams: ['55s-aaa','50s-aaa'], bats: 'R', throws: 'R', joinYear: 2022, active: true, photo: '', email: '', credentials: { username: 'janderson', password: 'heroes22' } },
    { id: 'p5', firstName: 'Dave', lastName: 'Johnson', number: '14', position: 'C', teams: ['50s-aaa'], bats: 'R', throws: 'R', joinYear: 2023, active: true, photo: '', email: '', credentials: { username: 'djohnson', password: 'heroes14' } },
    { id: 'p6', firstName: 'Tom', lastName: 'Williams', number: '9', position: 'OF', teams: ['55s-aaa'], bats: 'R', throws: 'R', joinYear: 2021, active: true, photo: '', email: '', credentials: { username: 'twilliams', password: 'heroes9' } },
    { id: 'p7', firstName: 'Rick', lastName: 'Davis', number: '33', position: '2B', teams: ['50s-aa'], bats: 'R', throws: 'R', joinYear: 2024, active: true, photo: '', email: '', credentials: { username: 'rdavis', password: 'heroes33' } },
    { id: 'p8', firstName: 'Bob', lastName: 'Miller', number: '18', position: 'P', teams: ['55s-aaa'], bats: 'L', throws: 'L', joinYear: 2022, active: true, photo: '', email: '', credentials: { username: 'bmiller', password: 'heroes18' } },
    { id: 'p9', firstName: 'Greg', lastName: 'Wilson', number: '5', position: 'OF', teams: ['50s-aaa'], bats: 'R', throws: 'R', joinYear: 2023, active: true, photo: '', email: '', credentials: { username: 'gwilson', password: 'heroes5' } },
    { id: 'p10', firstName: 'Ken', lastName: 'Moore', number: '27', position: '1B/P', teams: ['55s-aaa','50s-aaa'], bats: 'R', throws: 'R', joinYear: 2021, active: true, photo: '', email: '', credentials: { username: 'kmoore', password: 'heroes27' } },
  ],

  // ─── GAMES ────────────────────────────────────────────────
  // Each game stores per-player stats at game level
  games: [
    {
      id: 'g1', teamId: '55s-aaa', date: '2025-04-26', opponent: 'Iowa Demons', location: 'Omaha, NE',
      heroScore: 23, oppScore: 12, result: 'W', season: '2025', tournamentId: null, notes: '',
      playerStats: [
        { playerId: 'p1', ab: 4, h: 3, s: 1, d: 1, t: 0, hr: 1, hbp: 0, k: 0, bb: 1, sf: 0, rbi: 3, r: 2 },
        { playerId: 'p3', ab: 5, h: 4, s: 2, d: 1, t: 0, hr: 1, hbp: 0, k: 0, bb: 0, sf: 0, rbi: 4, r: 3 },
        { playerId: 'p6', ab: 4, h: 2, s: 1, d: 0, t: 1, hr: 0, hbp: 0, k: 1, bb: 0, sf: 0, rbi: 1, r: 1 },
        { playerId: 'p8', ab: 3, h: 1, s: 1, d: 0, t: 0, hr: 0, hbp: 1, k: 0, bb: 1, sf: 0, rbi: 0, r: 1 },
        { playerId: 'p10', ab: 4, h: 3, s: 1, d: 1, t: 0, hr: 1, hbp: 0, k: 0, bb: 0, sf: 1, rbi: 5, r: 2 },
      ]
    },
    {
      id: 'g2', teamId: '55s-aaa', date: '2025-04-26', opponent: 'Iowa Demons', location: 'Omaha, NE',
      heroScore: 13, oppScore: 10, result: 'W', season: '2025', tournamentId: null, notes: '',
      playerStats: [
        { playerId: 'p1', ab: 3, h: 2, s: 2, d: 0, t: 0, hr: 0, hbp: 0, k: 0, bb: 1, sf: 0, rbi: 1, r: 2 },
        { playerId: 'p3', ab: 4, h: 3, s: 1, d: 2, t: 0, hr: 0, hbp: 0, k: 0, bb: 0, sf: 0, rbi: 2, r: 1 },
        { playerId: 'p6', ab: 4, h: 1, s: 1, d: 0, t: 0, hr: 0, hbp: 0, k: 1, bb: 0, sf: 0, rbi: 0, r: 0 },
        { playerId: 'p8', ab: 3, h: 2, s: 0, d: 1, t: 0, hr: 1, hbp: 0, k: 0, bb: 0, sf: 0, rbi: 2, r: 1 },
        { playerId: 'p10', ab: 3, h: 1, s: 1, d: 0, t: 0, hr: 0, hbp: 1, k: 0, bb: 0, sf: 0, rbi: 0, r: 1 },
      ]
    },
    {
      id: 'g3', teamId: '55s-aaa', date: '2025-04-25', opponent: "KC Kids 50's", location: 'Kansas City, MO',
      heroScore: 19, oppScore: 12, result: 'W', season: '2025', tournamentId: null, notes: '',
      playerStats: [
        { playerId: 'p1', ab: 5, h: 4, s: 2, d: 1, t: 0, hr: 1, hbp: 0, k: 0, bb: 0, sf: 0, rbi: 4, r: 3 },
        { playerId: 'p3', ab: 4, h: 2, s: 1, d: 0, t: 1, hr: 0, hbp: 0, k: 0, bb: 1, sf: 0, rbi: 1, r: 2 },
        { playerId: 'p6', ab: 4, h: 3, s: 1, d: 1, t: 0, hr: 1, hbp: 0, k: 0, bb: 0, sf: 0, rbi: 3, r: 2 },
        { playerId: 'p8', ab: 3, h: 1, s: 0, d: 1, t: 0, hr: 0, hbp: 0, k: 1, bb: 1, sf: 0, rbi: 1, r: 1 },
        { playerId: 'p10', ab: 4, h: 2, s: 0, d: 0, t: 0, hr: 2, hbp: 0, k: 0, bb: 0, sf: 1, rbi: 4, r: 2 },
      ]
    },
  ],

  // ─── EVENTS / TOURNAMENTS ────────────────────────────────
  events: [
    {
      id: 'e1', type: 'tournament', name: 'Spring Bash', date: '2025-05-10', endDate: '2025-05-11',
      location: 'Omaha, NE', venue: 'Seymour Smith Park', address: '7300 Seymour Smith Blvd, Omaha NE 68157',
      teams: ['55s-aaa'], division: '55+ AAA', entryFee: 275,
      rosterDeadline: '2025-05-03', rsvpDeadline: '2025-05-01',
      director: 'SSUSA', directorPhone: '',
      notes: 'Home tournament. Bring your own seating and sunscreen. Parking is free.',
      hotelInfo: '', hotelUrl: '', hotelCode: '',
      registrationStatus: 'open', status: 'upcoming', placement: '',
      availability: [
        { playerId: 'p1', status: 'yes', note: '', updatedAt: '2025-04-20' },
        { playerId: 'p3', status: 'yes', note: '', updatedAt: '2025-04-21' },
        { playerId: 'p6', status: 'maybe', note: 'Might have family commitment', updatedAt: '2025-04-22' },
      ]
    },
    {
      id: 'e2', type: 'tournament', name: 'KC Classic', date: '2025-06-07', endDate: '2025-06-08',
      location: 'Kansas City, MO', venue: 'Swope Park',  address: '6800 Swope Pkwy, Kansas City, MO 64132',
      teams: ['55s-aaa','50s-aaa'], division: '55+ AAA / 50+ AAA', entryFee: 325,
      rosterDeadline: '2025-05-28', rsvpDeadline: '2025-05-25',
      director: 'ASA/USA Softball', directorPhone: '',
      notes: 'Annual KC trip. Carpooling encouraged. Weather forecast shows clear skies.',
      hotelInfo: 'Hampton Inn & Suites KC Downtown — group rate $109/night',
      hotelUrl: 'https://www.hilton.com', hotelCode: 'HEROESKC25',
      registrationStatus: 'open', status: 'upcoming', placement: '',
      availability: [
        { playerId: 'p2', status: 'yes', note: '', updatedAt: '2025-04-18' },
        { playerId: 'p4', status: 'yes', note: 'Driving, can take 3 others', updatedAt: '2025-04-19' },
        { playerId: 'p5', status: 'no', note: 'Out of town that weekend', updatedAt: '2025-04-20' },
      ]
    },
    {
      id: 'e3', type: 'tournament', name: 'Tournament of Champions', date: '2025-07-19', endDate: '2025-07-20',
      location: 'Lincoln, NE', venue: 'Mahoney Park Complex', address: 'Lincoln, NE',
      teams: ['55s-aaa','50s-aaa','50s-aa'], division: 'All Divisions', entryFee: 350,
      rosterDeadline: '2025-07-05', rsvpDeadline: '2025-07-01',
      director: 'SSUSA', directorPhone: '',
      notes: "Marquee event of the season. Runners-up last year — let's finish the job!",
      hotelInfo: 'Courtyard Lincoln Downtown — use group code for 15% off',
      hotelUrl: '', hotelCode: 'HEROESTOC',
      registrationStatus: 'open', status: 'upcoming', placement: '',
      availability: []
    },
    {
      id: 'e4', type: 'social', name: 'End-of-Season Team Cookout', date: '2025-08-30', endDate: '2025-08-30',
      location: 'Elmwood Park, Omaha', venue: 'Shelter #4', address: 'Dodge St & 60th St, Omaha NE',
      teams: ['55s-aaa','50s-aaa','50s-aa'], division: '', entryFee: 0,
      rosterDeadline: '', rsvpDeadline: '2025-08-25',
      director: '', directorPhone: '',
      notes: 'Bring the family! Heroes provides burgers and dogs, bring a side dish or dessert to share.',
      hotelInfo: '', hotelUrl: '', hotelCode: '',
      registrationStatus: 'open', status: 'upcoming', placement: '',
      availability: []
    },
  ],

  // ─── NEWS / ANNOUNCEMENTS ─────────────────────────────────
  news: [
    {
      id: 'n1', title: 'Two Heroes Teams Finished Runners-Up at Tournament of Champions', 
      category: 'Tournament', date: '2025-03-01', season: '2025',
      excerpt: 'The Heroes Softball Team made a remarkable impact, with two squads qualifying for the prestigious Tournament of Champions.',
      content: 'The Heroes Softball Team made a remarkable impact in 2025, with two squads qualifying for the prestigious Tournament of Champions. Playing in a highly competitive field, both the 55s AAA and 50s AAA teams fought through bracket play to reach the championship round, finishing as runners-up. This achievement reflects the dedication and skill of our players and coaching staff.',
      image: '/p/announcements/2383821/848/565/1771693088/fitted.pic', 
      author: 'Mike Marlow', pinned: true
    },
    {
      id: 'n2', title: 'Heroes Charge into KC with a Victory',
      category: 'Tournament', date: '2025-02-01', season: '2025',
      excerpt: 'The Heroes 55s team traveled to Kansas City and achieved an impressive 4-2 record, earning a coveted berth.',
      content: 'The Heroes 55s team traveled to Kansas City and achieved an impressive 4-2 record, earning a coveted berth in the championship bracket. The team showed incredible resilience, overcoming adversity in key games to secure their spot.',
      image: '', author: 'Scott Spratlen', pinned: false
    },
    {
      id: 'n3', title: 'Expansion Year - Two Teams in 2024',
      category: 'Announcement', date: '2024-12-01', season: '2024',
      excerpt: 'The Heroes Softball team expanded to include two teams: a 50s team and a 55s senior softball team.',
      content: 'The Heroes Softball team made bold strides by expanding to include two teams: a 50s team and a 55s senior softball team. This expansion allows more players to compete at the highest levels while building a deeper organizational foundation.',
      image: '', author: 'Mike Marlow', pinned: false
    },
  ],

  // ─── SPONSORS ─────────────────────────────────────────────
  sponsors: [
    { id: 's1', name: 'Heroes Irrigation', url: 'http://www.heroeslawncare.com', logo: '/p/sponsors/131468/1735252083/large.pic', tier: 'gold' },
    { id: 's2', name: 'Heroes Lawn Care', url: 'http://www.heroeslawncare.com', logo: '/p/sponsors/131469/1735252124/large.pic', tier: 'gold' },
    { id: 's3', name: 'Holes for Heroes Golf Event', url: 'https://holesforheroesne.com/', logo: '', tier: 'silver' },
    { id: 's4', name: 'Ollis Real Estate Group', url: 'https://ollisrealestategroup.com/', logo: '', tier: 'silver' },
  ],

  // ─── AWARDS ──────────────────────────────────────────────
  awards: [
    { id: 'a1', year: '2025', title: 'Tournament of Champions Runner-Up', team: '55s-aaa', description: 'Finished runner-up in the annual Tournament of Champions', icon: '🥈' },
    { id: 'a2', year: '2025', title: 'Tournament of Champions Runner-Up', team: '50s-aaa', description: 'Finished runner-up in the annual Tournament of Champions', icon: '🥈' },
    { id: 'a3', year: '2024', title: 'KC Classic Top 4', team: '55s-aaa', description: 'Finished in the top 4 at the KC Classic tournament', icon: '🏆' },
  ],

  // ─── HOME PAGE LAYOUT ─────────────────────────────────────
  // Page builder sections - each page stores its layout
  // ─── ACCOUNT REQUESTS ────────────────────────────────────
  // Pending player account requests awaiting admin approval
  accountRequests: [],

  pageLayouts: {
    home: [
      { id: 'hero', type: 'hero', visible: true, settings: {} },
      { id: 'teams', type: 'team-cards', visible: true, settings: { title: 'Our Teams', subtitle: 'Three competitive teams under one organization' } },
      { id: 'record', type: 'latest-results', visible: true, settings: { title: 'Latest Results', count: 5 } },
      { id: 'leaders', type: 'stat-leaders', visible: true, settings: { title: 'Season Leaders', categories: ['avg','hr','rbi'] } },
      { id: 'news', type: 'news-feed', visible: true, settings: { title: 'News & Updates', count: 4 } },
      { id: 'awards', type: 'awards', visible: true, settings: { title: 'Achievements', subtitle: 'Tournament honors and team accomplishments' } },
      { id: 'sponsors', type: 'sponsors', visible: true, settings: { title: 'Our Sponsors', subtitle: 'Thank you to our generous supporters' } },
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
  if (filters.season) games = games.filter(g => g.season === filters.season);
  if (filters.teamId) games = games.filter(g => g.teamId === filters.teamId);
  if (filters.dateFrom) games = games.filter(g => g.date >= filters.dateFrom);
  if (filters.dateTo) games = games.filter(g => g.date <= filters.dateTo);
  
  const totals = { g: 0, ab: 0, h: 0, s: 0, d: 0, t: 0, hr: 0, hbp: 0, k: 0, bb: 0, sf: 0, rbi: 0, r: 0 };
  games.forEach(game => {
    const stat = game.playerStats?.find(ps => ps.playerId === playerId);
    if (stat) {
      totals.g++;
      Object.keys(totals).forEach(k => { if (k !== 'g' && stat[k]) totals[k] += stat[k]; });
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
  if (filters.season) games = games.filter(g => g.season === filters.season);
  const wins = games.filter(g => g.result === 'W').length;
  const losses = games.filter(g => g.result === 'L').length;
  const ties = games.filter(g => g.result === 'T').length;
  return { wins, losses, ties, games: games.length };
}

function getLeaders(stat, limit = 5, filters = {}) {
  const data = loadData();
  const players = data.players.filter(p => p.active);
  const results = players.map(p => ({ player: p, stats: getPlayerStats(p.id, filters) }))
    .filter(x => x.stats.ab >= 5)
    .sort((a, b) => {
      const va = parseFloat('0' + a.stats[stat]) || a.stats[stat] || 0;
      const vb = parseFloat('0' + b.stats[stat]) || b.stats[stat] || 0;
      return vb - va;
    });
  return results.slice(0, limit);
}

// ─── SUPABASE CONFIG ──────────────────────────────────────
// Replace these two values after creating your Supabase project
const SUPABASE_URL     = 'https://mpgbgucmnxowteonldoh.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_qEfH752_O5r7F9pdKTalEA_B8P0LkV0';

// Collections that get synced to Supabase
const DB_COLLECTIONS = ['config','teams','players','games','events','news','awards','sponsors','accountRequests','pageLayouts'];

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

function importData(jsonStr) {
  try {
    const data = JSON.parse(jsonStr);
    saveData(data);
    return true;
  } catch(e) { return false; }
}
