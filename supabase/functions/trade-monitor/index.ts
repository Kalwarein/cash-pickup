import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.91.1';

/**
 * Investment monitor that runs periodically to:
 * 1. Generate daily CPR values for all companies (biased toward negative)
 * 2. Mature investments using maturity-day CPR
 * 3. Generate random company activity feed messages
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ACTIVITY_TEMPLATES = [
  "Quarterly review shows mixed performance results 📊",
  "Management announces strategic restructuring",
  "New market conditions affecting operations",
  "Staff optimization program initiated",
  "Regional expansion plans under review",
  "Efficiency improvements showing early results",
  "Market volatility impacting projections",
  "Stakeholder meeting scheduled for next quarter",
  "Operational adjustments in progress",
  "Performance metrics being recalculated",
];

function getRandomActivityMessage(): string {
  const template = ACTIVITY_TEMPLATES[Math.floor(Math.random() * ACTIVITY_TEMPLATES.length)];
  return template;
}

/**
 * Generate CPR value biased toward negative outcomes
 * Range: -90% to +50%, with most values being negative
 */
function generateDailyCPR(): number {
  // 70% chance of negative, 30% chance of positive
  const isNegative = Math.random() < 0.70;
  
  if (isNegative) {
    // Negative range: -90 to 0, weighted toward moderate negatives
    const base = Math.random();
    // Use exponential distribution for more moderate negatives
    const value = -90 * Math.pow(base, 0.5); // sqrt gives more values near -40 to -60
    return Math.round(value * 10) / 10;
  } else {
    // Positive range: 0 to +50, weighted toward lower positives
    const base = Math.random();
    // Most positive days should be small gains
    const value = 50 * Math.pow(base, 2); // squared gives more values near 0-15
    return Math.round(value * 10) / 10;
  }
}

/**
 * Calculate final payout based on CPR
 * Minimum payout is 0 (can't go negative)
 */
function calculatePayout(amount: number, cpr: number): number {
  const multiplier = 1 + (cpr / 100);
  const payout = amount * multiplier;
  return Math.max(0, payout); // Never negative payout
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
    const { data: companies } = await supabase.from('companies').select('id, cpr_last_generated_date, cpr_today');
    
    if (companies) {
      for (const company of companies) {
        // Only generate new CPR if it hasn't been generated today
        if (company.cpr_last_generated_date !== today) {
          const newCPR = generateDailyCPR();
          const oldCPR = Number(company.cpr_today) || 0;
          
          // Get existing history for averages
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
          
          // Calculate volatility (standard deviation)
          const allValues = [newCPR, ...historyValues.slice(0, 6)];
          const mean = allValues.reduce((a, b) => a + b, 0) / allValues.length;
          const variance = allValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / allValues.length;
          const volatility = Math.sqrt(variance);
          
          // Determine trend
          let trend = 'stable';
          if (last7.length >= 3) {
            const recentAvg = last7.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
            const olderAvg = last7.slice(3).reduce((a, b) => a + b, 0) / Math.max(1, last7.length - 3);
            if (recentAvg > olderAvg + 5) trend = 'improving';
            else if (recentAvg < olderAvg - 5) trend = 'declining';
            else if (volatility > 25) trend = 'unstable';
          }
          
          // Update company CPR data
          await supabase
            .from('companies')
            .update({
              cpr_yesterday: oldCPR,
              cpr_today: newCPR,
              cpr_7day_avg: Math.round(avg7 * 10) / 10,
              cpr_30day_avg: Math.round(avg30 * 10) / 10,
              cpr_best: Math.round(best * 10) / 10,
              cpr_worst: Math.round(worst * 10) / 10,
              cpr_volatility: Math.round(volatility * 10) / 10,
              cpr_trend: trend,
              cpr_last_generated_date: today,
            })
            .eq('id', company.id);
          
          // Record in history
          await supabase.from('cpr_history').upsert({
            company_id: company.id,
            cpr_value: newCPR,
            recorded_date: today,
          }, { onConflict: 'company_id,recorded_date' });
          
          results.cprGenerated++;
        }
      }
    }

    // ============ MATURE INVESTMENTS USING CPR ============
    const { data: maturingInvestments } = await supabase
      .from('investments')
      .select(`*, companies (name, cpr_today, risk_level)`)
      .eq('status', 'active')
      .eq('is_matured', false)
      .lte('maturity_date', now.toISOString());

    if (maturingInvestments && maturingInvestments.length > 0) {
      for (const inv of maturingInvestments) {
        const amount = Number(inv.amount);
        const companyCPR = Number(inv.companies?.cpr_today) || 0;
        const companyName = inv.companies?.name || 'Company';
        
        // Calculate final payout based on maturity-day CPR
        const finalValue = calculatePayout(amount, companyCPR);
        const profitLoss = finalValue - amount;

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
            status: 'closed',
          })
          .eq('id', inv.id);

        const { data: wallet } = await supabase
          .from('wallets')
          .select('*')
          .eq('user_id', inv.user_id)
          .single();

        if (wallet) {
          const newBalance = Number(wallet.balance) + finalValue;
          const newInvested = Math.max(0, Number(wallet.invested_amount) - amount);
          const newProfit = profitLoss > 0 ? Number(wallet.total_profit) + profitLoss : Number(wallet.total_profit);
          const newLoss = profitLoss < 0 ? Number(wallet.total_loss) + Math.abs(profitLoss) : Number(wallet.total_loss);
          
          await supabase
            .from('wallets')
            .update({
              balance: newBalance,
              invested_amount: newInvested,
              total_profit: newProfit,
              total_loss: newLoss,
            })
            .eq('user_id', inv.user_id);
        }

        const transactionType = profitLoss >= 0 ? 'investment_profit' : 'investment_loss';
        const resultText = profitLoss >= 0 ? `+${profitLoss.toFixed(2)}` : `${profitLoss.toFixed(2)}`;
        
        await supabase.from('transactions').insert({
          user_id: inv.user_id,
          type: transactionType,
          amount: finalValue,
          description: `Investment Matured - ${companyName}: ${resultText} SLE (CPR: ${companyCPR >= 0 ? '+' : ''}${companyCPR}%)`,
        });

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

    console.log(`Monitor completed: investments_matured=${results.investmentsMatured}, cpr_generated=${results.cprGenerated}, activities=${results.activitiesGenerated}`);

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
