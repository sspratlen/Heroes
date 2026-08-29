// ============================================================
// admin-set-password
//
// Sets (or resets) a password for an existing player account,
// and toggles the must_change_password flag on their profile.
// If no auth account exists yet for the email, creates one.
//
// Caller must be an authenticated admin.
//
// Request body (JSON):
//   {
//     email:              string,
//     password:           string,   // min 6 chars
//     mustChangePassword: boolean
//   }
//
// Response:
//   200 { ok: true, userId, created: bool }
//   4xx { error: string }
// ============================================================

// @ts-ignore — Deno runtime
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

// @ts-ignore — Deno global
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST')    return json(405, { error: 'Method not allowed' });

  // @ts-ignore
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  // @ts-ignore
  const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!SUPABASE_URL || !SERVICE_ROLE) {
    return json(500, { error: 'Server misconfigured: missing SUPABASE env.' });
  }

  // ── Verify caller is an approved admin ───────────────────
  const authHeader  = req.headers.get('authorization') || '';
  const callerToken = authHeader.replace(/^Bearer\s+/i, '');
  if (!callerToken) return json(401, { error: 'Missing Authorization header.' });

  const callerClient = createClient(SUPABASE_URL, SERVICE_ROLE, {
    global: { headers: { Authorization: `Bearer ${callerToken}` } },
  });
  const { data: callerData, error: callerErr } = await callerClient.auth.getUser(callerToken);
  if (callerErr || !callerData?.user) return json(401, { error: 'Invalid session.' });

  const { data: callerProfile } = await callerClient
    .from('profiles')
    .select('role, approved')
    .eq('id', callerData.user.id)
    .single();

  if (!callerProfile || callerProfile.role !== 'admin' || !callerProfile.approved) {
    return json(403, { error: 'Only approved admins may set passwords.' });
  }

  // ── Parse + validate input ───────────────────────────────
  let body: { email?: string; password?: string; mustChangePassword?: boolean };
  try { body = await req.json(); } catch { return json(400, { error: 'Invalid JSON body.' }); }

  const email             = (body.email || '').trim().toLowerCase();
  const password          = body.password || '';
  const mustChangePassword = !!body.mustChangePassword;

  if (!email)              return json(400, { error: 'Email is required.' });
  if (password.length < 6) return json(400, { error: 'Password must be at least 6 characters.' });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  // ── Find or create the auth user ────────────────────────
  const { data: profile } = await admin
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  let userId: string;
  let created = false;

  if (profile?.id) {
    userId = profile.id;
    // Update password on existing account
    const { error: pwErr } = await admin.auth.admin.updateUserById(userId, {
      password,
      email_confirm: true,
    });
    if (pwErr) return json(400, { error: `Could not update password: ${pwErr.message}` });
  } else {
    // No auth account yet — create one (admin vouches, skip email confirm)
    const { data: created_, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createErr) return json(400, { error: `Could not create account: ${createErr.message}` });
    userId  = created_!.user!.id;
    created = true;
  }

  // ── Update must_change_password on profile ───────────────
  const { error: profErr } = await admin.from('profiles').upsert({
    id: userId,
    email,
    must_change_password: mustChangePassword,
    approved: true,
  }, { onConflict: 'id' });

  if (profErr) return json(500, { error: `Profile update failed: ${profErr.message}` });

  return json(200, { ok: true, userId, created });
});
