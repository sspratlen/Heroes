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
  navigate(path) { window.location.hash = path; },
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
      <li class="nav-item"><a class="nav-link" data-route="/news">News</a></li>
      <li class="nav-item"><a class="nav-link" data-route="/tournaments">Tournaments</a></li>
      <li class="nav-item"><a class="nav-link" data-route="/about">About</a></li>
    `;
    // Inject auth slot — populated by HeroesAuth.refreshNavAuth()
    const navEl = document.getElementById('main-nav');
    const authSlot = document.createElement('div');
    authSlot.id = 'auth-nav-slot';
    navEl.parentElement.insertBefore(authSlot, navEl.nextSibling);

    const mobileLinks = document.getElementById('mobile-nav');
    mobileLinks.innerHTML = `
      <a class="mobile-nav-link" data-route="/">Home</a>
      ${data.teams.map(t => `<a class="mobile-nav-link" data-route="/team/${t.id}">${t.name}</a>`).join('')}
      <a class="mobile-nav-link" data-route="/players">Players</a>
      <a class="mobile-nav-link" data-route="/stats">Stats</a>
      <a class="mobile-nav-link" data-route="/schedule">Scoreboard</a>
      <a class="mobile-nav-link" data-route="/news">News</a>
      <a class="mobile-nav-link" data-route="/tournaments">Tournaments</a>
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
          <p class="footer-tagline">A competitive senior men's softball organization featuring 55's AAA, 50's AAA, and 50's AA teams. Building a legacy of excellence since ${data.config.foundedYear}.</p>
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
            <a class="footer-link" data-route="/players">Player Directory</a>
            <a class="footer-link" data-route="/tournaments">Tournaments</a>
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
    this.main.innerHTML = html;
    this.initAnimations();
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

