import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.91.1';

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

    // Get the latest candle
    const { data: latestCandle, error: fetchError } = await supabase
      .from('market_candles')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    if (fetchError) {
      throw new Error(`Failed to fetch latest candle: ${fetchError.message}`);
    }

    const prevClose = latestCandle ? Number(latestCandle.close_price) : 1000;
    
    // Generate realistic market movement with trends
    const trend = Math.random();
    let priceChange: number;
    
    if (trend > 0.65) {
      // Strong up movement (35% chance)
      priceChange = prevClose * (Math.random() * 0.02 + 0.003);
    } else if (trend < 0.35) {
      // Strong down movement (35% chance)
      priceChange = -prevClose * (Math.random() * 0.02 + 0.003);
    } else {
      // Sideways with slight up bias (30% chance)
      priceChange = prevClose * (Math.random() - 0.45) * 0.012;
    }

    const newClose = Math.max(600, Math.min(1600, prevClose + priceChange));
    const volatility = Math.random() * 0.008;
    
    const openPrice = prevClose;
    const closePrice = Math.round(newClose * 100) / 100;
    const highPrice = Math.round(Math.max(openPrice, closePrice) * (1 + volatility) * 100) / 100;
    const lowPrice = Math.round(Math.min(openPrice, closePrice) * (1 - volatility) * 100) / 100;
    const volume = Math.round(Math.random() * 100000 + 50000);

    // Insert new candle
    const { data: newCandle, error: insertError } = await supabase
      .from('market_candles')
      .insert({
        open_price: openPrice,
        high_price: highPrice,
        low_price: lowPrice,
        close_price: closePrice,
        volume: volume,
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Failed to insert candle: ${insertError.message}`);
    }

    // Keep only the last 500 candles to prevent table bloat
    const { error: cleanupError } = await supabase.rpc('cleanup_old_candles');
    
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
