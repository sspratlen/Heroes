/* ============================================================
   ADMIN — USERS
   Every login account (Supabase auth user + profiles row), including
   accounts not linked to a roster player. Admin-only.

   Actions: link/unlink roster player, role & approval, reset password,
   delete account. Uses admin.html helpers (setContent, openModal,
   closeModal, toast, auditLog, ROLE_PILL, _adminProfile) and the
   admin-get-logins / admin-set-password / delete-player Edge Functions.
   Database rules (RLS + private.profiles_guard) enforce the same limits.
   ============================================================ */
(function () {
  'use strict';

  const ROLES = [
    { value: 'player',  label: 'Player'  },
    { value: 'fan',     label: 'Fan'     },
    { value: 'coach',   label: 'Coach'   },
    { value: 'manager', label: 'Manager' },
    { value: 'admin',   label: 'Admin'   },
  ];
  const FILTERS = [
    { key: 'all',      label: 'All' },
    { key: 'unlinked', label: 'Unlinked' },
    { key: 'pending',  label: 'Pending approval' },
    { key: 'admins',   label: 'Admins' },
  ];

  let _users  = [];   // profiles rows
  let _logins = {};   // email → { lastLogin, createdAt }
  let _filter = 'all';
  let _query  = '';

  // ── helpers ────────────────────────────────────────────────
  const esc = s => String(s ?? '').replace(/[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const roster     = () => loadData().players || [];
  const playerById = id => roster().find(p => p.id === id) || null;
  const playerName = p => p ? `${p.firstName} ${p.lastName}` : '';
  const userName   = u => u.display_name || u.email;
  const isMe       = u => u.id === _adminProfile?.id;
  const approvedAdmins = () => _users.filter(u => u.role === 'admin' && u.approved);

  // Same rule as the roster page: player link first, else matching email.
  function linkedPlayer(u) {
    if (u.player_id) return playerById(u.player_id);
    const email = (u.email || '').toLowerCase();
    return email ? roster().find(p => (p.email || '').toLowerCase() === email) || null : null;
  }

  function linkedToOther(playerId, userId) {
    return _users.find(x => x.id !== userId && linkedPlayer(x)?.id === playerId) || null;
  }

  // Unique roster player with the same last name and first initial, not already linked.
  function suggestedPlayer(u) {
    const parts = (u.display_name || '').trim().split(/\s+/);
    if (parts.length < 2) return null;
    const first = parts[0][0].toLowerCase();
    const last  = parts[parts.length - 1].toLowerCase();
    const hits = roster().filter(p =>
      (p.lastName || '').toLowerCase() === last &&
      (p.firstName || '')[0]?.toLowerCase() === first &&
      !linkedToOther(p.id, u.id));
    return hits.length === 1 ? hits[0] : null;
  }

  function relTime(iso) {
    if (!iso) return '<span style="color:#9ca3af">Never</span>';
    const d = new Date(iso);
    const days = Math.floor((Date.now() - d) / 86400000);
    const label = days <= 0 ? 'Today' : days === 1 ? 'Yesterday'
      : days < 30 ? `${days}d ago` : days < 365 ? `${Math.floor(days / 30)}mo ago`
      : `${Math.floor(days / 365)}yr ago`;
    return `<span title="${esc(d.toLocaleString())}">${label}</span>`;
  }

  function rolePill(role) {
    const style = role === 'fan' ? 'background:#ecfeff;color:#155e75'
      : (ROLE_PILL[role] || ROLE_PILL.player);
    return `<span style="padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700;${style}">${esc(role || 'player')}</span>`;
  }

  function matchesFilter(u) {
    if (_filter === 'unlinked' && (linkedPlayer(u) || !['player', 'coach', 'manager'].includes(u.role))) return false;
    if (_filter === 'pending'  && u.approved) return false;
    if (_filter === 'admins'   && u.role !== 'admin') return false;
    if (_query) {
      const q = _query.toLowerCase();
      if (!(`${u.display_name || ''} ${u.email || ''}`.toLowerCase().includes(q))) return false;
    }
    return true;
  }

  function filterCount(key) {
    const saved = [_filter, _query];
    _filter = key; _query = '';
    const n = _users.filter(matchesFilter).length;
    [_filter, _query] = saved;
    return n;
  }

  async function authHeaders() {
    const { data: { session } } = await _getClient().auth.getSession();
    if (!session?.access_token) throw new Error('Admin session expired. Sign in again.');
    return {
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    };
  }

  async function fetchLogins() {
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-get-logins`, { headers: await authHeaders() });
      if (!res.ok) return {};
      return (await res.json()).users || {};
    } catch (_) { return {}; }
  }

  async function updateProfile(u, fields) {
    const { data, error } = await _getClient()
      .from('profiles').update(fields).eq('id', u.id).select('id');
    if (error) throw error;
    if (!data || !data.length) throw new Error('No change was saved (permission denied).');
  }

  const modalError = msg => {
    const el = document.getElementById('um-error');
    if (el) el.textContent = msg;
  };

  // ── page ──────────────────────────────────────────────────
  window.renderUsers = async function () {
    if (_adminProfile?.role !== 'admin') {
      setContent('<div class="alert alert-error">Only admins can manage user accounts.</div>');
      return;
    }
    setContent('<div style="padding:40px;text-align:center;color:#888">Loading accounts…</div>');

    const [{ data, error }, logins] = await Promise.all([
      _getClient().from('profiles')
        .select('id, email, display_name, role, approved, player_id, pending_role, created_at')
        .order('created_at', { ascending: false }),
      fetchLogins(),
    ]);
    if (error) {
      setContent(`<div class="alert alert-error">Could not load accounts: ${esc(error.message)}</div>`);
      return;
    }
    _users  = data || [];
    _logins = logins;
    draw();
  };

  function draw() {
    const chips = FILTERS.map(f => `
      <button class="btn btn-sm ${_filter === f.key ? 'btn-primary' : 'btn-secondary'}"
        onclick="usersSetFilter('${f.key}')">${f.label} (${filterCount(f.key)})</button>`).join('');

    setContent(`
      <div class="admin-table-wrap">
        <div class="admin-table-header" style="flex-wrap:wrap;gap:12px">
          <h3>Login Accounts <span style="color:#888;font-weight:500;font-size:13px">${_users.length} total</span></h3>
          <input class="form-input" id="um-search" placeholder="Search name or email…"
            value="${esc(_query)}" oninput="usersSearch(this.value)" style="max-width:260px">
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;padding:0 16px 12px">${chips}</div>
        <div style="overflow-x:auto">
          <table class="admin-table">
            <thead><tr>
              <th>Name</th><th>Email</th><th>Role</th><th>Status</th>
              <th>Roster player</th><th>Last login</th><th>Joined</th><th>Actions</th>
            </tr></thead>
            <tbody id="um-rows"></tbody>
          </table>
        </div>
      </div>`);
    drawRows();
  }

  function drawRows() {
    const tbody = document.getElementById('um-rows');
    if (!tbody) return;
    const rows = _users.filter(matchesFilter);
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:24px;color:#888">No accounts match.</td></tr>';
      return;
    }
    tbody.innerHTML = rows.map(u => {
      const linked = linkedPlayer(u);
      const needsLink = !linked && ['player', 'coach', 'manager'].includes(u.role);
      const sugg = needsLink ? suggestedPlayer(u) : null;
      const rosterCell = linked
        ? `${esc(playerName(linked))}${u.player_id ? '' : ' <span style="color:#9ca3af;font-size:11px">(by email)</span>'}`
        : needsLink
          ? `<span style="color:#b45309;font-weight:600">Not linked</span>${sugg
              ? `<br><button class="action-btn action-view" style="margin-top:4px"
                   onclick="usersQuickLink('${u.id}','${sugg.id}')">Link to ${esc(playerName(sugg))}?</button>`
              : ''}`
          : '<span style="color:#9ca3af">—</span>';
      const status = u.approved
        ? '<span style="color:#15803d;font-weight:600">Approved</span>'
        : '<span style="color:#b45309;font-weight:600">Pending</span>';
      const me = isMe(u) ? ' <span style="color:#9ca3af;font-size:11px">(you)</span>' : '';
      return `
        <tr style="${needsLink ? 'background:#fffbeb' : ''}">
          <td><strong>${esc(u.display_name || '—')}</strong>${me}</td>
          <td style="font-size:12px">${esc(u.email)}</td>
          <td>${rolePill(u.role)}</td>
          <td>${status}</td>
          <td style="font-size:13px">${rosterCell}</td>
          <td style="font-size:12px">${relTime(_logins[(u.email || '').toLowerCase()]?.lastLogin)}</td>
          <td style="font-size:12px">${esc(new Date(u.created_at).toLocaleDateString())}</td>
          <td style="white-space:nowrap">
            <button class="action-btn action-edit" onclick="usersLinkModal('${u.id}')">Link</button>
            <button class="action-btn action-edit" onclick="usersRoleModal('${u.id}')">Role</button>
            <button class="action-btn action-edit" onclick="usersPasswordModal('${u.id}')">Password</button>
            ${isMe(u) ? '' : `<button class="action-btn action-delete" onclick="usersDeleteModal('${u.id}')">Delete</button>`}
          </td>
        </tr>`;
    }).join('');
  }

  window.usersSetFilter = key => { _filter = key; draw(); };
  window.usersSearch    = q   => { _query = q.trim(); drawRows(); };

  const findUser = id => _users.find(u => u.id === id);

  // ── link / unlink ─────────────────────────────────────────
  async function saveLink(u, playerId) {
    const before = { player_id: u.player_id };
    await updateProfile(u, { player_id: playerId });
    const p = playerById(playerId);
    await auditLog('user_link', 'profiles', u.id,
      playerId ? `Linked ${userName(u)} to roster player ${playerName(p)}` : `Unlinked ${userName(u)} from roster`,
      { previousValue: before, newValue: { player_id: playerId } });
  }

  window.usersQuickLink = async function (userId, playerId) {
    const u = findUser(userId), p = playerById(playerId);
    if (!u || !p) return;
    if (!confirm(`Link ${userName(u)} (${u.email}) to roster player ${playerName(p)}?`)) return;
    try {
      await saveLink(u, playerId);
      toast(`Linked ${userName(u)} → ${playerName(p)}`);
      renderUsers();
    } catch (e) { toast('Could not link: ' + e.message, 'error'); }
  };

  window.usersLinkModal = function (userId) {
    const u = findUser(userId);
    if (!u) return;
    const current = linkedPlayer(u);
    const byEmailOnly = current && !u.player_id;
    const options = [...roster()]
      .sort((a, b) => (b.active - a.active) || playerName(a).localeCompare(playerName(b)))
      .map(p => {
        const other = linkedToOther(p.id, u.id);
        const note = [p.active ? '' : 'inactive', other ? `linked to ${userName(other)}` : ''].filter(Boolean).join(', ');
        return `<option value="${esc(p.id)}"${p.id === current?.id ? ' selected' : ''}${other ? ' disabled' : ''}>
          ${esc(playerName(p))}${p.number ? ' #' + esc(p.number) : ''}${note ? ' — ' + esc(note) : ''}</option>`;
      }).join('');

    openModal(`Roster link — ${userName(u)}`, `
      <p style="font-size:13px;color:#555;margin-top:0">${esc(u.email)}</p>
      ${byEmailOnly ? `<div class="alert alert-info" style="font-size:12px">Currently linked to
        <strong>${esc(playerName(current))}</strong> because the emails match. Picking a player below
        sets an explicit link instead.</div>` : ''}
      <div class="form-group">
        <label class="form-label">Search roster</label>
        <input class="form-input" id="um-link-search" placeholder="Type a name…" oninput="usersFilterLinkOptions(this.value)">
      </div>
      <div class="form-group">
        <label class="form-label">Roster player</label>
        <select class="form-select" id="um-link-player" size="10" style="height:auto">
          <option value="">— Not linked —</option>
          ${options}
        </select>
      </div>
      <div id="um-error" style="color:#dc2626;font-size:13px;min-height:18px"></div>`,
      'Save Link', async () => {
        const val = document.getElementById('um-link-player').value || null;
        if (val === (u.player_id || null)) { closeModal(); return; }
        try {
          await saveLink(u, val);
          closeModal();
          toast(val ? `Linked ${userName(u)} → ${playerName(playerById(val))}` : `Unlinked ${userName(u)}`);
          renderUsers();
        } catch (e) { modalError('Could not save: ' + e.message); }
      });
  };

  window.usersFilterLinkOptions = function (q) {
    const needle = q.trim().toLowerCase();
    document.querySelectorAll('#um-link-player option').forEach(o => {
      o.hidden = !!needle && o.value !== '' && !o.textContent.toLowerCase().includes(needle);
    });
  };

  // ── role & approval ───────────────────────────────────────
  window.usersRoleModal = function (userId) {
    const u = findUser(userId);
    if (!u) return;
    openModal(`Role & approval — ${userName(u)}`, `
      <p style="font-size:13px;color:#555;margin-top:0">${esc(u.email)}</p>
      ${u.pending_role ? `<div class="alert alert-info" style="font-size:12px">Requested role:
        <strong>${esc(u.pending_role)}</strong></div>` : ''}
      <div class="form-group">
        <label class="form-label">Role</label>
        <select class="form-select" id="um-role">
          ${ROLES.map(r => `<option value="${r.value}"${r.value === (u.role || 'player') ? ' selected' : ''}>${r.label}</option>`).join('')}
        </select>
      </div>
      <label class="form-check" style="display:flex;align-items:center;gap:8px;cursor:pointer">
        <input type="checkbox" id="um-approved"${u.approved ? ' checked' : ''}> Approved (can sign in and use member features)
      </label>
      <p class="form-hint" style="font-size:12px;color:#888">New sign-ups that should get the welcome email
        are best approved from Account Requests.</p>
      <div id="um-error" style="color:#dc2626;font-size:13px;min-height:18px"></div>`,
      'Save', async () => {
        const role     = document.getElementById('um-role').value;
        const approved = document.getElementById('um-approved').checked;
        if (role === u.role && approved === !!u.approved) { closeModal(); return; }

        const losesAdmin = u.role === 'admin' && u.approved && (role !== 'admin' || !approved);
        if (isMe(u) && losesAdmin) { modalError('You cannot remove your own admin access.'); return; }
        if (losesAdmin && approvedAdmins().length <= 1) { modalError('This is the last admin — make someone else an admin first.'); return; }

        const fields = { role, approved };
        if (u.pending_role && u.pending_role === role) fields.pending_role = null;
        try {
          await updateProfile(u, fields);
          await auditLog('user_role', 'profiles', u.id,
            `${userName(u)}: ${u.role}${u.approved ? '' : ' (pending)'} → ${role}${approved ? '' : ' (pending)'}`,
            { previousValue: { role: u.role, approved: u.approved }, newValue: { role, approved } });
          closeModal();
          toast(`${userName(u)} is now ${role}${approved ? '' : ' (pending)'}`);
          renderUsers();
        } catch (e) { modalError('Could not save: ' + e.message); }
      });
  };

  // ── reset password ────────────────────────────────────────
  window.usersPasswordModal = function (userId) {
    const u = findUser(userId);
    if (!u) return;
    openModal(`Reset password — ${userName(u)}`, `
      <p style="font-size:13px;color:#555;margin-top:0">${esc(u.email)}</p>
      <div class="form-group">
        <label class="form-label">New password</label>
        <input class="form-input" type="password" id="um-pw" autocomplete="new-password" placeholder="Min 8 characters">
      </div>
      <div class="form-group">
        <label class="form-label">Confirm password</label>
        <input class="form-input" type="password" id="um-pw2" autocomplete="new-password">
      </div>
      <label class="form-check" style="display:flex;align-items:center;gap:8px;cursor:pointer">
        <input type="checkbox" id="um-must-change" checked> Make them choose a new password at next sign-in
      </label>
      <div id="um-error" style="color:#dc2626;font-size:13px;min-height:18px"></div>`,
      'Set Password', async () => {
        const pw  = document.getElementById('um-pw').value;
        const pw2 = document.getElementById('um-pw2').value;
        const mustChangePassword = document.getElementById('um-must-change').checked;
        const pwErr = await HeroesPassword.check(pw);
        if (pwErr)      { modalError(pwErr); return; }
        if (pw !== pw2) { modalError('Passwords do not match.'); return; }
        try {
          const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-set-password`, {
            method: 'POST', headers: await authHeaders(),
            body: JSON.stringify({ email: u.email, password: pw, mustChangePassword }),
          });
          const body = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
          await auditLog('user_password', 'profiles', u.id,
            `Password reset for ${userName(u)}${mustChangePassword ? ' (must change at next sign-in)' : ''}`);
          closeModal();
          toast(`Password set for ${userName(u)}`);
        } catch (e) { modalError('Could not set password: ' + e.message); }
      });
  };

  // ── delete ────────────────────────────────────────────────
  window.usersDeleteModal = function (userId) {
    const u = findUser(userId);
    if (!u) return;
    if (isMe(u)) { toast('You cannot delete your own account.', 'warning'); return; }
    if (u.role === 'admin' && u.approved && approvedAdmins().length <= 1) {
      toast('This is the last admin — make someone else an admin first.', 'warning'); return;
    }
    const linked = linkedPlayer(u);
    openModal(`Delete account — ${userName(u)}`, `
      <div class="alert alert-error" style="font-size:13px">
        This permanently deletes the login <strong>${esc(u.email)}</strong>, its profile and any RSVPs.
        It cannot be undone.
        ${linked ? `<br>The roster record for <strong>${esc(playerName(linked))}</strong> is kept.` : ''}
      </div>
      <div class="form-group">
        <label class="form-label">Type the email address to confirm</label>
        <input class="form-input" id="um-del-confirm" autocomplete="off" placeholder="${esc(u.email)}">
      </div>
      <div id="um-error" style="color:#dc2626;font-size:13px;min-height:18px"></div>`,
      'Delete Account', async () => {
        const typed = document.getElementById('um-del-confirm').value.trim().toLowerCase();
        if (typed !== (u.email || '').toLowerCase()) { modalError('The email does not match.'); return; }
        try {
          const res = await fetch(`${SUPABASE_URL}/functions/v1/delete-player`, {
            method: 'POST', headers: await authHeaders(), body: JSON.stringify({ email: u.email }),
          });
          const body = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
          if (!body.deleted) throw new Error('No account found for that email.');
          await auditLog('user_delete', 'profiles', u.id, `Deleted login account ${userName(u)} (${u.email})`,
            { previousValue: { email: u.email, display_name: u.display_name, role: u.role, player_id: u.player_id } });
          closeModal();
          toast(`Deleted ${userName(u)}`);
          renderUsers();
        } catch (e) { modalError('Could not delete: ' + e.message); }
      });
  };
})();
