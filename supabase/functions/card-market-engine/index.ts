import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.91.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function tokenRole(authorization: string | null): string | null {
  if (!authorization?.startsWith('Bearer ')) return null;
  const token = authorization.slice('Bearer '.length);
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')));
    return typeof payload.role === 'string' ? payload.role : null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405, headers: corsHeaders });
  }

  // The Supabase gateway verifies the JWT signature (verify_jwt=true in config.toml);
  // this role check ensures normal signed-in users cannot invoke a service-role tick.
  if (tokenRole(req.headers.get('Authorization')) !== 'service_role') {
    return Response.json({ error: 'Service role required' }, { status: 403, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Card market engine server configuration is incomplete');
    return Response.json({ error: 'Market engine unavailable' }, { status: 503, headers: corsHeaders });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.rpc('tick_card_market');
  if (error) {
    console.error('Card market tick failed:', error.message);
    return Response.json({ error: 'Market tick failed' }, { status: 500, headers: corsHeaders });
  }

  return Response.json({ success: true, cards_ticked: data, timestamp: new Date().toISOString() }, { headers: corsHeaders });
});
