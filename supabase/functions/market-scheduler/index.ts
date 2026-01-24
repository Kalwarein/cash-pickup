import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.91.1';

/**
 * Unified market scheduler that generates both global market candles
 * and company candles. This is called by pg_cron every minute to ensure
 * 24/7 market movement even when no users are online.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const results = {
      marketCandle: { success: false, skipped: false },
      companyCandles: { success: false, count: 0 },
    };

    // ============ GENERATE GLOBAL MARKET CANDLE ============
    const { data: latestMarketCandle } = await supabase
      .from('market_candles')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(1)
      .maybeSingle();

    const prevMarketClose = latestMarketCandle ? Number(latestMarketCandle.close_price) : 1000;

    // Generate realistic market movement with trends
    const trend = Math.random();
    let priceChange: number;
    
    if (trend > 0.65) {
      priceChange = prevMarketClose * (Math.random() * 0.02 + 0.003);
    } else if (trend < 0.35) {
      priceChange = -prevMarketClose * (Math.random() * 0.02 + 0.003);
    } else {
      priceChange = prevMarketClose * (Math.random() - 0.45) * 0.012;
    }

    const newMarketClose = Math.max(600, Math.min(1600, prevMarketClose + priceChange));
    const marketVolatility = Math.random() * 0.008;
    
    const marketOpen = prevMarketClose;
    const marketClose = Math.round(newMarketClose * 100) / 100;
    const marketHigh = Math.round(Math.max(marketOpen, marketClose) * (1 + marketVolatility) * 100) / 100;
    const marketLow = Math.round(Math.min(marketOpen, marketClose) * (1 - marketVolatility) * 100) / 100;
    const marketVolume = Math.round(Math.random() * 100000 + 50000);

    const { error: marketInsertError } = await supabase
      .from('market_candles')
      .insert({
        open_price: marketOpen,
        high_price: marketHigh,
        low_price: marketLow,
        close_price: marketClose,
        volume: marketVolume,
      });

    if (!marketInsertError) {
      results.marketCandle.success = true;
      // Cleanup old market candles
      try {
        await supabase.rpc('cleanup_old_candles');
      } catch (e) {
        console.error('Market cleanup error:', e);
      }
    }

    // ============ GENERATE COMPANY CANDLES ============
    const { data: companies } = await supabase
      .from('companies')
      .select('id, current_price, risk_level');

    const now = new Date().toISOString();
    const candleInserts = [];
    const priceUpdates = [];

    for (const company of companies || []) {
      const { data: lastCandle } = await supabase
        .from('company_candles')
        .select('close_price')
        .eq('company_id', company.id)
        .order('timestamp', { ascending: false })
        .limit(1)
        .maybeSingle();

      const prevClose = lastCandle ? Number(lastCandle.close_price) : Number(company.current_price);

      let volatility: number;
      let trendBias: number;
      
      switch (company.risk_level) {
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

      candleInserts.push({
        company_id: company.id,
        timestamp: now,
        open_price: Math.round(openPrice * 100) / 100,
        high_price: Math.round(highPrice * 100) / 100,
        low_price: Math.round(lowPrice * 100) / 100,
        close_price: Math.round(closePrice * 100) / 100,
        volume,
      });

      priceUpdates.push({
        id: company.id,
        current_price: Math.round(closePrice * 100) / 100,
        price_change_percent: Math.round(changePercent * 100) / 100,
      });
    }

    if (candleInserts.length > 0) {
      const { error: insertError } = await supabase
        .from('company_candles')
        .insert(candleInserts);

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
      }
    }

    console.log(`Market scheduler completed: market=${results.marketCandle.success}, companies=${results.companyCandles.count}`);

    return new Response(
      JSON.stringify({
        success: true,
        results,
        timestamp: now,
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
