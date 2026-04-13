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

    const eventType = String(body.event || body.type || body.name || '');
    const paymentData = body.data || body.result || body.object;

    if (!paymentData) {
      return new Response(JSON.stringify({ received: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Handle payment code completion (deposit)
    if (eventType.includes('payment_code')) {
      const paymentCodeId = paymentData.id;
      const isProcessedEvent = eventType === 'payment_code.processed' || Boolean(paymentData.processedPaymentData);
      const isExpiredEvent = eventType === 'payment_code.expired' || paymentData.status === 'expired';
      
      const { data: pt } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('monime_payment_code_id', paymentCodeId)
        .single();

      if (pt && isProcessedEvent && pt.status !== 'completed') {
        const amount = Number(pt.amount);
        const processedPaymentData = paymentData.processedPaymentData || {};

        // Update payment transaction
        await supabase.from('payment_transactions').update({
          status: 'completed',
          metadata: {
            ...((pt.metadata as Record<string, unknown>) || {}),
            webhook_event: eventType,
            webhook_data: paymentData,
            processedPaymentData,
          },
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
          description: `Deposit via Monime${pt.reference ? ` (${pt.reference})` : ''}`,
        });

        console.log(`Deposit completed: ${amount} SLE for user ${pt.user_id}`);
      }

      if (pt && isExpiredEvent && pt.status === 'pending') {
        await supabase.from('payment_transactions').update({
          status: 'expired',
          metadata: {
            ...((pt.metadata as Record<string, unknown>) || {}),
            webhook_event: eventType,
            webhook_data: paymentData,
          },
        }).eq('id', pt.id);
      }
    }

    // Handle payout completion (withdrawal)
    if (eventType.includes('payout') && (paymentData.status === 'completed' || paymentData.status === 'failed' || eventType === 'payout.completed' || eventType === 'payout.failed')) {
      const payoutId = paymentData.id;
      const nextStatus = paymentData.status === 'completed' || eventType === 'payout.completed' ? 'completed' : 'failed';

      const { data: pt } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('monime_payout_id', payoutId)
        .single();

      if (pt) {
        await supabase.from('payment_transactions').update({
          status: nextStatus,
          metadata: {
            ...((pt.metadata as Record<string, unknown>) || {}),
            webhook_event: eventType,
            webhook_data: paymentData,
          },
        }).eq('id', pt.id);

        // If failed, refund wallet
        if (nextStatus === 'failed' && pt.status !== 'failed' && pt.status !== 'completed') {
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
