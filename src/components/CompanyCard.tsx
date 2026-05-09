import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Flame, ArrowUpRight, Sparkles } from 'lucide-react';
import { sle } from '@/lib/currency';

interface CompanyCardProps {
  name: string;
  ticker: string;
  sector: string;
  price: number;
  change: number;
  riskLevel: 'Low' | 'Medium' | 'High';
  isTrending?: boolean;
  onInvest?: () => void;
  onView?: () => void;
}

export const CompanyCard = ({
  name,
  ticker,
  sector,
  price,
  change,
  riskLevel,
  isTrending,
  onInvest,
  onView,
}: CompanyCardProps) => {
  const isPositive = change >= 0;
  const riskTone =
    riskLevel === 'Low'
      ? { c: '#10b981', bg: 'rgba(16,185,129,0.12)', ring: 'rgba(16,185,129,0.35)' }
      : riskLevel === 'Medium'
      ? { c: '#f59e0b', bg: 'rgba(245,158,11,0.12)', ring: 'rgba(245,158,11,0.35)' }
      : { c: '#ef4444', bg: 'rgba(239,68,68,0.12)', ring: 'rgba(239,68,68,0.35)' };

  return (
    <div
      onClick={onView}
      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-card via-card to-card/80 p-4 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.25)] transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-10px_rgba(37,99,235,0.45)] hover:border-primary/40 cursor-pointer animate-fade-in"
    >
      {/* Accent gradient stripe */}
      <span
        className="pointer-events-none absolute left-0 top-0 h-full w-1 rounded-l-2xl"
        style={{ background: `linear-gradient(180deg, ${riskTone.c}, transparent)` }}
      />

      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm shadow-inner"
            style={{ background: riskTone.bg, color: riskTone.c, boxShadow: `inset 0 0 0 1px ${riskTone.ring}` }}
          >
            {ticker.slice(0, 2)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="font-semibold text-foreground truncate">{name}</h3>
              {isTrending && <Flame className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] font-mono font-semibold text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
                {ticker}
              </span>
              <span className="text-[11px] text-muted-foreground truncate">{sector}</span>
            </div>
          </div>
        </div>
        <span
          className="text-[10px] px-2 py-1 rounded-full font-semibold tracking-wide whitespace-nowrap"
          style={{ background: riskTone.bg, color: riskTone.c, boxShadow: `inset 0 0 0 1px ${riskTone.ring}` }}
        >
          {riskLevel.toUpperCase()}
        </span>
      </div>

      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">Price</p>
          <p className="text-lg font-bold tracking-tight">{sle(price)}</p>
          <div
            className={cn(
              'inline-flex items-center gap-1 text-xs font-semibold mt-0.5 px-1.5 py-0.5 rounded-md',
              isPositive ? 'text-emerald-500 bg-emerald-500/10' : 'text-red-500 bg-red-500/10',
            )}
          >
            {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {isPositive ? '+' : ''}{change.toFixed(2)}%
          </div>
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); onInvest?.(); }}
          className="group/btn inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-blue-600 to-sky-500 shadow-[0_6px_18px_-6px_rgba(37,99,235,0.6)] hover:shadow-[0_10px_24px_-6px_rgba(37,99,235,0.7)] hover:from-blue-500 hover:to-sky-400 active:scale-[0.97] transition-all"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Invest
          <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
        </button>
      </div>
    </div>
  );
};
