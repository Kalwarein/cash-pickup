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
    const monimeVersion = 'caph.2025-08-23';
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const monimeToken = Deno.env.get('MONIME_API_TOKEN');
    const monimeSpaceId = Deno.env.get('MONIME_SPACE_ID');
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { amount, phoneNumber, provider } = await req.json();

    if (!amount || amount < 10) {
      return new Response(JSON.stringify({ error: 'Minimum withdrawal is 10 SLE' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Check balance
    const { data: wallet } = await supabase.from('wallets').select('balance').eq('user_id', user.id).single();
    if (!wallet || Number(wallet.balance) < amount) {
      return new Response(JSON.stringify({ error: 'Insufficient balance' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (!phoneNumber) {
      return new Response(JSON.stringify({ error: 'Phone number is required for withdrawal' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const reference = `cp-wd-${user.id.slice(0, 8)}-${Date.now()}`;

    if (!monimeToken || !monimeSpaceId) {
      // Deduct balance and save as pending
      await supabase.from('wallets').update({ balance: Number(wallet.balance) - amount }).eq('user_id', user.id);
      await supabase.from('transactions').insert({ user_id: user.id, type: 'withdrawal', amount, description: `Withdrawal of ${amount} SLE to ${phoneNumber} (pending)` });
      
      const { data: pt } = await supabase.from('payment_transactions').insert({
        user_id: user.id, type: 'withdrawal', amount,
        phone_number: phoneNumber, provider: provider || null,
        status: 'pending', reference,
      }).select().single();

      return new Response(JSON.stringify({
        success: true, status: 'pending',
        message: 'Withdrawal recorded. Monime payout system is being configured.',
        transaction_id: pt?.id,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Create Monime Payout
    const idempotencyKey = `wd-${user.id}-${Date.now()}`;
    const monimeResponse = await fetch('https://api.monime.io/v1/payouts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${monimeToken}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
        'Monime-Version': monimeVersion,
        'Monime-Space-Id': monimeSpaceId,
      },
      body: JSON.stringify({
        amount: { currency: 'SLE', value: Math.round(amount * 100) },
        destination: {
          type: 'momo',
          providerId: provider || 'm17',
          accountNumber: phoneNumber,
        },
        metadata: { userId: user.id, reference },
      }),
    });

    const monimeData = await monimeResponse.json();

    if (!monimeResponse.ok) {
      console.error('Monime payout error:', monimeData);
      return new Response(JSON.stringify({ error: 'Payout service error. Please try again.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Deduct balance
    await supabase.from('wallets').update({ balance: Number(wallet.balance) - amount }).eq('user_id', user.id);
    await supabase.from('transactions').insert({ user_id: user.id, type: 'withdrawal', amount, description: `Withdrawal to ${phoneNumber}` });

    await supabase.from('payment_transactions').insert({
      user_id: user.id, type: 'withdrawal', amount,
      phone_number: phoneNumber, provider: provider || null,
      status: 'processing', monime_payout_id: monimeData.result?.id,
      reference, metadata: monimeData.result || {},
    });

    return new Response(JSON.stringify({
      success: true, status: 'processing',
      message: `Withdrawal of ${amount} SLE to ${phoneNumber} is being processed`,
      payout_id: monimeData.result?.id,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Withdraw error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
