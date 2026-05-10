import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.91.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Hourly market engine.
 *
 * Each company has a market_cap (current net worth in SLE) and a
 * weekly_target_cap (the value it should reach by end of the 168-hour week).
 * Each tick:
 *   1) If no weekly target or older than 7 days, pick a new one between
 *      min_return_percent and max_return_percent (loss-biased).
 *   2) Walk current_price/market_cap ~1/168th toward the target plus noise.
 *   3) On the final hour of the week, snap exactly to the target.
 * Inserts a candle + price-history row and updates the companies row
 * (which Realtime broadcasts to clients).
 */

const HOURS_PER_WEEK = 168;

function pickWeeklyTarget(currentCap: number, minPct: number, maxPct: number): number {
  // 60% chance the target is below current (loss-biased market).
  const bearish = Math.random() < 0.6;
  const lo = Math.max(0, minPct);
  const range = bearish
    ? -(Math.random() * Math.abs(minPct))   // 0 .. minPct
    : (Math.random() * Math.max(0, maxPct)); // 0 .. maxPct
  const next = currentCap * (1 + range / 100);
  return Math.max(currentCap * 0.05, next); // never collapse to zero
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
      .select('id, current_price, market_cap, weekly_target_cap, weekly_target_set_at, min_return_percent, max_return_percent, price_change_percent');
    if (error) throw error;

    const now = new Date();
    const ts = now.toISOString();
    let ticks = 0;

    for (const co of companies || []) {
      const prevPrice = Number(co.current_price) || 100;
      const prevCap   = Number(co.market_cap)   || prevPrice * 1_000_000;
      const minPct    = Number(co.min_return_percent) || -10;
      const maxPct    = Number(co.max_return_percent) || 8;

      // 1) Refresh weekly target if missing/expired
      let target = Number(co.weekly_target_cap) || 0;
      let targetSet = co.weekly_target_set_at ? new Date(co.weekly_target_set_at).getTime() : 0;
      const weekMs = 7 * 24 * 60 * 60 * 1000;
      const ageMs = targetSet ? (now.getTime() - targetSet) : Infinity;

      let newTargetSetAt: string | null = null;
      if (!target || ageMs >= weekMs) {
        target = pickWeeklyTarget(prevCap, minPct, maxPct);
        targetSet = now.getTime();
        newTargetSetAt = ts;
      }

      // 2) Walk toward target. Step = remaining gap / hours_left + noise.
      const hoursElapsed = Math.max(0, Math.min(HOURS_PER_WEEK, (now.getTime() - targetSet) / 3_600_000));
      const hoursLeft = Math.max(1, HOURS_PER_WEEK - hoursElapsed);
      const gap = target - prevCap;
      const step = gap / hoursLeft;
      const noisePct = (Math.random() - 0.5) * 0.012; // ±0.6% noise per hour
      let nextCap = prevCap + step + prevCap * noisePct;

      // 3) Snap at end of week
      if (hoursLeft <= 1) nextCap = target;
      nextCap = Math.max(prevCap * 0.5, nextCap); // safety floor per tick

      // Derive next price proportionally to cap change
      const capRatio = nextCap / prevCap;
      const nextPrice = Math.max(0.01, prevPrice * capRatio);

      const open = prevPrice;
      const close = nextPrice;
      const high = Math.max(open, close) * (1 + Math.random() * 0.005);
      const low  = Math.min(open, close) * (1 - Math.random() * 0.005);
      const volume = Math.round(500 + Math.random() * 5000);
      const dayChangePct = ((close - open) / open) * 100;

      await supabase.from('company_candles').insert({
        company_id: co.id,
        timestamp: ts,
        open_price: open,
        high_price: high,
        low_price: low,
        close_price: close,
        volume,
      });

      await supabase.from('company_price_history').insert({
        company_id: co.id,
        price: close,
        change_percent: dayChangePct,
        timestamp: ts,
      });

      const update: Record<string, unknown> = {
        current_price: close,
        market_cap: nextCap,
        price_change_percent: Number(dayChangePct.toFixed(2)),
      };
      if (newTargetSetAt) {
        update.weekly_target_cap = target;
        update.weekly_target_set_at = newTargetSetAt;
      }
      await supabase.from('companies').update(update).eq('id', co.id);

      ticks++;
    }

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
