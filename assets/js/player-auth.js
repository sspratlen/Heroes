/* ============================================================
   HEROES SENIOR SOFTBALL - Player Authentication Module
   Handles player login/logout + attendance marking
   ============================================================ */
'use strict';

const PlayerAuth = {

  // ── LOGIN / LOGOUT ────────────────────────────────────────
  login(username, password) {
    const data = loadData();
    const player = data.players.find(p =>
      p.credentials &&
      p.credentials.username === username.toLowerCase().trim() &&
      p.credentials.password === password
    );
    if (player) {
      sessionStorage.setItem('heroes_player_id', player.id);
      return { success: true, player };
    }
    return { success: false, error: 'Username or password not found.' };
  },

  logout() {
    sessionStorage.removeItem('heroes_player_id');
    PlayerAuth.refreshNavAuth();
    // If on a protected page, redirect home
    if (window.location.hash.includes('/my-schedule')) {
      Router.navigate('/');
    }
  },

  getPlayer() {
    const id = sessionStorage.getItem('heroes_player_id');
    if (!id) return null;
    const data = loadData();
    return data.players.find(p => p.id === id) || null;
  },

  isLoggedIn() { return !!this.getPlayer(); },

  // ── ATTENDANCE ────────────────────────────────────────────
  setAttendance(eventId, status, note = '') {
    const player = this.getPlayer();
    if (!player) return false;

    const d = loadData();
    const evIdx = d.events.findIndex(e => e.id === eventId);
    if (evIdx < 0) return false;

    if (!d.events[evIdx].availability) d.events[evIdx].availability = [];
    const aIdx = d.events[evIdx].availability.findIndex(a => a.playerId === player.id);
    const record = { playerId: player.id, status, note, updatedAt: new Date().toISOString().slice(0, 10) };

    if (aIdx >= 0) d.events[evIdx].availability[aIdx] = record;
    else d.events[evIdx].availability.push(record);

    saveData(d);
    return true;
  },

  getMyAttendance(eventId) {
    const player = this.getPlayer();
    if (!player) return null;
    const data = loadData();
    const ev = data.events.find(e => e.id === eventId);
    return ev?.availability?.find(a => a.playerId === player.id) || null;
  },

  // ── AUTH NAV UI ───────────────────────────────────────────
  refreshNavAuth() {
    const container = document.getElementById('auth-nav-slot');
    if (!container) return;
    const player = this.getPlayer();

    if (player) {
      container.innerHTML = `
        <div class="auth-player-badge">
          <div class="auth-avatar">${player.firstName[0]}${player.lastName[0]}</div>
          <div class="auth-info">
            <span class="auth-name">${player.firstName} ${player.lastName} <span style="color:rgba(255,255,255,0.4);font-size:10px">#${player.number}</span></span>
            <div class="auth-links">
              <a data-route="/player/${player.id}" style="color:rgba(255,255,255,0.5);font-size:11px">My Profile</a>
              <span style="color:rgba(255,255,255,0.3);font-size:10px">·</span>
              <a data-route="/my-schedule" style="color:rgba(255,255,255,0.5);font-size:11px">My Schedule</a>
              <span style="color:rgba(255,255,255,0.3);font-size:10px">·</span>
              <a onclick="PlayerAuth.logout()" style="color:rgba(255,255,255,0.4);font-size:11px;cursor:pointer">Sign Out</a>
            </div>
          </div>
        </div>`;
    } else {
      container.innerHTML = `
        <a class="auth-login-btn" onclick="PlayerAuth.showLoginModal()">
          <span style="font-size:14px">🔐</span> Player Login
        </a>`;
    }
  },

  // ── LOGIN MODAL ───────────────────────────────────────────
  showLoginModal() {
    const overlay = document.getElementById('player-login-modal');
    overlay.classList.add('open');
    setTimeout(() => document.getElementById('login-username')?.focus(), 100);
  },

  hideLoginModal() {
    document.getElementById('player-login-modal').classList.remove('open');
    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';
    document.getElementById('login-error-msg').textContent = '';
  },

  submitLogin() {
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    const result = PlayerAuth.login(username, password);
    if (result.success) {
      PlayerAuth.hideLoginModal();
      PlayerAuth.refreshNavAuth();
      // Refresh current page if it shows attendance
      if (window.location.hash.includes('/events')) {
        Router.dispatch();
      } else {
        Router.navigate('/my-schedule');
      }
    } else {
      document.getElementById('login-error-msg').textContent = result.error;
      document.getElementById('login-password').value = '';
    }
  },

  // Password changes for Supabase-authenticated users are handled by
  // HeroesAuth.updatePassword() via the Change Password modal on /my page.

  // ── REGISTRATION ─────────────────────────────────────────
  register(formData) {
    const d = loadData();
    const uname = formData.username.toLowerCase().trim();
    const taken = d.players.some(p => p.credentials?.username === uname) ||
                  d.accountRequests.some(r => r.username === uname && r.status === 'pending');
    if (taken) return { success: false, error: 'That username is already taken.' };
    const req = {
      id: 'req_' + Date.now(),
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      number: formData.number.trim(),
      position: formData.position,
      teams: formData.teams,
      username: uname,
      password: formData.password,
      requestedAt: new Date().toISOString().split('T')[0],
      status: 'pending',
      reviewedAt: null,
      reviewNotes: '',
      playerId: null
    };
    d.accountRequests.push(req);
    saveData(d);
    return { success: true };
  },

  showRegisterModal() {
    const overlay = document.getElementById('player-register-modal');
    if (overlay) { overlay.classList.add('open'); setTimeout(() => document.getElementById('reg-first')?.focus(), 100); }
  },

  hideRegisterModal() {
    const overlay = document.getElementById('player-register-modal');
    if (overlay) overlay.classList.remove('open');
    const err = document.getElementById('reg-error-msg');
    if (err) err.textContent = '';
  },

  submitRegister() {
    const errEl = document.getElementById('reg-error-msg');
    const g = id => (document.getElementById(id) || {}).value || '';
    const firstName = g('reg-first').trim();
    const lastName = g('reg-last').trim();
    const email = g('reg-email').trim();
    const phone = g('reg-phone').trim();
    const number = g('reg-number').trim();
    const position = g('reg-position');
    const teams = Array.from(document.querySelectorAll('.reg-team:checked')).map(c => c.value);
    const username = g('reg-username').trim();
    const password = g('reg-password');
    const confirm = g('reg-confirm');

    if (!firstName || !lastName) { errEl.textContent = 'First and last name are required.'; return; }
    if (!username || username.length < 3) { errEl.textContent = 'Username must be at least 3 characters.'; return; }
    if (!/^[a-z0-9_]+$/i.test(username)) { errEl.textContent = 'Username: letters, numbers and underscores only.'; return; }
    if (!password || password.length < 4) { errEl.textContent = 'Password must be at least 4 characters.'; return; }
    if (password !== confirm) { errEl.textContent = 'Passwords do not match.'; return; }

    const result = PlayerAuth.register({ firstName, lastName, email, phone, number, position, teams, username, password });
    if (result.success) {
      PlayerAuth.hideRegisterModal();
      PlayerAuth.showLoginModal();
      document.getElementById('login-form-inner').innerHTML = `
        <div style="text-align:center;padding:20px 0">
          <div style="font-size:52px;margin-bottom:16px">✅</div>
          <h2 style="font-size:20px;font-weight:900;margin-bottom:8px">Request Submitted!</h2>
          <p style="color:var(--gray);font-size:14px;line-height:1.6;margin-bottom:24px">Your account request has been sent to the team admin for review. You'll be able to log in once it's approved.</p>
          <button class="btn btn-primary" style="width:100%;justify-content:center" onclick="PlayerAuth.hideLoginModal()">Got it!</button>
        </div>`;
    } else {
      errEl.textContent = result.error;
    }
  },

  // ── PROFILE UPDATE ────────────────────────────────────────
  updateProfile(updates) {
    const player = this.getPlayer();
    if (!player) return false;
    const d = loadData();
    const idx = d.players.findIndex(p => p.id === player.id);
    if (idx < 0) return false;
    Object.assign(d.players[idx], updates);
    saveData(d);
    this.refreshNavAuth();
    return true;
  },

  handlePhotoUpload(file, callback) {
    if (!file || !file.type.startsWith('image/')) { callback(null, 'Please select an image file (JPG, PNG, etc.)'); return; }
    if (file.size > 8 * 1024 * 1024) { callback(null, 'Image must be under 8MB.'); return; }
    const reader = new FileReader();
    reader.onload = function(e) {
      const img = new Image();
      img.onload = function() {
        const canvas = document.createElement('canvas');
        const MAX = 400;
        let w = img.width, h = img.height;
        if (w > h) { if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; } }
        else        { if (h > MAX) { w = Math.round(w * MAX / h); h = MAX; } }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        PlayerAuth.updateProfile({ photo: dataUrl });
        callback(dataUrl, null);
      };
      img.onerror = function() { callback(null, 'Could not load image.'); };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  },

};