// ─── PAGE: HOME ─────────────────────────────────────────────
function renderHome() {
  const data = loadData();
  const layout = data.pageLayouts?.home || [];
  
  // Build team cards
  const teamCards = data.teams.map(team => {
    const rec = getTeamRecord(team.id, { season: '2025' });
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
          <span class="tag tag-${team.division === 'AAA' ? 'red' : 'dark'}">${team.division}</span>
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
      <div class="game-item ${g.result === 'W' ? 'win' : g.result === 'L' ? 'loss' : ''}">
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
          ${g.result ? `<span class="result-badge result-${g.result}">${g.result}</span>` : '<span style="color:var(--gray);font-size:12px">TBD</span>'}
        </div>
      </div>`;
  }).join('');

  // Stat leaders
  const leaders = ['avg','hr','rbi'].map(stat => {
    const cats = { avg: 'Batting AVG', hr: 'Home Runs', rbi: 'RBIs', h: 'Hits', bb: 'Walks', slg: 'Slugging' };
    const top = getLeaders(stat, 5);
    const items = top.map((x, i) => {
      const p = x.player;
      return `<div class="leaderboard-item">
        <div class="lb-rank ${i===0?'top':''}">${i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}</div>
        <div>
          <div class="lb-player">${p.firstName} ${p.lastName}</div>
          <div class="lb-team">${data.teams.find(t=>t.id===p.teams[0])?.shortName || ''}</div>
        </div>
        <div class="lb-value">${x.stats[stat]}</div>
      </div>`;
    }).join('') || '<div style="padding:16px;color:var(--gray);text-align:center;font-size:13px">No stats yet</div>';
    return `<div class="leaderboard-card fade-in">
      <div class="leaderboard-card-header"><h3>${cats[stat]}</h3><span>2025 Season</span></div>
      ${items}
    </div>`;
  }).join('');

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

  App.render(`
    <!-- HERO -->
    <section id="hero">
      <div class="hero-bg-text">HEROES</div>
      <div class="hero-inner">
        <div class="hero-content">
          <div class="hero-tag">⚾ Omaha, NE · Est. ${data.config.foundedYear}</div>
          <h1 class="hero-title">Heroes<br><span>Senior Softball</span></h1>
          <p class="hero-subtitle">Competitive senior men's softball — three teams, one organization, a legacy of excellence.</p>
          <div class="hero-record">
            <div class="hero-stat">
              <div class="hero-stat-num">${data.teams.reduce((s,t)=>s+getTeamRecord(t.id,{season:'2025'}).wins,0)}</div>
              <div class="hero-stat-label">2025 Wins</div>
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
    </section>

    <!-- TEAMS -->
    <section class="section">
      <div class="container">
        <div class="section-header">
          <div class="section-label">Organization</div>
          <h2>Our <span>Teams</span></h2>
          <p>Three competitive teams competing at the highest levels of senior softball</p>
        </div>
        <div class="cards-grid cards-3">${teamCards}</div>
      </div>
    </section>

    <!-- RESULTS + SCHEDULE -->
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
            <div style="margin-top:16px"><a class="btn btn-dark btn-sm" data-route="/tournaments">All Events →</a></div>
          </div>
        </div>
      </div>
    </section>

    <!-- STAT LEADERS -->
    <section class="section section-dark">
      <div class="container">
        <div class="section-header">
          <div class="section-label">Performance</div>
          <h2>2025 Season <span>Leaders</span></h2>
          <p>Top performers across all Heroes teams</p>
        </div>
        <div class="leaderboard-section">${leaders}</div>
        <div style="margin-top:24px;text-align:center"><a class="btn btn-gold" data-route="/stats">Full Stats & Leaderboards →</a></div>
      </div>
    </section>

    <!-- NEWS -->
    <section class="section">
      <div class="container">
        <div class="section-header">
          <div class="section-label">News</div>
          <h2>Latest <span>Updates</span></h2>
        </div>
        <div class="cards-grid cards-3">${newsItems}</div>
        <div style="margin-top:24px;text-align:center"><a class="btn btn-dark" data-route="/news">All News & Announcements →</a></div>
      </div>
    </section>

    <!-- AWARDS -->
    <section class="section section-light">
      <div class="container">
        <div class="section-header">
          <div class="section-label">Honors</div>
          <h2>Team <span>Achievements</span></h2>
        </div>
        <div class="awards-grid">${awardsHtml}</div>
      </div>
    </section>

    <!-- SPONSORS -->
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
    </section>
  `);
}

// ─── PAGE: TEAM ─────────────────────────────────────────────
function renderTeam(teamId) {
  const data = loadData();
  const team = data.teams.find(t => t.id === teamId);
  if (!team) return renderNotFound();
  
  const record = getTeamRecord(team.id);
  const players = data.players.filter(p => p.teams.includes(teamId) && p.active);
  const games = [...data.games.filter(g => g.teamId === teamId)].sort((a,b) => b.date.localeCompare(a.date));

  const rosterRows = players.map(p => {
    const stats = getPlayerStats(p.id, { teamId, season: '2025' });
    return `<tr>
      <td><span style="color:var(--red);font-weight:800">#${p.number}</span></td>
      <td><div class="player-cell">
        <div style="width:28px;height:28px;border-radius:50%;background:var(--dark);display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,0.5);font-size:10px;font-weight:900;flex-shrink:0">${p.firstName[0]}${p.lastName[0]}</div>
        <span class="player-name" data-route="/player/${p.id}">${p.firstName} ${p.lastName}</span>
      </div></td>
      <td>${p.position}</td>
      <td>${p.bats}/${p.throws}</td>
      <td>${stats.g}</td>
      <td>${stats.ab}</td>
      <td class="stat-highlight">${stats.avg}</td>
      <td>${stats.h}</td>
      <td>${stats.hr}</td>
      <td>${stats.rbi}</td>
      <td>${stats.obp}</td>
      <td>${stats.slg}</td>
    </tr>`;
  }).join('');

  const gameRows = games.map(g => {
    const d = new Date(g.date + 'T12:00:00');
    return `<div class="game-item ${g.result==='W'?'win':g.result==='L'?'loss':'upcoming'}">
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
      <div class="game-result">${g.result?`<span class="result-badge result-${g.result}">${g.result}</span>`:'<span style="color:var(--gray);font-size:12px">TBD</span>'}</div>
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
          <div class="stats-table-wrap">
            <table class="stats-table">
              <thead><tr>
                <th>#</th><th>Player</th><th>POS</th><th>B/T</th>
                <th>G</th><th>AB</th><th class="stat-highlight">AVG</th>
                <th>H</th><th>HR</th><th>RBI</th><th>OBP</th><th>SLG</th>
              </tr></thead>
              <tbody>${rosterRows || '<tr><td colspan="12" style="text-align:center;color:var(--gray);padding:30px">No players on roster</td></tr>'}</tbody>
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
          <button class="filter-btn active" onclick="filterByStatus(this,'true')" data-status="true">Active</button>
          <button class="filter-btn" onclick="filterByStatus(this,'false')" data-status="false">Former</button>
          <button class="filter-btn" onclick="filterByStatus(this,'all')" data-status="all">All</button>
        </div>
        <div class="player-grid" id="player-grid">
          ${renderPlayerCards(data.players.filter(p => p.active), data)}
        </div>
      </div>
    </section>
  `);
}

function renderPlayerCards(players, data) {
  return players.map(p => {
    const stats = getPlayerStats(p.id, { season: '2025' });
    const yrs = new Date().getFullYear() - p.joinYear + 1;
    return `<div class="player-card" data-route="/player/${p.id}">
      <div class="player-card-photo">
        ${p.photo ? `<img src="${p.photo}" alt="${p.firstName}" onerror="this.style.display='none'">` : ''}
        <div class="initials">${p.firstName[0]}${p.lastName[0]}</div>
        <div class="player-card-number">${p.number}</div>
      </div>
      <div class="player-card-info">
        <div class="player-card-name">${p.firstName} ${p.lastName}</div>
        <div class="player-card-pos">${p.position} · ${yrs > 1 ? `${yrs} yrs` : '1st yr'}</div>
        <div class="player-card-stats">
          <div class="player-mini-stat"><div class="val">${stats.avg}</div><div class="lbl">AVG</div></div>
          <div class="player-mini-stat"><div class="val">${stats.hr}</div><div class="lbl">HR</div></div>
          <div class="player-mini-stat"><div class="val">${stats.rbi}</div><div class="lbl">RBI</div></div>
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
  const stats25 = getPlayerStats(playerId, { season: '2025' });
  const yrs = new Date().getFullYear() - player.joinYear + 1;
  const teams = player.teams.map(id => data.teams.find(t => t.id === id)).filter(Boolean);

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
        </div>
      </div>
    </div>
    <section class="section">
      <div class="container">
        <div class="tabs">
          <button class="tab-btn active" onclick="switchTab(event,'ptab-2025')">2025 Season</button>
          <button class="tab-btn" onclick="switchTab(event,'ptab-career')">Career</button>
          <button class="tab-btn" onclick="switchTab(event,'ptab-games')">Game Log</button>
        </div>
        <div id="ptab-2025" class="tab-content active">
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
      <td><span class="result-badge result-${g.result||'T'}">${g.result||'–'}</span></td>
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
        <div class="filter-row">
          <label style="font-size:13px;font-weight:700">Season:</label>
          <select class="form-select" id="stats-season" onchange="renderStatsContent()">
            <option value="">All Time</option>
            ${seasons.map(s=>`<option value="${s}"${s===defaultSeason?' selected':''}>${s}</option>`).join('')}
          </select>
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
  const season = document.getElementById('stats-season')?.value || '';
  const data = loadData();

  const battingEl = document.getElementById('stats-batting');
  const powerEl   = document.getElementById('stats-power');
  const fullEl    = document.getElementById('stats-full');
  if (!battingEl) return;

  battingEl.innerHTML = ['avg','obp','slg'].map(stat => `
    <div class="leaderboard-card">
      <div class="leaderboard-card-header"><h3>${STAT_LABELS[stat]}</h3><span>Leaders</span></div>
      ${buildSimpleLeaderboard(stat, season, data)}
    </div>`).join('');

  powerEl.innerHTML = ['hr','rbi','h','tb'].map(stat => `
    <div class="leaderboard-card">
      <div class="leaderboard-card-header"><h3>${STAT_LABELS[stat]}</h3><span>Leaders</span></div>
      ${buildSimpleLeaderboard(stat, season, data)}
    </div>`).join('');

  fullEl.innerHTML = buildFullStatsTable(data, season);
};

function buildSimpleLeaderboard(stat, season, data) {
  const top = getLeaders(stat, 5, season ? { season } : {});
  if (!top.length) return '<div style="padding:16px;color:var(--gray);text-align:center">No data</div>';
  return top.map((x, i) => `
    <div class="leaderboard-item">
      <div class="lb-rank ${i<3?'top':''}">${i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}</div>
      <div><div class="lb-player">${x.player.firstName} ${x.player.lastName}</div>
      <div class="lb-team">${data.teams.find(t=>t.id===x.player.teams[0])?.shortName||''}</div></div>
      <div class="lb-value">${x.stats[stat]}</div>
    </div>`).join('');
}

function buildFullStatsTable(data, season) {
  const players = data.players.filter(p => p.active);
  const rows = players.map(p => {
    const s = getPlayerStats(p.id, season ? { season } : {});
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
    return `<div class="game-item ${g.result==='W'?'win':g.result==='L'?'loss':'upcoming'}">
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
      <div class="game-result">${g.result?`<span class="result-badge result-${g.result}">${g.result}</span>`:'<span style="color:var(--gray);font-size:12px">TBD</span>'}</div>
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
function renderTournaments() {
  const data = loadData();
  const tournaments = data.events.filter(e => e.type === 'tournament' || e.type === 'social');

  const statusBadge = (ev) => {
    const map = {
      upcoming: ['tag-gold', '📅 Upcoming'],
      active: ['tag-green', '⚡ In Progress'],
      completed: ['tag-dark', '✓ Completed'],
      cancelled: ['tag-gray', '✕ Cancelled'],
    };
    const [cls, label] = map[ev.status] || ['tag-gray', ev.status];
    return `<span class="tag ${cls}">${label}</span>`;
  };

  const regBadge = (ev) => {
    if (ev.type === 'social') return '';
    const map = { open: ['#dcfce7','#15803d','📋 Registration Open'], closed: ['#fee2e2','#dc2626','🔒 Roster Closed'], pending: ['#fef9c3','#92400e','⏳ Pending'] };
    const [bg, color, label] = map[ev.registrationStatus] || ['#f3f4f6','#6b7280','Unknown'];
    return `<span style="background:${bg};color:${color};padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700">${label}</span>`;
  };

  function buildAttendanceSummary(ev) {
    const avail = ev.availability || [];
    const yes = avail.filter(a=>a.status==='yes').length;
    const no = avail.filter(a=>a.status==='no').length;
    const maybe = avail.filter(a=>a.status==='maybe').length;
    const eligible = data.players.filter(p=>p.active && ev.teams.some(tid=>p.teams.includes(tid))).length;
    const pending = eligible - yes - no - maybe;
    const yPct = eligible ? (yes/eligible*100).toFixed(0) : 0;
    const mPct = eligible ? (maybe/eligible*100).toFixed(0) : 0;
    const nPct = eligible ? (no/eligible*100).toFixed(0) : 0;
    return { yes, no, maybe, pending, eligible, yPct, mPct, nPct };
  }

  function buildPlayerAvatars(ev) {
    const avail = ev.availability || [];
    const eligible = data.players.filter(p=>p.active && ev.teams.some(tid=>p.teams.includes(tid)));
    
    // Sort: yes first, maybe, pending, no last
    const order = { yes:0, maybe:1, pending:2, no:3 };
    const withStatus = eligible.map(p => {
      const a = avail.find(x=>x.playerId===p.id);
      const status = a?.status || 'pending';
      const note = a?.note || '';
      return { player: p, status, note };
    }).sort((a,b) => (order[a.status]||2) - (order[b.status]||2));

    return withStatus.map(({player:p, status, note}) => {
      const tooltip = `${p.firstName} ${p.lastName} — ${status==='yes'?'✅ Attending':status==='no'?'❌ Not Attending':status==='maybe'?'🟡 Maybe':'⏳ TBD'}${note?': '+note:''}`;
      return `<div class="attend-avatar attend-avatar-${status}" title="${tooltip.replace(/"/g,"'")}">${p.firstName[0]}${p.lastName[0]}</div>`;
    }).join('');
  }

  const cards = tournaments.map(ev => {
    const d1 = new Date(ev.date + 'T12:00:00');
    const d2 = ev.endDate ? new Date(ev.endDate + 'T12:00:00') : null;
    const dateStr = d2 && ev.date !== ev.endDate
      ? `${d1.toLocaleDateString('en-US',{month:'short',day:'numeric'})} – ${d2.toLocaleDateString('en-US',{month:'short',day:'numeric', year:'numeric'})}`
      : d1.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'});
    const teams = ev.teams.map(id=>data.teams.find(t=>t.id===id)).filter(Boolean);
    const summ = buildAttendanceSummary(ev);
    const isSocial = ev.type === 'social';

    return `<div class="tourney-card">
      <div class="tourney-header">
        <div class="tourney-dates">${dateStr}</div>
        <div class="tourney-name">${ev.name}</div>
        <div class="tourney-location">📍 ${ev.venue ? ev.venue + ', ' : ''}${ev.location}</div>
        <div class="tourney-badges">
          ${statusBadge(ev)}
          ${regBadge(ev)}
          ${teams.map(t=>`<span class="tag tag-dark">${t.name}</span>`).join('')}
          ${isSocial ? '<span class="tag" style="background:rgba(255,255,255,0.15);color:#fff">🎉 Team Event</span>' : ''}
        </div>
      </div>
      <div class="tourney-body">
        <div class="tourney-meta-grid">
          ${ev.address ? `<div class="tourney-meta-item"><label>Venue</label><div class="val"><a href="https://maps.google.com?q=${encodeURIComponent(ev.address)}" target="_blank">📍 ${ev.venue||ev.location}</a></div></div>` : ''}
          ${!isSocial && ev.entryFee ? `<div class="tourney-meta-item"><label>Entry Fee</label><div class="val">$${ev.entryFee} / team</div></div>` : ''}
          ${!isSocial && ev.division ? `<div class="tourney-meta-item"><label>Division</label><div class="val">${ev.division}</div></div>` : ''}
          ${ev.rsvpDeadline ? `<div class="tourney-meta-item"><label>RSVP By</label><div class="val" style="color:var(--red)">📅 ${new Date(ev.rsvpDeadline+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'})}</div></div>` : ''}
          ${!isSocial && ev.rosterDeadline ? `<div class="tourney-meta-item"><label>Roster Deadline</label><div class="val">📋 ${new Date(ev.rosterDeadline+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'})}</div></div>` : ''}
          ${!isSocial && ev.director ? `<div class="tourney-meta-item"><label>Director</label><div class="val">${ev.director}</div></div>` : ''}
          ${ev.placement ? `<div class="tourney-meta-item"><label>Result</label><div class="val" style="color:var(--gold);font-size:16px">🏆 ${ev.placement}</div></div>` : ''}
        </div>
        ${ev.notes ? `<div style="background:var(--light);border-radius:8px;padding:14px 16px;margin-bottom:18px;font-size:13px;line-height:1.6;color:var(--text)">
          <span style="font-weight:800;font-size:11px;text-transform:uppercase;color:var(--gray);letter-spacing:0.5px">📌 Notes from Manager</span><br>${ev.notes}</div>` : ''}
        ${ev.hotelInfo ? `<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:14px 16px;margin-bottom:18px;font-size:13px;line-height:1.6">
          <span style="font-weight:800;font-size:11px;text-transform:uppercase;color:#1d4ed8;letter-spacing:0.5px">🏨 Hotel Info</span><br>${ev.hotelInfo}
          ${ev.hotelUrl ? `<br><a href="${ev.hotelUrl}" target="_blank" style="color:#1d4ed8;font-weight:700">Book Now →</a>` : ''}
          ${ev.hotelCode ? `<br><span style="font-size:12px">Code: <strong>${ev.hotelCode}</strong></span>` : ''}
        </div>` : ''}

        <div class="tourney-attendance-section">
          <div class="tourney-attendance-header">
            <h4>Player Attendance (${summ.yes} of ${summ.eligible} confirmed)</h4>
            <div class="attend-counts">
              <span class="attend-count"><span class="attend-count-dot" style="background:#22c55e"></span>${summ.yes}</span>
              <span class="attend-count"><span class="attend-count-dot" style="background:#eab308"></span>${summ.maybe}</span>
              <span class="attend-count"><span class="attend-count-dot" style="background:#ef4444"></span>${summ.no}</span>
              <span class="attend-count"><span class="attend-count-dot" style="background:var(--gray)"></span>${summ.pending}</span>
            </div>
          </div>
          <div class="attend-bar">
            <div class="attend-bar-yes" style="width:${summ.yPct}%"></div>
            <div class="attend-bar-maybe" style="width:${summ.mPct}%"></div>
            <div class="attend-bar-no" style="width:${summ.nPct}%"></div>
          </div>
          <div style="margin-top:14px">
            <div style="font-size:11px;font-weight:800;text-transform:uppercase;color:var(--gray);letter-spacing:0.5px;margin-bottom:10px">All Players</div>
            <div class="attend-avatars">${buildPlayerAvatars(ev)}</div>
          </div>
        </div>
      </div>
    </div>`;
  }).join('') || '<p style="color:var(--gray)">No tournaments scheduled yet</p>';

  App.render(`
    <div class="page-banner">
      <div class="page-banner-inner">
        <div class="breadcrumb"><a data-route="/">Home</a><span>Tournaments</span></div>
        <h1>Tournament <span>Schedule</span></h1>
        <p>Upcoming events and team schedule</p>
      </div>
    </div>
    <section class="section">
      <div class="container" style="max-width:900px">
        <div class="filter-row" style="margin-bottom:24px">
          <button class="filter-btn active" onclick="filterTourneys(this,'all')">All Events</button>
          <button class="filter-btn" onclick="filterTourneys(this,'upcoming')">Upcoming</button>
          <button class="filter-btn" onclick="filterTourneys(this,'completed')">Completed</button>
          <button class="filter-btn" onclick="filterTourneys(this,'tournament')">Tournaments</button>
          <button class="filter-btn" onclick="filterTourneys(this,'social')">Team Events</button>
        </div>
        <div id="tourney-list">${cards}</div>
      </div>
    </section>
  `);
}

window.filterTourneys = function(btn, filter) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const data = loadData();
  let events = data.events;
  if (filter === 'upcoming') events = events.filter(e => e.status === 'upcoming');
  else if (filter === 'completed') events = events.filter(e => e.status === 'completed');
  else if (filter === 'tournament') events = events.filter(e => e.type === 'tournament');
  else if (filter === 'social') events = events.filter(e => e.type === 'social');
  // Re-render just the list portion
  Router.navigate('/tournaments');
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
              Since our inception, the team has grown to over 30 players across three competitive teams — the 55's AAA, 50's AAA, and 50's AA divisions. We compete in regional tournaments throughout the season, representing Omaha with pride.
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
                  ['Divisions', 'AAA & AA'],
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

// ─── REGISTER ROUTES ────────────────────────────────────────
Router.register('/', renderHome);
Router.register('/team', (teamId) => renderTeam(teamId));
Router.register('/players', renderPlayers);
Router.register('/player', (playerId) => renderPlayer(playerId));
Router.register('/stats', renderStats);
Router.register('/schedule', renderSchedule);
Router.register('/news', (...args) => { if (args[0] === 'article') renderNewsArticle(args[1]); else renderNews(); });
Router.register('/tournaments', renderTournaments);
Router.register('/about', renderAbout);
Router.register('/contact', renderContact);
Router.register('/sponsors', renderSponsors);
Router.register('*', renderNotFound);

// ─── BOOT ────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // Show subtle loading state while syncing from Supabase
  const main = document.getElementById('main-content');
  if (main) main.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;min-height:400px"><div class="spinner"></div></div>';
  await initData();   // pull latest data from Supabase into localStorage cache
  App.init();         // then render normally from cache
});
