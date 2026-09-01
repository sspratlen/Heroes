# Tournament RSVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add tournament RSVP — admins/managers/coaches send an email blast to all team players with one-click yes/no/maybe links, players respond without logging in, and admins see a live dashboard with override and reminder capabilities.

**Architecture:** Two new Supabase tables (`tournament_rsvps`, `tournament_email_meta`) store RSVP state and tournament snapshots for reminders. Three Edge Functions handle the blast, response recording (public, no auth), and reminder resend. `rsvp.html` is a standalone card page (same pattern as `join.html`). `admin.html` gains RSVP buttons per tournament row and a dashboard modal.

**Tech Stack:** Vanilla JS, Supabase JS client, Deno/TypeScript Edge Functions, Resend transactional email. No build system.

**Key constants:**
- Prod repo: `/Users/scottspratlen/Documents/Claude/Projects/Heroes Website/Heroes Website/`
- Staging repo: `/Users/scottspratlen/Documents/Claude/Projects/Heroes-staging/`
- Supabase project ref: `mpgbgucmnxowteonldoh`
- Supabase URL: `https://mpgbgucmnxowteonldoh.supabase.co`
- Resend sender: `Heroes SSB <noreply@heroesseniorsoftball.com>`
- Heroes red: `#C8102E`
- Admin profile stored in `_adminProfile` (available in admin.html)
- `ADMIN_ROLES = ['admin', 'manager', 'coach']` (already defined in admin.html line 187)
- `_getClient()` returns Supabase JS client (defined in `assets/js/data.js`)
- `SUPABASE_URL`, `SUPABASE_ANON_KEY` are globals from `assets/js/data.js`
- Edge function auth pattern: check Authorization header, verify role in profiles table
- Same CORS headers as existing edge functions (see notify-new-registration/index.ts)

---

## Task 1: SQL migration — tournament_rsvps and tournament_email_meta tables

**Files:**
- Create: `supabase/tournament-rsvp-tables.sql`

- [ ] **Step 1: Write the SQL file**

Create `/Users/scottspratlen/Documents/Claude/Projects/Heroes Website/Heroes Website/supabase/tournament-rsvp-tables.sql` with this exact content:

```sql
-- Tournament RSVP tables
-- Run this in the Supabase SQL editor for project mpgbgucmnxowteonldoh

-- One row per player per tournament
CREATE TABLE IF NOT EXISTS tournament_rsvps (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id  text NOT NULL,
  player_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token          uuid NOT NULL DEFAULT gen_random_uuid(),
  status         text NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','yes','no','maybe')),
  responded_at   timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tournament_id, player_id),
  UNIQUE (token)
);

ALTER TABLE tournament_rsvps ENABLE ROW LEVEL SECURITY;

-- Anyone (anon + authenticated) can read RSVPs — used by rsvp.html roster view
CREATE POLICY "anyone can read rsvps"
  ON tournament_rsvps FOR SELECT
  TO anon, authenticated
  USING (true);

-- Admin/manager/coach can update any RSVP (override dropdown in admin.html)
CREATE POLICY "admin can update rsvps"
  ON tournament_rsvps FOR UPDATE
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid())
    IN ('admin','manager','coach')
  );

-- One row per tournament blast — stores snapshot for reminders
CREATE TABLE IF NOT EXISTS tournament_email_meta (
  tournament_id  text PRIMARY KEY,
  name           text NOT NULL,
  start_date     text NOT NULL,
  end_date       text,
  location       text,
  team_id        text NOT NULL,
  sent_at        timestamptz NOT NULL DEFAULT now(),
  created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE tournament_email_meta ENABLE ROW LEVEL SECURITY;

-- Authenticated admin/manager/coach can read meta (to check if blast was sent)
CREATE POLICY "authenticated can read meta"
  ON tournament_email_meta FOR SELECT
  TO authenticated
  USING (true);
```

- [ ] **Step 2: Run in Supabase SQL editor**

Go to https://supabase.com/dashboard/project/mpgbgucmnxowteonldoh/sql/new, paste the file contents, and run. Expected: no errors. Both tables appear in Table Editor.

- [ ] **Step 3: Commit**

```bash
cd "/Users/scottspratlen/Documents/Claude/Projects/Heroes Website/Heroes Website"
git add supabase/tournament-rsvp-tables.sql
git commit -m "feat: add tournament_rsvps and tournament_email_meta SQL migration"
```

---

## Task 2: Edge Function — send-tournament-rsvp

**Files:**
- Create: `supabase/functions/send-tournament-rsvp/index.ts`

- [ ] **Step 1: Create the directory and write the function**

```bash
mkdir -p "/Users/scottspratlen/Documents/Claude/Projects/Heroes Website/Heroes Website/supabase/functions/send-tournament-rsvp"
```

Create `/Users/scottspratlen/Documents/Claude/Projects/Heroes Website/Heroes Website/supabase/functions/send-tournament-rsvp/index.ts`:

