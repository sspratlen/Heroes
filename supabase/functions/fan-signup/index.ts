// fan-signup
// Called from fan-invite.html immediately after auth.signUp() succeeds.
// Sets role='fan' and approved=true — no admin review needed.
// Env vars: SUPABASE_URL (auto), SUPABASE_SERVICE_ROLE_KEY (auto)

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

  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) return json(401, { error: 'Missing Authorization header.' });

  const svc = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: { user }, error: userErr } = await svc.auth.getUser(token);
  if (userErr || !user) return json(401, { error: 'Invalid or expired token.' });

  await svc
    .from('profiles')
    .update({ role: 'fan', approved: true })
    .eq('id', user.id);

  return json(200, { ok: true });
});
