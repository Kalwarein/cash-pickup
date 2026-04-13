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

    // Get auth user
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
      return new Response(JSON.stringify({ error: 'Minimum deposit is 10 SLE' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (!monimeToken || !monimeSpaceId) {
      // Monime not configured — save as pending
      const { data: pt } = await supabase.from('payment_transactions').insert({
        user_id: user.id,
        type: 'deposit',
        amount,
        phone_number: phoneNumber || null,
        provider: provider || null,
        status: 'pending',
        reference: `dep-${Date.now()}-${user.id.slice(0, 8)}`,
      }).select().single();

      return new Response(JSON.stringify({
        success: true,
        status: 'pending',
        message: 'Monime payment system is being configured. Your deposit request has been recorded.',
        transaction_id: pt?.id,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Create Monime Payment Code
    const idempotencyKey = `dep-${user.id}-${Date.now()}`;
    const reference = `cp-dep-${user.id.slice(0, 8)}-${Date.now()}`;

    const monimeResponse = await fetch('https://api.monime.io/v1/payment-codes', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${monimeToken}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
        'Monime-Version': monimeVersion,
        'Monime-Space-Id': monimeSpaceId,
      },
      body: JSON.stringify({
        name: `Cash Pickup Deposit - ${user.id.slice(0, 8)}`,
        mode: 'one_time',
        enable: true,
        amount: { currency: 'SLE', value: Math.round(amount * 100) }, // minor units
        duration: '30m',
        customer: { name: phoneNumber || 'Cash Pickup User' },
        reference,
        authorizedProviders: provider ? [provider] : ['m17', 'm18'],
        ...(phoneNumber ? { authorizedPhoneNumber: phoneNumber } : {}),
      }),
    });

    const monimeData = await monimeResponse.json();

    if (!monimeResponse.ok) {
      console.error('Monime error:', monimeData);
      return new Response(JSON.stringify({ error: 'Payment service error. Please try again.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Save payment transaction
    const { data: pt } = await supabase.from('payment_transactions').insert({
      user_id: user.id,
      type: 'deposit',
      amount,
      phone_number: phoneNumber || null,
      provider: provider || null,
      status: 'pending',
      monime_payment_code_id: monimeData.result?.id,
      ussd_code: monimeData.result?.ussdCode,
      reference,
      metadata: monimeData.result || {},
    }).select().single();

    return new Response(JSON.stringify({
      success: true,
      status: 'pending',
      ussd_code: monimeData.result?.ussdCode,
      payment_code_id: monimeData.result?.id,
      transaction_id: pt?.id,
      message: `Dial ${monimeData.result?.ussdCode || 'the USSD code'} to complete your deposit of ${amount} SLE`,
      expires_at: monimeData.result?.expireTime,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Deposit error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
