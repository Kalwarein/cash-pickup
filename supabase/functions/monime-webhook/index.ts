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

    const body = await req.json();
    console.log('Monime webhook received:', JSON.stringify(body));

    const eventType = body.event || body.type;
    const paymentData = body.data || body.result;

    if (!paymentData) {
      return new Response(JSON.stringify({ received: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Handle payment code completion (deposit)
    if (eventType?.includes('payment_code') && paymentData.status === 'completed') {
      const paymentCodeId = paymentData.id;
      
      const { data: pt } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('monime_payment_code_id', paymentCodeId)
        .single();

      if (pt && pt.status !== 'completed') {
        const amount = Number(pt.amount);

        // Update payment transaction
        await supabase.from('payment_transactions').update({
          status: 'completed',
          metadata: { ...((pt.metadata as Record<string, unknown>) || {}), webhook_data: paymentData },
        }).eq('id', pt.id);

        // Credit wallet
        const { data: wallet } = await supabase.from('wallets').select('balance').eq('user_id', pt.user_id).single();
        if (wallet) {
          await supabase.from('wallets').update({
            balance: Number(wallet.balance) + amount,
          }).eq('user_id', pt.user_id);
        }

        // Record transaction
        await supabase.from('transactions').insert({
          user_id: pt.user_id,
          type: 'deposit',
          amount,
          description: `Deposit via Monime - ${amount} SLE`,
        });

        console.log(`Deposit completed: ${amount} SLE for user ${pt.user_id}`);
      }
    }

    // Handle payout completion (withdrawal)
    if (eventType?.includes('payout') && (paymentData.status === 'completed' || paymentData.status === 'failed')) {
      const payoutId = paymentData.id;

      const { data: pt } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('monime_payout_id', payoutId)
        .single();

      if (pt) {
        await supabase.from('payment_transactions').update({
          status: paymentData.status === 'completed' ? 'completed' : 'failed',
          metadata: { ...((pt.metadata as Record<string, unknown>) || {}), webhook_data: paymentData },
        }).eq('id', pt.id);

        // If failed, refund wallet
        if (paymentData.status === 'failed') {
          const { data: wallet } = await supabase.from('wallets').select('balance').eq('user_id', pt.user_id).single();
          if (wallet) {
            await supabase.from('wallets').update({
              balance: Number(wallet.balance) + Number(pt.amount),
            }).eq('user_id', pt.user_id);
          }

          await supabase.from('transactions').insert({
            user_id: pt.user_id,
            type: 'refund',
            amount: Number(pt.amount),
            description: `Withdrawal refund - payout failed`,
          });
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ received: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
