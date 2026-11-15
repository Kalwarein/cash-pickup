import type { CardPriceHistoryRow } from '@/integrations/supabase/card-trading-types';
import { formatLeCredits } from '@/lib/card-currency';

export const CardPriceChart = ({ history }: { history: CardPriceHistoryRow[] }) => {
  const values = history.map((point) => point.price);
  if (values.length === 0) {
    return (
      <div className="flex h-36 items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 px-5 text-center text-sm text-muted-foreground">
        Price history will appear as the market records new quotes.
      </div>
    );
  }

  const width = 720;
  const height = 170;
  const insetX = 12;
  const insetY = 14;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = max - min || Math.max(Math.abs(max) * 0.04, 1);
  const points = values.map((value, index) => {
    const x = insetX + (index / Math.max(values.length - 1, 1)) * (width - insetX * 2);
    const y = height - insetY - ((value - min) / spread) * (height - insetY * 2);
    return `${x},${y}`;
  });
  const polyline = points.join(' ');
  const first = points[0].split(',')[0];
  const last = points[points.length - 1].split(',')[0];
  const area = `${first},${height} ${polyline} ${last},${height}`;
  const isUp = values[values.length - 1] >= values[0];
  const stroke = isUp ? 'hsl(var(--success))' : 'hsl(var(--destructive))';
  const latest = history[history.length - 1];

  return (
    <div className="rounded-2xl border border-border/70 bg-background/50 p-3 sm:p-4">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Recorded quotes</p>
          <p className="mt-1 font-display text-lg font-bold tabular-nums">{formatLeCredits(latest.price)}</p>
        </div>
        <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">{history.length} points</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-32 w-full overflow-visible" role="img" aria-label={`Recorded card prices from ${formatLeCredits(values[0])} to ${formatLeCredits(values[values.length - 1])}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="card-price-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.22" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1={insetX} x2={width - insetX} y1={height * 0.5} y2={height * 0.5} stroke="hsl(var(--border))" strokeDasharray="5 8" />
        <polygon points={area} fill="url(#card-price-fill)" />
        <polyline points={polyline} fill="none" stroke={stroke} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
        <span>{new Date(history[0].recorded_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
        <span>Most recent stored quote</span>
      </div>
    </div>
  );
};