// ── Inject Login Modal + Auth Styles into DOM ─────────────
document.addEventListener('DOMContentLoaded', () => {
  // Auth styles
  const style = document.createElement('style');
  style.textContent = `
    /* AUTH NAV */
    #auth-nav-slot { margin-left: 12px; display: flex; align-items: center; }
    .auth-login-btn {
      display: flex; align-items: center; gap: 7px; padding: 8px 15px;
      background: rgba(200,16,46,0.25); color: rgba(255,255,255,0.9);
      border-radius: 20px; font-size: 12px; font-weight: 700;
      cursor: pointer; transition: all 0.2s; border: 1px solid rgba(200,16,46,0.4);
      letter-spacing: 0.3px;
    }
    .auth-login-btn:hover { background: var(--red); color: #fff; border-color: var(--red); }
    .auth-player-badge { display: flex; align-items: center; gap: 10px; }
    .auth-avatar {
      width: 34px; height: 34px; border-radius: 50%;
      background: var(--red); color: #fff; font-size: 12px; font-weight: 900;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .auth-info { line-height: 1.3; }
    .auth-name { display: block; font-size: 13px; font-weight: 700; color: #fff; }
    .auth-links { display: flex; gap: 5px; align-items: center; }
    .auth-links a { cursor: pointer; }
    .auth-links a:hover { color: var(--gold) !important; }

    /* LOGIN MODAL */
    #player-login-modal {
      position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 3000;
      display: flex; align-items: center; justify-content: center; padding: 20px;
      opacity: 0; pointer-events: none; transition: opacity 0.2s;
    }
    #player-login-modal.open { opacity: 1; pointer-events: all; }
    .player-login-card {
      background: #fff; border-radius: 14px; padding: 36px 32px;
      width: 100%; max-width: 400px; box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      transform: scale(0.95); transition: transform 0.2s;
    }
    #player-login-modal.open .player-login-card { transform: scale(1); }
    .login-hero { display: flex; align-items: center; gap: 14px; margin-bottom: 24px; }
    .login-hero img { width: 50px; height: 50px; border-radius: 50%; object-fit: contain; border: 2px solid var(--red); }
    .login-hero-text h2 { font-size: 20px; font-weight: 900; }
    .login-hero-text p { font-size: 13px; color: var(--gray); margin-top: 2px; }

    /* ATTENDANCE BUTTONS */
    .attend-btn-row { display: flex; gap: 10px; margin: 14px 0; }
    .attend-btn {
      flex: 1; padding: 12px 8px; border-radius: 8px; border: 2px solid;
      font-size: 13px; font-weight: 800; cursor: pointer; transition: all 0.2s;
      display: flex; flex-direction: column; align-items: center; gap: 4px; background: #fff;
    }
    .attend-btn .attend-icon { font-size: 20px; }
    .attend-btn-yes { border-color: #86efac; color: #15803d; }
    .attend-btn-yes:hover, .attend-btn-yes.active { background: #dcfce7; border-color: #22c55e; }
    .attend-btn-no { border-color: #fca5a5; color: #dc2626; }
    .attend-btn-no:hover, .attend-btn-no.active { background: #fee2e2; border-color: #ef4444; }
    .attend-btn-maybe { border-color: #fde68a; color: #92400e; }
    .attend-btn-maybe:hover, .attend-btn-maybe.active { background: #fef9c3; border-color: #eab308; }
    .attend-note-input {
      width: 100%; padding: 8px 12px; border: 1px solid var(--border);
      border-radius: 6px; font-size: 13px; outline: none; font-family: inherit; margin-bottom: 8px;
    }
    .attend-note-input:focus { border-color: var(--red); }

    /* TOURNAMENT CARD ATTENDANCE BAR */
    .attend-bar { height: 6px; border-radius: 20px; background: var(--gray-light); overflow: hidden; margin: 12px 0; display: flex; }
    .attend-bar-yes { background: #22c55e; transition: width 0.3s; }
    .attend-bar-maybe { background: #eab308; transition: width 0.3s; }
    .attend-bar-no { background: #ef4444; transition: width 0.3s; }

    /* PLAYER AVATARS IN ATTENDANCE */
    .attend-avatars { display: flex; flex-wrap: wrap; gap: 6px; }
    .attend-avatar {
      width: 32px; height: 32px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 11px; font-weight: 800; color: #fff;
      position: relative; cursor: default;
    }
    .attend-avatar[title]:hover::after {
      content: attr(title);
      position: absolute; bottom: 110%; left: 50%; transform: translateX(-50%);
      background: var(--dark); color: #fff; padding: 3px 8px; border-radius: 4px;
      font-size: 11px; white-space: nowrap; z-index: 10; pointer-events: none;
    }
    .attend-avatar-yes { background: #16a34a; border: 2px solid #dcfce7; }
    .attend-avatar-maybe { background: #ca8a04; border: 2px solid #fef9c3; }
    .attend-avatar-no { background: #dc2626; border: 2px solid #fee2e2; opacity: 0.5; }
    .attend-avatar-pending { background: var(--gray); border: 2px solid var(--gray-light); opacity: 0.6; }

    /* TOURNEY CARD */
    .tourney-card {
      background: #fff; border-radius: 16px;
      box-shadow: 0 2px 16px rgba(0,0,0,0.07);
      overflow: hidden; margin-bottom: 28px;
      border: 1px solid var(--border);
      transition: box-shadow 0.2s, transform 0.2s;
    }
    .tourney-card:hover { box-shadow: 0 8px 32px rgba(0,0,0,0.13); transform: translateY(-2px); }
    .tourney-header {
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
      padding: 24px 28px 18px; position: relative; overflow: hidden;
    }
    .tourney-header::after {
      content: var(--watermark, '📅'); position: absolute; right: 20px; top: 50%;
      transform: translateY(-50%); font-size: 72px; opacity: 0.07; pointer-events: none;
    }
    .tourney-header-inner { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
    .tourney-header-left { flex: 1; min-width: 0; }
    .tourney-header-right { flex-shrink: 0; }
    .tourney-dates {
      font-size: 11px; color: rgba(255,255,255,0.5); font-weight: 700;
      text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px;
    }
    .tourney-name { font-size: 22px; font-weight: 900; color: #fff; margin-bottom: 8px; line-height: 1.2; }
    .tourney-location { font-size: 13px; color: rgba(255,255,255,0.65); display: flex; align-items: center; gap: 5px; }
    .tourney-badges { display: flex; gap: 8px; margin-top: 14px; flex-wrap: wrap; }
    .tourney-body { padding: 24px 28px; }
    .tourney-attendance-section { margin-top: 4px; }
    .my-attendance-panel {
      background: linear-gradient(135deg, #f0fdf4, #fff);
      border: 2px solid #86efac; border-radius: 10px;
      padding: 18px 20px; margin-bottom: 16px;
    }
    .my-attendance-panel.status-no { background: linear-gradient(135deg, #fff5f5, #fff); border-color: #fca5a5; }
    .my-attendance-panel.status-maybe { background: linear-gradient(135deg, #fefce8, #fff); border-color: #fde68a; }
    .my-attendance-panel.status-pending { background: var(--light); border-color: var(--border); }
    .my-attend-label { font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: var(--gray); margin-bottom: 4px; }
    .my-attend-status { font-size: 16px; font-weight: 900; margin-bottom: 12px; }
    .status-yes .my-attend-status { color: #16a34a; }
    .status-no .my-attend-status { color: #dc2626; }
    .status-maybe .my-attend-status { color: #ca8a04; }
    .status-pending .my-attend-status { color: var(--gray); }
    .tourney-login-prompt {
      background: var(--light); border: 1px dashed var(--border); border-radius: 8px;
      padding: 14px 18px; text-align: center; font-size: 13px; color: var(--gray);
      margin-bottom: 14px;
    }
    .tourney-login-prompt a { color: var(--red); font-weight: 700; cursor: pointer; }
    @media (max-width: 600px) {
      .tourney-body { padding: 16px; }
      .tourney-header { padding: 16px; }
      .attend-btn-row { flex-direction: column; }
    }
  `;
  document.head.appendChild(style);

  // Inject login modal
  const modal = document.createElement('div');
  modal.id = 'player-login-modal';
  modal.setAttribute('aria-modal', 'true');
  modal.innerHTML = `
    <div class="player-login-card">
      <div id="login-form-inner">
        <div class="login-hero">
          <img src="assets/img/heroes-logo.jpg" alt="Heroes" onerror="this.style.background='#C8102E'">
          <div class="login-hero-text">
            <h2>Player Login</h2>
            <p>Heroes Senior Softball</p>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Username</label>
          <input type="text" id="login-username" class="form-input" placeholder="e.g. mmarlow" autocomplete="username"
            onkeydown="if(event.key==='Enter')document.getElementById('login-password').focus()">
        </div>
        <div class="form-group">
          <label class="form-label">Password</label>
          <input type="password" id="login-password" class="form-input" placeholder="Your password" autocomplete="current-password"
            onkeydown="if(event.key==='Enter')PlayerAuth.submitLogin()">
        </div>
        <div id="login-error-msg" style="color:var(--red);font-size:13px;min-height:18px;margin-bottom:10px"></div>
        <button class="btn btn-primary" style="width:100%;justify-content:center;padding:13px" onclick="PlayerAuth.submitLogin()">
          Sign In
        </button>
        <button class="btn btn-secondary" style="width:100%;justify-content:center;margin-top:8px" onclick="PlayerAuth.hideLoginModal()">
          Cancel
        </button>
        <div style="text-align:center;margin-top:16px;font-size:12px;color:var(--gray)">
          New player? <a onclick="PlayerAuth.hideLoginModal();PlayerAuth.showRegisterModal()" style="color:var(--red);font-weight:700;cursor:pointer">Request an Account →</a>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  // Close on backdrop click
  modal.addEventListener('click', e => { if (e.target === modal) PlayerAuth.hideLoginModal(); });

  // ── Registration Modal ──
  const regModal = document.createElement('div');
  regModal.id = 'player-register-modal';
  regModal.setAttribute('aria-modal', 'true');

  // Build team checkboxes from live data
  const _regData = loadData();
  const _teamChecks = _regData.teams.map(t =>
    `<label class="form-check" style="display:inline-flex;align-items:center;gap:6px;margin-right:12px">
      <input type="checkbox" class="reg-team" value="${t.id}"> ${t.name}
    </label>`
  ).join('');
  const _positions = ['P','C','1B','2B','3B','SS','OF','LF','CF','RF','DH','UT'];

  regModal.innerHTML = `
    <div class="player-login-card" style="max-width:520px;overflow-y:auto;max-height:90vh">
      <div class="login-hero">
        <img src="assets/img/heroes-logo.jpg" alt="Heroes" onerror="this.style.background='#C8102E'">
        <div class="login-hero-text">
          <h2>Create Account</h2>
          <p>Submit a request to join the player portal</p>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group"><label class="form-label">First Name *</label>
          <input id="reg-first" class="form-input" placeholder="First"></div>
        <div class="form-group"><label class="form-label">Last Name *</label>
          <input id="reg-last" class="form-input" placeholder="Last"></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group"><label class="form-label">Email</label>
          <input id="reg-email" type="email" class="form-input" placeholder="your@email.com"></div>
        <div class="form-group"><label class="form-label">Phone</label>
          <input id="reg-phone" class="form-input" placeholder="Optional"></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group"><label class="form-label">Jersey #</label>
          <input id="reg-number" class="form-input" placeholder="#"></div>
        <div class="form-group"><label class="form-label">Position</label>
          <select id="reg-position" class="form-input" style="padding:10px 12px">
            ${_positions.map(p => `<option value="${p}">${p}</option>`).join('')}
          </select></div>
      </div>
      <div class="form-group"><label class="form-label">Team(s) you play on</label>
        <div style="display:flex;flex-wrap:wrap;gap:4px;padding:8px 0">${_teamChecks}</div>
      </div>
      <hr style="margin:4px 0 16px;border-color:#eee">
      <div class="form-group"><label class="form-label">Choose a Username *</label>
        <input id="reg-username" class="form-input" placeholder="e.g. jsmith" autocomplete="username"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group"><label class="form-label">Password *</label>
          <input id="reg-password" type="password" class="form-input" placeholder="Min 4 characters" autocomplete="new-password"></div>
        <div class="form-group"><label class="form-label">Confirm Password *</label>
          <input id="reg-confirm" type="password" class="form-input" placeholder="Repeat password"
            onkeydown="if(event.key==='Enter')PlayerAuth.submitRegister()" autocomplete="new-password"></div>
      </div>
      <div id="reg-error-msg" style="color:var(--red);font-size:13px;min-height:18px;margin-bottom:10px"></div>
      <button class="btn btn-primary" style="width:100%;justify-content:center;padding:13px" onclick="PlayerAuth.submitRegister()">
        Submit Account Request
      </button>
      <button class="btn btn-secondary" style="width:100%;justify-content:center;margin-top:8px"
        onclick="PlayerAuth.hideRegisterModal();PlayerAuth.showLoginModal()">
        Already have an account? Sign In
      </button>
    </div>`;
  document.body.appendChild(regModal);
  regModal.addEventListener('click', e => { if (e.target === regModal) PlayerAuth.hideRegisterModal(); });

  // ── Registration Modal CSS ──
  const regStyle = document.createElement('style');
  regStyle.textContent = `
    #player-register-modal {
      position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:3000;
      display:flex;align-items:center;justify-content:center;padding:20px;
      opacity:0;pointer-events:none;transition:opacity 0.2s;
    }
    #player-register-modal.open { opacity:1;pointer-events:all; }
    #player-register-modal .form-group { margin-bottom:12px; }
    #player-register-modal .form-label { font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.4px;color:#666;display:block;margin-bottom:5px; }
    #player-register-modal .form-input { width:100%;padding:9px 12px;border:1px solid #ddd;border-radius:6px;font-size:13px;outline:none;font-family:inherit;box-sizing:border-box; }
    #player-register-modal .form-input:focus { border-color:var(--red); }
    #player-register-modal .form-check { font-size:13px;cursor:pointer; }

    /* Profile page styles */
    .profile-photo-wrap {
      display:flex;align-items:center;gap:24px;padding:24px;
      background:#fff;border-radius:12px;border:1px solid var(--border);margin-bottom:20px;
    }
    .profile-photo-circle {
      width:100px;height:100px;border-radius:50%;overflow:hidden;flex-shrink:0;
      border:3px solid var(--red);display:flex;align-items:center;justify-content:center;
      background:var(--red);font-size:32px;font-weight:900;color:#fff;
    }
    .profile-photo-circle img { width:100%;height:100%;object-fit:cover; }
    .profile-upload-btn { cursor:pointer;display:inline-flex;align-items:center;gap:8px; }
    .profile-section {
      background:#fff;border-radius:12px;border:1px solid var(--border);
      padding:24px;margin-bottom:20px;
    }
    .profile-section-title {
      font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;
      color:var(--gray);margin-bottom:16px;padding-bottom:10px;border-bottom:1px solid var(--border);
    }
    .profile-form-row { display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:14px; }
    @media(max-width:600px) { .profile-form-row { grid-template-columns:1fr; } }
    .profile-tourney-row {
      display:flex;align-items:center;justify-content:space-between;
      padding:14px 0;border-bottom:1px solid var(--border);gap:16px;
      flex-wrap:wrap;
    }
    .profile-tourney-row:last-child { border-bottom:none; }
    .profile-attend-btns { display:flex;gap:8px; }
    .p-attend { padding:7px 14px;border-radius:20px;border:2px solid;font-size:12px;font-weight:800;cursor:pointer;transition:all 0.15s;background:#fff; }
    .p-attend-yes { border-color:#86efac;color:#15803d; }
    .p-attend-yes.active,.p-attend-yes:hover { background:#dcfce7;border-color:#22c55e; }
    .p-attend-no { border-color:#fca5a5;color:#dc2626; }
    .p-attend-no.active,.p-attend-no:hover { background:#fee2e2;border-color:#ef4444; }
    .p-attend-maybe { border-color:#fde68a;color:#92400e; }
    .p-attend-maybe.active,.p-attend-maybe:hover { background:#fef9c3;border-color:#eab308; }
  `;
  document.head.appendChild(regStyle);

  // Init nav auth slot
  PlayerAuth.refreshNavAuth();
});
