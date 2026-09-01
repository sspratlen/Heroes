// delete-player
// Admin-only. Deletes a player's Supabase auth account, which cascade-deletes their
// profile row and tournament_rsvps rows (via FK ON DELETE CASCADE).
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

    // Admin-only — destructive action
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

    if (!caller || caller.role !== 'admin') {
      return json({ error: 'Forbidden — admin only' }, 403);
    }

    const { email } = await req.json();
    if (!email) return json({ error: 'Missing email' }, 400);

    // Find profile by email to get the auth user UUID
    const { data: profile } = await serviceClient
      .from('profiles')
      .select('id, display_name')
      .eq('email', email.toLowerCase())
      .single();

    if (!profile) return json({ deleted: false, reason: 'no_account' });

    // Delete auth user — cascade deletes profiles row + tournament_rsvps rows
    const { error } = await serviceClient.auth.admin.deleteUser(profile.id);
    if (error) throw error;

    return json({ deleted: true, name: profile.display_name || email });

  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[delete-player]', msg);
    return json({ error: msg }, 500);
  }
});
