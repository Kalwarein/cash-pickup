import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.91.1';

/**
 * Investment monitor that runs periodically to:
 * 1. Mature investments that have reached their maturity date (guaranteed returns)
 * 2. Generate random company activity feed messages
 * 3. Update CPI scores based on investment activity
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const results = { investmentsMatured: 0, activitiesGenerated: 0, cpiUpdated: 0 };
    const now = new Date();

    // ============ MATURE INVESTMENTS ============
    const { data: maturingInvestments } = await supabase
      .from('investments')
      .select(`*, companies (name, guaranteed_return_percent)`)
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

        await supabase.from('transactions').insert({
          user_id: inv.user_id,
          type: 'investment_profit',
          amount: finalValue,
          description: `Investment Maturity Credit - ${companyName}: +${guaranteedReturn.toFixed(2)} SLE (${guaranteedPercent}% guaranteed)`,
        });

        results.investmentsMatured++;
      }
    }

    // ============ UPDATE CPI SCORES ============
    const { data: companies } = await supabase.from('companies').select('id');
    
    if (companies) {
      for (const company of companies) {
        const { count: activeCount } = await supabase
          .from('investments')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', company.id)
          .eq('status', 'active');

        const { count: completedCount } = await supabase
          .from('investments')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', company.id)
          .eq('is_matured', true);

        const newCPI = Math.max(10, Math.min(100, 
          50 + ((activeCount || 0) * 3) + ((completedCount || 0) * 1.5)
        ));

        await supabase
          .from('companies')
          .update({ cpi_score: newCPI, cpi_updated_at: now.toISOString() })
          .eq('id', company.id);

        // Record CPI history
        await supabase.from('cpi_history').insert({
          company_id: company.id,
          cpi_score: newCPI,
          recorded_at: now.toISOString(),
        });

        results.cpiUpdated++;
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

    console.log(`Monitor completed: investments_matured=${results.investmentsMatured}, cpi_updated=${results.cpiUpdated}, activities=${results.activitiesGenerated}`);

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
