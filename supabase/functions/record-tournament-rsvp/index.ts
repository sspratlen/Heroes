// record-tournament-rsvp
// Public (no auth required). Validates a player's token, records their RSVP response,
// and returns tournament info + full team roster for the confirmation page.
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

    const { token, response } = await req.json();

    if (!token) return json({ error: 'Missing token' }, 400);
    if (!['yes', 'no', 'maybe'].includes(response)) {
      return json({ error: 'Invalid response — must be yes, no, or maybe' }, 400);
    }

    // Look up the RSVP row by token
    const { data: rsvp } = await serviceClient
      .from('tournament_rsvps')
      .select('id, tournament_id, player_id, status')
      .eq('token', token)
      .single();

    if (!rsvp) return json({ error: 'Invalid or expired link' }, 404);

    // Update the response
    await serviceClient
      .from('tournament_rsvps')
      .update({ status: response, responded_at: new Date().toISOString() })
      .eq('token', token);

    // Fetch tournament snapshot
    const { data: meta } = await serviceClient
      .from('tournament_email_meta')
      .select('name, start_date, end_date, location')
      .eq('tournament_id', rsvp.tournament_id)
      .single();

    // Fetch all RSVPs for this tournament joined with player names
    const { data: allRsvps } = await serviceClient
      .from('tournament_rsvps')
      .select('player_id, status, profiles(display_name)')
      .eq('tournament_id', rsvp.tournament_id);

    // Sort: yes → maybe → pending → no
    const statusOrder: Record<string, number> = { yes: 0, maybe: 1, pending: 2, no: 3 };
    const roster = ((allRsvps || []) as Array<{
      player_id: string;
      status: string;
      profiles: { display_name: string } | null;
    }>)
      .map(r => ({
        name: r.profiles?.display_name || 'Unknown',
        status: r.status,
      }))
      .sort((a, b) => (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99));

    return json({
      tournament: meta,
      myStatus: response,
      roster,
    });

  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[record-tournament-rsvp]', msg);
    return json({ error: msg }, 500);
  }
});
