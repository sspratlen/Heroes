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
