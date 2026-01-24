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

    // Get all companies
    const { data: companies, error: fetchError } = await supabase
      .from('companies')
      .select('id, current_price, risk_level');

    if (fetchError) {
      throw new Error(`Failed to fetch companies: ${fetchError.message}`);
    }

    const updates = [];
    const priceHistoryInserts = [];
    const now = new Date().toISOString();

    for (const company of companies || []) {
      const currentPrice = Number(company.current_price);
      
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

      const change = (Math.random() - trendBias) * volatility;
      const newPrice = Math.max(currentPrice * 0.5, Math.min(currentPrice * 2, currentPrice * (1 + change)));
      const roundedPrice = Math.round(newPrice * 100) / 100;
      const changePercent = Math.round(((roundedPrice - currentPrice) / currentPrice) * 10000) / 100;

      updates.push({
        id: company.id,
        current_price: roundedPrice,
        price_change_percent: changePercent,
      });

      priceHistoryInserts.push({
        company_id: company.id,
        price: roundedPrice,
        timestamp: now,
        change_percent: changePercent,
      });
    }

    // Update company prices
    for (const update of updates) {
      await supabase
        .from('companies')
        .update({ 
          current_price: update.current_price, 
          price_change_percent: update.price_change_percent 
        })
        .eq('id', update.id);
    }

    // Insert price history
    const { error: historyError } = await supabase
      .from('company_price_history')
      .insert(priceHistoryInserts);

    if (historyError) {
      console.error('Failed to insert price history:', historyError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        companiesUpdated: updates.length,
        timestamp: now
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error updating prices:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});