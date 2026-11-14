import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

export function transitionResponse(req: Request, payments = false): Response {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  return new Response(JSON.stringify({
    error: payments ? 'PAYMENTS_PENDING_LAUNCH_REVIEW' : 'INVESTMENTS_RETIRED',
    message: payments
      ? 'Payments are temporarily unavailable while card-trading settlement is verified.'
      : 'Company investments and mining have been replaced by collectible cards.',
  }), {
    status: payments ? 503 : 410,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}