```typescript
// send-tournament-rsvp
// Auth-required (admin/manager/coach). Creates tournament_email_meta snapshot,
// inserts one tournament_rsvps row per team player (ON CONFLICT DO NOTHING),
// then sends a Resend email to each player with yes/no/maybe links.
// Env vars: RESEND_API_KEY, SUPABASE_URL (auto), SUPABASE_SERVICE_ROLE_KEY (auto)

// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

// @ts-ignore
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    // @ts-ignore
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    // @ts-ignore
    const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    // @ts-ignore
    const RESEND_KEY   = Deno.env.get('RESEND_API_KEY')!;

    const serviceClient = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify caller is admin/manager/coach
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    if (!token) return json({ error: 'Unauthorized' }, 401);

    const { data: { user } } = await serviceClient.auth.getUser(token);
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const { data: caller } = await serviceClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!caller || !['admin', 'manager', 'coach'].includes(caller.role)) {
      return json({ error: 'Forbidden' }, 403);
    }

    const { tournament_id, name, start_date, end_date, location, team_id } = await req.json();
    if (!tournament_id || !name || !start_date || !team_id) {
      return json({ error: 'Missing required fields' }, 400);
    }

    // Upsert tournament snapshot for reminders
    await serviceClient.from('tournament_email_meta').upsert({
      tournament_id, name, start_date, end_date: end_date || null,
      location: location || null, team_id,
    });

    // Fetch all approved players/coaches/managers on this team
    const { data: players } = await serviceClient
      .from('profiles')
      .select('id, email, display_name')
      .eq('team_id', team_id)
      .eq('approved', true)
      .in('role', ['player', 'coach', 'manager']);

    if (!players || players.length === 0) {
      return json({ sent: 0, skipped: 'no players on team' });
    }

    // Insert RSVP rows — ON CONFLICT DO NOTHING preserves existing responses
    const rows = players.map((p: { id: string }) => ({
      tournament_id,
      player_id: p.id,
    }));
    await serviceClient.from('tournament_rsvps').upsert(rows, {
      onConflict: 'tournament_id,player_id',
      ignoreDuplicates: true,
    });

    // Fetch all RSVP rows with tokens for this tournament
    const { data: rsvps } = await serviceClient
      .from('tournament_rsvps')
      .select('player_id, token')
      .eq('tournament_id', tournament_id);

    const tokenMap = new Map(
      (rsvps || []).map((r: { player_id: string; token: string }) => [r.player_id, r.token])
    );

    // Format dates for email
    const base = 'https://heroesseniorsoftball.com';
    const dateStr = end_date && end_date !== start_date
      ? `${start_date} – ${end_date}` : start_date;

    function buildEmailHtml(playerToken: string, playerName: string): string {
      const yes   = `${base}/rsvp.html?token=${playerToken}&r=yes`;
      const no    = `${base}/rsvp.html?token=${playerToken}&r=no`;
      const maybe = `${base}/rsvp.html?token=${playerToken}&r=maybe`;

      return `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#111">
          <div style="background:#C8102E;padding:24px 28px;border-radius:10px 10px 0 0">
            <p style="margin:0;color:rgba(255,255,255,.7);font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase">Heroes Senior Softball · Tournament RSVP</p>
            <h1 style="margin:8px 0 0;color:#fff;font-size:22px;font-weight:700">You're invited: ${name} ⚾</h1>
          </div>
          <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;padding:28px;border-radius:0 0 10px 10px">
            <p style="font-size:15px;line-height:1.6;margin:0 0 18px">Hey ${playerName}, can you make this tournament?</p>
            <div style="background:#f8f8f8;border-left:4px solid #C8102E;border-radius:0 8px 8px 0;padding:14px 18px;margin:0 0 24px">
              <div style="font-size:13px;color:#888;font-weight:700;text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px">Tournament Details</div>
              <div style="font-size:16px;font-weight:700;color:#111">${name}</div>
              <div style="font-size:14px;color:#555;margin-top:4px">📅 ${dateStr}</div>
              ${location ? `<div style="font-size:14px;color:#555;margin-top:2px">📍 ${location}</div>` : ''}
            </div>
            <p style="font-size:14px;color:#444;margin:0 0 20px">Click your answer below — no login needed:</p>
            <div style="display:flex;gap:10px;margin-bottom:24px;flex-wrap:wrap">
              <a href="${yes}"   style="flex:1;min-width:120px;background:#16a34a;color:#fff;padding:14px 10px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;text-align:center;display:block">✅ Yes, I'm in!</a>
              <a href="${no}"    style="flex:1;min-width:120px;background:#dc2626;color:#fff;padding:14px 10px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;text-align:center;display:block">❌ Can't make it</a>
              <a href="${maybe}" style="flex:1;min-width:120px;background:#d97706;color:#fff;padding:14px 10px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;text-align:center;display:block">🤔 Maybe</a>
            </div>
            <p style="font-size:12px;color:#aaa;line-height:1.6">You can also <a href="${base}" style="color:#C8102E;text-decoration:none">visit the Heroes site</a> to update your response at any time.</p>
            <div style="margin-top:28px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:11.5px;color:#aaa">
              Heroes Senior Softball · Omaha, NE · <a href="${base}" style="color:#C8102E;text-decoration:none">heroesseniorsoftball.com</a>
            </div>
          </div>
        </div>`;
    }

    let sent = 0;
    for (const player of players as Array<{ id: string; email: string; display_name: string }>) {
      const playerToken = tokenMap.get(player.id);
      if (!playerToken || !player.email) continue;

      const firstName = (player.display_name || '').trim().split(/\s+/)[0] || 'there';
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Heroes SSB <noreply@heroesseniorsoftball.com>',
          to: [player.email],
          subject: `Are you in? ${name} ⚾`,
          html: buildEmailHtml(playerToken, firstName),
          text: `Hey ${firstName}, can you make ${name}?\n\nDetails: ${dateStr}${location ? ' · ' + location : ''}\n\nYes: ${base}/rsvp.html?token=${playerToken}&r=yes\nNo: ${base}/rsvp.html?token=${playerToken}&r=no\nMaybe: ${base}/rsvp.html?token=${playerToken}&r=maybe`,
        }),
      });
      if (res.ok) sent++;
    }

    return json({ sent });

  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[send-tournament-rsvp]', msg);
    return json({ error: msg }, 500);
  }
});
```

