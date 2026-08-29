/* ============================================================
   HEROES SENIOR SOFTBALL - Main Application
   ============================================================ */
'use strict';

// ─── ROUTER ────────────────────────────────────────────────
const Router = {
  routes: {},
  currentPage: null,
  init() {
    window.addEventListener('hashchange', () => this.dispatch());
    document.addEventListener('click', e => {
      const a = e.target.closest('[data-route]');
      if (a) { e.preventDefault(); this.navigate(a.dataset.route); }
    });
    this.dispatch();
  },
  register(path, fn) { this.routes[path] = fn; },
  navigate(path) { if (window.location.hash === '#' + path) { this.dispatch(); } else { window.location.hash = path; } },
  dispatch() {
    const hash = window.location.hash.replace('#', '') || '/';
    const parts = hash.split('/').filter(Boolean);
    const route = parts.length ? '/' + parts[0] : '/';
    this.currentPage = route;
    const fn = this.routes[route] || this.routes['*'];
    if (fn) fn(...parts.slice(1));
    else this.routes['/'] && this.routes['/']();
    window.scrollTo(0, 0);
    App.updateNav(route);
  }
};

// ─── HELPERS ────────────────────────────────────────────────
function gameResult(g) {
  if (g.heroScore != null && g.oppScore != null && g.heroScore !== '' && g.oppScore !== '') {
    const h = Number(g.heroScore), o = Number(g.oppScore);
    if (h > o) return 'W';
    if (h < o) return 'L';
    return 'T';
  }
  return g.result || '';
}

// ─── APP ────────────────────────────────────────────────────
const App = {
  main: null,
  init() {
    this.main = document.getElementById('main-content');
    this.buildNav();
    this.buildFooter();
    this.initMobileMenu();
    Router.init();
    this.initAnimations();
  },
  updateNav(route) {
    document.querySelectorAll('.nav-link').forEach(el => {
      if (!el.dataset.route) { el.classList.remove('active'); return; }
      // Normalise both sides to just the first path segment for comparison
      const elBase = el.dataset.route === '/' ? '/' : '/' + el.dataset.route.split('/').filter(Boolean)[0];
      el.classList.toggle('active', elBase === route);
    });
  },
  buildNav() {
    const data = loadData();
    const teamDropdown = data.teams.map(t =>
      `<a class="dropdown-item" data-route="/team/${t.id}">${t.name}</a>`
    ).join('');
    document.getElementById('main-nav').innerHTML = `
      <li class="nav-item"><a class="nav-link" data-route="/">Home</a></li>
      <li class="nav-item">
        <a class="nav-link has-dropdown">Teams</a>
        <div class="dropdown-menu">${teamDropdown}</div>
      </li>
      <li class="nav-item"><a class="nav-link" data-route="/players">Players</a></li>
      <li class="nav-item"><a class="nav-link" data-route="/stats">Stats</a></li>
      <li class="nav-item"><a class="nav-link" data-route="/schedule">Scoreboard</a></li>
      <li class="nav-item"><a class="nav-link" data-route="/tournament-results">Tournaments</a></li>
      <li class="nav-item"><a class="nav-link" data-route="/news">News</a></li>
      <li class="nav-item"><a class="nav-link" data-route="/events">Events</a></li>
      <li class="nav-item"><a class="nav-link" data-route="/awards">Awards</a></li>
      <li class="nav-item"><a class="nav-link" data-route="/gallery">Gallery</a></li>
      <li class="nav-item"><a class="nav-link" data-route="/about">About</a></li>
    `;
    // Inject auth slot — populated by HeroesAuth.refreshNavAuth()
    const navEl = document.getElementById('main-nav');
    const authSlot = document.createElement('div');
    authSlot.id = 'auth-nav-slot';
    navEl.parentElement.insertBefore(authSlot, navEl.nextSibling);

    // Slot now exists — populate it immediately with current auth state
    if (typeof HeroesAuth !== 'undefined') HeroesAuth.refreshNavAuth();

    const mobileLinks = document.getElementById('mobile-nav');
    mobileLinks.innerHTML = `
      <a class="mobile-nav-link" data-route="/">Home</a>
      ${data.teams.map(t => `<a class="mobile-nav-link" data-route="/team/${t.id}">${t.name}</a>`).join('')}
      <a class="mobile-nav-link" data-route="/players">Players</a>
      <a class="mobile-nav-link" data-route="/stats">Stats</a>
      <a class="mobile-nav-link" data-route="/schedule">Scoreboard</a>
      <a class="mobile-nav-link" data-route="/tournament-results">Tournaments</a>
      <a class="mobile-nav-link" data-route="/news">News</a>
      <a class="mobile-nav-link" data-route="/events">Events</a>
      <a class="mobile-nav-link" data-route="/awards">Awards</a>
      <a class="mobile-nav-link" data-route="/gallery">Gallery</a>
      <a class="mobile-nav-link" data-route="/about">About</a>
    `;
  },
  buildFooter() {
    const data = loadData();
    document.getElementById('site-footer').innerHTML = `
      <div class="footer-inner">
        <div class="footer-brand">
          <div class="footer-brand-logo">
            <img src="assets/img/heroes-logo.jpg" alt="Heroes Logo">
            <div class="footer-brand-name">${data.config.orgName}</div>
          </div>
          <p class="footer-tagline">A competitive senior men's softball organization featuring AAA, AA, Majors, and Majors Plus divisions. Building a legacy of excellence since ${data.config.foundedYear}.</p>
          <div class="footer-social">
            <a class="social-btn" href="${data.config.facebookUrl}" target="_blank" title="Facebook">f</a>
            <a class="social-btn" href="${data.config.storeUrl}" target="_blank" title="Store">🛒</a>
          </div>
        </div>
        <div class="footer-col">
          <h4>Teams</h4>
          <div class="footer-links">
            ${data.teams.map(t => `<a class="footer-link" data-route="/team/${t.id}">${t.name}</a>`).join('')}
          </div>
        </div>
        <div class="footer-col">
          <h4>Quick Links</h4>
          <div class="footer-links">
            <a class="footer-link" data-route="/stats">Stats & Leaderboards</a>
            <a class="footer-link" data-route="/schedule">Scoreboard</a>
            <a class="footer-link" data-route="/tournament-results">Tournaments</a>
            <a class="footer-link" data-route="/players">Player Directory</a>
            <a class="footer-link" data-route="/events">Events</a>
            <a class="footer-link" data-route="/awards">Awards</a>
            <a class="footer-link" data-route="/gallery">Gallery</a>
            <a class="footer-link" data-route="/news">News</a>
          </div>
        </div>
        <div class="footer-col">
          <h4>Connect</h4>
          <div class="footer-links">
            <a class="footer-link" data-route="/about">About Us</a>
            <a class="footer-link" data-route="/sponsors">Sponsors</a>
            <a class="footer-link" data-route="/contact">Contact</a>
            <a class="footer-link" href="${data.config.storeUrl}" target="_blank">Heroes Store</a>
            <a class="footer-link" href="admin.html">Admin Login</a>
          </div>
        </div>
      </div>
      <div class="footer-bottom">
        <p>© ${new Date().getFullYear()} ${data.config.orgName} · ${data.config.city}, ${data.config.state} · <a href="${data.config.facebookUrl}" target="_blank" style="color:rgba(255,255,255,0.4)">Facebook Group</a></p>
      </div>
    `;
  },
  initMobileMenu() {
    const btn = document.getElementById('mobile-menu-btn');
    const nav = document.getElementById('mobile-nav');
    btn.addEventListener('click', () => nav.style.display = nav.style.display === 'block' ? 'none' : 'block');
    nav.querySelectorAll('.mobile-nav-link').forEach(link => {
      link.addEventListener('click', () => { nav.style.display = 'none'; });
    });
  },
  initAnimations() {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
    }, { threshold: 0.1 });
    document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));
  },
  render(html) {
    // Stop any running carousel timers before wiping the DOM
    Object.keys(_carouselState).forEach(uid => {
      clearInterval(_carouselState[uid]?.timer);
    });
    Object.keys(_carouselState).forEach(k => delete _carouselState[k]);
    this.main.innerHTML = html;
    this.initAnimations();
    this.initCarousels();
  },
  initCarousels() {
    this.main.querySelectorAll('[data-carousel]').forEach(el => {
      const uid = el.dataset.carousel;
      const total = parseInt(el.dataset.carouselTotal || '0', 10);
      if (total > 1) window.carouselStart(uid, total);
    });
  },
  toast(msg, type = 'success') {
    const t = document.createElement('div');
    t.className = `alert alert-${type}`;
    t.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:9999;min-width:260px;box-shadow:var(--shadow-lg)';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  }
};

// ─── PHOTO GALLERY GRID ────────────────────────────────────────
// Masonry-style grid: multiple full photos visible, each with a
// gentle floating animation. Slots auto-rotate through album photos.
const _carouselState = {};

window.carouselStart = function(uid, total) {
  if (_carouselState[uid]) clearInterval(_carouselState[uid].timer);

  const el = document.querySelector(`[data-carousel="${uid}"]`);
  if (!el) return;

  const slotCount = parseInt(el.dataset.carouselSlots || total, 10);
  let photoUrls = [];
  try { photoUrls = JSON.parse(el.dataset.carouselPhotos || '[]'); } catch(e) {}

  // If all photos already shown, just run float animations — no rotation needed
  if (photoUrls.length <= slotCount) {
    _carouselState[uid] = { total, slotCount, photoUrls, nextPhoto: slotCount, nextSlot: 0, timer: null };
    return;
  }

  let nextPhoto = slotCount;
  let nextSlot  = 0;

  _carouselState[uid] = {
    total, slotCount, photoUrls,
    nextPhoto, nextSlot,
    timer: setInterval(() => {
      const s = _carouselState[uid];
      const slotIdx = s.nextSlot % s.slotCount;
      const photoUrl = s.photoUrls[s.nextPhoto % s.photoUrls.length];

      const wrapper = document.getElementById(`${uid}-slot-${slotIdx}`);
      const img     = wrapper?.querySelector('img');
      if (wrapper && img) {
        wrapper.style.opacity = '0';
        setTimeout(() => {
          img.src = photoUrl;
          wrapper.style.opacity = '1';
        }, 650);
      }
      s.nextPhoto++;
      s.nextSlot++;
    }, 3800)
  };
};

// Kept for backward-compat (initCarousels calls carouselStart)
window.carouselNav  = function() {};
window.carouselGoto = function() {};

