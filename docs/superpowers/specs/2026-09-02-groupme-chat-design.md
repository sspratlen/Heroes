# GroupMe Chat Integration Design

> **For agentic workers:** Use superpowers:writing-plans to create the implementation plan from this spec.

**Goal:** Embed a full GroupMe chat experience (read + send) in the My Heroes `/my` page as a new CHAT tab, using per-user OAuth so messages are sent as the actual logged-in user.

---

## Architecture

### Files

| File | Change |
|---|---|
| `groupme-callback.html` | New — OAuth redirect landing page |
| `assets/js/heroes-scoreboard.js` | Modified — adds CHAT tab + full chat UI |
| `assets/js/data.js` | Modified — add `GROUPME_CLIENT_ID` constant |
| `supabase/groupme-token.sql` | New — migration to add `groupme_token` column |

### No Edge Functions needed
GroupMe's REST API (`api.groupme.com/v3`) supports CORS and accepts the access token as a query parameter. All API calls are made directly from the browser. The Client Secret is not used — GroupMe's implicit OAuth flow for browser apps returns the token directly to the redirect URI.

### GroupMe Client ID
Stored as `const GROUPME_CLIENT_ID = '...'` in `data.js`, same pattern as `SUPABASE_URL` and `SUPABASE_ANON_KEY`. Public — safe to expose in client code.

---

## Database Schema

```sql
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS groupme_token text DEFAULT '';
```

The token persists across sessions. If the user revokes access in GroupMe, API calls return 401 — the UI clears the stored token and prompts reconnect.

---

## OAuth Connect Flow

Triggered when user opens the CHAT tab with no stored `groupme_token`:

1. CHAT tab renders a centered "Connect GroupMe" card
2. User clicks the connect button
3. Popup opens: `window.open('https://oauth.groupme.com/oauth/authorize?client_id=GROUPME_CLIENT_ID', 'gm_oauth', 'width=480,height=620')`
4. User logs into GroupMe (or is already logged in) and taps Authorize
5. GroupMe redirects the popup to `https://heroesseniorsoftball.com/groupme-callback.html?access_token=TOKEN`
6. `groupme-callback.html` reads the token from `location.search`, calls `window.opener.postMessage({groupmeToken: TOKEN}, location.origin)`, then `window.close()`
7. Main window listener receives the message, saves token: `sb.from('profiles').update({groupme_token: token}).eq('id', userId)`
8. CHAT tab immediately re-renders showing the user's groups

**Reconnect:** If any GroupMe API call returns 401, the stored token is cleared (`sb.from('profiles').update({groupme_token: ''}).eq('id', userId)`) and the connect card is shown again with the message "Your GroupMe connection expired — reconnect below."

**Subsequent visits:** Token is read from the Supabase profile during `HeroesAuth.init()`. If present, the CHAT tab loads directly into the groups list — no re-auth.

---

## Chat UI

### Tab bar
The `/my` page tab bar becomes: **AVAILABILITY | CHAT | EVENTS**

### Groups list (left pane / first screen on mobile)
- API: `GET https://api.groupme.com/v3/groups?token=TOKEN&per_page=50&order=recent`
- Each row: group avatar initial (colored circle), group name, member count, last message preview
- Clicking a row loads that group's thread

### Message thread (right pane / second screen on mobile)
- API: `GET https://api.groupme.com/v3/groups/{id}/messages?token=TOKEN&limit=20`
- Messages render newest-at-bottom
- Each message: sender name (bold), sender avatar initial, message text, relative timestamp (e.g. "2 min ago")
- **Auto-poll:** every 30 seconds while the CHAT tab is active, fetches `?since_id={last_id}` and appends only new messages. Polling stops when user navigates away from CHAT tab.

### Send box
- Fixed at bottom of thread pane
- Textarea (auto-expands up to 3 lines) + Send button
- API: `POST https://api.groupme.com/v3/groups/{id}/messages` with body `{message: {source_guid: uuid, text: text}}`
- Optimistic: appends the message to the thread immediately on send, before server confirms

### Mobile layout
- Viewport < 768px: single-pane navigation
- Groups list fills full width; selecting a group slides to full-width thread view
- Thread header shows group name + "← Groups" back button
- Send box docks to bottom of viewport

### Empty / error states
- No groups found: "You don't appear to be in any GroupMe groups yet."
- Group has no messages: "No messages yet. Be the first to say something!"
- Send failure: inline error below textarea — "Couldn't send. Try again."

---

## Error Handling

| Scenario | Behavior |
|---|---|
| 401 from any API call | Clear token, show reconnect card |
| Popup blocked by browser | Show inline note: "Allow popups for this site to connect GroupMe" |
| Network error on poll | Silently skip that poll cycle, retry on next interval |
| Send fails | Show error under textarea; message not added to thread |
| Popup closed before completing OAuth | Detect `popup.closed` via interval check; show "Connection cancelled" message |

---

## What This Does NOT Include
- Creating, renaming, or leaving GroupMe groups (stays in GroupMe app)
- Direct messages (only group chats)
- Image/file attachments in sent messages
- Push notifications or real-time WebSocket (polling only)
- Admin control over which groups appear (user sees all their own groups)
