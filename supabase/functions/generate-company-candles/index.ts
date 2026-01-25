import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.91.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MS_PER_CANDLE = 2000;
const MAX_CANDLES_PER_COMPANY_PER_RUN = 10; // limits work per 2s tick while still catching up quickly

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
): Omit<CompanyCandleInsert, 'company_id'> & { changePercent: number } {
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
    timestamp: timestampIso,
    open_price: Math.round(openPrice * 100) / 100,
    high_price: Math.round(highPrice * 100) / 100,
    low_price: Math.round(lowPrice * 100) / 100,
    close_price: Math.round(closePrice * 100) / 100,
    volume,
    changePercent: Math.round(changePercent * 100) / 100,
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

    // Get all companies with their current prices
    const { data: companies, error: fetchError } = await supabase
      .from('companies')
      .select('id, current_price, risk_level');

    if (fetchError) {
      throw new Error(`Failed to fetch companies: ${fetchError.message}`);
    }

    const nowMs = Date.now();
    const candleInserts: CompanyCandleInsert[] = [];
    const priceUpdates: { id: string; current_price: number; price_change_percent: number }[] = [];

    for (const company of companies || []) {
      // Get the last candle for this company to ensure continuity
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
        : nowMs - MS_PER_CANDLE;

      const missing = Math.floor((nowMs - lastTsMs) / MS_PER_CANDLE);
      if (missing <= 0) continue;

      const toGenerate = Math.max(1, Math.min(MAX_CANDLES_PER_COMPANY_PER_RUN, missing));

      let rollingClose = prevClose;
      let lastGeneratedChangePct = 0;
      for (let i = 1; i <= toGenerate; i++) {
        const tsIso = new Date(lastTsMs + i * MS_PER_CANDLE).toISOString();
        const next = generateNextCompanyCandle(rollingClose, String(company.risk_level), tsIso);
        candleInserts.push({
          company_id: company.id,
          timestamp: next.timestamp,
          open_price: next.open_price,
          high_price: next.high_price,
          low_price: next.low_price,
          close_price: next.close_price,
          volume: next.volume,
        });
        rollingClose = next.close_price;
        lastGeneratedChangePct = next.changePercent;
      }

      priceUpdates.push({
        id: company.id,
        current_price: Math.round(rollingClose * 100) / 100,
        price_change_percent: lastGeneratedChangePct,
      });
    }

    // Batch insert all candles
    const { error: insertError } = candleInserts.length
      ? await supabase.from('company_candles').insert(candleInserts)
      : { error: null };

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

    console.log(`Generated ${candleInserts.length} company candles at ${new Date(nowMs).toISOString()}`);

    return new Response(
      JSON.stringify({
        success: true,
        companiesUpdated: candleInserts.length,
        timestamp: new Date(nowMs).toISOString(),
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
