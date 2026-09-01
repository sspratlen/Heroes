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