- [ ] **Step 2: Deploy to Supabase**

```bash
cd "/Users/scottspratlen/Documents/Claude/Projects/Heroes Website/Heroes Website"
npx supabase functions deploy send-tournament-rsvp --project-ref mpgbgucmnxowteonldoh
```

Expected: `Deployed Function send-tournament-rsvp`

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/send-tournament-rsvp/index.ts
git commit -m "feat: add send-tournament-rsvp edge function"
```

---

## Task 3: Edge Function — record-tournament-rsvp

**Files:**
- Create: `supabase/functions/record-tournament-rsvp/index.ts`

- [ ] **Step 1: Create the directory and write the function**

```bash
mkdir -p "/Users/scottspratlen/Documents/Claude/Projects/Heroes Website/Heroes Website/supabase/functions/record-tournament-rsvp"
```

Create `/Users/scottspratlen/Documents/Claude/Projects/Heroes Website/Heroes Website/supabase/functions/record-tournament-rsvp/index.ts`:

```typescript
// record-tournament-rsvp
// Public (no auth required). Validates a player's token, records their RSVP response,
// and returns tournament info + full team roster for the confirmation page.
// Env vars: SUPABASE_URL (auto), SUPABASE_SERVICE_ROLE_KEY (auto)

// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

// @ts-ignore
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    // @ts-ignore
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    // @ts-ignore
    const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const serviceClient = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { token, response } = await req.json();

    if (!token) return json({ error: 'Missing token' }, 400);
    if (!['yes', 'no', 'maybe'].includes(response)) {
      return json({ error: 'Invalid response — must be yes, no, or maybe' }, 400);
    }

    // Look up the RSVP row by token
    const { data: rsvp } = await serviceClient
      .from('tournament_rsvps')
      .select('id, tournament_id, player_id, status')
      .eq('token', token)
      .single();

    if (!rsvp) return json({ error: 'Invalid or expired link' }, 404);

    // Update the response
    await serviceClient
      .from('tournament_rsvps')
      .update({ status: response, responded_at: new Date().toISOString() })
      .eq('token', token);

    // Fetch tournament snapshot
    const { data: meta } = await serviceClient
      .from('tournament_email_meta')
      .select('name, start_date, end_date, location')
      .eq('tournament_id', rsvp.tournament_id)
      .single();

    // Fetch all RSVPs for this tournament joined with player names
    const { data: allRsvps } = await serviceClient
      .from('tournament_rsvps')
      .select('player_id, status, profiles(display_name)')
      .eq('tournament_id', rsvp.tournament_id);

    // Sort: yes → maybe → pending → no
    const statusOrder: Record<string, number> = { yes: 0, maybe: 1, pending: 2, no: 3 };
    const roster = ((allRsvps || []) as Array<{
      player_id: string;
      status: string;
      profiles: { display_name: string } | null;
    }>)
      .map(r => ({
        name: r.profiles?.display_name || 'Unknown',
        status: r.status,
      }))
      .sort((a, b) => (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99));

    return json({
      tournament: meta,
      myStatus: response,
      roster,
    });

  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[record-tournament-rsvp]', msg);
    return json({ error: msg }, 500);
  }
});
```

- [ ] **Step 2: Deploy to Supabase**

```bash
cd "/Users/scottspratlen/Documents/Claude/Projects/Heroes Website/Heroes Website"
npx supabase functions deploy record-tournament-rsvp --project-ref mpgbgucmnxowteonldoh
```

Expected: `Deployed Function record-tournament-rsvp`

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/record-tournament-rsvp/index.ts
git commit -m "feat: add record-tournament-rsvp edge function"
```

---

## Task 4: Edge Function — send-tournament-reminders

**Files:**
- Create: `supabase/functions/send-tournament-reminders/index.ts`

- [ ] **Step 1: Create the directory and write the function**

```bash
mkdir -p "/Users/scottspratlen/Documents/Claude/Projects/Heroes Website/Heroes Website/supabase/functions/send-tournament-reminders"
```

Create `/Users/scottspratlen/Documents/Claude/Projects/Heroes Website/Heroes Website/supabase/functions/send-tournament-reminders/index.ts`:

