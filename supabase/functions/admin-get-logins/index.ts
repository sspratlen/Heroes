// ============================================================
// admin-get-logins
//
// Returns last_sign_in_at and created_at for every auth user,
// keyed by email. Caller must be an authenticated admin.
//
// Response 200:
//   { users: { [email]: { lastLogin: string|null, createdAt: string|null } } }
// ============================================================

// @ts-ignore — Deno runtime
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

  // @ts-ignore
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  // @ts-ignore
  const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!SUPABASE_URL || !SERVICE_ROLE) {
    return json(500, { error: 'Server misconfigured.' });
  }

  // Verify caller is an approved admin
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
    return json(403, { error: 'Admins only.' });
  }

  // Fetch all auth users (paginated; collect all pages)
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const result: Record<string, { lastLogin: string | null; createdAt: string | null }> = {};
  let page = 1;

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error || !data?.users?.length) break;
    for (const u of data.users) {
      if (u.email) {
        result[u.email.toLowerCase()] = {
          lastLogin:  u.last_sign_in_at  ?? null,
          createdAt:  u.created_at       ?? null,
        };
      }
    }
    if (data.users.length < 1000) break;
    page++;
  }

  return json(200, { users: result });
});
