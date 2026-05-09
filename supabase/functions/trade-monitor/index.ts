import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.91.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ACTIVITY_TEMPLATES = [
  "Quarterly review shows mixed performance results 📊",
  "Management announces strategic restructuring",
  "New market conditions affecting operations",
  "Regional expansion plans under review",
  "Efficiency improvements showing early results",
  "Stakeholder meeting scheduled for next quarter",
  "Operational adjustments in progress",
  "Performance metrics being recalculated",
  "New partnerships being explored 🤝",
  "Revenue targets exceeded expectations 🎯",
];

function getRandomActivityMessage(): string {
  return ACTIVITY_TEMPLATES[Math.floor(Math.random() * ACTIVITY_TEMPLATES.length)];
}

/**
 * Risk-tiered random CPR generator.
 *  Low risk    -> high win rate, modest gains, tiny losses (the "winners")
 *  Medium risk -> balanced
 *  High risk   -> crypto-like swings, capped -20% / +40%
 * Silent performers get a small extra positive bias.
 */
function generateDailyCPR(riskLevel: string, isSilentPerformer: boolean): number {
  const r = (riskLevel || 'medium').toLowerCase();
  const silentBoost = isSilentPerformer ? 0.10 : 0;

  if (r === 'low') {
    const positive = Math.random() < (0.78 + silentBoost);
    return positive
      ? Math.round((2 + Math.random() * 12) * 10) / 10   // +2% to +14%
      : Math.round((-1 - Math.random() * 4) * 10) / 10;  // -1% to -5%
  }

  if (r === 'high') {
    const positive = Math.random() < (0.48 + silentBoost);
    return positive
      ? Math.round((Math.random() * 40) * 10) / 10       // 0% to +40%
      : Math.round((-Math.random() * 20) * 10) / 10;     // 0% to -20%
  }

  // medium
  const positive = Math.random() < (0.55 + silentBoost);
  return positive
    ? Math.round((1 + Math.random() * 22) * 10) / 10     // +1% to +23%
    : Math.round((-1 - Math.random() * 12) * 10) / 10;   // -1% to -13%
}

function calculatePayout(amount: number, cpr: number): number {
  const multiplier = 1 + (cpr / 100);
  return Math.max(0, amount * multiplier);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const results = { investmentsMatured: 0, cprGenerated: 0, activitiesGenerated: 0 };
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // ============ GENERATE DAILY CPR FOR ALL COMPANIES ============
    const { data: companies } = await supabase.from('companies').select('id, cpr_last_generated_date, cpr_today, is_silent_performer, risk_level');
    
    if (companies) {
      for (const company of companies) {
        if (company.cpr_last_generated_date !== today) {
          const isSilent = company.is_silent_performer || false;
          const newCPR = generateDailyCPR(String(company.risk_level || 'medium'), isSilent);
          const oldCPR = Number(company.cpr_today) || 0;
          
          const { data: history } = await supabase
            .from('cpr_history')
            .select('cpr_value')
            .eq('company_id', company.id)
            .order('recorded_date', { ascending: false })
            .limit(30);
          
          const historyValues = history?.map(h => Number(h.cpr_value)) || [];
          const last7 = historyValues.slice(0, 7);
          const last30 = historyValues.slice(0, 30);
          
          const avg7 = last7.length > 0 ? last7.reduce((a, b) => a + b, 0) / last7.length : 0;
          const avg30 = last30.length > 0 ? last30.reduce((a, b) => a + b, 0) / last30.length : 0;
          const best = Math.max(newCPR, ...historyValues);
          const worst = Math.min(newCPR, ...historyValues);
          
          const allValues = [newCPR, ...historyValues.slice(0, 6)];
          const mean = allValues.reduce((a, b) => a + b, 0) / allValues.length;
          const variance = allValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / allValues.length;
          const volatility = Math.sqrt(variance);
          
          let trend = 'stable';
          if (last7.length >= 3) {
            const recentAvg = last7.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
            const olderAvg = last7.slice(3).reduce((a, b) => a + b, 0) / Math.max(1, last7.length - 3);
            if (recentAvg > olderAvg + 5) trend = 'improving';
            else if (recentAvg < olderAvg - 5) trend = 'declining';
            else if (volatility > 25) trend = 'unstable';
          }
          
          await supabase
            .from('companies')
            .update({
              cpr_yesterday: oldCPR,
              cpr_today: newCPR,
              cpr_7day_avg: Math.round(avg7 * 10) / 10,
              cpr_30day_avg: Math.round(avg30 * 10) / 10,
              cpr_best: Math.round(best * 10) / 10,
              cpr_worst: Math.round(Math.max(worst, -20) * 10) / 10,
              cpr_volatility: Math.round(volatility * 10) / 10,
              cpr_trend: trend,
              cpr_last_generated_date: today,
            })
            .eq('id', company.id);
          
          await supabase.from('cpr_history').upsert({
            company_id: company.id,
            cpr_value: newCPR,
            recorded_date: today,
          }, { onConflict: 'company_id,recorded_date' });
          
          results.cprGenerated++;
        }
      }
    }

    // ============ MATURE INVESTMENTS (do NOT auto-credit wallet) ============
    const { data: maturingInvestments } = await supabase
      .from('investments')
      .select(`*, companies (name, cpr_today, risk_level, is_silent_performer)`)
      .eq('status', 'active')
      .eq('is_matured', false)
      .lte('maturity_date', now.toISOString());

    if (maturingInvestments && maturingInvestments.length > 0) {
      for (const inv of maturingInvestments) {
        const amount = Number(inv.amount);
        const companyCPR = Number(inv.companies?.cpr_today) || 0;
        
        const finalValue = calculatePayout(amount, companyCPR);
        const profitLoss = finalValue - amount;

        // Mark as matured but NOT claimed — user must click Claim
        await supabase
          .from('investments')
          .update({
            current_value: finalValue,
            profit_loss: profitLoss,
            final_value: finalValue,
            final_profit_loss: profitLoss,
            maturity_cpr: companyCPR,
            is_matured: true,
            matured_at: now.toISOString(),
            status: 'matured',
            // is_claimed stays false
          })
          .eq('id', inv.id);

        results.investmentsMatured++;
      }
    }

    // ============ GENERATE ACTIVITIES ============
    if (Math.random() < 0.3 && companies) {
      const shuffled = companies.sort(() => 0.5 - Math.random()).slice(0, 2);
      for (const company of shuffled) {
        await supabase.from('company_activities').insert({
          company_id: company.id,
          message: getRandomActivityMessage(),
          activity_type: 'update',
        });
        results.activitiesGenerated++;
      }
    }

    console.log(`Monitor: matured=${results.investmentsMatured}, cpr=${results.cprGenerated}, activities=${results.activitiesGenerated}`);

    return new Response(
      JSON.stringify({ success: true, results, timestamp: now.toISOString() }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Monitor error:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