```typescript
// send-tournament-reminders
// Auth-required (admin/manager/coach). Re-sends the RSVP email to players
// whose status is 'pending' or 'maybe' for a given tournament.
// Env vars: RESEND_API_KEY, SUPABASE_URL (auto), SUPABASE_SERVICE_ROLE_KEY (auto)

// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

// @ts-ignore
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    // @ts-ignore
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    // @ts-ignore
    const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    // @ts-ignore
    const RESEND_KEY   = Deno.env.get('RESEND_API_KEY')!;

    const serviceClient = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify caller is admin/manager/coach
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    if (!token) return json({ error: 'Unauthorized' }, 401);

    const { data: { user } } = await serviceClient.auth.getUser(token);
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const { data: caller } = await serviceClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!caller || !['admin', 'manager', 'coach'].includes(caller.role)) {
      return json({ error: 'Forbidden' }, 403);
    }

    const { tournament_id } = await req.json();
    if (!tournament_id) return json({ error: 'Missing tournament_id' }, 400);

    // Fetch tournament snapshot
    const { data: meta } = await serviceClient
      .from('tournament_email_meta')
      .select('name, start_date, end_date, location')
      .eq('tournament_id', tournament_id)
      .single();

    if (!meta) return json({ error: 'Tournament not found — send the initial blast first' }, 404);

    // Fetch pending/maybe RSVPs joined with player info
    const { data: rsvps } = await serviceClient
      .from('tournament_rsvps')
      .select('token, player_id, profiles(email, display_name)')
      .eq('tournament_id', tournament_id)
      .in('status', ['pending', 'maybe']);

    if (!rsvps || rsvps.length === 0) {
      return json({ sent: 0, skipped: 'no pending or maybe players' });
    }

    const base = 'https://heroesseniorsoftball.com';
    const dateStr = meta.end_date && meta.end_date !== meta.start_date
      ? `${meta.start_date} – ${meta.end_date}` : meta.start_date;

    let sent = 0;
    for (const rsvp of rsvps as Array<{
      token: string;
      player_id: string;
      profiles: { email: string; display_name: string } | null;
    }>) {
      const playerEmail = rsvp.profiles?.email;
      if (!playerEmail) continue;

      const firstName = (rsvp.profiles?.display_name || '').trim().split(/\s+/)[0] || 'there';
      const yes   = `${base}/rsvp.html?token=${rsvp.token}&r=yes`;
      const no    = `${base}/rsvp.html?token=${rsvp.token}&r=no`;
      const maybe = `${base}/rsvp.html?token=${rsvp.token}&r=maybe`;

      const html = `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#111">
          <div style="background:#C8102E;padding:24px 28px;border-radius:10px 10px 0 0">
            <p style="margin:0;color:rgba(255,255,255,.7);font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase">Heroes Senior Softball · Reminder</p>
            <h1 style="margin:8px 0 0;color:#fff;font-size:22px;font-weight:700">Reminder: ${meta.name} ⚾</h1>
          </div>
          <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;padding:28px;border-radius:0 0 10px 10px">
            <p style="font-size:15px;line-height:1.6;margin:0 0 18px">Hey ${firstName}, we haven't heard from you yet — can you make it?</p>
            <div style="background:#f8f8f8;border-left:4px solid #C8102E;border-radius:0 8px 8px 0;padding:14px 18px;margin:0 0 24px">
              <div style="font-size:13px;color:#888;font-weight:700;text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px">Tournament Details</div>
              <div style="font-size:16px;font-weight:700;color:#111">${meta.name}</div>
              <div style="font-size:14px;color:#555;margin-top:4px">📅 ${dateStr}</div>
              ${meta.location ? `<div style="font-size:14px;color:#555;margin-top:2px">📍 ${meta.location}</div>` : ''}
            </div>
            <div style="display:flex;gap:10px;margin-bottom:24px;flex-wrap:wrap">
              <a href="${yes}"   style="flex:1;min-width:120px;background:#16a34a;color:#fff;padding:14px 10px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;text-align:center;display:block">✅ Yes, I'm in!</a>
              <a href="${no}"    style="flex:1;min-width:120px;background:#dc2626;color:#fff;padding:14px 10px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;text-align:center;display:block">❌ Can't make it</a>
              <a href="${maybe}" style="flex:1;min-width:120px;background:#d97706;color:#fff;padding:14px 10px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;text-align:center;display:block">🤔 Maybe</a>
            </div>
            <div style="margin-top:28px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:11.5px;color:#aaa">
              Heroes Senior Softball · Omaha, NE · <a href="${base}" style="color:#C8102E;text-decoration:none">heroesseniorsoftball.com</a>
            </div>
          </div>
        </div>`;

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Heroes SSB <noreply@heroesseniorsoftball.com>',
          to: [playerEmail],
          subject: `Reminder: Are you in for ${meta.name}? ⚾`,
          html,
          text: `Hey ${firstName}, we haven't heard from you for ${meta.name}.\n\n${dateStr}${meta.location ? ' · ' + meta.location : ''}\n\nYes: ${yes}\nNo: ${no}\nMaybe: ${maybe}`,
        }),
      });
      if (res.ok) sent++;
    }

    return json({ sent });

  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[send-tournament-reminders]', msg);
    return json({ error: msg }, 500);
  }
});
```

- [ ] **Step 2: Deploy to Supabase**

```bash
cd "/Users/scottspratlen/Documents/Claude/Projects/Heroes Website/Heroes Website"
npx supabase functions deploy send-tournament-reminders --project-ref mpgbgucmnxowteonldoh
```

Expected: `Deployed Function send-tournament-reminders`

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/send-tournament-reminders/index.ts
git commit -m "feat: add send-tournament-reminders edge function"
```

---

## Task 5: Create rsvp.html

**Files:**
- Create: `rsvp.html`

- [ ] **Step 1: Write rsvp.html**

