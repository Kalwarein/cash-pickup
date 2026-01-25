/**
 * Currency formatting utilities for Sierra Leonean Leone (SLE)
 * All monetary values in the app use SLE credits
 */

export const CURRENCY_SYMBOL = 'SLE';
export const CURRENCY_CODE = 'SLE';

/**
 * Format a number as SLE currency
 * @param amount - The amount to format
 * @param showSign - Whether to show + for positive values
 * @returns Formatted string like "1,234.56 SLE" or "+1,234.56 SLE"
 */
export function formatSLE(amount: number, showSign = false): string {
  const formatted = Math.abs(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  
  const sign = showSign && amount > 0 ? '+' : amount < 0 ? '-' : '';
  return `${sign}${formatted} ${CURRENCY_SYMBOL}`;
}

/**
 * Format a number as compact SLE (for large values)
 * @param amount - The amount to format
 * @returns Formatted string like "1.2K SLE" or "1.5M SLE"
 */
export function formatSLECompact(amount: number): string {
  if (Math.abs(amount) >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}M ${CURRENCY_SYMBOL}`;
  }
  if (Math.abs(amount) >= 1000) {
    return `${(amount / 1000).toFixed(1)}K ${CURRENCY_SYMBOL}`;
  }
  return formatSLE(amount);
}

/**
 * Format just the number with SLE suffix (no sign handling)
 * @param amount - The amount to format
 * @returns Formatted string like "1,234.56 SLE"
 */
export function sle(amount: number): string {
  return `${amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${CURRENCY_SYMBOL}`;
}
