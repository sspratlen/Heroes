/* ============================================================
   HEROES — SCOREBOARD LIGHT IA OVERLAY
   Loads AFTER app.js. Patches:
     • App.buildNav  → 5 primary items + team switcher second tier
     • App.buildFooter → About/Contact/Sponsors/Admin in footer
     • Router '/my'  → player portal landing page
     • Router '/all' → 'All Heroes' filter (alias for /)

   Existing routes still work — nav items just map to consolidated hubs:
     Home          → /
     Tournaments   → /events
     Season        → /stats
     Players       → /players
     Latest        → /news
     My Heroes     → /my            (NEW)
   ============================================================ */
(function () {
  'use strict';

  if (typeof App === 'undefined' || typeof Router === 'undefined') {
    console.warn('[scoreboard] App or Router not found — overlay disabled.');
    return;
  }

  // Map of primary nav items.
  // 'matches' is an array of route prefixes that should highlight this item.
  const NAV = [
    { label: 'Home',        route: '/',           matches: ['/'] },
    { label: 'Events',      route: '/events',     matches: ['/events', '/event', '/tournaments', '/tournament'] },
    { label: 'Season',      route: '/stats',      matches: ['/stats', '/schedule', '/season'] },
    { label: 'Players',     route: '/players',    matches: ['/players', '/player', '/team'] },
    { label: 'Latest',      route: '/news',       matches: ['/news', '/awards', '/latest'] },
    { label: 'Gallery',     route: '/gallery',    matches: ['/gallery'] },
    { label: 'My Heroes',   route: '/my',         matches: ['/my'], primary: true },
  ];

  // ──────────────────────────────────────────────────────────
  // Build nav
  // ──────────────────────────────────────────────────────────
  App.buildNav = function buildNavScoreboard() {
    const data = loadData();

    const mainNav = document.getElementById('main-nav');
    mainNav.innerHTML = NAV.map(n => `
      <li class="nav-item">
        <a class="nav-link${n.primary ? ' nav-link-primary' : ''}" data-route="${n.route}">${n.label}</a>
      </li>
    `).join('');

    // Auth slot (kept compatible with existing HeroesAuth.refreshNavAuth)
    if (!document.getElementById('auth-nav-slot')) {
      const slot = document.createElement('div');
      slot.id = 'auth-nav-slot';
      mainNav.parentElement.insertBefore(slot, mainNav.nextSibling);
    }
    // Populate auth slot now that it exists
    if (typeof HeroesAuth !== 'undefined') HeroesAuth.refreshNavAuth();

    // ───── Second tier: team strip ─────
    // Build once, attach right under #site-header's flex row.
    let strip = document.getElementById('team-strip');
    if (!strip) {
      strip = document.createElement('div');
      strip.id = 'team-strip';
      strip.className = 'team-strip';
      document.getElementById('site-header').appendChild(strip);
    }

    const allTeams = [{ id: 'all', name: 'All Heroes', shortName: 'ALL' }].concat(
      data.teams.map(t => ({ id: t.id, name: t.name, shortName: t.shortName || t.name }))
    );
    strip.innerHTML = `
      <span class="team-strip-label">Viewing</span>
      ${allTeams.map(t => `
        <a class="team-chip" data-route="${t.id === 'all' ? '/' : '/team/' + t.id}" data-team="${t.id}">${t.shortName}</a>
      `).join('')}
      <span class="team-strip-meta" id="team-strip-meta"></span>
    `;
    updateTeamStripMeta();

    // ───── Mobile nav ─────
    const mobile = document.getElementById('mobile-nav');
    mobile.innerHTML = `
      ${NAV.map(n => `<a class="mobile-nav-link" data-route="${n.route}">${n.label}</a>`).join('')}
      <div style="height:1px;background:rgba(255,255,255,.1);margin:8px 0"></div>
      ${data.teams.map(t => `<a class="mobile-nav-link" data-route="/team/${t.id}">${t.name}</a>`).join('')}
      <div style="height:1px;background:rgba(255,255,255,.1);margin:8px 0"></div>
      <a class="mobile-nav-link" data-route="/about">About</a>
      <a class="mobile-nav-link" data-route="/contact">Contact</a>
      <a class="mobile-nav-link" data-route="/sponsors">Sponsors</a>
    `;
  };

  // Compute team-strip meta (record across teams)
  function updateTeamStripMeta() {
    const meta = document.getElementById('team-strip-meta');
    if (!meta) return;
    try {
      const data = loadData();
      const year = new Date().getFullYear();
      const games = data.games.filter(g => (g.season + '') === (year + ''));
      const w = games.filter(g => g.result === 'W').length;
      const l = games.filter(g => g.result === 'L').length;
      const total = w + l;
      const pct = total ? (w / total).toFixed(3).replace(/^0/, '') : '.000';
      meta.innerHTML = `${year} &nbsp;<strong style="color:#16a34a">${w}W</strong><span style="color:#aaa">–</span><strong style="color:#555">${l}L</strong>&nbsp; <span style="color:#888;font-size:12px">${pct}</span>`;
    } catch (e) {
      meta.textContent = '';
    }
  }

  // ──────────────────────────────────────────────────────────
  // Override active highlighting — match by route prefix
  // ──────────────────────────────────────────────────────────
  const origUpdateNav = App.updateNav.bind(App);
  App.updateNav = function updateNavScoreboard(route) {
    document.querySelectorAll('#main-nav .nav-link').forEach(el => {
      const target = el.dataset.route;
      const cfg = NAV.find(n => n.route === target);
      if (!cfg) { el.classList.remove('active'); return; }
      const active = cfg.matches.some(m =>
        m === '/' ? route === '/' : route.startsWith(m)
      );
      el.classList.toggle('active', active);
    });
    // Team strip highlighting
    document.querySelectorAll('#team-strip .team-chip').forEach(el => {
      const t = el.dataset.team;
      const path = window.location.hash.replace('#', '') || '/';
      const active = t === 'all'
        ? path === '/'
        : path === `/team/${t}`;
      el.classList.toggle('active', active);
    });
  };

  // ──────────────────────────────────────────────────────────
  // Build footer  (About / Contact / Sponsors / Admin live here)
  // ──────────────────────────────────────────────────────────
  App.buildFooter = function buildFooterScoreboard() {
    const data = loadData();
    const cfg = data.config;
    document.getElementById('site-footer').innerHTML = `
      <div class="footer-inner">
        <div class="footer-brand">
          <div class="footer-brand-logo">
            <img src="assets/img/heroes-logo.jpg" alt="Heroes Logo">
            <div class="footer-brand-name">${cfg.orgName}</div>
          </div>
          <p class="footer-tagline">A competitive senior men's softball organization — AAA, AA, Majors, and Majors Plus. Building a legacy since ${cfg.foundedYear}.</p>
          <div class="footer-social">
            <a class="social-btn" href="${cfg.facebookUrl || '#'}" target="_blank" title="Facebook">f</a>
            <a class="social-btn" href="${cfg.storeUrl || '#'}" target="_blank" title="Store">🛒</a>
          </div>
        </div>
        <div class="footer-col">
          <h4>Site</h4>
          <div class="footer-links">
            <a class="footer-link" data-route="/events">Events</a>
            <a class="footer-link" data-route="/stats">Season</a>
            <a class="footer-link" data-route="/players">Players</a>
            <a class="footer-link" data-route="/news">Latest</a>
            <a class="footer-link" data-route="/my">My Heroes</a>
          </div>
        </div>
        <div class="footer-col">
          <h4>Teams</h4>
          <div class="footer-links">
            ${data.teams.map(t => `<a class="footer-link" data-route="/team/${t.id}">${t.name}</a>`).join('')}
          </div>
        </div>
        <div class="footer-col">
          <h4>Org</h4>
          <div class="footer-links">
            <a class="footer-link" data-route="/about">About</a>
            <a class="footer-link" data-route="/contact">Contact</a>
            <a class="footer-link" data-route="/sponsors">Sponsors</a>
            <a class="footer-link" data-route="/awards">Awards</a>
            <a class="footer-link" data-route="/gallery">Gallery</a>
            <a class="footer-link" href="${cfg.storeUrl || '#'}" target="_blank">Heroes Store</a>
            <a class="footer-link" href="admin.html">Admin Login</a>
          </div>
        </div>
      </div>
      <div class="footer-bottom">
        <p>© ${new Date().getFullYear()} ${cfg.orgName} · ${cfg.city}, ${cfg.state}</p>
      </div>
    `;
  };

  // ──────────────────────────────────────────────────────────
  // ROUTE: /my  →  Tournament Availability Portal
  // ──────────────────────────────────────────────────────────

  // auth.js uses `const HeroesAuth = {...}` — a top-level const is NOT a window property.
  // Access it directly (all scripts share the global scope) via a typeof guard.
  function getHA() {
    try { return (typeof HeroesAuth !== 'undefined') ? HeroesAuth : null; } catch(e) { return null; }
  }

  function getCurrentPlayer() {
    const ha = getHA();
    if (ha && typeof ha.isLoggedIn === 'function') {
      // Auth module loaded but init() hasn't finished yet — signal "wait"
      if (!ha._initialized) return { _loading: true };
      if (!ha.isLoggedIn()) return null;
      if (!ha.isApproved()) return { _pendingApproval: true };
      const profile = ha.getProfile();
      if (!profile) return null;
      try {
        const data = loadData();
        const match = (data.players || []).find(p =>
          p.email && p.email.toLowerCase() === (profile.email || '').toLowerCase()
        );
        if (match) return match;
      } catch {}
      const parts = (profile.display_name || '').trim().split(/\s+/);
      return {
        id: profile.id,
        firstName: parts[0] || '',
        lastName: parts.slice(1).join(' ') || '',
        number: '', position: '', teams: [],
        email: profile.email,
        _supabaseProfile: profile,
      };
    }
    try {
      const raw = localStorage.getItem('heroes_current_player');
      if (raw) return JSON.parse(raw);
    } catch {}
    return null;
  }

  function daysUntil(iso) {
    if (!iso) return null;
    const d = new Date(iso + 'T12:00:00');
    const now = new Date(); now.setHours(0, 0, 0, 0);
    return Math.round((d - now) / 86400000);
  }

  function fmtEvDate(iso) {
    if (!iso) return '';
    return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric'
    }).toUpperCase();
  }

  // ── Global action handlers ──────────────────────────────────

  // Unified Edit Profile modal — opened from the nav dropdown
  window.openEditProfileModal = function() {
    const existing = document.getElementById('ep-modal-overlay');
    if (existing) existing.remove();

    const player  = getCurrentPlayer();
    const profile = getHA()?.getProfile();
    const name    = profile?.display_name || '';
    const teamColor = '#C8102E';

    // Avatar HTML
    const initials = name.split(/\s+/).slice(0,2).map(w=>w[0]?.toUpperCase()||'').join('') || '?';
    const avatarHtml = player?.photo
      ? `<img src="${player.photo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block"
             onerror="this.parentElement.innerHTML='<span style=font-size:22px;font-weight:900;color:#fff>${initials}</span>'">`
      : `<span style="font-size:22px;font-weight:900;color:#fff">${initials}</span>`;

    // Position / bats / throws
    const positions = ['P','C','1B','2B','3B','SS','OF','LF','CF','RF','DH','UT'];
    const posOpts = `<option value="">— Select —</option>${positions.map(p=>`<option value="${p}"${player?.position===p?' selected':''}>${p}</option>`).join('')}`;
    const selStyle = `width:100%;padding:10px 12px;border:1.5px solid #ddd;border-radius:7px;font-size:14px;outline:none;box-sizing:border-box;font-family:inherit;background:#fff`;
    const focusBlur = `onfocus="this.style.borderColor='#C8102E'" onblur="this.style.borderColor='#ddd'"`;

    const el = document.createElement('div');
    el.id = 'ep-modal-overlay';
    el.innerHTML = `
      <div id="ep-modal-backdrop" style="position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:9000;display:flex;align-items:flex-start;justify-content:center;padding:20px;overflow-y:auto">
        <div style="background:#fff;border-radius:14px;width:100%;max-width:420px;box-shadow:0 20px 60px rgba(0,0,0,0.3);margin:auto">

          <!-- Header -->
          <div style="display:flex;align-items:center;justify-content:space-between;padding:20px 24px 0">
            <div>
              <div style="font-size:11px;font-weight:800;letter-spacing:1px;color:#aaa">MY HEROES · PLAYER PORTAL</div>
              <h2 style="font-size:20px;font-weight:900;margin:4px 0 0">Edit Profile</h2>
            </div>
            <button onclick="document.getElementById('ep-modal-overlay').remove()"
              style="width:32px;height:32px;border-radius:50%;border:1.5px solid #ddd;background:transparent;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#555;font-family:inherit;flex-shrink:0">✕</button>
          </div>

          <div style="padding:20px 24px;display:flex;flex-direction:column;gap:20px">

            <!-- Section 1: Photo -->
            <div style="border:1px solid #e5e7eb;border-radius:10px;padding:18px">
              <div style="font-size:11px;font-weight:800;letter-spacing:1px;color:#aaa;margin-bottom:12px">PROFILE PHOTO</div>
              <div style="display:flex;align-items:center;gap:16px">
                <div style="width:60px;height:60px;border-radius:50%;background:${teamColor};display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden">
                  ${avatarHtml}
                </div>
                <div>
                  <button onclick="document.getElementById('ep-modal-overlay').remove();setTimeout(myOpenPhotoPicker,80)"
                    style="padding:9px 18px;background:#fff;border:1.5px solid #C8102E;color:#C8102E;border-radius:7px;font-size:13px;font-weight:800;cursor:pointer;font-family:inherit">
                    📷 Change Photo
                  </button>
                  <div style="font-size:12px;color:#999;margin-top:6px">Your player avatar</div>
                </div>
              </div>
            </div>

            <!-- Section 2: Profile Info -->
            <div style="border:1px solid #e5e7eb;border-radius:10px;padding:18px">
              <div style="font-size:11px;font-weight:800;letter-spacing:1px;color:#aaa;margin-bottom:14px">PLAYER INFO</div>
              <div style="margin-bottom:12px">
                <label style="display:block;font-size:11px;font-weight:800;letter-spacing:0.5px;color:#555;margin-bottom:6px">POSITION</label>
                <select id="ep-pos" style="${selStyle}" ${focusBlur}>${posOpts}</select>
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">
                <div>
                  <label style="display:block;font-size:11px;font-weight:800;letter-spacing:0.5px;color:#555;margin-bottom:6px">BATS</label>
                  <select id="ep-bats" style="${selStyle}" ${focusBlur}>
                    <option value="">—</option>
                    <option value="R"${player?.bats==='R'?' selected':''}>Right</option>
                    <option value="L"${player?.bats==='L'?' selected':''}>Left</option>
                    <option value="S"${player?.bats==='S'?' selected':''}>Switch</option>
                  </select>
                </div>
                <div>
                  <label style="display:block;font-size:11px;font-weight:800;letter-spacing:0.5px;color:#555;margin-bottom:6px">THROWS</label>
                  <select id="ep-throws" style="${selStyle}" ${focusBlur}>
                    <option value="">—</option>
                    <option value="R"${player?.throws==='R'?' selected':''}>Right</option>
                    <option value="L"${player?.throws==='L'?' selected':''}>Left</option>
                  </select>
                </div>
              </div>
              <div id="ep-info-err" style="min-height:16px;font-size:13px;color:#dc2626;margin-bottom:8px"></div>
              <button onclick="submitEpInfo()"
                style="width:100%;padding:11px;background:#C8102E;color:#fff;border:none;border-radius:7px;font-size:14px;font-weight:800;cursor:pointer;font-family:inherit">
                Save Info
              </button>
            </div>

            <!-- Section 3: Change Password -->
            <div style="border:1px solid #e5e7eb;border-radius:10px;padding:18px">
              <div style="font-size:11px;font-weight:800;letter-spacing:1px;color:#aaa;margin-bottom:14px">CHANGE PASSWORD</div>
              <div style="margin-bottom:12px">
                <label style="display:block;font-size:11px;font-weight:800;letter-spacing:0.5px;color:#555;margin-bottom:6px">NEW PASSWORD</label>
                <input type="password" id="ep-pw-new" placeholder="Min 6 characters" autocomplete="new-password"
                  style="width:100%;padding:10px 12px;border:1.5px solid #ddd;border-radius:7px;font-size:14px;outline:none;box-sizing:border-box;font-family:inherit"
                  onfocus="this.style.borderColor='#C8102E'" onblur="this.style.borderColor='#ddd'">
              </div>
              <div style="margin-bottom:12px">
                <label style="display:block;font-size:11px;font-weight:800;letter-spacing:0.5px;color:#555;margin-bottom:6px">CONFIRM PASSWORD</label>
                <input type="password" id="ep-pw-confirm" placeholder="Repeat password" autocomplete="new-password"
                  style="width:100%;padding:10px 12px;border:1.5px solid #ddd;border-radius:7px;font-size:14px;outline:none;box-sizing:border-box;font-family:inherit"
                  onfocus="this.style.borderColor='#C8102E'" onblur="this.style.borderColor='#ddd'"
                  onkeydown="if(event.key==='Enter')submitEpPassword()">
              </div>
              <div id="ep-pw-err" style="min-height:16px;font-size:13px;color:#dc2626;margin-bottom:8px"></div>
              <button onclick="submitEpPassword()"
                style="width:100%;padding:11px;background:#111;color:#fff;border:none;border-radius:7px;font-size:14px;font-weight:800;cursor:pointer;font-family:inherit">
                Update Password
              </button>
            </div>

          </div><!-- /sections -->
        </div>
      </div>`;

    document.body.appendChild(el);
    document.getElementById('ep-modal-backdrop').addEventListener('click', e => {
      if (e.target.id === 'ep-modal-backdrop') el.remove();
    });
  };

  window.submitEpInfo = function() {
    const player = getCurrentPlayer();
    if (!player) return;
    const errEl    = document.getElementById('ep-info-err');
    const position = document.getElementById('ep-pos')?.value     || '';
    const bats     = document.getElementById('ep-bats')?.value    || '';
    const throws_  = document.getElementById('ep-throws')?.value  || '';

    const d   = loadData();
    const idx = d.players.findIndex(p => p.id === player.id);
    if (idx < 0) { if (errEl) errEl.textContent = 'Could not find your player record.'; return; }

    d.players[idx] = { ...d.players[idx], position, bats, throws: throws_ };
    saveData(d);

    document.getElementById('ep-modal-overlay')?.remove();
    if (typeof App !== 'undefined' && App.toast) App.toast('Player info saved! ✓', 'success');
  };

  window.submitEpPassword = async function() {
    const newPw   = document.getElementById('ep-pw-new')?.value    || '';
    const confirm = document.getElementById('ep-pw-confirm')?.value || '';
    const errEl   = document.getElementById('ep-pw-err');
    if (!newPw || newPw.length < 6) { errEl.textContent = 'Password must be at least 6 characters.'; return; }
    if (newPw !== confirm)          { errEl.textContent = 'Passwords do not match.'; return; }
    errEl.textContent = '';

    const ha = getHA();
    if (!ha) { errEl.textContent = 'Not signed in.'; return; }
    const { error } = await ha.updatePassword(newPw);
    if (error) { errEl.textContent = error.message || 'Could not update password.'; return; }

    // Fire-and-forget security notification email
    try {
      const profile = ha.getProfile();
      const email   = ha._session?.user?.email || '';
      const name    = profile?.display_name    || '';
      if (email) {
        const sb = _getClient();
        const { data: sd } = await sb.auth.getSession();
        const token = sd?.session?.access_token || (typeof SUPABASE_ANON_KEY !== 'undefined' ? SUPABASE_ANON_KEY : '');
        const fnUrl = (typeof SUPABASE_URL !== 'undefined' ? SUPABASE_URL : '') + '/functions/v1/notify-password-changed';
        fetch(fnUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ email, name }),
        }).catch(() => {});
      }
    } catch (_) {}

    document.getElementById('ep-modal-overlay')?.remove();
    if (typeof App !== 'undefined' && App.toast) App.toast('Password updated! ✓', 'success');
  };

  // Change Password — called from /my page "Change Password" link
  window.showPasswordChangeModal = function() {
    const existing = document.getElementById('mh-pw-overlay');
    if (existing) existing.remove();

    const el = document.createElement('div');
    el.id = 'mh-pw-overlay';
    el.innerHTML = `
      <div id="mh-pw-backdrop" style="position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:9000;display:flex;align-items:center;justify-content:center;padding:20px">
        <div style="background:#fff;border-radius:14px;padding:32px;width:100%;max-width:380px;box-shadow:0 20px 60px rgba(0,0,0,0.3)">
          <div style="font-size:11px;font-weight:800;letter-spacing:1px;color:#aaa;margin-bottom:8px">ACCOUNT SECURITY</div>
          <h2 style="font-size:20px;font-weight:900;margin:0 0 6px">Change Password</h2>
          <p style="font-size:13px;color:#666;margin:0 0 22px;line-height:1.5">Enter a new password for your Heroes account.</p>
          <div style="margin-bottom:14px">
            <label style="display:block;font-size:11px;font-weight:800;letter-spacing:0.5px;color:#555;margin-bottom:6px">NEW PASSWORD</label>
            <input type="password" id="mh-pw-new"
              style="width:100%;padding:11px 13px;border:1.5px solid #ddd;border-radius:7px;font-size:14px;outline:none;box-sizing:border-box;font-family:inherit"
              placeholder="Min 6 characters" autocomplete="new-password"
              onfocus="this.style.borderColor='#C8102E'" onblur="this.style.borderColor='#ddd'">
          </div>
          <div style="margin-bottom:8px">
            <label style="display:block;font-size:11px;font-weight:800;letter-spacing:0.5px;color:#555;margin-bottom:6px">CONFIRM PASSWORD</label>
            <input type="password" id="mh-pw-confirm"
              style="width:100%;padding:11px 13px;border:1.5px solid #ddd;border-radius:7px;font-size:14px;outline:none;box-sizing:border-box;font-family:inherit"
              placeholder="Repeat password" autocomplete="new-password"
              onfocus="this.style.borderColor='#C8102E'" onblur="this.style.borderColor='#ddd'"
              onkeydown="if(event.key==='Enter')submitPasswordChangeModal()">
          </div>
          <div id="mh-pw-err" style="min-height:18px;font-size:13px;color:#dc2626;margin-bottom:12px"></div>
          <button onclick="submitPasswordChangeModal()"
            style="width:100%;padding:13px;background:#C8102E;color:#fff;border:none;border-radius:7px;font-size:14px;font-weight:800;cursor:pointer;font-family:inherit;margin-bottom:8px">
            Update Password
          </button>
          <button onclick="document.getElementById('mh-pw-overlay').remove()"
            style="width:100%;padding:13px;background:transparent;color:#666;border:1.5px solid #ddd;border-radius:7px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit">
            Cancel
          </button>
        </div>
      </div>`;
    document.body.appendChild(el);
    document.getElementById('mh-pw-backdrop').addEventListener('click', e => {
      if (e.target.id === 'mh-pw-backdrop') el.remove();
    });
    setTimeout(() => document.getElementById('mh-pw-new')?.focus(), 60);
  };

  window.submitPasswordChangeModal = async function() {
    const newPw   = document.getElementById('mh-pw-new')?.value || '';
    const confirm = document.getElementById('mh-pw-confirm')?.value || '';
    const errEl   = document.getElementById('mh-pw-err');
    if (!newPw || newPw.length < 6) { errEl.textContent = 'Password must be at least 6 characters.'; return; }
    if (newPw !== confirm)          { errEl.textContent = 'Passwords do not match.'; return; }
    errEl.textContent = '';

    const ha = getHA();
    if (!ha) { errEl.textContent = 'Not signed in.'; return; }
    const { error } = await ha.updatePassword(newPw);
    if (error) { errEl.textContent = error.message || 'Could not update password.'; return; }

    document.getElementById('mh-pw-overlay')?.remove();
    if (typeof App !== 'undefined' && App.toast) App.toast('Password updated! ✓', 'success');
  };

  // Edit Profile — position, bats, throws
  window.showEditProfileModal = function() {
    const player = getCurrentPlayer();
    if (!player || player._loading || player._pendingApproval) return;

    const positions = ['P','C','1B','2B','3B','SS','OF','LF','CF','RF','DH','UT'];
    const posOpts = positions.map(p =>
      `<option value="${p}"${player.position===p?' selected':''}>${p}</option>`).join('');

    const sel = (id, cur, opts) =>
      `<select id="${id}" style="width:100%;padding:11px 13px;border:1.5px solid #ddd;border-radius:7px;
         font-size:14px;outline:none;box-sizing:border-box;font-family:inherit;background:#fff"
         onfocus="this.style.borderColor='#C8102E'" onblur="this.style.borderColor='#ddd'">${opts}</select>`;

    const existing = document.getElementById('mh-ep-overlay');
    if (existing) existing.remove();

    const el = document.createElement('div');
    el.id = 'mh-ep-overlay';
    el.innerHTML = `
      <div id="mh-ep-backdrop" style="position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:9000;display:flex;align-items:center;justify-content:center;padding:20px">
        <div style="background:#fff;border-radius:14px;padding:32px;width:100%;max-width:380px;box-shadow:0 20px 60px rgba(0,0,0,0.3)">
          <div style="font-size:11px;font-weight:800;letter-spacing:1px;color:#aaa;margin-bottom:8px">MY HEROES · PLAYER PORTAL</div>
          <h2 style="font-size:20px;font-weight:900;margin:0 0 6px">Edit My Profile</h2>
          <p style="font-size:13px;color:#666;margin:0 0 22px;line-height:1.5">Update your position and batting/throwing hand.</p>

          <div style="margin-bottom:14px">
            <label style="display:block;font-size:11px;font-weight:800;letter-spacing:0.5px;color:#555;margin-bottom:6px">POSITION</label>
            ${sel('mh-ep-pos', player.position, `<option value="">— Select —</option>${posOpts}`)}
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:8px">
            <div>
              <label style="display:block;font-size:11px;font-weight:800;letter-spacing:0.5px;color:#555;margin-bottom:6px">BATS</label>
              ${sel('mh-ep-bats', player.bats, `
                <option value="">—</option>
                <option value="R"${player.bats==='R'?' selected':''}>Right</option>
                <option value="L"${player.bats==='L'?' selected':''}>Left</option>
                <option value="S"${player.bats==='S'?' selected':''}>Switch</option>`)}
            </div>
            <div>
              <label style="display:block;font-size:11px;font-weight:800;letter-spacing:0.5px;color:#555;margin-bottom:6px">THROWS</label>
              ${sel('mh-ep-throws', player.throws, `
                <option value="">—</option>
                <option value="R"${player.throws==='R'?' selected':''}>Right</option>
                <option value="L"${player.throws==='L'?' selected':''}>Left</option>`)}
            </div>
          </div>

          <div id="mh-ep-err" style="min-height:18px;font-size:13px;color:#dc2626;margin-bottom:12px"></div>
          <button onclick="submitEditProfileModal()"
            style="width:100%;padding:13px;background:#C8102E;color:#fff;border:none;border-radius:7px;font-size:14px;font-weight:800;cursor:pointer;font-family:inherit;margin-bottom:8px">
            Save Changes
          </button>
          <button onclick="document.getElementById('mh-ep-overlay').remove()"
            style="width:100%;padding:13px;background:transparent;color:#666;border:1.5px solid #ddd;border-radius:7px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit">
            Cancel
          </button>
        </div>
      </div>`;
    document.body.appendChild(el);
    document.getElementById('mh-ep-backdrop').addEventListener('click', e => {
      if (e.target.id === 'mh-ep-backdrop') el.remove();
    });
  };

  window.submitEditProfileModal = function() {
    const player = getCurrentPlayer();
    if (!player) return;
    const errEl = document.getElementById('mh-ep-err');

    const position = document.getElementById('mh-ep-pos')?.value  || '';
    const bats     = document.getElementById('mh-ep-bats')?.value || '';
    const throws_  = document.getElementById('mh-ep-throws')?.value || '';

    const d   = loadData();
    const idx = d.players.findIndex(p => p.id === player.id);
    if (idx < 0) { if (errEl) errEl.textContent = 'Could not find your player record.'; return; }

    d.players[idx] = { ...d.players[idx], position, bats, throws: throws_ };
    saveData(d);

    document.getElementById('mh-ep-overlay')?.remove();
    if (typeof App !== 'undefined' && App.toast) App.toast('Profile updated! ✓', 'success');
  };

  // Open the shared photo picker for the current player
  window.myOpenPhotoPicker = function() {
    const player = getCurrentPlayer();
    if (!player || player._loading || player._pendingApproval) return;
    if (typeof showPhotoPickerModal !== 'function') {
      if (typeof App !== 'undefined' && App.toast)
        App.toast('Photo picker not available.', 'error');
      return;
    }
    const teamId = (player.teams || [])[0] || 'general';
    showPhotoPickerModal({
      currentUrl : player.photo || '',
      teamId,
      playerId   : player.id,
      onSave(url) { saveMyPhoto(player.id, url); },
    });
  };

  // Save the new photo URL and refresh the avatar in-place
  window.saveMyPhoto = function(playerId, url) {
    const d   = loadData();
    const idx = d.players.findIndex(p => p.id === playerId);
    if (idx >= 0) {
      d.players[idx].photo = url;
      saveData(d);
    }
    // Pre-compute initials for onerror fallback
    const p0  = (idx >= 0 ? d.players[idx] : null) || {};
    const fn0 = `${p0.firstName||''} ${p0.lastName||''}`.trim();
    const ini = fn0.split(/\s+/).slice(0,2).map(w=>w[0]?.toUpperCase()||'').join('') || '?';
    // Update avatar without full re-render
    const inner = document.getElementById('mh-avatar-inner');
    if (inner) {
      inner.innerHTML = `<img src="${url}"
        style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block"
        onerror="this.parentElement.innerHTML='<span class=mh-av-initials>${ini}</span>'">`;
    }
    if (typeof App !== 'undefined' && App.toast) App.toast('Photo updated! ✓', 'success');
  };

  // status is passed directly — no radio buttons, instant save
  window.saveMyAvailability = function(evId, playerId, status) {
    const d = loadData();
    const evIdx = d.events.findIndex(e => e.id === evId);
    if (evIdx < 0) return;
    if (!d.events[evIdx].availability) d.events[evIdx].availability = [];
    const aIdx = d.events[evIdx].availability.findIndex(a => a.playerId === playerId);
    if (aIdx >= 0) d.events[evIdx].availability[aIdx].status = status;
    else d.events[evIdx].availability.push({ playerId, status });
    saveData(d);

    // Inline UI update — highlight selected button, no page re-render
    const card = document.querySelector(`.mh-evc[data-ev-id="${evId}"]`);
    if (card) {
      card.querySelectorAll('.mh-av-btn').forEach(btn => {
        btn.classList.remove('mh-av-sel');
        if (btn.dataset.status === status) btn.classList.add('mh-av-sel');
      });
    }
    const labels = { yes: "You're IN! ✓", maybe: 'Marked as Maybe', no: "Marked as Can't Make It" };
    if (typeof App !== 'undefined' && App.toast) App.toast(labels[status] || 'Saved', 'success');
  };


  // ── GroupMe state ─────────────────────────────────────────────
  let _gmPollTimer = null;
  let _gmCurrentGroupId = null;
  let _gmLastMessageId = null;

  // ── GroupMe helpers ───────────────────────────────────────────
  const GM_API = 'https://api.groupme.com/v3';

  function _escHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  const _GM_COLORS = ['#C8102E','#1C6EA4','#16803A','#C2410C','#0F766E','#7C3AED','#B45309','#0369A1'];
  function _gmColor(id) {
    let h = 0;
    const s = String(id || '');
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0xffffffff;
    return _GM_COLORS[Math.abs(h) % _GM_COLORS.length];
  }

  async function gmFetch(path, token) {
    const sep = path.includes('?') ? '&' : '?';
    const res = await fetch(`${GM_API}${path}${sep}token=${encodeURIComponent(token)}`);
    if (res.status === 401) return { _unauthorized: true };
    if (!res.ok) return { _error: res.status };
    const json = await res.json();
    return json.response || json;
  }

  async function gmPost(path, token, body) {
    const res = await fetch(`${GM_API}${path}?token=${encodeURIComponent(token)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.status === 401) return { _unauthorized: true };
    if (!res.ok) return { _error: res.status };
    const json = await res.json();
    return json.response || json;
  }

  function getGroupMeToken() {
    return getHA()?.getProfile()?.groupme_token || '';
  }

  async function saveGroupMeToken(token) {
    const sb = _getClient();
    const profile = getHA()?.getProfile();
    if (!sb || !profile) return;
    await sb.from('profiles').update({ groupme_token: token }).eq('id', profile.id);
    profile.groupme_token = token;
  }

  async function clearGroupMeToken() {
    await saveGroupMeToken('');
  }

  // ── OAuth popup ───────────────────────────────────────────────
  window.connectGroupMe = function () {
    const clientId = (typeof GROUPME_CLIENT_ID !== 'undefined') ? GROUPME_CLIENT_ID : '';
    if (!clientId || clientId === 'YOUR_GROUPME_CLIENT_ID') {
      const errEl = document.getElementById('gm-connect-err');
      if (errEl) errEl.textContent = 'GroupMe Client ID not configured yet.';
      return;
    }
    const callbackUrl = window.location.origin + '/groupme-callback.html';
    const authUrl = `https://oauth.groupme.com/oauth/authorize?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(callbackUrl)}`;
    const popup = window.open(authUrl, 'gm_oauth', 'width=480,height=620,left=200,top=100');

    if (!popup || popup.closed) {
      const errEl = document.getElementById('gm-connect-err');
      if (errEl) errEl.textContent = 'Allow popups for this site to connect GroupMe.';
      return;
    }

    function onMsg(e) {
      if (e.origin !== window.location.origin) return;
      if (!e.data?.groupmeToken) return;
      window.removeEventListener('message', onMsg);
      clearInterval(closedCheck);
      saveGroupMeToken(e.data.groupmeToken).then(async () => {
        gmUpdateHomeBadge();
        // If the chat popup is open, replace the connect card with the full chat UI
        const popupPanel = document.getElementById('gm-popup-panel');
        if (popupPanel) await renderChatInto(popupPanel);
      });
    }
    window.addEventListener('message', onMsg);

    const closedCheck = setInterval(() => {
      if (popup.closed) {
        clearInterval(closedCheck);
        window.removeEventListener('message', onMsg);
        const errEl = document.getElementById('gm-connect-err');
        if (errEl && !errEl.textContent) errEl.textContent = 'Connection cancelled.';
      }
    }, 500);
  };

  // ── Tab switching ─────────────────────────────────────────────
  window.switchMyTab = function (tab) {
    if (_gmPollTimer) {
      clearInterval(_gmPollTimer);
      _gmPollTimer = null;
      _gmCurrentGroupId = null;
    }
    document.querySelectorAll('.mh-tab[id^="mh-tab-"]').forEach(b => b.classList.remove('mh-tab-on'));
    document.getElementById('mh-tab-' + tab)?.classList.add('mh-tab-on');
    ['avail'].forEach(p => {
      const el = document.getElementById('mh-panel-' + p);
      if (el) el.hidden = (p !== tab);
    });
  };

  // ── Chat message helpers ──────────────────────────────────────
  function gmRenderMsg(m) {
    const name    = _escHtml(m.name || 'Unknown');
    const text    = _escHtml(m.text || '');
    const initial = (m.name || '?')[0].toUpperCase();
    const color   = _gmColor(m.user_id || m.sender_id || '');
    const time    = m.created_at
      ? new Date(m.created_at * 1000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      : '';
    return `
      <div class="gm-msg">
        <div class="gm-msg-av" style="background:${color}">${initial}</div>
        <div class="gm-msg-body">
          <div class="gm-msg-meta">
            <span class="gm-msg-name">${name}</span>
            <span class="gm-msg-time">${time}</span>
          </div>
          <div class="gm-msg-text">${text}</div>
        </div>
      </div>`;
  }

  async function gmLoadMessages(groupId, token) {
    const msgsEl = document.getElementById('gm-msgs');
    if (!msgsEl) return;
    let data;
    try {
      data = await gmFetch(`/groups/${groupId}/messages?limit=20`, token);
    } catch (err) {
      msgsEl.innerHTML = '<div style="text-align:center;padding:40px;color:#dc2626;font-size:13px">Failed to load messages. Check your connection and try refreshing.</div>';
      return;
    }
    if (data._unauthorized) { await clearGroupMeToken(); return; }
    if (data._error) {
      msgsEl.innerHTML = `<div style="text-align:center;padding:40px;color:#dc2626;font-size:13px">Error loading messages (${data._error}). Try refreshing.</div>`;
      return;
    }
    const msgs = data.messages || [];
    if (msgs.length === 0) {
      msgsEl.innerHTML = '<div style="text-align:center;padding:40px;color:#888;font-size:13px">No messages yet. Be the first to say something!</div>';
      return;
    }
    _gmLastMessageId = msgs[0].id;
    msgsEl.innerHTML = [...msgs].reverse().map(gmRenderMsg).join('');
    msgsEl.scrollTop = msgsEl.scrollHeight;
  }

  window.gmRefreshMessages = async function (groupId) {
    const token = getGroupMeToken();
    if (!token) return;
    _gmLastMessageId = null;
    const msgsEl = document.getElementById('gm-msgs');
    if (msgsEl) msgsEl.innerHTML = '<div class="gm-loading"><div class="gm-spinner"></div></div>';
    await gmLoadMessages(groupId, token);
  };

  async function gmPollMessages(groupId, token) {
    if (!_gmLastMessageId) return;
    let data;
    try { data = await gmFetch(`/groups/${groupId}/messages?since_id=${_gmLastMessageId}`, token); }
    catch (_) { return; }
    if (data._unauthorized) { clearInterval(_gmPollTimer); await clearGroupMeToken(); return; }
    const msgs = data.messages || [];
    if (msgs.length === 0) return;
    _gmLastMessageId = msgs[0].id;
    const msgsEl = document.getElementById('gm-msgs');
    if (!msgsEl) return;
    const atBottom = msgsEl.scrollHeight - msgsEl.scrollTop <= msgsEl.clientHeight + 40;
    [...msgs].reverse().forEach(m => { msgsEl.innerHTML += gmRenderMsg(m); });
    if (atBottom) msgsEl.scrollTop = msgsEl.scrollHeight;
  }

  window.openGroupMeGroup = async function (groupId, groupName) {
    const token = getGroupMeToken();
    if (!token) return;
    if (_gmPollTimer) { clearInterval(_gmPollTimer); _gmPollTimer = null; }
    _gmCurrentGroupId = groupId;
    _gmLastMessageId  = null;

    document.querySelectorAll('.gm-grp-row').forEach(r => r.classList.remove('gm-grp-sel'));
    document.querySelector(`.gm-grp-row[data-gid="${groupId}"]`)?.classList.add('gm-grp-sel');

    const threadPane = document.getElementById('gm-thread-pane');
    if (!threadPane) return;

    // Replace everything except the always-present send box at the bottom
    const sendBox = threadPane.querySelector('.gm-send-box');
    threadPane.innerHTML = `
      <div class="gm-thread-head">
        <button class="gm-back-btn" onclick="gmBackToGroups()">← Groups</button>
        <div class="gm-thread-title">${_escHtml(groupName)}</div>
        <button class="gm-refresh-btn" onclick="gmRefreshMessages('${groupId}')" title="Refresh messages">↻</button>
      </div>
      <div class="gm-msgs" id="gm-msgs"><div class="gm-loading"><div class="gm-spinner"></div></div></div>`;
    // Re-attach or create the send box
    if (sendBox) {
      const inp = sendBox.querySelector('.gm-send-input');
      const btn = sendBox.querySelector('.gm-send-btn');
      if (inp) { inp.id = 'gm-send-input'; inp.placeholder = 'Send a message…'; inp.disabled = false; inp.style.opacity = ''; inp.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); gmSendMessage(groupId); } }; }
      if (btn) { btn.disabled = false; btn.style.opacity = ''; btn.style.cursor = ''; btn.onclick = () => gmSendMessage(groupId); }
      threadPane.appendChild(sendBox);
    } else {
      const sb = document.createElement('div');
      sb.className = 'gm-send-box';
      sb.innerHTML = `<textarea class="gm-send-input" id="gm-send-input" placeholder="Send a message…" rows="1"></textarea><button class="gm-send-btn">Send</button>`;
      sb.querySelector('.gm-send-input').onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); gmSendMessage(groupId); } };
      sb.querySelector('.gm-send-btn').onclick = () => gmSendMessage(groupId);
      threadPane.appendChild(sb);
    }

    document.getElementById('gm-groups-pane')?.classList.add('gm-mobile-hidden');
    threadPane.classList.add('gm-mobile-visible');

    await gmLoadMessages(groupId, token);

    _gmPollTimer = setInterval(async () => {
      if (_gmCurrentGroupId !== groupId) return;
      const t = getGroupMeToken();
      if (t) await gmPollMessages(groupId, t);
    }, 30000);
  };

  window.gmSendMessage = async function (groupId) {
    const input = document.getElementById('gm-send-input');
    const token = getGroupMeToken();
    if (!input || !token) return;
    const text = input.value.trim();
    if (!text) return;

    input.value    = '';
    input.disabled = true;

    const profile = getHA()?.getProfile();
    const name    = profile?.display_name || 'Me';
    const msgsEl  = document.getElementById('gm-msgs');
    if (msgsEl) {
      msgsEl.innerHTML += gmRenderMsg({ name, user_id: 'me', text, created_at: Math.floor(Date.now() / 1000) });
      msgsEl.scrollTop = msgsEl.scrollHeight;
    }

    const guid   = Math.random().toString(36).slice(2) + Date.now();
    const result = await gmPost(`/groups/${groupId}/messages`, token, {
      message: { source_guid: guid, text },
    });

    input.disabled = false;
    input.focus();

    if (result._unauthorized) {
      await clearGroupMeToken();
    } else if (result._error) {
      const errEl = document.createElement('div');
      errEl.className   = 'gm-send-err';
      errEl.textContent = "Couldn't send. Try again.";
      input.parentElement?.insertBefore(errEl, input);
      setTimeout(() => errEl.remove(), 3000);
    }
  };

  window.gmBackToGroups = function () {
    document.getElementById('gm-groups-pane')?.classList.remove('gm-mobile-hidden');
    document.getElementById('gm-thread-pane')?.classList.remove('gm-mobile-visible');
    if (_gmPollTimer) { clearInterval(_gmPollTimer); _gmPollTimer = null; }
    _gmCurrentGroupId = null;
  };

  function ensureGmChatCSS() {
    if (document.getElementById('gm-chat-css')) return;
    const s = document.createElement('style');
    s.id = 'gm-chat-css';
    s.textContent = `
@keyframes spin{to{transform:rotate(360deg)}}
.gm-connect-wrap{display:flex;align-items:center;justify-content:center;min-height:300px;padding:40px 20px}
.gm-connect-card{text-align:center;max-width:380px}
.gm-connect-icon{font-size:52px;margin-bottom:16px}
.gm-connect-title{font-size:22px;font-weight:900;color:#111;margin:0 0 10px}
.gm-connect-sub{font-size:14px;color:#666;line-height:1.6;margin:0 0 22px}
.gm-connect-btn{padding:13px 28px;background:#00AFF0;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:800;cursor:pointer;font-family:inherit}
.gm-connect-btn:hover{opacity:.88}
.gm-connect-err{font-size:13px;color:#dc2626;min-height:20px;margin-top:10px}
.gm-loading{display:flex;align-items:center;justify-content:center;gap:10px;padding:60px 20px;color:#888;font-size:14px}
.gm-spinner{width:22px;height:22px;border:2.5px solid #e5e7eb;border-top-color:#C8102E;border-radius:50%;animation:spin .7s linear infinite;flex-shrink:0}
.gm-empty{text-align:center;padding:60px 20px;color:#888;font-size:14px}
.gm-panes{display:flex;height:100%;overflow:hidden}
.gm-groups-pane{width:280px;flex-shrink:0;overflow-y:auto;background:#fff;transition:width 0.22s ease;overscroll-behavior:contain;-webkit-overflow-scrolling:touch}
.gm-groups-pane.gm-collapsed{width:0!important;overflow:hidden}
.gm-panes-toggle{width:18px;flex-shrink:0;border:none;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;background:#f9fafb;color:#bbb;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;font-size:13px;font-weight:900;font-family:inherit}
.gm-panes-toggle:hover{background:#f0f0f0;color:#555}
.gm-grp-row{cursor:pointer;border-bottom:1px solid #ebebeb;transition:background 0.1s;overflow:hidden}
.gm-grp-row:hover{background:#f5f5f5}
.gm-grp-row.gm-grp-sel{background:#fef2f4;box-shadow:inset 3px 0 0 #C8102E}
.gm-grp-header{width:100%;padding:5px 14px;font-size:13px;font-weight:900;color:rgba(255,255,255,0.92);letter-spacing:.03em}
.gm-grp-body{padding:10px 14px 12px}
.gm-grp-name{font-size:13px;font-weight:700;color:#111;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.gm-grp-meta{font-size:11px;color:#999;margin-top:2px}
.gm-grp-preview{font-size:12px;color:#777;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px}
.gm-thread-pane{flex:1;display:flex;flex-direction:column;min-width:0;min-height:0;background:#f8f8f8}
.gm-thread-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;flex:1;color:#888}
.gm-thread-head{display:flex;align-items:center;gap:12px;padding:12px 16px;background:#fff;border-bottom:1px solid #e5e7eb;flex-shrink:0}
.gm-back-btn{display:none;padding:6px 12px;background:transparent;border:1px solid #ddd;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;color:#555;font-family:inherit}
.gm-thread-title{font-size:14px;font-weight:800;color:#111;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.gm-msgs{flex:1;min-height:0;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px;overscroll-behavior:contain;-webkit-overflow-scrolling:touch}
.gm-msg{display:flex;gap:10px;align-items:flex-start}
.gm-msg-av{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:900;color:#fff;flex-shrink:0}
.gm-msg-body{min-width:0}
.gm-msg-meta{display:flex;align-items:baseline;gap:8px;margin-bottom:3px}
.gm-msg-name{font-size:13px;font-weight:800;color:#111}
.gm-msg-time{font-size:11px;color:#aaa}
.gm-msg-text{font-size:14px;color:#333;line-height:1.5;word-break:break-word}
.gm-send-box{display:flex;gap:8px;padding:12px 16px;background:#fff;border-top:1px solid #e5e7eb;flex-shrink:0;align-items:flex-end}
.gm-send-input{flex:1;padding:9px 12px;border:1.5px solid #ddd;border-radius:8px;font-size:14px;font-family:inherit;resize:none;outline:none;line-height:1.4}
.gm-send-input:focus{border-color:#C8102E}
.gm-send-btn{padding:9px 18px;background:#C8102E;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:800;cursor:pointer;font-family:inherit;white-space:nowrap}
.gm-send-btn:hover{opacity:.88}
.gm-send-err{font-size:12px;color:#dc2626;padding:4px 0}
.gm-refresh-btn{margin-left:auto;padding:5px 10px;background:transparent;border:1px solid #ddd;border-radius:6px;font-size:15px;cursor:pointer;color:#555;font-family:inherit;line-height:1}
.gm-refresh-btn:hover{background:#f3f4f6}
.gm-popup-box{background:#fff}
.gm-popup-hdr{display:flex;align-items:center;justify-content:space-between;padding:14px 20px;border-bottom:1px solid #e5e7eb;flex-shrink:0;background:#fff}
.gm-popup-title{font-size:16px;font-weight:800;color:#111}
.gm-hdr-btn{width:32px;height:32px;border-radius:50%;border:1.5px solid #e5e7eb;background:transparent;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#555;font-family:inherit;line-height:1}
.gm-hdr-btn:hover{background:#f3f4f6}
@media(max-width:768px){
  .gm-groups-pane{width:100%;border-right:none}
  .gm-groups-pane.gm-mobile-hidden{display:none}
  .gm-thread-pane{display:none;width:100%}
  .gm-thread-pane.gm-mobile-visible{display:flex}
  .gm-back-btn{display:block}
}
@media(prefers-color-scheme:dark){
  .gm-popup-box,.gm-popup-hdr{background:#1c1c1e}
  .gm-popup-hdr{border-bottom-color:#3a3a3c}
  .gm-popup-title{color:#f2f2f7}
  .gm-hdr-btn{border-color:#3a3a3c;color:#aeaeb2}
  .gm-hdr-btn:hover{background:#2c2c2e}
  .gm-groups-pane{background:#2c2c2e;border-right-color:#3a3a3c}
  .gm-panes-toggle{background:#1c1c1e;border-color:#3a3a3c;color:#6e6e73}
  .gm-panes-toggle:hover{background:#2c2c2e;color:#aeaeb2}
  .gm-grp-row{border-bottom-color:#3a3a3c}
  .gm-grp-row:hover{background:#3a3a3c}
  .gm-grp-row.gm-grp-sel{background:#3d1214;box-shadow:inset 3px 0 0 #C8102E}
  .gm-grp-name{color:#f2f2f7}
  .gm-grp-meta,.gm-grp-preview{color:#6e6e73}
  .gm-thread-pane{background:#141414}
  .gm-thread-empty{color:#6e6e73}
  .gm-thread-head{background:#1c1c1e;border-bottom-color:#3a3a3c}
  .gm-thread-title{color:#f2f2f7}
  .gm-back-btn{border-color:#3a3a3c;color:#aeaeb2}
  .gm-back-btn:hover{background:#2c2c2e}
  .gm-refresh-btn{border-color:#3a3a3c;color:#aeaeb2}
  .gm-refresh-btn:hover{background:#2c2c2e}
  .gm-msg-name{color:#f2f2f7}
  .gm-msg-time{color:#6e6e73}
  .gm-msg-text{color:#d1d1d6}
  .gm-send-box{background:#1c1c1e;border-top-color:#3a3a3c}
  .gm-send-input{background:#2c2c2e;border-color:#3a3a3c;color:#f2f2f7}
  .gm-send-input:focus{border-color:#C8102E}
  .gm-send-input::placeholder{color:#6e6e73}
}
#gm-popup-box.gm-dark,#gm-popup-box.gm-dark .gm-popup-hdr{background:#1c1c1e}
#gm-popup-box.gm-dark .gm-popup-hdr{border-bottom-color:#3a3a3c}
#gm-popup-box.gm-dark .gm-popup-title{color:#f2f2f7}
#gm-popup-box.gm-dark .gm-hdr-btn{border-color:#3a3a3c;color:#aeaeb2}
#gm-popup-box.gm-dark .gm-hdr-btn:hover{background:#2c2c2e}
#gm-popup-box.gm-dark .gm-groups-pane{background:#2c2c2e;border-right-color:#3a3a3c}
#gm-popup-box.gm-dark .gm-panes-toggle{background:#1c1c1e;border-color:#3a3a3c;color:#6e6e73}
#gm-popup-box.gm-dark .gm-panes-toggle:hover{background:#2c2c2e;color:#aeaeb2}
#gm-popup-box.gm-dark .gm-grp-row{border-bottom-color:#3a3a3c}
#gm-popup-box.gm-dark .gm-grp-row:hover{background:#3a3a3c}
#gm-popup-box.gm-dark .gm-grp-row.gm-grp-sel{background:#3d1214;box-shadow:inset 3px 0 0 #C8102E}
#gm-popup-box.gm-dark .gm-grp-name{color:#f2f2f7}
#gm-popup-box.gm-dark .gm-grp-meta,#gm-popup-box.gm-dark .gm-grp-preview{color:#6e6e73}
#gm-popup-box.gm-dark .gm-thread-pane{background:#141414}
#gm-popup-box.gm-dark .gm-thread-empty{color:#6e6e73}
#gm-popup-box.gm-dark .gm-thread-head{background:#1c1c1e;border-bottom-color:#3a3a3c}
#gm-popup-box.gm-dark .gm-thread-title{color:#f2f2f7}
#gm-popup-box.gm-dark .gm-back-btn{border-color:#3a3a3c;color:#aeaeb2}
#gm-popup-box.gm-dark .gm-refresh-btn{border-color:#3a3a3c;color:#aeaeb2}
#gm-popup-box.gm-dark .gm-msg-name{color:#f2f2f7}
#gm-popup-box.gm-dark .gm-msg-time{color:#6e6e73}
#gm-popup-box.gm-dark .gm-msg-text{color:#d1d1d6}
#gm-popup-box.gm-dark .gm-send-box{background:#1c1c1e;border-top-color:#3a3a3c}
#gm-popup-box.gm-dark .gm-send-input{background:#2c2c2e;border-color:#3a3a3c;color:#f2f2f7}
#gm-popup-box.gm-dark .gm-send-input:focus{border-color:#C8102E}
#gm-popup-box.gm-dark .gm-send-input::placeholder{color:#6e6e73}`;
    document.head.appendChild(s);
  }

  function _gmApplySavedDark() {
    try {
      const saved = localStorage.getItem('gm-dark');
      if (saved === null) return;
      const box = document.getElementById('gm-popup-box');
      const btn = document.getElementById('gm-dark-toggle');
      if (!box) return;
      const isDark = saved === '1';
      box.classList.toggle('gm-dark', isDark);
      if (btn) btn.textContent = isDark ? '☀️' : '🌙';
    } catch (_) {}
  }

  async function renderChatInto(panel) {
    ensureGmChatCSS();
    if (!panel) return;
    if (_gmPollTimer) { clearInterval(_gmPollTimer); _gmPollTimer = null; }
    _gmCurrentGroupId = null;
    _gmLastMessageId  = null;

    const token = getGroupMeToken();
    if (!token) {
      panel.innerHTML = `
        <div class="gm-connect-wrap">
          <div class="gm-connect-card">
            <div class="gm-connect-icon">💬</div>
            <h2 class="gm-connect-title">Connect GroupMe</h2>
            <p class="gm-connect-sub">Link your GroupMe account to read and send messages from your groups right here.</p>
            <button class="gm-connect-btn" onclick="connectGroupMe()">Connect GroupMe</button>
            <div id="gm-connect-err" class="gm-connect-err"></div>
          </div>
        </div>`;
      return;
    }

    panel.innerHTML = '<div class="gm-loading"><div class="gm-spinner"></div> Loading groups…</div>';

    const groups = await gmFetch('/groups?per_page=50&order=recent', token);

    if (groups._unauthorized) {
      await clearGroupMeToken();
      panel.innerHTML = `
        <div class="gm-connect-wrap">
          <div class="gm-connect-card">
            <div class="gm-connect-icon">🔒</div>
            <h2 class="gm-connect-title">Reconnect GroupMe</h2>
            <p class="gm-connect-sub">Your GroupMe connection expired — reconnect below.</p>
            <button class="gm-connect-btn" onclick="connectGroupMe()">Reconnect GroupMe</button>
            <div id="gm-connect-err" class="gm-connect-err"></div>
          </div>
        </div>`;
      return;
    }

    if (!Array.isArray(groups) || groups.length === 0) {
      panel.innerHTML = '<div class="gm-empty">You don\'t appear to be in any GroupMe groups yet.</div>';
      return;
    }

    panel.innerHTML = `
      <div class="gm-panes">
        <div class="gm-groups-pane" id="gm-groups-pane">
          ${groups.map(g => `
            <div class="gm-grp-row" data-gid="${g.id}" data-gname="${_escHtml(g.name || '')}"
                onclick="openGroupMeGroup(this.dataset.gid, this.dataset.gname)">
              <div class="gm-grp-header" style="background:${_gmColor(g.id)}">${(g.name || '?')[0].toUpperCase()}</div>
              <div class="gm-grp-body">
                <div class="gm-grp-name">${_escHtml(g.name || '')}</div>
                <div class="gm-grp-meta">${(g.members || []).length} members</div>
                ${g.messages?.preview?.preview
                  ? `<div class="gm-grp-preview">${_escHtml((g.messages.preview.preview || '').substring(0, 60))}</div>`
                  : ''}
              </div>
            </div>`).join('')}
        </div>
        <button class="gm-panes-toggle" id="gm-panes-toggle" onclick="gmToggleGroups()" title="Toggle groups list">‹</button>
        <div class="gm-thread-pane" id="gm-thread-pane">
          <div class="gm-thread-empty" id="gm-thread-empty">
            <div style="font-size:40px;margin-bottom:12px">💬</div>
            <div style="font-size:14px;color:#888">Select a group to start chatting</div>
          </div>
          <div class="gm-send-box">
            <textarea class="gm-send-input" id="gm-send-input" placeholder="Select a group to chat…" rows="1" disabled style="opacity:.5"></textarea>
            <button class="gm-send-btn" disabled style="opacity:.5;cursor:default">Send</button>
          </div>
        </div>
      </div>`;

    // Restore collapsed state from localStorage
    try {
      if (localStorage.getItem('gm_groups_collapsed') === '1') {
        document.getElementById('gm-groups-pane')?.classList.add('gm-collapsed');
        const t = document.getElementById('gm-panes-toggle');
        if (t) t.textContent = '›';
      }
    } catch (_) {}
  }

  window.gmToggleGroups = function () {
    const pane = document.getElementById('gm-groups-pane');
    const btn  = document.getElementById('gm-panes-toggle');
    if (!pane) return;
    const collapsed = pane.classList.toggle('gm-collapsed');
    if (btn) btn.textContent = collapsed ? '›' : '‹';
    try { localStorage.setItem('gm_groups_collapsed', collapsed ? '1' : '0'); } catch (_) {}
  };

  // ── Home page GroupMe chat popup ──────────────────────────────
  window.openGmChatPopup = async function () {
    const existing = document.getElementById('gm-popup-overlay');
    if (existing) { existing.remove(); return; }

    const overlay = document.createElement('div');
    overlay.id = 'gm-popup-overlay';
    overlay.innerHTML = `
      <div id="gm-popup-backdrop" style="position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9500;display:flex;flex-direction:column;padding:12px">
        <div id="gm-popup-box" class="gm-popup-box" style="border-radius:14px;flex:1;width:100%;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,0.35)">
          <div class="gm-popup-hdr">
            <div style="display:flex;align-items:center;gap:10px">
              <div style="width:30px;height:30px;background:#00AFF0;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:15px">💬</div>
              <span class="gm-popup-title">Team Chat</span>
            </div>
            <div style="display:flex;align-items:center;gap:8px">
              <button id="gm-dark-toggle" class="gm-hdr-btn" title="Toggle dark mode">🌙</button>
              <button class="gm-hdr-btn" onclick="closeGmChatPopup()">✕</button>
            </div>
          </div>
          <div id="gm-popup-panel" style="flex:1;min-height:0;overflow:hidden"></div>
        </div>
      </div>`;
    // Lock body scroll (iOS-safe: position:fixed + restore scroll on close)
    const savedScrollY = window.scrollY;
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${savedScrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    overlay._savedScrollY = savedScrollY;

    document.body.appendChild(overlay);
    _gmApplySavedDark();

    document.getElementById('gm-dark-toggle')?.addEventListener('click', () => {
      const box = document.getElementById('gm-popup-box');
      const btn = document.getElementById('gm-dark-toggle');
      if (!box) return;
      const isDark = box.classList.toggle('gm-dark');
      if (btn) btn.textContent = isDark ? '☀️' : '🌙';
      try { localStorage.setItem('gm-dark', isDark ? '1' : '0'); } catch (_) {}
    });

    document.getElementById('gm-popup-backdrop').addEventListener('click', e => {
      if (e.target.id === 'gm-popup-backdrop') closeGmChatPopup();
    });

    await renderChatInto(document.getElementById('gm-popup-panel'));
  };

  window.closeGmChatPopup = function () {
    if (_gmPollTimer) { clearInterval(_gmPollTimer); _gmPollTimer = null; _gmCurrentGroupId = null; }
    _gmLastMessageId = null;
    const overlay = document.getElementById('gm-popup-overlay');
    const savedScrollY = overlay?._savedScrollY || 0;
    overlay?.remove();
    // Restore body scroll — force reflow before scrollTo so iOS repaints the layout
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.getBoundingClientRect(); // flush layout
    window.scrollTo(0, savedScrollY);
    gmSaveSeenIds();
    gmUpdateHomeBadge();
  };

  function gmSaveSeenIds() {
    const token = getGroupMeToken();
    if (!token) return;
    const pane = document.getElementById('gm-groups-pane');
    if (!pane) return;
    try {
      const seen = JSON.parse(localStorage.getItem('gm_seen_groups') || '{}');
      pane.querySelectorAll('.gm-grp-row[data-gid]').forEach(row => {
        seen[row.dataset.gid] = row.dataset.lastMsgId || seen[row.dataset.gid] || '';
      });
      localStorage.setItem('gm_seen_groups', JSON.stringify(seen));
    } catch (_) {}
  }

  async function gmUpdateHomeBadge() {
    const btn   = document.getElementById('gm-home-chat-btn');
    const badge = document.getElementById('gm-home-badge');
    if (!btn) return;

    if (!document.getElementById('gm-global-css')) {
      const s = document.createElement('style');
      s.id = 'gm-global-css';
      s.textContent = [
        '.btn-gm-chat{background:#fff;border:2px solid #00AFF0;color:#00AFF0;font-weight:800;position:relative;cursor:pointer;font-family:inherit;font-size:inherit;border-radius:6px;padding:10px 22px;text-decoration:none;display:inline-flex;align-items:center;gap:6px}',
        '.btn-gm-chat:hover{background:#f0fbff}',
        '.gm-home-badge{background:#C8102E;color:#fff;border-radius:10px;min-width:18px;height:18px;font-size:11px;font-weight:800;display:inline-flex;align-items:center;justify-content:center;padding:0 5px;margin-left:4px;line-height:1}',
        '@media(max-width:600px){#gm-popup-backdrop{padding:0 !important}#gm-popup-box{border-radius:0 !important}}',
      ].join('');
      document.head.appendChild(s);
    }

    const profile = getHA()?.getProfile();
    if (!profile) { btn.style.display = 'none'; return; }

    btn.style.display = '';

    const token = getGroupMeToken();
    if (!token) {
      if (badge) badge.hidden = true;
      return;
    }

    let groups;
    try { groups = await gmFetch('/groups?per_page=50&order=recent', token); }
    catch (_) { return; }
    if (!Array.isArray(groups) || groups._unauthorized || groups._error) return;

    let seen;
    try { seen = JSON.parse(localStorage.getItem('gm_seen_groups') || '{}'); }
    catch (_) { seen = {}; }

    let unread = 0;
    groups.forEach(g => {
      const lastId = g.messages?.last_message_id || '';
      if (lastId && lastId !== seen[g.id]) unread++;
    });

    if (badge) {
      if (unread > 0) {
        badge.hidden = false;
        badge.textContent = unread > 9 ? '9+' : String(unread);
      } else {
        badge.hidden = true;
      }
    }
  }

  // ── Main render ─────────────────────────────────────────────

  function renderMyHeroes() {
    const data = loadData();
    const player = getCurrentPlayer();

    // Auth module present but init() not yet resolved — show spinner and poll
    if (player?._loading) {
      App.render(`
        <div class="mh-locked">
          <div class="mh-locked-inner" style="text-align:center">
            <div style="font-size:36px;margin-bottom:12px;animation:spin 1s linear infinite;display:inline-block">⚙</div>
            <p style="color:#aaa;font-size:13px;letter-spacing:0.5px">LOADING…</p>
          </div>
        </div>
        <style>.mh-locked{display:flex;align-items:center;justify-content:center;min-height:60vh}
        @keyframes spin{to{transform:rotate(360deg)}}</style>`);
      // Poll until HeroesAuth finishes init, then re-render
      let tries = 0;
      const poll = setInterval(() => {
        tries++;
        if (getHA()?._initialized || tries > 40) {
          clearInterval(poll);
          if (typeof Router !== 'undefined') Router.dispatch();
        }
      }, 100);
      return;
    }

    // Not signed in
    if (!player) {
      App.render(`
        <div class="mh-locked">
          <div class="mh-locked-inner">
            <div class="mh-locked-eye">MY HEROES · PLAYER PORTAL</div>
            <h2 class="mh-locked-title">Sign In to Continue</h2>
            <p class="mh-locked-sub">Set your event availability, see your stats, and read team-only updates.</p>
            <div class="mh-locked-btns">
              <button class="mh-btn-red" onclick="HeroesAuth.showLoginModal()">PLAYER SIGN IN</button>
              <a class="mh-btn-ghost" data-route="/">← BACK TO HOME</a>
            </div>
          </div>
        </div>${MH_CSS}`);
      return;
    }

    // Pending approval
    if (player._pendingApproval) {
      const profile = getHA()?.getProfile();
      const name = profile?.display_name || profile?.email?.split('@')[0] || 'there';
      App.render(`
        <div class="mh-locked">
          <div class="mh-locked-inner" style="text-align:center">
            <div style="font-size:48px;margin-bottom:16px">⏳</div>
            <div class="mh-locked-eye">MY HEROES · PLAYER PORTAL</div>
            <h2 class="mh-locked-title">Account Pending Approval</h2>
            <p class="mh-locked-sub">Hey ${name}! Your account is waiting for a team admin to review it. You'll have full access within 24 hours.</p>
            <div class="mh-locked-btns">
              <button class="mh-btn-ghost" onclick="HeroesAuth.signOut()">Sign Out</button>
            </div>
          </div>
        </div>${MH_CSS}`);
      return;
    }

    // Resolve role
    const supaProfile = player._supabaseProfile || getHA()?.getProfile() || {};
    const role = supaProfile.role || player.role || 'player';
    const isStaff = ['admin', 'manager', 'coach'].includes(role);
    // Find ALL upcoming events — endDate checked so multi-day events don't vanish mid-run
    // No team filter: every player can see and respond to every upcoming event
    const today = new Date().toISOString().slice(0, 10);
    const upcomingAll = (data.events || [])
      .filter(e => {
        const end   = e.endDate   || e.startDate || e.date || '';
        const start = e.startDate || e.date || '';
        return end >= today || start >= today;
      })
      .sort((a, b) =>
        (a.startDate || a.date || '').localeCompare(b.startDate || b.date || ''));

    // Player identity for hero banner (always shown for logged-in approved users)
    const fullName    = `${player.firstName||''} ${player.lastName||''}`.trim();
    const initials    = fullName.split(/\s+/).slice(0,2).map(w=>w[0]?.toUpperCase()||'').join('') || '?';
    const playerTeams = (player.teams||[]).map(tid=>data.teams.find(t=>t.id===tid)).filter(Boolean);
    const teamNamesStr = playerTeams.map(t=>t.shortName||t.name).join(' · ') || '';
    const teamColor    = playerTeams[0]?.color || '#C8102E';

    // Next event for hero banner countdown (null when no events)
    const nextEv    = upcomingAll[0] || null;
    const nextStart = nextEv ? (nextEv.startDate || nextEv.date || '') : '';
    const nextDays  = nextEv ? daysUntil(nextStart) : null;

    // Build one card per upcoming event
    const evCards = upcomingAll.map(ev => {
      const start   = ev.startDate || ev.date || '';
      const end     = ev.endDate || start;
      const d1      = start ? new Date(start + 'T12:00:00') : null;
      const d2      = end && end !== start ? new Date(end + 'T12:00:00') : null;
      const evDays  = daysUntil(start);
      const evTeams = (ev.teams || []).map(tid => data.teams.find(t => t.id === tid)).filter(Boolean);
      const myStatus = ((ev.availability || []).find(a => a.playerId === player.id) || {}).status || null;

      // Attendance counts (all players)
      const avail = ev.availability || [];
      const inCnt    = avail.filter(a => a.status === 'yes').length;
      const maybeCnt = avail.filter(a => a.status === 'maybe').length;
      const outCnt   = avail.filter(a => a.status === 'no').length;

      const monthStr = d1 ? d1.toLocaleDateString('en-US', {month:'short'}).toUpperCase() : '';
      const locStr   = [ev.venue, ev.location].filter(Boolean).join(', ');
      const teamStr  = evTeams.map(t => t.shortName || t.name).join(' · ');

      const daysLbl  = evDays === null ? '' :
                       evDays === 0    ? '🟢 TODAY' :
                       evDays < 0      ? '⚡ IN PROGRESS' :
                       evDays === 1    ? '🔴 TOMORROW' :
                       evDays <= 7     ? `🔴 ${evDays} days away` :
                                         `${evDays} days away`;

      const rsvpNote = ev.rsvpDeadline
        ? `<div class="mh-evc-rsvp">RSVP by ${new Date(ev.rsvpDeadline + 'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'})}</div>`
        : '';

      return `
        <div class="mh-evc" data-ev-id="${ev.id}">
          <div class="mh-evc-left">
            <div class="mh-evc-date">
              <span class="mh-evc-month">${monthStr}</span>
              ${d2
                ? `<span class="mh-evc-range">${d1.getDate()}–${d2.getDate()}</span>`
                : `<span class="mh-evc-day">${d1 ? d1.getDate() : ''}</span>`}
              <span class="mh-evc-year">${d1 ? d1.getFullYear() : ''}</span>
            </div>
            <div class="mh-evc-info">
              <div class="mh-evc-name">${ev.name}</div>
              <div class="mh-evc-meta">${locStr ? '📍 ' + locStr : ''}${teamStr ? ' &nbsp;·&nbsp; ' + teamStr : ''}</div>
              <div class="mh-evc-days${evDays !== null && evDays <= 7 && evDays >= 0 ? ' mh-evc-soon' : ''}">${daysLbl}</div>
              ${rsvpNote}
            </div>
          </div>
          <div class="mh-evc-right">
            <div class="mh-evc-counts">${inCnt} IN · ${maybeCnt} MAYBE · ${outCnt} OUT</div>
            <div class="mh-evc-avail">
              <button class="mh-av-btn mh-av-in${myStatus==='yes'?' mh-av-sel':''}"
                      data-status="yes"
                      onclick="saveMyAvailability('${ev.id}','${player.id}','yes')">✓ I'M IN</button>
              <button class="mh-av-btn mh-av-maybe${myStatus==='maybe'?' mh-av-sel':''}"
                      data-status="maybe"
                      onclick="saveMyAvailability('${ev.id}','${player.id}','maybe')">? MAYBE</button>
              <button class="mh-av-btn mh-av-out${myStatus==='no'?' mh-av-sel':''}"
                      data-status="no"
                      onclick="saveMyAvailability('${ev.id}','${player.id}','no')">✗ CAN'T GO</button>
            </div>
          </div>
        </div>`;
    }).join('');

    App.render(`
      <div class="mh-wrap">

        <!-- HERO BANNER -->
        <div class="mh-hero">
          <div class="mh-hero-in">
            <div class="mh-hero-left">

              <!-- Player identity -->
              <div class="mh-player-id">
                <button class="mh-av-wrap" onclick="myOpenPhotoPicker()" title="Change photo" aria-label="Change player photo">
                  <div id="mh-avatar-inner" class="mh-avatar" style="background:${teamColor}">
                    ${player.photo
                      ? `<img src="${player.photo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block"
                              onerror="this.parentElement.innerHTML='<span class=mh-av-initials>${initials}</span>'">`
                      : `<span class="mh-av-initials">${initials}</span>`}
                  </div>
                  <div class="mh-av-cam" aria-hidden="true">📷</div>
                </button>
                <div class="mh-player-meta">
                  <div class="mh-breadcrumb">MY HEROES · PLAYER PORTAL</div>
                  <div class="mh-player-name">${fullName || 'Player'}</div>
                  ${teamNamesStr ? `<div class="mh-player-teams">${teamNamesStr}</div>` : ''}
                </div>
              </div>

              ${upcomingAll.length ? `
              <h1 class="mh-ev-name">UPCOMING EVENTS</h1>
              <div class="mh-ev-meta">${upcomingAll.length} event${upcomingAll.length !== 1 ? 's' : ''} scheduled · Next: ${nextEv ? nextEv.name : ''}</div>` : ''}
            </div>
            ${nextDays !== null && nextDays >= 0 ? `
            <div class="mh-cdown">
              <div class="mh-cdown-n">${nextDays}</div>
              <div class="mh-cdown-l">DAYS TO<br>NEXT EVENT</div>
            </div>` : ''}
          </div>
        </div>

        <!-- TAB BAR -->
        <div class="mh-tabs">
          <div class="mh-tabs-in">
            <button class="mh-tab mh-tab-on" id="mh-tab-avail" onclick="switchMyTab('avail')">AVAILABILITY</button>
            <button class="mh-tab" data-route="/events">EVENTS</button>
            ${isStaff ? '<a href="admin.html" class="mh-adm-lnk">⚙ Admin Panel</a>' : ''}
          </div>
        </div>

        <!-- AVAILABILITY PANEL -->
        <div id="mh-panel-avail">
          ${upcomingAll.length ? `
          <div class="mh-ev-cards">
            <p class="mh-ev-hint">Tap your availability for each event — saves instantly.</p>
            ${evCards}
          </div>` : `
          <div style="text-align:center;padding:60px 20px;color:#888">
            <div style="font-size:40px;margin-bottom:12px">📅</div>
            <div style="font-size:15px;font-weight:700;color:#555;margin-bottom:6px">No Upcoming Events</div>
            <div style="font-size:13px">No events are scheduled yet. Check back soon.</div>
            ${isStaff ? '<div style="margin-top:20px"><a href="admin.html" style="display:inline-block;padding:10px 22px;background:#C8102E;color:#fff;border-radius:6px;font-size:13px;font-weight:800;text-decoration:none">⚙ Admin Panel</a></div>' : ''}
          </div>`}
        </div>

      </div>${MH_CSS}`);
  }

  // ── All CSS for the /my portal ──────────────────────────────
  const MH_CSS = `<style>
    .mh-wrap { min-height:100vh; background:var(--hs-bg,#F5F2EB); }

    /* Locked / wall states */
    .mh-locked { display:flex; align-items:center; justify-content:center; min-height:60vh; padding:40px 20px; }
    .mh-locked-inner { text-align:center; max-width:480px; }
    .mh-locked-eye { font-size:11px; font-weight:800; letter-spacing:1.2px; color:#aaa; margin-bottom:12px; }
    .mh-locked-title { font-size:clamp(26px,4vw,38px); font-weight:900; color:#111; margin:0 0 12px; line-height:1.1; }
    .mh-locked-sub { font-size:14px; color:#666; line-height:1.6; margin:0 0 24px; }
    .mh-locked-btns { display:flex; gap:12px; justify-content:center; flex-wrap:wrap; }
    .mh-btn-red { padding:12px 28px; background:#C8102E; color:#fff; border:none; border-radius:6px; font-size:13px; font-weight:800; letter-spacing:0.5px; cursor:pointer; font-family:inherit; text-decoration:none; display:inline-block; }
    .mh-btn-ghost { padding:12px 28px; background:transparent; color:#555; border:1.5px solid #ccc; border-radius:6px; font-size:13px; font-weight:700; cursor:pointer; font-family:inherit; text-decoration:none; display:inline-block; }

    /* Hero Banner */
    .mh-hero { background:#0d1533; padding:36px 40px 32px; }
    .mh-hero-in { max-width:1020px; margin:0 auto; display:flex; align-items:flex-start; justify-content:space-between; gap:20px; }
    .mh-hero-left { flex:1; min-width:0; }
    .mh-breadcrumb { font-size:11px; font-weight:700; letter-spacing:1px; color:rgba(255,255,255,0.35); margin-bottom:4px; }
    .mh-teamtag { font-size:12px; font-weight:800; letter-spacing:0.5px; color:#C8102E; margin-bottom:8px; }
    .mh-ev-name { font-size:clamp(24px,4vw,46px); font-weight:900; color:#fff; margin:0 0 10px; line-height:1.0; letter-spacing:-0.5px; }
    .mh-ev-meta { font-size:13px; font-weight:600; color:rgba(255,255,255,0.5); letter-spacing:0.3px; }
    .mh-cdown { text-align:right; flex-shrink:0; }
    .mh-cdown-n { font-size:clamp(56px,9vw,88px); font-weight:900; color:#C8102E; line-height:1; }
    .mh-cdown-l { font-size:11px; font-weight:700; letter-spacing:1px; color:rgba(255,255,255,0.35); margin-top:4px; }
    .mh-adm-pill { display:inline-flex; align-items:center; padding:8px 16px; background:rgba(255,255,255,0.1); color:rgba(255,255,255,0.7); border-radius:20px; font-size:12px; font-weight:700; text-decoration:none; white-space:nowrap; align-self:flex-start; margin-top:8px; }
    .mh-adm-pill:hover { background:rgba(255,255,255,0.2); color:#fff; }
    .mh-hero-actions { display:flex; gap:8px; flex-wrap:wrap; margin-top:12px; }
    .mh-chpw-btn { padding:7px 14px; background:rgba(255,255,255,0.08); color:rgba(255,255,255,0.5); border:1px solid rgba(255,255,255,0.15); border-radius:20px; font-size:11px; font-weight:700; letter-spacing:0.3px; cursor:pointer; font-family:inherit; transition:all 0.15s; }
    .mh-chpw-btn:hover { background:rgba(255,255,255,0.15); color:rgba(255,255,255,0.85); }

    /* Player identity in hero */
    .mh-player-id { display:flex; align-items:center; gap:14px; margin-bottom:18px; }
    .mh-av-wrap { position:relative; cursor:pointer; border:none; background:none; padding:0; border-radius:50%; flex-shrink:0; }
    .mh-avatar { width:68px; height:68px; border-radius:50%; overflow:hidden; border:3px solid rgba(255,255,255,0.18); display:flex; align-items:center; justify-content:center; transition:border-color 0.15s; }
    .mh-av-wrap:hover .mh-avatar { border-color:rgba(255,255,255,0.55); }
    .mh-av-initials { font-size:22px; font-weight:900; color:#fff; user-select:none; }
    .mh-av-cam { position:absolute; bottom:-1px; right:-1px; width:22px; height:22px; background:#C8102E; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:10px; border:2px solid #0d1533; pointer-events:none; }
    .mh-player-meta { min-width:0; }
    .mh-player-name { font-size:clamp(18px,3vw,26px); font-weight:900; color:#fff; line-height:1.1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .mh-player-teams { font-size:11px; font-weight:700; letter-spacing:0.5px; color:rgba(255,255,255,0.38); margin-top:3px; }

    /* Event selector dropdown */
    .mh-selector { background:#0a1128; border-bottom:1px solid rgba(255,255,255,0.08); padding:0 40px; }
    .mh-sel-input { max-width:1020px; display:block; margin:0 auto; width:100%; padding:10px 0; background:transparent; border:none; color:rgba(255,255,255,0.65); font-size:13px; font-weight:700; font-family:inherit; cursor:pointer; outline:none; }

    /* Tab bar */
    .mh-tabs { background:#fff; border-bottom:1px solid #e5e7eb; }
    .mh-tabs-in { max-width:1020px; margin:0 auto; padding:0 40px; display:flex; align-items:center; }
    .mh-tab { padding:14px 18px; font-size:12px; font-weight:800; letter-spacing:0.5px; color:#aaa; background:transparent; border:none; cursor:pointer; font-family:inherit; border-bottom:3px solid transparent; margin-bottom:-1px; transition:color 0.15s; white-space:nowrap; }
    .mh-tab:hover { color:#333; }
    .mh-tab-on { color:#C8102E !important; border-bottom-color:#C8102E !important; }
    .mh-adm-lnk { margin-left:auto; font-size:12px; font-weight:700; color:#C8102E; text-decoration:none; padding:14px 0; white-space:nowrap; }
    .mh-adm-lnk:hover { text-decoration:underline; }

    /* Content grid */
    .mh-grid { max-width:1020px; margin:0 auto; padding:28px 40px 60px; display:grid; grid-template-columns:1fr 300px; gap:24px; align-items:start; }

    /* Roster table */
    .mh-roster { background:#fff; border:1px solid #e5e7eb; border-radius:8px; overflow:hidden; }
    .mh-rh { background:#111; color:#fff; padding:12px 20px; display:flex; align-items:center; justify-content:space-between; }
    .mh-rh-title { font-size:12px; font-weight:800; letter-spacing:0.5px; }
    .mh-rh-counts { font-size:11px; color:rgba(255,255,255,0.5); font-weight:600; }
    .mh-tbl { width:100%; border-collapse:collapse; }
    .mh-tbl thead tr { background:#f9fafb; border-bottom:1px solid #e5e7eb; }
    .mh-tbl th { padding:8px 16px; font-size:10px; font-weight:800; letter-spacing:0.5px; color:#aaa; text-align:left; }
    .mh-tbl td { padding:11px 16px; border-bottom:1px solid #f3f4f6; font-size:14px; }
    .mh-tbl tbody tr:last-child td { border-bottom:none; }
    .mh-me-row { background:#fffbeb; }
    .mh-c-num { font-weight:700; color:#333; width:44px; }
    .mh-c-name { font-weight:600; }
    .mh-c-pos { color:#aaa; font-size:12px; width:56px; }
    .mh-c-st { width:86px; }
    .mh-you { font-size:9px; font-weight:800; letter-spacing:0.5px; background:#fef3c7; color:#92400e; padding:1px 5px; border-radius:3px; vertical-align:middle; margin-left:4px; }
    .mh-bdg { display:inline-block; padding:3px 10px; border-radius:20px; font-size:11px; font-weight:800; }
    .mh-in    { background:#dcfce7; color:#15803d; }
    .mh-maybe { background:#fef3c7; color:#92400e; }
    .mh-out   { background:#fee2e2; color:#991b1b; }
    .mh-tbd   { background:#f3f4f6; color:#9ca3af; }

    /* Response widget */
    .mh-resp { border-radius:8px; overflow:hidden; border:1px solid #e5e7eb; }
    .mh-resp-hd { background:#A50E2D; color:#fff; padding:12px 20px; font-size:11px; font-weight:800; letter-spacing:1.2px; }
    .mh-resp-body { background:#fff; padding:20px; }
    .mh-resp-title { font-size:22px; font-weight:900; color:#111; margin:0 0 6px; letter-spacing:-0.3px; }
    .mh-resp-sub { font-size:13px; color:#888; margin:0 0 18px; line-height:1.5; }
    .mh-opts { display:flex; flex-direction:column; gap:8px; margin-bottom:12px; }
    .mh-opt { display:flex; align-items:center; gap:12px; padding:13px 16px; border:1.5px solid #e5e7eb; border-radius:6px; cursor:pointer; font-size:13px; font-weight:800; letter-spacing:0.4px; color:#333; transition:all 0.15s; user-select:none; }
    .mh-opt input[type="radio"] { width:18px; height:18px; cursor:pointer; accent-color:#22c55e; flex-shrink:0; }
    .mh-opt:hover { border-color:#ccc; background:#fafafa; }
    .mh-sel-in    { background:#22c55e !important; border-color:#22c55e !important; color:#fff !important; }
    .mh-sel-maybe { background:#f59e0b !important; border-color:#f59e0b !important; color:#fff !important; }
    .mh-sel-out   { background:#e5e7eb !important; border-color:#ccc !important; color:#333 !important; }
    .mh-save { display:block; width:100%; padding:14px; background:#111; color:#fff; border:none; border-radius:6px; font-size:13px; font-weight:800; letter-spacing:0.5px; cursor:pointer; font-family:inherit; transition:opacity 0.15s; }
    .mh-save:hover { opacity:0.85; }
    .mh-save:disabled { opacity:0.5; cursor:not-allowed; }
    .mh-note { margin-top:20px; padding-top:16px; border-top:1px solid #f3f4f6; }
    .mh-note-lbl { font-size:10px; font-weight:800; letter-spacing:1px; color:#aaa; margin-bottom:8px; }
    .mh-note-txt { font-size:13px; color:#555; line-height:1.6; font-style:italic; }

    /* ── Availability event cards ───────────────────────────── */
    .mh-ev-cards { max-width:1020px; margin:0 auto; padding:28px 40px 60px; }
    .mh-ev-hint { font-size:12px; color:#aaa; font-weight:600; letter-spacing:0.3px; margin:0 0 18px; }
    .mh-evc {
      background:#fff; border:1px solid #e5e7eb; border-radius:10px;
      padding:20px 24px; margin-bottom:12px;
      display:flex; align-items:center; gap:24px;
      transition:box-shadow 0.15s;
    }
    .mh-evc:hover { box-shadow:0 4px 20px rgba(0,0,0,0.07); }
    .mh-evc-left { display:flex; align-items:center; gap:16px; flex:1; min-width:0; }
    .mh-evc-date {
      background:#f9fafb; border-radius:8px; padding:10px 12px;
      text-align:center; min-width:58px; flex-shrink:0; border:1px solid #f0f0f0;
    }
    .mh-evc-month { display:block; font-size:10px; font-weight:800; letter-spacing:1px; color:#C8102E; text-transform:uppercase; margin-bottom:2px; }
    .mh-evc-day   { display:block; font-size:26px; font-weight:900; color:#111; line-height:1; }
    .mh-evc-range { display:block; font-size:18px; font-weight:900; color:#111; line-height:1.1; }
    .mh-evc-year  { display:block; font-size:10px; color:#bbb; font-weight:600; margin-top:2px; }
    .mh-evc-info  { flex:1; min-width:0; }
    .mh-evc-name  { font-size:17px; font-weight:800; color:#111; margin-bottom:4px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .mh-evc-meta  { font-size:12px; color:#888; margin-bottom:4px; }
    .mh-evc-days  { font-size:11px; font-weight:700; color:#aaa; }
    .mh-evc-days.mh-evc-soon { color:#C8102E; }
    .mh-evc-rsvp  { font-size:11px; font-weight:700; color:#92400e; background:#fffbeb; display:inline-block; padding:2px 7px; border-radius:4px; margin-top:4px; }
    .mh-evc-right { display:flex; flex-direction:column; align-items:flex-end; gap:8px; flex-shrink:0; }
    .mh-evc-counts { font-size:11px; color:#aaa; font-weight:600; white-space:nowrap; }
    .mh-evc-avail { display:flex; gap:6px; }
    .mh-av-btn {
      padding:9px 14px; border:2px solid #e5e7eb; border-radius:6px;
      background:#fff; font-size:11px; font-weight:800; letter-spacing:0.4px;
      color:#888; cursor:pointer; font-family:inherit; transition:all 0.15s; white-space:nowrap;
    }
    .mh-av-btn:hover { border-color:#ccc; background:#f9fafb; color:#333; }
    .mh-av-in.mh-av-sel    { background:#22c55e; border-color:#22c55e; color:#fff; }
    .mh-av-maybe.mh-av-sel { background:#f59e0b; border-color:#f59e0b; color:#fff; }
    .mh-av-out.mh-av-sel   { background:#6b7280; border-color:#6b7280; color:#fff; }

    /* ── GroupMe Chat ───────────────────────────────────────────── */
    .gm-connect-wrap { display:flex; align-items:center; justify-content:center; min-height:300px; padding:40px 20px; }
    .gm-connect-card { text-align:center; max-width:380px; }
    .gm-connect-icon { font-size:52px; margin-bottom:16px; }
    .gm-connect-title { font-size:22px; font-weight:900; color:#111; margin:0 0 10px; }
    .gm-connect-sub { font-size:14px; color:#666; line-height:1.6; margin:0 0 22px; }
    .gm-connect-btn { padding:13px 28px; background:#00AFF0; color:#fff; border:none; border-radius:8px; font-size:14px; font-weight:800; cursor:pointer; font-family:inherit; }
    .gm-connect-btn:hover { opacity:.88; }
    .gm-connect-err { font-size:13px; color:#dc2626; min-height:20px; margin-top:10px; }

    .gm-loading { display:flex; align-items:center; justify-content:center; gap:10px; padding:60px 20px; color:#888; font-size:14px; }
    .gm-spinner { width:22px; height:22px; border:2.5px solid #e5e7eb; border-top-color:#C8102E; border-radius:50%; animation:spin .7s linear infinite; flex-shrink:0; }
    .gm-empty { text-align:center; padding:60px 20px; color:#888; font-size:14px; }

    .gm-panes { display:flex; height:calc(100vh - 280px); min-height:400px; overflow:hidden; }

    .gm-groups-pane { width:280px; flex-shrink:0; overflow-y:auto; background:#fff; transition:width 0.22s ease; }
    .gm-groups-pane.gm-collapsed { width:0 !important; overflow:hidden; }
    .gm-panes-toggle { width:18px; flex-shrink:0; border:none; border-left:1px solid #e5e7eb; border-right:1px solid #e5e7eb; background:#f9fafb; color:#bbb; cursor:pointer; display:flex; align-items:center; justify-content:center; padding:0; font-size:13px; font-weight:900; font-family:inherit; }
    .gm-panes-toggle:hover { background:#f0f0f0; color:#555; }
    .gm-grp-row { cursor:pointer; border-bottom:1px solid #ebebeb; transition:background 0.1s; overflow:hidden; }
    .gm-grp-row:hover { background:#f5f5f5; }
    .gm-grp-row.gm-grp-sel { background:#fef2f4; box-shadow:inset 3px 0 0 #C8102E; }
    .gm-grp-header { width:100%; padding:5px 14px; font-size:13px; font-weight:900; color:rgba(255,255,255,0.92); letter-spacing:.03em; }
    .gm-grp-body { padding:10px 14px 12px; }
    .gm-grp-name { font-size:13px; font-weight:700; color:#111; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .gm-grp-meta { font-size:11px; color:#999; margin-top:2px; }
    .gm-grp-preview { font-size:12px; color:#777; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-top:2px; }

    .gm-thread-pane { flex:1; display:flex; flex-direction:column; min-width:0; min-height:0; background:#f8f8f8; }
    .gm-thread-empty { display:flex; flex-direction:column; align-items:center; justify-content:center; flex:1; color:#888; }
    .gm-thread-head { display:flex; align-items:center; gap:12px; padding:12px 16px; background:#fff; border-bottom:1px solid #e5e7eb; flex-shrink:0; }
    .gm-back-btn { display:none; padding:6px 12px; background:transparent; border:1px solid #ddd; border-radius:6px; font-size:12px; font-weight:700; cursor:pointer; color:#555; font-family:inherit; }
    .gm-thread-title { font-size:14px; font-weight:800; color:#111; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

    .gm-msgs { flex:1; min-height:0; overflow-y:auto; padding:16px; display:flex; flex-direction:column; gap:10px; }
    .gm-msg { display:flex; gap:10px; align-items:flex-start; }
    .gm-msg-av { width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:900; color:#fff; flex-shrink:0; }
    .gm-msg-body { min-width:0; }
    .gm-msg-meta { display:flex; align-items:baseline; gap:8px; margin-bottom:3px; }
    .gm-msg-name { font-size:13px; font-weight:800; color:#111; }
    .gm-msg-time { font-size:11px; color:#aaa; }
    .gm-msg-text { font-size:14px; color:#333; line-height:1.5; word-break:break-word; }

    .gm-send-box { display:flex; gap:8px; padding:12px 16px; background:#fff; border-top:1px solid #e5e7eb; flex-shrink:0; align-items:flex-end; }
    .gm-send-input { flex:1; padding:9px 12px; border:1.5px solid #ddd; border-radius:8px; font-size:14px; font-family:inherit; resize:none; outline:none; line-height:1.4; }
    .gm-send-input:focus { border-color:#C8102E; }
    .gm-send-btn { padding:9px 18px; background:#C8102E; color:#fff; border:none; border-radius:8px; font-size:13px; font-weight:800; cursor:pointer; font-family:inherit; white-space:nowrap; }
    .gm-send-btn:hover { opacity:.88; }
    .gm-send-err { font-size:12px; color:#dc2626; padding:4px 0; }
    .gm-refresh-btn { margin-left:auto; padding:5px 10px; background:transparent; border:1px solid #ddd; border-radius:6px; font-size:15px; cursor:pointer; color:#555; font-family:inherit; line-height:1; }
    .gm-refresh-btn:hover { background:#f3f4f6; }
    #gm-popup-box .gm-panes { height:100%; }

    /* Responsive */
    @media (max-width:768px) {
      .mh-hero { padding:24px 20px; }
      .mh-cdown-n { font-size:40px; }
      .mh-tabs-in { padding:0 16px; overflow-x:auto; }
      .mh-ev-cards { padding:20px; }
      .mh-evc { flex-direction:column; align-items:flex-start; gap:14px; }
      .mh-evc-right { align-items:flex-start; width:100%; }
      .mh-evc-avail { width:100%; }
      .mh-av-btn { flex:1; text-align:center; }
      .mh-evc-name { white-space:normal; }
      .mh-avatar { width:56px; height:56px; }
      .mh-av-initials { font-size:18px; }
      .gm-panes { height:calc(100vh - 200px); }
      .gm-groups-pane { width:100%; border-right:none; }
      .gm-groups-pane.gm-mobile-hidden { display:none; }
      .gm-thread-pane { display:none; width:100%; }
      .gm-thread-pane.gm-mobile-visible { display:flex; }
      .gm-back-btn { display:block; }
    }
  </style>`;

  Router.register('/my', renderMyHeroes);

  // Update team-strip meta on every route change too
  const origDispatch = Router.dispatch.bind(Router);
  Router.dispatch = function dispatchPatched() {
    if (_gmPollTimer) { clearInterval(_gmPollTimer); _gmPollTimer = null; _gmCurrentGroupId = null; }
    document.getElementById('gm-popup-overlay')?.remove();
    origDispatch();
    setTimeout(updateTeamStripMeta, 0);
    setTimeout(gmUpdateHomeBadge, 600);
  };

  console.info('[scoreboard] IA overlay active — 5 primary items + team strip + /my portal');
})();
