import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowDownRight, ArrowUpRight, BadgeCheck, ChevronRight, Layers3, Sparkles, Store, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CardArtwork } from '@/components/cards/CardArtwork';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useCardCatalog, useCardHoldings, useCardRealtime, useCardWallet } from '@/hooks/useCardMarket';
import type { CardCatalogRow } from '@/integrations/supabase/card-trading-types';
import { formatLeCredits } from '@/lib/card-currency';
import { cn } from '@/lib/utils';

const EMPTY_CARDS: CardCatalogRow[] = [];

export const HomeTab = () => {
  const navigate = useNavigate();
  const catalogQuery = useCardCatalog();
  const holdingsQuery = useCardHoldings();
  const walletQuery = useCardWallet();
  useCardRealtime();

  const cards = catalogQuery.data ?? EMPTY_CARDS;
  const ownedCount = (holdingsQuery.data ?? []).filter((holding) => holding.status === 'owned').length;
  const risingCount = cards.filter((card) => card.price_change_percent > 0).length;
  const featuredCard = cards.find((card) => card.is_limited && card.status === 'active' && !card.market_paused) ?? cards[0] ?? null;
  const movers = useMemo(() => [...cards].sort((a, b) => Math.abs(b.price_change_percent) - Math.abs(a.price_change_percent)).slice(0, 4), [cards]);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 pb-10 pt-5 sm:space-y-8 sm:px-6 sm:pt-8 lg:px-8">
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-float"><Layers3 className="h-5 w-5" /></div>
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-primary">Cash Pickup · Card Exchange</p>
            <h1 className="font-display text-xl font-black tracking-tight sm:text-2xl">Your collection, in motion.</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="icon" aria-label="Open profile" className="h-10 w-10 rounded-xl" onClick={() => navigate('/wallet')}><Wallet className="h-4 w-4" /></Button>
          <ThemeToggle />
        </div>
      </header>

      <section className="relative overflow-hidden rounded-[1.8rem] border border-border/70 bg-gradient-to-br from-primary/[0.13] via-card to-accent/[0.07] p-5 shadow-[var(--shadow-card)] sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 h-60 w-60 rounded-full bg-accent/10 blur-3xl" />
        <div className="relative grid items-center gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(19rem,0.8fr)]">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-success/20 bg-success/10 px-3 py-1.5 text-[10px] font-extrabold tracking-[0.12em] text-success">
              <span className="h-1.5 w-1.5 rounded-full bg-success" /> COLLECTIBLE MARKET IS OPEN
            </span>
            <h2 className="mt-4 font-display text-4xl font-black leading-[1.02] tracking-tight sm:text-5xl">Find a card.<br /><span className="text-gradient">Follow its story.</span></h2>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">Explore fictional meme, company, fintech, and community cards. Watch quotes change, collect unique serials, and trade with simulated Le credits.</p>
            <div className="mt-6 flex flex-wrap gap-2.5">
              <Button type="button" size="lg" className="rounded-xl" onClick={() => navigate('/market')}><Store className="h-4 w-4" /> Explore the market</Button>
              <Button type="button" variant="outline" size="lg" className="rounded-xl" onClick={() => navigate('/cards')}><Layers3 className="h-4 w-4" /> My cards <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{ownedCount}</span></Button>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-medium text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><BadgeCheck className="h-3.5 w-3.5 text-primary" /> Fictional collectibles</span>
              <span className="inline-flex items-center gap-1.5"><Wallet className="h-3.5 w-3.5 text-primary" /> No cash value</span>
            </div>
          </div>

          <div className="relative rounded-[1.5rem] border border-border/70 bg-card/75 p-4 shadow-[var(--shadow-card)] backdrop-blur-sm sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Simulated balance</p>
                <p className="mt-1 font-display text-2xl font-black tabular-nums tracking-tight">{walletQuery.isLoading ? '—' : formatLeCredits(Number(walletQuery.data?.balance ?? 0))}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Wallet className="h-5 w-5" /></div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-border/60 bg-background/60 p-3">
                <p className="text-[9px] font-bold uppercase tracking-[0.11em] text-muted-foreground">Cards in market</p>
                <p className="mt-1 font-display text-xl font-black tabular-nums">{catalogQuery.isLoading ? '—' : cards.length}</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-background/60 p-3">
                <p className="text-[9px] font-bold uppercase tracking-[0.11em] text-muted-foreground">Moving up</p>
                <p className="mt-1 font-display text-xl font-black tabular-nums">{catalogQuery.isLoading ? '—' : `${risingCount} / ${cards.length}`}</p>
              </div>
            </div>
            <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">Le credits are promotional simulation credits only. They are not cash and cannot be withdrawn or redeemed.</p>
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="rounded-[1.5rem] border border-border/70 bg-card p-4 shadow-[var(--shadow-card)] sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-primary">A first look</p>
              <h2 className="mt-1 font-display text-lg font-extrabold">Featured collectible</h2>
            </div>
            <Button type="button" variant="ghost" size="sm" className="rounded-xl text-xs" onClick={() => navigate('/market')}>Market <ChevronRight className="h-4 w-4" /></Button>
          </div>
          {featuredCard ? (
            <button type="button" onClick={() => navigate('/market')} className="group block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4 focus-visible:ring-offset-card">
              <CardArtwork card={featuredCard} />
              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-display text-base font-extrabold">{featuredCard.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{featuredCard.code} · {featuredCard.is_limited ? 'Limited edition' : 'Collectible series'}</p>
                </div>
                <span className="rounded-xl bg-primary/10 px-3 py-2 text-xs font-bold text-primary">View quote</span>
              </div>
            </button>
          ) : catalogQuery.isLoading ? (
            <Skeleton className="aspect-[1.72] w-full rounded-[1.15rem]" />
          ) : (
            <div className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">Cards will appear here when the card market is available.</div>
          )}
        </div>

        <div className="rounded-[1.5rem] border border-border/70 bg-card p-4 shadow-[var(--shadow-card)] sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-primary">Latest recorded quotes</p>
              <h2 className="mt-1 font-display text-lg font-extrabold">Cards on the move</h2>
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><Sparkles className="h-4 w-4" /></span>
          </div>
          <div className="divide-y divide-border/60">
            {catalogQuery.isLoading ? [0, 1, 2, 3].map((key) => <div key={key} className="flex items-center gap-3 py-3"><Skeleton className="h-9 w-9 rounded-xl" /><Skeleton className="h-8 flex-1" /></div>) : movers.map((card) => {
              const isUp = card.price_change_percent >= 0;
              return (
                <button key={card.id} type="button" onClick={() => navigate('/market')} className="flex w-full items-center gap-3 py-3 text-left transition-colors hover:bg-muted/20">
                  <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', isUp ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive')}>
                    {isUp ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">{card.title}</span>
                    <span className="mt-0.5 block text-[10px] text-muted-foreground">{card.code} · {formatLeCredits(card.current_price)}</span>
                  </span>
                  <span className={cn('text-xs font-extrabold tabular-nums', isUp ? 'text-success' : 'text-destructive')}>{isUp ? '+' : ''}{card.price_change_percent.toFixed(2)}%</span>
                </button>
              );
            })}
          </div>
          <Button type="button" variant="outline" className="mt-2 w-full rounded-xl" onClick={() => navigate('/market')}>Open all 30 cards <ChevronRight className="h-4 w-4" /></Button>
        </div>
      </section>

      <footer className="rounded-2xl border border-border/70 bg-muted/20 p-4 text-xs leading-relaxed text-muted-foreground">
        Card prices may rise or fall. No profit is guaranteed. Cards and Le credits are fictional and have no real-world cash, payment, or financial value.
      </footer>
    </div>
  );
};
