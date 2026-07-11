/**
 * Tap-to-earn economy constants. Mirror of the values in
 * supabase/functions/tap-earn/index.ts — keep both in sync.
 * The server is always authoritative for actual balances.
 */

export const BASE_REWARD = 0.00005; // units per tap at 1x
export const UNIT_TARGET = Math.round(1 / BASE_REWARD); // ≈ 2,000,000 taps / unit

export interface LeverageTier {
  level: number;
  mult: number;
  cost: number;
}

export const LEVERAGE: LeverageTier[] = [
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
];

export interface TapProfile {
  total_units: number;
  lifetime_units: number;
  today_units: number;
  lifetime_taps: number;
  today_taps: number;
  leverage_level: number;
}

export const emptyProfile: TapProfile = {
  total_units: 0,
  lifetime_units: 0,
  today_units: 0,
  lifetime_taps: 0,
  today_taps: 0,
  leverage_level: 1,
};

export const leverageMult = (level: number) =>
  LEVERAGE[Math.max(0, Math.min(level, LEVERAGE.length) - 1)]?.mult ?? 1;

export const rewardPerTap = (level: number) => BASE_REWARD * leverageMult(level);

/* ─── Heat system (visual only) ───
   heat is a 0–100 value driven by tapping intensity. */
export type HeatLevel = 'normal' | 'warm' | 'hot' | 'very-hot' | 'max';

export const heatLevel = (heat: number): HeatLevel => {
  if (heat >= 90) return 'max';
  if (heat >= 70) return 'very-hot';
  if (heat >= 45) return 'hot';
  if (heat >= 20) return 'warm';
  return 'normal';
};

export const HEAT_LABEL: Record<HeatLevel, string> = {
  normal: 'Normal',
  warm: 'Warm',
  hot: 'Hot',
  'very-hot': 'Very Hot',
  max: 'Maximum',
};

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