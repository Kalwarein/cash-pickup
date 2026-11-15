import { ArrowDownRight, ArrowUpRight, LockKeyhole, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { CardCatalogRow } from '@/integrations/supabase/card-trading-types';
import { formatLeCredits } from '@/lib/card-currency';
import { cn } from '@/lib/utils';
import { CardArtwork } from './CardArtwork';

const categoryLabels: Record<CardCatalogRow['category'], string> = {
  meme: 'Meme',
  company: 'Company',
  fintech_collectible: 'Fintech',
  community: 'Community',
};

export const MarketCardTile = ({
  card,
  ownedCount,
  hasPurchasedBefore,
  onDetails,
  onBuy,
}: {
  card: CardCatalogRow;
  ownedCount: number;
  hasPurchasedBefore: boolean;
  onDetails: () => void;
  onBuy: () => void;
}) => {
  const isUp = card.price_change_percent >= 0;
  const soldOut = card.status === 'sold_out' || (card.is_limited && card.buyer_limit !== null && card.lifetime_buyer_count >= card.buyer_limit);
  const unavailable = soldOut || card.status !== 'active' || card.market_paused;
  const limitedBuyerLock = card.is_limited && hasPurchasedBefore;
  const remaining = card.is_limited && card.buyer_limit !== null
    ? Math.max(0, card.buyer_limit - card.lifetime_buyer_count)
    : null;
  const progress = card.is_limited && card.buyer_limit
    ? Math.min(100, (card.lifetime_buyer_count / card.buyer_limit) * 100)
    : 0;
  const DeltaIcon = isUp ? ArrowUpRight : ArrowDownRight;

  return (
    <article className="group min-w-0 overflow-hidden rounded-[1.35rem] border border-border/70 bg-card shadow-[var(--shadow-card)] transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-float">
      <button type="button" className="block w-full p-2.5 pb-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset sm:p-3 sm:pb-0" onClick={onDetails} aria-label={`View ${card.title} details`}>
        <div className="relative">
          <CardArtwork card={card} compact />
          <div className="absolute left-2 top-2 flex flex-wrap gap-1.5">
            {card.is_limited && <Badge className="border-white/20 bg-black/35 text-white backdrop-blur-md hover:bg-black/40"><Sparkles className="mr-1 h-3 w-3" />Limited</Badge>}
            {ownedCount > 0 && <Badge variant="secondary" className="border-white/20 bg-white/90 text-slate-900">Owned {ownedCount > 1 ? `×${ownedCount}` : ''}</Badge>}
          </div>
          {card.market_paused && <span className="absolute bottom-2 right-2 rounded-full bg-black/55 px-2 py-1 text-[9px] font-bold text-white backdrop-blur-sm">Paused</span>}
        </div>
      </button>

      <div className="px-3.5 pb-3.5 pt-3 sm:px-4 sm:pb-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <button type="button" className="line-clamp-1 text-left font-display text-sm font-extrabold leading-tight hover:text-primary sm:text-base" onClick={onDetails}>{card.title}</button>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{categoryLabels[card.category]} <span className="mx-1 text-border">·</span> {card.code}</p>
          </div>
          <span className={cn('inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-1 text-[9px] font-bold tabular-nums sm:px-2 sm:text-[10px]', isUp ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive')}>
            <DeltaIcon className="h-3 w-3" />{isUp ? '+' : ''}{card.price_change_percent.toFixed(2)}%
          </span>
        </div>

        <div className="mt-3 flex items-end justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Live quote</p>
            <p className="mt-0.5 truncate font-display text-base font-extrabold tabular-nums tracking-tight sm:text-lg">{formatLeCredits(card.current_price)}</p>
          </div>
          {remaining !== null && (
            <div className="min-w-[62px] text-right">
              <p className="text-[9px] font-semibold text-muted-foreground">{remaining} left</p>
              <div className="mt-1 h-1 w-14 overflow-hidden rounded-full bg-muted">
                <span className="block h-full rounded-full bg-primary transition-[width]" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}
        </div>

        <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
          <Button type="button" size="sm" className="h-9 rounded-xl text-xs" onClick={onBuy} disabled={unavailable || limitedBuyerLock}>
            {soldOut ? 'Sold out' : card.market_paused ? 'Paused' : limitedBuyerLock ? <><LockKeyhole className="h-3 w-3" />One per account</> : 'Buy card'}
          </Button>
          <Button type="button" size="icon" variant="outline" className="h-9 w-9 rounded-xl" aria-label={`View ${card.title} details`} onClick={onDetails}>
            <span className="text-base leading-none" aria-hidden="true">↗</span>
          </Button>
        </div>
      </div>
    </article>
  );
};
