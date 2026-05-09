import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.91.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * 24/7 simulated market engine.
 * Runs every minute via pg_cron and:
 *   - generates a fresh price tick per company (random walk biased by risk + CPR)
 *   - inserts a new candle into company_candles (broadcast to clients)
 *   - updates companies.current_price + price_change_percent (broadcast)
 *   - inserts a row into company_price_history for the chart
 *
 * Risk tiers (per-tick volatility & drift):
 *   Low    => tiny moves (-0.4% .. +0.7%) — calm, slightly upward
 *   Medium => moderate    (-0.9% .. +1.2%)
 *   High   => crypto-like (-1.8% .. +2.2%)
 */

function tickMove(risk: string, cprToday: number): number {
  const r = (risk || 'medium').toLowerCase();
  const cprDrift = Math.max(-0.05, Math.min(0.05, cprToday / 1000)); // tiny pull toward CPR
  let lo: number, hi: number;
  if (r === 'low')        { lo = -0.4; hi = 0.7; }
  else if (r === 'high')  { lo = -1.8; hi = 2.2; }
  else                    { lo = -0.9; hi = 1.2; }
  const pct = lo + Math.random() * (hi - lo);
  return (pct / 100) + cprDrift;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: companies, error } = await supabase
      .from('companies')
      .select('id, current_price, risk_level, cpr_today, price_change_percent');
    if (error) throw error;

    const now = new Date();
    const ts = now.toISOString();
    let ticks = 0;

    for (const co of companies || []) {
      const prev = Number(co.current_price) || 100;
      const move = tickMove(String(co.risk_level), Number(co.cpr_today) || 0);
      const next = Math.max(0.01, prev * (1 + move));
      const open = prev;
      const close = next;
      const high = Math.max(open, close) * (1 + Math.random() * 0.003);
      const low  = Math.min(open, close) * (1 - Math.random() * 0.003);
      const volume = Math.round(500 + Math.random() * 5000);
      const dayChange = ((next - prev) / prev) * 100;

      // Candle for chart (realtime broadcast)
      await supabase.from('company_candles').insert({
        company_id: co.id,
        timestamp: ts,
        open_price: open,
        high_price: high,
        low_price: low,
        close_price: close,
        volume,
      });

      // Price history entry
      await supabase.from('company_price_history').insert({
        company_id: co.id,
        price: close,
        change_percent: dayChange,
        timestamp: ts,
      });

      // Update company current price (realtime broadcast)
      await supabase
        .from('companies')
        .update({
          current_price: close,
          price_change_percent: Number((Number(co.price_change_percent) || 0) + dayChange).toFixed(2),
        })
        .eq('id', co.id);

      ticks++;
    }

    // Trim candle history occasionally to keep table small
    if (Math.random() < 0.1) {
      await supabase.rpc('cleanup_old_company_candles');
    }

    return new Response(
      JSON.stringify({ success: true, ticks, timestamp: ts }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    console.error('market-engine error:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});