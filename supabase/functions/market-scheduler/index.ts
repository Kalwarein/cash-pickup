import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.91.1';

/**
 * Unified market scheduler - runs via pg_cron every minute.
 * Generates global market candles and company candles at a strict 2-second cadence.
 * 
 * KEY FEATURES:
 * - Backfills missing candles to ensure gapless timeline
 * - Uses upsert with ON CONFLICT to prevent duplicate key errors
 * - Runs 24/7 even when no users are online
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MS_PER_CANDLE = 2000;
const MAX_MARKET_CANDLES_PER_RUN = 30; // ~1 minute of 2s candles
const MAX_COMPANY_CANDLES_PER_COMPANY_PER_RUN = 10;

type MarketCandleInsert = {
  timestamp: string;
  open_price: number;
  high_price: number;
  low_price: number;
  close_price: number;
  volume: number;
};

type CompanyCandleInsert = {
  company_id: string;
  timestamp: string;
  open_price: number;
  high_price: number;
  low_price: number;
  close_price: number;
  volume: number;
};

function generateNextCompanyCandle(
  prevClose: number,
  riskLevel: string,
  timestampIso: string,
): { candle: Omit<CompanyCandleInsert, 'company_id'>; changePercent: number } {
  let volatility: number;
  let trendBias: number;

  switch (riskLevel) {
    case 'High':
      volatility = 0.04;
      trendBias = 0.48;
      break;
    case 'Medium':
      volatility = 0.025;
      trendBias = 0.52;
      break;
    case 'Low':
    default:
      volatility = 0.015;
      trendBias = 0.55;
      break;
  }

  const change = (Math.random() - trendBias) * volatility;
  const closePrice = Math.max(prevClose * 0.5, Math.min(prevClose * 2, prevClose * (1 + change)));
  const openPrice = prevClose;
  const intraVolatility = Math.random() * 0.008;
  const highPrice = Math.max(openPrice, closePrice) * (1 + intraVolatility);
  const lowPrice = Math.min(openPrice, closePrice) * (1 - intraVolatility);
  const volume = Math.round(Math.random() * 50000 + 10000);
  const changePercent = ((closePrice - openPrice) / openPrice) * 100;

  return {
    candle: {
      timestamp: timestampIso,
      open_price: Math.round(openPrice * 100) / 100,
      high_price: Math.round(highPrice * 100) / 100,
      low_price: Math.round(lowPrice * 100) / 100,
      close_price: Math.round(closePrice * 100) / 100,
      volume,
    },
    changePercent: Math.round(changePercent * 100) / 100,
  };
}

function generateNextMarketCandle(prevClose: number, timestampIso: string): MarketCandleInsert {
  const trend = Math.random();
  let priceChange: number;

  if (trend > 0.65) {
    priceChange = prevClose * (Math.random() * 0.02 + 0.003);
  } else if (trend < 0.35) {
    priceChange = -prevClose * (Math.random() * 0.02 + 0.003);
  } else {
    priceChange = prevClose * (Math.random() - 0.45) * 0.012;
  }

  const newClose = Math.max(600, Math.min(1600, prevClose + priceChange));
  const marketVolatility = Math.random() * 0.008;

  const open = prevClose;
  const close = Math.round(newClose * 100) / 100;
  const high = Math.round(Math.max(open, close) * (1 + marketVolatility) * 100) / 100;
  const low = Math.round(Math.min(open, close) * (1 - marketVolatility) * 100) / 100;
  const volume = Math.round(Math.random() * 100000 + 50000);

  return {
    timestamp: timestampIso,
    open_price: open,
    high_price: high,
    low_price: low,
    close_price: close,
    volume,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const results = {
      marketCandle: { success: false, skipped: false, generated: 0 },
      companyCandles: { success: false, count: 0 },
    };

    // ============ GENERATE GLOBAL MARKET CANDLES ============
    const { data: latestMarketCandle } = await supabase
      .from('market_candles')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(1)
      .maybeSingle();

    const nowMs = Date.now();
    const lastTsMs = latestMarketCandle
      ? new Date((latestMarketCandle as { timestamp: string }).timestamp).getTime()
      : nowMs - MS_PER_CANDLE;
    const prevMarketClose = latestMarketCandle
      ? Number((latestMarketCandle as { close_price: number }).close_price)
      : 1000;

    // Calculate missing candles (strict 2-second cadence)
    const missing = Math.floor((nowMs - lastTsMs) / MS_PER_CANDLE);

    if (missing <= 0) {
      results.marketCandle.skipped = true;
    } else {
      const toGenerate = Math.max(1, Math.min(MAX_MARKET_CANDLES_PER_RUN, missing));
      const inserts: MarketCandleInsert[] = [];

      let prevClose = prevMarketClose;
      for (let i = 1; i <= toGenerate; i++) {
        const ts = new Date(lastTsMs + i * MS_PER_CANDLE).toISOString();
        const next = generateNextMarketCandle(prevClose, ts);
        inserts.push(next);
        prevClose = next.close_price;
      }

      // Use upsert with ignoreDuplicates to handle concurrent writes
      const { error: marketInsertError } = await supabase
        .from('market_candles')
        .upsert(inserts, { 
          onConflict: 'timestamp',
          ignoreDuplicates: true 
        });

      if (!marketInsertError) {
        results.marketCandle.success = true;
        results.marketCandle.generated = inserts.length;
        try {
          await supabase.rpc('cleanup_old_candles');
        } catch (e) {
          console.error('Market cleanup error:', e);
        }
      } else {
        console.error('Market candle insert error:', marketInsertError);
      }
    }

    // ============ GENERATE COMPANY CANDLES ============
    const { data: companies } = await supabase
      .from('companies')
      .select('id, current_price, risk_level');

    const nowMsCompanies = Date.now();
    const candleInserts: CompanyCandleInsert[] = [];
    const priceUpdates: { id: string; current_price: number; price_change_percent: number }[] = [];

    for (const company of companies || []) {
      const { data: lastCandle } = await supabase
        .from('company_candles')
        .select('close_price, timestamp')
        .eq('company_id', company.id)
        .order('timestamp', { ascending: false })
        .limit(1)
        .maybeSingle();

      const prevClose = lastCandle ? Number(lastCandle.close_price) : Number(company.current_price);
      const lastTsMs = lastCandle?.timestamp
        ? new Date(String(lastCandle.timestamp)).getTime()
        : nowMsCompanies - MS_PER_CANDLE;

      const missing = Math.floor((nowMsCompanies - lastTsMs) / MS_PER_CANDLE);
      if (missing <= 0) continue;

      const toGenerate = Math.max(1, Math.min(MAX_COMPANY_CANDLES_PER_COMPANY_PER_RUN, missing));
      let rollingClose = prevClose;
      let lastGeneratedChangePct = 0;

      for (let i = 1; i <= toGenerate; i++) {
        const tsIso = new Date(lastTsMs + i * MS_PER_CANDLE).toISOString();
        const next = generateNextCompanyCandle(rollingClose, String(company.risk_level), tsIso);
        candleInserts.push({
          company_id: company.id,
          timestamp: next.candle.timestamp,
          open_price: next.candle.open_price,
          high_price: next.candle.high_price,
          low_price: next.candle.low_price,
          close_price: next.candle.close_price,
          volume: next.candle.volume,
        });
        rollingClose = next.candle.close_price;
        lastGeneratedChangePct = next.changePercent;
      }

      priceUpdates.push({
        id: company.id,
        current_price: Math.round(rollingClose * 100) / 100,
        price_change_percent: lastGeneratedChangePct,
      });
    }

    if (candleInserts.length > 0) {
      // Use upsert to handle duplicates gracefully
      const { error: insertError } = await supabase
        .from('company_candles')
        .upsert(candleInserts, {
          onConflict: 'company_id,timestamp',
          ignoreDuplicates: true
        });

      if (!insertError) {
        results.companyCandles.success = true;
        results.companyCandles.count = candleInserts.length;

        for (const update of priceUpdates) {
          await supabase
            .from('companies')
            .update({
              current_price: update.current_price,
              price_change_percent: update.price_change_percent,
            })
            .eq('id', update.id);
        }

        try {
          await supabase.rpc('cleanup_old_company_candles');
        } catch (e) {
          console.error('Company cleanup error:', e);
        }
      } else {
        console.error('Company candle insert error:', insertError);
      }
    }

    console.log(
       `Market scheduler completed: market_success=${results.marketCandle.success}, market_generated=${results.marketCandle.generated}, market_skipped=${results.marketCandle.skipped}, companies=${results.companyCandles.count}`
    );

    return new Response(
      JSON.stringify({
        success: true,
        results,
         timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Market scheduler error:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
