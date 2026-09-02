// notify-password-changed
// Called from the client after a successful Supabase password update.
// Sends a security notification email via Resend.
// Env vars: RESEND_API_KEY

// @ts-ignore
Deno.serve(async (req: Request) => {
  const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const { email, name } = await req.json();
    if (!email) {
      return new Response(JSON.stringify({ ok: true, skipped: 'no email' }), {
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // @ts-ignore
    const RESEND_KEY = Deno.env.get('RESEND_API_KEY')!;
    const firstName  = (name || '').trim().split(/\s+/)[0] || 'there';
    const portalUrl  = 'https://heroesseniorsoftball.com/#/my';

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#111">
        <div style="background:#C8102E;padding:24px 28px;border-radius:10px 10px 0 0">
          <p style="margin:0;color:rgba(255,255,255,.7);font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase">Heroes Senior Softball · Omaha, NE</p>
          <h1 style="margin:8px 0 0;color:#fff;font-size:22px;font-weight:700">🔒 Password Changed</h1>
        </div>
        <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;padding:28px;border-radius:0 0 10px 10px">
          <p style="font-size:15px;line-height:1.6;margin:0 0 18px">Hi ${firstName},</p>
          <p style="font-size:15px;line-height:1.6;margin:0 0 20px">
            Your Heroes Senior Softball account password was just changed successfully.
          </p>
          <div style="background:#fef2f4;border-left:4px solid #C8102E;border-radius:0 8px 8px 0;padding:14px 18px;margin:0 0 24px">
            <div style="font-size:13px;font-weight:700;color:#991b1b;margin-bottom:6px">Wasn't you?</div>
            <div style="font-size:14px;color:#555;line-height:1.6">
              If you didn't make this change, please contact a Heroes admin immediately.
            </div>
          </div>
          <div style="text-align:center;margin:24px 0">
            <a href="${portalUrl}" style="background:#C8102E;color:#fff;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px">Go to My Heroes →</a>
          </div>
          <p style="font-size:14px;color:#555;line-height:1.6;margin-top:20px">
            Stay secure,<br>
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
      `Your Heroes Senior Softball account password was just changed successfully.`,
      ``,
      `If you didn't make this change, please contact a Heroes admin immediately.`,
      ``,
      `Stay secure,`,
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
        to: [email],
        subject: 'Your Heroes password was changed',
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
    console.error('[notify-password-changed]', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