Create `/Users/scottspratlen/Documents/Claude/Projects/Heroes Website/Heroes Website/rsvp.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tournament RSVP · Heroes Senior Softball</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      min-height: 100vh;
      background: #111;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-family: Arial, Helvetica, sans-serif;
      padding: 24px 16px;
    }

    .rsvp-card {
      background: #fff;
      border-radius: 16px;
      width: 100%;
      max-width: 500px;
      overflow: hidden;
      box-shadow: 0 8px 40px rgba(0,0,0,.5);
    }

    .rsvp-header {
      background: #C8102E;
      padding: 20px 24px;
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .rsvp-header img {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      border: 2px solid rgba(255,255,255,.3);
    }
    .rsvp-header-text { color: #fff; }
    .rsvp-header-text h1 { font-size: 16px; font-weight: 700; margin: 0; }
    .rsvp-header-text p { font-size: 11px; margin: 2px 0 0; opacity: .7; text-transform: uppercase; letter-spacing: .08em; }

    .rsvp-body { padding: 24px; }

    .rsvp-loading {
      text-align: center;
      padding: 48px 0;
      color: #aaa;
      font-size: 14px;
    }
    .rsvp-spinner {
      width: 32px; height: 32px;
      border: 3px solid #e5e7eb;
      border-top-color: #C8102E;
      border-radius: 50%;
      animation: spin .7s linear infinite;
      margin: 0 auto 12px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .rsvp-tournament-name { font-size: 18px; font-weight: 700; color: #111; margin-bottom: 6px; }
    .rsvp-tournament-meta { font-size: 13px; color: #666; margin-bottom: 20px; line-height: 1.6; }

    .rsvp-status-line {
      background: #f8f8f8;
      border-left: 4px solid #C8102E;
      border-radius: 0 8px 8px 0;
      padding: 12px 16px;
      margin-bottom: 16px;
      font-size: 15px;
      font-weight: 700;
      color: #111;
    }

    .rsvp-change {
      font-size: 12px;
      color: #888;
      margin-bottom: 24px;
    }
    .rsvp-change a {
      color: #C8102E;
      text-decoration: none;
      font-weight: 600;
      cursor: pointer;
    }
    .rsvp-change a:hover { text-decoration: underline; }

    .rsvp-divider {
      border: none;
      border-top: 1px solid #e5e7eb;
      margin: 0 0 20px;
    }

    .rsvp-roster-title {
      font-size: 13px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: .08em;
      color: #888;
      margin-bottom: 12px;
    }

    .rsvp-roster-list { list-style: none; }
    .rsvp-roster-list li {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #f0f0f0;
      font-size: 14px;
    }
    .rsvp-roster-list li:last-child { border-bottom: none; }

    .rsvp-badge {
      font-size: 12px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 999px;
    }
    .badge-yes     { background: #dcfce7; color: #16a34a; }
    .badge-no      { background: #fee2e2; color: #dc2626; }
    .badge-maybe   { background: #fef3c7; color: #d97706; }
    .badge-pending { background: #f3f4f6; color: #6b7280; }

    .rsvp-error {
      text-align: center;
      padding: 40px 24px;
    }
    .rsvp-error-icon { font-size: 40px; margin-bottom: 12px; }
    .rsvp-error h2 { font-size: 18px; font-weight: 700; color: #111; margin-bottom: 8px; }
    .rsvp-error p { font-size: 14px; color: #666; }

    .rsvp-footer {
      text-align: center;
      padding: 14px;
      background: #f8f8f8;
      border-top: 1px solid #e5e7eb;
      font-size: 12px;
      color: #aaa;
    }
    .rsvp-footer a { color: #C8102E; text-decoration: none; }
    .rsvp-footer a:hover { text-decoration: underline; }
  </style>
</head>
<body>

<div class="rsvp-card">
  <div class="rsvp-header">
    <img src="assets/img/heroes-logo.jpg" alt="Heroes">
    <div class="rsvp-header-text">
      <h1>Heroes Senior Softball</h1>
      <p>Tournament RSVP</p>
    </div>
  </div>
  <div class="rsvp-body" id="rsvp-body">
    <div class="rsvp-loading">
      <div class="rsvp-spinner"></div>
      Recording your response…
    </div>
  </div>
  <div class="rsvp-footer">
    <a href="index.html">heroesseniorsoftball.com</a>
  </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
<script src="assets/js/data.js"></script>
<script>
  const params = new URLSearchParams(location.search);
  const token    = params.get('token') || '';
  const response = params.get('r') || '';

  const STATUS_LABELS = { yes: '✅ Yes, I\'m in!', no: '❌ Can\'t make it', maybe: '🤔 Maybe' };
  const STATUS_BADGES = { yes: 'badge-yes', no: 'badge-no', maybe: 'badge-maybe', pending: 'badge-pending' };
  const STATUS_PENDING_LABEL = '⏳ Hasn\'t responded';

  async function recordRsvp(t, r) {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/record-tournament-rsvp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ token: t, response: r }),
    });
    return res.json();
  }

  function render(data) {
    const body = document.getElementById('rsvp-body');
    if (data.error) {
      body.innerHTML = `
        <div class="rsvp-error">
          <div class="rsvp-error-icon">🔗</div>
          <h2>Link not valid</h2>
          <p>This RSVP link is expired or invalid. Contact your team admin.</p>
        </div>`;
      return;
    }

    const t = data.tournament || {};
    const dateStr = t.end_date && t.end_date !== t.start_date
      ? `${t.start_date} – ${t.end_date}` : (t.start_date || '');
    const statusLabel = STATUS_LABELS[data.myStatus] || data.myStatus;

    const changeLinks = ['yes','no','maybe']
      .filter(r => r !== data.myStatus)
      .map(r => `<a onclick="changeResponse('${r}')">${STATUS_LABELS[r]}</a>`)
      .join(' · ');

    const rosterItems = (data.roster || []).map(p => {
      const badgeClass = STATUS_BADGES[p.status] || 'badge-pending';
      const label = p.status === 'pending' ? STATUS_PENDING_LABEL : (STATUS_LABELS[p.status] || p.status);
      return `<li><span>${p.name}</span><span class="rsvp-badge ${badgeClass}">${label}</span></li>`;
    }).join('');

    body.innerHTML = `
      <div class="rsvp-tournament-name">${t.name || 'Tournament'}</div>
      <div class="rsvp-tournament-meta">
        ${dateStr ? `📅 ${dateStr}<br>` : ''}
        ${t.location ? `📍 ${t.location}` : ''}
      </div>
      <div class="rsvp-status-line">You're marked as: ${statusLabel}</div>
      <div class="rsvp-change">Change to: ${changeLinks}</div>
      <hr class="rsvp-divider">
      <div class="rsvp-roster-title">Team Response Summary</div>
      <ul class="rsvp-roster-list">${rosterItems || '<li style="color:#aaa;font-size:13px">No responses yet</li>'}</ul>`;
  }

  async function changeResponse(r) {
    document.getElementById('rsvp-body').innerHTML = `
      <div class="rsvp-loading"><div class="rsvp-spinner"></div>Updating…</div>`;
    const data = await recordRsvp(token, r);
    render(data);
  }

  (async () => {
    if (!token || !['yes','no','maybe'].includes(response)) {
      document.getElementById('rsvp-body').innerHTML = `
        <div class="rsvp-error">
          <div class="rsvp-error-icon">🔗</div>
          <h2>Link not valid</h2>
          <p>Use one of the links from your RSVP email. Contact your team admin if you need help.</p>
        </div>`;
      return;
    }
    const data = await recordRsvp(token, response);
    render(data);
  })();
</script>

</body>
</html>
```

