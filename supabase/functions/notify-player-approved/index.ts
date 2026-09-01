// notify-player-approved
// Called from admin.html after approveProfile() succeeds.
// Sends a "you're approved" email to the player via Resend.
// Env vars: RESEND_API_KEY

// @ts-ignore
Deno.serve(async (req: Request) => {
  const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const { playerEmail, playerName, role } = await req.json();
    if (!playerEmail) {
      return new Response(JSON.stringify({ ok: true, skipped: 'no email' }), {
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // @ts-ignore
    const RESEND_KEY = Deno.env.get('RESEND_API_KEY')!;
    const firstName  = (playerName || '').trim().split(/\s+/)[0] || 'there';
    const roleLabel  = role === 'admin' ? 'Admin' : role === 'manager' ? 'Manager' : role === 'coach' ? 'Coach' : 'Player';
    const portalUrl  = 'https://heroesseniorsoftball.com/#/my';

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#111">
        <div style="background:#C8102E;padding:24px 28px;border-radius:10px 10px 0 0">
          <p style="margin:0;color:rgba(255,255,255,.7);font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase">Heroes Senior Softball · Omaha, NE</p>
          <h1 style="margin:8px 0 0;color:#fff;font-size:22px;font-weight:700">You're Approved! ⚾🎉</h1>
        </div>
        <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;padding:28px;border-radius:0 0 10px 10px">
          <p style="font-size:15px;line-height:1.6;margin:0 0 18px">Hi ${firstName},</p>
          <p style="font-size:15px;line-height:1.6;margin:0 0 20px">
            Great news — your Heroes Senior Softball account has been approved as a <strong>${roleLabel}</strong>.
            You now have full access to the player portal.
          </p>
          <div style="background:#f0fdf4;border-left:4px solid #16a34a;border-radius:0 8px 8px 0;padding:14px 18px;margin:0 0 24px">
            <div style="font-size:13px;font-weight:700;color:#166534;margin-bottom:8px">What's waiting for you:</div>
            <ul style="margin:0;padding-left:18px;font-size:14px;line-height:1.8;color:#111">
              <li>Your personal stats and career highlights</li>
              <li>Team schedules and upcoming events</li>
              <li>RSVP to games and see who's playing</li>
              <li>Update your profile photo and jersey number</li>
            </ul>
          </div>
          <div style="text-align:center;margin:24px 0">
            <a href="${portalUrl}" style="background:#C8102E;color:#fff;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px">Go to My Heroes →</a>
          </div>
          <p style="font-size:14px;color:#555;line-height:1.6;margin-top:20px">
            Welcome to the team,<br>
            <strong>Heroes Senior Softball</strong>
          </p>
          <div style="margin-top:28px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:11.5px;color:#aaa">
            Heroes Senior Softball · Omaha, NE · <a href="https://heroesseniorsoftball.com" style="color:#C8102E;text-decoration:none">heroesseniorsoftball.com</a>
          </div>
        </div>
      </div>`;

    const text = [
      `Hi ${firstName},`,
      ``,
      `Your Heroes Senior Softball account has been approved as a ${roleLabel}.`,
      ``,
      `Head to your player portal: ${portalUrl}`,
      ``,
      `Welcome to the team,`,
      `Heroes Senior Softball`,
    ].join('\n');

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Heroes SSB <noreply@heroesseniorsoftball.com>',
        to: [playerEmail],
        subject: `You're in! Welcome to Heroes Senior Softball`,
        html,
        text,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Resend error: ${err}`);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });

  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[notify-player-approved]', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
