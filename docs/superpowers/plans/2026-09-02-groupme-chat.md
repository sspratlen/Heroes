# GroupMe Chat Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a CHAT tab to the My Heroes `/my` page that lets logged-in users read and send messages in their GroupMe groups via per-user OAuth.

**Architecture:** `groupme-callback.html` receives the OAuth redirect and posts the token back to the main window. `heroes-scoreboard.js` handles everything else: tab UI, GroupMe API calls (direct from browser, no Edge Function), and 30-second polling. Token stored in `profiles.groupme_token`.

**Tech Stack:** Vanilla JS, GroupMe REST API (CORS-enabled), Supabase JS v2, GitHub Pages static hosting.

> ⚠️ **Supabase MCP note:** Task 1 requires `apply_migration` via the Supabase MCP. This MCP only works in the main interactive Claude session — subagents cannot authenticate. Run Task 1 from the main session before dispatching subagents for other tasks.

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `supabase/groupme-token.sql` | Create | Migration SQL for new column |
| `assets/js/data.js` | Modify (line ~453) | Add `GROUPME_CLIENT_ID` constant |
| `groupme-callback.html` | Create | OAuth redirect landing page |
| `assets/js/heroes-scoreboard.js` | Modify (multiple) | GroupMe helpers, chat UI, tab bar, CSS |

---

## Task 1: DB Migration — add groupme_token to profiles

> ⚠️ **Must run from main Claude session — not a subagent.**

**Files:**
- Create: `supabase/groupme-token.sql`

- [ ] **Step 1: Create the migration SQL file**

```sql
-- supabase/groupme-token.sql
-- Adds the groupme_token column to profiles.
-- The column stores the user's GroupMe OAuth access token.
-- Empty string = not connected.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS groupme_token text DEFAULT '';
```

- [ ] **Step 2: Apply via Supabase MCP**

Run `apply_migration` with:
- `project_id`: `mpgbgucmnxowteonldoh`
- `name`: `add_groupme_token`
- `query`: the SQL above

- [ ] **Step 3: Verify the column exists**

Run `execute_sql` with:
```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name = 'groupme_token';
```
Expected: one row with `data_type = text`, `column_default = ''`

- [ ] **Step 4: Commit the SQL file**

```bash
cd "Heroes Website/Heroes Website"
git add supabase/groupme-token.sql
git commit -m "feat: add groupme_token column to profiles"
```

---

## Task 2: Add GROUPME_CLIENT_ID to data.js

**Files:**
- Modify: `Heroes Website/Heroes Website/assets/js/data.js` (around line 452)

> **Before you start:** Register an application at `https://dev.groupme.com` (Applications → Create Application). Set the Callback URL to `https://heroesseniorsoftball.com/groupme-callback.html`. Copy the Client ID (not the secret). Paste it as the value below.

- [ ] **Step 1: Open data.js and find the SUPABASE constants block (around line 449)**

```js
// Current lines 449-452 in data.js:
// ─── SUPABASE CONFIG ──────────────────────────────────────
// Replace these two values after creating your Supabase project
const SUPABASE_URL     = 'https://mpgbgucmnxowteonldoh.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_qEfH752_O5r7F9pdKTalEA_B8P0LkV0';
```

- [ ] **Step 2: Add GROUPME_CLIENT_ID immediately after SUPABASE_ANON_KEY**

Replace the block so it reads:
```js
// ─── SUPABASE CONFIG ──────────────────────────────────────
// Replace these two values after creating your Supabase project
const SUPABASE_URL     = 'https://mpgbgucmnxowteonldoh.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_qEfH752_O5r7F9pdKTalEA_B8P0LkV0';

// ─── GROUPME CONFIG ───────────────────────────────────────
// Get this from https://dev.groupme.com → Applications → your app → Client ID
const GROUPME_CLIENT_ID = 'YOUR_GROUPME_CLIENT_ID';
```

Replace `'YOUR_GROUPME_CLIENT_ID'` with the actual Client ID from dev.groupme.com.

- [ ] **Step 3: Commit**

```bash
git add assets/js/data.js
git commit -m "feat: add GROUPME_CLIENT_ID constant to data.js"
```

---

## Task 3: Create groupme-callback.html

**Files:**
- Create: `Heroes Website/Heroes Website/groupme-callback.html`

This page lives at `heroesseniorsoftball.com/groupme-callback.html`. GroupMe redirects here after OAuth, passing `?access_token=TOKEN`. The page reads the token, posts it to the opener window, then closes itself. Users see it for less than a second.