- [ ] **Step 2: Verify the file was written**

```bash
wc -l "/Users/scottspratlen/Documents/Claude/Projects/Heroes Website/Heroes Website/rsvp.html"
```

Expected: ~160+ lines

- [ ] **Step 3: Commit**

```bash
cd "/Users/scottspratlen/Documents/Claude/Projects/Heroes Website/Heroes Website"
git add rsvp.html
git commit -m "feat: add rsvp.html RSVP confirmation and roster page"
```

---

## Task 6: Modify admin.html — RSVP buttons and dashboard modal

**Files:**
- Modify: `admin.html`

Context: Tournaments in admin.html use localStorage via `loadData()`. `_adminProfile` holds the logged-in user's profile. `ADMIN_ROLES = ['admin','manager','coach']` is already defined at line 187. `openModal(title, body, saveLabel, onSave)` and `toast(msg)` are the standard UI helpers. `_getClient()` returns the Supabase JS client.

- [ ] **Step 1: Add `_sentTournamentIds` module-level variable**

Find this line in admin.html (near the other `let _t*` variables around line 1543-1545):

```javascript
function renderTournaments() {
  const data = loadData();
  const all = data.tournaments || [];
```

Replace it with:

```javascript
let _sentTournamentIds = new Set();

async function renderTournaments() {
  const data = loadData();
  const all = data.tournaments || [];
  // Fetch which tournaments already have an RSVP blast sent
  try {
    const sb = _getClient();
    if (sb) {
      const { data: meta } = await sb.from('tournament_email_meta').select('tournament_id');
      _sentTournamentIds = new Set((meta || []).map(m => m.tournament_id));
    }
  } catch (_) {}
```

- [ ] **Step 2: Add RSVP buttons to the tournament row**

In `renderTournaments()`, find the actions cell of each tournament row:

```javascript
            <td style="display:flex;gap:4px;flex-wrap:wrap">
              <button class="action-btn action-edit" onclick="editTournament('${t.id}')">Edit</button>
              <button class="action-btn action-edit" onclick="setTournamentPlacement('${t.id}')">🏆 Place</button>
              <button class="action-btn action-delete" onclick="deleteTournament('${t.id}')">Del</button>
            </td>
```

Replace with:

```javascript
            <td style="display:flex;gap:4px;flex-wrap:wrap">
              <button class="action-btn action-edit" onclick="editTournament('${t.id}')">Edit</button>
              <button class="action-btn action-edit" onclick="setTournamentPlacement('${t.id}')">🏆 Place</button>
              ${ADMIN_ROLES.includes(_adminProfile?.role) ? (
                _sentTournamentIds.has(t.id)
                  ? `<button class="action-btn action-edit" onclick="viewTournamentRsvp('${t.id}','${(t.name||'').replace(/'/g,"\\'")}')">📊 RSVP</button>`
                  : `<button class="action-btn action-edit" onclick="sendTournamentRsvp('${t.id}','${(t.name||'').replace(/'/g,"\\'")}','${t.teamId||''}','${t.startDate||''}','${t.endDate||''}','${(t.location||'').replace(/'/g,"\\'")}')">📧 Send RSVP</button>`
              ) : ''}
              <button class="action-btn action-delete" onclick="deleteTournament('${t.id}')">Del</button>
            </td>
