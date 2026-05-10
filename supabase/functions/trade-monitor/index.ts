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
 * Loss-biased random return generator.
 * Each company advertises a stated max profit (max_return_percent) and a
 * stated max loss (min_return_percent). The actual realised return:
 *   - is randomly drawn between [min, max]
 *   - never exceeds the stated max profit
 *   - is biased toward losses (~60% of outcomes land in the negative half)
 *   - profit results never reach the full advertised maximum (caps at ~85% of it)
 *     so users see "may earn UP TO X%" — actual is usually less.
 * Silent performers get a tiny upward nudge (kept subtle so they aren't obvious).
 */
function generateRealisedReturn(minPct: number, maxPct: number, isSilentPerformer: boolean): number {
  const lo = Number.isFinite(minPct) ? minPct : -10;
  const hi = Number.isFinite(maxPct) ? maxPct : 8;
  const lossBias = isSilentPerformer ? 0.45 : 0.60; // gems are slightly less loss-biased
  const goesNegative = Math.random() < lossBias;

  if (goesNegative && lo < 0) {
    // Anywhere between 0 and the worst-case (full magnitude allowed)
    const v = -Math.random() * Math.abs(lo);
    return Math.round(v * 100) / 100;
  }
  // Profit branch: capped at 85% of advertised max so it almost never hits the ceiling
  const ceiling = Math.max(0, hi) * 0.85;
  const v = Math.random() * ceiling;
  return Math.round(v * 100) / 100;
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
    
    const { data: companiesFull } = await supabase
      .from('companies')
      .select('id, cpr_last_generated_date, cpr_today, is_silent_performer, risk_level, min_return_percent, max_return_percent');
    if (companiesFull) {
      for (const company of companiesFull) {
        if (company.cpr_last_generated_date !== today) {
          const isSilent = company.is_silent_performer || false;
          const newCPR = generateRealisedReturn(
            Number(company.min_return_percent),
            Number(company.max_return_percent),
            isSilent,
          );
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
      .select(`*, companies (name, cpr_today, risk_level, is_silent_performer, min_return_percent, max_return_percent)`)
      .eq('status', 'active')
      .eq('is_matured', false)
      .lte('maturity_date', now.toISOString());

    if (maturingInvestments && maturingInvestments.length > 0) {
      for (const inv of maturingInvestments) {
        const amount = Number(inv.amount);
        // Generate a fresh realised return for THIS investment (not the company's daily CPR)
        const realised = generateRealisedReturn(
          Number(inv.companies?.min_return_percent),
          Number(inv.companies?.max_return_percent),
          inv.companies?.is_silent_performer || false,
        );
        const finalValue = calculatePayout(amount, realised);
        const profitLoss = finalValue - amount;

        // Mark as matured but NOT claimed — user must click Claim
        await supabase
          .from('investments')
          .update({
            current_value: finalValue,
            profit_loss: profitLoss,
            final_value: finalValue,
            final_profit_loss: profitLoss,
            maturity_cpr: realised,
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
    if (Math.random() < 0.3 && companiesFull) {
      const shuffled = [...companiesFull].sort(() => 0.5 - Math.random()).slice(0, 2);
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
