// player-signup
// Called from player-invite.html immediately after auth.signUp() succeeds.
// Matches the new user to a players row by email or name.
// Matched → sets approved=true, player_id, role='player'.
// Unmatched → sets approved=false, pending_team, role='player'.
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

  // Verify the JWT and get the calling user's id
  const { data: { user }, error: userErr } = await svc.auth.getUser(token);
  if (userErr || !user) return json(401, { error: 'Invalid or expired token.' });

  let body: { email?: string; firstName?: string; lastName?: string; teamId?: string };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: 'Invalid JSON body.' });
  }

  const { email = '', firstName = '', lastName = '', teamId = '' } = body;

  // Try email match first (case-insensitive)
  let matchedPlayer: { id: string } | null = null;
  if (email) {
    const { data: byEmail } = await svc
      .from('players')
      .select('id')
      .ilike('email', email.trim())
      .limit(1)
      .single();
    if (byEmail) matchedPlayer = byEmail;
  }

  // Fall back to name match
  if (!matchedPlayer && firstName && lastName) {
    const { data: byName } = await svc
      .from('players')
      .select('id')
      .ilike('first_name', firstName.trim())
      .ilike('last_name', lastName.trim())
      .limit(1)
      .single();
    if (byName) matchedPlayer = byName;
  }

  if (matchedPlayer) {
    await svc
      .from('profiles')
      .update({ role: 'player', approved: true, player_id: matchedPlayer.id, pending_team: '' })
      .eq('id', user.id);
    return json(200, { matched: true });
  }

  // No match — store pending_team for admin review
  await svc
    .from('profiles')
    .update({ role: 'player', approved: false, pending_team: teamId })
    .eq('id', user.id);
  return json(200, { matched: false });
});
