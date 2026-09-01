// notify-new-registration
// Called from auth.js after sb.auth.signUp() succeeds.
// Fetches all approved admin emails from profiles and sends a notification.
// Env vars: RESEND_API_KEY, SUPABASE_URL (auto), SUPABASE_SERVICE_ROLE_KEY (auto)

// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// @ts-ignore
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const { playerName, playerEmail } = await req.json();
    if (!playerEmail) {
      return new Response(JSON.stringify({ ok: true, skipped: 'no email' }), {
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // @ts-ignore
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    // @ts-ignore
    const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    // @ts-ignore
    const RESEND_KEY   = Deno.env.get('RESEND_API_KEY')!;

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Fetch all approved admin emails
    const { data: admins } = await admin
      .from('profiles')
      .select('email')
      .eq('role', 'admin')
      .eq('approved', true);

    const adminEmails = (admins || []).map((a: { email: string }) => a.email).filter(Boolean);
    if (!adminEmails.length) {
      return new Response(JSON.stringify({ ok: true, skipped: 'no admins' }), {
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const name = playerName || playerEmail.split('@')[0];
    const adminUrl = 'https://heroesseniorsoftball.com/admin.html';

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#111">
        <div style="background:#C8102E;padding:24px 28px;border-radius:10px 10px 0 0">
          <p style="margin:0;color:rgba(255,255,255,.7);font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase">Heroes Senior Softball · Admin Alert</p>
          <h1 style="margin:8px 0 0;color:#fff;font-size:22px;font-weight:700">New Player Signup ⚾</h1>
        </div>
        <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;padding:28px;border-radius:0 0 10px 10px">
          <p style="font-size:15px;line-height:1.6;margin:0 0 18px">A new player just created an account and is waiting for approval:</p>
          <div style="background:#f8f8f8;border-left:4px solid #C8102E;border-radius:0 8px 8px 0;padding:14px 18px;margin:0 0 24px">
            <div style="font-size:13px;color:#888;font-weight:700;text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px">Player</div>
            <div style="font-size:17px;font-weight:700;color:#111">${name}</div>
            <div style="font-size:14px;color:#555;margin-top:2px">${playerEmail}</div>
          </div>
          <div style="text-align:center;margin:24px 0">
            <a href="${adminUrl}#account-requests" style="background:#C8102E;color:#fff;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px">Review in Admin Panel →</a>
          </div>
          <p style="font-size:13px;color:#888;margin-top:24px;line-height:1.6">
            This player's account is <strong>pending approval</strong>. They can log in but won't have access to team features until you approve them under Account Requests.
          </p>
          <div style="margin-top:28px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:11.5px;color:#aaa">
            Heroes Senior Softball · Omaha, NE · <a href="https://heroesseniorsoftball.com" style="color:#C8102E;text-decoration:none">heroesseniorsoftball.com</a>
          </div>
        </div>
      </div>`;

    const text = [
      `New player signup: ${name} (${playerEmail})`,
      ``,
      `This account is pending approval. Go to the Admin Panel → Account Requests to review:`,
      adminUrl,
    ].join('\n');

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Heroes SSB <noreply@heroesseniorsoftball.com>',
        to: adminEmails,
        subject: `New player signup: ${name}`,
        html,
        text,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Resend error: ${err}`);
    }

    return new Response(JSON.stringify({ ok: true, notified: adminEmails.length }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });

  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[notify-new-registration]', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
