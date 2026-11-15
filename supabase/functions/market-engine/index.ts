import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.91.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * 1-minute market engine — single source of truth.
 * Each tick:
 *  - Refresh weekly target if missing/expired (7d).
 *  - Walk market_cap toward target with small noise.
 *  - Upsert 1 row in company_candles_1m (idempotent on (company_id, bucket_start)).
 *  - Update companies.current_price / market_cap / price_change_percent (24h).
 */

const MINUTES_PER_WEEK = 7 * 24 * 60;

function pickWeeklyTarget(currentCap: number, minPct: number, maxPct: number): number {
  const bearish = Math.random() < 0.6;
  const range = bearish
    ? -(Math.random() * Math.abs(minPct))
    : (Math.random() * Math.max(0, maxPct));
  const next = currentCap * (1 + range / 100);
  return Math.max(currentCap * 0.05, next);
}

function floorToMinute(d: Date): Date {
  const x = new Date(d);
  x.setSeconds(0, 0);
  return x;
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
      .select('id, current_price, market_cap, weekly_target_cap, weekly_target_set_at, min_return_percent, max_return_percent');
    if (error) throw error;

    const now = new Date();
    const bucket = floorToMinute(now).toISOString();
    let ticks = 0;

    for (const co of companies || []) {
      const prevPrice = Number(co.current_price) || 100;
      const prevCap   = Number(co.market_cap)    || prevPrice * 1_000_000;
      const minPct    = Number(co.min_return_percent) || -10;
      const maxPct    = Number(co.max_return_percent) || 8;

      let target = Number(co.weekly_target_cap) || 0;
      let targetSet = co.weekly_target_set_at ? new Date(co.weekly_target_set_at).getTime() : 0;
      const weekMs = 7 * 24 * 60 * 60 * 1000;
      const ageMs = targetSet ? (now.getTime() - targetSet) : Infinity;

      let newTargetSetAt: string | null = null;
      if (!target || ageMs >= weekMs) {
        target = pickWeeklyTarget(prevCap, minPct, maxPct);
        targetSet = now.getTime();
        newTargetSetAt = new Date(targetSet).toISOString();
      }

      const minsElapsed = Math.max(0, Math.min(MINUTES_PER_WEEK, (now.getTime() - targetSet) / 60_000));
      const minsLeft = Math.max(1, MINUTES_PER_WEEK - minsElapsed);
      const gap = target - prevCap;
      const step = gap / minsLeft;
      const noisePct = (Math.random() - 0.5) * 0.0025; // ±0.125%/min
      let nextCap = prevCap + step + prevCap * noisePct;
      if (minsLeft <= 1) nextCap = target;
      nextCap = Math.max(prevCap * 0.7, nextCap); // safety

      const ratio = nextCap / prevCap;
      const nextPrice = Math.max(0.01, prevPrice * ratio);

      const open = prevPrice;
      const close = nextPrice;
      const high = Math.max(open, close) * (1 + Math.random() * 0.0015);
      const low  = Math.min(open, close) * (1 - Math.random() * 0.0015);
      const volume = Math.round(50 + Math.random() * 800);

      await supabase.from('company_candles_1m').upsert({
        company_id: co.id,
        bucket_start: bucket,
        open, high, low, close, volume,
      }, { onConflict: 'company_id,bucket_start' });

      // 24h change vs ~1440 mins ago
      const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      const { data: prev24 } = await supabase
        .from('company_candles_1m')
        .select('close')
        .eq('company_id', co.id)
        .lte('bucket_start', dayAgo)
        .order('bucket_start', { ascending: false })
        .limit(1)
        .maybeSingle();
      const ref = prev24?.close ? Number(prev24.close) : open;
      const dayChangePct = ref > 0 ? ((close - ref) / ref) * 100 : 0;

      const update: Record<string, unknown> = {
        current_price: close,
        market_cap: nextCap,
        price_change_percent: Number(dayChangePct.toFixed(3)),
      };
      if (newTargetSetAt) {
        update.weekly_target_cap = target;
        update.weekly_target_set_at = newTargetSetAt;
      }
      await supabase.from('companies').update(update).eq('id', co.id);

      ticks++;
    }

    if (Math.random() < 0.01) {
      await supabase.rpc('cleanup_old_candles_1m');
    }

    return new Response(
      JSON.stringify({ success: true, ticks, bucket }),
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
