import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.91.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Generate a single market candle. Uses strict 2-second cadence to ensure
 * seamless continuity (no breaks/jumps when users return).
 * 
 * Uses ON CONFLICT DO NOTHING to avoid duplicate key errors when multiple
 * clients call this function simultaneously.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the latest candle
    const { data: latestCandle, error: fetchError } = await supabase
      .from('market_candles')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      throw new Error(`Failed to fetch latest candle: ${fetchError.message}`);
    }

    const MS_PER_CANDLE = 2000;
    const nowMs = Date.now();
    
    // Determine the last candle timestamp and close price
    const lastTsMs = latestCandle?.timestamp 
      ? new Date(latestCandle.timestamp).getTime() 
      : nowMs - MS_PER_CANDLE;
    const prevClose = latestCandle ? Number(latestCandle.close_price) : 1000;

    // Calculate how many candles are missing
    const gap = nowMs - lastTsMs;
    const missingCount = Math.floor(gap / MS_PER_CANDLE);

    // If no candles are needed (gap < 2s), skip
    if (missingCount <= 0) {
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: 'no_gap' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Rate limit: only generate 1 candle per call from client heartbeat
    // The full backfill is handled by market-scheduler (pg_cron)
    const toGenerate = Math.min(1, missingCount);
    
    // Calculate exact next timestamp (strict cadence)
    const nextTsMs = lastTsMs + MS_PER_CANDLE;
    const nextTsIso = new Date(nextTsMs).toISOString();

    // Generate realistic market movement
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
    const volatility = Math.random() * 0.008;
    
    const openPrice = prevClose;
    const closePrice = Math.round(newClose * 100) / 100;
    const highPrice = Math.round(Math.max(openPrice, closePrice) * (1 + volatility) * 100) / 100;
    const lowPrice = Math.round(Math.min(openPrice, closePrice) * (1 - volatility) * 100) / 100;
    const volume = Math.round(Math.random() * 100000 + 50000);

    // Insert new candle with ON CONFLICT DO NOTHING to handle race conditions
    const { data: newCandle, error: insertError } = await supabase
      .from('market_candles')
      .upsert(
        {
          timestamp: nextTsIso,
          open_price: openPrice,
          high_price: highPrice,
          low_price: lowPrice,
          close_price: closePrice,
          volume: volume,
        },
        { 
          onConflict: 'timestamp',
          ignoreDuplicates: true 
        }
      )
      .select()
      .maybeSingle();

    // Even if upsert returned nothing (duplicate), that's okay
    if (insertError) {
      // If it's a duplicate key error, just skip gracefully
      if (insertError.message.includes('duplicate key')) {
        return new Response(
          JSON.stringify({ success: true, skipped: true, reason: 'duplicate_timestamp' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      throw new Error(`Failed to insert candle: ${insertError.message}`);
    }

    // Cleanup old candles periodically (not every call)
    if (Math.random() < 0.1) {
      try {
        await supabase.rpc('cleanup_old_candles');
      } catch (e) {
        console.error('Cleanup error:', e);
      }
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        candle: newCandle,
        previousClose: prevClose,
        newClose: closePrice,
        change: ((closePrice - prevClose) / prevClose * 100).toFixed(2) + '%'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error generating candle:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
