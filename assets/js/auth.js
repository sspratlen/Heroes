/* ============================================================
   HEROES SENIOR SOFTBALL — Auth Module (HeroesAuth)
   Supabase-backed authentication with role-based access control.

   Role hierarchy (highest → lowest):
     admin   — full control over everything
     manager — can edit data, manage roster, access admin panel
     coach   — team-scoped; can access admin panel for their team
     player  — authenticated; basic member access
     (fans are unauthenticated public visitors)

   Dependencies (must load before this file):
     • @supabase/supabase-js v2 (CDN, loaded before data.js)
     • data.js  — provides getSupabase() / _getClient()

   Usage:
     Add this script tag AFTER data.js and app.js:
       <script src="assets/js/auth.js"></script>
     HeroesAuth.init() is called automatically on DOMContentLoaded.
   ============================================================ */

'use strict';

const HeroesAuth = {

  // ── Internal state ────────────────────────────────────────
  // Cached Supabase session object (from sb.auth.getSession)
  _session: null,

  // Cached profile row from the profiles table
  _profile: null,

  // True once init() has finished the initial getSession() + loadProfile() pass.
  // Other modules (e.g. heroes-scoreboard.js) can check this to know whether
  // the auth state is ready to read.
  _initialized: false,
  _fanCache: null,


  // ── Initialisation ────────────────────────────────────────

  /**
   * init() — Call once on page load (done automatically below).
   *
   * 1. Gets the current Supabase session (if any).
   * 2. Loads the matching profile from the profiles table.
   * 3. Subscribes to auth state changes so the UI stays in sync
   *    when the user signs in / out in another tab.
   * 4. Refreshes the nav auth slot.
   */
  async init() {
    const sb = _getClient(); // from data.js
    if (!sb) {
      // Supabase client not available — degrade gracefully
      console.warn('HeroesAuth: Supabase client not available. Auth disabled.');
      this.refreshNavAuth();
      return;
    }

    try {
      const { data: { session } } = await sb.auth.getSession();
      this._session = session;
      if (session?.user) {
        await this._loadProfile(session.user.id);
        await this._loadFanDataFromSupabase();
      }
    } catch (err) {
      console.warn('HeroesAuth.init: could not get session:', err.message);
    }

    // Mark init complete — other modules poll this to know auth is ready
    this._initialized = true;
    this.refreshNavAuth();

    // Keep state in sync across tabs / token refreshes
    sb.auth.onAuthStateChange(async (event, session) => {
      this._session = session;
      if (event === 'PASSWORD_RECOVERY') {
        this.showLoginModal();
        this._renderSetPasswordForm();
        return;
      }
      // Magic link / OTP invite: force the player to set a real password on first visit.
      // Supabase puts type=magiclink in the URL hash when redirecting after OTP login.
      if (event === 'SIGNED_IN') {
        const hashParams = new URLSearchParams(window.location.hash.slice(1));
        if (hashParams.get('type') === 'magiclink') {
          if (session?.user) await this._loadProfile(session.user.id);
          this.refreshNavAuth();
          // Clean the auth tokens out of the URL before showing the form
          window.history.replaceState(null, '', window.location.pathname + window.location.search + '#/');
          this.showLoginModal();
          this._renderSetPasswordForm({ firstLogin: true, magicLink: true });
          // Fan data not loaded here — _fanData() falls back to localStorage during
          // the password-set flow. A subsequent SIGNED_IN event loads it from Supabase.
          return;
        }
      }
      if (session?.user) {
        await this._loadProfile(session.user.id);
        await this._loadFanDataFromSupabase();
      } else {
        this._profile = null;
        this._fanCache = null;
      }
      this.refreshNavAuth();

      // If the /my page is currently showing (it renders synchronously before
      // the async getSession resolves, or shows the sign-in wall before login),
      // re-dispatch the router so it re-renders with the current auth state.
      const onMyPage = window.location.hash.replace(/^#\/?/, '') === 'my'
                    || window.location.hash === '#/my';
      if (onMyPage && typeof Router !== 'undefined') {
        Router.dispatch();
      }
    });
  },

  /**
   * _loadProfile(userId) — Fetch this user's row from the profiles table.
   * Stores the result in this._profile (null if not found or on error).
   */
  async _loadProfile(userId) {
    const sb = _getClient();
    if (!sb) return;
    try {
      const { data, error } = await sb
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (error) {
        console.warn('HeroesAuth._loadProfile error:', error.message);
        this._profile = null;
      } else {
        this._profile = data;
      }
    } catch (err) {
      console.warn('HeroesAuth._loadProfile exception:', err.message);
      this._profile = null;
    }
  },


  // ── Simple accessors ──────────────────────────────────────

  /** Returns the raw Supabase session object (or null). */
  getSession()  { return this._session; },

  /** Returns the profile row object (or null). */
  getProfile()  { return this._profile; },

  /** True if there is an active Supabase session. */
  isLoggedIn()  { return !!this._session; },

  /**
   * True only when the user is logged in AND an admin has set
   * approved = true on their profile.  Unapproved users can
   * authenticate but get a "pending approval" message.
   */
  isApproved()  { return this._profile?.approved === true; },

  /** Returns the role string ('admin'|'manager'|'coach'|'player') or null. */
  getRole()     { return this._profile?.role ?? null; },

  /**
   * True if the user holds a staff role (admin, manager, or coach).
   * These users see staff-only UI elements.
   */
  isStaff()     {
    return ['admin', 'manager', 'coach'].includes(this.getRole());
  },

  /**
   * True if the user should be able to access the admin panel.
   * Admins, managers, AND coaches all get access (coaches see
   * only their team's data once inside the panel).
   */
  hasAdminAccess() {
    return ['admin', 'manager', 'coach'].includes(this.getRole());
  },

  /** True if the user's role is 'fan'. */
  isFan() { return this.getRole() === 'fan'; },

  /** Any logged-in, approved user can use fan features (favorites, event attendance). */
  canUseFanFeatures() { return this.isLoggedIn() && this.isApproved(); },

  // ── Fan data (Supabase-backed, localStorage for offline fallback) ──
  _fanKey() {
    const uid = this._profile?.id || this._session?.user?.id;
    return uid ? `heroes_fan_${uid}` : null;
  },
  _fanDataFromLocalStorage() {
    const key = this._fanKey();
    if (!key) return { favorites: [], attending: [] };
    try {
      const d = JSON.parse(localStorage.getItem(key) || '{}');
      return { favorites: d.favorites || [], attending: d.attending || [] };
    } catch(e) { return { favorites: [], attending: [] }; }
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
    if (this._fanCache) return;
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

  getFavorites()      { return this._fanData().favorites || []; },
  isFavorite(pid)     { return this.getFavorites().includes(pid); },
  toggleFavorite(pid) {
    const d = this._fanData();
    d.favorites = d.favorites || [];
    const i = d.favorites.indexOf(pid);
    if (i >= 0) d.favorites.splice(i, 1); else d.favorites.push(pid);
    this._saveFanData(d);
    return d.favorites.includes(pid);
  },

  getAttendingEvents()    { return this._fanData().attending || []; },
  isAttendingEvent(eid)   { return this.getAttendingEvents().includes(eid); },
  toggleAttendEvent(eid) {
    const d = this._fanData();
    d.attending = d.attending || [];
    const i = d.attending.indexOf(eid);
    if (i >= 0) d.attending.splice(i, 1); else d.attending.push(eid);
    this._saveFanData(d);
    return d.attending.includes(eid);
  },


  // ── Auth actions ──────────────────────────────────────────

  /**
   * signIn(email, password)
   * Calls sb.auth.signInWithPassword.
   *
   * Two defenses around a previously-seen "Signing in… never resolves" hang:
   *   1. signOut() first to flush any stale refresh token in localStorage that
   *      could deadlock the Supabase client mid-request.
   *   2. 15s timeout — if the network call genuinely never resolves, surface
   *      an error instead of leaving the button stuck.
   *
   * Returns { data } on success, { error } on failure.
   */
  async signIn(email, password) {
    const sb = _getClient();
    if (!sb) return { error: { message: 'Authentication service unavailable.' } };

    // Best-effort: wipe any stale session before attempting a new sign-in.
    // Swallow errors — a missing session is fine, and we don't want this to
    // block the actual sign-in attempt.
    try { await sb.auth.signOut({ scope: 'local' }); } catch (_) { /* ignore */ }

    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Sign-in timed out. Check your connection and try again.')), 15000)
    );

    try {
      const result = await Promise.race([
        sb.auth.signInWithPassword({ email, password }),
        timeout,
      ]);
      return result.error ? { error: result.error } : { data: result.data };
    } catch (err) {
      return { error: { message: err?.message || 'Sign-in failed.' } };
    }
  },

  /**
   * resetPassword(email)
   * Sends a Supabase password-reset email. The link redirects back to
   * the current page so the PASSWORD_RECOVERY handler can take over.
   */
  async resetPassword(email) {
    const sb = _getClient();
    if (!sb) return { error: { message: 'Authentication service unavailable.' } };
    const redirectTo = window.location.origin + window.location.pathname;
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo });
    return error ? { error } : { success: true };
  },

  /**
   * updatePassword(newPassword)
   * Called after the user clicks the reset link and lands back on the
   * site with an active PASSWORD_RECOVERY session.
   */
  async updatePassword(newPassword) {
    const sb = _getClient();
    if (!sb) return { error: { message: 'Authentication service unavailable.' } };
    const { error } = await sb.auth.updateUser({ password: newPassword });
    return error ? { error } : { success: true };
  },

  /**
   * signOut()
   * Signs the user out of Supabase, clears local cache, refreshes nav.
   */
  async signOut() {
    console.log('[HeroesAuth] signOut clicked');
    // Close the dropdown immediately so the click feels responsive even if
    // Supabase is slow.
    document.getElementById('auth-dropdown')?.classList.remove('open');
    const sb = _getClient();
    if (sb) {
      try { await sb.auth.signOut(); } catch (e) {
        console.warn('[HeroesAuth] supabase signOut error (continuing):', e?.message || e);
      }
    }
    this._session = null;
    this._profile = null;
    this._fanCache = null;
    this._initialized = false;
    // Hard reload to flush every module's cached state (player-auth, scoreboard,
    // app router, etc.) — refreshing only the nav left stale state elsewhere.
    window.location.reload();
  },

  /**
   * register(email, password, displayName, requestedRole)
   * Creates a new Supabase auth account.
   * The handle_new_user() database trigger automatically inserts a
   * profiles row with role='player', approved=false, and pending_role
   * set to requestedRole if it's coach/manager/admin.
   *
   * Returns { data, needsApproval: true } on success,
   *         { error } on failure.
   */
  async register(email, password, displayName, requestedRole = 'player') {
    const sb = _getClient();
    if (!sb) return { error: { message: 'Authentication service unavailable.' } };
    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName || email.split('@')[0],
          requested_role: requestedRole,
        }
      }
    });
    if (error) return { error };
    return { data, needsApproval: true };
  },

  /**
   * requestRoleUpgrade(newRole)
   * Sets pending_role on the current user's profile.
   * The admin panel will show this as a role upgrade request.
   */
  async requestRoleUpgrade(newRole) {
    const sb = _getClient();
    if (!sb || !this._profile) return { error: { message: 'Not logged in.' } };
    const validRoles = ['coach', 'manager', 'admin'];
    if (!validRoles.includes(newRole)) return { error: { message: 'Invalid role.' } };
    if (this._profile.role === newRole) return { error: { message: `You are already a ${newRole}.` } };

    const { error } = await sb
      .from('profiles')
      .update({ pending_role: newRole, rejection_reason: null })
      .eq('id', this._profile.id);

    if (error) return { error };
    this._profile.pending_role = newRole;
    this.refreshNavAuth();
    return { success: true };
  },

  /**
   * cancelRoleRequest()
   * Clears pending_role for the current user.
   */
  async cancelRoleRequest() {
    const sb = _getClient();
    if (!sb || !this._profile) return;
    await sb.from('profiles').update({ pending_role: null }).eq('id', this._profile.id);
    this._profile.pending_role = null;
    this.refreshNavAuth();
  },


  // ── Nav UI ────────────────────────────────────────────────

  /**
   * refreshNavAuth()
   * Updates the #auth-nav-slot element inside the site header.
   *
   * Not logged in → login pill button.
   * Logged in     → avatar circle with dropdown containing:
   *                   • "Admin Panel" link  (only if hasAdminAccess())
   *                   • "Sign Out" button
   */
  refreshNavAuth() {
    const slot = document.getElementById('auth-nav-slot');
    if (!slot) return;

    if (!this.isLoggedIn()) {
      slot.innerHTML = `
        <button class="auth-login-btn" onclick="HeroesAuth.showLoginModal()">
          🔐 Login
        </button>`;
      return;
    }

    // Build avatar initials from display_name or email
    const profile = this._profile;
    const displayName = profile?.display_name || this._session?.user?.email?.split('@')[0] || '?';
    const initials    = displayName
      .split(/\s+/)
      .slice(0, 2)
      .map(w => w[0]?.toUpperCase() || '')
      .join('');
    const roleLabel   = profile?.role ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1) : 'Player';

    const adminLink = this.hasAdminAccess() && this.isApproved()
      ? `<a class="auth-dropdown-item" href="admin.html">⚙ Admin Panel</a>`
      : '';

    // Role status indicator
    const pendingRole  = profile?.pending_role;
    const approved     = this.isApproved();
    let roleStatusHtml = '';
    if (!approved) {
      roleStatusHtml = `<div class="auth-dropdown-status auth-dropdown-status-pending">⏳ Awaiting Approval</div>`;
    } else if (pendingRole) {
      const cap = pendingRole.charAt(0).toUpperCase() + pendingRole.slice(1);
      roleStatusHtml = `
        <div class="auth-dropdown-status auth-dropdown-status-pending">⏳ ${cap} Request Pending</div>
        <button class="auth-dropdown-item" style="font-size:12px;color:#888" onclick="HeroesAuth.cancelRoleRequest()">✕ Cancel Request</button>`;
    }

    // Role upgrade option for approved players (not already highest role or pending)
    let upgradeLink = '';
    if (approved && !pendingRole && !this.hasAdminAccess()) {
      upgradeLink = `<button class="auth-dropdown-item" onclick="HeroesAuth.showRoleRequestModal()">↑ Request Role Upgrade</button>`;
    }

    slot.innerHTML = `
      <div class="auth-user-menu">
        <button class="auth-avatar-btn" onclick="HeroesAuth.toggleUserMenu()" aria-haspopup="true" aria-expanded="false">
          <div class="auth-avatar"${!approved ? ' style="background:#9ca3af"' : ''}>${initials}</div>
          <div class="auth-user-info">
            <span class="auth-user-name">${displayName}</span>
            <span class="auth-user-role">${roleLabel}${!approved ? ' · Pending' : ''}${pendingRole ? ' · '+pendingRole+' req.' : ''}</span>
          </div>
          <span class="auth-caret">▾</span>
        </button>
        <div class="auth-dropdown" id="auth-dropdown" role="menu">
          ${roleStatusHtml}
          ${adminLink}
          ${upgradeLink}
          ${approved ? `<button class="auth-dropdown-item" onclick="document.getElementById('auth-dropdown')?.classList.remove('open');openEditProfileModal()">✏ Edit Profile</button>` : ''}
          <button class="auth-dropdown-item auth-dropdown-signout" onclick="HeroesAuth.signOut()">🚪 Sign Out</button>
        </div>
      </div>`;
  },

  /**
   * showRoleRequestModal()
   * Shows a small modal letting an approved player request a role upgrade.
   */
  showRoleRequestModal() {
    // Close the nav dropdown
    document.getElementById('auth-dropdown')?.classList.remove('open');

    const currentRole = this.getRole() || 'player';
    const options = [];
    if (currentRole === 'player') {
      options.push({ value: 'coach',   label: 'Coach',   note: 'Requires Manager or Admin approval' });
      options.push({ value: 'manager', label: 'Manager', note: 'Requires Admin approval' });
      options.push({ value: 'admin',   label: 'Admin',   note: 'Requires Admin approval' });
    } else if (currentRole === 'coach') {
      options.push({ value: 'manager', label: 'Manager', note: 'Requires Admin approval' });
      options.push({ value: 'admin',   label: 'Admin',   note: 'Requires Admin approval' });
    } else if (currentRole === 'manager') {
      options.push({ value: 'admin', label: 'Admin', note: 'Requires Admin approval' });
    }

    if (!options.length) return;

    this.showLoginModal();
    const inner = document.getElementById('auth-modal-inner');
    if (!inner) return;
    inner.innerHTML = `
      <div class="auth-modal-header">
        <img src="assets/img/heroes-logo.jpg" alt="Heroes Logo"
             onerror="this.style.background='#C8102E';this.style.borderRadius='50%'">
        <div>
          <div class="auth-modal-title">Request Role Upgrade</div>
          <div class="auth-modal-subtitle">Current role: ${currentRole.charAt(0).toUpperCase()+currentRole.slice(1)}</div>
        </div>
      </div>
      <p style="font-size:13px;color:#666;margin-bottom:16px;line-height:1.6">
        Select the role you'd like to request. A team admin will review your request.
      </p>
      <div class="auth-form-group">
        <label class="auth-form-label">Requested Role</label>
        <select id="ha-upgrade-role" class="auth-form-input" style="cursor:pointer">
          ${options.map(o => `<option value="${o.value}">${o.label} — ${o.note}</option>`).join('')}
        </select>
      </div>
      <div id="ha-error" class="auth-form-error" aria-live="polite"></div>
      <button class="auth-submit-btn" onclick="HeroesAuth.submitRoleRequest()">Submit Request</button>
      <button class="auth-secondary-btn" onclick="HeroesAuth.hideLoginModal()">Cancel</button>`;
  },

  async submitRoleRequest() {
    const sel   = document.getElementById('ha-upgrade-role');
    const errEl = document.getElementById('ha-error');
    if (!sel) return;

    const btn = document.querySelector('#auth-modal-inner .auth-submit-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Submitting…'; }
    if (errEl) errEl.textContent = '';

    const { error } = await this.requestRoleUpgrade(sel.value);

    if (btn) { btn.disabled = false; btn.textContent = 'Submit Request'; }

    if (error) {
      if (errEl) errEl.textContent = error.message;
      return;
    }

    const inner = document.getElementById('auth-modal-inner');
    const capRole = sel.value.charAt(0).toUpperCase() + sel.value.slice(1);
    if (inner) {
      inner.innerHTML = `
        <div class="auth-approval-state">
          <div class="auth-approval-icon">✅</div>
          <h2 class="auth-approval-title">Request Submitted!</h2>
          <p class="auth-approval-msg">
            Your request to become a <strong>${capRole}</strong> has been submitted.
            A team admin will review it shortly.
          </p>
          <button class="auth-submit-btn" onclick="HeroesAuth.hideLoginModal()">Got it</button>
        </div>`;
    }
  },

  /**
   * toggleUserMenu()
   * Toggles the .open class on #auth-dropdown.
   * A global click listener (set up in the DOMContentLoaded block
   * below) closes the dropdown when the user clicks anywhere else.
   */
  toggleUserMenu() {
    const dd = document.getElementById('auth-dropdown');
    if (!dd) return;
    dd.classList.toggle('open');
    const btn = dd.previousElementSibling;
    if (btn) btn.setAttribute('aria-expanded', dd.classList.contains('open'));
  },


  // ── Login modal ───────────────────────────────────────────

  /**
   * showLoginModal()
   * Makes the modal overlay visible and renders the sign-in form.
   */
  showLoginModal() {
    const modal = document.getElementById('heroes-login-modal');
    if (!modal) return;
    this._renderLoginForm();
    modal.classList.add('open');
    setTimeout(() => document.getElementById('ha-email')?.focus(), 120);
  },

  /**
   * hideLoginModal()
   * Hides the modal overlay.
   */
  hideLoginModal() {
    const modal = document.getElementById('heroes-login-modal');
    if (modal) modal.classList.remove('open');
  },

  /**
   * _renderLoginForm()
   * Injects the email + password sign-in form into #auth-modal-inner.
   */
  _renderLoginForm() {
    const inner = document.getElementById('auth-modal-inner');
    if (!inner) return;
    inner.innerHTML = `
      <div class="auth-modal-header">
        <img src="assets/img/heroes-logo.jpg" alt="Heroes Logo"
             onerror="this.style.background='#C8102E';this.style.borderRadius='50%'">
        <div>
          <div class="auth-modal-title">Sign In</div>
          <div class="auth-modal-subtitle">Heroes Senior Softball</div>
        </div>
      </div>

      <div class="auth-form-group">
        <label class="auth-form-label" for="ha-email">Email</label>
        <input  type="email"    id="ha-email"    class="auth-form-input"
                placeholder="you@example.com" autocomplete="email"
                onkeydown="if(event.key==='Enter')document.getElementById('ha-password').focus()">
      </div>

      <div class="auth-form-group">
        <label class="auth-form-label" for="ha-password">Password</label>
        <input  type="password" id="ha-password" class="auth-form-input"
                placeholder="Your password" autocomplete="current-password"
                onkeydown="if(event.key==='Enter')HeroesAuth.submitLogin()">
      </div>

      <div id="ha-error" class="auth-form-error" aria-live="polite"></div>

      <button class="auth-submit-btn" onclick="HeroesAuth.submitLogin()">Sign In</button>
      <button class="auth-secondary-btn" onclick="HeroesAuth.hideLoginModal()">Cancel</button>

      <div class="auth-modal-footer">
        <a onclick="HeroesAuth._renderForgotForm()" class="auth-switch-link">
          Forgot password?
        </a>
        &nbsp;·&nbsp;
        New to Heroes?
        <a onclick="HeroesAuth._renderRegisterForm()" class="auth-switch-link">
          Create an account →
        </a>
      </div>`;
  },

  /**
   * _renderRegisterForm()
   * Injects the name + email + password + confirm registration form
   * into #auth-modal-inner.
   */
  _renderRegisterForm() {
    const inner = document.getElementById('auth-modal-inner');
    if (!inner) return;
    inner.innerHTML = `
      <div class="auth-modal-header">
        <img src="assets/img/heroes-logo.jpg" alt="Heroes Logo"
             onerror="this.style.background='#C8102E';this.style.borderRadius='50%'">
        <div>
          <div class="auth-modal-title">Request Access</div>
          <div class="auth-modal-subtitle">Heroes Senior Softball</div>
        </div>
      </div>

      <div class="auth-form-group">
        <label class="auth-form-label" for="ha-reg-name">Full Name</label>
        <input  type="text"     id="ha-reg-name"  class="auth-form-input"
                placeholder="First Last" autocomplete="name"
                onkeydown="if(event.key==='Enter')document.getElementById('ha-reg-email').focus()">
      </div>

      <div class="auth-form-group">
        <label class="auth-form-label" for="ha-reg-email">Email</label>
        <input  type="email"    id="ha-reg-email" class="auth-form-input"
                placeholder="you@example.com" autocomplete="email"
                onkeydown="if(event.key==='Enter')document.getElementById('ha-reg-pw').focus()">
      </div>

      <div class="auth-form-group">
        <label class="auth-form-label" for="ha-reg-role">I am a…</label>
        <select id="ha-reg-role" class="auth-form-input" style="cursor:pointer">
          <option value="player">Player</option>
          <option value="fan">Fan</option>
        </select>
      </div>

      <div class="auth-form-group">
        <label class="auth-form-label" for="ha-reg-pw">Password</label>
        <input  type="password" id="ha-reg-pw"    class="auth-form-input"
                placeholder="Min 6 characters" autocomplete="new-password"
                onkeydown="if(event.key==='Enter')HeroesAuth.submitRegister()">
      </div>

      <div id="ha-error" class="auth-form-error" aria-live="polite"></div>

      <button class="auth-submit-btn" onclick="HeroesAuth.submitRegister()">Request Access</button>
      <button class="auth-secondary-btn" onclick="HeroesAuth.hideLoginModal()">Cancel</button>

      <div class="auth-modal-footer">
        Already have an account?
        <a onclick="HeroesAuth._renderLoginForm()" class="auth-switch-link">Sign in →</a>
      </div>`;
    setTimeout(() => document.getElementById('ha-reg-name')?.focus(), 80);
  },

  _renderForgotForm() {
    const inner = document.getElementById('auth-modal-inner');
    if (!inner) return;
    inner.innerHTML = `
      <div class="auth-modal-header">
        <img src="assets/img/heroes-logo.jpg" alt="Heroes Logo"
             onerror="this.style.background='#C8102E';this.style.borderRadius='50%'">
        <div>
          <div class="auth-modal-title">Reset Password</div>
          <div class="auth-modal-subtitle">We'll email you a reset link</div>
        </div>
      </div>

      <div class="auth-form-group">
        <label class="auth-form-label" for="ha-forgot-email">Email</label>
        <input type="email" id="ha-forgot-email" class="auth-form-input"
               placeholder="you@example.com" autocomplete="email"
               onkeydown="if(event.key==='Enter')HeroesAuth.submitForgot()">
      </div>

      <div id="ha-error" class="auth-form-error" aria-live="polite"></div>

      <button class="auth-submit-btn" onclick="HeroesAuth.submitForgot()">Send Reset Link</button>

      <div class="auth-modal-footer">
        <a onclick="HeroesAuth._renderLoginForm()" class="auth-switch-link">← Back to sign in</a>
      </div>`;
    setTimeout(() => document.getElementById('ha-forgot-email')?.focus(), 80);
  },

  _renderSetPasswordForm(opts = {}) {
    const inner = document.getElementById('auth-modal-inner');
    if (!inner) return;
    this._firstLogin = !!opts.firstLogin;
    const title    = opts.firstLogin ? 'Welcome to Heroes SSB!' : 'Set New Password';
    const subtitle = opts.magicLink
      ? 'Set a password so you can log in anytime.'
      : opts.firstLogin
        ? 'Your admin set a temporary password. Pick a new one to finish signing in.'
        : 'Choose a new password for your account';
    // Make sure the modal overlay is visible, but don't re-render the login
    // form — that would clobber the password fields below.
    document.getElementById('heroes-login-modal')?.classList.add('open');
    inner.innerHTML = `
      <div class="auth-modal-header">
        <img src="assets/img/heroes-logo.jpg" alt="Heroes Logo"
             onerror="this.style.background='#C8102E';this.style.borderRadius='50%'">
        <div>
          <div class="auth-modal-title">${title}</div>
          <div class="auth-modal-subtitle">${subtitle}</div>
        </div>
      </div>

      <div class="auth-form-group">
        <label class="auth-form-label" for="ha-new-pw">New Password</label>
        <input type="password" id="ha-new-pw" class="auth-form-input"
               placeholder="Min 6 characters" autocomplete="new-password"
               onkeydown="if(event.key==='Enter')document.getElementById('ha-new-pw2').focus()">
      </div>

      <div class="auth-form-group">
        <label class="auth-form-label" for="ha-new-pw2">Confirm Password</label>
        <input type="password" id="ha-new-pw2" class="auth-form-input"
               placeholder="Repeat password" autocomplete="new-password"
               onkeydown="if(event.key==='Enter')HeroesAuth.submitSetPassword()">
      </div>

      <div id="ha-error" class="auth-form-error" aria-live="polite"></div>

      <button class="auth-submit-btn" onclick="HeroesAuth.submitSetPassword()">Update Password</button>`;
    setTimeout(() => document.getElementById('ha-new-pw')?.focus(), 80);
  },


  // ── Form submission ───────────────────────────────────────

  /**
   * submitLogin()
   * Reads email/password from the form, calls signIn(), then either:
   *   • Shows an error if credentials are wrong.
   *   • Shows a "pending approval" message if approved=false.
   *   • Closes the modal and shows a success toast if all good.
   */
  async submitLogin() {
    const emailEl = document.getElementById('ha-email');
    const pwEl    = document.getElementById('ha-password');
    const errEl   = document.getElementById('ha-error');
    if (!emailEl || !pwEl || !errEl) return;

    const email    = emailEl.value.trim();
    const password = pwEl.value;

    if (!email || !password) {
      errEl.textContent = 'Please enter your email and password.';
      return;
    }

    // Disable button while request is in flight
    const btn = document.querySelector('#auth-modal-inner .auth-submit-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Signing in…'; }
    errEl.textContent = '';

    const { data, error } = await this.signIn(email, password);

    if (btn) { btn.disabled = false; btn.textContent = 'Sign In'; }

    if (error) {
      errEl.textContent = error.message || 'Sign-in failed. Please try again.';
      if (pwEl) pwEl.value = '';
      return;
    }

    // Cache the session immediately so isLoggedIn()/getSession() are correct
    // without waiting for the onAuthStateChange callback to fire.
    this._session = data?.session || this._session;

    // Load profile synchronously here (don't rely on the onAuthStateChange
    // callback to win the race — submitLogin reads _profile right below).
    const userId = data?.user?.id || data?.session?.user?.id;
    if (userId) {
      try { await this._loadProfile(userId); } catch (_) { /* handled by _loadProfile */ }
    }

    // First-login forced password change: an admin created this account with
    // a temp password. Don't proceed to the welcome / approval flow until
    // the user picks a new one.
    if (this._profile?.must_change_password) {
      this._renderSetPasswordForm({ firstLogin: true });
      return;
    }

    // Auth succeeded — check approval status
    if (!this.isApproved()) {
      // Show a friendly "waiting for approval" state inside the modal
      const inner = document.getElementById('auth-modal-inner');
      if (inner) {
        inner.innerHTML = `
          <div class="auth-approval-state">
            <div class="auth-approval-icon">⏳</div>
            <h2 class="auth-approval-title">Account Pending Approval</h2>
            <p class="auth-approval-msg">
              Your account has been created! A team admin will review and
              approve it shortly. You'll have full access once approved.
            </p>
            <button class="auth-submit-btn" onclick="HeroesAuth.hideLoginModal()">Got it</button>
          </div>`;
      }
      return;
    }

    // Approved — close modal and show toast
    this.hideLoginModal();
    if (typeof App !== 'undefined') {
      App.toast('Welcome back, ' + (this._profile?.display_name || email.split('@')[0]) + '! ✓', 'success');
    }
    this.refreshNavAuth();

    // Re-render the page if we're on /my (was showing a sign-in wall)
    const onMyPage = window.location.hash.replace(/^#\/?/, '') === 'my'
                  || window.location.hash === '#/my';
    if (onMyPage && typeof Router !== 'undefined') {
      Router.dispatch();
    }
  },

  /**
   * submitRegister()
   * Validates the registration form, calls register(), then either:
   *   • Shows a validation or server error.
   *   • Shows a "submitted — awaiting approval" success state.
   */
  async submitRegister() {
    const nameEl  = document.getElementById('ha-reg-name');
    const emailEl = document.getElementById('ha-reg-email');
    const pwEl    = document.getElementById('ha-reg-pw');
    const errEl   = document.getElementById('ha-error');
    if (!nameEl || !emailEl || !pwEl || !errEl) return;

    const displayName = nameEl.value.trim();
    const email       = emailEl.value.trim();
    const password    = pwEl.value;
    const roleEl = document.getElementById('ha-reg-role');
    const requestedRole = roleEl ? roleEl.value : 'player';

    // Client-side validation
    if (!displayName) { errEl.textContent = 'Please enter your full name.'; return; }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errEl.textContent = 'Please enter a valid email address.'; return;
    }
    if (!password || password.length < 6) {
      errEl.textContent = 'Password must be at least 6 characters.'; return;
    }

    // Disable button while in flight
    const btn = document.querySelector('#auth-modal-inner .auth-submit-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Creating account…'; }
    errEl.textContent = '';

    const { error } = await this.register(email, password, displayName, requestedRole);

    if (btn) { btn.disabled = false; btn.textContent = 'Create Account'; }

    if (error) {
      errEl.textContent = error.message || 'Registration failed. Please try again.';
      return;
    }

    // Fire-and-forget: notify admins of the new registration
    try {
      const sb2 = _getClient();
      const session2 = (await sb2.auth.getSession()).data.session;
      const token2 = session2?.access_token || '';
      fetch(`${SUPABASE_URL}/functions/v1/notify-new-registration`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${token2}` },
        body: JSON.stringify({ playerName: displayName, playerEmail: email }),
      }).catch(() => {}); // best-effort
    } catch (_) {}

    // Success — show confirmation state
    const inner = document.getElementById('auth-modal-inner');
    if (inner) {
      inner.innerHTML = `
        <div class="auth-approval-state">
          <div class="auth-approval-icon">✅</div>
          <h2 class="auth-approval-title">Request Submitted!</h2>
          <p class="auth-approval-msg">
            Welcome, ${displayName}! Your account is pending approval.
            A team admin will review it shortly — you'll have access once approved.
          </p>
          <button class="auth-submit-btn" onclick="HeroesAuth.hideLoginModal()">Got it</button>
        </div>`;
    }
  },

  _renderOnboardingWizard(step) {
    const inner = document.getElementById('auth-modal-inner');
    if (!inner) return;

    const steps = ['Your Name', 'Jersey & Position', 'Profile Photo'];
    const pips = steps.map((label, i) => {
      const active = i + 1 === step;
      const done   = i + 1 < step;
      const color  = done ? '#16a34a' : active ? '#C8102E' : '#d1d5db';
      return `<div style="display:flex;flex-direction:column;align-items:center;gap:4px;flex:1">
        <div style="width:28px;height:28px;border-radius:50%;background:${color};color:#fff;font-size:13px;font-weight:700;display:flex;align-items:center;justify-content:center">${done ? '✓' : i+1}</div>
        <div style="font-size:10px;color:${active?'#C8102E':'#888'};font-weight:${active?700:400};white-space:nowrap">${label}</div>
      </div>`;
    }).join(`<div style="flex:1;height:2px;background:#e5e7eb;margin-top:14px;align-self:flex-start"></div>`);

    const progressBar = `<div style="display:flex;align-items:flex-start;gap:0;margin-bottom:24px">${pips}</div>`;
    const header = `
      <div class="auth-modal-header">
        <img src="assets/img/heroes-logo.jpg" alt="Heroes Logo" onerror="this.style.background='#C8102E';this.style.borderRadius='50%'">
        <div>
          <div class="auth-modal-title">Welcome to Heroes! ⚾</div>
          <div class="auth-modal-subtitle">Let's set up your player profile — takes 30 seconds.</div>
        </div>
      </div>`;

    let body = '';
    if (step === 1) {
      const current = this._profile?.display_name || '';
      body = `
        ${header}
        ${progressBar}
        <div class="auth-form-group">
          <label class="auth-form-label" for="wiz-name">Your full name</label>
          <input id="wiz-name" class="auth-form-input" type="text" value="${current.replace(/"/g,'&quot;')}" placeholder="First Last" autocomplete="name"
                 onkeydown="if(event.key==='Enter')HeroesAuth._submitOnboardingStep(1)">
        </div>
        <div id="wiz-error" class="auth-form-error" aria-live="polite"></div>
        <button class="auth-submit-btn" onclick="HeroesAuth._submitOnboardingStep(1)">Next →</button>
        <button class="auth-secondary-btn" onclick="HeroesAuth._renderOnboardingWizard(2)">Skip</button>`;
    } else if (step === 2) {
      const jerseyVal = this._profile?.jersey_number || '';
      const posVal    = this._profile?.position || '';
      const positions = ['','P','C','1B','2B','3B','SS','OF','DH','UT'];
      const opts = positions.map(p => `<option value="${p}" ${posVal===p?'selected':''}>${p||'Select…'}</option>`).join('');
      body = `
        ${header}
        ${progressBar}
        <div class="auth-form-group">
          <label class="auth-form-label" for="wiz-jersey">Jersey number</label>
          <input id="wiz-jersey" class="auth-form-input" type="text" value="${jerseyVal}" placeholder="e.g. 17" inputmode="numeric" style="max-width:120px"
                 onkeydown="if(event.key==='Enter')document.getElementById('wiz-pos').focus()">
        </div>
        <div class="auth-form-group">
          <label class="auth-form-label" for="wiz-pos">Primary position</label>
          <select id="wiz-pos" class="auth-form-input" style="max-width:180px">${opts}</select>
        </div>
        <div id="wiz-error" class="auth-form-error" aria-live="polite"></div>
        <button class="auth-submit-btn" onclick="HeroesAuth._submitOnboardingStep(2)">Next →</button>
        <button class="auth-secondary-btn" onclick="HeroesAuth._renderOnboardingWizard(3)">Skip</button>`;
    } else if (step === 3) {
      body = `
        ${header}
        ${progressBar}
        <div class="auth-form-group">
          <label class="auth-form-label">Profile photo <span style="color:#888;font-weight:400">(optional)</span></label>
          <div style="margin-bottom:12px">
            <img id="wiz-photo-preview" src="${this._profile?.photo_url || ''}" alt=""
                 style="width:72px;height:72px;border-radius:50%;object-fit:cover;background:#e5e7eb;display:${this._profile?.photo_url?'block':'none'}">
          </div>
          <input id="wiz-photo" type="file" accept="image/*" class="auth-form-input" style="padding:6px"
                 onchange="HeroesAuth._previewPhoto(this)">
          <div style="font-size:12px;color:#888;margin-top:6px">Max 5 MB. JPEG, PNG, or WebP.</div>
        </div>
        <div id="wiz-error" class="auth-form-error" aria-live="polite"></div>
        <button class="auth-submit-btn" onclick="HeroesAuth._submitOnboardingStep(3)">Save & Finish</button>
        <button class="auth-secondary-btn" onclick="HeroesAuth._finishOnboarding()">Skip</button>`;
    }

    inner.innerHTML = body;
    setTimeout(() => inner.querySelector('input, select')?.focus(), 80);
  },

  _previewPhoto(input) {
    const file = input.files?.[0];
    if (!file) return;
    const preview = document.getElementById('wiz-photo-preview');
    if (preview) {
      preview.src = URL.createObjectURL(file);
      preview.style.display = 'block';
    }
  },

  async _submitOnboardingStep(step) {
    const errEl = document.getElementById('wiz-error');
    if (errEl) errEl.textContent = '';
    const sb = _getClient();
    if (!sb || !this._profile?.id) { this._renderOnboardingWizard(step + 1); return; }

    const btn = document.querySelector('#auth-modal-inner .auth-submit-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }

    try {
      if (step === 1) {
        const nameEl = document.getElementById('wiz-name');
        const name   = (nameEl?.value || '').trim();
        if (!name) { if (errEl) errEl.textContent = 'Please enter your name.'; if (btn) { btn.disabled=false; btn.textContent='Next →'; } return; }
        await sb.from('profiles').update({ display_name: name }).eq('id', this._profile.id);
        this._profile.display_name = name;
        this._renderOnboardingWizard(2);

      } else if (step === 2) {
        const jersey = (document.getElementById('wiz-jersey')?.value || '').trim();
        const pos    = document.getElementById('wiz-pos')?.value || '';
        const updates = {};
        if (jersey) updates.jersey_number = jersey;
        if (pos)    updates.position      = pos;
        if (Object.keys(updates).length) {
          await sb.from('profiles').update(updates).eq('id', this._profile.id);
          Object.assign(this._profile, updates);
        }
        this._renderOnboardingWizard(3);

      } else if (step === 3) {
        const fileInput = document.getElementById('wiz-photo');
        const file = fileInput?.files?.[0];
        if (file) {
          if (file.size > 5 * 1024 * 1024) {
            if (errEl) errEl.textContent = 'File too large (max 5 MB).';
            if (btn) { btn.disabled = false; btn.textContent = 'Save & Finish'; }
            return;
          }
          const ext  = file.name.split('.').pop()?.toLowerCase() || 'jpg';
          const path = `${this._profile.id}/avatar.${ext}`;
          const { error: upErr } = await sb.storage.from('profile-photos').upload(path, file, { upsert: true });
          if (upErr) throw upErr;
          const { data: urlData } = sb.storage.from('profile-photos').getPublicUrl(path);
          const photoUrl = urlData?.publicUrl;
          if (photoUrl) {
            await sb.from('profiles').update({ photo_url: photoUrl }).eq('id', this._profile.id);
            this._profile.photo_url = photoUrl;
          }
        }
        await this._finishOnboarding();
        return;
      }
    } catch (e) {
      if (errEl) errEl.textContent = e?.message || 'Something went wrong. Please try again.';
      if (btn) { btn.disabled = false; btn.textContent = step === 3 ? 'Save & Finish' : 'Next →'; }
    }
  },

  async _finishOnboarding() {
    const sb = _getClient();
    if (sb && this._profile?.id) {
      await sb.from('profiles').update({ onboarding_complete: true }).eq('id', this._profile.id).catch(() => {});
      this._profile.onboarding_complete = true;
    }
    this.refreshNavAuth();
    const inner = document.getElementById('auth-modal-inner');
    if (inner) {
      inner.innerHTML = `
        <div class="auth-approval-state">
          <div class="auth-approval-icon">⚾</div>
          <h2 class="auth-approval-title">You're all set!</h2>
          <p class="auth-approval-msg">Welcome to Heroes Senior Softball. Your profile is ready — a team admin will approve your account shortly.</p>
          <button class="auth-submit-btn" onclick="HeroesAuth.hideLoginModal()">Let's Go</button>
        </div>`;
    }
  },

  async submitForgot() {
    const emailEl = document.getElementById('ha-forgot-email');
    const errEl   = document.getElementById('ha-error');
    if (!emailEl || !errEl) return;

    const email = emailEl.value.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errEl.textContent = 'Please enter a valid email address.'; return;
    }

    const btn = document.querySelector('#auth-modal-inner .auth-submit-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }
    errEl.textContent = '';

    const { error } = await this.resetPassword(email);

    if (btn) { btn.disabled = false; btn.textContent = 'Send Reset Link'; }

    if (error) {
      errEl.textContent = error.message || 'Could not send reset email. Please try again.';
      return;
    }

    const inner = document.getElementById('auth-modal-inner');
    if (inner) {
      inner.innerHTML = `
        <div class="auth-approval-state">
          <div class="auth-approval-icon">📧</div>
          <h2 class="auth-approval-title">Check Your Email</h2>
          <p class="auth-approval-msg">
            A password reset link has been sent to <strong>${email}</strong>.
            Click the link in the email to set a new password.
          </p>
          <button class="auth-submit-btn" onclick="HeroesAuth.hideLoginModal()">Got it</button>
          <div class="auth-modal-footer" style="margin-top:12px">
            <a onclick="HeroesAuth._renderLoginForm()" class="auth-switch-link">← Back to sign in</a>
          </div>
        </div>`;
    }
  },

  async submitSetPassword() {
    const pwEl  = document.getElementById('ha-new-pw');
    const pw2El = document.getElementById('ha-new-pw2');
    const errEl = document.getElementById('ha-error');
    if (!pwEl || !pw2El || !errEl) return;

    const password = pwEl.value;
    const confirm  = pw2El.value;

    if (!password || password.length < 6) {
      errEl.textContent = 'Password must be at least 6 characters.'; return;
    }
    if (password !== confirm) {
      errEl.textContent = 'Passwords do not match.'; return;
    }

    const btn = document.querySelector('#auth-modal-inner .auth-submit-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Updating…'; }
    errEl.textContent = '';

    const { error } = await this.updatePassword(password);

    if (btn) { btn.disabled = false; btn.textContent = 'Update Password'; }

    if (error) {
      errEl.textContent = error.message || 'Could not update password. Please try again.';
      return;
    }

    // First-login flow: clear must_change_password and refresh profile so the
    // user isn't asked again on next sign-in.
    if (this._firstLogin && this._profile?.id) {
      const sb = _getClient();
      try {
        await sb.from('profiles')
          .update({ must_change_password: false })
          .eq('id', this._profile.id);
        this._profile.must_change_password = false;
      } catch (e) {
        console.warn('[HeroesAuth] could not clear must_change_password:', e?.message || e);
      }
    }

    const wasFirstLogin = this._firstLogin;
    this._firstLogin = false;

    if (wasFirstLogin) {
      // Launch onboarding wizard instead of generic success screen
      this._renderOnboardingWizard(1);
    } else {
      const inner = document.getElementById('auth-modal-inner');
      if (inner) {
        inner.innerHTML = `
          <div class="auth-approval-state">
            <div class="auth-approval-icon">✅</div>
            <h2 class="auth-approval-title">Password Updated!</h2>
            <p class="auth-approval-msg">Your password has been changed successfully.</p>
            <button class="auth-submit-btn" onclick="HeroesAuth.hideLoginModal()">Done</button>
          </div>`;
      }
    }

    // Refresh the nav so the avatar/menu appears now that the first-login
    // gate is cleared.
    this.refreshNavAuth();
  },

};  // end HeroesAuth

// Expose on window so inline onclick="HeroesAuth.signOut()" handlers in
// dynamically-injected HTML (set via innerHTML) can resolve the name even in
// browsers/contexts where script-scope `const` bindings aren't surfaced to
// event-handler attribute compilation.
window.HeroesAuth = HeroesAuth;


// ============================================================
// DOM SETUP — runs once the page is ready
// ============================================================
document.addEventListener('DOMContentLoaded', () => {

  // ── 1. Inject all CSS ──────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `

    /* ── Nav auth slot ─────────────────────────────────────── */
    #auth-nav-slot {
      margin-left: 12px;
      display: flex;
      align-items: center;
    }

    /* Login pill button (shown when not logged in) */
    .auth-login-btn {
      display: flex;
      align-items: center;
      gap: 7px;
      padding: 8px 15px;
      background: rgba(200, 16, 46, 0.25);
      color: rgba(255, 255, 255, 0.9);
      border-radius: 20px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      transition: background 0.2s, border-color 0.2s, color 0.2s;
      border: 1px solid rgba(200, 16, 46, 0.4);
      letter-spacing: 0.3px;
      font-family: inherit;
    }
    .auth-login-btn:hover {
      background: var(--red, #C8102E);
      color: #fff;
      border-color: var(--red, #C8102E);
    }

    /* ── User menu (shown when logged in) ──────────────────── */
    .auth-user-menu {
      position: relative;
    }

    .auth-avatar-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      background: transparent;
      border: none;
      cursor: pointer;
      padding: 4px 6px;
      border-radius: 8px;
      transition: background 0.15s;
    }
    .auth-avatar-btn:hover {
      background: rgba(255, 255, 255, 0.08);
    }

    /* Initials circle */
    .auth-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--red, #C8102E);
      color: #fff;
      font-size: 12px;
      font-weight: 900;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      letter-spacing: 0.5px;
    }

    .auth-user-info {
      display: flex;
      flex-direction: column;
      line-height: 1.25;
      text-align: left;
    }
    .auth-user-name {
      font-size: 12px;
      font-weight: 700;
      color: #fff;
    }
    .auth-user-role {
      font-size: 10px;
      color: rgba(255, 255, 255, 0.45);
      text-transform: capitalize;
    }

    .auth-caret {
      font-size: 10px;
      color: rgba(255, 255, 255, 0.4);
      margin-left: 2px;
    }

    /* ── Dropdown menu ─────────────────────────────────────── */
    .auth-dropdown {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      min-width: 160px;
      background: #fff;
      border-radius: 10px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
      border: 1px solid rgba(0, 0, 0, 0.08);
      padding: 6px 0;
      z-index: 2000;
      opacity: 0;
      pointer-events: none;
      transform: translateY(-6px);
      transition: opacity 0.18s ease, transform 0.18s ease;
    }
    .auth-dropdown.open {
      opacity: 1;
      pointer-events: all;
      transform: translateY(0);
    }

    .auth-dropdown-item {
      display: block;
      width: 100%;
      text-align: left;
      padding: 10px 16px;
      font-size: 13px;
      font-weight: 600;
      color: #222;
      background: transparent;
      border: none;
      cursor: pointer;
      font-family: inherit;
      text-decoration: none;
      transition: background 0.12s;
      white-space: nowrap;
    }
    .auth-dropdown-item:hover {
      background: #f5f5f5;
      color: var(--red, #C8102E);
    }
    .auth-dropdown-signout {
      color: #888;
      border-top: 1px solid #eee;
      margin-top: 4px;
    }
    .auth-dropdown-signout:hover {
      color: var(--red, #C8102E);
      background: #fff5f5;
    }

    /* ── Dropdown status badge (pending approval / role req.) ─ */
    .auth-dropdown-status {
      padding: 8px 16px 6px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      color: #555;
      border-bottom: 1px solid #eee;
      margin-bottom: 4px;
    }
    .auth-dropdown-status-pending {
      color: #b45309;
      background: #fffbeb;
    }

    /* ── Modal overlay ─────────────────────────────────────── */
    #heroes-login-modal {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.6);
      z-index: 3100;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s ease;
    }
    #heroes-login-modal.open {
      opacity: 1;
      pointer-events: all;
    }

    /* ── Modal card ────────────────────────────────────────── */
    .auth-modal-card {
      background: #fff;
      border-radius: 16px;
      padding: 36px 32px;
      width: 100%;
      max-width: 400px;
      box-shadow: 0 24px 64px rgba(0, 0, 0, 0.28);
      transform: scale(0.95);
      transition: transform 0.2s ease;
    }
    #heroes-login-modal.open .auth-modal-card {
      transform: scale(1);
    }

    /* ── Modal header (logo + title) ───────────────────────── */
    .auth-modal-header {
      display: flex;
      align-items: center;
      gap: 14px;
      margin-bottom: 24px;
    }
    .auth-modal-header img {
      width: 50px;
      height: 50px;
      border-radius: 50%;
      object-fit: contain;
      border: 2px solid var(--red, #C8102E);
      flex-shrink: 0;
    }
    .auth-modal-title {
      font-size: 20px;
      font-weight: 900;
      color: #111;
      line-height: 1.2;
    }
    .auth-modal-subtitle {
      font-size: 13px;
      color: #888;
      margin-top: 2px;
    }

    /* ── Form elements ─────────────────────────────────────── */
    .auth-form-group {
      margin-bottom: 14px;
    }
    .auth-form-label {
      display: block;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #666;
      margin-bottom: 5px;
    }
    .auth-form-input {
      width: 100%;
      padding: 10px 13px;
      border: 1px solid #ddd;
      border-radius: 7px;
      font-size: 14px;
      outline: none;
      font-family: inherit;
      box-sizing: border-box;
      transition: border-color 0.15s;
      color: #111;
    }
    .auth-form-input:focus {
      border-color: var(--red, #C8102E);
    }
    .auth-form-error {
      font-size: 13px;
      color: var(--red, #C8102E);
      min-height: 18px;
      margin-bottom: 10px;
    }

    /* ── Buttons ───────────────────────────────────────────── */
    .auth-submit-btn {
      display: block;
      width: 100%;
      padding: 13px;
      background: var(--red, #C8102E);
      color: #fff;
      border: none;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 800;
      cursor: pointer;
      font-family: inherit;
      transition: opacity 0.15s;
      margin-bottom: 8px;
    }
    .auth-submit-btn:hover   { opacity: 0.88; }
    .auth-submit-btn:disabled { opacity: 0.55; cursor: not-allowed; }

    .auth-secondary-btn {
      display: block;
      width: 100%;
      padding: 11px;
      background: transparent;
      color: #666;
      border: 1px solid #ddd;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      font-family: inherit;
      transition: background 0.15s;
      margin-bottom: 0;
    }
    .auth-secondary-btn:hover { background: #f5f5f5; }

    /* ── Footer / switch link ──────────────────────────────── */
    .auth-modal-footer {
      text-align: center;
      margin-top: 16px;
      font-size: 12px;
      color: #888;
    }
    .auth-switch-link {
      color: var(--red, #C8102E);
      font-weight: 700;
      cursor: pointer;
      text-decoration: none;
    }
    .auth-switch-link:hover { text-decoration: underline; }

    /* ── Approval / success state ──────────────────────────── */
    .auth-approval-state {
      text-align: center;
      padding: 12px 0 4px;
    }
    .auth-approval-icon {
      font-size: 52px;
      margin-bottom: 16px;
      line-height: 1;
    }
    .auth-approval-title {
      font-size: 20px;
      font-weight: 900;
      margin-bottom: 10px;
      color: #111;
    }
    .auth-approval-msg {
      font-size: 14px;
      color: #666;
      line-height: 1.6;
      margin-bottom: 24px;
    }

    /* ── Responsive ────────────────────────────────────────── */
    @media (max-width: 480px) {
      .auth-modal-card { padding: 28px 20px; }
      .auth-user-info  { display: none; }
      .auth-caret      { display: none; }
    }

  `;
  document.head.appendChild(style);


  // ── 2. Inject modal overlay into <body> ────────────────────
  const modal = document.createElement('div');
  modal.id = 'heroes-login-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', 'Sign in to Heroes Senior Softball');
  modal.innerHTML = `<div class="auth-modal-card"><div id="auth-modal-inner"></div></div>`;
  document.body.appendChild(modal);

  // Close when clicking the backdrop (outside the card)
  modal.addEventListener('click', e => {
    if (e.target === modal) HeroesAuth.hideLoginModal();
  });


  // ── 3. Close dropdown when clicking anywhere outside it ────
  document.addEventListener('click', e => {
    const dd = document.getElementById('auth-dropdown');
    if (!dd) return;
    if (dd.classList.contains('open') && !dd.closest('.auth-user-menu').contains(e.target)) {
      dd.classList.remove('open');
      const btn = dd.previousElementSibling;
      if (btn) btn.setAttribute('aria-expanded', 'false');
    }
  });

  // ── 3b. Delegated fallback for the Sign Out button. Inline onclick
  //        handlers on innerHTML-injected nodes can fail to invoke in some
  //        contexts (CSP, certain extensions, scope quirks); this guarantees
  //        the button still works.
  document.addEventListener('click', e => {
    const btn = e.target.closest?.('.auth-dropdown-signout');
    if (btn) HeroesAuth.signOut();
  });


  // ── 4. Initialise auth (loads session + refreshes nav) ─────
  HeroesAuth.init();

});
