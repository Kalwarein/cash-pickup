import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

/* ────────────────────────────────────────────────────────────
   Shared economy constants (mirrored on the client in
   src/lib/tapEarn.ts — keep both in sync)
──────────────────────────────────────────────────────────── */
const BASE_REWARD = 0.0000005 // units per tap at 1x
const UNIT_TARGET = 1 / BASE_REWARD // ≈ 2,000,000 taps per unit

// index === leverage_level - 1
const LEVERAGE = [
  { level: 1, mult: 1, cost: 0 },
  { level: 2, mult: 2, cost: 500 },
  { level: 3, mult: 5, cost: 1500 },
  { level: 4, mult: 10, cost: 4000 },
  { level: 5, mult: 25, cost: 10000 },
  { level: 6, mult: 50, cost: 25000 },
  { level: 7, mult: 100, cost: 60000 },
  { level: 8, mult: 250, cost: 150000 },
  { level: 9, mult: 500, cost: 400000 },
  { level: 10, mult: 1000, cost: 1000000 },
]

const ACHIEVEMENTS: { key: string; title: string; taps?: number; leverage?: number; reward: number }[] = [
  { key: 'first_tap', title: 'First Tap', taps: 1, reward: 5 },
  { key: 'taps_100', title: '100 Taps', taps: 100, reward: 10 },
  { key: 'taps_1k', title: '1,000 Taps', taps: 1000, reward: 25 },
  { key: 'taps_10k', title: '10,000 Taps', taps: 10000, reward: 100 },
  { key: 'taps_100k', title: '100,000 Taps', taps: 100000, reward: 500 },
  { key: 'taps_500k', title: '500,000 Taps', taps: 500000, reward: 2000 },
  { key: 'taps_1m', title: '1 Million Taps', taps: 1000000, reward: 10000 },
  { key: 'first_leverage', title: 'First Leverage', leverage: 2, reward: 20 },
  { key: 'max_leverage', title: 'Maximum Leverage', leverage: 10, reward: 5000 },
]

// Anti-cheat: max sustainable taps per second + a burst allowance
const MAX_TPS = 22
const BURST = 60
const DAILY_BONUS_BASE = 25 // SLE base daily login bonus

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return json({ error: 'Unauthorized' }, 401)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    // Identify caller from their JWT
    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: userData, error: userErr } = await authClient.auth.getUser()
    if (userErr || !userData?.user) return json({ error: 'Unauthorized' }, 401)
    const userId = userData.user.id

    // Service client for trusted writes
    const admin = createClient(supabaseUrl, serviceKey)

    const body = await req.json().catch(() => ({}))
    const action = String(body.action || 'sync')

    // Ensure profile exists
    let profile = await getOrCreateProfile(admin, userId)

    if (action === 'get') {
      return json({ profile: shape(profile) })
    }

    if (action === 'sync') {
      const requested = Math.floor(Number(body.taps) || 0)
      if (requested <= 0) return json({ profile: shape(profile) })
      if (requested > 100000) return json({ error: 'Invalid tap batch' }, 400)

      // Anti-cheat rate limiting based on elapsed time since last sync
      const now = Date.now()
      const lastSync = new Date(profile.last_sync_at).getTime()
      const elapsedSec = Math.max(0, (now - lastSync) / 1000)
      const allowed = Math.floor(elapsedSec * MAX_TPS) + BURST
      const counted = Math.min(requested, allowed)

      const mult = LEVERAGE[(profile.leverage_level || 1) - 1]?.mult ?? 1
      const earned = counted * BASE_REWARD * mult

      // Daily rollover
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
        .from('tap_profiles')
        .update(updates)
        .eq('user_id', userId)
        .select()
        .single()
      profile = updated

      const unlocked = await checkAchievements(admin, userId, profile)

      return json({
        profile: shape(profile),
        counted,
        earned,
        rejected: requested - counted,
        unlocked,
      })
    }

    if (action === 'buy_leverage') {
      const targetLevel = Math.floor(Number(body.level) || 0)
      const current = profile.leverage_level || 1
      if (targetLevel !== current + 1) return json({ error: 'You must upgrade one tier at a time.' }, 400)
      const tier = LEVERAGE[targetLevel - 1]
      if (!tier) return json({ error: 'Invalid tier' }, 400)

      // Deduct from wallet
      const { data: wallet } = await admin.from('wallets').select('*').eq('user_id', userId).single()
      if (!wallet) return json({ error: 'Wallet not found' }, 400)
      if (Number(wallet.balance) < tier.cost) return json({ error: 'Insufficient balance' }, 400)

      await admin.from('wallets').update({ balance: Number(wallet.balance) - tier.cost }).eq('user_id', userId)
      await admin.from('transactions').insert({
        user_id: userId, type: 'leverage', amount: -tier.cost,
        description: `Leverage upgrade to ${tier.mult}x`,
      })

      const { data: updated } = await admin
        .from('tap_profiles')
        .update({ leverage_level: targetLevel })
        .eq('user_id', userId).select().single()
      profile = updated

      await admin.from('tap_history').insert({
        user_id: userId, type: 'leverage',
        title: `Leverage ${tier.mult}x unlocked`,
        description: `Upgraded to level ${targetLevel}`,
        amount_sle: -tier.cost,
      })

      const unlocked = await checkAchievements(admin, userId, profile)
      return json({ profile: shape(profile), unlocked })
    }

    if (action === 'claim_daily') {
      const today = new Date().toISOString().slice(0, 10)
      if (profile.last_daily_claim === today) {
        return json({ error: 'Daily bonus already claimed today.' }, 400)
      }
      // Streak logic
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
      const newStreak = profile.last_daily_claim === yesterday ? (profile.daily_streak || 0) + 1 : 1
      const bonus = DAILY_BONUS_BASE * Math.min(newStreak, 7) // scales up to 7x

      const { data: wallet } = await admin.from('wallets').select('*').eq('user_id', userId).single()
      if (wallet) {
        await admin.from('wallets').update({ balance: Number(wallet.balance) + bonus }).eq('user_id', userId)
        await admin.from('transactions').insert({
          user_id: userId, type: 'reward', amount: bonus,
          description: `Daily bonus (day ${newStreak})`,
        })
      }

      const { data: updated } = await admin
        .from('tap_profiles')
        .update({
          last_daily_claim: today,
          daily_streak: newStreak,
          longest_streak: Math.max(profile.longest_streak || 0, newStreak),
        })
        .eq('user_id', userId).select().single()
      profile = updated

      await admin.from('tap_history').insert({
        user_id: userId, type: 'daily',
        title: `Daily bonus claimed`,
        description: `Day ${newStreak} streak`,
        amount_sle: bonus,
      })

      return json({ profile: shape(profile), bonus, streak: newStreak })
    }

    return json({ error: 'Unknown action' }, 400)
  } catch (e) {
    console.error('tap-earn error', e)
    return json({ error: 'Server error' }, 500)
  }
})