function buildPhotoGallerySection(settings, data) {
  const albumId   = settings?.albumId;
  const maxPhotos = Math.max(4, Math.min(parseInt(settings?.count || 30), 60));
  const album     = albumId ? (data.albums || []).find(a => a.id === albumId) : null;

  if (!album) return `
    <section style="background:#0d0d0d;padding:60px 24px;text-align:center">
      <div style="color:#444;font-size:14px">📷 Photo Gallery — no album selected.<br>
        <span style="font-size:12px;color:#333">Configure this section in the Page Builder.</span>
      </div>
    </section>`;

  const photos = (data.photos || []).filter(p => p.albumId === albumId).slice(0, maxPhotos);
  if (!photos.length) return `
    <section style="background:#0d0d0d;padding:60px 24px;text-align:center">
      <div style="color:#444;font-size:14px">📷 "${album.name}" has no photos yet.</div>
    </section>`;

  const uid      = 'cg-' + albumId.replace(/[^a-z0-9]/gi, '');
  const title    = settings?.title || album.name;
  const teamName = album.teamId ? (data.teams||[]).find(t => t.id === album.teamId)?.shortName : null;
  const dateStr  = album.date ? new Date(album.date+'T12:00:00').toLocaleDateString('en-US',{month:'long',year:'numeric'}) : '';
  const meta     = [dateStr, teamName].filter(Boolean).join(' · ');

  // How many slots to show (max 9 in a 3-col grid)
  const slotCount   = Math.min(photos.length, 9);
  const photoUrlsJson = JSON.stringify(photos.map(p => p.url));

  // 6 float-animation variants — applied round-robin to slots
  // Scale only (no translateY) so the whole photo stays in frame
  const floatAnims = [
    { name:'fg-a', kf:'0%,100%{transform:scale(1) rotate(0deg)} 50%{transform:scale(1.022) rotate(0.35deg)}',      dur:5.4, delay:0   },
    { name:'fg-b', kf:'0%,100%{transform:scale(1.018) rotate(-0.25deg)} 50%{transform:scale(1.0) rotate(0.2deg)}', dur:4.9, delay:-1.2},
    { name:'fg-c', kf:'0%,100%{transform:scale(1.01) rotate(0.15deg)} 50%{transform:scale(1.024) rotate(-0.3deg)}',dur:6.1, delay:-2.1},
    { name:'fg-d', kf:'0%,100%{transform:scale(1) rotate(-0.2deg)} 33%{transform:scale(1.016) rotate(0.1deg)} 66%{transform:scale(1.006) rotate(-0.35deg)}', dur:5.7, delay:-0.8},
    { name:'fg-e', kf:'0%,100%{transform:scale(1.014) rotate(0.3deg)} 50%{transform:scale(1.002) rotate(-0.15deg)}',dur:4.6, delay:-3.0},
    { name:'fg-f', kf:'0%,100%{transform:scale(1.02) rotate(-0.1deg)} 50%{transform:scale(1.0) rotate(0.25deg)}',   dur:5.2, delay:-1.7},
  ];

  const keyframes = floatAnims.map(a =>
    `@keyframes ${a.name} { ${a.kf} }`).join('\n  ');

  // Each slot: clip wrapper with transition + floating img
  const slots = photos.slice(0, slotCount).map((ph, i) => {
    const fa = floatAnims[i % floatAnims.length];
    const safeAlt = (ph.caption || '').replace(/"/g, '&quot;');
    return `
    <div id="${uid}-slot-${i}"
      style="break-inside:avoid;margin-bottom:8px;border-radius:10px;overflow:hidden;
        background:#111;position:relative;cursor:pointer;transition:opacity 0.65s ease;">
      <img src="${ph.url}" alt="${safeAlt}"
        style="width:100%;height:auto;display:block;transform-origin:center center;
          animation:${fa.name} ${fa.dur}s ease-in-out infinite;animation-delay:${fa.delay}s;">
      <div style="position:absolute;inset:0;pointer-events:none;
        background:linear-gradient(to top,rgba(0,0,0,0.55) 0%,rgba(0,0,0,0.08) 35%,transparent 60%);"></div>
      ${ph.caption ? `<div style="position:absolute;bottom:8px;left:10px;right:10px;
        color:rgba(255,255,255,0.9);font-size:11px;font-style:italic;
        text-shadow:0 1px 5px rgba(0,0,0,0.9);line-height:1.3;">${ph.caption}</div>` : ''}
    </div>`;
  }).join('');

  return `
<style id="${uid}-css">
  ${keyframes}
  #${uid}-grid { columns: 3; column-gap: 8px; }
  @media (max-width: 700px) { #${uid}-grid { columns: 2; } }
  @media (max-width: 400px) { #${uid}-grid { columns: 1; } }
</style>
<section style="background:#0a0a0a;overflow:hidden;">

  <!-- Header -->
  <div style="padding:22px 22px 14px;display:flex;align-items:baseline;justify-content:space-between;gap:12px;">
    <div>
      <div style="color:#fff;font-size:20px;font-weight:900;letter-spacing:-0.02em;line-height:1.1;">${title}</div>
      ${meta ? `<div style="color:#555;font-size:12px;margin-top:4px;letter-spacing:0.02em;">${meta}</div>` : ''}
    </div>
    <div style="color:#333;font-size:12px;white-space:nowrap;letter-spacing:0.03em;">${photos.length} photos</div>
  </div>

  <!-- Masonry grid -->
  <div id="${uid}-grid"
    data-carousel="${uid}"
    data-carousel-total="${photos.length}"
    data-carousel-slots="${slotCount}"
    data-carousel-photos='${photoUrlsJson}'
    style="padding:0 8px 8px;">
    ${slots}
  </div>

  <!-- Footer -->
  <div style="padding:12px 22px 16px;display:flex;align-items:center;justify-content:space-between;
    border-top:1px solid #161616;">
    <div style="color:#2e2e2e;font-size:11px;letter-spacing:0.04em;text-transform:uppercase;">
      ${photos.length > slotCount ? `Showing ${slotCount} of ${photos.length} · rotating every few seconds` : `${photos.length} photo${photos.length!==1?'s':''}`}
    </div>
    <a data-route="/gallery" style="color:#e74c3c;font-size:11px;font-weight:800;
      letter-spacing:0.07em;text-decoration:none;text-transform:uppercase;">
      View Full Gallery →
    </a>
  </div>
</section>`;
}

// ─── HOME: SEASON LEADERS HELPERS ─────────────────────────────
// Globally exposed so the inline <select onchange> handler can call it.
window.buildHomeLeadersHtml = function(year, teamId) {
  try {
    const data = loadData();
    const cats = { avg: 'Batting AVG', hr: 'Home Runs', rbi: 'RBIs' };
    const yearLabel = year === 'all' ? 'Career (All Years)' : `${year} Season`;
    const teamObj = (teamId && teamId !== 'all') ? data.teams.find(t => t.id === teamId) : null;
    const label = teamObj ? `${yearLabel} · ${teamObj.shortName}` : yearLabel;
    return Object.keys(cats).map(stat => {
      const top = getSeasonLeaders(stat, year, teamId || 'all', 5);
      const items = top.map((x, i) => {
        const p = x.player;
        const team = data.teams.find(t => t.id === (p.teams || [])[0]);
        let value = x.stats[stat];
        if (stat === 'avg' && typeof value === 'string') value = value.replace(/^0\./, '.');
        return `<div class="leaderboard-item">
          <div class="lb-rank ${i===0?'top':''}">${i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}</div>
          <div class="lb-info">
            <div class="lb-player">${p.firstName} ${p.lastName}</div>
            <div class="lb-team">${team?.shortName || ''}</div>
          </div>
          <div class="lb-value">${value}</div>
        </div>`;
      }).join('') || '<div style="padding:20px;color:rgba(255,255,255,0.5);text-align:center;font-size:13px">No stats yet</div>';
      return `<div class="leaderboard-card fade-in">
        <div class="leaderboard-card-header"><h3>${cats[stat]}</h3><span>${label}</span></div>
        ${items}
      </div>`;
    }).join('');
  } catch (err) {
    console.error('[Season Leaders] build failed:', err);
    return `<div style="padding:24px;color:#ff8888;text-align:center;grid-column:1/-1">Could not render leaders: ${err.message}</div>`;
  }
};

window.renderHomeLeaders = function() {
  const el = document.getElementById('leaders-content');
  if (!el) return;
  const year   = document.getElementById('leaders-year')?.value || 'all';
  const teamId = document.getElementById('leaders-team')?.value || 'all';
  el.innerHTML = window.buildHomeLeadersHtml(year, teamId);
  // .fade-in starts at opacity:0 and is normally revealed by IntersectionObserver
  // in App.initAnimations(). The observer is set up once on full-page render and
  // does NOT pick up nodes added later via innerHTML — so the new cards would
  // stay invisible. Reveal them directly.
  el.querySelectorAll('.fade-in').forEach(e => e.classList.add('visible'));
};

// ─── TEAM PAGE: ROSTER ROW HELPERS ─────────────────────────────
// Roster stats come from p.seasonStats[year] (or p.careerStats when year='all').
// data.games[].playerStats is intentionally not used here — the Excel import only
// brought season/career totals, not per-game breakdowns.
window.buildTeamRosterRows = function(teamId, year) {
  const data = loadData();
  const stripZero = v => (typeof v === 'string') ? v.replace(/^0\./, '.') : (v ?? '–');
  const players = data.players.filter(p => p.teams.includes(teamId) && p.active);
  return players.map(p => {
    const s = (year === 'all') ? p.careerStats : (p.seasonStats && p.seasonStats[year]);
    let g = '–', ab = '–', avg = '–', h = '–', hr = '–', rbi = '–', obp = '–', slg = '–';
    if (s) {
      g   = s.gp ?? s.g ?? 0;
      ab  = s.ab ?? 0;
      avg = stripZero(s.avg ?? '.000');
      h   = s.h ?? 0;
      hr  = s.hr ?? 0;
      rbi = s.rbi ?? 0;
      obp = stripZero(s.obp ?? '.000');
      const slgVal = s.slg != null ? s.slg
                   : StatCalc.slg(s.s||0, s.d||0, s.t||0, s.hr||0, s.ab||0);
      slg = stripZero(slgVal);
    }
    return `<tr>
      <td><span style="color:var(--red);font-weight:800">#${p.number}</span></td>
      <td><div class="player-cell">
        <div style="width:28px;height:28px;border-radius:50%;background:var(--dark);display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,0.5);font-size:10px;font-weight:900;flex-shrink:0">${(p.firstName||'?')[0]}${(p.lastName||'?')[0]}</div>
        <span class="player-name" data-route="/player/${p.id}">${p.firstName} ${p.lastName}</span>
      </div></td>
      <td>${p.position || ''}</td>
      <td>${p.bats}/${p.throws}</td>
      <td>${g}</td>
      <td>${ab}</td>
      <td class="stat-highlight">${avg}</td>
      <td>${h}</td>
      <td>${hr}</td>
      <td>${rbi}</td>
      <td>${obp}</td>
      <td>${slg}</td>
    </tr>`;
  }).join('');
};

window.renderTeamRoster = function() {
  const sel = document.getElementById('team-roster-year');
  const tbody = document.getElementById('team-roster-tbody');
  if (!sel || !tbody) return;
  const teamId = sel.dataset.teamId;
  const year = sel.value;
  const rows = window.buildTeamRosterRows(teamId, year);
  tbody.innerHTML = rows || '<tr><td colspan="12" style="text-align:center;color:var(--gray);padding:30px">No players on roster</td></tr>';
};

// ─── PAGE: HOME ─────────────────────────────────────────────
function renderHome() {
  const data = loadData();
  const layout = data.pageLayouts?.home || [];
  
  // Build team cards
  const _homeYear = new Date().getFullYear();
  const teamCards = data.teams.map(team => {
    const rec = getTeamRecord(team.id, { season: _homeYear });
    return `
      <div class="team-card fade-in" data-route="/team/${team.id}" style="cursor:pointer">
        <div class="team-card-banner" style="background:${team.color}"></div>
        <div class="team-card-body">
          <div class="team-name">${team.name}</div>
          <div class="team-division">${team.division} Division · Manager: ${team.manager || 'TBD'}</div>
          <div class="team-record-row">
            <div class="team-record-item"><div class="num">${rec.wins}</div><div class="lbl">Wins</div></div>
            <div class="team-record-item"><div class="num">${rec.losses}</div><div class="lbl">Losses</div></div>
            <div class="team-record-item"><div class="num">${data.players.filter(p=>p.teams.includes(team.id)&&p.active).length}</div><div class="lbl">Players</div></div>
          </div>
        </div>
        <div class="team-card-footer">
          <span class="tag" style="background:${team.color};color:#fff">${team.division}</span>
          <a class="btn btn-sm btn-dark" data-route="/team/${team.id}">View Team →</a>
        </div>
      </div>`;
  }).join('');

  // Latest results
  const recentGames = [...data.games].sort((a,b) => b.date.localeCompare(a.date)).slice(0, 5);
  const gameRows = recentGames.map(g => {
    const team = data.teams.find(t => t.id === g.teamId);
    const d = new Date(g.date + 'T12:00:00');
    return `
      <div class="game-item ${gameResult(g) === 'W' ? 'win' : gameResult(g) === 'L' ? 'loss' : ''}">
        <div>
          <div class="game-date-day">${d.toLocaleDateString('en-US',{month:'short',day:'numeric'})}</div>
          <div class="game-date">${d.toLocaleDateString('en-US',{year:'numeric'})}</div>
        </div>
        <div>
          <div class="game-vs">vs</div>
          <div class="game-opponent">${g.opponent}</div>
          <div class="game-location">📍 ${g.location}</div>
        </div>
        <div class="game-score">
          <div class="score">
            <span class="score-hero">${g.heroScore ?? '–'}</span>
            <span class="score-sep">-</span>
            <span class="score-opp">${g.oppScore ?? '–'}</span>
          </div>
          <div style="font-size:11px;color:var(--gray)">${team?.shortName}</div>
        </div>
        <div class="game-result">
          ${gameResult(g) ? `<span class="result-badge result-${gameResult(g)}">${gameResult(g)}</span>` : '<span style="color:var(--gray);font-size:12px">TBD</span>'}
        </div>
      </div>`;
  }).join('');

  // Stat leaders — initial render uses most-recent available season + all teams
  const seasons = getAvailableSeasons();
  const initialYear = seasons[0] || 'all';
  const initialTeam = 'all';
  const leaders = window.buildHomeLeadersHtml(initialYear, initialTeam);
  const yearOptions = [
    ...seasons.map(y => `<option value="${y}"${y===initialYear?' selected':''}>${y} Season</option>`),
    `<option value="all"${initialYear==='all'?' selected':''}>All Years (Career)</option>`,
  ].join('');
  const teamOptions = [
    `<option value="all" selected>All Teams</option>`,
    ...data.teams.map(t => `<option value="${t.id}">${t.shortName || t.name}</option>`),
  ].join('');

  // News
  const newsItems = data.news.slice(0, 3).map(n => {
    const d = new Date(n.date + 'T12:00:00');
    return `
      <div class="news-card fade-in" data-route="/news/article/${n.id}" style="cursor:pointer">
        ${n.image ? `<div class="news-card-img"><img src="${n.image}" alt="" onerror="this.parentElement.style.display='none'"></div>` : 
          `<div class="news-card-img" style="height:80px;background:linear-gradient(135deg,var(--dark),var(--red-dark))"></div>`}
        <div class="news-card-body">
          <div class="news-card-meta">
            <span class="tag tag-red">${n.category}</span>
            <span>${d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</span>
          </div>
          <div class="news-card-title">${n.title}</div>
          <div class="news-card-excerpt">${n.excerpt}</div>
        </div>
      </div>`;
  }).join('');

  // Awards
  const awardsHtml = data.awards.slice(0, 6).map(a => {
    const team = data.teams.find(t => t.id === a.team);
    return `<div class="award-card fade-in">
      <div class="award-icon">${a.icon}</div>
      <div>
        <div class="award-title">${a.title}</div>
        <div class="award-detail">${a.description}</div>
        <div class="award-year">${a.year} · ${team?.name || ''}</div>
      </div>
    </div>`;
  }).join('');

  // Sponsors
  const sponsorsHtml = data.sponsors.map(s =>
    `<a class="sponsor-item" href="${s.url}" target="_blank" rel="nofollow">
      ${s.logo ? `<img src="${s.logo}" alt="${s.name}" onerror="this.style.display='none'">` : ''}
      <span class="sponsor-name">${s.name}</span>
    </a>`
  ).join('');

  // Upcoming events
  const upcomingEvents = data.events.filter(e => e.status === 'upcoming').slice(0, 3);
  const eventsHtml = upcomingEvents.map(ev => {
    const d = new Date(ev.date + 'T12:00:00');
    return `<div style="display:flex;gap:16px;align-items:flex-start;padding:14px 0;border-bottom:1px solid var(--gray-light)">
      <div style="background:var(--red);color:#fff;padding:8px 12px;border-radius:var(--radius);text-align:center;min-width:54px;flex-shrink:0">
        <div style="font-size:18px;font-weight:900;line-height:1">${d.getDate()}</div>
        <div style="font-size:10px;text-transform:uppercase;margin-top:2px">${d.toLocaleDateString('en-US',{month:'short'})}</div>
      </div>
      <div>
        <div style="font-weight:800;font-size:15px">${ev.name}</div>
        <div style="font-size:13px;color:var(--gray);margin-top:3px">📍 ${ev.location}</div>
        <div style="font-size:12px;color:var(--gray);margin-top:2px">${ev.teams.map(id=>data.teams.find(t=>t.id===id)?.shortName).filter(Boolean).join(', ')}</div>
      </div>
    </div>`;
  }).join('');

  const _curYear = new Date().getFullYear();
  const _curRec = data.teams.reduce((acc, t) => {
    const r = getTeamRecord(t.id, { season: _curYear });
    return { w: acc.w + r.wins, l: acc.l + r.losses };
  }, { w: 0, l: 0 });
  const _curW = _curRec.w;
  const _curL = _curRec.l;
  const _curTotal = _curW + _curL;
  const _curPct = _curTotal ? (_curW/_curTotal).toFixed(3).replace(/^0/,'') : '.000';

  // Section fragments — keyed by Page Builder type
  const _sections = {
    'hero': `
    <section id="hero">
      <div class="hero-bg-text">HEROES</div>
      <div class="hero-accent" aria-hidden="true"><img src="assets/img/hero_bg.png" alt=""></div>
      <div class="hero-inner">
        <div class="hero-content">
          <div class="hero-tag">⚾ Omaha, NE · Est. ${data.config.foundedYear}</div>
          <h1 class="hero-title">Heroes<br><span>Senior Softball</span></h1>
          <p class="hero-subtitle">Competitive senior men's softball — ${data.teams.length} teams, one organization, a legacy of excellence.</p>
          <div class="hero-season-record">
            <div class="hero-season-year">${_curYear} Season</div>
            <div class="hero-season-wl"><span class="hero-season-w">${_curW}W</span><span class="hero-season-sep">–</span><span class="hero-season-l">${_curL}L</span></div>
            <div class="hero-season-pct">${_curPct} Win%</div>
          </div>
          <div class="hero-record">
            <div class="hero-stat">
              <div class="hero-stat-num">${_curTotal}</div>
              <div class="hero-stat-label">Games Played</div>
            </div>
            <div class="hero-stat-divider"></div>
            <div class="hero-stat">
              <div class="hero-stat-num">${data.teams.length}</div>
              <div class="hero-stat-label">Teams</div>
            </div>
            <div class="hero-stat-divider"></div>
            <div class="hero-stat">
              <div class="hero-stat-num">${data.players.filter(p=>p.active).length}+</div>
              <div class="hero-stat-label">Players</div>
            </div>
          </div>
          <div class="hero-ctas">
            <a class="btn btn-primary" data-route="/stats">📊 Season Stats</a>
            <a class="btn btn-outline" data-route="/schedule">View Schedule</a>
            <a class="btn btn-gold" href="${data.config.storeUrl}" target="_blank">🛒 Heroes Store</a>
          </div>
        </div>
      </div>
    </section>`,

    'team-cards': `
    <section class="section">
      <div class="container">
        <div class="section-header">
          <div class="section-label">Organization</div>
          <h2>Our <span>Teams</span></h2>
          <p>Three competitive teams competing at the highest levels of senior softball</p>
        </div>
        <div class="cards-grid cards-3">${teamCards}</div>
      </div>
    </section>`,

    'latest-results': `
    <section class="section section-light">
      <div class="container">
        <div class="section-header">
          <div class="section-label">Results</div>
          <h2>Latest <span>Results</span></h2>
        </div>
        <div class="game-list">${gameRows || '<p style="color:var(--gray)">No games recorded yet</p>'}</div>
        <div style="margin-top:16px"><a class="btn btn-dark btn-sm" data-route="/schedule">View Full Schedule →</a></div>
      </div>
    </section>`,

    'upcoming-events': `
    <section class="section">
      <div class="container">
        <div class="section-header">
          <div class="section-label">Calendar</div>
          <h2>Upcoming <span>Events</span></h2>
        </div>
        ${eventsHtml || '<p style="color:var(--gray)">No upcoming events</p>'}
        <div style="margin-top:16px"><a class="btn btn-dark btn-sm" data-route="/events">All Events →</a></div>
      </div>
    </section>`,

    'stat-leaders': `
    <section class="section section-dark">
      <div class="container">
        <div class="section-header" style="display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap">
          <div>
            <div class="section-label">Performance</div>
            <h2>Season <span>Leaders</span></h2>
            <p>Top performers across all Heroes teams</p>
          </div>
          <div class="leaders-controls">
            <label for="leaders-team">Team</label>
            <select id="leaders-team" class="leaders-select" onchange="window.renderHomeLeaders()">
              ${teamOptions}
            </select>
            <label for="leaders-year" style="margin-left:8px">Season</label>
            <select id="leaders-year" class="leaders-select" onchange="window.renderHomeLeaders()">
              ${yearOptions}
            </select>
          </div>
        </div>
        <div id="leaders-content" class="leaderboard-section">${leaders}</div>
        <div style="margin-top:24px;text-align:center"><a class="btn btn-gold" data-route="/stats">Full Stats & Leaderboards →</a></div>
      </div>
    </section>`,

    'news-feed': `
    <section class="section">
      <div class="container">
        <div class="section-header">
          <div class="section-label">News</div>
          <h2>Latest <span>Updates</span></h2>
        </div>
        <div class="cards-grid cards-3">${newsItems}</div>
        <div style="margin-top:24px;text-align:center"><a class="btn btn-dark" data-route="/news">All News & Announcements →</a></div>
      </div>
    </section>`,

    'awards': `
    <section class="section section-light">
      <div class="container">
        <div class="section-header">
          <div class="section-label">Honors</div>
          <h2>Team <span>Achievements</span></h2>
        </div>
        <div class="awards-grid">${awardsHtml}</div>
      </div>
    </section>`,

    'sponsors': `
    <section class="section">
      <div class="container">
        <div class="section-header text-center">
          <div class="section-label">Partners</div>
          <h2>Our <span>Sponsors</span></h2>
          <p>Thank you to our generous supporters who make this possible</p>
        </div>
        <div class="sponsors-row">${sponsorsHtml}</div>
        <div style="text-align:center;margin-top:8px"><a class="btn btn-sm btn-outline btn-dark" data-route="/sponsors">Become a Sponsor</a></div>
      </div>
    </section>`,
  };

  // Default combined results+schedule section (shown when no layout is configured)
  const _defaultResultsSchedule = `
    <section class="section section-light">
      <div class="container">
        <div style="display:grid;grid-template-columns:1fr 320px;gap:32px">
          <div>
            <div class="section-header">
              <div class="section-label">Results</div>
              <h2>Latest <span>Results</span></h2>
            </div>
            <div class="game-list">${gameRows || '<p style="color:var(--gray)">No games recorded yet</p>'}</div>
            <div style="margin-top:16px"><a class="btn btn-dark btn-sm" data-route="/schedule">View Full Schedule →</a></div>
          </div>
          <div>
            <div class="section-header">
              <div class="section-label">Calendar</div>
              <h2>Upcoming <span>Events</span></h2>
            </div>
            ${eventsHtml || '<p style="color:var(--gray)">No upcoming events</p>'}
            <div style="margin-top:16px"><a class="btn btn-dark btn-sm" data-route="/events">All Events →</a></div>
          </div>
        </div>
      </div>
    </section>`;

  let pageHtml;
  if (layout.length > 0) {
    // Page Builder is configured — render visible sections in layout order
    pageHtml = layout
      .filter(s => s.visible !== false)
      .map(s => {
        if (s.type === 'photo-gallery') return buildPhotoGallerySection(s.settings || {}, data);
        return _sections[s.type] || '';
      })
      .join('');
  } else {
    // No layout configured — render default order with combined results+schedule
    pageHtml = _sections['hero'] + _sections['team-cards'] + _defaultResultsSchedule +
               _sections['stat-leaders'] + _sections['news-feed'] + _sections['awards'] + _sections['sponsors'];
  }

  App.render(pageHtml);
}

// ─── PAGE: TEAM ─────────────────────────────────────────────
function renderTeam(teamId) {
  const data = loadData();
  const team = data.teams.find(t => t.id === teamId);
  if (!team) return renderNotFound();

  const record = getTeamRecord(team.id);
  const players = data.players.filter(p => p.teams.includes(teamId) && p.active);
  const games = [...data.games.filter(g => g.teamId === teamId)].sort((a,b) => b.date.localeCompare(a.date));

  const rosterSeasons = getAvailableSeasons();
  const initialRosterYear = rosterSeasons[0] || 'all';
  const rosterRows = window.buildTeamRosterRows(teamId, initialRosterYear);
  const rosterYearOptions = [
    ...rosterSeasons.map(y => `<option value="${y}"${y===initialRosterYear?' selected':''}>${y} Season</option>`),
    `<option value="all"${initialRosterYear==='all'?' selected':''}>Career (All Years)</option>`,
  ].join('');

  const gameRows = games.map(g => {
    const d = new Date(g.date + 'T12:00:00');
    return `<div class="game-item ${gameResult(g)==='W'?'win':gameResult(g)==='L'?'loss':'upcoming'}">
      <div>
        <div class="game-date-day">${d.toLocaleDateString('en-US',{month:'short',day:'numeric'})}</div>
        <div class="game-date">${g.season}</div>
      </div>
      <div>
        <div class="game-vs">vs</div>
        <div class="game-opponent">${g.opponent}</div>
        <div class="game-location">📍 ${g.location}</div>
      </div>
      <div class="game-score"><div class="score">
        <span class="score-hero">${g.heroScore??'–'}</span><span class="score-sep">-</span><span class="score-opp">${g.oppScore??'–'}</span>
      </div></div>
      <div class="game-result">${gameResult(g)?`<span class="result-badge result-${gameResult(g)}">${gameResult(g)}</span>`:'<span style="color:var(--gray);font-size:12px">TBD</span>'}</div>
    </div>`;
  }).join('');

  App.render(`
    <div class="page-banner" style="border-bottom:4px solid ${team.color}">
      <div class="page-banner-inner">
        <div class="breadcrumb"><a data-route="/">Home</a><span>Teams</span><span>${team.name}</span></div>
        <h1><span>${team.name}</span></h1>
        <p>${team.division} Division · Manager: ${team.manager || 'TBD'}</p>
        <div style="display:flex;gap:20px;margin-top:16px">
          <div class="hero-stat"><div class="hero-stat-num">${record.wins}</div><div class="hero-stat-label">Wins</div></div>
          <div class="hero-stat-divider" style="height:40px"></div>
          <div class="hero-stat"><div class="hero-stat-num">${record.losses}</div><div class="hero-stat-label">Losses</div></div>
          <div class="hero-stat-divider" style="height:40px"></div>
          <div class="hero-stat"><div class="hero-stat-num">${record.ties}</div><div class="hero-stat-label">Ties</div></div>
          <div class="hero-stat-divider" style="height:40px"></div>
          <div class="hero-stat"><div class="hero-stat-num">${players.length}</div><div class="hero-stat-label">Roster</div></div>
        </div>
      </div>
    </div>
    <section class="section">
      <div class="container">
        <div class="tabs">
          <button class="tab-btn active" onclick="switchTab(event,'tab-roster')">Roster & Stats</button>
          <button class="tab-btn" onclick="switchTab(event,'tab-schedule')">Schedule & Results</button>
        </div>
        <div id="tab-roster" class="tab-content active">
          <div style="display:flex;justify-content:flex-end;align-items:center;gap:8px;margin-bottom:12px">
            <label for="team-roster-year" style="font-size:12px;color:var(--gray);text-transform:uppercase;letter-spacing:0.5px;font-weight:700">Season</label>
            <select id="team-roster-year" class="leaders-select" data-team-id="${team.id}" onchange="window.renderTeamRoster()">
              ${rosterYearOptions}
            </select>
          </div>
          <div class="stats-table-wrap">
            <table class="stats-table">
              <thead><tr>
                <th>#</th><th>Player</th><th>POS</th><th>B/T</th>
                <th>G</th><th>AB</th><th class="stat-highlight">AVG</th>
                <th>H</th><th>HR</th><th>RBI</th><th>OBP</th><th>SLG</th>
              </tr></thead>
              <tbody id="team-roster-tbody">${rosterRows || '<tr><td colspan="12" style="text-align:center;color:var(--gray);padding:30px">No players on roster</td></tr>'}</tbody>
            </table>
          </div>
        </div>
        <div id="tab-schedule" class="tab-content">
          <div class="game-list">${gameRows || '<p style="color:var(--gray)">No games recorded</p>'}</div>
        </div>
      </div>
    </section>
  `);
}

// ─── PAGE: PLAYERS ──────────────────────────────────────────
function renderPlayers() {
  const data = loadData();
  const seasons = [...new Set(data.games.map(g => g.season).filter(Boolean))].sort().reverse();
  App.render(`
    <div class="page-banner">
      <div class="page-banner-inner">
        <div class="breadcrumb"><a data-route="/">Home</a><span>Players</span></div>
        <h1>Player <span>Directory</span></h1>
        <p>All active Heroes Senior Softball players</p>
      </div>
    </div>
    <section class="section">
      <div class="container">
        <div class="filter-row">
          <input type="text" class="search-input" id="player-search" placeholder="Search players..." oninput="filterPlayers()">
          <select class="form-select" id="player-team-filter" onchange="filterPlayers()">
            <option value="">All Teams</option>
            ${data.teams.map(t=>`<option value="${t.id}">${t.name}</option>`).join('')}
          </select>
          <select class="form-select" id="player-season-filter" onchange="setPlayerSeasonFilter(this.value)" style="max-width:130px">
            <option value="">Career Stats</option>
            ${seasons.map(s=>`<option value="${s}" ${_playerSeasonFilter===s?'selected':''}>${s} Season</option>`).join('')}
          </select>
          <button class="filter-btn active" onclick="filterByStatus(this,'true')" data-status="true">Active</button>
          <button class="filter-btn" onclick="filterByStatus(this,'false')" data-status="false">Former</button>
          <button class="filter-btn" onclick="filterByStatus(this,'all')" data-status="all">All</button>
          ${(typeof HeroesAuth !== 'undefined' && HeroesAuth.canUseFanFeatures()) ? `<button class="filter-btn" onclick="filterByStatus(this,'favorites')" data-status="favorites">⭐ Favorites</button>` : ''}
        </div>
        <div class="player-grid" id="player-grid">
          ${renderPlayerCards(data.players.filter(p => p.active), data)}
        </div>
      </div>
    </section>
  `);
}

window.setPlayerSeasonFilter = function(val) {
  _playerSeasonFilter = val || null;
  filterPlayers();
};

window.toggleFavoritePlayer = function(playerId, btn) {
  if (typeof HeroesAuth === 'undefined' || !HeroesAuth.canUseFanFeatures()) return;
  const isFav = HeroesAuth.toggleFavorite(playerId);
  if (btn.id === 'profile-fav-btn') {
    btn.textContent = isFav ? '⭐ Favorited' : '☆ Add to Favorites';
    btn.style.background = isFav ? '#fef9c3' : 'rgba(255,255,255,0.1)';
    btn.style.color = isFav ? '#92400e' : '#fff';
    btn.style.borderColor = isFav ? '#fde68a' : 'rgba(255,255,255,0.3)';
  } else {
    btn.textContent = isFav ? '⭐' : '☆';
    btn.title = isFav ? 'Remove from favorites' : 'Add to favorites';
    btn.style.opacity = isFav ? '1' : '0.6';
  }
  App.toast(isFav ? 'Added to favorites!' : 'Removed from favorites', 'info');
};

function renderPlayerCards(players, data) {
  const canFav = typeof HeroesAuth !== 'undefined' && HeroesAuth.canUseFanFeatures();
  const seasonFilter = _playerSeasonFilter || null;
  return players.map(p => {
    const stats = seasonFilter ? getPlayerStats(p.id, { season: seasonFilter }) : getPlayerStats(p.id);
    const yrs = new Date().getFullYear() - p.joinYear + 1;
    const playerTeams = (p.teams || []).map(tid => data.teams.find(t => t.id === tid)).filter(Boolean);
    const teamColor = playerTeams[0]?.color || '#C8102E';
    const teamNames = playerTeams.map(t => t.shortName || t.name).join(' · ') || 'Heroes';
    const initials = `${p.firstName?.[0] || ''}${p.lastName?.[0] || ''}` || '?';
    const fullName = `${p.firstName || ''} ${p.lastName || ''}`.trim();
    const isFav = canFav && HeroesAuth.isFavorite(p.id);
    const favBtn = canFav
      ? `<button onclick="event.stopPropagation();toggleFavoritePlayer('${p.id}',this)" title="${isFav?'Remove from favorites':'Add to favorites'}"
           style="position:absolute;top:6px;right:6px;background:rgba(255,255,255,0.85);border:none;border-radius:50%;width:28px;height:28px;font-size:15px;cursor:pointer;display:flex;align-items:center;justify-content:center;opacity:${isFav?'1':'0.6'};z-index:2">${isFav?'⭐':'☆'}</button>`
      : '';

    return `<div class="bc-scene" data-route="/player/${p.id}">
      <div class="bc-card">
        <div class="bc-front">
          ${favBtn}
          <div class="bc-brand" style="background:${teamColor}">
            <span>HEROES SSB</span>
            <span>#${p.number || '—'}</span>
          </div>
          <div class="bc-photo">
            ${p.photo ? `<img src="${p.photo}" alt="${p.firstName || ''}" onerror="this.style.display='none'">` : ''}
            <div class="bc-initials" style="background:linear-gradient(150deg,${teamColor}cc 0%,${teamColor}44 100%)">${initials}</div>
          </div>
          <div class="bc-nameplate">
            <div class="bc-name">${fullName}</div>
            <div class="bc-subname">${p.position || 'Player'}</div>
          </div>
        </div>
        <div class="bc-back">
          <div class="bc-back-hdr" style="background:${teamColor}">
            <div class="bc-back-hdr-name">${fullName}</div>
            <div class="bc-back-hdr-num">#${p.number || '—'}</div>
          </div>
          <div class="bc-back-body">
            <div class="bc-row"><span>Position</span><strong>${p.position || '—'}</strong></div>
            <div class="bc-row"><span>Bat / Throw</span><strong>${p.bats || 'R'}/${p.throws || 'R'}</strong></div>
            <div class="bc-row"><span>Teams</span><strong>${teamNames}</strong></div>
            <div class="bc-row"><span>Since</span><strong>${p.joinYear} · ${yrs} ${yrs === 1 ? 'yr' : 'yrs'}</strong></div>
          </div>
          <div class="bc-back-stats">
            <div class="bc-bs"><div class="bc-bs-val">${stats.avg}</div><div class="bc-bs-lbl">AVG</div></div>
            <div class="bc-bs"><div class="bc-bs-val">${stats.hr}</div><div class="bc-bs-lbl">HR</div></div>
            <div class="bc-bs"><div class="bc-bs-val">${stats.rbi}</div><div class="bc-bs-lbl">RBI</div></div>
            <div class="bc-bs"><div class="bc-bs-val">${stats.ops}</div><div class="bc-bs-lbl">OPS</div></div>
          </div>
          <div class="bc-back-footer">${stats.g} G · ${stats.ab} AB · ${seasonFilter ? seasonFilter + ' Season' : 'Career'}</div>
        </div>
      </div>
    </div>`;
  }).join('') || '<div style="text-align:center;padding:40px;color:var(--gray);grid-column:1/-1">No players found</div>';
}

window.filterPlayers = function() {
  const data = loadData();
  const q = document.getElementById('player-search')?.value.toLowerCase() || '';
  const team = document.getElementById('player-team-filter')?.value || '';
  const statusBtn = document.querySelector('.filter-btn.active[data-status]');
  const status = statusBtn ? statusBtn.dataset.status : 'true';
  
  let players = data.players;
  if (status === 'true') players = players.filter(p => p.active);
  else if (status === 'false') players = players.filter(p => !p.active);
  else if (status === 'favorites') {
    const favs = typeof HeroesAuth !== 'undefined' ? HeroesAuth.getFavorites() : [];
    players = players.filter(p => favs.includes(p.id));
  }
  if (team) players = players.filter(p => p.teams.includes(team));
  if (q) players = players.filter(p => `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) || p.position.toLowerCase().includes(q));
  
  const grid = document.getElementById('player-grid');
  if (grid) grid.innerHTML = renderPlayerCards(players, data);
};

window.filterByStatus = function(btn, status) {
  document.querySelectorAll('.filter-btn[data-status]').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  window.filterPlayers();
};

// ─── PAGE: PLAYER PROFILE ───────────────────────────────────
function renderPlayer(playerId) {
  const data = loadData();
  const player = data.players.find(p => p.id === playerId);
  if (!player) return renderNotFound();
  
  const stats = getPlayerStats(playerId);
  const curSeason = String(new Date().getFullYear());
  const allSeasons = [...new Set(data.games.map(g => g.season).filter(Boolean))].sort().reverse();
  const stats25 = getPlayerStats(playerId, { season: curSeason });
  const yrs = new Date().getFullYear() - player.joinYear + 1;
  const teams = player.teams.map(id => data.teams.find(t => t.id === id)).filter(Boolean);
  const canFav = typeof HeroesAuth !== 'undefined' && HeroesAuth.canUseFanFeatures();
  const isFav = canFav && HeroesAuth.isFavorite(playerId);
  const profileFavBtn = canFav ? `
    <button id="profile-fav-btn" onclick="toggleFavoritePlayer('${playerId}', this)"
      style="margin-top:12px;padding:7px 18px;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;border:1px solid;transition:all 0.15s;background:${isFav?'#fef9c3':'rgba(255,255,255,0.12)'};color:${isFav?'#92400e':'#fff'};border-color:${isFav?'#fde68a':'rgba(255,255,255,0.3)'}">
      ${isFav ? '⭐ Favorited' : '☆ Add to Favorites'}
    </button>` : '';

  App.render(`
    <div class="player-profile-header">
      <div class="player-profile-inner">
        <div class="player-profile-photo">
          ${player.photo ? `<img src="${player.photo}" alt="${player.firstName}" onerror="this.parentElement.innerHTML='<div class=initials>${player.firstName[0]}${player.lastName[0]}</div>'">` :
          `<div class="initials">${player.firstName[0]}${player.lastName[0]}</div>`}
        </div>
        <div>
          <div class="breadcrumb"><a data-route="/">Home</a><span>Players</span></div>
          <h1 style="color:#fff;font-size:clamp(24px,5vw,40px);font-weight:900;margin-bottom:8px">${player.firstName} ${player.lastName}</h1>
          <div class="player-profile-meta">
            <div class="player-profile-meta-item">⚾ <strong>#${player.number}</strong></div>
            <div class="player-profile-meta-item">🧤 <strong>${player.position}</strong></div>
            <div class="player-profile-meta-item">🏏 <strong>${player.bats}/${player.throws}</strong> (Bat/Throw)</div>
            ${teams.map(t=>`<span class="tag tag-dark">${t.name}</span>`).join('')}
            <div class="years-badge">⭐ ${yrs} ${yrs===1?'Year':'Years'} with Heroes</div>
          </div>
          ${profileFavBtn}
        </div>
      </div>
    </div>
    <section class="section">
      <div class="container">
        <div class="tabs" style="display:flex;align-items:center;gap:4px;flex-wrap:wrap">
          <button class="tab-btn active" onclick="switchTab(event,'ptab-season')">Season</button>
          <select id="profile-season-select" onchange="switchProfileSeason('${playerId}',this.value)"
            style="padding:6px 10px;border-radius:8px;border:1px solid var(--border);font-size:13px;font-weight:700;cursor:pointer;background:var(--card-bg,#fff);color:var(--text);height:36px">
            ${allSeasons.map(s=>`<option value="${s}" ${s===curSeason?'selected':''}>${s}</option>`).join('')}
          </select>
          <button class="tab-btn" onclick="switchTab(event,'ptab-career')">Career</button>
          <button class="tab-btn" onclick="switchTab(event,'ptab-games')">Game Log</button>
        </div>
        <div id="ptab-season" class="tab-content active">
          <div class="career-stat-row">
            ${[['G',stats25.g],['AB',stats25.ab],['H',stats25.h],['2B',stats25.d],['3B',stats25.t],['HR',stats25.hr],
               ['RBI',stats25.rbi],['R',stats25.r],['BB',stats25.bb],['K',stats25.k]].map(([l,v])=>
              `<div class="career-stat"><div class="val">${v}</div><div class="lbl">${l}</div></div>`).join('')}
          </div>
          <div class="career-stat-row" style="background:#fff0f0">
            ${[['AVG',stats25.avg],['OBP',stats25.obp],['SLG',stats25.slg],['OPS',stats25.ops],['TB',stats25.tb]].map(([l,v])=>
              `<div class="career-stat"><div class="val" style="color:var(--red)">${v}</div><div class="lbl">${l}</div></div>`).join('')}
          </div>
        </div>
        <div id="ptab-career" class="tab-content">
          <div class="career-stat-row">
            ${[['G',stats.g],['AB',stats.ab],['H',stats.h],['2B',stats.d],['3B',stats.t],['HR',stats.hr],
               ['RBI',stats.rbi],['R',stats.r],['BB',stats.bb],['K',stats.k]].map(([l,v])=>
              `<div class="career-stat"><div class="val">${v}</div><div class="lbl">${l}</div></div>`).join('')}
          </div>
          <div class="career-stat-row" style="background:#fff0f0">
            ${[['AVG',stats.avg],['OBP',stats.obp],['SLG',stats.slg],['OPS',stats.ops],['TB',stats.tb]].map(([l,v])=>
              `<div class="career-stat"><div class="val" style="color:var(--red)">${v}</div><div class="lbl">${l}</div></div>`).join('')}
          </div>
          <p style="color:var(--gray);font-size:13px;margin-top:12px">Career totals across all teams since ${player.joinYear}</p>
        </div>
        <div id="ptab-games" class="tab-content">
          ${renderPlayerGameLog(playerId, data)}
        </div>
      </div>
    </section>
  `);
}

function renderPlayerGameLog(playerId, data) {
  const games = data.games.filter(g => g.playerStats?.some(ps => ps.playerId === playerId))
    .sort((a,b) => b.date.localeCompare(a.date));
  if (!games.length) return '<p style="color:var(--gray)">No game records found</p>';
  const rows = games.map(g => {
    const ps = g.playerStats.find(ps => ps.playerId === playerId);
    const d = new Date(g.date + 'T12:00:00');
    return `<tr>
      <td>${d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</td>
      <td>${g.opponent}</td>
      <td><span class="result-badge result-${gameResult(g)||'T'}">${gameResult(g)||'–'}</span></td>
      <td>${ps.ab}</td><td>${ps.h}</td><td>${ps.d}</td><td>${ps.t}</td><td>${ps.hr}</td>
      <td>${ps.rbi}</td><td>${ps.r}</td><td>${ps.bb}</td><td>${ps.k}</td>
      <td class="stat-highlight">${StatCalc.avg(ps.h,ps.ab)}</td>
    </tr>`;
  }).join('');
  return `<div class="stats-table-wrap"><table class="stats-table">
    <thead><tr><th>Date</th><th>Opponent</th><th>Result</th><th>AB</th><th>H</th><th>2B</th><th>3B</th><th>HR</th><th>RBI</th><th>R</th><th>BB</th><th>K</th><th>AVG</th></tr></thead>
    <tbody>${rows}</tbody>
  </table></div>`;
}

// ─── PAGE: STATS ────────────────────────────────────────────
const STAT_LABELS = { avg:'AVG', obp:'OBP', slg:'SLG', ops:'OPS', hr:'HR', rbi:'RBI', h:'H', bb:'BB', r:'R', d:'2B', t:'3B', tb:'TB', ab:'AB' };

function renderStats() {
  const data = loadData();
  const seasons = [...new Set(data.games.map(g => g.season))].sort().reverse();
  const defaultSeason = seasons[0] || '';

  App.render(`
    <div class="page-banner">
      <div class="page-banner-inner">
        <div class="breadcrumb"><a data-route="/">Home</a><span>Stats</span></div>
        <h1>Stats & <span>Leaderboards</span></h1>
        <p>Individual and team statistics across all seasons</p>
      </div>
    </div>
    <section class="section">
      <div class="container">
        <div class="stats-controls">
          <div class="stats-filter-group">
            <label class="stats-filter-label">Team</label>
            <div class="stats-team-btns" id="stats-team-btns">
              <button class="filter-btn active" data-team="" onclick="filterStatsByTeam(this,'')">All</button>
              ${data.teams.map(t=>`<button class="filter-btn" data-team="${t.id}" onclick="filterStatsByTeam(this,'${t.id}')">${t.shortName}</button>`).join('')}
            </div>
          </div>
          <div class="stats-filter-group">
            <label class="stats-filter-label">Player</label>
            <input type="text" class="stats-search-input" id="stats-player-search" placeholder="Search name…" oninput="renderStatsContent()">
          </div>
          <div class="stats-filter-group">
            <label class="stats-filter-label">Date Range</label>
            <div style="display:flex;gap:8px;align-items:center">
              <input type="date" class="stats-date-input" id="stats-date-from" onchange="renderStatsContent()">
              <span style="color:var(--gray);font-size:13px">to</span>
              <input type="date" class="stats-date-input" id="stats-date-to" onchange="renderStatsContent()">
            </div>
          </div>
        </div>
        <div class="tabs">
          <button class="tab-btn active" onclick="switchTab(event,'stab-batting')">Batting</button>
          <button class="tab-btn" onclick="switchTab(event,'stab-power')">Power Stats</button>
          <button class="tab-btn" onclick="switchTab(event,'stab-full')">Full Stats</button>
        </div>
        <div id="stab-batting" class="tab-content active">
          <div class="leaderboard-section" id="stats-batting"></div>
        </div>
        <div id="stab-power" class="tab-content">
          <div class="leaderboard-section" id="stats-power"></div>
        </div>
        <div id="stab-full" class="tab-content">
          <h3 style="margin-bottom:16px;font-size:18px;font-weight:800">Complete Batting Stats</h3>
          <div id="stats-full"></div>
        </div>
      </div>
    </section>
  `);

  // Populate all tabs after render
  renderStatsContent();
}

window.renderStatsContent = function() {
  const data = loadData();
  const teamId  = document.querySelector('#stats-team-btns .filter-btn.active')?.dataset.team || '';
  const search  = (document.getElementById('stats-player-search')?.value || '').toLowerCase().trim();
  const dateFrom = document.getElementById('stats-date-from')?.value || '';
  const dateTo   = document.getElementById('stats-date-to')?.value || '';

  const filters = {};
  if (teamId)   filters.teamId   = teamId;
  if (dateFrom) filters.dateFrom = dateFrom;
  if (dateTo)   filters.dateTo   = dateTo;

  const battingEl = document.getElementById('stats-batting');
  const powerEl   = document.getElementById('stats-power');
  const fullEl    = document.getElementById('stats-full');
  if (!battingEl) return;

  battingEl.innerHTML = ['avg','obp','slg'].map(stat => `
    <div class="leaderboard-card">
      <div class="leaderboard-card-header"><h3>${STAT_LABELS[stat]}</h3><span>Leaders</span></div>
      ${buildSimpleLeaderboard(stat, '', data, filters, search)}
    </div>`).join('');

  powerEl.innerHTML = ['hr','rbi','h','tb'].map(stat => `
    <div class="leaderboard-card">
      <div class="leaderboard-card-header"><h3>${STAT_LABELS[stat]}</h3><span>Leaders</span></div>
      ${buildSimpleLeaderboard(stat, '', data, filters, search)}
    </div>`).join('');

  fullEl.innerHTML = buildFullStatsTable(data, '', filters, search);
};

window.filterStatsByTeam = function(btn, teamId) {
  document.querySelectorAll('#stats-team-btns .filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderStatsContent();
};

function buildSimpleLeaderboard(stat, season, data, filters = {}, search = '') {
  const top = getLeaders(stat, 5, { ...filters, ...(season ? { season } : {}) })
    .filter(x => !search || `${x.player.firstName} ${x.player.lastName}`.toLowerCase().includes(search));
  if (!top.length) return '<div style="padding:16px;color:var(--gray);text-align:center">No data</div>';
  return top.map((x, i) => `
    <div class="leaderboard-item">
      <div class="lb-rank ${i<3?'top':''}">${i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}</div>
      <div class="lb-info"><div class="lb-player">${x.player.firstName} ${x.player.lastName}</div>
      <div class="lb-team">${data.teams.find(t=>t.id===x.player.teams[0])?.shortName||''}</div></div>
      <div class="lb-value">${x.stats[stat]}</div>
    </div>`).join('');
}

function buildFullStatsTable(data, season, filters = {}, search = '') {
  let players = data.players.filter(p => p.active);
  if (filters.teamId) players = players.filter(p => p.teams.includes(filters.teamId));
  if (search) players = players.filter(p => `${p.firstName} ${p.lastName}`.toLowerCase().includes(search));
  const rows = players.map(p => {
    const s = getPlayerStats(p.id, { ...filters, ...(season ? { season } : {}) });
    if (!s.ab) return '';
    return `<tr>
      <td><span class="player-name" data-route="/player/${p.id}">${p.firstName} ${p.lastName}</span></td>
      <td>${data.teams.find(t=>t.id===p.teams[0])?.shortName||''}</td>
      <td>${p.position}</td>
      <td>${s.g}</td><td>${s.ab}</td><td>${s.h}</td>
      <td>${s.d}</td><td>${s.t}</td><td>${s.hr}</td>
      <td>${s.rbi}</td><td>${s.r}</td>
      <td>${s.bb}</td><td>${s.k}</td><td>${s.hbp}</td>
      <td class="stat-highlight">${s.avg}</td>
      <td>${s.obp}</td><td>${s.slg}</td><td>${s.ops}</td>
    </tr>`;
  }).filter(Boolean).join('');
  return `<div class="stats-table-wrap"><table class="stats-table">
    <thead><tr>
      <th>Player</th><th>Team</th><th>POS</th>
      <th>G</th><th>AB</th><th>H</th><th>2B</th><th>3B</th><th>HR</th>
      <th>RBI</th><th>R</th><th>BB</th><th>K</th><th>HBP</th>
      <th>AVG</th><th>OBP</th><th>SLG</th><th>OPS</th>
    </tr></thead>
    <tbody>${rows||'<tr><td colspan="18" style="text-align:center;padding:30px;color:var(--gray)">No stats yet</td></tr>'}</tbody>
  </table></div>`;
}

// ─── PAGE: SCHEDULE ──────────────────────────────────────────
function renderSchedule() {
  const data = loadData();
  const games = [...data.games].sort((a,b) => b.date.localeCompare(a.date));
  
  const rows = games.map(g => {
    const team = data.teams.find(t => t.id === g.teamId);
    const d = new Date(g.date + 'T12:00:00');
    return `<div class="game-item ${gameResult(g)==='W'?'win':gameResult(g)==='L'?'loss':'upcoming'} ${g.playerStats?.length?'has-boxscore':''}" onclick="showBoxScore('${g.id}')">
      <div>
        <div class="game-date-day">${d.toLocaleDateString('en-US',{month:'short',day:'numeric'})}</div>
        <div class="game-date">${d.getFullYear()}</div>
      </div>
      <div>
        <div style="font-size:11px;margin-bottom:2px"><span class="tag tag-dark" style="font-size:10px">${team?.shortName}</span></div>
        <div class="game-opponent">${g.opponent}</div>
        <div class="game-location">📍 ${g.location}</div>
      </div>
      <div class="game-score"><div class="score">
        <span class="score-hero">${g.heroScore??'–'}</span><span class="score-sep">-</span><span class="score-opp">${g.oppScore??'–'}</span>
      </div></div>
      <div class="game-result">${gameResult(g)?`<span class="result-badge result-${gameResult(g)}">${gameResult(g)}</span>`:'<span style="color:var(--gray);font-size:12px">TBD</span>'}
      ${g.playerStats?.length ? '<div class="boxscore-hint">📊 Box Score</div>' : ''}
      </div>
    </div>`;
  }).join('');

  App.render(`
    <div class="page-banner">
      <div class="page-banner-inner">
        <h1>Schedule & <span>Results</span></h1>
      </div>
    </div>
    <section class="section">
      <div class="container">
        <div class="filter-row">
          <select class="form-select" onchange="location.hash='/schedule/'+this.value">
            <option value="">All Teams</option>
            ${data.teams.map(t=>`<option value="${t.id}">${t.name}</option>`).join('')}
          </select>
          <select class="form-select">
            <option>2025 Season</option>
            <option>2024 Season</option>
          </select>
        </div>
        <div class="game-list">${rows || '<p style="color:var(--gray)">No games scheduled</p>'}</div>
      </div>
    </section>
  `);
}

window.showBoxScore = function(gameId) {
  const data = loadData();
  const g = data.games.find(x => x.id === gameId);
  if (!g) return;
  if (!g.playerStats?.length) {
    App.toast('Box score not available for this game', 'info');
    return;
  }
  const d = new Date(g.date + 'T12:00:00');
  const team = data.teams.find(t => t.id === g.teamId);
  const dateStr = d.toLocaleDateString('en-US', {weekday:'short', month:'short', day:'numeric', year:'numeric'});

  const rows = g.playerStats.map((ps, i) => {
    const p = data.players.find(x => x.id === ps.playerId);
    const name = p ? `${p.firstName} ${p.lastName}` : ps.playerId;
    const singles = (ps.h||0) - (ps.d||0) - (ps.t||0) - (ps.hr||0);
    const avg = ps.ab ? (ps.h/ps.ab).toFixed(3).replace(/^0/,'') : '.000';
    return `<tr>
      <td style="font-weight:700">${name}</td>
      <td>${ps.ab||0}</td><td>${ps.r||0}</td><td>${ps.h||0}</td>
      <td>${singles}</td><td>${ps.d||0}</td><td>${ps.t||0}</td><td>${ps.hr||0}</td>
      <td>${ps.rbi||0}</td><td>${ps.bb||0}</td><td>${ps.k||0}</td>
      <td style="font-weight:800;color:var(--red)">${avg}</td>
    </tr>`;
  }).join('');

  // Totals row
  const tot = g.playerStats.reduce((acc, ps) => {
    ['ab','r','h','d','t','hr','rbi','bb','k'].forEach(k => acc[k] = (acc[k]||0) + (ps[k]||0));
    return acc;
  }, {});
  const totSingles = (tot.h||0) - (tot.d||0) - (tot.t||0) - (tot.hr||0);
  const totAvg = tot.ab ? (tot.h/tot.ab).toFixed(3).replace(/^0/,'') : '.000';

  const existing = document.getElementById('boxscore-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'boxscore-modal';
  modal.className = 'boxscore-overlay';
  modal.innerHTML = `
    <div class="boxscore-modal" onclick="event.stopPropagation()">
      <div class="boxscore-header">
        <div>
          <div class="boxscore-game-info">${dateStr} · ${team?.name || ''}</div>
          <div class="boxscore-matchup">Heroes <span>${g.heroScore}</span> – <span>${g.oppScore}</span> ${g.opponent}</div>
          <div class="boxscore-result ${gameResult(g)==='W'?'w':gameResult(g)==='L'?'l':''}">${gameResult(g)==='W'?'✅ Win':gameResult(g)==='L'?'❌ Loss':'—'}</div>
        </div>
        <button class="boxscore-close" onclick="document.getElementById('boxscore-modal').remove()">✕</button>
      </div>
      <div class="boxscore-table-wrap">
        <table class="boxscore-table">
          <thead>
            <tr><th>Player</th><th>AB</th><th>R</th><th>H</th><th>1B</th><th>2B</th><th>3B</th><th>HR</th><th>RBI</th><th>BB</th><th>K</th><th>AVG</th></tr>
          </thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr class="boxscore-totals">
              <td>TOTALS</td>
              <td>${tot.ab||0}</td><td>${tot.r||0}</td><td>${tot.h||0}</td>
              <td>${totSingles}</td><td>${tot.d||0}</td><td>${tot.t||0}</td><td>${tot.hr||0}</td>
              <td>${tot.rbi||0}</td><td>${tot.bb||0}</td><td>${tot.k||0}</td>
              <td style="font-weight:800">${totAvg}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      ${g.notes ? `<div class="boxscore-notes">📌 ${g.notes}</div>` : ''}
    </div>`;
  modal.addEventListener('click', () => modal.remove());
  document.body.appendChild(modal);
};

// ─── PAGE: NEWS ──────────────────────────────────────────────
function renderNews() {
  const data = loadData();
  const cards = data.news.map(n => {
    const d = new Date(n.date + 'T12:00:00');
    return `<div class="news-card fade-in" data-route="/news/article/${n.id}" style="cursor:pointer">
      <div class="news-card-img" style="${n.image?'':'background:linear-gradient(135deg,var(--dark),var(--red-dark));height:80px'}">
        ${n.image?`<img src="${n.image}" alt="" onerror="this.parentElement.style.display='none'">`:''}
      </div>
      <div class="news-card-body">
        <div class="news-card-meta">
          <span class="tag tag-red">${n.category}</span>
          <span>${d.toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}</span>
          ${n.pinned?'<span class="tag tag-gold">📌 Pinned</span>':''}
        </div>
        <div class="news-card-title">${n.title}</div>
        <div class="news-card-excerpt">${n.excerpt}</div>
        <div style="margin-top:12px"><a class="btn btn-sm btn-primary" data-route="/news/article/${n.id}">Read More →</a></div>
      </div>
    </div>`;
  }).join('');
  
  App.render(`
    <div class="page-banner">
      <div class="page-banner-inner"><h1>News & <span>Announcements</span></h1></div>
    </div>
    <section class="section">
      <div class="container">
        <div class="cards-grid cards-3">${cards || '<p>No news yet</p>'}</div>
      </div>
    </section>
  `);
}

function renderNewsArticle(articleId) {
  const data = loadData();
  const article = data.news.find(n => n.id === articleId);
  if (!article) return renderNotFound();
  const d = new Date(article.date + 'T12:00:00');
  App.render(`
    <div class="page-banner">
      <div class="page-banner-inner">
        <div class="breadcrumb"><a data-route="/">Home</a><span><a data-route="/news">News</a></span><span>${article.title.slice(0,40)}...</span></div>
        <h1>${article.title}</h1>
        <p>By ${article.author} · ${d.toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}</p>
      </div>
    </div>
    <section class="section">
      <div class="container" style="max-width:800px">
        ${article.image?`<img src="${article.image}" style="width:100%;border-radius:var(--radius-lg);margin-bottom:30px" alt="" onerror="this.style.display='none'">` : ''}
        <span class="tag tag-red" style="margin-bottom:16px;display:inline-block">${article.category}</span>
        <div style="font-size:16px;line-height:1.8;color:var(--text)">${article.content.replace(/\n/g,'<br>')}</div>
        <div style="margin-top:32px"><a class="btn btn-dark" data-route="/news">← Back to News</a></div>
      </div>
    </section>
  `);
}

// ─── PAGE: TOURNAMENTS ──────────────────────────────────
let _playerSeasonFilter = null; // null = career (all seasons)
let _tevFilter      = 'all';
let _tevSort        = 'date-desc';
let _tevView        = (()=>{ try { return localStorage.getItem('heroes_ev_view')||'card'; } catch(e){ return 'card'; } })();
let _tevTypeFilters = [];

function renderTournaments() {
  // Inject styles once
  if (!document.getElementById('ev-styles')) {
    const s = document.createElement('style');
    s.id = 'ev-styles';
    s.textContent = `
      .ev-card {
        display:flex; background:#fff; border-radius:14px;
        box-shadow:0 2px 12px rgba(0,0,0,0.07); border:1px solid var(--border);
        overflow:hidden; margin-bottom:16px;
        transition:box-shadow 0.2s, transform 0.2s;
      }
      .ev-card:hover { box-shadow:0 6px 28px rgba(0,0,0,0.11); transform:translateY(-1px); }
      .ev-accent { width:5px; flex-shrink:0; background:var(--red); }
      .ev-accent-social { background:var(--gold); }
      .ev-accent-completed { background:#9ca3af; }
      .ev-inner { flex:1; padding:20px 24px; min-width:0; }

      /* ── head row ── */
      .ev-head { display:flex; align-items:flex-start; gap:16px; }
      .ev-datebox {
        flex-shrink:0; text-align:center; background:var(--light);
        border-radius:10px; padding:10px 14px; min-width:58px;
      }
      .ev-datebox-month { display:block; font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:1px; color:var(--red); }
      .ev-datebox-day   { display:block; font-size:28px; font-weight:900; color:var(--dark); line-height:1.05; }
      .ev-datebox-dow   { display:block; font-size:10px; font-weight:600; color:var(--gray); margin-top:1px; }
      .ev-datebox-range { display:block; font-size:13px; font-weight:800; color:var(--dark); line-height:1.3; }

      .ev-title-col { flex:1; min-width:0; }
      .ev-name { font-size:20px; font-weight:900; color:var(--dark); margin-bottom:4px; line-height:1.2; }
      .ev-loc  { font-size:13px; color:var(--gray); display:flex; align-items:center; gap:5px; }
      .ev-mobile-badges { display:none; flex-wrap:wrap; gap:6px; margin-top:10px; }

      .ev-badge-col { flex-shrink:0; display:flex; flex-direction:column; align-items:flex-end; gap:6px; padding-left:8px; }
      .ev-status-pill {
        display:inline-block; padding:4px 11px; border-radius:20px;
        font-size:11px; font-weight:700; white-space:nowrap;
      }
      .ev-status-upcoming  { background:#fef9c3; color:#92400e; }
      .ev-status-active    { background:#dcfce7; color:#15803d; }
      .ev-status-completed { background:#f3f4f6; color:#6b7280; }
      .ev-status-cancelled { background:#fee2e2; color:#dc2626; }
      .ev-team-pill {
        display:inline-block; padding:3px 10px; border-radius:20px;
        background:var(--dark); color:rgba(255,255,255,0.85);
        font-size:11px; font-weight:700;
      }
      .ev-type-pill {
        display:inline-block; padding:3px 10px; border-radius:20px;
        background:rgba(240,165,0,0.15); color:#92400e;
        font-size:11px; font-weight:700;
      }
      .ev-reg-pill {
        display:inline-block; padding:3px 10px; border-radius:20px;
        font-size:11px; font-weight:700;
      }
      .ev-badge-row { display:flex; gap:5px; flex-wrap:wrap; justify-content:flex-end; }

      /* ── divider ── */
      .ev-divider { border:none; border-top:1px solid var(--border); margin:14px 0; }

      /* ── meta strip ── */
      .ev-meta { display:flex; flex-wrap:wrap; gap:0; margin-bottom:14px; }
      .ev-meta-item {
        padding:8px 20px 8px 0; border-right:1px solid var(--border);
        margin-right:20px; margin-bottom:4px;
      }
      .ev-meta-item:last-child { border-right:none; }
      .ev-meta-item label { display:block; font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:0.5px; color:var(--gray); margin-bottom:2px; }
      .ev-meta-item .val  { font-size:13px; font-weight:700; color:var(--text); }
      .ev-meta-item .val a { color:var(--red); }

      /* ── notes / hotel ── */
      .ev-notes {
        display:flex; gap:10px; align-items:flex-start;
        background:var(--light); border-radius:8px; padding:12px 14px;
        margin-bottom:12px; font-size:13px; line-height:1.6; color:var(--text);
      }
      .ev-hotel {
        background:#eff6ff; border:1px solid #bfdbfe; border-radius:8px;
        padding:12px 14px; margin-bottom:12px; font-size:13px; line-height:1.6;
      }
      .ev-hotel-label { font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:0.5px; color:#1d4ed8; margin-bottom:3px; }
      .ev-placement {
        display:inline-flex; align-items:center; gap:8px;
        background:linear-gradient(135deg,#fef3c7,#fffbeb);
        border:1px solid #fcd34d; border-radius:8px;
        padding:10px 16px; margin-bottom:12px; font-size:15px; font-weight:800; color:#92400e;
      }

      /* ── attendance ── */
      .ev-attend { padding-top:14px; border-top:1px solid var(--border); }
      .ev-attend-head { display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; }
      .ev-attend-label { font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:0.5px; color:var(--gray); }
      .ev-attend-counts { display:flex; gap:14px; }
      .ev-attend-count  { font-size:12px; font-weight:700; display:flex; align-items:center; gap:4px; color:var(--text); }
      .ev-attend-dot    { width:7px; height:7px; border-radius:50%; flex-shrink:0; }
      .ev-attend-bar    { height:5px; border-radius:20px; background:#e5e7eb; overflow:hidden; display:flex; margin-bottom:12px; }
      .ev-bar-yes       { background:#22c55e; transition:width 0.4s; }
      .ev-bar-maybe     { background:#eab308; transition:width 0.4s; }
      .ev-bar-no        { background:#ef4444; transition:width 0.4s; }
      .ev-avatars       { display:flex; flex-wrap:wrap; gap:5px; }
      .ev-av {
        width:30px; height:30px; border-radius:50%; font-size:10px; font-weight:800;
        color:#fff; display:flex; align-items:center; justify-content:center;
        cursor:default; position:relative; flex-shrink:0;
      }
      .ev-av:hover::after {
        content:attr(title); position:absolute; bottom:115%; left:50%; transform:translateX(-50%);
        background:var(--dark); color:#fff; padding:3px 8px; border-radius:4px;
        font-size:11px; white-space:nowrap; z-index:10; pointer-events:none;
      }
      .ev-av-yes     { background:#16a34a; border:2px solid #dcfce7; }
      .ev-av-maybe   { background:#ca8a04; border:2px solid #fef9c3; }
      .ev-av-no      { background:#dc2626; border:2px solid #fee2e2; opacity:0.45; }
      .ev-av-pending { background:#9ca3af; border:2px solid #f3f4f6; opacity:0.6; }

      /* ── filter/sort controls ── */
      .ev-controls-row { display:flex; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:28px; }
      .ev-controls-row .filter-row { flex:1; min-width:0; flex-wrap:wrap; }
      .ev-sort-wrap { display:flex; align-items:center; gap:8px; flex-shrink:0; }
      .ev-sort-label { font-size:13px; font-weight:700; color:var(--gray); }
      .ev-sort-select { border:1px solid var(--border); border-radius:20px; padding:6px 12px; font-size:12px; font-weight:700; background:#fff; cursor:pointer; outline:none; }
      .ev-view-toggle { display:flex; border:1px solid var(--border); border-radius:8px; overflow:hidden; flex-shrink:0; }
      .ev-view-btn { background:none; border:none; padding:6px 10px; cursor:pointer; font-size:15px; color:var(--gray); transition:background 0.15s,color 0.15s; line-height:1; }
      .ev-view-btn.active { background:#1d4ed8; color:#fff; }
      /* ── type multi-select dropdown ── */
      .ev-type-dd { position:relative; flex-shrink:0; }
      .ev-type-dd-btn { border:1px solid var(--border); border-radius:20px; padding:6px 14px; font-size:12px; font-weight:700; background:var(--card-bg,#fff); cursor:pointer; display:flex; align-items:center; gap:6px; white-space:nowrap; color:var(--text); transition:border-color 0.15s; }
      .ev-type-dd-btn.has-filter { border-color:#1d4ed8; color:#1d4ed8; background:#eff6ff; }
      .ev-type-dd-panel { position:absolute; top:calc(100% + 6px); left:0; background:var(--card-bg,#fff); border:1px solid var(--border); border-radius:10px; box-shadow:0 8px 24px rgba(0,0,0,0.12); z-index:200; min-width:160px; padding:8px 0; }
      .ev-type-dd-item { display:flex; align-items:center; gap:10px; padding:8px 14px; cursor:pointer; font-size:13px; font-weight:600; color:var(--text); transition:background 0.1s; }
      .ev-type-dd-item:hover { background:var(--hover-bg,#f9fafb); }
      .ev-type-dd-item input { width:15px; height:15px; accent-color:#1d4ed8; cursor:pointer; flex-shrink:0; }
      /* ── grid view ── */
      .ev-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(260px,1fr)); gap:16px; }
      .ev-tile { background:var(--card-bg,#fff); border:1px solid var(--border); border-radius:12px; padding:16px; display:flex; flex-direction:column; gap:8px; cursor:default; transition:box-shadow 0.15s; }
      .ev-tile:hover { box-shadow:0 4px 16px rgba(0,0,0,0.10); }
      .ev-tile-top { display:flex; justify-content:space-between; align-items:flex-start; gap:8px; }
      .ev-tile-date { font-size:11px; font-weight:800; text-transform:uppercase; color:var(--gray); letter-spacing:0.5px; }
      .ev-tile-name { font-size:15px; font-weight:800; color:var(--text); line-height:1.3; }
      .ev-tile-loc { font-size:12px; color:var(--gray); }
      .ev-tile-pills { display:flex; flex-wrap:wrap; gap:5px; margin-top:2px; }

      /* ── empty state ── */
      .ev-empty { text-align:center; padding:60px 20px; color:var(--gray); }
      .ev-empty-icon { font-size:48px; margin-bottom:16px; }
      .ev-empty h3 { font-size:18px; font-weight:800; margin-bottom:8px; color:var(--text); }

      @media(max-width:640px) {
        .ev-inner { padding:16px; }
        .ev-badge-col { display:none; }
        .ev-mobile-badges { display:flex; }
        .ev-name { font-size:17px; }
        .ev-datebox-day { font-size:22px; }
        .ev-controls-row { flex-direction:column; align-items:flex-start; }
      }
    `;
    document.head.appendChild(s);
  }

  const data = loadData();

  // Friendly labels for known event types (new types auto-appear with title-cased fallback)
  const TYPE_LABELS = {
    tournament: 'Tournament',
    social:     'Social',
    game:       'Game',
    practice:   'Practice',
    other:      'Other',
    meeting:    'Meeting',
  };
  const TYPE_ICONS = {
    tournament: '🏆',
    social:     '🎉',
    game:       '⚾',
    practice:   '🧤',
    other:      '📌',
    meeting:    '📋',
  };

  // All unique types present in data
  const allTypes = [...new Set((data.events || []).map(e => e.type).filter(Boolean))];

  // Filter — status buttons (All/Upcoming/Completed/Attending); types via multi-select
  let tournaments = [...(data.events || [])];
  if (_tevFilter === 'upcoming')       tournaments = tournaments.filter(e => e.status === 'upcoming' || e.status === 'active');
  else if (_tevFilter === 'completed') tournaments = tournaments.filter(e => e.status === 'completed' || e.status === 'cancelled');
  else if (_tevFilter === 'attending') tournaments = tournaments.filter(e => typeof HeroesAuth !== 'undefined' && HeroesAuth.isAttendingEvent(e.id));
  if (_tevTypeFilters.length)          tournaments = tournaments.filter(e => _tevTypeFilters.includes(e.type));

  // Sort
  const statusOrder = { upcoming:0, active:1, completed:2, cancelled:3 };
  if (_tevSort === 'date-desc') {
    tournaments = [...tournaments].sort((a,b) => new Date(b.date) - new Date(a.date));
  } else if (_tevSort === 'upcoming') {
    tournaments = [...tournaments].sort((a,b) => {
      const sd = (statusOrder[a.status]??2) - (statusOrder[b.status]??2);
      return sd !== 0 ? sd : new Date(a.date) - new Date(b.date);
    });
  } else {
    tournaments = [...tournaments].sort((a,b) => new Date(a.date) - new Date(b.date));
  }

  window.toggleFanAttend = function(eventId, checkbox) {
    if (typeof HeroesAuth === 'undefined' || !HeroesAuth.canUseFanFeatures()) {
      checkbox.checked = !checkbox.checked; return;
    }
    const attending = HeroesAuth.toggleAttendEvent(eventId);
    checkbox.checked = attending;
    const lbl = document.getElementById('fan-attend-label-' + eventId);
    if (lbl) lbl.textContent = attending ? "You're attending! 🎉" : "I'm attending";
    App.toast(attending ? "You're attending! See you there. 🎉" : 'Removed from attending', 'info');
  };

  function buildCards(events) {
    if (!events.length) return `
      <div class="ev-empty">
        <div class="ev-empty-icon">🏟️</div>
        <h3>No events found</h3>
        <p>Try a different filter</p>
      </div>`;

    return events.map(ev => {
      const d1 = new Date(ev.date + 'T12:00:00');
      const d2 = ev.endDate && ev.endDate !== ev.date ? new Date(ev.endDate + 'T12:00:00') : null;
      const isSocial = ev.type === 'social';
      const typeIcon  = TYPE_ICONS[ev.type] || '📌';
      const typeText  = TYPE_LABELS[ev.type] || (ev.type?.charAt(0).toUpperCase() + ev.type?.slice(1)) || 'Event';
      const isDone   = ev.status === 'completed' || ev.status === 'cancelled';

      // Date display
      const datebox = d2
        ? `<div class="ev-datebox" style="min-width:72px">
            <span class="ev-datebox-month">${d1.toLocaleDateString('en-US',{month:'short'})}</span>
            <span class="ev-datebox-range">${d1.getDate()} – ${d2.toLocaleDateString('en-US',{month:'short',day:'numeric'})}</span>
            <span class="ev-datebox-dow">${d1.toLocaleDateString('en-US',{year:'numeric'})}</span>
           </div>`
        : `<div class="ev-datebox">
            <span class="ev-datebox-month">${d1.toLocaleDateString('en-US',{month:'short'})}</span>
            <span class="ev-datebox-day">${d1.getDate()}</span>
            <span class="ev-datebox-dow">${d1.toLocaleDateString('en-US',{weekday:'short'})}</span>
           </div>`;

      const teams = ev.teams.map(id => data.teams.find(t => t.id === id)).filter(Boolean);

      // Status pill
      const statusMap = {
        upcoming:  ['ev-status-upcoming',  '\u{1F4C5} Upcoming'],
        active:    ['ev-status-active',    '⚡ In Progress'],
        completed: ['ev-status-completed', '✓ Completed'],
        cancelled: ['ev-status-cancelled', '✕ Cancelled'],
      };
      const [sCls, sLabel] = statusMap[ev.status] || ['ev-status-upcoming', ev.status];
      const statusPill = `<span class="ev-status-pill ${sCls}">${sLabel}</span>`;

      // Registration pill
      const regMap = {
        open:   ['#dcfce7','#15803d','\u{1F4CB} Open'],
        closed: ['#fee2e2','#dc2626','\u{1F512} Closed'],
        pending:['#fef9c3','#92400e','⏳ Pending'],
      };
      const regPill = (!isSocial && ev.registrationStatus && regMap[ev.registrationStatus])
        ? `<span class="ev-reg-pill" style="background:${regMap[ev.registrationStatus][0]};color:${regMap[ev.registrationStatus][1]}">${regMap[ev.registrationStatus][2]}</span>`
        : '';

      const teamPills  = teams.map(t => `<span class="ev-team-pill">${t.name}</span>`).join('');
      const typePill   = `<span class="ev-type-pill">${typeIcon} ${typeText}</span>`;

      // Attendance summary
      const avail    = ev.availability || [];
      const eligible = data.players.filter(p => p.active && ev.teams.some(tid => p.teams.includes(tid)));
      const yes    = avail.filter(a => a.status === 'yes').length;
      const no     = avail.filter(a => a.status === 'no').length;
      const maybe  = avail.filter(a => a.status === 'maybe').length;
      const pending = eligible.length - yes - no - maybe;
      const yPct   = eligible.length ? (yes / eligible.length * 100).toFixed(0) : 0;
      const mPct   = eligible.length ? (maybe / eligible.length * 100).toFixed(0) : 0;
      const nPct   = eligible.length ? (no / eligible.length * 100).toFixed(0) : 0;

      // Avatars (yes → maybe → pending → no)
      const order = { yes:0, maybe:1, pending:2, no:3 };
      const sorted = eligible.map(p => {
        const a = avail.find(x => x.playerId === p.id);
        return { p, status: a?.status || 'pending', note: a?.note || '' };
      }).sort((a, b) => (order[a.status]||2) - (order[b.status]||2));
      const avatarHtml = sorted.map(({ p, status, note }) => {
        const tip = `${p.firstName} ${p.lastName} — ${status==='yes'?'✅ Attending':status==='no'?'❌ Not Attending':status==='maybe'?'\u{1F7E1} Maybe':'⏳ TBD'}${note ? ': ' + note : ''}`;
        return `<div class="ev-av ev-av-${status}" title="${tip.replace(/"/g,"'")}">${p.firstName[0]}${p.lastName[0]}</div>`;
      }).join('');

      // Meta items (only populated fields)
      const metaItems = [
        ev.address   ? `<div class="ev-meta-item"><label>Venue</label><div class="val"><a href="https://maps.google.com?q=${encodeURIComponent(ev.address)}" target="_blank">\u{1F4CD} ${ev.venue||ev.location}</a></div></div>` : '',
        !isSocial && ev.entryFee     ? `<div class="ev-meta-item"><label>Entry Fee</label><div class="val">$${ev.entryFee} / team</div></div>` : '',
        !isSocial && ev.division     ? `<div class="ev-meta-item"><label>Division</label><div class="val">${ev.division}</div></div>` : '',
        ev.rsvpDeadline              ? `<div class="ev-meta-item"><label>RSVP By</label><div class="val" style="color:var(--red)">\u{1F4C5} ${new Date(ev.rsvpDeadline+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'})}</div></div>` : '',
        !isSocial && ev.rosterDeadline ? `<div class="ev-meta-item"><label>Roster Deadline</label><div class="val">\u{1F4CB} ${new Date(ev.rosterDeadline+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'})}</div></div>` : '',
        !isSocial && ev.director     ? `<div class="ev-meta-item"><label>Director</label><div class="val">${ev.director}</div></div>` : '',
      ].filter(Boolean).join('');

      const accentClass = isSocial ? 'ev-accent-social' : (isDone ? 'ev-accent-completed' : '');

      const canFanAttend = typeof HeroesAuth !== 'undefined' && HeroesAuth.canUseFanFeatures() && !isDone && ev.allowFans !== false;
      const fanAttending = canFanAttend && HeroesAuth.isAttendingEvent(ev.id);
      const fanAttendSection = canFanAttend ? `
        <div class="ev-attend" style="border-top:1px solid var(--border);margin-top:0">
          <div class="ev-attend-head">
            <span class="ev-attend-label">Fans</span>
          </div>
          <label style="display:flex;align-items:center;gap:10px;cursor:pointer;padding:4px 0;font-size:14px;color:var(--text)">
            <input type="checkbox" onchange="toggleFanAttend('${ev.id}',this)" ${fanAttending?'checked':''}
              style="width:18px;height:18px;cursor:pointer;accent-color:#1d4ed8;flex-shrink:0">
            <span id="fan-attend-label-${ev.id}">${fanAttending ? "You're attending! 🎉" : "I'm attending"}</span>
          </label>
        </div>` : '';

      return `
        <div class="ev-card">
          <div class="ev-accent ${accentClass}"></div>
          <div class="ev-inner">

            <!-- Head row -->
            <div class="ev-head">
              ${datebox}
              <div class="ev-title-col">
                <div class="ev-name">${ev.name}</div>
                <div class="ev-loc">\u{1F4CD} ${ev.venue ? ev.venue + ', ' : ''}${ev.location}</div>
                <!-- Badges shown below title on mobile -->
                <div class="ev-mobile-badges">
                  ${statusPill}${regPill}${typePill}${teamPills}
                </div>
              </div>
              <div class="ev-badge-col">
                ${statusPill}
                ${regPill ? `<div class="ev-badge-row">${regPill}</div>` : ''}
                <div class="ev-badge-row">${typePill}${teamPills}</div>
              </div>
            </div>

            ${ev.placement ? `<div class="ev-placement">\u{1F3C6} ${ev.placement}</div>` : ''}

            ${metaItems ? `<hr class="ev-divider"><div class="ev-meta">${metaItems}</div>` : ''}

            ${ev.notes ? `<div class="ev-notes"><span style="font-size:16px">\u{1F4CC}</span><div><div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;color:var(--gray);margin-bottom:3px">Notes from Manager</div>${ev.notes}</div></div>` : ''}

            ${ev.hotelInfo ? `<div class="ev-hotel"><div class="ev-hotel-label">\u{1F3E8} Hotel Info</div>${ev.hotelInfo}${ev.hotelUrl?`<br><a href="${ev.hotelUrl}" target="_blank" style="color:#1d4ed8;font-weight:700">Book Now →</a>`:''}${ev.hotelCode?`<br><span style="font-size:12px">Code: <strong>${ev.hotelCode}</strong></span>`:''}</div>` : ''}

            <!-- Attendance -->
            <div class="ev-attend">
              <div class="ev-attend-head">
                <span class="ev-attend-label">Player Attendance</span>
                <div class="ev-attend-counts">
                  <span class="ev-attend-count"><span class="ev-attend-dot" style="background:#22c55e"></span>${yes} going</span>
                  <span class="ev-attend-count"><span class="ev-attend-dot" style="background:#eab308"></span>${maybe} maybe</span>
                  <span class="ev-attend-count"><span class="ev-attend-dot" style="background:#9ca3af"></span>${pending} TBD</span>
                </div>
              </div>
              <div class="ev-attend-bar">
                <div class="ev-bar-yes"   style="width:${yPct}%"></div>
                <div class="ev-bar-maybe" style="width:${mPct}%"></div>
                <div class="ev-bar-no"    style="width:${nPct}%"></div>
              </div>
              <div class="ev-avatars">${avatarHtml}</div>
            </div>

            ${fanAttendSection}

          </div>
        </div>`;
    }).join('');
  }

  function buildGrid(events) {
    if (!events.length) return `
      <div class="ev-empty">
        <div class="ev-empty-icon">🏟️</div>
        <h3>No events found</h3>
        <p>Try a different filter</p>
      </div>`;
    const statusMap = {
      upcoming:  ['#dbeafe','#1e40af','Upcoming'],
      active:    ['#dcfce7','#15803d','In Progress'],
      completed: ['#f3f4f6','#374151','Completed'],
      cancelled: ['#fee2e2','#dc2626','Cancelled'],
    };
    return `<div class="ev-grid">${events.map(ev => {
      const d1 = new Date(ev.date + 'T12:00:00');
      const d2 = ev.endDate && ev.endDate !== ev.date ? new Date(ev.endDate + 'T12:00:00') : null;
      const dateStr = d2
        ? `${d1.toLocaleDateString('en-US',{month:'short',day:'numeric'})} – ${d2.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}`
        : d1.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
      const teams = ev.teams.map(id => data.teams.find(t => t.id === id)).filter(Boolean);
      const [sbg,scl,slbl] = statusMap[ev.status] || statusMap.upcoming;
      const typeLabel = TYPE_LABELS[ev.type] || ev.type;
      const canFanAttend = typeof HeroesAuth !== 'undefined' && HeroesAuth.canUseFanFeatures() && ev.status !== 'completed' && ev.status !== 'cancelled' && ev.allowFans !== false;
      const fanAttending = canFanAttend && HeroesAuth.isAttendingEvent(ev.id);
      const fanChk = canFanAttend ? `
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12px;color:var(--text);margin-top:4px;padding-top:8px;border-top:1px solid var(--border)">
          <input type="checkbox" onchange="toggleFanAttend('${ev.id}',this)" ${fanAttending?'checked':''}
            style="width:15px;height:15px;cursor:pointer;accent-color:#1d4ed8;flex-shrink:0">
          <span id="fan-attend-label-${ev.id}">${fanAttending?"You're attending! 🎉":"I'm attending"}</span>
        </label>` : '';
      return `<div class="ev-tile">
        <div class="ev-tile-top">
          <div class="ev-tile-date">${dateStr}</div>
          <span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:20px;background:${sbg};color:${scl};white-space:nowrap">${slbl}</span>
        </div>
        <div class="ev-tile-name">${ev.name}</div>
        ${ev.location ? `<div class="ev-tile-loc">📍 ${ev.venue ? ev.venue+', ':''} ${ev.location}</div>` : ''}
        <div class="ev-tile-pills">
          <span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:20px;background:#f3f4f6;color:#374151">${typeLabel}</span>
          ${teams.map(t=>`<span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:20px;background:#eff6ff;color:#1e40af">${t.shortName||t.name}</span>`).join('')}
        </div>
        ${fanChk}
      </div>`;
    }).join('')}</div>`;
  }

  App.render(`
    <div class="page-banner">
      <div class="page-banner-inner">
        <div class="breadcrumb"><a data-route="/">Home</a><span>Events</span></div>
        <h1>Heroes <span>Events</span></h1>
        <p>Tournaments, team events, and social gatherings</p>
      </div>
    </div>
    <section class="section">
      <div class="container" style="max-width:${_tevView==='grid'?'1100':'900'}px">
        <div class="ev-controls-row">
          <div class="filter-row" style="flex-wrap:wrap">
            <button class="filter-btn ${_tevFilter==='all'?'active':''}"       onclick="filterTourneys(this,'all')">All</button>
            <button class="filter-btn ${_tevFilter==='upcoming'?'active':''}"  onclick="filterTourneys(this,'upcoming')">Upcoming</button>
            <button class="filter-btn ${_tevFilter==='completed'?'active':''}" onclick="filterTourneys(this,'completed')">Completed</button>
            ${(typeof HeroesAuth !== 'undefined' && HeroesAuth.canUseFanFeatures()) ? `<button class="filter-btn ${_tevFilter==='attending'?'active':''}" onclick="filterTourneys(this,'attending')">🎟 Attending</button>` : ''}
            <div class="ev-type-dd" id="ev-type-dd">
              <button class="ev-type-dd-btn ${_tevTypeFilters.length?'has-filter':''}" onclick="toggleEvTypeDropdown(event)">
                ${_tevTypeFilters.length ? _tevTypeFilters.map(t=>TYPE_LABELS[t]||t).join(', ') : 'All Types'} ▾
              </button>
              <div class="ev-type-dd-panel" id="ev-type-dd-panel" style="display:none">
                ${['tournament','social','game','practice','other'].map(t => `
                  <label class="ev-type-dd-item">
                    <input type="checkbox" onchange="toggleEvTypeFilter('${t}')" ${_tevTypeFilters.includes(t)?'checked':''}>
                    ${TYPE_ICONS[t]||'📌'} ${TYPE_LABELS[t]||t}
                  </label>`).join('')}
              </div>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:10px;flex-shrink:0">
            <div class="ev-sort-wrap">
              <label class="ev-sort-label">Sort:</label>
              <select class="ev-sort-select" onchange="sortTourneys(this.value)">
                <option value="date-desc" ${_tevSort==='date-desc'?'selected':''}>Newest First</option>
                <option value="date-asc"  ${_tevSort==='date-asc' ?'selected':''}>Oldest First</option>
                <option value="upcoming"  ${_tevSort==='upcoming' ?'selected':''}>Upcoming First</option>
              </select>
            </div>
            <div class="ev-view-toggle">
              <button class="ev-view-btn ${_tevView==='card'?'active':''}" onclick="switchTevView('card')" title="Card view">☰</button>
              <button class="ev-view-btn ${_tevView==='grid'?'active':''}" onclick="switchTevView('grid')" title="Grid view">⊞</button>
            </div>
          </div>
        </div>
        <div id="tourney-list">${_tevView==='grid' ? buildGrid(tournaments) : buildCards(tournaments)}</div>
      </div>
    </section>
  `);
}

window.filterTourneys = function(btn, filter) {
  _tevFilter = filter;
  renderTournaments();
};

window.sortTourneys = function(val) {
  _tevSort = val;
  renderTournaments();
};

window.switchTevView = function(view) {
  _tevView = view;
  try { localStorage.setItem('heroes_ev_view', view); } catch(e) {}
  renderTournaments();
};

window.toggleEvTypeFilter = function(type) {
  const i = _tevTypeFilters.indexOf(type);
  if (i >= 0) _tevTypeFilters.splice(i, 1);
  else _tevTypeFilters.push(type);
  renderTournaments();
};

window.toggleEvTypeDropdown = function(e) {
  e.stopPropagation();
  const panel = document.getElementById('ev-type-dd-panel');
  if (!panel) return;
  const open = panel.style.display === 'none' || !panel.style.display;
  panel.style.display = open ? 'block' : 'none';
};

document.addEventListener('click', function(e) {
  if (!e.target.closest('#ev-type-dd')) {
    const panel = document.getElementById('ev-type-dd-panel');
    if (panel) panel.style.display = 'none';
  }
});

window.toggleAttendGrid = function(evId, btn) {
  const grid = document.getElementById('attend-grid-' + evId);
  const open = grid.style.display === 'none';
  grid.style.display = open ? 'block' : 'none';
  btn.textContent = open ? 'Hide Players ▴' : 'Show Players ▾';
};

window.sortAttendGrid = function(evId, by, btn) {
  btn.closest('.attend-grid-controls').querySelectorAll('.attend-sort-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('attend-grouped-' + evId).style.display = by === 'status' ? '' : 'none';
  document.getElementById('attend-alpha-' + evId).style.display  = by === 'name'   ? '' : 'none';
};

// ─── PAGE: ABOUT ─────────────────────────────────────────────
function renderAbout() {
  const data = loadData();
  App.render(`
    <div class="page-banner">
      <div class="page-banner-inner"><h1>About <span>Heroes</span></h1></div>
    </div>
    <section class="section">
      <div class="container" style="max-width:900px">
        <div style="display:grid;grid-template-columns:1fr 300px;gap:40px;align-items:start">
          <div>
            <div class="section-label">Our Story</div>
            <h2 style="font-size:clamp(24px,4vw,36px);font-weight:900;margin-bottom:20px">Built on <span style="color:var(--red)">Passion</span></h2>
            <p style="font-size:16px;line-height:1.8;color:var(--text-light);margin-bottom:20px">
              Heroes Senior Softball was founded in ${data.config.foundedYear} with a simple mission: bring together competitive senior softball players who love the game and want to compete at the highest level.
            </p>
            <p style="font-size:15px;line-height:1.8;color:var(--text-light);margin-bottom:20px">
              Since our inception, the team has grown across multiple competitive divisions — AAA, AA, Majors, and Majors Plus. We compete in regional tournaments throughout the season, representing Omaha with pride.
            </p>
            <p style="font-size:15px;line-height:1.8;color:var(--text-light)">
              The nature of senior softball is very competitive. It comes down to strategy, teamwork, and a little luck to win tournaments. We're always improving, always learning, and always representing Heroes Senior Softball with class.
            </p>
          </div>
          <div>
            <div class="card">
              <div class="card-header"><h3>Organization Facts</h3></div>
              <div class="card-body">
                ${[
                  ['Founded', data.config.foundedYear],
                  ['Location', `${data.config.city}, ${data.config.state}`],
                  ['Teams', data.teams.length],
                  ['Active Players', data.players.filter(p=>p.active).length + '+'],
                  ['Divisions', 'AAA, AA, Majors & Majors Plus'],
                ].map(([l,v])=>`<div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--gray-light)">
                  <span style="color:var(--gray);font-size:13px">${l}</span>
                  <span style="font-weight:700">${v}</span>
                </div>`).join('')}
              </div>
            </div>
            <div style="margin-top:20px">
              <a class="btn btn-primary" style="width:100%;justify-content:center;margin-bottom:10px" href="${data.config.facebookUrl}" target="_blank">Join Facebook Group</a>
              <a class="btn btn-dark" style="width:100%;justify-content:center" data-route="/contact">Contact Us</a>
            </div>
          </div>
        </div>
        <div class="divider-text" style="margin:40px 0">Leadership</div>
        <div class="cards-grid cards-3">
          ${data.teams.filter(t=>t.manager).map(t=>`
            <div class="card fade-in">
              <div class="card-body">
                <div style="width:60px;height:60px;border-radius:50%;background:var(--dark);margin-bottom:12px;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,0.3);font-size:20px;font-weight:900">${t.manager?.split(' ').map(w=>w[0]).join('')}</div>
                <div style="font-weight:800;font-size:16px">${t.manager}</div>
                <div style="color:var(--gray);font-size:13px">Manager · ${t.name}</div>
              </div>
            </div>`).join('')}
        </div>
      </div>
    </section>
  `);
}

// ─── PAGE: CONTACT ──────────────────────────────────────────
function renderContact() {
  const data = loadData();
  App.render(`
    <div class="page-banner">
      <div class="page-banner-inner"><h1>Contact <span>Us</span></h1></div>
    </div>
    <section class="section">
      <div class="container" style="max-width:700px">
        <div class="cards-grid cards-2" style="margin-bottom:40px">
          ${[['📧','Email',data.config.contactEmail,`mailto:${data.config.contactEmail}`],
             ['💬','Facebook',`${data.config.city} Heroes Group`,data.config.facebookUrl],
             ['🛒','Heroes Store','Shop gear & apparel',data.config.storeUrl],
             ['💳','Venmo',data.config.venmoHandle,'#']].map(([icon,label,val,href])=>`
            <a class="card" href="${href}" target="${href.startsWith('http')?'_blank':'_self'}" style="text-decoration:none;display:block">
              <div class="card-body" style="display:flex;gap:16px;align-items:center">
                <div style="font-size:28px">${icon}</div>
                <div><div style="font-weight:700">${label}</div><div style="color:var(--gray);font-size:13px">${val}</div></div>
              </div>
            </a>`).join('')}
        </div>
        <div class="card">
          <div class="card-header"><h3>Send a Message</h3></div>
          <div class="card-body">
            <div class="form-row">
              <div class="form-group"><label class="form-label">Name</label><input type="text" class="form-input" id="contact-name" placeholder="Your name"></div>
              <div class="form-group"><label class="form-label">Email</label><input type="email" class="form-input" id="contact-email" placeholder="your@email.com"></div>
            </div>
            <div class="form-group"><label class="form-label">Message</label><textarea class="form-input" id="contact-msg" rows="4" placeholder="Your message..."></textarea></div>
            <button class="btn btn-primary" onclick="submitContact()">Send Message</button>
          </div>
        </div>
      </div>
    </section>
  `);
}

window.submitContact = function() {
  const name = document.getElementById('contact-name')?.value;
  const email = document.getElementById('contact-email')?.value;
  const msg = document.getElementById('contact-msg')?.value;
  if (!name || !email || !msg) { App.toast('Please fill all fields', 'error'); return; }
  // In production, this would POST to a form handler or email service
  App.toast('Message sent! We\'ll get back to you soon.', 'success');
  document.getElementById('contact-name').value = '';
  document.getElementById('contact-email').value = '';
  document.getElementById('contact-msg').value = '';
};

// ─── PAGE: SPONSORS ──────────────────────────────────────────
function renderSponsors() {
  const data = loadData();
  const tiers = { gold: '🥇 Gold Sponsors', silver: '🥈 Silver Sponsors', bronze: '🥉 Bronze Sponsors' };
  const byTier = {};
  data.sponsors.forEach(s => { byTier[s.tier] = byTier[s.tier] || []; byTier[s.tier].push(s); });
  
  App.render(`
    <div class="page-banner">
      <div class="page-banner-inner"><h1>Our <span>Sponsors</span></h1><p>Thank you to our partners who make Heroes softball possible</p></div>
    </div>
    <section class="section">
      <div class="container">
        ${Object.entries(byTier).map(([tier, sponsors]) => `
          <h3 style="margin-bottom:20px;font-size:20px;font-weight:800">${tiers[tier] || tier}</h3>
          <div class="sponsors-row" style="justify-content:flex-start;margin-bottom:40px">
            ${sponsors.map(s=>`
              <a class="sponsor-item" href="${s.url}" target="_blank" rel="nofollow" style="flex-direction:column;gap:8px;min-height:100px">
                ${s.logo?`<img src="${s.logo}" alt="${s.name}" style="max-height:60px" onerror="this.style.display='none'">`:''}
                <span class="sponsor-name">${s.name}</span>
              </a>`).join('')}
          </div>`).join('')}
        <div class="card" style="max-width:500px;margin:0 auto;text-align:center">
          <div class="card-body">
            <h3 style="margin-bottom:10px">Become a Sponsor</h3>
            <p style="color:var(--text-light);margin-bottom:20px">Support the Heroes and get your business in front of the softball community</p>
            <a class="btn btn-primary" href="mailto:${data.config.contactEmail}?subject=Sponsorship Inquiry">Contact Us About Sponsorship</a>
          </div>
        </div>
      </div>
    </section>
  `);
}

// ─── PAGE: NOT FOUND ────────────────────────────────────────
function renderNotFound() {
  App.render(`
    <div class="coming-soon">
      <div style="font-size:72px;margin-bottom:20px">⚾</div>
      <h2>Page Not Found</h2>
      <p>That page doesn't exist or hasn't been built yet.</p>
      <a class="btn btn-primary" data-route="/">← Back to Home</a>
    </div>
  `);
}

// ─── UTILITIES ──────────────────────────────────────────────
window.switchProfileSeason = function(playerId, season) {
  const s = getPlayerStats(playerId, { season });
  const panel = document.getElementById('ptab-season');
  if (!panel) return;
  const statRows = [
    [['G',s.g],['AB',s.ab],['H',s.h],['2B',s.d],['3B',s.t],['HR',s.hr],['RBI',s.rbi],['R',s.r],['BB',s.bb],['K',s.k]],
    [['AVG',s.avg],['OBP',s.obp],['SLG',s.slg],['OPS',s.ops],['TB',s.tb]]
  ];
  panel.innerHTML = `
    <div class="career-stat-row">
      ${statRows[0].map(([l,v])=>`<div class="career-stat"><div class="val">${v}</div><div class="lbl">${l}</div></div>`).join('')}
    </div>
    <div class="career-stat-row" style="background:#fff0f0">
      ${statRows[1].map(([l,v])=>`<div class="career-stat"><div class="val" style="color:var(--red)">${v}</div><div class="lbl">${l}</div></div>`).join('')}
    </div>`;
};

window.switchTab = function(e, tabId) {
  const allBtns = e.target.parentElement.querySelectorAll('.tab-btn');
  allBtns.forEach(b => b.classList.remove('active'));
  e.target.classList.add('active');
  // Use only the first segment as the group prefix (e.g. "stab", "tab", "ptab")
  const prefix = tabId.split('-')[0] + '-';
  document.querySelectorAll('.tab-content').forEach(c => {
    if (c.id && c.id.startsWith(prefix)) c.classList.remove('active');
  });
  const target = document.getElementById(tabId);
  if (target) target.classList.add('active');
};

// ─── PAGE: AWARDS ─────────────────────────────────────────────
// ─── PAGE: TOURNAMENT RESULTS ──────────────────────────────────
function renderTournamentResults() {
  const data = loadData();
  const tournaments = [...(data.tournaments || [])].sort((a, b) =>
    (b.startDate || '').localeCompare(a.startDate || '')
  );

  function trophyBadge(place) {
    if (place === 1) return '<span style="font-size:48px;line-height:1;display:block;margin-bottom:6px">🥇</span><span class="tr-placement-label" style="color:#b45309">Champions · 1st Place</span>';
    if (place === 2) return '<span style="font-size:48px;line-height:1;display:block;margin-bottom:6px">🥈</span><span class="tr-placement-label" style="color:#6b7280">2nd Place</span>';
    if (place === 3) return '<span style="font-size:48px;line-height:1;display:block;margin-bottom:6px">🥉</span><span class="tr-placement-label" style="color:#92400e">3rd Place</span>';
    if (place >= 4)  return `<span style="font-size:36px;line-height:1;display:block;margin-bottom:6px">🏐</span><span class="tr-placement-label" style="color:var(--gray)">${place}th Place</span>`;
    return '';
  }

  const byYear = {};
  tournaments.forEach(t => {
    const yr = t.season || (t.startDate ? t.startDate.slice(0, 4) : 'Unknown');
    byYear[yr] = byYear[yr] || [];
    byYear[yr].push(t);
  });
  const years = Object.keys(byYear).sort().reverse();

  const sections = years.map(year => {
    const cards = byYear[year].map(t => {
      const team   = data.teams.find(tm => tm.id === t.teamId);
      const tGames = (data.games || []).filter(g => g.tournamentId === t.id)
        .sort((a, b) => a.date.localeCompare(b.date));
      const dateStr = t.startDate && t.endDate && t.startDate !== t.endDate
        ? `${t.startDate} – ${t.endDate}` : (t.startDate || '');

      const record = tGames.reduce((r, g) => {
        const res = gameResult(g);
        if (res === 'W') r.w++;
        else if (res === 'L') r.l++;
        else if (res === 'T') r.t++;
        return r;
      }, { w: 0, l: 0, t: 0 });

      const gameRows = tGames.map(g => {
        const res = gameResult(g);
        return `<div class="tr-game-row">
          <span class="tr-game-date">${g.date}</span>
          <span class="tr-game-opp">vs ${g.opponent}</span>
          <span class="tr-game-score">${g.heroScore ?? '–'} – ${g.oppScore ?? '–'}</span>
          <span class="result-badge result-${res || 'tbd'}">${res || 'TBD'}</span>
        </div>`;
      }).join('');

      const hasPlacement = t.placement != null;

      return `<div class="tr-card ${hasPlacement ? 'tr-card-placed' : ''} fade-in">
        ${hasPlacement ? `<div class="tr-trophy-col">${trophyBadge(t.placement)}</div>` : ''}
        <div class="tr-body">
          <div class="tr-header">
            <div>
              <div class="tr-name">${t.name}</div>
              ${dateStr ? `<div class="tr-meta">📅 ${dateStr}</div>` : ''}
              ${t.location ? `<div class="tr-meta">📍 ${t.location}</div>` : ''}
            </div>
            <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">
              ${team ? `<span class="tag tag-dark" style="font-size:11px">${team.shortName || team.name}</span>` : ''}
              ${tGames.length ? `<span style="font-size:12px;color:var(--gray)">${record.w}W – ${record.l}L${record.t ? ' – '+record.t+'T' : ''}</span>` : ''}
            </div>
          </div>
          ${tGames.length ? `<div class="tr-games">${gameRows}</div>` : '<p style="font-size:13px;color:var(--gray);margin:12px 0 0">No games linked yet</p>'}
          ${t.notes ? `<div class="tr-notes">${t.notes}</div>` : ''}
        </div>
      </div>`;
    }).join('');

    return `<div class="awards-year-section">
      <div class="awards-year-header">
        <span class="awards-year-label">${year}</span>
        <span class="awards-year-sub">Tournament Season</span>
      </div>
      ${cards}
    </div>`;
  }).join('');

  App.render(`
    <style>
      .tr-card {
        display:flex; background:var(--card); border-radius:16px;
        border:1px solid var(--border); box-shadow:0 2px 12px rgba(0,0,0,0.06);
        overflow:hidden; margin-bottom:20px;
        transition:box-shadow 0.2s, transform 0.2s;
      }
      .tr-card:hover { box-shadow:0 6px 28px rgba(0,0,0,0.12); transform:translateY(-2px); }
      .tr-card-placed { border-color:rgba(200,16,46,0.2); }
      .tr-trophy-col {
        width:130px; flex-shrink:0; display:flex; flex-direction:column;
        align-items:center; justify-content:center; padding:24px 16px;
        background:linear-gradient(160deg,rgba(200,16,46,0.05) 0%,rgba(200,16,46,0.02) 100%);
        border-right:1px solid var(--border); text-align:center;
      }
      .tr-placement-label { font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:0.5px; }
      .tr-body { flex:1; padding:22px 24px; min-width:0; }
      .tr-header { display:flex; justify-content:space-between; align-items:flex-start; gap:12px; margin-bottom:14px; }
      .tr-name { font-size:20px; font-weight:900; color:var(--dark); line-height:1.2; }
      .tr-meta { font-size:13px; color:var(--gray); margin-top:4px; }
      .tr-games { border-top:1px solid var(--border); padding-top:12px; display:flex; flex-direction:column; gap:8px; }
      .tr-game-row { display:flex; align-items:center; gap:12px; font-size:13px; }
      .tr-game-date { color:var(--gray); font-size:12px; min-width:90px; }
      .tr-game-opp { flex:1; font-weight:600; color:var(--text); }
      .tr-game-score { font-weight:700; color:var(--dark); min-width:60px; text-align:right; }
      .result-badge { padding:2px 8px; border-radius:20px; font-size:11px; font-weight:800; }
      .result-W { background:#dcfce7; color:#15803d; }
      .result-L { background:#fee2e2; color:#dc2626; }
      .result-T { background:#fef9c3; color:#92400e; }
      .result-tbd { background:#f3f4f6; color:#6b7280; }
      .tr-notes { margin-top:12px; font-size:13px; color:var(--gray); font-style:italic; }
      @media(max-width:600px) {
        .tr-trophy-col { width:90px; padding:16px 10px; }
        .tr-body { padding:16px; }
        .tr-name { font-size:16px; }
        .tr-game-date { min-width:72px; }
      }
    </style>
    <div class="page-banner">
      <div class="page-banner-inner">
        <div class="breadcrumb"><a data-route="/">Home</a><span>Tournaments</span></div>
        <h1>Tournament <span>Results</span></h1>
        <p>Heroes team placements and results across all tournaments</p>
      </div>
    </div>
    <section class="section">
      <div class="container" style="max-width:860px">
        ${sections || '<p style="color:var(--gray);text-align:center;padding:48px 0">No tournaments recorded yet</p>'}
      </div>
    </section>
  `);
}

// ─── PAGE: AWARDS ──────────────────────────────────────────────
function renderAwards() {
  const data = loadData();
  const byYear = {};
  data.awards.forEach(a => { byYear[a.year] = byYear[a.year] || []; byYear[a.year].push(a); });
  const years = Object.keys(byYear).sort().reverse();

  const sections = years.map(year => {
    const cards = byYear[year].map(a => {
      const team = data.teams.find(t => t.id === a.team);
      return `<div class="award-card fade-in">
        <div class="award-icon">${a.icon}</div>
        <div class="award-content">
          <div class="award-title">${a.title}</div>
          <div class="award-desc">${a.description}</div>
          <div class="award-team-badge">${team?.name || ''}</div>
        </div>
      </div>`;
    }).join('');
    return `<div class="awards-year-section">
      <div class="awards-year-header">
        <span class="awards-year-label">${year}</span>
        <span class="awards-year-sub">Season Awards</span>
      </div>
      <div class="awards-grid">${cards}</div>
    </div>`;
  }).join('');

  App.render(`
    <div class="page-banner">
      <div class="page-banner-inner">
        <div class="breadcrumb"><a data-route="/">Home</a><span>Awards</span></div>
        <h1>Heroes <span>Awards</span></h1>
        <p>Season honors, all-tournament teams, and individual achievements</p>
      </div>
    </div>
    <section class="section">
      <div class="container" style="max-width:900px">
        ${sections || '<p style="color:var(--gray);text-align:center">No awards yet</p>'}
      </div>
    </section>
  `);
}

// ─── PAGE: GALLERY ─────────────────────────────────────────────
let _galleryCategory = 'all';
const _CAT_LABELS = { site: '🏟 Site', team: '⚾ Team', individual: '👤 Individual', scorebook: '📋 Scorebook' };

function _isStaffUser() {
  return typeof HeroesAuth !== 'undefined' && HeroesAuth.isLoggedIn() && HeroesAuth.isStaff();
}

function _getGalleryCats(albums) {
  const seen = new Set();
  const cats = [{ id: 'all', label: 'All Photos' }];
  const staff = _isStaffUser();
  (albums || []).forEach(al => {
    if (al.category === 'scorebook' && !staff) return;
    if (al.category && !seen.has(al.category)) {
      seen.add(al.category);
      const label = _CAT_LABELS[al.category] || (al.category.charAt(0).toUpperCase() + al.category.slice(1));
      cats.push({ id: al.category, label });
    }
  });
  return cats;
}

function _galleryCanUpload() {
  if (typeof HeroesAuth !== 'undefined' && HeroesAuth.isLoggedIn() && HeroesAuth.isApproved()) return true;
  if (typeof PlayerAuth !== 'undefined' && PlayerAuth.isLoggedIn()) return true;
  return false;
}

function _galleryCanManageAlbums() {
  if (typeof HeroesAuth === 'undefined') return false;
  if (!HeroesAuth.isLoggedIn() || !HeroesAuth.isApproved()) return false;
  return HeroesAuth.isStaff();
}

function renderGallery(cat) {
  if (cat) _galleryCategory = cat;
  const data = loadData();
  const staff = _isStaffUser();
  const allAlbums = (data.albums || [])
    .filter(al => al.category !== 'scorebook' || staff)
    .sort((a,b) => (b.date||'').localeCompare(a.date||''));
  const filtered = _galleryCategory === 'all'
    ? allAlbums
    : allAlbums.filter(al => al.category === _galleryCategory);

  const galleryCats = _getGalleryCats(allAlbums);
  const catTabs = galleryCats.map(c =>
    `<button class="gallery-cat-btn${_galleryCategory===c.id?' active':''}" onclick="Router.navigate('/gallery/${c.id}')">${c.label}</button>`
  ).join('');

  const createAlbumBtn = _galleryCanManageAlbums()
    ? `<button class="btn btn-sm" onclick="showCreateAlbum()" style="flex-shrink:0;background:#1d4ed8;color:#fff">＋ New Album</button>`
    : '';
  const uploadBtn = _galleryCanUpload()
    ? `<button class="btn btn-primary btn-sm" onclick="showGalleryUpload()" style="${createAlbumBtn?'':'margin-left:auto;'}flex-shrink:0">📷 Upload Photo</button>`
    : '';
  const actionBtns = `<div style="margin-left:auto;display:flex;gap:8px;flex-shrink:0">${createAlbumBtn}${uploadBtn}</div>`;

  const albumCards = filtered.map(al => {
    const photos = (data.photos || []).filter(p => p.albumId === al.id);
    const cover = al.coverUrl || photos[0]?.url || '';
    const team = data.teams.find(t => t.id === al.teamId);
    const catLabel = galleryCats.find(c => c.id === al.category && c.id !== 'all');
    return `<div class="gallery-album-card" onclick="openAlbum('${al.id}')">
      <div class="gallery-album-cover">
        ${cover ? `<img src="${cover}" alt="${al.name}" onerror="this.parentElement.innerHTML='<div class=gallery-album-empty>📷</div>'">` : '<div class="gallery-album-empty">📷</div>'}
        <div class="gallery-album-count">${photos.length} photo${photos.length!==1?'s':''}</div>
        ${catLabel ? `<div class="gallery-album-cat">${catLabel.label}</div>` : ''}
      </div>
      <div class="gallery-album-info">
        <div class="gallery-album-name">${al.name}</div>
        <div class="gallery-album-meta">${al.date ? new Date(al.date+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : ''} ${team?'· '+team.shortName:''}</div>
        ${al.description ? `<div class="gallery-album-desc">${al.description}</div>` : ''}
      </div>
    </div>`;
  }).join('') || '<div class="gallery-empty"><div style="font-size:48px;margin-bottom:16px">📷</div><p>No photos yet. Check back soon!</p></div>';

  App.render(`
    <div class="page-banner">
      <div class="page-banner-inner">
        <div class="breadcrumb"><a data-route="/">Home</a><span>Gallery</span></div>
        <h1>Photo <span>Gallery</span></h1>
        <p>Memories from tournaments, events, and team gatherings</p>
      </div>
    </div>
    <section class="section">
      <div class="container">
        <div class="gallery-cat-bar" style="align-items:center">${catTabs}${actionBtns}</div>
        <div class="gallery-grid" id="gallery-grid">${albumCards}</div>
      </div>
    </section>
  `);
}

window.showGalleryUpload = function() {
  const data = loadData();
  const albums = (data.albums || []).sort((a,b) => (b.date||'').localeCompare(a.date||''));
  if (!albums.length) {
    App.toast('No albums exist yet — ask an admin to create one first', 'info');
    return;
  }
  const existing = document.getElementById('gallery-upload-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'gallery-upload-overlay';
  overlay.className = 'lightbox-overlay';
  overlay.innerHTML = `
    <div class="lightbox-panel" style="max-width:440px" onclick="event.stopPropagation()">
      <div class="lightbox-header">
        <div class="lightbox-album-name">Upload Photo</div>
        <button class="lightbox-close" onclick="document.getElementById('gallery-upload-overlay').remove()">✕</button>
      </div>
      <div style="padding:20px;display:flex;flex-direction:column;gap:14px">
        <div class="form-group" style="margin:0">
          <label class="form-label">Album</label>
          <select id="gu-album" class="form-select">
            ${albums.map(al => {
              const allCats = _getGalleryCats(albums);
              const cat = allCats.find(c => c.id === al.category && c.id !== 'all');
              return `<option value="${al.id}">${al.name}${cat ? ' · ' + cat.label : ''}</option>`;
            }).join('')}
          </select>
        </div>
        <div class="form-group" style="margin:0">
          <label class="form-label">Photo *</label>
          <input type="file" id="gu-file" class="form-input" accept="image/*" style="padding:8px">
        </div>
        <div class="form-group" style="margin:0">
          <label class="form-label">Caption (optional)</label>
          <input id="gu-caption" class="form-input" placeholder="Describe the photo…">
        </div>
        <div id="gu-status" style="font-size:13px;min-height:18px;color:var(--gray)"></div>
        <button id="gu-submit-btn" class="btn btn-primary" onclick="submitGalleryUpload()" style="width:100%;justify-content:center">Upload Photo</button>
      </div>
    </div>`;
  overlay.addEventListener('click', () => overlay.remove());
  document.body.appendChild(overlay);
};

window.submitGalleryUpload = async function() {
  const fileEl   = document.getElementById('gu-file');
  const albumId  = document.getElementById('gu-album')?.value;
  const caption  = document.getElementById('gu-caption')?.value?.trim() || '';
  const statusEl = document.getElementById('gu-status');
  const btn      = document.getElementById('gu-submit-btn');
  const file     = fileEl?.files?.[0];

  if (!file)    { statusEl.textContent = 'Please select a photo.'; return; }
  if (!albumId) { statusEl.textContent = 'Please select an album.'; return; }

  btn.disabled = true;
  statusEl.textContent = 'Uploading…';

  try {
    const sb = _getClient();
    if (!sb) { statusEl.textContent = 'Storage unavailable. Try again later.'; btn.disabled = false; return; }
    const ext  = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const path = `gallery/${albumId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await sb.storage.from('team-photos').upload(path, file, { upsert: false, contentType: file.type || 'image/jpeg' });
    if (error) { statusEl.textContent = 'Upload failed: ' + error.message; btn.disabled = false; return; }
    const { data: { publicUrl } } = sb.storage.from('team-photos').getPublicUrl(path);

    const d = loadData();
    if (!d.photos) d.photos = [];
    const uploader = HeroesAuth?.getProfile?.()?.display_name
      || PlayerAuth?.getPlayer?.()?.firstName
      || 'member';
    d.photos.push({ id: 'ph' + Date.now(), albumId, url: publicUrl, caption, uploadedBy: uploader });
    saveData(d);

    document.getElementById('gallery-upload-overlay')?.remove();
    App.toast('Photo uploaded!');
    renderGallery();
  } catch(e) {
    statusEl.textContent = 'Error: ' + e.message;
    btn.disabled = false;
  }
};

window.showCreateAlbum = function() {
  const data = loadData();
  const existing = document.getElementById('gallery-create-album-overlay');
  if (existing) existing.remove();

  // Build category options from existing album categories
  const knownCats = [
    { id: 'site', label: '🏟 Site' },
    { id: 'team', label: '⚾ Team' },
    { id: 'individual', label: '👤 Individual' },
  ];
  const usedIds = new Set((data.albums || []).map(a => a.category).filter(Boolean));
  const extraCats = [...usedIds].filter(id => !knownCats.find(k => k.id === id))
    .map(id => ({ id, label: id.charAt(0).toUpperCase() + id.slice(1) }));
  const allCats = [...knownCats, ...extraCats];
  const catOptions = allCats.map(c => `<option value="${c.id}">${c.label}</option>`).join('');
  const teamOptions = data.teams.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
  const today = new Date().toISOString().split('T')[0];

  const overlay = document.createElement('div');
  overlay.id = 'gallery-create-album-overlay';
  overlay.className = 'lightbox-overlay';
  overlay.innerHTML = `
    <div class="lightbox-panel" style="max-width:480px" onclick="event.stopPropagation()">
      <div class="lightbox-header">
        <div class="lightbox-album-name">Create New Album</div>
        <button class="lightbox-close" onclick="document.getElementById('gallery-create-album-overlay').remove()">✕</button>
      </div>
      <div style="padding:20px;display:flex;flex-direction:column;gap:14px">
        <div class="form-group" style="margin:0">
          <label class="form-label">Album Name *</label>
          <input id="ca-name" class="form-input" placeholder="e.g. Spring Tournament 2026">
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div class="form-group" style="margin:0">
            <label class="form-label">Category *</label>
            <select id="ca-category" class="form-select" onchange="document.getElementById('ca-cat-new-wrap').style.display=this.value==='__new__'?'block':'none'">
              ${catOptions}
              <option value="__new__">➕ New category...</option>
            </select>
            <div id="ca-cat-new-wrap" style="display:none;margin-top:6px">
              <input id="ca-cat-new" class="form-input" placeholder="Category name">
            </div>
          </div>
          <div class="form-group" style="margin:0">
            <label class="form-label">Date</label>
            <input type="date" id="ca-date" class="form-input" value="${today}">
          </div>
        </div>
        <div class="form-group" style="margin:0">
          <label class="form-label">Team (optional)</label>
          <select id="ca-team" class="form-select">
            <option value="">All Teams / Not team-specific</option>
            ${teamOptions}
          </select>
        </div>
        <div class="form-group" style="margin:0">
          <label class="form-label">Description (optional)</label>
          <textarea id="ca-desc" class="form-input" rows="2" placeholder="Brief description of this album"></textarea>
        </div>
        <div id="ca-status" style="font-size:13px;color:#666;min-height:18px"></div>
        <button id="ca-submit-btn" class="btn btn-primary" onclick="submitCreateAlbum()" style="width:100%;justify-content:center">Create Album</button>
      </div>
    </div>
  `;
  overlay.addEventListener('click', () => overlay.remove());
  document.body.appendChild(overlay);
};

window.submitCreateAlbum = function() {
  const nameEl = document.getElementById('ca-name');
  const statusEl = document.getElementById('ca-status');
  const btn = document.getElementById('ca-submit-btn');
  const name = (nameEl?.value || '').trim();
  if (!name) { statusEl.textContent = 'Album name is required.'; statusEl.style.color = '#dc2626'; return; }

  const catSel = document.getElementById('ca-category')?.value || 'site';
  const category = catSel === '__new__'
    ? (document.getElementById('ca-cat-new')?.value || '').toLowerCase().trim() || 'site'
    : catSel;
  const date = document.getElementById('ca-date')?.value || '';
  const teamId = document.getElementById('ca-team')?.value || '';
  const description = document.getElementById('ca-desc')?.value || '';

  btn.disabled = true;
  statusEl.style.color = '#666';
  statusEl.textContent = 'Creating album…';

  const d = loadData();
  if (!d.albums) d.albums = [];
  d.albums.push({ id: 'al' + Date.now(), name, category, date, teamId, description, coverUrl: '' });
  saveData(d);

  statusEl.style.color = '#16a34a';
  statusEl.textContent = 'Album created!';
  setTimeout(() => {
    document.getElementById('gallery-create-album-overlay')?.remove();
    renderGallery();
  }, 700);
};

// Gallery route handles optional category segment: /gallery or /gallery/site etc.
Router.register('/gallery', (cat) => renderGallery(cat || 'all'));

let _lightboxPhotos = [];
let _lightboxIdx = 0;

window.openAlbum = function(albumId) {
  const data = loadData();
  const album = (data.albums||[]).find(a => a.id === albumId);
  if (!album) return;
  _lightboxPhotos = (data.photos||[]).filter(p => p.albumId === albumId);
  if (!_lightboxPhotos.length) { App.toast('No photos in this album yet', 'info'); return; }
  _lightboxIdx = 0;
  _buildLightbox(album.name);
};

function _buildLightbox(albumName) {
  const existing = document.getElementById('lightbox-overlay');
  if (existing) existing.remove();

  const thumbs = _lightboxPhotos.map((p, i) =>
    `<div class="lightbox-thumb${i===_lightboxIdx?' active':''}" onclick="lightboxGoto(${i})">
      <img src="${p.url}" alt="${p.caption||''}" loading="lazy" onerror="this.parentElement.style.display='none'">
    </div>`).join('');

  const p = _lightboxPhotos[_lightboxIdx];
  const overlay = document.createElement('div');
  overlay.id = 'lightbox-overlay';
  overlay.className = 'lightbox-overlay';
  overlay.innerHTML = `
    <div class="lightbox-panel" onclick="event.stopPropagation()">
      <div class="lightbox-header">
        <div class="lightbox-album-name">${albumName}</div>
        <span style="font-size:12px;color:var(--gray)">${_lightboxIdx+1} / ${_lightboxPhotos.length}</span>
        ${_galleryCanManageAlbums() ? `<button onclick="lightboxDeletePhoto()" title="Delete photo" style="background:none;border:none;cursor:pointer;color:#dc2626;font-size:18px;padding:4px 8px;border-radius:4px;line-height:1" onmouseover="this.style.background='#fee2e2'" onmouseout="this.style.background='none'">🗑</button>` : ''}
        <button class="lightbox-close" onclick="document.getElementById('lightbox-overlay').remove()">✕</button>
      </div>
      <div class="lightbox-viewer">
        <button class="lightbox-nav lightbox-prev" onclick="lightboxPrev()" ${_lightboxIdx===0?'disabled':''}>‹</button>
        <div class="lightbox-main">
          <img id="lightbox-main-img" src="${p.url}" alt="${p.caption||''}" onerror="this.style.opacity=0.3">
          ${p.caption ? `<div class="lightbox-caption">${p.caption}</div>` : ''}
        </div>
        <button class="lightbox-nav lightbox-next" onclick="lightboxNext()" ${_lightboxIdx===_lightboxPhotos.length-1?'disabled':''}>›</button>
      </div>
      <div class="lightbox-grid">${thumbs}</div>
    </div>`;
  overlay.addEventListener('click', () => overlay.remove());
  document.body.appendChild(overlay);
  document.addEventListener('keydown', _lightboxKeyHandler);
  overlay.addEventListener('remove', () => document.removeEventListener('keydown', _lightboxKeyHandler));
}

function _lightboxKeyHandler(e) {
  if (!document.getElementById('lightbox-overlay')) { document.removeEventListener('keydown', _lightboxKeyHandler); return; }
  if (e.key === 'ArrowRight') lightboxNext();
  else if (e.key === 'ArrowLeft') lightboxPrev();
  else if (e.key === 'Escape') document.getElementById('lightbox-overlay')?.remove();
}

window.lightboxGoto = function(i) {
  _lightboxIdx = Math.max(0, Math.min(i, _lightboxPhotos.length - 1));
  const p = _lightboxPhotos[_lightboxIdx];
  const img = document.getElementById('lightbox-main-img');
  if (img) { img.src = p.url; img.alt = p.caption || ''; img.style.opacity = 1; }
  document.querySelectorAll('.lightbox-thumb').forEach((t, idx) => t.classList.toggle('active', idx === _lightboxIdx));
  document.querySelector('.lightbox-prev')?.toggleAttribute('disabled', _lightboxIdx === 0);
  document.querySelector('.lightbox-next')?.toggleAttribute('disabled', _lightboxIdx === _lightboxPhotos.length - 1);
  const panel = document.querySelector('.lightbox-header span');
  if (panel) panel.textContent = `${_lightboxIdx+1} / ${_lightboxPhotos.length}`;
  const caption = document.querySelector('.lightbox-caption');
  if (caption) caption.textContent = p.caption || '';
};

window.lightboxNext = function() { lightboxGoto(_lightboxIdx + 1); };
window.lightboxPrev = function() { lightboxGoto(_lightboxIdx - 1); };

window.lightboxDeletePhoto = function() {
  const photo = _lightboxPhotos[_lightboxIdx];
  if (!photo) return;
  const caption = photo.caption ? `"${photo.caption}"` : 'this photo';
  if (!confirm(`Delete ${caption}? This cannot be undone.`)) return;

  const d = loadData();
  d.photos = (d.photos || []).filter(p => p.id !== photo.id);
  saveData(d);

  _lightboxPhotos.splice(_lightboxIdx, 1);

  if (!_lightboxPhotos.length) {
    document.getElementById('lightbox-overlay')?.remove();
    renderGallery();
    App.toast('Photo deleted', 'info');
    return;
  }

  _lightboxIdx = Math.min(_lightboxIdx, _lightboxPhotos.length - 1);
  const albumName = document.querySelector('.lightbox-album-name')?.textContent || '';
  _buildLightbox(albumName);
  App.toast('Photo deleted', 'info');
};

// ─── REGISTER ROUTES ────────────────────────────────────────
Router.register('/', renderHome);
Router.register('/team', (teamId) => renderTeam(teamId));
Router.register('/players', () => { _playerSeasonFilter = null; renderPlayers(); });
Router.register('/player', (playerId) => renderPlayer(playerId));
Router.register('/stats', renderStats);
Router.register('/schedule', renderSchedule);
Router.register('/news', (...args) => { if (args[0] === 'article') renderNewsArticle(args[1]); else renderNews(); });
Router.register('/events', () => { _tevFilter = 'all'; _tevSort = 'date-desc'; _tevTypeFilters = []; renderTournaments(); });
Router.register('/about', renderAbout);
Router.register('/contact', renderContact);
Router.register('/sponsors', renderSponsors);
Router.register('/awards', renderAwards);
Router.register('/tournament-results', renderTournamentResults);
Router.register('*', renderNotFound);

// ─── BOOT ────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // Show subtle loading state while syncing from Supabase
  const main = document.getElementById('main-content');
  if (main) main.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;min-height:400px"><div class="spinner"></div></div>';
  // Race initData against a 4s timeout so a slow/hung Supabase query never
  // blocks App.init() — the app falls back to localStorage cache gracefully.
  await Promise.race([
    initData(),
    new Promise(resolve => setTimeout(resolve, 4000))
  ]);
  App.init();         // render normally from cache (Supabase or localStorage)
});
