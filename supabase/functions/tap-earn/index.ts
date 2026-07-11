import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

/* ────────────────────────────────────────────────────────────
   Cash Miner economy — tapping + leverage only.
   Mirrored on the client in src/lib/tapEarn.ts (keep in sync).
──────────────────────────────────────────────────────────── */
const BASE_REWARD = 0.00005 // units per tap at 1x
const MIN_MINE_BALANCE = 50 // must have at least SLE 50 to mine

// index === leverage_level - 1
const LEVERAGE = [
  { level: 1, mult: 1, cost: 0 },
  { level: 2, mult: 2, cost: 20 },
  { level: 3, mult: 5, cost: 30 },
  { level: 4, mult: 10, cost: 40 },
  { level: 5, mult: 25, cost: 50 },
  { level: 6, mult: 50, cost: 60 },
  { level: 7, mult: 100, cost: 70 },
  { level: 8, mult: 250, cost: 80 },
  { level: 9, mult: 500, cost: 90 },
  { level: 10, mult: 1000, cost: 100 },
]

// Anti-cheat: max sustainable taps per second + a burst allowance
const MAX_TPS = 22
const BURST = 60

const log = (...a: unknown[]) => console.log('[tap-earn]', ...a)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Unauthorized' }, 401)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: userData, error: userErr } = await authClient.auth.getUser()
    if (userErr || !userData?.user) return json({ error: 'Unauthorized' }, 401)
    const userId = userData.user.id

    const admin = createClient(supabaseUrl, serviceKey)

    const body = await req.json().catch(() => ({}))
    const action = String(body.action || 'sync')

    let profile = await getOrCreateProfile(admin, userId)

    if (action === 'get') {
      return json({ profile: shape(profile) })
    }

    if (action === 'sync') {
      const requested = Math.floor(Number(body.taps) || 0)
      if (requested <= 0) return json({ profile: shape(profile) })
      if (requested > 100000) return json({ error: 'Invalid tap batch' }, 400)

      // Anti-cheat: cap taps by elapsed time since last sync
      const now = Date.now()
      const lastSync = new Date(profile.last_sync_at).getTime()
      const elapsedSec = Math.max(0, (now - lastSync) / 1000)
      const allowed = Math.floor(elapsedSec * MAX_TPS) + BURST
      const counted = Math.min(requested, allowed)

      const mult = LEVERAGE[(profile.leverage_level || 1) - 1]?.mult ?? 1
      const earned = counted * BASE_REWARD * mult

      const today = new Date().toISOString().slice(0, 10)
      const isNewDay = profile.today_date !== today

      const updates: Record<string, unknown> = {
        total_units: Number(profile.total_units) + earned,
        lifetime_units: Number(profile.lifetime_units) + earned,
        lifetime_taps: Number(profile.lifetime_taps) + counted,
        today_taps: isNewDay ? counted : Number(profile.today_taps) + counted,
        today_units: isNewDay ? earned : Number(profile.today_units) + earned,
        today_date: today,
        last_sync_at: new Date().toISOString(),
      }

      const { data: updated } = await admin
        .from('tap_profiles').update(updates).eq('user_id', userId).select().single()
      profile = updated

      log('sync', userId, 'counted', counted, 'rejected', requested - counted)
      return json({ profile: shape(profile), counted, earned, rejected: requested - counted })
    }

    if (action === 'buy_leverage') {
      const targetLevel = Math.floor(Number(body.level) || 0)
      const current = profile.leverage_level || 1
      const tier = LEVERAGE[targetLevel - 1]
      if (!tier) return json({ error: 'Invalid tier' }, 400)
      if (targetLevel <= current) return json({ error: 'Tier already unlocked.' }, 400)

      const { data: wallet } = await admin.from('wallets').select('*').eq('user_id', userId).single()
      if (!wallet) return json({ error: 'Wallet not found' }, 400)
      if (Number(wallet.balance) < tier.cost) {
        return json({ error: 'Insufficient balance. Deposit to unlock this tier.' }, 400)
      }

      await admin.from('wallets')
        .update({ balance: Number(wallet.balance) - tier.cost }).eq('user_id', userId)
      await admin.from('transactions').insert({
        user_id: userId, type: 'leverage', amount: -tier.cost,
        description: `Leverage upgrade to ${tier.mult}x`,
      })

      const { data: updated } = await admin
        .from('tap_profiles').update({ leverage_level: targetLevel })
        .eq('user_id', userId).select().single()
      profile = updated

      log('buy_leverage', userId, '->', targetLevel)
      return json({ profile: shape(profile) })
    }

    return json({ error: 'Unknown action' }, 400)
  } catch (e) {
    console.error('[tap-earn] error', e)
    return json({ error: 'Server error' }, 500)
  }
})

async function getOrCreateProfile(admin: any, userId: string) {
  const { data } = await admin.from('tap_profiles').select('*').eq('user_id', userId).maybeSingle()
  if (data) return data
  const { data: created } = await admin
    .from('tap_profiles').insert({ user_id: userId }).select().single()
  return created
}

function shape(p: any) {
  return {
    total_units: Number(p.total_units),
    lifetime_units: Number(p.lifetime_units),
    today_units: Number(p.today_units),
    lifetime_taps: Number(p.lifetime_taps),
    today_taps: Number(p.today_taps),
    leverage_level: Number(p.leverage_level),
  }
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  })
}
