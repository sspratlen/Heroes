// invite-player
// Admin-initiated invite. Creates a Supabase invite link (magic link that lands
// the user in the set-password flow), then sends a branded email via Resend.
// Requires an authenticated admin caller.
// Env vars: RESEND_API_KEY, SUPABASE_URL (auto), SUPABASE_SERVICE_ROLE_KEY (auto)

// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

// @ts-ignore
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });

  // @ts-ignore
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  // @ts-ignore
  const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  // @ts-ignore
  const RESEND_KEY   = Deno.env.get('RESEND_API_KEY')!;

  // Verify caller is an approved admin or manager
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) return json(401, { error: 'Missing Authorization header.' });

  const adminClient = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: callerData, error: callerErr } = await adminClient.auth.getUser(token);
  if (callerErr || !callerData?.user) return json(401, { error: 'Invalid session.' });

  const { data: callerProfile } = await adminClient
    .from('profiles')
    .select('role, approved')
    .eq('id', callerData.user.id)
    .single();

  if (!callerProfile?.approved || !['admin', 'manager'].includes(callerProfile.role)) {
    return json(403, { error: 'Only approved admins or managers may send invites.' });
  }

  // Parse request
  let body: { email?: string; displayName?: string; redirectTo?: string };
  try { body = await req.json(); } catch { return json(400, { error: 'Invalid JSON.' }); }

  const email       = (body.email || '').trim().toLowerCase();
  const displayName = (body.displayName || '').trim();
  const redirectTo  = body.redirectTo || 'https://heroesseniorsoftball.com/index.html';

  if (!email) return json(400, { error: 'Email is required.' });

  // Generate invite link via Supabase admin API (creates user + magic link)
  const { data: inviteData, error: inviteErr } = await adminClient.auth.admin.generateLink({
    type: 'invite',
    email,
    options: { redirectTo, data: { display_name: displayName || email.split('@')[0] } },
  });

  if (inviteErr) {
    // If user already exists, that's fine — still send a fresh magic link
    if (!inviteErr.message?.toLowerCase().includes('already')) {
      return json(400, { error: `Could not generate invite: ${inviteErr.message}` });
    }
    // Existing user: send a magic link (OTP) instead
    const { error: otpErr } = await adminClient.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: { redirectTo },
    });
    if (otpErr) return json(400, { error: `Could not generate magic link: ${otpErr.message}` });
  }

  const inviteUrl = inviteData?.properties?.action_link || redirectTo;
  const firstName = displayName.split(/\s+/)[0] || 'there';

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#111">
      <div style="background:#C8102E;padding:24px 28px;border-radius:10px 10px 0 0">
        <p style="margin:0;color:rgba(255,255,255,.7);font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase">Heroes Senior Softball · Omaha, NE</p>
        <h1 style="margin:8px 0 0;color:#fff;font-size:22px;font-weight:700">You're Invited! ⚾</h1>
      </div>
      <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;padding:28px;border-radius:0 0 10px 10px">
        <p style="font-size:15px;line-height:1.6;margin:0 0 16px">Hi ${firstName},</p>
        <p style="font-size:15px;line-height:1.6;margin:0 0 20px">
          You've been invited to join the <strong>Heroes Senior Softball</strong> player portal — the home base for schedules, stats, event RSVPs, and your personal player profile.
        </p>
        <div style="background:#fef2f2;border-left:4px solid #C8102E;border-radius:0 8px 8px 0;padding:14px 18px;margin:0 0 24px">
          <div style="font-size:13px;font-weight:700;color:#991b1b;margin-bottom:8px">To get started:</div>
          <ol style="margin:0;padding-left:18px;font-size:14px;line-height:1.8;color:#111">
            <li>Click the button below</li>
            <li>Set your own password</li>
            <li>Complete your player profile (jersey #, position, photo)</li>
          </ol>
        </div>
        <div style="text-align:center;margin:24px 0">
          <a href="${inviteUrl}" style="background:#C8102E;color:#fff;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px">Set Up My Account →</a>
        </div>
        <p style="font-size:13px;color:#888;line-height:1.6;margin-top:20px">
          This link expires in <strong>48 hours</strong>. If you didn't expect this email, you can safely ignore it.
        </p>
        <div style="margin-top:28px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:11.5px;color:#aaa">
          Heroes Senior Softball · Omaha, NE · <a href="https://heroesseniorsoftball.com" style="color:#C8102E;text-decoration:none">heroesseniorsoftball.com</a>
        </div>
      </div>
    </div>`;

  const text = [
    `Hi ${firstName},`,
    ``,
    `You've been invited to join the Heroes Senior Softball player portal.`,
    ``,
    `Click the link below to set up your account (expires in 48 hours):`,
    inviteUrl,
    ``,
    `Heroes Senior Softball · heroesseniorsoftball.com`,
  ].join('\n');

  const resendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Heroes SSB <noreply@heroesseniorsoftball.com>',
      to: [email],
      subject: `You're invited to the Heroes Senior Softball portal`,
      html,
      text,
    }),
  });

  if (!resendRes.ok) {
    const err = await resendRes.text();
    throw new Error(`Resend error: ${err}`);
  }

  return json(200, { ok: true, userId: inviteData?.user?.id });
});