- [ ] **Step 1: Create the file**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Connecting GroupMe…</title>
  <style>
    body {
      margin: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: #111;
      font-family: Arial, Helvetica, sans-serif;
      color: #fff;
      font-size: 15px;
    }
  </style>
</head>
<body>
  Connecting…
  <script>
    (function () {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('access_token');
      if (token && window.opener) {
        try {
          window.opener.postMessage(
            { groupmeToken: token },
            window.location.origin
          );
        } catch (_) {}
      }
      window.close();
    })();
  </script>
</body>
</html>
```

- [ ] **Step 2: Verify the file is at the site root (same level as index.html, player-invite.html)**

```bash
ls Heroes\ Website/Heroes\ Website/*.html
```
Expected: `groupme-callback.html` appears in the list alongside `index.html`, `player-invite.html`, `fan-invite.html`.

- [ ] **Step 3: Commit**

```bash
git add groupme-callback.html
git commit -m "feat: add groupme-callback.html for OAuth redirect"
```

---

## Task 4: Add GroupMe helpers, OAuth handler, and chat functions to heroes-scoreboard.js

**Files:**
- Modify: `Heroes Website/Heroes Website/assets/js/heroes-scoreboard.js`

Insert the entire block below **after** the closing of `window.saveMyAvailability` (currently around line 461, just before the `// ── Main render` comment). The block goes inside the existing IIFE.

- [ ] **Step 1: Find the insertion point**

Locate this line in heroes-scoreboard.js:
```js
  // ── Main render ─────────────────────────────────────────────
```

Insert the following block immediately BEFORE that comment:

```js
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
      saveGroupMeToken(e.data.groupmeToken).then(() => renderChatTab());
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
    if (tab !== 'chat' && _gmPollTimer) {
      clearInterval(_gmPollTimer);
      _gmPollTimer = null;
      _gmCurrentGroupId = null;
    }
    document.querySelectorAll('.mh-tab[id^="mh-tab-"]').forEach(b => b.classList.remove('mh-tab-on'));
    document.getElementById('mh-tab-' + tab)?.classList.add('mh-tab-on');
    ['avail', 'chat'].forEach(p => {
      const el = document.getElementById('mh-panel-' + p);
      if (el) el.hidden = (p !== tab);
    });
    if (tab === 'chat') renderChatTab();
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
    const data  = await gmFetch(`/groups/${groupId}/messages?limit=20`, token);
    const msgsEl = document.getElementById('gm-msgs');
    if (!msgsEl) return;
    if (data._unauthorized) { await clearGroupMeToken(); return; }
    const msgs = data.messages || [];
    if (msgs.length === 0) {
      msgsEl.innerHTML = '<div style="text-align:center;padding:40px;color:#888;font-size:13px">No messages yet. Be the first to say something!</div>';
      return;
    }
    _gmLastMessageId = msgs[0].id;
    msgsEl.innerHTML = [...msgs].reverse().map(gmRenderMsg).join('');
    msgsEl.scrollTop = msgsEl.scrollHeight;
  }

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

    threadPane.innerHTML = `
      <div class="gm-thread-head">
        <button class="gm-back-btn" onclick="gmBackToGroups()">← Groups</button>
        <div class="gm-thread-title">${_escHtml(groupName)}</div>
      </div>
      <div class="gm-msgs" id="gm-msgs"><div class="gm-loading"><div class="gm-spinner"></div></div></div>
      <div class="gm-send-box">
        <textarea class="gm-send-input" id="gm-send-input" placeholder="Send a message…" rows="1"
          onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();gmSendMessage('${groupId}')}"></textarea>
        <button class="gm-send-btn" onclick="gmSendMessage('${groupId}')">Send</button>
      </div>`;

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

  async function renderChatTab() {
    const panel = document.getElementById('mh-panel-chat');
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
            <div class="gm-grp-row" data-gid="${g.id}"
                onclick="openGroupMeGroup('${g.id}', ${JSON.stringify(_escHtml(g.name || ''))})">
              <div class="gm-grp-av" style="background:${_gmColor(g.id)}">${(g.name || '?')[0].toUpperCase()}</div>
              <div class="gm-grp-info">
                <div class="gm-grp-name">${_escHtml(g.name || '')}</div>
                <div class="gm-grp-meta">${(g.members || []).length} members</div>
                ${g.messages?.preview?.preview
                  ? `<div class="gm-grp-preview">${_escHtml((g.messages.preview.preview || '').substring(0, 60))}</div>`
                  : ''}
              </div>
            </div>`).join('')}
        </div>
        <div class="gm-thread-pane" id="gm-thread-pane">
          <div class="gm-thread-empty">
            <div style="font-size:40px;margin-bottom:12px">💬</div>
            <div style="font-size:14px;color:#888">Select a group to start chatting</div>
          </div>
        </div>
      </div>`;
  }

```

- [ ] **Step 2: Commit**

```bash
git add assets/js/heroes-scoreboard.js
git commit -m "feat: add GroupMe helpers, OAuth popup, and chat functions to heroes-scoreboard"
```

---

## Task 5: Modify renderMyHeroes() tab bar and add chat panel

**Files:**
- Modify: `Heroes Website/Heroes Website/assets/js/heroes-scoreboard.js`

Find the `<!-- TAB BAR -->` section inside `renderMyHeroes()` and the `<!-- EVENT CARDS -->` section that follows. Replace both with the version below.

- [ ] **Step 1: Find and replace the TAB BAR + EVENT CARDS section**

**Old (find this exact block):**
```js
        <!-- TAB BAR -->
        <div class="mh-tabs">
          <div class="mh-tabs-in">
            <button class="mh-tab mh-tab-on">AVAILABILITY</button>
            <button class="mh-tab" data-route="/events">EVENTS</button>
            ${isStaff ? '<a href="admin.html" class="mh-adm-lnk">⚙ Admin Panel</a>' : ''}
          </div>
        </div>

        <!-- EVENT CARDS -->
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

      </div>${MH_CSS}`);
```

**New (replace with this):**
```js
        <!-- TAB BAR -->
        <div class="mh-tabs">
          <div class="mh-tabs-in">
            <button class="mh-tab mh-tab-on" id="mh-tab-avail" onclick="switchMyTab('avail')">AVAILABILITY</button>
            <button class="mh-tab" id="mh-tab-chat" onclick="switchMyTab('chat')">CHAT</button>
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

        <!-- CHAT PANEL -->
        <div id="mh-panel-chat" hidden></div>

      </div>${MH_CSS}`);
```

- [ ] **Step 2: Commit**

```bash
git add assets/js/heroes-scoreboard.js
git commit -m "feat: add CHAT tab and panel divs to renderMyHeroes"
```

---

## Task 6: Add chat CSS to MH_CSS and stop poll on navigation

**Files:**
- Modify: `Heroes Website/Heroes Website/assets/js/heroes-scoreboard.js`

Two changes in this task: add CSS to `MH_CSS` and add poll cleanup to `Router.dispatch`.

- [ ] **Step 1: Add chat CSS inside MH_CSS**

Find the end of the `MH_CSS` constant — the line that reads:
```js
    }
  </style>`;
```
(The `}` closes the `@media (max-width: 767px)` block — there's only one such block in MH_CSS.)

Insert the following block BEFORE that closing `}</style>` line:

```css
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

    .gm-groups-pane { width:280px; flex-shrink:0; border-right:1px solid #e5e7eb; overflow-y:auto; background:#fff; }
    .gm-grp-row { display:flex; align-items:center; gap:12px; padding:14px 16px; cursor:pointer; border-bottom:1px solid #f3f4f6; transition:background 0.1s; }
    .gm-grp-row:hover { background:#f9fafb; }
    .gm-grp-row.gm-grp-sel { background:#fef2f4; border-left:3px solid #C8102E; }
    .gm-grp-av { width:42px; height:42px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:18px; font-weight:900; color:#fff; flex-shrink:0; }
    .gm-grp-info { min-width:0; flex:1; }
    .gm-grp-name { font-size:13px; font-weight:700; color:#111; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .gm-grp-meta { font-size:11px; color:#999; margin-top:2px; }
    .gm-grp-preview { font-size:12px; color:#777; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-top:2px; }

    .gm-thread-pane { flex:1; display:flex; flex-direction:column; min-width:0; background:#f8f8f8; }
    .gm-thread-empty { display:flex; flex-direction:column; align-items:center; justify-content:center; flex:1; color:#888; }
    .gm-thread-head { display:flex; align-items:center; gap:12px; padding:12px 16px; background:#fff; border-bottom:1px solid #e5e7eb; flex-shrink:0; }
    .gm-back-btn { display:none; padding:6px 12px; background:transparent; border:1px solid #ddd; border-radius:6px; font-size:12px; font-weight:700; cursor:pointer; color:#555; font-family:inherit; }
    .gm-thread-title { font-size:14px; font-weight:800; color:#111; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

    .gm-msgs { flex:1; overflow-y:auto; padding:16px; display:flex; flex-direction:column; gap:10px; }
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
```

After inserting, the end of MH_CSS should look like:

```js
    ...existing media query content...
      .gm-send-err { font-size:12px; color:#dc2626; padding:4px 0; }
    }
  </style>`;
```

Wait — the chat CSS must go OUTSIDE the `@media` block, not inside it. Insert the chat CSS block BEFORE the `@media (max-width: 767px)` block that already exists. Then add just the responsive overrides inside that media query.

The existing `@media (max-width: 767px)` block is for `.mh-*` styles. After the chat CSS block (outside `@media`), add these lines INSIDE the existing `@media (max-width: 767px)` block (just before the closing `}`):

```css
      .gm-panes { height:calc(100vh - 200px); }
      .gm-groups-pane { width:100%; border-right:none; }
      .gm-groups-pane.gm-mobile-hidden { display:none; }
      .gm-thread-pane { display:none; width:100%; }
      .gm-thread-pane.gm-mobile-visible { display:flex; }
      .gm-back-btn { display:block; }
```

- [ ] **Step 2: Patch Router.dispatch to stop poll on navigation**

Find the existing `Router.dispatch` patch (currently near the bottom of the file):

```js
  Router.dispatch = function dispatchPatched() {
    origDispatch();
    setTimeout(updateTeamStripMeta, 0);
  };
```

Replace with:
```js
  Router.dispatch = function dispatchPatched() {
    if (_gmPollTimer) { clearInterval(_gmPollTimer); _gmPollTimer = null; _gmCurrentGroupId = null; }
    origDispatch();
    setTimeout(updateTeamStripMeta, 0);
  };
```

- [ ] **Step 3: Commit**

```bash
git add assets/js/heroes-scoreboard.js
git commit -m "feat: add GroupMe chat CSS and stop poll on navigation"
```

---

## Task 7: Smoke test

No automated test framework — manual verification steps.

- [ ] **Step 1: Open the My Heroes page**

Navigate to `https://heroesseniorsoftball.com/#/my` (or open `index.html` locally and navigate to `/my`). Sign in with a player account.

- [ ] **Step 2: Verify CHAT tab appears**

The tab bar should now show: **AVAILABILITY | CHAT | EVENTS**. Clicking AVAILABILITY still shows event cards. Clicking EVENTS still navigates. Clicking CHAT shows the chat panel.

- [ ] **Step 3: Verify Connect GroupMe card**

First time clicking CHAT should show:
- 💬 icon
- "Connect GroupMe" heading
- "Link your GroupMe account…" subtitle
- Blue "Connect GroupMe" button

- [ ] **Step 4: Test popup blocked state**

If the browser blocks the popup, the error message "Allow popups for this site to connect GroupMe." should appear under the button.

- [ ] **Step 5: Test OAuth (requires real Client ID)**

With a real `GROUPME_CLIENT_ID` set in data.js:
- Click "Connect GroupMe" → popup opens at `oauth.groupme.com`
- After authorizing → popup closes automatically → groups list loads
- Groups show name, member count, last message preview
- Clicking a group loads the message thread
- Typing and pressing Enter or clicking Send posts the message

- [ ] **Step 6: Verify poll stops on navigation**

Open browser devtools Network tab. Select a group (poll starts). Navigate away from `/my` to `/`. Confirm no further GroupMe API requests appear in the Network tab after navigation.

---

## Task 8: Copy to staging and push both repos

- [ ] **Step 1: Copy all changed files to staging**

```bash
cp "Heroes Website/Heroes Website/groupme-callback.html" "Heroes-staging/groupme-callback.html"
cp "Heroes Website/Heroes Website/assets/js/data.js" "Heroes-staging/assets/js/data.js"
cp "Heroes Website/Heroes Website/assets/js/heroes-scoreboard.js" "Heroes-staging/assets/js/heroes-scoreboard.js"
```

- [ ] **Step 2: Commit staging**

```bash
cd "Heroes-staging"
git add groupme-callback.html assets/js/data.js assets/js/heroes-scoreboard.js
git commit -m "feat: GroupMe chat integration — CHAT tab on /my page"
```

- [ ] **Step 3: Push prod**

```bash
cd "Heroes Website/Heroes Website"
git push
```

- [ ] **Step 4: Push staging**

```bash
cd "Heroes-staging"
git push
```

- [ ] **Step 5: Verify deployment**

Open `https://heroesseniorsoftball.com/groupme-callback.html` — should show "Connecting…" briefly (or a blank white page with no JS error). Open `https://heroesseniorsoftball.com/#/my` → CHAT tab should appear.