async function getOrCreateProfile(admin: any, userId: string) {
  const { data } = await admin.from('tap_profiles').select('*').eq('user_id', userId).maybeSingle()
  if (data) return data
  const { data: created } = await admin
    .from('tap_profiles')
    .insert({ user_id: userId })
    .select().single()
  return created
}

async function checkAchievements(admin: any, userId: string, profile: any) {
  const { data: existing } = await admin
    .from('tap_achievements').select('achievement_key').eq('user_id', userId)
  const have = new Set((existing || []).map((r: any) => r.achievement_key))
  const newlyUnlocked: { key: string; title: string; reward: number }[] = []

  for (const a of ACHIEVEMENTS) {
    if (have.has(a.key)) continue
    const tapsOk = a.taps != null && Number(profile.lifetime_taps) >= a.taps
    const levOk = a.leverage != null && Number(profile.leverage_level) >= a.leverage
    if (tapsOk || levOk) {
      newlyUnlocked.push({ key: a.key, title: a.title, reward: a.reward })
    }
  }

  if (newlyUnlocked.length) {
    await admin.from('tap_achievements').insert(
      newlyUnlocked.map((a) => ({ user_id: userId, achievement_key: a.key }))
    )
    const totalReward = newlyUnlocked.reduce((s, a) => s + a.reward, 0)
    const { data: wallet } = await admin.from('wallets').select('balance').eq('user_id', userId).single()
    if (wallet) {
      await admin.from('wallets').update({ balance: Number(wallet.balance) + totalReward }).eq('user_id', userId)
      await admin.from('transactions').insert({
        user_id: userId, type: 'reward', amount: totalReward,
        description: `Achievement rewards (${newlyUnlocked.length})`,
      })
    }
    for (const a of newlyUnlocked) {
      await admin.from('tap_history').insert({
        user_id: userId, type: 'achievement',
        title: `Achievement: ${a.title}`,
        description: `Reward earned`,
        amount_sle: a.reward,
      })
    }
  }
  return newlyUnlocked
}

function shape(p: any) {
  return {
    total_units: Number(p.total_units),
    lifetime_units: Number(p.lifetime_units),
    today_units: Number(p.today_units),
    lifetime_taps: Number(p.lifetime_taps),
    today_taps: Number(p.today_taps),
    leverage_level: Number(p.leverage_level),
    daily_streak: Number(p.daily_streak),
    longest_streak: Number(p.longest_streak),
    last_daily_claim: p.last_daily_claim,
  }
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  })
}