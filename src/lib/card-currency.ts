export function formatLeCredits(amount: number, showSign = false): string {
  const magnitude = Math.abs(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const sign = amount < 0 ? '−' : showSign && amount > 0 ? '+' : '';
  return `${sign}Le ${magnitude}`;
}

export function formatLeCreditsCompact(amount: number): string {
  const magnitude = Math.abs(amount);
  const sign = amount < 0 ? '−' : '';
  if (magnitude >= 1_000_000) return `${sign}Le ${(magnitude / 1_000_000).toFixed(1)}M`;
  if (magnitude >= 1_000) return `${sign}Le ${(magnitude / 1_000).toFixed(1)}K`;
  return formatLeCredits(amount);
}