```

- [ ] **Step 3: Add the three RSVP functions**

Find the `window.savePlacement` function (around line 1726). Add these three new functions directly before it:

```javascript
async function sendTournamentRsvp(id, name, teamId, startDate, endDate, location) {
  const data = loadData();
  const team = (data.teams || []).find(t => t.id === teamId);
  const teamName = team?.shortName || team?.name || 'the team';

  // Count eligible players
  const sb = _getClient();
  let playerCount = '?';
  try {
    const { data: players } = await sb
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('team_id', teamId)
      .eq('approved', true)
      .in('role', ['player', 'coach', 'manager']);
    playerCount = players?.length ?? '?';
  } catch (_) {}

  openModal(
    'Send RSVP Request',
    `<p style="font-size:15px;line-height:1.6;color:var(--text);margin:0 0 16px">
       Send an RSVP email to all players on <strong>${teamName}</strong> for:
     </p>
     <div style="background:var(--bg);border-left:4px solid var(--red);border-radius:0 8px 8px 0;padding:12px 16px;margin-bottom:16px">
       <div style="font-weight:700;font-size:15px;color:var(--text)">${name}</div>
       ${startDate ? `<div style="font-size:13px;color:var(--gray);margin-top:4px">📅 ${startDate}${endDate && endDate !== startDate ? ' – ' + endDate : ''}</div>` : ''}
       ${location ? `<div style="font-size:13px;color:var(--gray);margin-top:2px">📍 ${location}</div>` : ''}
     </div>
     <p style="font-size:13px;color:var(--gray);margin:0">This will email approximately <strong>${playerCount} players</strong>. Players already responded will keep their existing status.</p>`,
    'Send RSVP Emails',
    async () => {
      try {
        const session = (await sb.auth.getSession()).data.session;
        const res = await fetch(`${SUPABASE_URL}/functions/v1/send-tournament-rsvp`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            tournament_id: id, name, start_date: startDate,
            end_date: endDate || null, location: location || null, team_id: teamId,
          }),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Failed to send');
        closeModal();
        _sentTournamentIds.add(id);
        toast(`RSVP emails sent to ${result.sent} players ⚾`);
        renderTournaments();
      } catch (e) {
        toast(e.message || 'Error sending RSVP emails', 'error');
      }
    }
  );
}

async function viewTournamentRsvp(id, name) {
  const sb = _getClient();

  // Fetch all RSVPs for this tournament with player names
  const { data: rsvps } = await sb
    .from('tournament_rsvps')
    .select('player_id, status, profiles(display_name)')
    .eq('tournament_id', id);

  const rows = (rsvps || []);
  const counts = { yes: 0, no: 0, maybe: 0, pending: 0 };
  rows.forEach(r => { if (counts[r.status] !== undefined) counts[r.status]++; });

  const pendingMaybe = counts.pending + counts.maybe;
  const canOverride = ADMIN_ROLES.includes(_adminProfile?.role);

  const statusBadge = s => {
    const map = {
      yes:     '<span style="background:#dcfce7;color:#16a34a;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700">✅ Yes</span>',
      no:      '<span style="background:#fee2e2;color:#dc2626;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700">❌ No</span>',
      maybe:   '<span style="background:#fef3c7;color:#d97706;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700">🤔 Maybe</span>',
      pending: '<span style="background:#f3f4f6;color:#6b7280;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700">⏳ Pending</span>',
    };
    return map[s] || s;
  };

  const tableRows = rows.map(r => `
    <tr>
      <td style="padding:8px 0;font-size:14px">${r.profiles?.display_name || '—'}</td>
      <td style="padding:8px 0">${statusBadge(r.status)}</td>
      <td style="padding:8px 0">
        ${canOverride ? `
          <select style="font-size:12px;padding:3px 6px;border:1px solid #e5e7eb;border-radius:6px;background:#fff"
            onchange="overrideRsvp('${id}','${r.player_id}',this.value)">
            <option value="yes"${r.status==='yes'?' selected':''}>✅ Yes</option>
            <option value="no"${r.status==='no'?' selected':''}>❌ No</option>
            <option value="maybe"${r.status==='maybe'?' selected':''}>🤔 Maybe</option>
            <option value="pending"${r.status==='pending'?' selected':''}>⏳ Pending</option>
          </select>` : ''}
      </td>
    </tr>`).join('');

  openModal(
    `${name} — RSVP Status`,
    `<div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:20px">
       <span style="font-size:14px;font-weight:700">✅ ${counts.yes} Yes</span>
       <span style="font-size:14px;font-weight:700">❌ ${counts.no} No</span>
       <span style="font-size:14px;font-weight:700">🤔 ${counts.maybe} Maybe</span>
       <span style="font-size:14px;font-weight:700">⏳ ${counts.pending} Pending</span>
     </div>
     ${rows.length === 0 ? '<p style="color:var(--gray);font-size:14px">No responses yet.</p>' : `
     <div style="overflow-x:auto">
       <table style="width:100%;border-collapse:collapse">
         <thead><tr>
           <th style="text-align:left;font-size:12px;color:var(--gray);padding:0 0 8px;font-weight:700">Player</th>
           <th style="text-align:left;font-size:12px;color:var(--gray);padding:0 0 8px;font-weight:700">Status</th>
           ${canOverride ? '<th style="text-align:left;font-size:12px;color:var(--gray);padding:0 0 8px;font-weight:700">Override</th>' : ''}
         </tr></thead>
         <tbody>${tableRows}</tbody>
       </table>
     </div>`}
     ${canOverride && pendingMaybe > 0 ? `
     <div style="margin-top:20px;padding-top:16px;border-top:1px solid var(--border)">
       <button class="btn btn-secondary btn-sm" onclick="sendTournamentReminders('${id}')">
         🔔 Resend Reminders (${pendingMaybe} pending/maybe)
       </button>
     </div>` : ''}`,
    null, null
  );
}

