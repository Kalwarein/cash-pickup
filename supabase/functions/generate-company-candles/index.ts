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

    // Guardrail: prevent excessive writes if called too frequently
    const { data: latestCandle } = await supabase
      .from('company_candles')
      .select('timestamp')
      .order('timestamp', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestCandle?.timestamp) {
      const lastTs = new Date(latestCandle.timestamp).getTime();
      const nowTs = Date.now();
      if (nowTs - lastTs < 1500) {
        return new Response(
          JSON.stringify({ success: true, skipped: true, reason: 'rate_limited' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
    }

    // Get all companies with their current prices
    const { data: companies, error: fetchError } = await supabase
      .from('companies')
      .select('id, current_price, risk_level');

    if (fetchError) {
      throw new Error(`Failed to fetch companies: ${fetchError.message}`);
    }

    const now = new Date().toISOString();
    const candleInserts = [];
    const priceUpdates = [];

    for (const company of companies || []) {
      // Get the last candle for this company to ensure continuity
      const { data: lastCandle } = await supabase
        .from('company_candles')
        .select('close_price')
        .eq('company_id', company.id)
        .order('timestamp', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Use last candle's close as the open, or current_price if no history
      const prevClose = lastCandle ? Number(lastCandle.close_price) : Number(company.current_price);

      // Calculate volatility based on risk level
      let volatility: number;
      let trendBias: number;
      
      switch (company.risk_level) {
        case 'High':
          volatility = 0.04; // 4% max change
          trendBias = 0.48; // Slightly less favorable
          break;
        case 'Medium':
          volatility = 0.025; // 2.5% max change
          trendBias = 0.52; // Slightly favorable
          break;
        case 'Low':
        default:
          volatility = 0.015; // 1.5% max change
          trendBias = 0.55; // More favorable
          break;
      }

      // Generate OHLC candle with smooth continuity from previous close
      const change = (Math.random() - trendBias) * volatility;
      const closePrice = Math.max(prevClose * 0.5, Math.min(prevClose * 2, prevClose * (1 + change)));
      
      // Open = previous close (continuity)
      const openPrice = prevClose;
      
      // High/Low based on actual movement
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

    // Batch insert all candles
    const { error: insertError } = await supabase
      .from('company_candles')
      .insert(candleInserts);

    if (insertError) {
      console.error('Failed to insert company candles:', insertError);
    }

    // Update company current prices
    for (const update of priceUpdates) {
      await supabase
        .from('companies')
        .update({
          current_price: update.current_price,
          price_change_percent: update.price_change_percent,
        })
        .eq('id', update.id);
    }

    // Cleanup old candles (keep last 500 per company)
    try {
      await supabase.rpc('cleanup_old_company_candles');
    } catch (e) {
      console.error('Cleanup error:', e);
    }

    console.log(`Generated ${candleInserts.length} company candles at ${now}`);

    return new Response(
      JSON.stringify({
        success: true,
        companiesUpdated: candleInserts.length,
        timestamp: now,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error generating company candles:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
