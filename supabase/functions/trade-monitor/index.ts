import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.91.1';

/**
 * Background trade monitor that runs periodically to:
 * 1. Close trades that hit TP/SL based on current market price
 * 2. Close expired trades
 * 3. Mature investments that have reached their maturity date (guaranteed returns)
 * 4. Generate random company activity feed messages
 * 
 * This ensures trades and investments close correctly even when users are offline.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Sample activity messages for company feeds
const ACTIVITY_TEMPLATES = [
  "New production facility expansion announced 📈",
  "Quarterly earnings exceeded expectations by {percent}%",
  "Strategic partnership signed with regional distributor",
  "New equipment delivery completed successfully ✅",
  "Staff training program launched for efficiency",
  "Export agreement finalized with neighboring country",
  "Infrastructure upgrade completed ahead of schedule",
  "Community development project initiated",
  "Quality certification renewed for another year",
  "Production capacity increased by {percent}%",
  "New product line in development phase",
  "Sustainable practices recognized by industry body",
  "Customer satisfaction rating improved to {percent}%",
  "Operational costs reduced through optimization",
  "Market share growth reported in local region",
];

function getRandomActivityMessage(): string {
  const template = ACTIVITY_TEMPLATES[Math.floor(Math.random() * ACTIVITY_TEMPLATES.length)];
  return template.replace('{percent}', String(Math.floor(Math.random() * 25) + 5));
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
      tradesClosed: 0,
      tradesExpired: 0,
      investmentsMatured: 0,
      activitiesGenerated: 0,
    };

    // ============ GET CURRENT MARKET PRICE ============
    const { data: latestCandle } = await supabase
      .from('market_candles')
      .select('close_price')
      .order('timestamp', { ascending: false })
      .limit(1)
      .maybeSingle();

    const currentPrice = latestCandle ? Number(latestCandle.close_price) : 1000;
    const now = new Date();

    // ============ CLOSE TRADES HITTING TP/SL ============
    const { data: openTrades } = await supabase
      .from('forex_trades')
      .select('*')
      .eq('status', 'open');

    if (openTrades && openTrades.length > 0) {
      for (const trade of openTrades) {
        const entryPrice = Number(trade.entry_price);
        const takeProfit = Number(trade.take_profit);
        const stopLoss = Number(trade.stop_loss);
        const amount = Number(trade.amount);
        const expiresAt = new Date(trade.expires_at);

        let shouldClose = false;
        let exitPrice = currentPrice;
        let closeReason = '';

        // Check TP hit
        if (currentPrice >= takeProfit) {
          shouldClose = true;
          exitPrice = takeProfit;
          closeReason = 'take_profit';
        }
        // Check SL hit
        else if (currentPrice <= stopLoss) {
          shouldClose = true;
          exitPrice = stopLoss;
          closeReason = 'stop_loss';
        }
        // Check expiry
        else if (expiresAt <= now) {
          shouldClose = true;
          exitPrice = currentPrice;
          closeReason = 'expired';
        }

        if (shouldClose) {
          const profitLoss = ((exitPrice - entryPrice) / entryPrice) * amount;
          const finalAmount = amount + profitLoss;

          // Update trade
          await supabase
            .from('forex_trades')
            .update({
              status: 'closed',
              exit_price: exitPrice,
              profit_loss: profitLoss,
              closed_at: now.toISOString(),
            })
            .eq('id', trade.id);

          // Update user wallet
          const { data: wallet } = await supabase
            .from('wallets')
            .select('*')
            .eq('user_id', trade.user_id)
            .single();

          if (wallet) {
            const newBalance = Number(wallet.balance) + finalAmount;
            const updates: Record<string, number> = { balance: newBalance };
            
            if (profitLoss > 0) {
              updates.total_profit = Number(wallet.total_profit) + profitLoss;
            } else {
              updates.total_loss = Number(wallet.total_loss) + Math.abs(profitLoss);
            }

            await supabase
              .from('wallets')
              .update(updates)
              .eq('user_id', trade.user_id);
          }

          // Record transaction
          await supabase.from('transactions').insert({
            user_id: trade.user_id,
            type: profitLoss >= 0 ? 'trade_profit' : 'trade_loss',
            amount: finalAmount,
            description: `Trade closed (${closeReason}): ${profitLoss >= 0 ? '+' : ''}${profitLoss.toFixed(2)} SLE`,
          });

          if (closeReason === 'expired') {
            results.tradesExpired++;
          } else {
            results.tradesClosed++;
          }
        }
      }
    }

    // ============ MATURE INVESTMENTS (GUARANTEED RETURNS) ============
    const { data: maturingInvestments } = await supabase
      .from('investments')
      .select(`
        *,
        companies (
          name,
          guaranteed_return_percent
        )
      `)
      .eq('status', 'active')
      .eq('is_matured', false)
      .lte('maturity_date', now.toISOString());

    if (maturingInvestments && maturingInvestments.length > 0) {
      for (const inv of maturingInvestments) {
        const amount = Number(inv.amount);
        const guaranteedPercent = inv.guaranteed_return_percent 
          ? Number(inv.guaranteed_return_percent) 
          : (inv.companies?.guaranteed_return_percent 
              ? Number(inv.companies.guaranteed_return_percent) 
              : 25);
        
        const guaranteedReturn = amount * (guaranteedPercent / 100);
        const finalValue = amount + guaranteedReturn;
        const companyName = inv.companies?.name || 'Company';

        // Update investment
        await supabase
          .from('investments')
          .update({
            current_value: finalValue,
            profit_loss: guaranteedReturn,
            final_value: finalValue,
            final_profit_loss: guaranteedReturn,
            guaranteed_return: guaranteedReturn,
            is_matured: true,
            matured_at: now.toISOString(),
            status: 'closed',
          })
          .eq('id', inv.id);

        // Update wallet
        const { data: wallet } = await supabase
          .from('wallets')
          .select('*')
          .eq('user_id', inv.user_id)
          .single();

        if (wallet) {
          await supabase
            .from('wallets')
            .update({
              balance: Number(wallet.balance) + finalValue,
              invested_amount: Math.max(0, Number(wallet.invested_amount) - amount),
              total_profit: Number(wallet.total_profit) + guaranteedReturn,
            })
            .eq('user_id', inv.user_id);
        }

        // Record transaction
        await supabase.from('transactions').insert({
          user_id: inv.user_id,
          type: 'investment_profit',
          amount: finalValue,
          description: `${companyName} matured: +${guaranteedReturn.toFixed(2)} SLE (${guaranteedPercent}% guaranteed)`,
        });

        results.investmentsMatured++;
      }
    }

    // ============ GENERATE RANDOM COMPANY ACTIVITIES ============
    // Only generate ~20% of the time to avoid spam
    if (Math.random() < 0.2) {
      const { data: companies } = await supabase
        .from('companies')
        .select('id')
        .limit(100);

      if (companies && companies.length > 0) {
        // Pick 1-3 random companies
        const numActivities = Math.floor(Math.random() * 3) + 1;
        const shuffled = companies.sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, numActivities);

        const activityInserts = selected.map(company => ({
          company_id: company.id,
          message: getRandomActivityMessage(),
          activity_type: 'update',
        }));

        const { error } = await supabase
          .from('company_activities')
          .insert(activityInserts);

        if (!error) {
          results.activitiesGenerated = activityInserts.length;
        }
      }
    }

    console.log(
      `Trade monitor completed: trades_closed=${results.tradesClosed}, expired=${results.tradesExpired}, investments_matured=${results.investmentsMatured}, activities=${results.activitiesGenerated}`
    );

    return new Response(
      JSON.stringify({
        success: true,
        results,
        currentPrice,
        timestamp: now.toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Trade monitor error:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