async function overrideRsvp(tournamentId, playerId, newStatus) {
  try {
    const sb = _getClient();
    const { error } = await sb
      .from('tournament_rsvps')
      .update({ status: newStatus, responded_at: new Date().toISOString() })
      .eq('tournament_id', tournamentId)
      .eq('player_id', playerId);
    if (error) throw error;
    toast(`Status updated to ${newStatus}`);
  } catch (e) {
    toast(e.message || 'Error updating status', 'error');
  }
}

async function sendTournamentReminders(tournamentId) {
  try {
    const sb = _getClient();
    const session = (await sb.auth.getSession()).data.session;
    const res = await fetch(`${SUPABASE_URL}/functions/v1/send-tournament-reminders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ tournament_id: tournamentId }),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Failed');
    closeModal();
    toast(`Reminders sent to ${result.sent} players 🔔`);
  } catch (e) {
    toast(e.message || 'Error sending reminders', 'error');
  }
}

```

- [ ] **Step 4: Smoke test in the browser**

1. Log into admin.html as an admin
2. Navigate to Tournaments
3. Verify the "📧 Send RSVP" button appears on tournaments that haven't had a blast sent
4. Click "📧 Send RSVP" — confirm the modal shows the tournament name and player count
5. Send the blast — verify the toast shows "RSVP emails sent to N players"
6. Button should now show "📊 RSVP"
7. Click "📊 RSVP" — verify the dashboard modal shows player statuses

- [ ] **Step 5: Commit**

```bash
cd "/Users/scottspratlen/Documents/Claude/Projects/Heroes Website/Heroes Website"
git add admin.html
git commit -m "feat: add tournament RSVP buttons and dashboard modal to admin.html"
```

---

## Task 7: Copy to staging and push both repos

**Files:**
- Copy: `supabase/tournament-rsvp-tables.sql` → staging
- Copy: `supabase/functions/send-tournament-rsvp/index.ts` → staging
- Copy: `supabase/functions/record-tournament-rsvp/index.ts` → staging
- Copy: `supabase/functions/send-tournament-reminders/index.ts` → staging
- Copy: `rsvp.html` → staging
- Copy: `admin.html` → staging

- [ ] **Step 1: Copy all changed files to staging**

```bash
PROD="/Users/scottspratlen/Documents/Claude/Projects/Heroes Website/Heroes Website"
STAGING="/Users/scottspratlen/Documents/Claude/Projects/Heroes-staging"

cp "$PROD/supabase/tournament-rsvp-tables.sql" "$STAGING/supabase/tournament-rsvp-tables.sql"

mkdir -p "$STAGING/supabase/functions/send-tournament-rsvp"
mkdir -p "$STAGING/supabase/functions/record-tournament-rsvp"
mkdir -p "$STAGING/supabase/functions/send-tournament-reminders"

cp "$PROD/supabase/functions/send-tournament-rsvp/index.ts"     "$STAGING/supabase/functions/send-tournament-rsvp/index.ts"
cp "$PROD/supabase/functions/record-tournament-rsvp/index.ts"   "$STAGING/supabase/functions/record-tournament-rsvp/index.ts"
cp "$PROD/supabase/functions/send-tournament-reminders/index.ts" "$STAGING/supabase/functions/send-tournament-reminders/index.ts"
cp "$PROD/rsvp.html"   "$STAGING/rsvp.html"
cp "$PROD/admin.html"  "$STAGING/admin.html"
```

- [ ] **Step 2: Commit and push staging**

```bash
cd "/Users/scottspratlen/Documents/Claude/Projects/Heroes-staging"
git add supabase/tournament-rsvp-tables.sql \
        supabase/functions/send-tournament-rsvp/index.ts \
        supabase/functions/record-tournament-rsvp/index.ts \
        supabase/functions/send-tournament-reminders/index.ts \
        rsvp.html admin.html
git commit -m "feat: tournament RSVP — tables, edge functions, rsvp.html, admin UI"
git pull --rebase origin main && git push origin main
```

- [ ] **Step 3: Push prod**

```bash
cd "/Users/scottspratlen/Documents/Claude/Projects/Heroes Website/Heroes Website"
git pull --rebase origin main && git push origin main
```

- [ ] **Step 4: Verify rsvp.html is live**

```bash
until curl -s "https://heroesseniorsoftball.com/rsvp.html" | grep -q "Tournament RSVP"; do sleep 5; done && echo "LIVE"
```

Expected: `LIVE`
