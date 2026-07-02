/**
 * Tap-to-earn economy constants. Mirror of the values in
 * supabase/functions/tap-earn/index.ts — keep both in sync.
 * The server is always authoritative for actual balances.
 */

export const BASE_REWARD = 0.0000005; // units per tap at 1x
export const UNIT_TARGET = Math.round(1 / BASE_REWARD); // ≈ 2,000,000 taps / unit

export interface LeverageTier {
  level: number;
  mult: number;
  cost: number;
}

export const LEVERAGE: LeverageTier[] = [
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
];

export interface AchievementDef {
  key: string;
  title: string;
  description: string;
  taps?: number;
  leverage?: number;
  reward: number;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { key: 'first_tap', title: 'First Tap', description: 'Make your very first tap', taps: 1, reward: 5 },
  { key: 'taps_100', title: '100 Taps', description: 'Tap 100 times', taps: 100, reward: 10 },
  { key: 'taps_1k', title: '1,000 Taps', description: 'Tap 1,000 times', taps: 1000, reward: 25 },
  { key: 'taps_10k', title: '10,000 Taps', description: 'Tap 10,000 times', taps: 10000, reward: 100 },
  { key: 'taps_100k', title: '100,000 Taps', description: 'Tap 100,000 times', taps: 100000, reward: 500 },
  { key: 'taps_500k', title: '500,000 Taps', description: 'Tap 500,000 times', taps: 500000, reward: 2000 },
  { key: 'taps_1m', title: '1 Million Taps', description: 'Reach one million taps', taps: 1000000, reward: 10000 },
  { key: 'first_leverage', title: 'First Leverage', description: 'Buy your first upgrade', leverage: 2, reward: 20 },
  { key: 'max_leverage', title: 'Maximum Leverage', description: 'Reach 1000x leverage', leverage: 10, reward: 5000 },
];

export interface TapProfile {
  total_units: number;
  lifetime_units: number;
  today_units: number;
  lifetime_taps: number;
  today_taps: number;
  leverage_level: number;
  daily_streak: number;
  longest_streak: number;
  last_daily_claim: string | null;
}

export const emptyProfile: TapProfile = {
  total_units: 0,
  lifetime_units: 0,
  today_units: 0,
  lifetime_taps: 0,
  today_taps: 0,
  leverage_level: 1,
  daily_streak: 0,
  longest_streak: 0,
  last_daily_claim: null,
};

export const leverageMult = (level: number) =>
  LEVERAGE[Math.max(0, Math.min(level, LEVERAGE.length) - 1)]?.mult ?? 1;

export const rewardPerTap = (level: number) => BASE_REWARD * leverageMult(level);

/** Format a unit balance like a crypto balance (many decimals). */
export function formatUnits(value: number, decimals = 8): string {
  if (!isFinite(value)) return (0).toFixed(decimals);
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}